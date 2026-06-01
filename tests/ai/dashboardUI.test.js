/**
 * Tests for DashboardUI
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { 
  createDashboardData,
  formatPercent,
  formatPlacement,
  formatMoney,
  createAchievementCard,
  createMetricsComparison,
} from '../../src/game/ai/dashboard/dashboardUI.js';

describe('DashboardUI', () => {
  let mockDashboard;

  beforeEach(() => {
    // Create mock dashboard with getDashboardData method
    mockDashboard = {
      getDashboardData(playerId) {
        return {
          playerId,
          winRate: 0.65,
          avgPlacement: 2.1,
          profitPerGame: 1500,
          decisionAccuracy: 0.78,
          trends: {
            winRate: { direction: 'improving', delta: 0.1 },
            avgPlacement: { direction: 'stable', delta: 0 },
            profit: { direction: 'improving', delta: 200 },
            decisionAccuracy: { direction: 'declining', delta: -0.05 },
          },
          milestones: [
            { id: 'first_win', name: 'First Victory', description: 'Win your first game', icon: '🏆' },
          ],
          nextMilestone: {
            id: 'win_5_games',
            name: 'Rising Star',
            description: 'Win 5 games',
            icon: '⭐',
            progress: 0.4,
          },
          stats: {
            wins: 3,
            games: 5,
            winRate: 0.6,
            strategies: 2,
            avgProfit: 1500,
            decisionAccuracy: 0.78,
          },
        };
      },
    };
  });

  it('createDashboardData returns required structure', () => {
    const data = createDashboardData(mockDashboard, 'p1');

    assert.ok('metrics' in data);
    assert.ok('charts' in data);
    assert.ok('achievements' in data);
    assert.ok('summary' in data);
    assert.ok('nextAchievement' in data);
  });

  it('createDashboardData formats metrics correctly', () => {
    const data = createDashboardData(mockDashboard, 'p1');

    assert.strictEqual(data.metrics.winRate, '65%');
    assert.strictEqual(data.metrics.profitPerGame, '$1,500');
    assert.strictEqual(data.metrics.decisionAccuracy, '78%');
  });

  it('formatPercent handles valid input', () => {
    assert.strictEqual(formatPercent(0.5), '50%');
    assert.strictEqual(formatPercent(0.75), '75%');
    assert.strictEqual(formatPercent(1), '100%');
    assert.strictEqual(formatPercent(0), '0%');
  });

  it('formatPercent handles edge cases', () => {
    assert.strictEqual(formatPercent(NaN), '0%');
    assert.strictEqual(formatPercent(undefined), '0%');
    assert.strictEqual(formatPercent(null), '0%');
  });

  it('formatPlacement formats correctly', () => {
    assert.strictEqual(formatPlacement(1.5), '1.5 (Top)');
    assert.strictEqual(formatPlacement(2.5), '2.5 (Middle)');
    assert.strictEqual(formatPlacement(3.5), '3.5 (Bottom)');
  });

  it('formatPlacement handles edge cases', () => {
    assert.strictEqual(formatPlacement(NaN), 'N/A');
  });

  it('formatMoney formats correctly', () => {
    assert.strictEqual(formatMoney(1500), '$1,500');
    assert.strictEqual(formatMoney(1000000), '$1,000,000');
    assert.strictEqual(formatMoney(0), '$0');
  });

  it('formatMoney handles edge cases', () => {
    assert.strictEqual(formatMoney(NaN), '$0');
  });

  it('createAchievementCard returns correct structure', () => {
    const milestone = {
      id: 'test_id',
      name: 'Test Achievement',
      description: 'Test description',
      icon: '🏆',
    };

    const card = createAchievementCard(milestone, 0.75);

    assert.strictEqual(card.id, 'test_id');
    assert.strictEqual(card.name, 'Test Achievement');
    assert.strictEqual(card.description, 'Test description');
    assert.strictEqual(card.icon, '🏆');
    assert.strictEqual(card.progress, 75);
    assert.strictEqual(card.achieved, false);
  });

  it('createAchievementCard marks achieved when progress >= 1', () => {
    const milestone = {
      id: 'test_id',
      name: 'Test Achievement',
      description: 'Test description',
      icon: '🏆',
    };

    const card = createAchievementCard(milestone, 1.0);

    assert.strictEqual(card.achieved, true);
  });

  it('createMetricsComparison calculates changes correctly', () => {
    const current = { winRate: 0.6, avgPlacement: 2.2, profitPerGame: 1500, decisionAccuracy: 0.8 };
    const previous = { winRate: 0.5, avgPlacement: 2.5, profitPerGame: 1000, decisionAccuracy: 0.7 };

    const comparison = createMetricsComparison(current, previous);

    assert.strictEqual(comparison.winRate.direction, 'up');
    assert.ok(comparison.winRate.change > 0);
  });
});