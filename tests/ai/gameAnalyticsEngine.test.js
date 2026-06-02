import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GameAnalyticsEngine } from '../../src/game/ai/analytics/gameAnalyticsEngine.js';

function createMockCollector() {
  return {
    getAverageMetric: (playerId, type) => type === 'score' ? 150 : null,
    aggregateMetrics: () => ({ avg: 100, min: 50, max: 200 }),
  };
}

describe('GameAnalyticsEngine', () => {
  describe('analyzePlayerPerformance', () => {
    it('analyzes player performance', () => {
      const collector = createMockCollector();
      const engine = new GameAnalyticsEngine(collector);
      const result = engine.analyzePlayerPerformance('player1');
      assert.ok(result);
      assert.ok(result.score !== undefined);
    });

    it('returns null for unknown player', () => {
      const collector = createMockCollector();
      const engine = new GameAnalyticsEngine(collector);
      const result = engine.analyzePlayerPerformance('unknown');
      assert.strictEqual(result, null);
    });
  });

  describe('analyzeGameTrends', () => {
    it('returns game trends', () => {
      const collector = createMockCollector();
      const engine = new GameAnalyticsEngine(collector);
      const result = engine.analyzeGameTrends();
      assert.ok(result);
    });
  });

  describe('getInsights', () => {
    it('returns player insights', () => {
      const collector = createMockCollector();
      const engine = new GameAnalyticsEngine(collector);
      const insights = engine.getInsights('player1');
      assert.ok(Array.isArray(insights));
    });
  });

  describe('getRecommendations', () => {
    it('returns recommendations for player', () => {
      const collector = createMockCollector();
      const engine = new GameAnalyticsEngine(collector);
      const recs = engine.getRecommendations('player1');
      assert.ok(Array.isArray(recs));
    });

    it('returns empty for unknown player', () => {
      const collector = createMockCollector();
      const engine = new GameAnalyticsEngine(collector);
      const recs = engine.getRecommendations('unknown');
      assert.deepStrictEqual(recs, []);
    });
  });
});