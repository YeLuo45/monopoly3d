/**
 * CrossSessionReplay Tests
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { CrossSessionReplay } from '../src/game/hooks/crossSessionReplay.js';
import { EventSerializer } from '../src/game/hooks/eventSerializer.js';
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

describe('CrossSessionReplay', () => {
  let eventBus;
  let eventSerializer;
  let crossSessionReplay;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    eventBus = new EventBus();
    eventSerializer = new EventSerializer();
    crossSessionReplay = new CrossSessionReplay(eventBus, eventSerializer, null);
  });

  afterEach(() => {
    if (crossSessionReplay) {
      crossSessionReplay.destroy();
    }
  });

  it('should create instance with correct dependencies', () => {
    assert.ok(crossSessionReplay);
    assert.strictEqual(crossSessionReplay.eventBus, eventBus);
    assert.strictEqual(crossSessionReplay.eventSerializer, eventSerializer);
    assert.strictEqual(crossSessionReplay.activeReplayId, null);
    assert.strictEqual(crossSessionReplay.activeGameId, null);
  });

  it('should create a new replay with unique replayId', () => {
    const replayId = crossSessionReplay.createReplay('game_001');
    
    assert.ok(replayId);
    assert.ok(replayId.startsWith('replay_'));
    assert.strictEqual(crossSessionReplay.activeReplayId, replayId);
    assert.strictEqual(crossSessionReplay.activeGameId, 'game_001');
    assert.ok(crossSessionReplay.startTime);
  });

  it('should create replay with initial metadata', () => {
    const replayId = crossSessionReplay.createReplay('game_002');
    const metadata = crossSessionReplay.getMetadata(replayId);
    
    assert.ok(metadata);
    assert.strictEqual(metadata.gameId, 'game_002');
    assert.strictEqual(metadata.turnCount, 0);
    assert.strictEqual(metadata.winner, null);
  });

  it('should add and retrieve metadata', () => {
    const replayId = crossSessionReplay.createReplay('game_003');
    
    crossSessionReplay.addMetadata(replayId, {
      players: ['player_1', 'player_2'],
      winner: 'player_1',
      turnCount: 25,
      playerCount: 2,
    });
    
    const metadata = crossSessionReplay.getMetadata(replayId);
    
    assert.strictEqual(metadata.players.length, 2);
    assert.strictEqual(metadata.winner, 'player_1');
    assert.strictEqual(metadata.turnCount, 25);
    assert.strictEqual(metadata.playerCount, 2);
  });

  it('should return null metadata for non-existent replay', () => {
    const metadata = crossSessionReplay.getMetadata('non_existent_replay');
    assert.strictEqual(metadata, null);
  });

  it('should save replay to localStorage', () => {
    const replayId = crossSessionReplay.createReplay('game_004');
    crossSessionReplay.addMetadata(replayId, { playerCount: 4 });
    
    const saved = crossSessionReplay.saveReplay(replayId);
    assert.strictEqual(saved, true);
    
    // Verify localStorage was updated
    const storageKey = 'monopoly3d_xsr_' + replayId;
    assert.ok(localStorageMock.getItem(storageKey));
  });

  it('should list saved replays', () => {
    const replayId1 = crossSessionReplay.createReplay('game_list_1');
    crossSessionReplay.saveReplay(replayId1);
    
    const replayId2 = crossSessionReplay.createReplay('game_list_2');
    crossSessionReplay.saveReplay(replayId2);
    
    const replays = crossSessionReplay.listReplays();
    
    assert.ok(Array.isArray(replays));
    assert.strictEqual(replays.length, 2);
    // Should be sorted by timestamp (newest first)
    assert.ok(replays[0].timestamp >= replays[1].timestamp);
  });

  it('should load replay from localStorage', () => {
    const replayId = crossSessionReplay.createReplay('game_load');
    crossSessionReplay.addMetadata(replayId, { playerCount: 3 });
    crossSessionReplay.saveReplay(replayId);
    
    const loaded = crossSessionReplay.loadReplay(replayId);
    
    assert.ok(loaded);
    assert.strictEqual(loaded.gameId, 'game_load');
    assert.strictEqual(loaded.replayId, replayId);
  });

  it('should delete replay from localStorage', () => {
    const replayId = crossSessionReplay.createReplay('game_delete');
    crossSessionReplay.saveReplay(replayId);
    
    const deleted = crossSessionReplay.deleteReplay(replayId);
    assert.strictEqual(deleted, true);
    
    // Verify deleted from localStorage
    const storageKey = 'monopoly3d_xsr_' + replayId;
    assert.strictEqual(localStorageMock.getItem(storageKey), null);
    
    // Verify not in list
    const replays = crossSessionReplay.listReplays();
    assert.strictEqual(replays.find(r => r.replayId === replayId), undefined);
  });

  it('should export replay as JSON file', () => {
    const replayId = crossSessionReplay.createReplay('game_export');
    crossSessionReplay.addMetadata(replayId, { playerCount: 2 });
    crossSessionReplay.saveReplay(replayId);
    
    const exported = crossSessionReplay.exportReplayFile(replayId);
    
    assert.ok(typeof exported === 'string');
    assert.ok(exported.includes('"replayId"'));
    assert.ok(exported.includes('"gameId"'));
    assert.ok(exported.includes('"events"'));
  });

  it('should import replay from file content', () => {
    const replayId = crossSessionReplay.createReplay('game_import');
    crossSessionReplay.addMetadata(replayId, { playerCount: 2 });
    crossSessionReplay.saveReplay(replayId);
    
    const exported = crossSessionReplay.exportReplayFile(replayId);
    const imported = crossSessionReplay.importReplayFile(exported);
    
    assert.ok(imported);
    assert.strictEqual(imported.gameId, 'game_import');
    assert.ok(Array.isArray(imported.events));
  });

  it('should return null when exporting non-existent replay', () => {
    const exported = crossSessionReplay.exportReplayFile('non_existent');
    assert.strictEqual(exported, null);
  });

  it('should return null when importing invalid content', () => {
    const imported = crossSessionReplay.importReplayFile('not valid json');
    assert.strictEqual(imported, null);
  });

  it('should handle auto-save registration without errors', () => {
    const cleanup = crossSessionReplay.autoSaveOnGameEnd('some_key');
    assert.ok(typeof cleanup === 'function');
    cleanup();
  });

  it('should update metadata on save', () => {
    const replayId = crossSessionReplay.createReplay('game_meta_update');
    crossSessionReplay.addMetadata(replayId, { turnCount: 10 });
    
    // Add more metadata before save
    crossSessionReplay.addMetadata(replayId, { winner: 'player_1' });
    crossSessionReplay.saveReplay(replayId);
    
    const loaded = crossSessionReplay.loadReplay(replayId);
    
    assert.ok(loaded);
    assert.strictEqual(loaded.metadata.turnCount, 10);
    assert.strictEqual(loaded.metadata.winner, 'player_1');
  });

  it('should sort replays by timestamp descending', () => {
    const replayId1 = crossSessionReplay.createReplay('game_sort_1');
    crossSessionReplay.saveReplay(replayId1);
    
    // Small delay to ensure different timestamps
    const start = Date.now();
    while (Date.now() - start < 10) { /* busy wait */ }
    
    const replayId2 = crossSessionReplay.createReplay('game_sort_2');
    crossSessionReplay.saveReplay(replayId2);
    
    const replays = crossSessionReplay.listReplays();
    
    assert.ok(replays[0].timestamp >= replays[1].timestamp);
  });

  it('should clean up resources on destroy', () => {
    crossSessionReplay.createReplay('game_destroy');
    crossSessionReplay.destroy();
    
    // Should not throw when called
    assert.ok(true);
  });
});