/**
 * PerformanceMonitor Tests
 * Part of Direction D v7: Agent Performance Monitoring System
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { PerformanceMonitor } from '../../src/game/ai/monitor/performanceMonitor.js';

describe('PerformanceMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    monitor = null;
  });

  it('should create instance with default thresholds', () => {
    assert.ok(monitor);
    assert.ok(monitor.metrics instanceof Map);
    assert.strictEqual(monitor.thresholds.responseTime, 1000);
    assert.strictEqual(monitor.thresholds.errorRate, 0.05);
  });

  it('should record metrics for an agent', () => {
    monitor.recordMetric('agent1', 'responseTime', 150, 1000);
    monitor.recordMetric('agent1', 'responseTime', 200, 2000);
    
    const metrics = monitor.getAgentMetrics('agent1', 'responseTime');
    assert.strictEqual(metrics.length, 2);
    assert.strictEqual(metrics[0].value, 150);
    assert.strictEqual(metrics[1].value, 200);
  });

  it('should filter metrics by time range', () => {
    monitor.recordMetric('agent1', 'responseTime', 100, 1000);
    monitor.recordMetric('agent1', 'responseTime', 200, 2000);
    monitor.recordMetric('agent1', 'responseTime', 300, 3000);
    
    const metrics = monitor.getAgentMetrics('agent1', 'responseTime', { start: 1500, end: 2500 });
    assert.strictEqual(metrics.length, 1);
    assert.strictEqual(metrics[0].value, 200);
  });

  it('should calculate agent score based on metrics', () => {
    monitor.recordMetric('agent1', 'responseTime', 500, 1000);
    monitor.recordMetric('agent1', 'errorRate', 0.02, 1000);
    monitor.recordMetric('agent1', 'throughput', 15, 1000);
    monitor.recordMetric('agent1', 'successRate', 0.95, 1000);
    
    const score = monitor.getAgentScore('agent1');
    assert.ok(score >= 0 && score <= 100);
  });

  it('should return 0 score for non-existent agent', () => {
    const score = monitor.getAgentScore('nonexistent');
    assert.strictEqual(score, 0);
  });

  it('should compare two agents', () => {
    monitor.recordMetric('agentA', 'responseTime', 500, 1000);
    monitor.recordMetric('agentA', 'successRate', 0.95, 1000);
    monitor.recordMetric('agentB', 'responseTime', 300, 1000);
    monitor.recordMetric('agentB', 'successRate', 0.98, 1000);
    
    const comparison = monitor.compareAgents('agentA', 'agentB');
    assert.ok(comparison);
    assert.strictEqual(comparison.agentA, 'agentA');
    assert.strictEqual(comparison.agentB, 'agentB');
    assert.ok(typeof comparison.scoreA === 'number');
    assert.ok(typeof comparison.scoreB === 'number');
  });

  it('should generate performance alerts for slow response time', () => {
    monitor.recordMetric('agent1', 'responseTime', 1500, 1000);
    monitor.recordMetric('agent1', 'responseTime', 2000, 2000);
    
    const alerts = monitor.getPerformanceAlerts('agent1');
    assert.ok(alerts.length > 0);
    assert.ok(alerts.some(a => a.type === 'responseTime'));
  });

  it('should generate performance alerts for high error rate', () => {
    monitor.recordMetric('agent1', 'errorRate', 0.1, 1000);
    monitor.recordMetric('agent1', 'errorRate', 0.15, 2000);
    
    const alerts = monitor.getPerformanceAlerts('agent1');
    assert.ok(alerts.length > 0);
    assert.ok(alerts.some(a => a.type === 'errorRate'));
  });

  it('should return empty alerts for healthy agent', () => {
    monitor.recordMetric('agent1', 'responseTime', 50, 1000);
    monitor.recordMetric('agent1', 'errorRate', 0.01, 1000);
    monitor.recordMetric('agent1', 'throughput', 50, 1000);
    monitor.recordMetric('agent1', 'successRate', 0.99, 1000);
    
    const alerts = monitor.getPerformanceAlerts('agent1');
    assert.strictEqual(alerts.length, 0);
  });

  it('should allow setting custom thresholds', () => {
    monitor.setThreshold('responseTime', 500);
    assert.strictEqual(monitor.thresholds.responseTime, 500);
  });

  it('should clear metrics for an agent', () => {
    monitor.recordMetric('agent1', 'responseTime', 100, 1000);
    monitor.clearMetrics('agent1');
    
    const metrics = monitor.getAgentMetrics('agent1', 'responseTime');
    assert.strictEqual(metrics.length, 0);
  });

  it('should handle multiple agents independently', () => {
    monitor.recordMetric('agent1', 'responseTime', 100, 1000);
    monitor.recordMetric('agent2', 'responseTime', 200, 1000);
    
    const metrics1 = monitor.getAgentMetrics('agent1', 'responseTime');
    const metrics2 = monitor.getAgentMetrics('agent2', 'responseTime');
    
    assert.strictEqual(metrics1.length, 1);
    assert.strictEqual(metrics1[0].value, 100);
    assert.strictEqual(metrics2.length, 1);
    assert.strictEqual(metrics2[0].value, 200);
  });

  it('should limit stored metrics to 1000 entries', () => {
    for (let i = 0; i < 1050; i++) {
      monitor.recordMetric('agent1', 'responseTime', i, i);
    }
    
    const metrics = monitor.getAgentMetrics('agent1', 'responseTime');
    assert.ok(metrics.length <= 1000);
  });

  it('should throw for invalid metric type retrieval', () => {
    const metrics = monitor.getAgentMetrics('nonexistent', 'responseTime');
    assert.strictEqual(metrics.length, 0);
  });
});