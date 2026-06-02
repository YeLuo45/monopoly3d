/**
 * HealthChecker Tests
 * Part of Direction D v7: Agent Performance Monitoring System
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { PerformanceMonitor } from '../../src/game/ai/monitor/performanceMonitor.js';
import { HealthChecker } from '../../src/game/ai/monitor/healthChecker.js';

describe('HealthChecker', () => {
  let monitor;
  let healthChecker;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    healthChecker = new HealthChecker(monitor);
  });

  it('should create instance with performance monitor', () => {
    assert.ok(healthChecker);
    assert.ok(healthChecker.performanceMonitor instanceof PerformanceMonitor);
  });

  it('should report healthy status for good metrics', () => {
    monitor.recordMetric('agent1', 'responseTime', 50, 1000);
    monitor.recordMetric('agent1', 'errorRate', 0.01, 1000);
    monitor.recordMetric('agent1', 'throughput', 50, 1000);
    monitor.recordMetric('agent1', 'successRate', 0.99, 1000);
    
    const health = healthChecker.checkAgentHealth('agent1');
    assert.strictEqual(health.status, 'healthy');
    assert.ok(health.score > 0);
  });

  it('should report degraded status for moderate issues', () => {
    monitor.recordMetric('agent1', 'responseTime', 800, 1000);
    monitor.recordMetric('agent1', 'errorRate', 0.03, 1000);
    
    const health = healthChecker.checkAgentHealth('agent1');
    assert.ok(health.status === 'degraded' || health.status === 'critical');
  });

  it('should report critical status for severe issues', () => {
    monitor.recordMetric('agent1', 'responseTime', 2000, 1000);
    monitor.recordMetric('agent1', 'errorRate', 0.15, 1000);
    monitor.recordMetric('agent1', 'successRate', 0.5, 1000);
    
    const health = healthChecker.checkAgentHealth('agent1');
    assert.strictEqual(health.status, 'critical');
  });

  it('should check individual component health', () => {
    monitor.recordMetric('agent1', 'successRate', 0.9, 1000);
    
    const componentHealth = healthChecker.checkComponentHealth('agent1', 'decisionMaking');
    assert.ok(componentHealth);
    assert.strictEqual(componentHealth.agentId, 'agent1');
    assert.strictEqual(componentHealth.component, 'decisionMaking');
  });

  it('should provide recovery actions for unhealthy agents', () => {
    monitor.recordMetric('agent1', 'responseTime', 1500, 1000);
    
    const actions = healthChecker.getRecoveryActions('agent1');
    assert.ok(Array.isArray(actions));
    assert.ok(actions.length > 0);
    assert.ok(actions[0].action);
    assert.ok(actions[0].priority);
  });

  it('should return no action for healthy agent', () => {
    monitor.recordMetric('agent1', 'responseTime', 50, 1000);
    monitor.recordMetric('agent1', 'errorRate', 0.01, 1000);
    monitor.recordMetric('agent1', 'throughput', 50, 1000);
    monitor.recordMetric('agent1', 'successRate', 0.99, 1000);
    
    const actions = healthChecker.getRecoveryActions('agent1');
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].action, 'none');
  });

  it('should check all components', () => {
    monitor.recordMetric('agent1', 'successRate', 0.9, 1000);
    
    const allComponents = healthChecker.checkAllComponents('agent1');
    assert.ok(allComponents.decisionMaking);
    assert.ok(allComponents.memoryAccess);
    assert.ok(allComponents.communication);
    assert.ok(allComponents.taskExecution);
    assert.ok(allComponents.planning);
  });

  it('should include metric stats in health check', () => {
    monitor.recordMetric('agent1', 'responseTime', 100, 1000);
    monitor.recordMetric('agent1', 'responseTime', 200, 2000);
    
    const health = healthChecker.checkAgentHealth('agent1');
    assert.ok(health.metrics);
    assert.strictEqual(health.metrics.responseTime.count, 2);
    assert.strictEqual(health.metrics.responseTime.average, 150);
  });

  it('should handle non-existent agent', () => {
    const health = healthChecker.checkAgentHealth('nonexistent');
    assert.strictEqual(health.status, 'healthy');
    assert.strictEqual(health.score, 0);
  });

  it('should generate actions sorted by priority', () => {
    monitor.recordMetric('agent1', 'responseTime', 2000, 1000);
    monitor.recordMetric('agent1', 'errorRate', 0.2, 1000);
    
    const actions = healthChecker.getRecoveryActions('agent1');
    // Verify actions are sorted by priority
    const priorityOrder = { high: 0, medium: 1, low: 2, info: 3 };
    for (let i = 1; i < actions.length; i++) {
      const prevPriority = priorityOrder[actions[i - 1].priority];
      const currPriority = priorityOrder[actions[i].priority];
      assert.ok(prevPriority <= currPriority, 'Actions should be sorted by priority');
    }
  });
});