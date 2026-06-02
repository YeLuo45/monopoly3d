/**
 * Tests for StepExecutor
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { 
  StepExecutor, 
  StepStatus, 
  createRetryableStep, 
  createRollbackableStep 
} from '../../src/game/ai/orchestrate/stepExecutor.js';
import { OrchestrationEngine } from '../../src/game/ai/orchestrate/orchestrationEngine.js';

describe('StepExecutor', () => {
  let engine;
  let executor;

  beforeEach(() => {
    const mockCoordinator = {};
    const mockMessageBus = {};
    const mockBlackboard = {};
    engine = new OrchestrationEngine(mockCoordinator, mockMessageBus, mockBlackboard);
    executor = new StepExecutor(engine);
  });

  afterEach(() => {
    executor.clearStepStates();
  });

  test('should execute a simple step', async () => {
    const step = {
      id: 'test_step',
      execute: async (ctx) => ({ success: true, output: 'done' })
    };

    const result = await executor.executeStep(step, {});
    assert.ok(result.success);
    assert.strictEqual(result.output, 'done');
  });

  test('should track step state', async () => {
    const step = { id: 'state_test', execute: async (ctx) => ({ success: true }) };
    await executor.executeStep(step, {});
    
    const state = executor.getStepState('state_test');
    assert.strictEqual(state.status, StepStatus.COMPLETED);
  });

  test('should execute steps in parallel', async () => {
    const steps = [
      { id: 'parallel1', execute: async (ctx) => ({ success: true }) },
      { id: 'parallel2', execute: async (ctx) => ({ success: true }) },
      { id: 'parallel3', execute: async (ctx) => ({ success: true }) }
    ];

    const results = await executor.executeParallel(steps, {});
    assert.strictEqual(results.length, 3);
    assert.ok(results.every(r => r.success));
  });

  test('should retry failed steps', async () => {
    let attempts = 0;
    const step = {
      id: 'retry_test',
      execute: async (ctx) => {
        attempts++;
        if (attempts < 3) throw new Error('Temporary failure');
        return { success: true };
      }
    };

    const result = await executor.retryStep(step, {}, 3);
    assert.ok(result.success);
    assert.strictEqual(attempts, 3);
  });

  test('should register rollback handler', () => {
    const handler = async (ctx) => ({ success: true, rolledBack: true });
    executor.registerRollbackHandler('rollback_test', handler);
    
    assert.ok(executor.hasRollbackHandler('rollback_test'));
  });

  test('should rollback a step', async () => {
    executor.registerRollbackHandler('rollback_step', async (ctx) => {
      return { success: true };
    });

    const step = { id: 'rollback_step' };
    const result = await executor.rollbackStep(step, { rollbackData: {} });
    
    assert.ok(result.success);
  });

  test('should fail rollback without handler', async () => {
    const step = { id: 'no_handler_step' };
    const result = await executor.rollbackStep(step, {});
    
    assert.ok(!result.success);
    assert.ok(result.error.includes('No rollback handler'));
  });

  test('should handle step timeout', async () => {
    const step = {
      id: 'timeout_test',
      timeout: 50,
      execute: async (ctx) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true };
      }
    };

    const result = await executor.executeStep(step, {});
    assert.ok(!result.success);
    assert.ok(result.error.includes('timed out'));
  });
});