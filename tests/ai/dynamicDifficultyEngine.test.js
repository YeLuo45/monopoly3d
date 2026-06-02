import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DynamicDifficultyEngine } from '../../src/game/ai/difficulty/dynamicDifficultyEngine.js';

describe('DynamicDifficultyEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new DynamicDifficultyEngine();
  });

  describe('getDifficulty', () => {
    it('returns normal for new player', () => {
      const difficulty = engine.getDifficulty('player1');
      assert.strictEqual(difficulty, 'normal');
    });

    it('returns previously set difficulty', () => {
      engine.playerDifficulties.set('player1', {
        difficulty: 'hard',
        lastAdjustment: 0,
        adjustmentHistory: [],
      });
      
      const difficulty = engine.getDifficulty('player1');
      assert.strictEqual(difficulty, 'hard');
    });
  });

  describe('adjustDifficulty', () => {
    it('increases difficulty for positive delta', () => {
      engine.recordPerformance('player1', { winRate: 0.9 });
      const result = engine.adjustDifficulty('player1', 0.5);
      
      assert.strictEqual(result.previousDifficulty, 'normal');
      assert.strictEqual(result.newDifficulty, 'hard');
    });

    it('decreases difficulty for negative delta', () => {
      engine.recordPerformance('player1', { winRate: 0.1 });
      const result = engine.adjustDifficulty('player1', -0.5);
      
      assert.strictEqual(result.newDifficulty, 'easy');
    });

    it('does not change if delta too small', () => {
      const result = engine.adjustDifficulty('player1', 0.05);
      
      assert.strictEqual(result.newDifficulty, 'normal');
      assert.strictEqual(result.reason, 'delta_too_small');
    });

    it('respects cooldown period', () => {
      // Set last adjustment to very recent
      const playerData = engine._getOrCreatePlayer('player1');
      playerData.lastAdjustment = Date.now();
      
      const result = engine.adjustDifficulty('player1', 0.5);
      
      assert.strictEqual(result.newDifficulty, 'normal');
      assert.strictEqual(result.reason, 'cooldown_active');
    });

    it('caps at very_easy minimum', () => {
      engine.playerDifficulties.set('player1', {
        difficulty: 'very_easy',
        lastAdjustment: 0,
        adjustmentHistory: [],
      });
      
      const result = engine.adjustDifficulty('player1', -0.5);
      assert.strictEqual(result.newDifficulty, 'very_easy');
    });

    it('caps at very_hard maximum', () => {
      engine.playerDifficulties.set('player1', {
        difficulty: 'very_hard',
        lastAdjustment: 0,
        adjustmentHistory: [],
      });
      
      const result = engine.adjustDifficulty('player1', 0.5);
      assert.strictEqual(result.newDifficulty, 'very_hard');
    });
  });

  describe('analyzePerformanceTrend', () => {
    it('returns trend analysis for player', () => {
      for (let i = 0; i < 10; i++) {
        engine.recordPerformance('player1', { 
          winRate: 0.3 + (i * 0.07),
        });
      }
      
      const analysis = engine.analyzePerformanceTrend('player1');
      
      assert.strictEqual(analysis.playerId, 'player1');
      assert.ok(['improving', 'declining', 'stable'].includes(analysis.trend));
      assert.ok(analysis.magnitude !== undefined);
      assert.ok(analysis.recentDelta !== undefined);
    });
  });

  describe('getRecommendedDifficulty', () => {
    it('recommends harder difficulty for high performers', () => {
      for (let i = 0; i < 10; i++) {
        engine.recordPerformance('player1', { 
          winRate: 0.9,
          moneyBalance: 4500,
          decisionAccuracy: 0.9,
        });
      }
      
      const rec = engine.getRecommendedDifficulty('player1');
      
      assert.ok(['hard', 'very_hard'].includes(rec.recommendedDifficulty));
    });

    it('recommends easier difficulty for low performers', () => {
      for (let i = 0; i < 10; i++) {
        engine.recordPerformance('player1', { 
          winRate: 0.1,
          moneyBalance: 200,
          decisionAccuracy: 0.1,
        });
      }
      
      const rec = engine.getRecommendedDifficulty('player1');
      
      assert.ok(['very_easy', 'easy'].includes(rec.recommendedDifficulty));
    });
  });

  describe('recordPerformance', () => {
    it('records metrics for player', () => {
      engine.recordPerformance('player1', { winRate: 0.7 });
      
      const history = engine.performanceTracker.getPerformanceHistory('player1');
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].metrics.winRate, 0.7);
    });
  });

  describe('autoAdjust', () => {
    it('performs automatic adjustment based on trend', () => {
      for (let i = 0; i < 10; i++) {
        engine.recordPerformance('player1', { 
          winRate: 0.2 + (i * 0.08),
        });
      }
      
      const result = engine.autoAdjust('player1');
      
      assert.ok(result.trendAnalysis);
      assert.ok(result.previousDifficulty !== undefined);
      assert.ok(result.newDifficulty !== undefined);
    });
  });

  describe('resetPlayerDifficulty', () => {
    it('resets player to normal difficulty', () => {
      engine.playerDifficulties.set('player1', {
        difficulty: 'very_hard',
        lastAdjustment: Date.now(),
        adjustmentHistory: [{ test: 'entry' }],
      });
      
      engine.resetPlayerDifficulty('player1');
      
      const data = engine.playerDifficulties.get('player1');
      assert.strictEqual(data.difficulty, 'normal');
      assert.strictEqual(data.lastAdjustment, 0);
      assert.deepStrictEqual(data.adjustmentHistory, []);
    });
  });
});