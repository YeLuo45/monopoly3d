import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DynamicDifficultyEngine } from '../../src/game/ai/difficulty/dynamicDifficultyEngine.js';

function createMockAnalyticsEngine() {
  return {
    analyzePlayerPerformance: (playerId) => playerId ? { winRate: 0.5 } : null,
  };
}

describe('DynamicDifficultyEngine', () => {
  describe('constructor', () => {
    it('creates engine with analytics', () => {
      const engine = new DynamicDifficultyEngine(createMockAnalyticsEngine());
      assert.ok(engine);
    });
  });

  describe('getDifficulty', () => {
    it('returns difficulty for player', () => {
      const engine = new DynamicDifficultyEngine(createMockAnalyticsEngine());
      const diff = engine.getDifficulty('player1');
      assert.ok(typeof diff === 'number');
    });

    it('returns default for unknown player', () => {
      const engine = new DynamicDifficultyEngine(createMockAnalyticsEngine());
      const diff = engine.getDifficulty('unknown');
      assert.strictEqual(diff, 1.0);
    });
  });

  describe('adjustDifficulty', () => {
    it('adjusts difficulty based on performance', () => {
      const engine = new DynamicDifficultyEngine(createMockAnalyticsEngine());
      const result = engine.adjustDifficulty('player1', 0.1);
      assert.strictEqual(result, true);
    });
  });

  describe('analyzePerformanceTrend', () => {
    it('returns trend for player', () => {
      const engine = new DynamicDifficultyEngine(createMockAnalyticsEngine());
      const trend = engine.analyzePerformanceTrend('player1');
      assert.ok(trend);
    });
  });

  describe('getRecommendedDifficulty', () => {
    it('returns recommended difficulty', () => {
      const engine = new DynamicDifficultyEngine(createMockAnalyticsEngine());
      const diff = engine.getRecommendedDifficulty('player1');
      assert.ok(typeof diff === 'number');
    });
  });
});