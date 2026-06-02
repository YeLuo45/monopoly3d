/**
 * Tests for TaskQueueManager
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { TaskQueueManager } from '../../src/game/ai/queue/taskQueueManager.js';

describe('TaskQueueManager', () => {
  let manager;

  beforeEach(() => {
    manager = new TaskQueueManager();
  });

  test('should create a new queue', () => {
    const result = manager.createQueue('test-queue', { priority: 5 });
    assert.strictEqual(result.id, 'test-queue');
    assert.strictEqual(result.priority, 5);
    assert.strictEqual(result.size, 0);
  });

  test('should throw error when creating duplicate queue', () => {
    manager.createQueue('test-queue');
    assert.throws(() => {
      manager.createQueue('test-queue');
    }, /already exists/);
  });

  test('should enqueue tasks', () => {
    manager.createQueue('test-queue');
    const taskId = manager.enqueue('test-queue', { type: 'build' });
    assert.ok(taskId);
    assert.strictEqual(manager.getQueueSize('test-queue'), 1);
  });

  test('should return null when enqueuing to full queue', () => {
    manager.createQueue('test-queue', { maxSize: 2 });
    manager.enqueue('test-queue', { type: 'task1' });
    manager.enqueue('test-queue', { type: 'task2' });
    const result = manager.enqueue('test-queue', { type: 'task3' });
    assert.strictEqual(result, null);
  });

  test('should dequeue tasks in priority order', () => {
    manager.createQueue('test-queue');
    manager.enqueue('test-queue', { type: 'low', priority: 1 });
    manager.enqueue('test-queue', { type: 'high', priority: 10 });
    manager.enqueue('test-queue', { type: 'medium', priority: 5 });
    
    const first = manager.dequeue('test-queue');
    assert.strictEqual(first.type, 'high');
    
    const second = manager.dequeue('test-queue');
    assert.strictEqual(second.type, 'medium');
    
    const third = manager.dequeue('test-queue');
    assert.strictEqual(third.type, 'low');
  });

  test('should peek at next task without removing', () => {
    manager.createQueue('test-queue');
    manager.enqueue('test-queue', { type: 'first' });
    manager.enqueue('test-queue', { type: 'second' });
    
    const peeked = manager.peek('test-queue');
    assert.strictEqual(peeked.type, 'first');
    assert.strictEqual(manager.getQueueSize('test-queue'), 2);
  });

  test('should clear a queue', () => {
    manager.createQueue('test-queue');
    manager.enqueue('test-queue', { type: 'task1' });
    manager.enqueue('test-queue', { type: 'task2' });
    
    const cleared = manager.clearQueue('test-queue');
    assert.strictEqual(cleared, 2);
    assert.strictEqual(manager.getQueueSize('test-queue'), 0);
  });

  test('should get all queues', () => {
    manager.createQueue('queue1');
    manager.createQueue('queue2');
    
    const queues = manager.getAllQueues();
    assert.strictEqual(queues.length, 2);
  });

  test('should set and get queue priority', () => {
    manager.createQueue('test-queue', { priority: 0 });
    manager.setPriority('test-queue', 10);
    assert.strictEqual(manager.getQueuePriority('test-queue'), 10);
  });

  test('should throw error for non-existent queue operations', () => {
    assert.throws(() => {
      manager.enqueue('non-existent', { type: 'task' });
    }, /does not exist/);
    
    assert.throws(() => {
      manager.dequeue('non-existent');
    }, /does not exist/);
  });

  test('should check queue existence', () => {
    manager.createQueue('test-queue');
    assert.strictEqual(manager.hasQueue('test-queue'), true);
    assert.strictEqual(manager.hasQueue('non-existent'), false);
  });

  test('should delete a queue', () => {
    manager.createQueue('test-queue');
    const result = manager.deleteQueue('test-queue');
    assert.strictEqual(result, true);
    assert.strictEqual(manager.hasQueue('test-queue'), false);
  });

  test('should get total tasks across all queues', () => {
    manager.createQueue('queue1');
    manager.createQueue('queue2');
    manager.enqueue('queue1', { type: 'task1' });
    manager.enqueue('queue1', { type: 'task2' });
    manager.enqueue('queue2', { type: 'task3' });
    
    assert.strictEqual(manager.getTotalTasks(), 3);
  });

  test('should get queue statistics', () => {
    manager.createQueue('test-queue');
    manager.enqueue('test-queue', { type: 'task1' });
    manager.enqueue('test-queue', { type: 'task2' });
    
    const stats = manager.getQueueStats('test-queue');
    assert.strictEqual(stats.enqueued, 2);
    assert.strictEqual(stats.dequeued, 0);
    assert.strictEqual(stats.currentSize, 2);
  });

  test('should get all tasks from a queue', () => {
    manager.createQueue('test-queue');
    manager.enqueue('test-queue', { type: 'task1' });
    manager.enqueue('test-queue', { type: 'task2' });
    
    const tasks = manager.getTasks('test-queue');
    assert.strictEqual(tasks.length, 2);
    assert.strictEqual(tasks[0].type, 'task1');
  });
});
