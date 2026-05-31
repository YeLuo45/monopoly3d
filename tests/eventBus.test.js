import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EventBus, eventBus } from '../src/game/eventBus.js';

describe('EventBus', () => {
  let bus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('should be a singleton export', () => {
    assert.ok(eventBus instanceof EventBus);
  });

  it('should publish event and notify subscribers', () => {
    let callCount = 0;
    let receivedData = null;

    const unsubscribe = bus.subscribe('dice_roll', (event) => {
      callCount++;
      receivedData = event.detail;
    });

    bus.publish('dice_roll', { playerId: 1, dice: [3, 4] });

    assert.strictEqual(callCount, 1);
    assert.deepStrictEqual(receivedData, { playerId: 1, dice: [3, 4] });

    unsubscribe();
  });

  it('should support multiple subscribers', () => {
    let count1 = 0;
    let count2 = 0;

    bus.subscribe('player_move', () => count1++);
    bus.subscribe('player_move', () => count2++);

    bus.publish('player_move', { from: 5, to: 8 });

    assert.strictEqual(count1, 1);
    assert.strictEqual(count2, 1);
  });

  it('should support unsubscribe', () => {
    let count = 0;

    const handler = () => count++;
    bus.subscribe('turn_change', handler);
    bus.subscribe('turn_change', () => count++);

    bus.publish('turn_change', { turn: 1 });
    assert.strictEqual(count, 2);

    // Unsubscribe first handler
    bus.unsubscribe('turn_change', handler);
    bus.publish('turn_change', { turn: 2 });
    assert.strictEqual(count, 3); // Only second handler was called
  });

  it('should track event history', () => {
    bus.publish('game_start', { timestamp: Date.now() });
    bus.publish('dice_roll', { dice: [1, 2] });
    bus.publish('player_move', { position: 10 });

    const history = bus.getEventHistory();
    assert.strictEqual(history.length, 3);
    assert.strictEqual(history[0].type, 'game_start');
    assert.strictEqual(history[1].type, 'dice_roll');
    assert.strictEqual(history[2].type, 'player_move');
  });

  it('should clear history', () => {
    bus.publish('game_start', {});
    bus.publish('dice_roll', {});

    assert.strictEqual(bus.getEventHistory().length, 2);

    bus.clearHistory();

    assert.strictEqual(bus.getEventHistory().length, 0);
  });

  it('should limit history size to 100 events', () => {
    const testBus = new EventBus();
    
    // Publish 150 events
    for (let i = 0; i < 150; i++) {
      testBus.publish('test_event', { index: i });
    }

    const history = testBus.getEventHistory();
    assert.strictEqual(history.length, 100);
    // First event should be index 50 (since first 50 were pushed out)
    assert.strictEqual(history[0].data.index, 50);
  });

  it('should include timestamp in published events', () => {
    const before = Date.now();
    bus.publish('property_purchase', { tileId: 5, price: 100 });
    const after = Date.now();

    const history = bus.getEventHistory();
    assert.ok(history[0].timestamp >= before);
    assert.ok(history[0].timestamp <= after);
  });

  it('should get events by type', () => {
    bus.publish('dice_roll', { value: 1 });
    bus.publish('player_move', { position: 2 });
    bus.publish('dice_roll', { value: 3 });

    const diceEvents = bus.getEventsByType('dice_roll');
    assert.strictEqual(diceEvents.length, 2);
    assert.strictEqual(diceEvents[0].data.value, 1);
    assert.strictEqual(diceEvents[1].data.value, 3);
  });

  it('should get recent events', () => {
    for (let i = 0; i < 20; i++) {
      bus.publish('test', { index: i });
    }

    const recent = bus.getRecentEvents(5);
    assert.strictEqual(recent.length, 5);
    assert.strictEqual(recent[0].data.index, 15);
    assert.strictEqual(recent[4].data.index, 19);
  });

  it('should work with different event types', () => {
    const events = [
      'player_move',
      'property_purchase',
      'rent_paid',
      'dice_roll',
      'turn_change',
      'game_start',
      'game_end',
      'house_built',
      'question_answered',
      'jail_enter',
      'jail_exit',
    ];

    let count = 0;
    events.forEach(eventType => {
      bus.subscribe(eventType, () => count++);
    });

    events.forEach(eventType => {
      bus.publish(eventType, { type: eventType });
    });

    assert.strictEqual(count, events.length);
  });

  it('should pass data to handler correctly', () => {
    let receivedEvent = null;

    bus.subscribe('house_built', (event) => {
      receivedEvent = event;
    });

    const data = { tileId: 12, houses: 1 };
    bus.publish('house_built', data);

    assert.ok(receivedEvent);
    assert.strictEqual(receivedEvent.detail.tileId, 12);
    assert.strictEqual(receivedEvent.detail.houses, 1);
  });
});