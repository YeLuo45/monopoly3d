/**
 * Tests for L0_RawEventCache
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { L0_RawEventCache } from '../../src/game/ai/memory/l0_rawEventCache.js';

describe('L0_RawEventCache', () => {
  let cache;

  beforeEach(() => {
    cache = new L0_RawEventCache(100);
  });

  afterEach(() => {
    cache.clear();
  });

  test('constructor initializes empty buffer', () => {
    assert.strictEqual(cache.size(), 0);
    assert.deepStrictEqual(cache.buffer, []);
  });

  test('push adds event with timestamp', () => {
    const entry = cache.push('dice_roll', { values: [3, 4] });
    assert.strictEqual(entry.event, 'dice_roll');
    assert.deepStrictEqual(entry.data, { values: [3, 4] });
    assert.ok(entry.timestamp);
    assert.strictEqual(cache.size(), 1);
  });

  test('getRecent returns most recent events newest first', () => {
    cache.push('event1', { num: 1 });
    cache.push('event2', { num: 2 });
    cache.push('event3', { num: 3 });
    
    const recent = cache.getRecent(2);
    assert.strictEqual(recent.length, 2);
    assert.strictEqual(recent[0].data.num, 3);
    assert.strictEqual(recent[1].data.num, 2);
  });

  test('getByType filters events correctly', () => {
    cache.push('dice_roll', { playerId: 'p1' });
    cache.push('property_purchase', { playerId: 'p1' });
    cache.push('dice_roll', { playerId: 'p2' });
    
    const rolls = cache.getByType('dice_roll');
    assert.strictEqual(rolls.length, 2);
  });

  test('getByTimeRange filters by timestamp', () => {
    const before = Date.now() - 1000;
    cache.push('event1', {});
    const during = Date.now();
    cache.push('event2', {});
    const after = Date.now() + 1000;
    cache.push('event3', {});
    
    const results = cache.getByTimeRange(during, after);
    assert.ok(results.length >= 2); // At least 2 events (event2 and event3)
  });

  test('getByPlayer filters by playerId in data', () => {
    cache.push('dice_roll', { playerId: 'p1' });
    cache.push('property_purchase', { playerId: 'p2' });
    cache.push('dice_roll', { playerId: 'p1' });
    
    const p1Events = cache.getByPlayer('p1');
    assert.strictEqual(p1Events.length, 2);
  });

  test('circular buffer overwrites old events', () => {
    const smallCache = new L0_RawEventCache(3);
    smallCache.push('e1', {});
    smallCache.push('e2', {});
    smallCache.push('e3', {});
    assert.strictEqual(smallCache.size(), 3);
    
    smallCache.push('e4', {});
    assert.strictEqual(smallCache.size(), 3);
    
    const recent = smallCache.getRecent(3);
    assert.strictEqual(recent[0].event, 'e4');
    assert.strictEqual(recent[2].event, 'e2');
  });

  test('clear removes all events', () => {
    cache.push('event1', {});
    cache.push('event2', {});
    assert.strictEqual(cache.size(), 2);
    
    cache.clear();
    assert.strictEqual(cache.size(), 0);
  });

  test('size returns correct count', () => {
    assert.strictEqual(cache.size(), 0);
    cache.push('event1', {});
    assert.strictEqual(cache.size(), 1);
    cache.push('event2', {});
    assert.strictEqual(cache.size(), 2);
  });
});