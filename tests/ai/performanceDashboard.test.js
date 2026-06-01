/**
 * Tests for PerformanceDashboard
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { PerformanceDashboard } from '../../src/game/ai/dashboard/performanceDashboard.js';
import { MetricsAggregator } from '../../src/game/ai/dashboard/metricsAggregator.js';

describe('PerformanceDashboard', () => {
  let dashboard;
  let mockMemoryLayer;
  let mockMetaCognition;

  beforeEach(() => {
    // Create mock memory layer
    mockMemoryLayer = {
      l3: {
        strategies: new Map(),
      },
      l4: null,
    };

    // Create mock meta cognition
    mockMetaCognition = {
      performanceLog: new Map(),
      getPerformanceTrend(playerId, games) {
        const log = this.performanceLog.get(playerId);
        if (!log || log.length === 0) return [];
        return log.slice(-games).map(e => e.won ? 1 : 0);
      },
      getDetailedStats(playerId, games) {
        const log = this.performanceLog.get(playerId);
        if (!log || log.length === 0) {
          return { games: 0, wins: 0, winRate: 0, avgScore: 0 };
        }
        const recent = log.slice(-games);
        const wins = recent.filter(e => e.won).length;
        return {
          games: recent.length,
          wins,
          winRate: wins / recent.length,
          avgScore: recent.reduce((a, e) => a + (e.score || 0), 0) / recent.length,
        };
      },
    };

    // Set up memory layer with l4 reference
    mockMemoryLayer.l4 = mockMetaCognition;

    dashboard = new PerformanceDashboard(mockMemoryLayer, mockMetaCognition);
  });

  test('constructor initializes dashboard with memoryLayer and metaCognition', () => {
    assert.ok(dashboard.memoryLayer);
    assert.ok(dashboard.metaCognition);
    assert.ok(dashboard.aggregator instanceof MetricsAggregator);
  });

  test('getWinRate returns 0 for player with no games', () => {
    const winRate = dashboard.getWinRate('unknown_player');
    assert.strictEqual(winRate, 0);
  });

  test('getWinRate calculates correct win rate', () => {
    // Add some game outcomes
    mockMetaCognition.trackPerformance = mockMetaCognition.trackPerformance || 
      function(playerId, outcome) {
        if (!this.performanceLog.has(playerId)) {
          this.performanceLog.set(playerId, []);
        }
        this.performanceLog.get(playerId).push(outcome);
      };
    
    mockMetaCognition.trackPerformance('p1', { won: true });
    mockMetaCognition.trackPerformance('p1', { won: false });
    mockMetaCognition.trackPerformance('p1', { won: true });
    mockMetaCognition.trackPerformance('p1', { won: false });

    const winRate = dashboard.getWinRate('p1', 10);
    assert.strictEqual(winRate, 0.5);
  });

  test('getAveragePlacement returns value between 1 and 4', () => {
    const placement = dashboard.getAveragePlacement('p1');
    assert.ok(placement >= 1);
    assert.ok(placement <= 4);
  });

  test('getProfitPerGame returns 0 for unknown player', () => {
    const profit = dashboard.getProfitPerGame('unknown');
    assert.strictEqual(profit, 0);
  });

  test('getDecisionAccuracy returns value between 0 and 1', () => {
    const accuracy = dashboard.getDecisionAccuracy('p1');
    assert.ok(accuracy >= 0);
    assert.ok(accuracy <= 1);
  });

  test('getTrend returns object with direction and delta', () => {
    const trend = dashboard.getTrend('p1', 'win_rate', 10);
    assert.ok('direction' in trend);
    assert.ok('delta' in trend);
    assert.ok(['improving', 'stable', 'declining'].includes(trend.direction));
  });

  test('getTrend returns stable for insufficient data', () => {
    const trend = dashboard.getTrend('p1', 'win_rate', 1);
    assert.strictEqual(trend.direction, 'stable');
    assert.strictEqual(trend.delta, 0);
  });

  test('getDashboardData returns complete dashboard state', () => {
    const data = dashboard.getDashboardData('p1');
    
    assert.ok('playerId' in data);
    assert.ok('winRate' in data);
    assert.ok('avgPlacement' in data);
    assert.ok('profitPerGame' in data);
    assert.ok('decisionAccuracy' in data);
    assert.ok('trends' in data);
    assert.ok('milestones' in data);
    assert.ok('nextMilestone' in data);
    assert.ok('stats' in data);
  });

  test('getMilestones returns array of unlocked milestones', () => {
    const milestones = dashboard.getMilestones('p1');
    assert.ok(Array.isArray(milestones));
  });

  test('getNextMilestone returns next achievement to unlock', () => {
    // Add some games so we can get a next milestone
    mockMetaCognition.performanceLog.set('p1', [
      { won: true, score: 100 },
      { won: true, score: 150 },
    ]);

    const next = dashboard.getNextMilestone('p1');
    assert.ok(next === null || typeof next === 'object');
  });

  test('milestones include required properties', () => {
    const milestones = dashboard.getMilestones('p1');
    
    for (const milestone of milestones) {
      assert.ok('id' in milestone);
      assert.ok('name' in milestone);
      assert.ok('description' in milestone);
      assert.ok('icon' in milestone);
    }
  });

  test('getDashboardData handles player with no history', () => {
    const data = dashboard.getDashboardData('completely_unknown_player_12345');
    
    assert.strictEqual(data.playerId, 'completely_unknown_player_12345');
    assert.strictEqual(data.winRate, 0);
  });
});