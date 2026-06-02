import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RealTimeMetricsCollector } from '../../src/game/ai/analytics/realTimeMetricsCollector.js';

describe('RealTimeMetricsCollector', () => {
  describe('recordMetric', () => {
    it('records metric for player', () => {
      const collector = new RealTimeMetricsCollector();
      collector.recordMetric('player1', 'score', 100);
      const metrics = collector.getCurrentMetrics('player1');
      assert.ok(metrics.score !== undefined);
    });
  });

  describe('getCurrentMetrics', () => {
    it('returns empty for unknown player', () => {
      const collector = new RealTimeMetricsCollector();
      const metrics = collector.getCurrentMetrics('unknown');
      assert.deepStrictEqual(metrics, {});
    });
  });

  describe('aggregateMetrics', () => {
    it('aggregates metrics over time range', () => {
      const collector = new RealTimeMetricsCollector();
      collector.recordMetric('player1', 'score', 100);
      collector.recordMetric('player1', 'score', 200);
      const result = collector.aggregateMetrics('player1', 'score', { hours: 1 });
      assert.ok(result);
    });
  });

  describe('getAverageMetric', () => {
    it('returns average for player', () => {
      const collector = new RealTimeMetricsCollector();
      collector.recordMetric('player1', 'score', 100);
      collector.recordMetric('player1', 'score', 200);
      const avg = collector.getAverageMetric('player1', 'score');
      assert.strictEqual(avg, 150);
    });

    it('returns null for unknown player', () => {
      const collector = new RealTimeMetricsCollector();
      const avg = collector.getAverageMetric('unknown', 'score');
      assert.strictEqual(avg, null);
    });
  });
});