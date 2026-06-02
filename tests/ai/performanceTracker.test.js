import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PerformanceTracker } from '../../src/game/ai/predict/performanceTracker.js';

describe('PerformanceTracker', () => {
  it('creates instance', () => {
    const tracker = new PerformanceTracker();
    assert.ok(tracker);
  });

  it('records game result', () => {
    const tracker = new PerformanceTracker();
    tracker.recordGameResult('game1', [
      { playerId: 'p1', rank: 1 },
      { playerId: 'p2', rank: 2 },
    ]);
    assert.strictEqual(tracker.gameHistory.length, 1);
  });

  it('gets player stats after recording game', () => {
    const tracker = new PerformanceTracker();
    tracker.recordGameResult('game1', [
      { playerId: 'p1', rank: 1 },
      { playerId: 'p2', rank: 2 },
    ]);
    const stats = tracker.getPlayerStats('p1');
    assert.strictEqual(stats.gamesPlayed, 1);
    assert.strictEqual(stats.gamesWon, 1);
    assert.strictEqual(stats.bestRank, 1);
  });

  it('calculates average finish', () => {
    const tracker = new PerformanceTracker();
    tracker.recordGameResult('game1', [
      { playerId: 'p1', rank: 1 },
      { playerId: 'p2', rank: 2 },
    ]);
    tracker.recordGameResult('game2', [
      { playerId: 'p1', rank: 2 },
      { playerId: 'p2', rank: 1 },
    ]);
    const avg = tracker.getAverageFinish('p1');
    assert.strictEqual(avg, 1.5);
  });

  it('calculates win rate', () => {
    const tracker = new PerformanceTracker();
    tracker.recordGameResult('game1', [
      { playerId: 'p1', rank: 1 },
      { playerId: 'p2', rank: 2 },
    ]);
    tracker.recordGameResult('game2', [
      { playerId: 'p1', rank: 2 },
      { playerId: 'p2', rank: 1 },
    ]);
    const winRate = tracker.getWinRate('p1');
    assert.strictEqual(winRate, 0.5);
  });

  it('returns insufficient data for unknown player', () => {
    const tracker = new PerformanceTracker();
    const trend = tracker.getPerformanceTrend('unknown');
    assert.strictEqual(trend.direction, 'insufficient_data');
  });

  it('detects improving trend', () => {
    const tracker = new PerformanceTracker();
    // Record games with improving ranks (lower is better)
    tracker.recordGameResult('game1', [
      { playerId: 'p1', rank: 4 },
      { playerId: 'p2', rank: 3 },
      { playerId: 'p3', rank: 2 },
      { playerId: 'p4', rank: 1 },
    ]);
    tracker.recordGameResult('game2', [
      { playerId: 'p1', rank: 3 },
      { playerId: 'p2', rank: 4 },
      { playerId: 'p3', rank: 1 },
      { playerId: 'p4', rank: 2 },
    ]);
    tracker.recordGameResult('game3', [
      { playerId: 'p1', rank: 2 },
      { playerId: 'p2', rank: 1 },
      { playerId: 'p3', rank: 4 },
      { playerId: 'p4', rank: 3 },
    ]);
    
    const trend = tracker.getPerformanceTrend('p1', 3);
    assert.ok(trend.direction);
  });

  it('getHeadToHead returns stats between two players', () => {
    const tracker = new PerformanceTracker();
    tracker.recordGameResult('game1', [
      { playerId: 'p1', rank: 1 },
      { playerId: 'p2', rank: 2 },
    ]);
    const h2h = tracker.getHeadToHead('p1', 'p2');
    assert.strictEqual(h2h.gamesPlayed, 1);
    assert.strictEqual(h2h.playerAWins, 1);
  });

  it('getLeaderboard returns rankings', () => {
    const tracker = new PerformanceTracker();
    tracker.recordGameResult('game1', [
      { playerId: 'p1', rank: 1 },
      { playerId: 'p2', rank: 2 },
    ]);
    tracker.recordGameResult('game2', [
      { playerId: 'p2', rank: 1 },
      { playerId: 'p1', rank: 2 },
    ]);
    const leaderboard = tracker.getLeaderboard(5);
    assert.ok(leaderboard.length > 0);
    assert.ok(leaderboard[0].rank === 1);
  });

  it('getRecentGames returns game history', () => {
    const tracker = new PerformanceTracker();
    tracker.recordGameResult('game1', [
      { playerId: 'p1', rank: 1 },
      { playerId: 'p2', rank: 2 },
    ]);
    const recent = tracker.getRecentGames('p1', 5);
    assert.strictEqual(recent.length, 1);
    assert.strictEqual(recent[0].gameId, 'game1');
  });

  it('clearHistory removes all data', () => {
    const tracker = new PerformanceTracker();
    tracker.recordGameResult('game1', [
      { playerId: 'p1', rank: 1 },
      { playerId: 'p2', rank: 2 },
    ]);
    tracker.clearHistory();
    assert.strictEqual(tracker.gameHistory.length, 0);
    assert.strictEqual(tracker.playerStats.size, 0);
  });

  it('tracks worst rank correctly', () => {
    const tracker = new PerformanceTracker();
    tracker.recordGameResult('game1', [
      { playerId: 'p1', rank: 2 },
    ]);
    tracker.recordGameResult('game2', [
      { playerId: 'p1', rank: 4 },
    ]);
    const stats = tracker.getPlayerStats('p1');
    assert.strictEqual(stats.worstRank, 4);
  });
});