/**
 * EventSerializer Tests
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EventSerializer, CURRENT_SCHEMA_VERSION } from '../src/game/hooks/eventSerializer.js';

describe('EventSerializer', () => {
  let serializer;

  beforeEach(() => {
    serializer = new EventSerializer();
  });

  it('should create an instance with correct version', () => {
    assert.strictEqual(serializer.version, CURRENT_SCHEMA_VERSION);
    assert.strictEqual(serializer.getVersion(), CURRENT_SCHEMA_VERSION);
  });

  it('should serialize a single event correctly', () => {
    const event = serializer.serializeEvent('dice_roll', { values: [3, 4], playerId: 'player_1' });
    
    assert.strictEqual(event.type, 'dice_roll');
    assert.deepStrictEqual(event.data, { values: [3, 4], playerId: 'player_1' });
    assert.ok(event.timestamp);
    assert.strictEqual(event.version, CURRENT_SCHEMA_VERSION);
  });

  it('should serialize event with null data', () => {
    const event = serializer.serializeEvent('game_start', null);
    
    assert.strictEqual(event.type, 'game_start');
    assert.deepStrictEqual(event.data, {});
    assert.ok(event.timestamp);
  });

  it('should serialize event with undefined data', () => {
    const event = serializer.serializeEvent('game_end');
    
    assert.strictEqual(event.type, 'game_end');
    assert.deepStrictEqual(event.data, {});
  });

  it('should deserialize a serialized event correctly', () => {
    const serialized = serializer.serializeEvent('property_purchase', { tileId: 5, price: 100 });
    const deserialized = serializer.deserializeEvent(serialized);
    
    assert.strictEqual(deserialized.type, 'property_purchase');
    assert.strictEqual(deserialized.data.tileId, 5);
    assert.strictEqual(deserialized.data.price, 100);
    assert.ok(deserialized.timestamp);
  });

  it('should throw error for invalid deserialize input', () => {
    assert.throws(() => {
      serializer.deserializeEvent(null);
    }, /Invalid event object/);
    
    assert.throws(() => {
      serializer.deserializeEvent('not an object');
    }, /Invalid event object/);
    
    assert.throws(() => {
      serializer.deserializeEvent({ data: {} });
    }, /missing or invalid type/);
  });

  it('should serialize multiple events to JSON string', () => {
    const events = [
      { type: 'dice_roll', data: { values: [1, 2] } },
      { type: 'tile_visit', data: { tileId: 5 } },
      { type: 'question_answered', data: { correct: true } },
    ];
    
    const jsonStr = serializer.serializeEvents(events);
    assert.ok(typeof jsonStr === 'string');
    
    const parsed = JSON.parse(jsonStr);
    assert.strictEqual(parsed.version, CURRENT_SCHEMA_VERSION);
    assert.ok(parsed.exportedAt);
    assert.strictEqual(parsed.events.length, 3);
  });

  it('should deserialize JSON string back to events array', () => {
    const events = [
      { type: 'dice_roll', data: { values: [3, 4] } },
      { type: 'rent_paid', data: { amount: 50 } },
    ];
    
    const jsonStr = serializer.serializeEvents(events);
    const deserialized = serializer.deserializeEvents(jsonStr);
    
    assert.strictEqual(deserialized.length, 2);
    assert.strictEqual(deserialized[0].type, 'dice_roll');
    assert.deepStrictEqual(deserialized[0].data.values, [3, 4]);
    assert.strictEqual(deserialized[1].type, 'rent_paid');
  });

  it('should throw error for invalid JSON string', () => {
    assert.throws(() => {
      serializer.deserializeEvents('not valid json');
    }, /Invalid JSON/);
  });

  it('should throw error for missing events array in JSON', () => {
    assert.throws(() => {
      serializer.deserializeEvents('{}');
    }, /missing events array/);
  });

  it('should throw error for non-array events input', () => {
    assert.throws(() => {
      serializer.serializeEvents('not an array');
    }, /Invalid events array/);
    
    assert.throws(() => {
      serializer.serializeEvents({ type: 'event' });
    }, /Invalid events array/);
  });

  it('should validate event objects correctly', () => {
    assert.strictEqual(serializer.validateEvent({ type: 'event', data: {} }), true);
    assert.strictEqual(serializer.validateEvent({ type: 'event' }), true);
    assert.strictEqual(serializer.validateEvent(null), false);
    assert.strictEqual(serializer.validateEvent({ data: {} }), false);
    assert.strictEqual(serializer.validateEvent({ type: 123 }), false);
    assert.strictEqual(serializer.validateEvent({ type: 'event', data: 'string' }), false);
  });

  it('should get summary of serialized events', () => {
    const events = [
      { type: 'dice_roll', data: { values: [1, 2] } },
      { type: 'tile_visit', data: { tileId: 5 } },
    ];
    
    const jsonStr = serializer.serializeEvents(events);
    const summary = serializer.getSummary(jsonStr);
    
    assert.strictEqual(summary.count, 2);
    assert.strictEqual(summary.version, CURRENT_SCHEMA_VERSION);
    assert.ok(summary.exportedAt);
    assert.ok(summary.duration >= 0);
  });

  it('should migrate events between versions', () => {
    const events = [
      { type: 'dice_roll', data: { values: [3, 4] }, timestamp: Date.now(), version: '1.0.0' },
    ];
    
    const migrated = serializer.migrate(events, '1.0.0');
    
    assert.strictEqual(migrated.length, 1);
    assert.strictEqual(migrated[0].type, 'dice_roll');
  });

  it('should throw error for invalid migration path', () => {
    assert.throws(() => {
      serializer.migrate([], 'invalid_version');
    }, /Invalid version/);
  });

  it('should handle event objects with detail property', () => {
    // Some events come with { type, detail } structure
    const event = { type: 'dice_roll', detail: { values: [3, 4] } };
    const serialized = serializer.serializeEvent(event.type, event.detail);
    
    assert.strictEqual(serialized.type, 'dice_roll');
    assert.deepStrictEqual(serialized.data, { values: [3, 4] });
  });
});