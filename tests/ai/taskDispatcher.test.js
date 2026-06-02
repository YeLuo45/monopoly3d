/**
 * Tests for TaskDispatcher
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { TaskDispatcher, TaskPriority, TaskStatus } from '../../src/game/ai/coordination/taskDispatcher.js';

// Mock coordinator that can handle tasks
class MockCoordinator {
  canHandleTask(agentId, capabilities) {
    return capabilities.length === 0 || capabilities.includes('general');
  }
}

describe('TaskDispatcher', () => {
  let dispatcher;
  let mockCoordinator;
  
  beforeEach(() => {
    mockCoordinator = new MockCoordinator();
    dispatcher = new TaskDispatcher(mockCoordinator);
  });
  
  afterEach(() => {
    dispatcher.clear();
  });
  
  test('should enqueue tasks', () => {
    const taskId = dispatcher.enqueueTask({
      type: 'build',
      data: { property: 'park-place' },
      priority: TaskPriority.NORMAL
    });
    
    assert.ok(taskId.startsWith('task_'));
    assert.strictEqual(dispatcher.getPendingCount(), 1);
  });
  
  test('should prioritize tasks by priority level', () => {
    dispatcher.enqueueTask({ type: 'low', priority: TaskPriority.LOW });
    dispatcher.enqueueTask({ type: 'high', priority: TaskPriority.HIGH });
    dispatcher.enqueueTask({ type: 'normal', priority: TaskPriority.NORMAL });
    
    const stats = dispatcher.getStats();
    assert.strictEqual(stats.pending, 3);
  });
  
  test('should get next task for agent', () => {
    dispatcher.enqueueTask({ type: 'build', requiredCapabilities: [] });
    
    const task = dispatcher.getNextTask('agent1');
    assert.ok(task !== null);
    assert.strictEqual(task.type, 'build');
    assert.strictEqual(task.assignedAgent, 'agent1');
  });
  
  test('should complete tasks', () => {
    dispatcher.enqueueTask({ type: 'build' });
    const task = dispatcher.getNextTask('agent1');
    
    const success = dispatcher.completeTask(task.id, { result: 'built' });
    assert.ok(success);
    
    const stats = dispatcher.getStats();
    assert.strictEqual(stats.completed, 1);
  });
  
  test('should fail tasks', () => {
    dispatcher.enqueueTask({ type: 'build' });
    const task = dispatcher.getNextTask('agent1');
    
    const success = dispatcher.failTask(task.id, 'insufficient funds');
    assert.ok(success);
    
    const stats = dispatcher.getStats();
    assert.strictEqual(stats.failed, 1);
  });
  
  test('should cancel tasks', () => {
    dispatcher.enqueueTask({ type: 'build' });
    const task = dispatcher.getNextTask('agent1');
    
    const success = dispatcher.cancelTask(task.id);
    assert.ok(success);
  });
  
  test('should preempt low priority tasks for critical ones', () => {
    dispatcher.enqueueTask({ type: 'build', priority: TaskPriority.LOW });
    const task = dispatcher.getNextTask('agent1');
    
    const newTaskId = dispatcher.preemptTask(task.id, {
      type: 'emergency',
      priority: TaskPriority.CRITICAL,
      data: {}
    });
    
    assert.ok(newTaskId !== null);
  });
  
  test('should not preempt for low priority new tasks', () => {
    dispatcher.enqueueTask({ type: 'build', priority: TaskPriority.HIGH });
    const task = dispatcher.getNextTask('agent1');
    
    const newTaskId = dispatcher.preemptTask(task.id, {
      type: 'minor',
      priority: TaskPriority.LOW,
      data: {}
    });
    
    assert.strictEqual(newTaskId, null);
  });
  
  test('should return null when no tasks available', () => {
    const task = dispatcher.getNextTask('agent1');
    assert.strictEqual(task, null);
  });
  
  test('should get correct stats', () => {
    dispatcher.enqueueTask({ type: 'build' });
    dispatcher.enqueueTask({ type: 'trade' });
    
    const stats = dispatcher.getStats();
    assert.strictEqual(stats.pending, 2);
    assert.strictEqual(stats.active, 0);
  });
  
  test('should clear all tasks', () => {
    dispatcher.enqueueTask({ type: 'build' });
    dispatcher.clear();
    
    const stats = dispatcher.getStats();
    assert.strictEqual(stats.pending, 0);
  });
});