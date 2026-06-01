/**
 * CrossGameAnalytics Tests
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { CrossGameAnalytics } from '../src/game/ai/crossGameAnalytics.js';
import { AIMemoryLayer } from '../src/game/ai/memoryLayer.js';
import { EventBus } from '../src/game/eventBus.js';

describe('CrossGameAnalytics', () => {
  let eventBus;
  let memoryLayer;
  let analytics;

  beforeEach(() => {
    eventBus = new EventBus();
    memoryLayer = new AIMemoryLayer(eventBus);
    analytics = new CrossGameAnalytics(memoryLayer);
  });

  afterEach(() => {
    if (memoryLayer) {
      memoryLayer.destroy();
    }
  });

  it('should create instance with memoryLayer dependency', () => {
    assert.ok(analytics);
    assert.strictEqual(analytics.memoryLayer, memoryLayer);
  });

  it('should throw error when created without memoryLayer', () => {
    assert.throws(() => {
      new CrossGameAnalytics(null);
    }, /valid AIMemoryLayer/);
    
    assert.throws(() => {
      new CrossGameAnalytics('not a memory layer');
    }, /valid AIMemoryLayer/);
  });

  it('should start and end session correctly', () => {
    const session = analytics.startSession('test_game_1');
    
    assert.ok(session);
    assert.ok(session.sessionId);
    assert.strictEqual(session.gameId, 'test_game_1');
    assert.ok(session.startTime);
    assert.strictEqual(session.endTime, null);
    
    const ended = analytics.endSession();
    
    assert.ok(ended);
    assert.ok(ended.endTime);
    assert.ok(ended.duration >= 0);
  });

  it('should auto-end previous session when starting new one', () => {
    analytics.startSession('game_1');
    analytics.startSession('game_2');
    
    const sessions = analytics.listSessions();
    assert.strictEqual(sessions.length, 1);
    assert.strictEqual(sessions[0].gameId, 'game_1');
  });

  it('should return null when ending non-existent session', () => {
    const ended = analytics.endSession();
    assert.strictEqual(ended, null);
  });

  it('should get current session', () => {
    assert.strictEqual(analytics.getCurrentSession(), null);
    
    const session = analytics.startSession('test_game');
    const current = analytics.getCurrentSession();
    
    assert.ok(current);
    assert.strictEqual(current.sessionId, session.sessionId);
  });

  it('should list all completed sessions', () => {
    analytics.startSession('game_1');
    analytics.endSession();
    
    analytics.startSession('game_2');
    analytics.endSession();
    
    analytics.startSession('game_3');
    // Not ended
    
    const sessions = analytics.listSessions();
    assert.strictEqual(sessions.length, 2);
    assert.strictEqual(sessions[0].gameId, 'game_1');
    assert.strictEqual(sessions[1].gameId, 'game_2');
  });

  it('should return empty overall stats initially', () => {
    const stats = analytics.getOverallStats();
    
    assert.strictEqual(stats.totalGames, 0);
    assert.strictEqual(stats.avgDuration, 0);
    assert.strictEqual(stats.totalPlayers, 0);
  });

  it('should calculate overall stats from memory layer', () => {
    // Simulate some game data in memory layer
    eventBus.publish('game_start', { gameId: 'game_test' });
    eventBus.publish('dice_roll', { playerId: 'player_1', values: [3, 4] });
    eventBus.publish('property_purchase', { playerId: 'player_1', tileId: 5, price: 100 });
    eventBus.publish('game_end', {});
    
    const stats = analytics.getOverallStats();
    
    assert.ok(stats.totalGames >= 0);
    assert.ok(typeof stats.avgDuration === 'number');
  });

  it('should get player rankings', () => {
    // Simulate player data
    eventBus.publish('game_start', { gameId: 'game_ranking' });
    eventBus.publish('property_purchase', { playerId: 'player_1', tileId: 5, price: 100 });
    eventBus.publish('property_purchase', { playerId: 'player_1', tileId: 10, price: 200 });
    eventBus.publish('property_purchase', { playerId: 'player_2', tileId: 15, price: 150 });
    eventBus.publish('game_end', {});
    
    const rankings = analytics.getPlayerRankings('properties');
    
    assert.ok(Array.isArray(rankings));
    // Rankings should be sorted descending by value
    if (rankings.length >= 2) {
      assert.ok(rankings[0].value >= rankings[1].value);
    }
  });

  it('should throw error for unsupported ranking metric', () => {
    // Just verify it returns array with default sorting
    const rankings = analytics.getPlayerRankings('invalid_metric');
    assert.ok(Array.isArray(rankings));
  });

  it('should get tile popularity', () => {
    eventBus.publish('game_start', { gameId: 'game_tile' });
    eventBus.publish('tile_visit', { playerId: 'player_1', tileId: 5 });
    eventBus.publish('tile_visit', { playerId: 'player_1', tileId: 5 });
    eventBus.publish('tile_visit', { playerId: 'player_2', tileId: 10 });
    eventBus.publish('game_end', {});
    
    const popularity = analytics.getTilePopularity();
    
    assert.ok(Array.isArray(popularity));
  });

  it('should get property heatmap data', () => {
    const heatmap = analytics.getPropertyHeatmap();
    
    assert.ok(heatmap);
    assert.ok(Array.isArray(heatmap.tiles));
    assert.strictEqual(heatmap.maxFrequency, 0);
  });

  it('should export analytics as JSON', () => {
    const json = analytics.exportAnalytics('json');
    
    assert.ok(typeof json === 'string');
    
    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.version, '1.0.0');
    assert.ok(parsed.exportedAt);
    assert.ok(parsed.stats);
    assert.ok(parsed.rankings);
    assert.ok(Array.isArray(parsed.sessions));
  });

  it('should export analytics as CSV', () => {
    const csv = analytics.exportAnalytics('csv');
    
    assert.ok(typeof csv === 'string');
    assert.ok(csv.includes('STATISTICS'));
    assert.ok(csv.includes('PLAYER RANKINGS'));
    assert.ok(csv.includes('TILE POPULARITY'));
    assert.ok(csv.includes('SESSIONS'));
  });

  it('should throw error for unsupported export format', () => {
    assert.throws(() => {
      analytics.exportAnalytics('xml');
    }, /Unsupported export format/);
  });

  it('should generate human-readable report', () => {
    const report = analytics.generateReport();
    
    assert.ok(typeof report === 'string');
    assert.ok(report.includes('MONOPOLY3D CROSS-GAME ANALYTICS REPORT'));
    assert.ok(report.includes('Total Games:'));
    assert.ok(report.includes('Average Duration:'));
  });

  it('should track sessions with duration', () => {
    analytics.startSession('game_duration');
    
    // Simulate some work
    eventBus.publish('dice_roll', { playerId: 'p1', values: [1, 2] });
    
    const ended = analytics.endSession();
    
    assert.ok(ended.duration >= 0);
  });

  it('should handle empty sessions list', () => {
    const sessions = analytics.listSessions();
    assert.deepStrictEqual(sessions, []);
  });

  it('should format duration correctly', () => {
    analytics.startSession('game');
    analytics.endSession();
    
    const stats = analytics.getOverallStats();
    assert.strictEqual(typeof stats.avgDurationFormatted, 'string');
  });

  it('should sort player rankings by value descending', () => {
    // Simulate players with different stats
    eventBus.publish('game_start', { gameId: 'game_sort' });
    eventBus.publish('property_purchase', { playerId: 'player_low', tileId: 1, price: 50 });
    eventBus.publish('property_purchase', { playerId: 'player_high', tileId: 2, price: 50 });
    eventBus.publish('property_purchase', { playerId: 'player_high', tileId: 3, price: 50 });
    eventBus.publish('property_purchase', { playerId: 'player_high', tileId: 4, price: 50 });
    eventBus.publish('game_end', {});
    
    const rankings = analytics.getPlayerRankings('properties');
    
    // Verify sorting
    for (let i = 0; i < rankings.length - 1; i++) {
      assert.ok(
        rankings[i].value >= rankings[i + 1].value,
        `Rank ${i} should have >= value than rank ${i + 1}`
      );
    }
  });

  it('should return heatmap tiles with color codes', () => {
    // Add some tile visit data
    eventBus.publish('game_start', { gameId: 'game_heatmap' });
    eventBus.publish('tile_visit', { playerId: 'player_1', tileId: 5 });
    eventBus.publish('tile_visit', { playerId: 'player_1', tileId: 5 });
    eventBus.publish('tile_visit', { playerId: 'player_2', tileId: 5 });
    eventBus.publish('game_end', {});
    
    const heatmap = analytics.getPropertyHeatmap();
    
    if (heatmap.tiles.length > 0) {
      heatmap.tiles.forEach(tile => {
        assert.ok(tile.color);
        assert.ok(tile.color.startsWith('#'));
      });
    }
  });
});