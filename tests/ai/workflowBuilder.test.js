/**
 * Tests for WorkflowBuilder
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { WorkflowBuilder, StepType, createStep } from '../../src/game/ai/orchestrate/workflowBuilder.js';
import { OrchestrationEngine } from '../../src/game/ai/orchestrate/orchestrationEngine.js';

describe('WorkflowBuilder', () => {
  let engine;
  let builder;

  beforeEach(() => {
    const mockCoordinator = {};
    const mockMessageBus = {};
    const mockBlackboard = {};
    engine = new OrchestrationEngine(mockCoordinator, mockMessageBus, mockBlackboard);
    builder = new WorkflowBuilder(engine);
  });

  afterEach(() => {
    builder.clearAll();
  });

  test('should create a workflow', () => {
    const workflowId = builder.createWorkflow('Test Workflow');
    assert.ok(workflowId);
    assert.ok(builder.getWorkflow(workflowId));
  });

  test('should add steps to workflow', () => {
    const workflowId = builder.createWorkflow('Step Add Test');
    const step = createStep('step1', async (ctx) => ({ success: true }));
    builder.addStep(workflowId, step);
    
    const workflow = builder.getWorkflow(workflowId);
    assert.strictEqual(workflow.steps.length, 1);
    assert.strictEqual(workflow.steps[0].id, 'step1');
  });

  test('should set step dependencies', () => {
    const workflowId = builder.createWorkflow('Dependency Test');
    builder.addStep(workflowId, createStep('step1', async (ctx) => ({})));
    builder.addStep(workflowId, createStep('step2', async (ctx) => ({})));
    
    builder.setStepDependency('step1', 'step2');
    
    const deps = builder.getDependencies('step2');
    assert.ok(deps.includes('step1'));
  });

  test('should validate workflow without errors', () => {
    const workflowId = builder.createWorkflow('Valid Test');
    builder.addStep(workflowId, createStep('step1', async (ctx) => ({})));
    builder.addStep(workflowId, createStep('step2', async (ctx) => ({})));
    
    const validation = builder.validateWorkflow(workflowId);
    assert.ok(validation.valid);
    assert.strictEqual(validation.errors.length, 0);
  });

  test('should detect duplicate step IDs', () => {
    const workflowId = builder.createWorkflow('Duplicate Test');
    builder.addStep(workflowId, createStep('step1', async (ctx) => ({})));
    builder.addStep(workflowId, createStep('step1', async (ctx) => ({})));
    
    const validation = builder.validateWorkflow(workflowId);
    assert.ok(!validation.valid);
  });

  test('should get execution order', () => {
    const workflowId = builder.createWorkflow('Execution Order Test');
    builder.addStep(workflowId, createStep('step1', async (ctx) => ({})));
    builder.addStep(workflowId, createStep('step2', async (ctx) => ({})));
    builder.addStep(workflowId, createStep('step3', async (ctx) => ({})));
    
    builder.setStepDependency('step1', 'step2');
    builder.setStepDependency('step2', 'step3');
    
    const order = builder.getExecutionOrder(workflowId);
    assert.strictEqual(order[0], 'step1');
    assert.strictEqual(order[1], 'step2');
    assert.strictEqual(order[2], 'step3');
  });

  test('should get step dependents', () => {
    const workflowId = builder.createWorkflow('Dependents Test');
    builder.addStep(workflowId, createStep('step1', async (ctx) => ({})));
    builder.addStep(workflowId, createStep('step2', async (ctx) => ({})));
    
    builder.setStepDependency('step1', 'step2');
    
    const dependents = builder.getDependents('step1');
    assert.ok(dependents.includes('step2'));
  });

  test('should remove steps', () => {
    const workflowId = builder.createWorkflow('Remove Test');
    builder.addStep(workflowId, createStep('step1', async (ctx) => ({})));
    builder.addStep(workflowId, createStep('step2', async (ctx) => ({})));
    
    const removed = builder.removeStep(workflowId, 'step1');
    assert.ok(removed);
    
    const workflow = builder.getWorkflow(workflowId);
    assert.strictEqual(workflow.steps.length, 1);
  });

  test('should throw on circular dependency', () => {
    const workflowId = builder.createWorkflow('Circular Test');
    builder.addStep(workflowId, createStep('step1', async (ctx) => ({})));
    builder.addStep(workflowId, createStep('step2', async (ctx) => ({})));
    builder.addStep(workflowId, createStep('step3', async (ctx) => ({})));
    
    builder.setStepDependency('step1', 'step2');
    builder.setStepDependency('step2', 'step3');
    builder.setStepDependency('step3', 'step1'); // Creates cycle
    
    const validation = builder.validateWorkflow(workflowId);
    assert.ok(!validation.valid);
    assert.ok(validation.errors.some(e => e.includes('Circular')));
  });
});