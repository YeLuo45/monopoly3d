/**
 * Tests for LeaderboardManager
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { LeaderboardManager } from '../../src/game/ai/social/leaderboardManager.js';

describe('LeaderboardManager', () => {
  let leaderboard;

  beforeEach(() => {
    leaderboard = new LeaderboardManager();
  });

  test('constructor initializes empty state', () => {
    assert.strictEqual(leaderboard.scores.size, 0);
    assert.strictEqual(leaderboard.getPlayerCount(), 0);
  });

  test('updateScore adds score to player', () => {
    const result = leaderboard.updateScore('player1', 100);
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.playerId, 'player1');
    assert.strictEqual(result.totalScore, 100);
  });

  test('updateScore with custom category', () => {
    const result = leaderboard.updateScore('player1', 500, { category: 'money' });
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.category, 'money');
    assert.strictEqual(result.totalScore, 500);
  });

  test('updateScore fails with invalid category', () => {
    const result = leaderboard.updateScore('player1', 100, { category: 'invalid' });
    
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Invalid category');
  });

  test('updateScore accumulates scores', () => {
    leaderboard.updateScore('player1', 100);
    const result = leaderboard.updateScore('player1', 50);
    
    assert.strictEqual(result.totalScore, 150);
  });

  test('getRank returns correct rank', () => {
    leaderboard.updateScore('player1', 100);
    leaderboard.updateScore('player2', 200);
    leaderboard.updateScore('player3', 150);
    
    const rank = leaderboard.getRank('player2');
    
    assert.strictEqual(rank.rank, 1);
    assert.strictEqual(rank.score, 200);
  });

  test('getRank returns -1 for non-existent player', () => {
    const rank = leaderboard.getRank('nonexistent');
    
    assert.strictEqual(rank.rank, -1);
  });

  test('getTopPlayers returns sorted players', () => {
    leaderboard.updateScore('player1', 100);
    leaderboard.updateScore('player2', 300);
    leaderboard.updateScore('player3', 200);
    
    const top = leaderboard.getTopPlayers(2);
    
    assert.strictEqual(top.length, 2);
    assert.strictEqual(top[0].playerId, 'player2');
    assert.strictEqual(top[0].score, 300);
    assert.strictEqual(top[1].playerId, 'player3');
  });

  test('getTopPlayers respects offset', () => {
    leaderboard.updateScore('player1', 100);
    leaderboard.updateScore('player2', 200);
    leaderboard.updateScore('player3', 300);
    
    const top = leaderboard.getTopPlayers(2, { offset: 1 });
    
    assert.strictEqual(top.length, 2);
    assert.strictEqual(top[0].playerId, 'player2');
  });

  test('getLeaderboard returns full sorted list', () => {
    leaderboard.updateScore('player1', 100);
    leaderboard.updateScore('player2', 200);
    
    const lb = leaderboard.getLeaderboard('wins', 'all');
    
    assert.strictEqual(lb.length, 2);
    assert.strictEqual(lb[0].playerId, 'player2');
    assert.strictEqual(lb[0].rank, 1);
    assert.strictEqual(lb[1].playerId, 'player1');
    assert.strictEqual(lb[1].rank, 2);
  });

  test('getPlayerScore returns correct score', () => {
    leaderboard.updateScore('player1', 150, { category: 'money' });
    
    const score = leaderboard.getPlayerScore('player1', { category: 'money' });
    
    assert.strictEqual(score, 150);
  });

  test('getPlayerScore returns 0 for non-existent player', () => {
    const score = leaderboard.getPlayerScore('nonexistent');
    
    assert.strictEqual(score, 0);
  });

  test('getCategories returns all categories', () => {
    const categories = leaderboard.getCategories();
    
    assert.ok(categories.includes('wins'));
    assert.ok(categories.includes('money'));
    assert.ok(categories.includes('properties'));
    assert.ok(categories.includes('trades'));
  });

  test('getTimeRanges returns all time ranges', () => {
    const ranges = leaderboard.getTimeRanges();
    
    assert.ok(ranges.includes('all'));
    assert.ok(ranges.includes('daily'));
    assert.ok(ranges.includes('weekly'));
    assert.ok(ranges.includes('monthly'));
  });

  test('getPlayerCount returns correct count', () => {
    leaderboard.updateScore('player1', 100);
    leaderboard.updateScore('player2', 200);
    
    const count = leaderboard.getPlayerCount();
    
    assert.strictEqual(count, 2);
  });

  test('getRank works with different time ranges', () => {
    const result = leaderboard.updateScore('player1', 100, { timeRange: 'daily' });
    
    const rank = leaderboard.getRank('player1', { timeRange: 'daily' });
    
    assert.strictEqual(rank.rank, 1);
  });

  test('clearAll removes all data', () => {
    leaderboard.updateScore('player1', 100);
    leaderboard.updateScore('player2', 200);
    
    leaderboard.clearAll();
    
    assert.strictEqual(leaderboard.scores.size, 0);
    assert.strictEqual(leaderboard.getPlayerCount(), 0);
  });
});
