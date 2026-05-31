import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { EventBus } from '../src/game/eventBus.js';
import { GameReplay } from '../src/game/hooks/gameReplay.js';

describe('GameReplay', () => {
  let eventBus;
  let gameReplay;

  beforeEach(() => {
    eventBus = new EventBus();
    gameReplay = new GameReplay(eventBus, 100);
  });

  afterEach(() => {
    gameReplay.stopRecording();
  });

  describe('constructor', () => {
    it('should create instance with eventBus', () => {
      assert.ok(gameReplay instanceof GameReplay);
      assert.strictEqual(gameReplay.eventBus, eventBus);
    });

    it('should use default maxEvents of 1000', () => {
      const replay = new GameReplay(eventBus);
      assert.strictEqual(replay.maxEvents, 1000);
    });

    it('should accept custom maxEvents', () => {
      const replay = new GameReplay(eventBus, 500);
      assert.strictEqual(replay.maxEvents, 500);
    });

    it('should initialize with empty state', () => {
      assert.strictEqual(gameReplay.isRecording, false);
      assert.strictEqual(gameReplay.gameId, null);
      assert.strictEqual(gameReplay.events.length, 0);
    });
  });

  describe('startRecording', () => {
    it('should start recording with gameId', () => {
      gameReplay.startRecording('game-123');
      
      assert.strictEqual(gameReplay.isRecording, true);
      assert.strictEqual(gameReplay.gameId, 'game-123');
      assert.ok(gameReplay.startTime > 0);
    });

    it('should clear previous events when starting new recording', () => {
      gameReplay.startRecording('game-1');
      eventBus.publish('test', { value: 1 });
      gameReplay.startRecording('game-2');
      
      // Events after startRecording('game-2') are recorded, previous events cleared
      assert.strictEqual(gameReplay.events.length, 0);
    });

    it('should replace existing recording when startRecording called again', () => {
      gameReplay.startRecording('game-1');
      eventBus.publish('test', { value: 1 });
      
      // Start new recording - should clear previous events
      gameReplay.startRecording('game-2');
      eventBus.publish('test', { value: 2 });
      
      assert.strictEqual(gameReplay.events.length, 1);
      assert.strictEqual(gameReplay.events[0].data.value, 2);
      assert.strictEqual(gameReplay.gameId, 'game-2');
    });
  });

  describe('stopRecording', () => {
    it('should stop recording', () => {
      gameReplay.startRecording('game-123');
      eventBus.publish('dice_roll', { value: 5 });
      
      gameReplay.stopRecording();
      
      assert.strictEqual(gameReplay.isRecording, false);
    });

    it('should preserve recorded events after stopping', () => {
      gameReplay.startRecording('game-123');
      eventBus.publish('dice_roll', { value: 5 });
      eventBus.publish('player_move', { position: 10 });
      
      gameReplay.stopRecording();
      
      assert.strictEqual(gameReplay.events.length, 2);
      assert.strictEqual(gameReplay.events[0].type, 'dice_roll');
      assert.strictEqual(gameReplay.events[1].type, 'player_move');
    });
  });

  describe('event recording', () => {
    it('should record events from eventBus', () => {
      gameReplay.startRecording('game-123');
      
      eventBus.publish('dice_roll', { playerId: 1, value: [3, 4] });
      eventBus.publish('player_move', { from: 5, to: 8 });
      eventBus.publish('property_purchase', { tileId: 12, price: 200 });
      
      assert.strictEqual(gameReplay.events.length, 3);
      assert.strictEqual(gameReplay.events[0].type, 'dice_roll');
      assert.strictEqual(gameReplay.events[0].data.playerId, 1);
    });

    it('should respect maxEvents limit', () => {
      const smallReplay = new GameReplay(eventBus, 3);
      smallReplay.startRecording('game-limited');
      
      for (let i = 0; i < 5; i++) {
        eventBus.publish('test_event', { index: i });
      }
      
      assert.strictEqual(smallReplay.events.length, 3);
      assert.strictEqual(smallReplay.events[0].data.index, 2);
      assert.strictEqual(smallReplay.events[2].data.index, 4);
      
      smallReplay.stopRecording();
    });

    it('should not record before startRecording', () => {
      eventBus.publish('test_event', { value: 1 });
      
      assert.strictEqual(gameReplay.events.length, 0);
    });
  });

  describe('getRecording', () => {
    it('should return recording data structure', () => {
      gameReplay.startRecording('game-test');
      eventBus.publish('dice_roll', { value: 5 });
      
      const recording = gameReplay.getRecording();
      
      assert.strictEqual(recording.gameId, 'game-test');
      assert.ok(recording.startTime > 0);
      assert.ok(recording.endTime >= recording.startTime);
      assert.strictEqual(recording.events.length, 1);
      assert.strictEqual(recording.eventCount, 1);
    });

    it('should return copy of events array', () => {
      gameReplay.startRecording('game-test');
      eventBus.publish('test', { data: 1 });
      
      const recording1 = gameReplay.getRecording();
      const recording2 = gameReplay.getRecording();
      
      assert.notStrictEqual(recording1.events, recording2.events);
      assert.deepStrictEqual(recording1.events, recording2.events);
    });
  });

  describe('exportReplay and importReplay', () => {
    it('should export recording as JSON', () => {
      gameReplay.startRecording('game-export');
      eventBus.publish('dice_roll', { value: 5 });
      eventBus.publish('player_move', { position: 10 });
      
      const jsonStr = gameReplay.exportReplay();
      const parsed = JSON.parse(jsonStr);
      
      assert.strictEqual(parsed.gameId, 'game-export');
      assert.strictEqual(parsed.events.length, 2);
    });

    it('should import valid replay JSON', () => {
      const replayData = {
        gameId: 'game-imported',
        startTime: Date.now() - 60000,
        endTime: Date.now(),
        events: [
          { type: 'dice_roll', data: { value: 6 }, timestamp: Date.now() - 50000 },
          { type: 'player_move', data: { position: 15 }, timestamp: Date.now() },
        ],
        duration: 60000,
        eventCount: 2,
      };
      
      const imported = gameReplay.importReplay(JSON.stringify(replayData));
      
      assert.strictEqual(imported.gameId, 'game-imported');
      assert.strictEqual(imported.events.length, 2);
      assert.strictEqual(imported.events[0].type, 'dice_roll');
    });

    it('should return null for invalid JSON', () => {
      const result = gameReplay.importReplay('not valid json');
      assert.strictEqual(result, null);
    });

    it('should return null for missing events array', () => {
      const result = gameReplay.importReplay('{"gameId": "test"}');
      assert.strictEqual(result, null);
    });
  });

  describe('saveToStorage and loadFromStorage', () => {
    it('should handle missing localStorage gracefully', () => {
      gameReplay.startRecording('game-nostorage');
      eventBus.publish('test', { data: 1 });
      
      // Should not throw, just return false
      const saved = gameReplay.saveToStorage('test-key');
      assert.strictEqual(saved, false);
    });
  });

  describe('listReplays', () => {
    it('should return empty array when no replays', () => {
      const replays = gameReplay.listReplays();
      assert.ok(Array.isArray(replays));
    });
  });

  describe('deleteReplay', () => {
    it('should handle missing localStorage gracefully', () => {
      const deleted = gameReplay.deleteReplay('some-key');
      assert.strictEqual(deleted, false);
    });
  });
});