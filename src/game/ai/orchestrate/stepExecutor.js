/**
 * Step Executor
 * 
 * Executes individual workflow steps with support for parallel execution,
 * retry logic, and rollback capabilities.
 */

const StepStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying',
  ROLLED_BACK: 'rolled_back'
};

class StepExecutor {
  /**
   * Create a new StepExecutor
   * @param {OrchestrationEngine} orchestrationEngine - The orchestration engine
   */
  constructor(orchestrationEngine) {
    this.engine = orchestrationEngine;
    
    // Step state tracking
    this.stepStates = new Map();
    
    // Rollback handlers registry
    this.rollbackHandlers = new Map();
    
    // Default timeout (30 seconds)
    this.defaultTimeout = 30000;
  }

  /**
   * Execute a single step
   * @param {Object} step - Step definition
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Step execution result
   */
  async executeStep(step, context) {
    const stepId = step.id || 'anonymous';
    
    // Initialize step state
    this._setStepState(stepId, StepStatus.RUNNING, { startTime: Date.now() });
    
    try {
      // Check for timeout
      const timeout = step.timeout || this.defaultTimeout;
      const result = await this._executeWithTimeout(step, context, timeout);
      
      if (result.error) {
        this._setStepState(stepId, StepStatus.FAILED, { error: result.error });
        return result;
      }
      
      this._setStepState(stepId, StepStatus.COMPLETED, { result });
      return result;
      
    } catch (error) {
      const errorResult = {
        success: false,
        error: error.message,
        stepId: stepId
      };
      
      this._setStepState(stepId, StepStatus.FAILED, { error: error.message });
      return errorResult;
    }
  }

  /**
   * Execute multiple steps in parallel
   * @param {Array} steps - Array of step definitions
   * @param {Object} context - Execution context
   * @returns {Promise<Array>} Array of step results
   */
  async executeParallel(steps, context) {
    const results = await Promise.all(
      steps.map(step => this.executeStep(step, context))
    );
    
    return results;
  }

  /**
   * Retry a failed step
   * @param {Object} step - Step definition
   * @param {Object} context - Execution context
   * @param {number} maxRetries - Maximum number of retries (default: 3)
   * @returns {Promise<Object>} Step execution result
   */
  async retryStep(step, context, maxRetries = 3) {
    const stepId = step.id || 'anonymous';
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        this._setStepState(stepId, StepStatus.RETRYING, { 
          attempt, 
          maxRetries,
          lastError 
        });
        
        // Emit retry event
        await this.engine.emit('stepRetry', { stepId, attempt, maxRetries });
        
        // Wait before retry (exponential backoff)
        await this._delay(Math.pow(2, attempt) * 100);
      }
      
      const result = await this.executeStep(step, context);
      
      if (!result.error) {
        return result;
      }
      
      lastError = result.error;
    }
    
    // All retries exhausted
    return {
      success: false,
      error: `Max retries (${maxRetries}) exceeded. Last error: ${lastError}`,
      stepId: stepId,
      attempts: maxRetries + 1
    };
  }

  /**
   * Rollback a step's effects
   * @param {Object} step - Step definition
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackStep(step, context) {
    const stepId = step.id || 'anonymous';
    
    // Check if we have a rollback handler
    const handler = this.rollbackHandlers.get(stepId);
    
    if (!handler) {
      return {
        success: false,
        error: `No rollback handler registered for step ${stepId}`,
        stepId: stepId
      };
    }
    
    try {
      const rollbackContext = context.rollbackData || {};
      const result = await handler(rollbackContext);
      
      if (result.error) {
        return {
          success: false,
          error: `Rollback failed: ${result.error}`,
          stepId: stepId
        };
      }
      
      this._setStepState(stepId, StepStatus.ROLLED_BACK, { result });
      return result;
      
    } catch (error) {
      return {
        success: false,
        error: `Rollback exception: ${error.message}`,
        stepId: stepId
      };
    }
  }

  /**
   * Register a rollback handler for a step
   * @param {string} stepId - The step ID
   * @param {Function} handler - Rollback handler function(context)
   */
  registerRollbackHandler(stepId, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Rollback handler must be a function');
    }
    this.rollbackHandlers.set(stepId, handler);
  }

  /**
   * Unregister a rollback handler
   * @param {string} stepId - The step ID
   */
  unregisterRollbackHandler(stepId) {
    this.rollbackHandlers.delete(stepId);
  }

  /**
   * Get the state of a step
   * @param {string} stepId - The step ID
   * @returns {Object|null} Step state
   */
  getStepState(stepId) {
    return this.stepStates.get(stepId) || null;
  }

  /**
   * Check if a step has a rollback handler
   * @param {string} stepId - The step ID
   * @returns {boolean} True if handler exists
   */
  hasRollbackHandler(stepId) {
    return this.rollbackHandlers.has(stepId);
  }

  /**
   * Clear all step states
   */
  clearStepStates() {
    this.stepStates.clear();
  }

  /**
   * Get all steps that have rollback handlers
   * @returns {string[]} Array of step IDs
   */
  getStepsWithRollback() {
    return Array.from(this.rollbackHandlers.keys());
  }

  // Private methods

  /**
   * Execute step with timeout
   * @private
   */
  async _executeWithTimeout(step, context, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Step ${step.id || 'anonymous'} timed out after ${timeout}ms`));
      }, timeout);
      
      Promise.resolve()
        .then(async () => {
          if (typeof step.execute === 'function') {
            return await step.execute(context);
          }
          return { success: true, output: null };
        })
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Set step state
   * @private
   */
  _setStepState(stepId, status, data = {}) {
    this.stepStates.set(stepId, {
      stepId,
      status,
      ...data,
      updatedAt: Date.now()
    });
  }

  /**
   * Delay helper
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a step with retry support
 * @param {string} id - Step ID
 * @param {Function} execute - Execute function
 * @param {Object} options - Step options
 */
function createRetryableStep(id, execute, options = {}) {
  return {
    id,
    type: options.type || 'action',
    execute,
    allowFailure: options.allowFailure || false,
    retry: options.retry || 3,
    timeout: options.timeout || 30000,
    dependencies: options.dependencies || [],
    rollback: options.rollback || null
  };
}

/**
 * Create a step with rollback support
 * @param {string} id - Step ID
 * @param {Function} execute - Execute function
 * @param {Function} rollback - Rollback function
 * @param {Object} options - Step options
 */
function createRollbackableStep(id, execute, rollback, options = {}) {
  return {
    id,
    type: options.type || 'action',
    execute,
    rollback,
    allowFailure: options.allowFailure || false,
    retry: options.retry || 0,
    timeout: options.timeout || 30000,
    dependencies: options.dependencies || []
  };
}

export { 
  StepExecutor, 
  StepStatus, 
  createRetryableStep, 
  createRollbackableStep 
};