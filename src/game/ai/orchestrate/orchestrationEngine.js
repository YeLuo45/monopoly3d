/**
 * Orchestration Engine
 * 
 * Main orchestration engine for multi-agent workflow execution.
 * Manages workflow lifecycle, step execution, and state tracking.
 */

const WorkflowState = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

class OrchestrationEngine {
  /**
   * Create a new OrchestrationEngine
   * @param {Object} coordinator - The agent coordinator
   * @param {Object} messageBus - The message bus for agent communication
   * @param {Object} blackboard - The shared blackboard for state
   */
  constructor(coordinator, messageBus, blackboard) {
    this.coordinator = coordinator;
    this.messageBus = messageBus;
    this.blackboard = blackboard;
    
    // Workflow registry: workflowId -> workflow state
    this.workflows = new Map();
    
    // Active workflows tracking
    this.activeWorkflows = new Set();
    
    // Step executor reference
    this.stepExecutor = null;
    
    // Event handlers
    this.eventHandlers = new Map();
    
    // Execution hooks for monitoring
    this.preExecuteHooks = [];
    this.postExecuteHooks = [];
  }

  /**
   * Set the step executor
   * @param {StepExecutor} executor - The step executor instance
   */
  setStepExecutor(executor) {
    this.stepExecutor = executor;
  }

  /**
   * Execute a complete workflow
   * @param {Object} workflow - The workflow definition
   * @param {Object} initialContext - Initial context for workflow
   * @returns {Promise<Object>} Final workflow result
   */
  async executeWorkflow(workflow, initialContext = {}) {
    const workflowId = workflow.id || this._generateWorkflowId(workflow.name);
    
    // Initialize workflow state
    const state = {
      id: workflowId,
      name: workflow.name,
      status: WorkflowState.RUNNING,
      steps: workflow.steps || [],
      context: { ...initialContext },
      currentStepIndex: 0,
      completedSteps: [],
      failedSteps: [],
      startTime: Date.now(),
      endTime: null,
      result: null,
      error: null
    };
    
    this.workflows.set(workflowId, state);
    this.activeWorkflows.add(workflowId);
    
    try {
      // Execute each step in order
      while (state.currentStepIndex < state.steps.length && 
             state.status === WorkflowState.RUNNING) {
        const step = state.steps[state.currentStepIndex];
        
        // Run pre-execute hooks
        await this._runPreExecuteHooks(step, state.context);
        
        // Execute the step
        const stepResult = await this._executeStep(step, state.context);
        
        // Run post-execute hooks
        await this._runPostExecuteHooks(step, state.context, stepResult);
        
        if (stepResult.error) {
          state.failedSteps.push({
            stepId: step.id,
            error: stepResult.error
          });
          
          // Check if step allows failure
          if (!step.allowFailure) {
            state.status = WorkflowState.FAILED;
            state.error = stepResult.error;
            break;
          }
        } else {
          state.completedSteps.push({
            stepId: step.id,
            result: stepResult
          });
        }
        
        state.currentStepIndex++;
      }
      
      // Determine final state
      if (state.status === WorkflowState.RUNNING) {
        if (state.failedSteps.length > 0 && 
            state.steps.every(s => s.allowFailure)) {
          state.status = WorkflowState.COMPLETED;
        } else {
          state.status = WorkflowState.COMPLETED;
        }
      }
      
      state.endTime = Date.now();
      state.result = this._buildWorkflowResult(state);
      
    } catch (error) {
      state.status = WorkflowState.FAILED;
      state.error = error.message;
      state.endTime = Date.now();
    } finally {
      this.activeWorkflows.delete(workflowId);
    }
    
    return state.result;
  }

  /**
   * Execute a single step of a workflow
   * @param {string} workflowId - The workflow ID
   * @returns {Promise<Object>} Step execution result
   */
  async step(workflowId) {
    const state = this.workflows.get(workflowId);
    
    if (!state) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    if (state.status !== WorkflowState.RUNNING && 
        state.status !== WorkflowState.PAUSED) {
      throw new Error(`Workflow ${workflowId} is not in a runnable state: ${state.status}`);
    }
    
    if (state.currentStepIndex >= state.steps.length) {
      throw new Error(`Workflow ${workflowId} has no more steps`);
    }
    
    const step = state.steps[state.currentStepIndex];
    const stepResult = await this._executeStep(step, state.context);
    
    if (stepResult.error) {
      state.failedSteps.push({
        stepId: step.id,
        error: stepResult.error
      });
    } else {
      state.completedSteps.push({
        stepId: step.id,
        result: stepResult
      });
    }
    
    state.currentStepIndex++;
    
    if (state.currentStepIndex >= state.steps.length) {
      state.status = WorkflowState.COMPLETED;
      state.endTime = Date.now();
      state.result = this._buildWorkflowResult(state);
    }
    
    return stepResult;
  }

  /**
   * Get the current state of a workflow
   * @param {string} workflowId - The workflow ID
   * @returns {Object|null} Workflow state
   */
  getWorkflowState(workflowId) {
    const state = this.workflows.get(workflowId);
    
    if (!state) {
      return null;
    }
    
    // Return a copy to prevent external mutation
    return {
      id: state.id,
      name: state.name,
      status: state.status,
      currentStepIndex: state.currentStepIndex,
      totalSteps: state.steps.length,
      completedSteps: state.completedSteps.length,
      failedSteps: state.failedSteps.length,
      context: { ...state.context },
      startTime: state.startTime,
      endTime: state.endTime,
      error: state.error,
      result: state.result
    };
  }

  /**
   * Cancel a running workflow
   * @param {string} workflowId - The workflow ID
   * @returns {boolean} True if cancelled, false if not found
   */
  cancelWorkflow(workflowId) {
    const state = this.workflows.get(workflowId);
    
    if (!state) {
      return false;
    }
    
    if (state.status === WorkflowState.COMPLETED ||
        state.status === WorkflowState.FAILED ||
        state.status === WorkflowState.CANCELLED) {
      return false;
    }
    
    state.status = WorkflowState.CANCELLED;
    state.endTime = Date.now();
    this.activeWorkflows.delete(workflowId);
    
    return true;
  }

  /**
   * Pause a workflow
   * @param {string} workflowId - The workflow ID
   * @returns {boolean} True if paused
   */
  pauseWorkflow(workflowId) {
    const state = this.workflows.get(workflowId);
    
    if (!state || state.status !== WorkflowState.RUNNING) {
      return false;
    }
    
    state.status = WorkflowState.PAUSED;
    return true;
  }

  /**
   * Resume a paused workflow
   * @param {string} workflowId - The workflow ID
   * @returns {boolean} True if resumed
   */
  resumeWorkflow(workflowId) {
    const state = this.workflows.get(workflowId);
    
    if (!state || state.status !== WorkflowState.PAUSED) {
      return false;
    }
    
    state.status = WorkflowState.RUNNING;
    return true;
  }

  /**
   * Register a pre-execute hook
   * @param {Function} hook - Hook function(step, context)
   */
  onPreExecute(hook) {
    this.preExecuteHooks.push(hook);
  }

  /**
   * Register a post-execute hook
   * @param {Function} hook - Hook function(step, context, result)
   */
  onPostExecute(hook) {
    this.postExecuteHooks.push(hook);
  }

  /**
   * Register an event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  async emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    for (const handler of handlers) {
      await handler(data);
    }
  }

  /**
   * Get list of all workflow IDs
   * @returns {string[]} Array of workflow IDs
   */
  getWorkflowIds() {
    return Array.from(this.workflows.keys());
  }

  /**
   * Get active workflow IDs
   * @returns {string[]} Array of active workflow IDs
   */
  getActiveWorkflowIds() {
    return Array.from(this.activeWorkflows);
  }

  /**
   * Clear completed or failed workflows
   * @param {string[]} statuses - Statuses to clear (default: completed, failed, cancelled)
   */
  clearWorkflows(statuses = [WorkflowState.COMPLETED, WorkflowState.FAILED, WorkflowState.CANCELLED]) {
    for (const [workflowId, state] of this.workflows) {
      if (statuses.includes(state.status)) {
        this.workflows.delete(workflowId);
      }
    }
  }

  // Private methods

  /**
   * Execute a single step
   * @private
   */
  async _executeStep(step, context) {
    if (this.stepExecutor) {
      return await this.stepExecutor.executeStep(step, context);
    }
    
    // Default execution if no step executor
    if (typeof step.execute === 'function') {
      return await step.execute(context);
    }
    
    return { success: true, output: null };
  }

  /**
   * Run pre-execute hooks
   * @private
   */
  async _runPreExecuteHooks(step, context) {
    for (const hook of this.preExecuteHooks) {
      await hook(step, context);
    }
  }

  /**
   * Run post-execute hooks
   * @private
   */
  async _runPostExecuteHooks(step, context, result) {
    for (const hook of this.postExecuteHooks) {
      await hook(step, context, result);
    }
  }

  /**
   * Build workflow result object
   * @private
   */
  _buildWorkflowResult(state) {
    return {
      workflowId: state.id,
      workflowName: state.name,
      status: state.status,
      totalSteps: state.steps.length,
      completedSteps: state.completedSteps.length,
      failedSteps: state.failedSteps.length,
      duration: state.endTime - state.startTime,
      result: state.result,
      error: state.error
    };
  }

  /**
   * Generate a unique workflow ID
   * @private
   */
  _generateWorkflowId(name = 'workflow') {
    const sanitized = (name || 'workflow').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${sanitized}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Step types for workflow definition
 */
const StepType = {
  ACTION: 'action',
  CONDITION: 'condition',
  PARALLEL: 'parallel',
  LOOP: 'loop',
  SUBWORKFLOW: 'subworkflow'
};

/**
 * Create a simple step definition
 * @param {string} id - Step ID
 * @param {Function} execute - Execute function
 * @param {Object} options - Step options
 */
function createStep(id, execute, options = {}) {
  return {
    id,
    type: options.type || StepType.ACTION,
    execute,
    allowFailure: options.allowFailure || false,
    retry: options.retry || 0,
    timeout: options.timeout || 30000,
    dependencies: options.dependencies || []
  };
}

export { 
  OrchestrationEngine, 
  WorkflowState, 
  StepType, 
  createStep 
};