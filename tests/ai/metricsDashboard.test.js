import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MetricsDashboard } from '../../src/game/ai/analytics/metricsDashboard.js';

function createMockEngine() {
  return {
    analyzePlayerPerformance: (playerId) => playerId ? { score: 100 } : null,
    getInsights: (playerId) => [{ type: 'performance', message: 'Good' }],
    getRecommendations: (playerId) => [{ action: 'improve', target: 'score' }],
  };
}

describe('MetricsDashboard', () => {
  describe('getDashboardData', () => {
    it('returns dashboard data for player', () => {
      const engine = createMockEngine();
      const dashboard = new MetricsDashboard(engine);
      const data = dashboard.getDashboardData('player1');
      assert.ok(data);
      assert.ok(data.performance);
    });

    it('returns null for unknown player', () => {
      const engine = createMockEngine();
      const dashboard = new MetricsDashboard(engine);
      const data = dashboard.getDashboardData('unknown');
      assert.strictEqual(data, null);
    });
  });

  describe('getMetricChartData', () => {
    it('returns chart data for metric', () => {
      const engine = createMockEngine();
      const dashboard = new MetricsDashboard(engine);
      const chartData = dashboard.getMetricChartData('player1', 'score', { hours: 1 });
      assert.ok(chartData);
    });

    it('returns empty for unknown player', () => {
      const engine = createMockEngine();
      const dashboard = new MetricsDashboard(engine);
      const chartData = dashboard.getMetricChartData('unknown', 'score', { hours: 1 });
      assert.deepStrictEqual(chartData, { labels: [], values: [] });
    });
  });

  describe('getAlerts', () => {
    it('returns alerts for player', () => {
      const engine = createMockEngine();
      const dashboard = new MetricsDashboard(engine);
      const alerts = dashboard.getAlerts('player1');
      assert.ok(Array.isArray(alerts));
    });

    it('returns empty for unknown player', () => {
      const engine = createMockEngine();
      const dashboard = new MetricsDashboard(engine);
      const alerts = dashboard.getAlerts('unknown');
      assert.deepStrictEqual(alerts, []);
    });
  });
});