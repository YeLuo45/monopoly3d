/**
 * Workflow Builder
 * 
 * Builder for creating and managing workflow definitions.
 * Supports step dependencies and topological sorting for execution order.
 */

const StepType = {
  ACTION: 'action',
  CONDITION: 'condition',
  PARALLEL: 'parallel',
  LOOP: 'loop',
  SUBWORKFLOW: 'subworkflow'
};

class WorkflowBuilder {
  /**
   * Create a new WorkflowBuilder
   * @param {OrchestrationEngine} engine - The orchestration engine
   */
  constructor(engine) {
    this.engine = engine;
    
    // Workflow definitions: workflowId -> workflow definition
    this.workflows = new Map();
    
    // Step registry for validation
    this.stepRegistry = new Map();
    
    // Dependency graph: stepId -> Set of dependent stepIds
    this.dependencies = new Map();
  }

  /**
   * Create a new workflow definition
   * @param {string} name - Workflow name
   * @param {Array} steps - Initial steps array
   * @returns {string} Workflow ID
   */
  createWorkflow(name, steps = []) {
    const workflowId = this._generateWorkflowId(name);
    
    const workflow = {
      id: workflowId,
      name: name,
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {}
    };
    
    this.workflows.set(workflowId, workflow);
    
    // Add initial steps if provided
    for (const step of steps) {
      this.addStep(workflowId, step);
    }
    
    return workflowId;
  }

  /**
   * Add a step to a workflow
   * @param {string} workflowId - The workflow ID
   * @param {Object} step - Step definition
   * @returns {boolean} True if added successfully
   */
  addStep(workflowId, step) {
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    // Ensure step has an ID
    if (!step.id) {
      step.id = `step_${workflow.steps.length + 1}`;
    }
    
    // Register step
    this.stepRegistry.set(step.id, {
      ...step,
      workflowId: workflowId,
      addedAt: Date.now()
    });
    
    // Add to workflow
    workflow.steps.push(step);
    workflow.updatedAt = Date.now();
    
    // Initialize dependency tracking
    if (!this.dependencies.has(step.id)) {
      this.dependencies.set(step.id, new Set());
    }
    
    return true;
  }

  /**
   * Set a dependency between steps (stepB depends on stepA)
   * @param {string} stepA - The dependency step (must complete first)
   * @param {string} stepB - The dependent step
   * @returns {boolean} True if dependency set successfully
   */
  setStepDependency(stepA, stepB) {
    // Verify both steps exist
    if (!this.stepRegistry.has(stepA)) {
      throw new Error(`Step ${stepA} not found in registry`);
    }
    
    if (!this.stepRegistry.has(stepB)) {
      throw new Error(`Step ${stepB} not found in registry`);
    }
    
    // stepB depends on stepA, so stepA must execute before stepB
    const deps = this.dependencies.get(stepB);
    deps.add(stepA);
    
    return true;
  }

  /**
   * Get a step by ID
   * @param {string} stepId - The step ID
   * @returns {Object|null} Step definition
   */
  getStep(stepId) {
    return this.stepRegistry.get(stepId) || null;
  }

  /**
   * Get workflow definition
   * @param {string} workflowId - The workflow ID
   * @returns {Object|null} Workflow definition
   */
  getWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    return workflow ? { ...workflow } : null;
  }

  /**
   * Get all workflow IDs
   * @returns {string[]} Array of workflow IDs
   */
  getWorkflowIds() {
    return Array.from(this.workflows.keys());
  }

  /**
   * Validate a workflow for errors
   * @param {string} workflowId - The workflow ID
   * @returns {Object} Validation result with errors array
   */
  validateWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      return {
        valid: false,
        errors: [`Workflow ${workflowId} not found`]
      };
    }
    
    const errors = [];
    const warnings = [];
    
    // Check for empty workflow
    if (workflow.steps.length === 0) {
      warnings.push('Workflow has no steps');
    }
    
    // Check for duplicate step IDs
    const stepIds = new Set();
    for (const step of workflow.steps) {
      if (step.id && stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);
    }
    
    // Check for circular dependencies
    const circularDeps = this._detectCircularDependencies(workflowId);
    if (circularDeps.length > 0) {
      errors.push(`Circular dependency detected: ${circularDeps.join(' -> ')}`);
    }
    
    // Check for missing dependencies
    for (const step of workflow.steps) {
      const deps = this.dependencies.get(step.id) || new Set();
      for (const depId of deps) {
        if (!stepIds.has(depId)) {
          errors.push(`Step ${step.id} depends on non-existent step ${depId}`);
        }
      }
    }
    
    // Check for steps without valid execute function
    for (const step of workflow.steps) {
      if (step.type === StepType.ACTION && typeof step.execute !== 'function') {
        errors.push(`Step ${step.id} has no execute function`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get the execution order for a workflow using topological sort
   * @param {string} workflowId - The workflow ID
   * @returns {Array} Array of step IDs in execution order
   */
  getExecutionOrder(workflowId) {
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    // Build adjacency list for topological sort
    const inDegree = new Map();
    const adjacency = new Map();
    
    // Initialize
    for (const step of workflow.steps) {
      inDegree.set(step.id, 0);
      adjacency.set(step.id, []);
    }
    
    // Build graph
    for (const step of workflow.steps) {
      const deps = this.dependencies.get(step.id) || new Set();
      for (const depId of deps) {
        // depId must come before step.id
        adjacency.get(depId).push(step.id);
        inDegree.set(step.id, inDegree.get(step.id) + 1);
      }
    }
    
    // Kahn's algorithm for topological sort
    const queue = [];
    const result = [];
    
    // Start with nodes that have no dependencies
    for (const [stepId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(stepId);
      }
    }
    
    while (queue.length > 0) {
      const current = queue.shift();
      result.push(current);
      
      const neighbors = adjacency.get(current) || [];
      for (const neighbor of neighbors) {
        const newDegree = inDegree.get(neighbor) - 1;
        inDegree.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }
    
    // Check for cycle (if not all nodes are in result)
    if (result.length !== workflow.steps.length) {
      throw new Error('Circular dependency detected - topological sort failed');
    }
    
    return result;
  }

  /**
   * Get steps that a specific step depends on
   * @param {string} stepId - The step ID
   * @returns {string[]} Array of step IDs this step depends on
   */
  getDependencies(stepId) {
    const deps = this.dependencies.get(stepId);
    return deps ? Array.from(deps) : [];
  }

  /**
   * Get steps that depend on a specific step
   * @param {string} stepId - The step ID
   * @returns {string[]} Array of step IDs that depend on this step
   */
  getDependents(stepId) {
    const dependents = [];
    
    for (const [stepIdKey, deps] of this.dependencies) {
      if (deps.has(stepId)) {
        dependents.push(stepIdKey);
      }
    }
    
    return dependents;
  }

  /**
   * Remove a step from a workflow
   * @param {string} workflowId - The workflow ID
   * @param {string} stepId - The step ID to remove
   * @returns {boolean} True if removed successfully
   */
  removeStep(workflowId, stepId) {
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      return false;
    }
    
    const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      return false;
    }
    
    workflow.steps.splice(stepIndex, 1);
    this.stepRegistry.delete(stepId);
    this.dependencies.delete(stepId);
    
    // Remove this step from other dependencies
    for (const deps of this.dependencies.values()) {
      deps.delete(stepId);
    }
    
    workflow.updatedAt = Date.now();
    return true;
  }

  /**
   * Update a step in a workflow
   * @param {string} workflowId - The workflow ID
   * @param {string} stepId - The step ID to update
   * @param {Object} updates - Updates to apply
   * @returns {boolean} True if updated successfully
   */
  updateStep(workflowId, stepId, updates) {
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      return false;
    }
    
    const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      return false;
    }
    
    workflow.steps[stepIndex] = {
      ...workflow.steps[stepIndex],
      ...updates,
      id: stepId // Prevent ID changes
    };
    
    workflow.updatedAt = Date.now();
    return true;
  }

  /**
   * Clear all workflows
   */
  clearAll() {
    this.workflows.clear();
    this.stepRegistry.clear();
    this.dependencies.clear();
  }

  // Private methods

  /**
   * Detect circular dependencies in a workflow
   * @private
   */
  _detectCircularDependencies(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return [];
    
    const visited = new Set();
    const recursionStack = new Set();
    const cyclePath = [];
    
    const dfs = (stepId) => {
      visited.add(stepId);
      recursionStack.add(stepId);
      cyclePath.push(stepId);
      
      const deps = this.dependencies.get(stepId) || new Set();
      for (const depId of deps) {
        if (!visited.has(depId)) {
          const cycle = dfs(depId);
          if (cycle) return cycle;
        } else if (recursionStack.has(depId)) {
          cyclePath.push(depId);
          return cyclePath.slice(cyclePath.indexOf(depId));
        }
      }
      
      recursionStack.delete(stepId);
      cyclePath.pop();
      return null;
    };
    
    for (const step of workflow.steps) {
      if (!visited.has(step.id)) {
        const cycle = dfs(step.id);
        if (cycle) return cycle;
      }
    }
    
    return [];
  }

  /**
   * Generate a unique workflow ID
   * @private
   */
  _generateWorkflowId(name) {
    const sanitized = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${sanitized}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create a step definition
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

export { WorkflowBuilder, StepType, createStep };