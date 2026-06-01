/**
 * ReplayLeaderboard Tests
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { ReplayLeaderboard, LEADERBOARD_VERSION, ACHIEVEMENTS } from '../src/game/ai/replayLeaderboard.js';
import { CrossSessionReplay } from '../src/game/hooks/crossSessionReplay.js';
import { CrossGameAnalytics } from '../src/game/ai/crossGameAnalytics.js';
import { AIMemoryLayer } from '../src/game/ai/memoryLayer.js';
import { EventBus } from '../src/game/eventBus.js';

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null,
  };
})();

// Replace global localStorage in tests
if (typeof localStorage === 'undefined') {
  global.localStorage = localStorageMock;
}

describe('ReplayLeaderboard', () => {
  let eventBus;
  let memoryLayer;
  let crossGameAnalytics;
  let crossSessionReplay;
  let replayLeaderboard;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    eventBus = new EventBus();
    memoryLayer = new AIMemoryLayer(eventBus);
    crossGameAnalytics = new CrossGameAnalytics(memoryLayer);
    crossSessionReplay = new CrossSessionReplay(eventBus, null, null);
    replayLeaderboard = new ReplayLeaderboard(crossSessionReplay, crossGameAnalytics);
  });

  afterEach(() => {
    if (replayLeaderboard) {
      replayLeaderboard.clearCache();
    }
    if (memoryLayer) {
      memoryLayer.destroy();
    }
  });

  it('should create instance with correct dependencies', () => {
    assert.ok(replayLeaderboard);
    assert.strictEqual(replayLeaderboard.crossSessionReplay, crossSessionReplay);
    assert.strictEqual(replayLeaderboard.crossGameAnalytics, crossGameAnalytics);
  });

  it('should have correct version', () => {
    assert.strictEqual(LEADERBOARD_VERSION, '1.0.0');
  });

  it('should have all achievement definitions', () => {
    assert.ok(ACHIEVEMENTS.speed_demon);
    assert.ok(ACHIEVEMENTS.landlord);
    assert.ok(ACHIEVEMENTS.jackpot);
    assert.ok(ACHIEVEMENTS.comeback_kid);
    assert.ok(ACHIEVEMENTS.quiz_whiz);
    
    assert.strictEqual(ACHIEVEMENTS.speed_demon.name, 'Speed Demon');
    assert.strictEqual(ACHIEVEMENTS.landlord.name, 'Landlord');
    assert.strictEqual(ACHIEVEMENTS.jackpot.name, 'Jackpot');
  });

  it('should return empty game duration ranking initially', () => {
    const ranking = replayLeaderboard.getGameDurationRanking();
    
    assert.ok(Array.isArray(ranking));
    assert.strictEqual(ranking.length, 0);
  });

  it('should return game duration ranking with limit', () => {
    // Create some test replays
    const replayId1 = crossSessionReplay.createReplay('game_dur_1');
    crossSessionReplay.addMetadata(replayId1, { turnCount: 15 });
    crossSessionReplay.saveReplay(replayId1);
    
    const replayId2 = crossSessionReplay.createReplay('game_dur_2');
    crossSessionReplay.addMetadata(replayId2, { turnCount: 20 });
    crossSessionReplay.saveReplay(replayId2);
    
    const ranking = replayLeaderboard.getGameDurationRanking(5);
    
    assert.ok(Array.isArray(ranking));
    assert.ok(ranking.length <= 5);
  });

  it('should return player score ranking for specific player', () => {
    const ranking = replayLeaderboard.getPlayerScoreRanking('player_1');
    
    assert.ok(Array.isArray(ranking));
  });

  it('should return tile popularity ranking', () => {
    const ranking = replayLeaderboard.getTilePopularityRanking();
    
    assert.ok(Array.isArray(ranking));
  });

  it('should return empty achievements for player with no replays', () => {
    const achievements = replayLeaderboard.getPlayerAchievements('unknown_player');
    
    assert.ok(Array.isArray(achievements));
    assert.strictEqual(achievements.length, 0);
  });

  it('should export leaderboard as JSON', () => {
    const exported = replayLeaderboard.exportLeaderboard('json');
    
    assert.ok(typeof exported === 'string');
    
    const parsed = JSON.parse(exported);
    assert.strictEqual(parsed.version, LEADERBOARD_VERSION);
    assert.ok(parsed.exportedAt);
    assert.ok(Array.isArray(parsed.gameDurationRanking));
    assert.ok(Array.isArray(parsed.tilePopularityRanking));
  });

  it('should export leaderboard as CSV', () => {
    const exported = replayLeaderboard.exportLeaderboard('csv');
    
    assert.ok(typeof exported === 'string');
    assert.ok(exported.includes('LEADERBOARD EXPORT'));
    assert.ok(exported.includes('FASTEST GAMES'));
    assert.ok(exported.includes('TILE POPULARITY'));
  });

  it('should throw error for unsupported export format', () => {
    assert.throws(() => {
      replayLeaderboard.exportLeaderboard('xml');
    }, /Unsupported export format/);
  });

  it('should cache game duration ranking', () => {
    // First call should not be from cache
    replayLeaderboard.getGameDurationRanking();
    
    // Second call should use cache
    const ranking1 = replayLeaderboard.getGameDurationRanking();
    const ranking2 = replayLeaderboard.getGameDurationRanking();
    
    assert.deepStrictEqual(ranking1, ranking2);
  });

  it('should cache player score ranking per player', () => {
    replayLeaderboard.getPlayerScoreRanking('player_1');
    replayLeaderboard.getPlayerScoreRanking('player_2');
    
    const ranking1 = replayLeaderboard.getPlayerScoreRanking('player_1');
    const ranking2 = replayLeaderboard.getPlayerScoreRanking('player_1');
    
    assert.deepStrictEqual(ranking1, ranking2);
  });

  it('should clear cache on clearCache call', () => {
    replayLeaderboard.getGameDurationRanking();
    replayLeaderboard.clearCache();
    
    // Cache should be cleared
    assert.ok(replayLeaderboard._cache.gameDurationRanking === null);
  });

  it('should respect limit parameter in game duration ranking', () => {
    // Create multiple replays
    for (let i = 0; i < 5; i++) {
      const replayId = crossSessionReplay.createReplay(`game_limit_${i}`);
      crossSessionReplay.saveReplay(replayId);
    }
    
    const ranking = replayLeaderboard.getGameDurationRanking(3);
    
    assert.ok(ranking.length <= 3);
  });

  it('should handle empty replay list gracefully', () => {
    const ranking = replayLeaderboard.getGameDurationRanking();
    const tileRanking = replayLeaderboard.getTilePopularityRanking();
    const playerRanking = replayLeaderboard.getPlayerScoreRanking('player_x');
    
    assert.ok(Array.isArray(ranking));
    assert.ok(Array.isArray(tileRanking));
    assert.ok(Array.isArray(playerRanking));
  });

  it('should sort game duration ranking by duration ascending', () => {
    const replayId1 = crossSessionReplay.createReplay('game_fast');
    crossSessionReplay.addMetadata(replayId1, { turnCount: 10 });
    crossSessionReplay.saveReplay(replayId1);
    
    const replayId2 = crossSessionReplay.createReplay('game_slow');
    crossSessionReplay.addMetadata(replayId2, { turnCount: 30 });
    crossSessionReplay.saveReplay(replayId2);
    
    const ranking = replayLeaderboard.getGameDurationRanking();
    
    if (ranking.length >= 2) {
      assert.ok(ranking[0].duration <= ranking[1].duration);
    }
  });
});