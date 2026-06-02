/**
 * Tests for TaskScheduler
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { TaskScheduler } from '../../src/game/ai/queue/taskScheduler.js';
import { TaskQueueManager } from '../../src/game/ai/queue/taskQueueManager.js';

describe('TaskScheduler', () => {
  let scheduler;
  let queueManager;

  beforeEach(() => {
    queueManager = new TaskQueueManager();
    queueManager.createQueue('default');
    scheduler = new TaskScheduler(queueManager);
  });

  test('should schedule a task for future execution', () => {
    const taskId = scheduler.scheduleTask({ type: 'test' }, 1000);
    assert.ok(taskId.startsWith('scheduled_'));
    
    const tasks = scheduler.getScheduledTasks();
    assert.strictEqual(tasks.length, 1);
    assert.strictEqual(tasks[0].type, 'one-time');
  });

  test('should schedule a recurring task', () => {
    const taskId = scheduler.scheduleRecurring({ type: 'recurring' }, 5000);
    assert.ok(taskId.startsWith('recurring_'));
    
    const tasks = scheduler.getScheduledTasks();
    assert.strictEqual(tasks.length, 1);
    assert.strictEqual(tasks[0].type, 'recurring');
  });

  test('should cancel a scheduled task', () => {
    const taskId = scheduler.scheduleTask({ type: 'test' }, 1000);
    const result = scheduler.cancelScheduled(taskId);
    assert.strictEqual(result, true);
    assert.strictEqual(scheduler.isScheduled(taskId), false);
  });

  test('should return false when canceling non-existent task', () => {
    const result = scheduler.cancelScheduled('non-existent');
    assert.strictEqual(result, false);
  });

  test('should tick and execute due tasks', () => {
    scheduler.scheduleTask({ type: 'immediate' }, 0, 'default');
    
    const executed = scheduler.tick(Date.now());
    assert.strictEqual(executed.length, 1);
    assert.strictEqual(queueManager.getQueueSize('default'), 1);
  });

  test('should not execute future tasks on early tick', () => {
    scheduler.scheduleTask({ type: 'future' }, 10000);
    
    const executed = scheduler.tick(Date.now());
    assert.strictEqual(executed.length, 0);
    assert.strictEqual(queueManager.getQueueSize('default'), 0);
  });

  test('should execute recurring tasks on tick', () => {
    scheduler.scheduleRecurring({ type: 'recurring' }, 100);
    
    // First tick - task should execute as nextExecutionAt = now + 100 <= now + 100
    const now = Date.now();
    scheduler.tick(now + 100); // Wait until due
    assert.strictEqual(queueManager.getQueueSize('default'), 1);
    
    // Second tick after interval
    scheduler.tick(now + 200);
    assert.strictEqual(queueManager.getQueueSize('default'), 2);
  });

  test('should get scheduled task counts', () => {
    scheduler.scheduleTask({ type: 'one' }, 1000);
    scheduler.scheduleTask({ type: 'two' }, 2000);
    scheduler.scheduleRecurring({ type: 'rec' }, 5000);
    
    const counts = scheduler.getScheduledTaskCounts();
    assert.strictEqual(counts.oneTime, 2);
    assert.strictEqual(counts.recurring, 1);
    assert.strictEqual(counts.total, 3);
  });

  test('should pause and resume recurring tasks', () => {
    const taskId = scheduler.scheduleRecurring({ type: 'recurring' }, 100);
    
    scheduler.pauseRecurring(taskId);
    const tasks = scheduler.getScheduledTasks();
    assert.strictEqual(tasks[0].status, 'paused');
    
    scheduler.resumeRecurring(taskId);
    const tasksAfterResume = scheduler.getScheduledTasks();
    assert.strictEqual(tasksAfterResume[0].status, 'active');
  });

  test('should update recurring task interval', () => {
    const taskId = scheduler.scheduleRecurring({ type: 'recurring' }, 1000);
    
    scheduler.updateRecurringInterval(taskId, 5000);
    const tasks = scheduler.getScheduledTasks();
    assert.strictEqual(tasks[0].interval, 5000);
  });

  test('should clear all scheduled tasks', () => {
    scheduler.scheduleTask({ type: 'one' }, 1000);
    scheduler.scheduleRecurring({ type: 'rec' }, 5000);
    
    const cleared = scheduler.clearAll();
    assert.strictEqual(cleared.oneTime, 1);
    assert.strictEqual(cleared.recurring, 1);
    assert.strictEqual(scheduler.getScheduledTaskCounts().total, 0);
  });

  test('should check if task is scheduled', () => {
    const taskId = scheduler.scheduleTask({ type: 'test' }, 1000);
    assert.strictEqual(scheduler.isScheduled(taskId), true);
    assert.strictEqual(scheduler.isScheduled('non-existent'), false);
  });
});
