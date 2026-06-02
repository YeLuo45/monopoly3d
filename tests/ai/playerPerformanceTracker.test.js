import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PlayerPerformanceTracker } from '../../src/game/ai/difficulty/playerPerformanceTracker.js';

describe('PlayerPerformanceTracker', () => {
  describe('constructor', () => {
    it('creates tracker', () => {
      const tracker = new PlayerPerformanceTracker();
      assert.ok(tracker);
    });
  });

  describe('recordPerformance', () => {
    it('records performance for player', () => {
      const tracker = new PlayerPerformanceTracker();
      const result = tracker.recordPerformance('player1', { score: 100 });
      assert.strictEqual(result, true);
    });
  });

  describe('getPerformanceHistory', () => {
    it('returns history for player', () => {
      const tracker = new PlayerPerformanceTracker();
      tracker.recordPerformance('player1', { score: 100 });
      const history = tracker.getPerformanceHistory('player1', { hours: 1 });
      assert.ok(Array.isArray(history));
    });

    it('returns empty for unknown player', () => {
      const tracker = new PlayerPerformanceTracker();
      const history = tracker.getPerformanceHistory('unknown', { hours: 1 });
      assert.deepStrictEqual(history, []);
    });
  });

  describe('getPerformanceTrend', () => {
    it('returns trend for player', () => {
      const tracker = new PlayerPerformanceTracker();
      tracker.recordPerformance('player1', { score: 100 });
      const trend = tracker.getPerformanceTrend('player1');
      assert.ok(trend);
    });
  });

  describe('isImproving', () => {
    it('returns improvement status', () => {
      const tracker = new PlayerPerformanceTracker();
      tracker.recordPerformance('player1', { score: 100 });
      tracker.recordPerformance('player1', { score: 150 });
      const improving = tracker.isImproving('player1');
      assert.strictEqual(improving, true);
    });
  });
});