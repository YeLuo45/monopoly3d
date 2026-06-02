import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { PlayerPerformanceTracker } from '../../src/game/ai/difficulty/playerPerformanceTracker.js';

describe('PlayerPerformanceTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new PlayerPerformanceTracker();
  });

  describe('recordPerformance', () => {
    it('records performance for a new player', () => {
      const entry = tracker.recordPerformance('player1', {
        winRate: 0.7,
        moneyBalance: 3000,
        propertyCount: 5,
        decisionAccuracy: 0.8,
        activityLevel: 0.9,
      });
      
      assert.ok(entry);
      assert.ok(entry.timestamp);
      assert.ok(entry.overallScore);
      assert.strictEqual(entry.metrics.winRate, 0.7);
    });

    it('stores multiple entries in history', () => {
      tracker.recordPerformance('player1', { winRate: 0.5 });
      tracker.recordPerformance('player1', { winRate: 0.6 });
      tracker.recordPerformance('player1', { winRate: 0.7 });
      
      const history = tracker.getPerformanceHistory('player1');
      assert.strictEqual(history.length, 3);
    });

    it('calculates overall score correctly', () => {
      tracker.recordPerformance('player1', {
        winRate: 1.0,
        moneyBalance: 5000,
        propertyCount: 10,
        decisionAccuracy: 1.0,
        activityLevel: 1.0,
      });
      
      const history = tracker.getPerformanceHistory('player1');
      assert.ok(history[0].overallScore > 0.9);
    });
  });

  describe('getPerformanceHistory', () => {
    it('returns empty array for unknown player', () => {
      const history = tracker.getPerformanceHistory('unknown');
      assert.deepStrictEqual(history, []);
    });

    it('filters history by count', () => {
      for (let i = 0; i < 10; i++) {
        tracker.recordPerformance('player1', { winRate: i / 10 });
      }
      
      const recent = tracker.getPerformanceHistory('player1', { count: 3 });
      assert.strictEqual(recent.length, 3);
    });

    it('filters history by time range', () => {
      const now = Date.now();
      // Manually insert entries with specific timestamps to test time filtering
      tracker.recordPerformance('player1', { winRate: 0.5 });
      
      const playerRecord = tracker.playerData.get('player1');
      // Modify timestamps to simulate different times
      playerRecord.history[0].timestamp = now - 10000;
      
      tracker.recordPerformance('player1', { winRate: 0.6 });
      playerRecord.history[1].timestamp = now - 5000;
      
      tracker.recordPerformance('player1', { winRate: 0.7 });
      // history[2].timestamp is already `now`
      
      const recent = tracker.getPerformanceHistory('player1', {
        start: now - 6000,
        end: now,
      });
      
      // Entry at now - 5000 and now should be included, not the one at now - 10000
      assert.strictEqual(recent.length, 2);
    });
  });

  describe('getPerformanceTrend', () => {
    it('returns stable for insufficient data', () => {
      const trend = tracker.getPerformanceTrend('player1');
      
      assert.strictEqual(trend.direction, 'stable');
      assert.strictEqual(trend.confidence, 0);
    });

    it('detects improving trend', () => {
      for (let i = 0; i < 10; i++) {
        tracker.recordPerformance('player1', { 
          winRate: 0.3 + (i * 0.07),
          moneyBalance: 1000 + (i * 400),
          decisionAccuracy: 0.3 + (i * 0.06),
        });
      }
      
      const trend = tracker.getPerformanceTrend('player1');
      assert.strictEqual(trend.direction, 'improving');
      assert.ok(trend.magnitude > 0);
      assert.ok(trend.slope > 0);
    });

    it('detects declining trend', () => {
      for (let i = 0; i < 10; i++) {
        tracker.recordPerformance('player1', { 
          winRate: 1.0 - (i * 0.08),
          moneyBalance: 5000 - (i * 400),
        });
      }
      
      const trend = tracker.getPerformanceTrend('player1');
      assert.strictEqual(trend.direction, 'declining');
      assert.ok(trend.magnitude < 0);
    });
  });

  describe('isImproving', () => {
    it('returns false for new player', () => {
      assert.strictEqual(tracker.isImproving('player1'), false);
    });

    it('returns true when player is improving with high confidence', () => {
      for (let i = 0; i < 10; i++) {
        tracker.recordPerformance('player1', { 
          winRate: 0.3 + (i * 0.08),
          decisionAccuracy: 0.3 + (i * 0.07),
        });
      }
      
      assert.strictEqual(tracker.isImproving('player1'), true);
    });
  });

  describe('clearPlayerData', () => {
    it('removes all data for a player', () => {
      tracker.recordPerformance('player1', { winRate: 0.5 });
      tracker.recordPerformance('player2', { winRate: 0.6 });
      
      tracker.clearPlayerData('player1');
      
      assert.deepStrictEqual(tracker.getPerformanceHistory('player1'), []);
      assert.ok(tracker.getPerformanceHistory('player2').length > 0);
    });
  });

  describe('getAveragePerformance', () => {
    it('returns 0 for unknown player', () => {
      assert.strictEqual(tracker.getAveragePerformance('unknown'), 0);
    });

    it('calculates average over window', () => {
      tracker.recordPerformance('player1', { winRate: 0.3 });
      tracker.recordPerformance('player1', { winRate: 0.5 });
      tracker.recordPerformance('player1', { winRate: 0.7 });
      
      const avg = tracker.getAveragePerformance('player1', 3);
      assert.ok(avg > 0.4 && avg < 0.6);
    });
  });
});