import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { EventBus } from '../src/game/eventBus.js';
import { ReplayPlayer } from '../src/game/hooks/replayPlayer.js';

describe('ReplayPlayer', () => {
  let eventBus;
  let replayData;

  beforeEach(() => {
    eventBus = new EventBus();
    
    // Create sample replay data
    const now = Date.now();
    replayData = {
      gameId: 'game-test',
      startTime: now - 10000,
      endTime: now,
      events: [
        { type: 'game_start', data: { players: 4 }, timestamp: now - 10000 },
        { type: 'dice_roll', data: { playerId: 1, value: [3, 4] }, timestamp: now - 9000 },
        { type: 'player_move', data: { from: 0, to: 7 }, timestamp: now - 8500 },
        { type: 'property_purchase', data: { tileId: 7, price: 120 }, timestamp: now - 8000 },
        { type: 'game_end', data: { winner: 1 }, timestamp: now },
      ],
      duration: 10000,
      eventCount: 5,
    };
  });

  describe('constructor', () => {
    it('should create instance with eventBus and replay', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      assert.ok(player instanceof ReplayPlayer);
      assert.strictEqual(player.eventBus, eventBus);
      assert.strictEqual(player.replay, replayData);
    });

    it('should initialize with index at 0', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      assert.strictEqual(player.getCurrentIndex(), 0);
    });

    it('should initialize as not playing', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      assert.strictEqual(player.isPlaying(), false);
    });

    it('should default to 1x speed', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      assert.strictEqual(player.speed, 1.0);
    });
  });

  describe('totalEvents', () => {
    it('should return correct event count', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      assert.strictEqual(player.totalEvents, 5);
    });

    it('should return 0 for empty replay', () => {
      const emptyReplay = { events: [] };
      const player = new ReplayPlayer(eventBus, emptyReplay);
      
      assert.strictEqual(player.totalEvents, 0);
    });

    it('should handle missing events array', () => {
      const player = new ReplayPlayer(eventBus, {});
      
      assert.strictEqual(player.totalEvents, 0);
    });
  });

  describe('play', () => {
    it('should set isPlaying to true', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      player.play();
      
      assert.strictEqual(player.isPlaying(), true);
    });

    it('should publish first event after a delay', (t, done) => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      eventBus.subscribe('dice_roll', () => {
        assert.strictEqual(player.getCurrentIndex(), 1);
        player.stop();
        done();
      });
      
      player.play();
      
      // Should not publish immediately
      assert.strictEqual(player.getCurrentIndex(), 0);
    });

    it('should handle custom speed', (t, done) => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      player.play(2.0);
      
      assert.strictEqual(player.speed, 2.0);
      player.stop();
      done();
    });

    it('should clamp invalid speed to 1.0', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      player.play(3.0); // Invalid speed
      
      assert.strictEqual(player.speed, 1.0);
    });

    it('should restart from beginning if at end', (t, done) => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      // Move to end
      player.currentIndex = 5;
      
      player.play();
      
      assert.strictEqual(player.getCurrentIndex(), 0);
      assert.strictEqual(player.isPlaying(), true);
      player.stop();
      done();
    });

    it('should warn if no events to play', () => {
      const player = new ReplayPlayer(eventBus, { events: [] });
      
      // Should not throw
      player.play();
      
      assert.strictEqual(player.isPlaying(), false);
    });
  });

  describe('pause', () => {
    it('should pause playback', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      player.play();
      player.pause();
      
      assert.strictEqual(player.isPlaying(), false);
    });

    it('should preserve current index when paused', (t, done) => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      eventBus.subscribe('dice_roll', () => {
        player.pause();
        assert.strictEqual(player.getCurrentIndex(), 1);
        player.stop();
        done();
      });
      
      player.play();
    });
  });

  describe('resume', () => {
    it('should resume from current position', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      player.play();
      player.pause();
      player.resume();
      
      assert.strictEqual(player.isPlaying(), true);
    });

    it('should restart from 0 if at end', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      player._currentIndex = 5;
      player.resume();
      
      assert.strictEqual(player.getCurrentIndex(), 0);
      player.stop();
    });
  });

  describe('seekTo', () => {
    it('should move to specific index', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      player.seekTo(3);
      
      assert.strictEqual(player.getCurrentIndex(), 3);
    });

    it('should clamp negative index to 0', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      player.seekTo(-5);
      
      assert.strictEqual(player.getCurrentIndex(), 0);
    });

    it('should clamp index beyond end to last event', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      player.seekTo(100);
      
      assert.strictEqual(player.getCurrentIndex(), 4);
    });

    it('should update playback if currently playing', (t, done) => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      eventBus.subscribe('property_purchase', () => {
        assert.strictEqual(player.getCurrentIndex(), 3);
        player.stop();
        done();
      });
      
      player.play();
      player.seekTo(3);
    });
  });

  describe('stop', () => {
    it('should stop playback and reset index', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      player.play();
      player.stop();
      
      assert.strictEqual(player.isPlaying(), false);
      assert.strictEqual(player.getCurrentIndex(), 0);
    });

    it('should clear any pending timers', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      player.play();
      player.stop();
      
      // Should not throw when calling stop twice
      player.stop();
    });
  });

  describe('getProgress', () => {
    it('should return progress object', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      player.seekTo(2);
      
      const progress = player.getProgress();
      
      assert.strictEqual(progress.currentIndex, 2);
      assert.strictEqual(progress.totalEvents, 5);
      assert.strictEqual(progress.percentage, 40);
    });

    it('should return 0% at start', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      
      const progress = player.getProgress();
      
      assert.strictEqual(progress.percentage, 0);
    });

    it('should return 100% at last index', () => {
      const player = new ReplayPlayer(eventBus, replayData);
      // Index 4 is the last valid index for 5 events (0-4)
      player.seekTo(4);
      
      const progress = player.getProgress();
      
      assert.strictEqual(progress.percentage, 100);
    });

    it('should return 0% for empty replay', () => {
      const player = new ReplayPlayer(eventBus, { events: [] });
      
      const progress = player.getProgress();
      
      assert.strictEqual(progress.totalEvents, 0);
      assert.strictEqual(progress.percentage, 0);
    });
  });

  describe('event publishing', () => {
    it('should publish events to eventBus during playback', (t, done) => {
      const player = new ReplayPlayer(eventBus, replayData);
      const publishedEvents = [];
      
      // Subscribe to specific event types instead of '*'
      eventBus.subscribe('game_start', (event) => {
        publishedEvents.push(event.type);
      });
      eventBus.subscribe('dice_roll', (event) => {
        publishedEvents.push(event.type);
      });
      eventBus.subscribe('player_move', (event) => {
        publishedEvents.push(event.type);
      });
      eventBus.subscribe('property_purchase', (event) => {
        publishedEvents.push(event.type);
        // Done after a few events published
        player.stop();
      });
      
      player.play();
      
      setTimeout(() => {
        assert.ok(publishedEvents.length > 0);
        done();
      }, 300);
    });
  });
});