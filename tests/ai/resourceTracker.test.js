/**
 * ResourceTracker Tests
 * Part of Direction D v7: Agent Performance Monitoring System
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ResourceTracker } from '../../src/game/ai/monitor/resourceTracker.js';

describe('ResourceTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new ResourceTracker();
  });

  it('should create instance with default resource types', () => {
    assert.ok(tracker);
    assert.ok(tracker.usage instanceof Map);
    assert.ok(tracker.resourceTypes.includes('cpu'));
    assert.ok(tracker.resourceTypes.includes('memory'));
  });

  it('should track resource usage', () => {
    tracker.trackUsage('cpu', 10, 'agent1');
    tracker.trackUsage('cpu', 5, 'agent1');
    
    const usage = tracker.getUsage('agent1', 'cpu');
    assert.strictEqual(usage, 15);
  });

  it('should throw for invalid resource type', () => {
    assert.throws(() => {
      tracker.trackUsage('invalid', 10, 'agent1');
    }, /Invalid resource type/);
  });

  it('should get current usage for agent and resource', () => {
    tracker.trackUsage('memory', 100, 'agent1');
    tracker.trackUsage('memory', 50, 'agent1');
    
    const usage = tracker.getUsage('agent1', 'memory');
    assert.strictEqual(usage, 150);
  });

  it('should return 0 for non-existent agent', () => {
    const usage = tracker.getUsage('nonexistent', 'cpu');
    assert.strictEqual(usage, 0);
  });

  it('should set resource limits', () => {
    tracker.setLimit('agent1', 'cpu', 100);
    tracker.trackUsage('cpu', 50, 'agent1');
    
    const check = tracker.checkLimit('agent1', 'cpu');
    assert.strictEqual(check.exceeded, false);
    assert.strictEqual(check.limit, 100);
  });

  it('should detect exceeded limits', () => {
    tracker.setLimit('agent1', 'cpu', 100);
    tracker.trackUsage('cpu', 150, 'agent1');
    
    const check = tracker.checkLimit('agent1', 'cpu');
    assert.strictEqual(check.exceeded, true);
    assert.strictEqual(check.overAmount, 50);
    assert.strictEqual(check.percentage, 150);
  });

  it('should reset usage for agent', () => {
    tracker.trackUsage('cpu', 50, 'agent1');
    tracker.trackUsage('memory', 100, 'agent1');
    tracker.resetUsage('agent1');
    
    assert.strictEqual(tracker.getUsage('agent1', 'cpu'), 0);
    assert.strictEqual(tracker.getUsage('agent1', 'memory'), 0);
  });

  it('should reset specific resource usage', () => {
    tracker.trackUsage('cpu', 50, 'agent1');
    tracker.trackUsage('memory', 100, 'agent1');
    tracker.resetUsage('agent1', 'cpu');
    
    assert.strictEqual(tracker.getUsage('agent1', 'cpu'), 0);
    assert.strictEqual(tracker.getUsage('agent1', 'memory'), 100);
  });

  it('should track history of resource usage', () => {
    tracker.trackUsage('cpu', 10, 'agent1');
    tracker.trackUsage('cpu', 20, 'agent1');
    tracker.trackUsage('cpu', 30, 'agent1');
    
    const history = tracker.getHistory('agent1', 'cpu');
    assert.strictEqual(history.length, 3);
  });

  it('should track peak usage', () => {
    tracker.trackUsage('cpu', 10, 'agent1');
    tracker.trackUsage('cpu', 30, 'agent1');
    tracker.trackUsage('cpu', 20, 'agent1');
    
    // Peak should be the maximum cumulative usage observed (60 after all three)
    const peak = tracker.getPeak('agent1', 'cpu');
    assert.strictEqual(peak, 60);
  });

  it('should get all usage for an agent', () => {
    tracker.trackUsage('cpu', 50, 'agent1');
    tracker.trackUsage('memory', 100, 'agent1');
    
    const allUsage = tracker.getAllUsage('agent1');
    assert.ok(allUsage.cpu);
    assert.ok(allUsage.memory);
    assert.strictEqual(allUsage.cpu.current, 50);
    assert.strictEqual(allUsage.memory.current, 100);
  });

  it('should return empty object for non-existent agent in getAllUsage', () => {
    const allUsage = tracker.getAllUsage('nonexistent');
    assert.deepStrictEqual(allUsage, {});
  });
});