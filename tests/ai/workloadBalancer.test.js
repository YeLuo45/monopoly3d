/**
 * Tests for WorkloadBalancer
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { WorkloadBalancer } from '../../src/game/ai/queue/workloadBalancer.js';
import { TaskQueueManager } from '../../src/game/ai/queue/taskQueueManager.js';

describe('WorkloadBalancer', () => {
  let balancer;
  let queueManager;

  beforeEach(() => {
    queueManager = new TaskQueueManager();
    queueManager.createQueue('default');
    balancer = new WorkloadBalancer(queueManager);
  });

  test('should register agents', () => {
    balancer.registerAgent('agent1', 5);
    assert.strictEqual(balancer.getAgentLoad('agent1'), 5);
  });

  test('should unregister agents', () => {
    balancer.registerAgent('agent1');
    balancer.unregisterAgent('agent1');
    assert.strictEqual(balancer.getAgentLoad('agent1'), 0);
  });

  test('should assign tasks to agents', () => {
    balancer.registerAgent('agent1');
    balancer.assignTaskToAgent('task1', 'agent1');
    assert.strictEqual(balancer.getAgentLoad('agent1'), 1);
  });

  test('should release tasks from agents', () => {
    balancer.registerAgent('agent1');
    balancer.assignTaskToAgent('task1', 'agent1');
    balancer.releaseTaskFromAgent('task1');
    assert.strictEqual(balancer.getAgentLoad('agent1'), 0);
  });

  test('should find least loaded agent', () => {
    balancer.registerAgent('agent1', 10);
    balancer.registerAgent('agent2', 5);
    balancer.registerAgent('agent3', 15);
    
    const leastLoaded = balancer.findLeastLoadedAgent();
    assert.strictEqual(leastLoaded, 'agent2');
  });

  test('should find most loaded agent', () => {
    balancer.registerAgent('agent1', 10);
    balancer.registerAgent('agent2', 5);
    balancer.registerAgent('agent3', 15);
    
    const mostLoaded = balancer.findMostLoadedAgent();
    assert.strictEqual(mostLoaded, 'agent3');
  });

  test('should get load distribution statistics', () => {
    balancer.registerAgent('agent1', 10);
    balancer.registerAgent('agent2', 20);
    
    const dist = balancer.getLoadDistribution();
    assert.strictEqual(dist.count, 2);
    assert.strictEqual(dist.min, 10);
    assert.strictEqual(dist.max, 20);
    assert.strictEqual(dist.avg, 15);
  });

  test('should get registered agents', () => {
    balancer.registerAgent('agent1', 5);
    balancer.registerAgent('agent2', 10);
    
    const agents = balancer.getRegisteredAgents();
    assert.strictEqual(agents.length, 2);
  });

  test('should suggest load adjustments for unbalanced agents', () => {
    balancer.registerAgent('agent1', 20);
    balancer.registerAgent('agent2', 5);
    
    const suggestions = balancer.suggestLoadAdjustment();
    assert.ok(suggestions.length > 0);
  });

  test('should get optimal batch size', () => {
    balancer.registerAgent('agent1');
    balancer.registerAgent('agent2');
    
    // With low task pressure (0 tasks < agentCount * 5), multiplier is 0.8
    // medium base = 10, so 10 * 0.8 = 8
    const batch = balancer.getOptimalBatchSize('medium');
    assert.strictEqual(batch.batchSize, 8);
    assert.strictEqual(batch.strategy, 'medium');
  });

  test('should return auto batch size based on system state', () => {
    // With many agents, should recommend smaller batches
    for (let i = 0; i < 10; i++) {
      balancer.registerAgent(`agent${i}`);
    }
    
    const batch = balancer.getOptimalBatchSize('auto');
    assert.ok(batch.batchSize <= 10);
  });

  test('should rebalance queues', () => {
    balancer.registerAgent('agent1', 15);
    balancer.registerAgent('agent2', 3);
    
    const result = balancer.rebalance();
    assert.strictEqual(result.queuesAnalyzed, 1);
  });

  test('should handle empty balancer gracefully', () => {
    const leastLoaded = balancer.findLeastLoadedAgent();
    assert.strictEqual(leastLoaded, null);
    
    const dist = balancer.getLoadDistribution();
    assert.strictEqual(dist.count, 0);
  });
});
