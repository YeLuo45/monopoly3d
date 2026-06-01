/**
 * Tests for L3_LongTermMemory
 * Note: localStorage not available in Node:test, so storage tests are limited
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { L3_LongTermMemory } from '../../src/game/ai/memory/l3_longTermMemory.js';

describe('L3_LongTermMemory', () => {
  let longTermMemory;

  beforeEach(() => {
    longTermMemory = new L3_LongTermMemory('test-l3-' + Date.now());
  });

  test('constructor initializes empty strategies', () => {
    assert.strictEqual(longTermMemory.strategies.size, 0);
  });

  test('saveStrategy adds strategy with outcome', () => {
    const id = longTermMemory.saveStrategy(
      'p1',
      'buy_property',
      'purchase_high_value',
      { won: true, reward: 100 }
    );
    
    assert.ok(id);
    assert.strictEqual(longTermMemory.strategies.size, 1);
    
    const strategy = longTermMemory.strategies.get(id);
    assert.strictEqual(strategy.playerId, 'p1');
    assert.strictEqual(strategy.situation, 'buy_property');
    assert.strictEqual(strategy.wins, 1);
    assert.strictEqual(strategy.losses, 0);
  });

  test('saveStrategy tracks loss correctly', () => {
    const id = longTermMemory.saveStrategy(
      'p1',
      'buy_property',
      'purchase_high_value',
      { won: false }
    );
    
    const strategy = longTermMemory.strategies.get(id);
    assert.strictEqual(strategy.wins, 0);
    assert.strictEqual(strategy.losses, 1);
  });

  test('getStrategies returns matching strategies', () => {
    longTermMemory.saveStrategy('p1', 'situation1', 'strategy1', { won: true });
    longTermMemory.saveStrategy('p1', 'situation2', 'strategy2', { won: false });
    longTermMemory.saveStrategy('p2', 'situation1', 'strategy3', { won: true });
    
    const p1Situation1 = longTermMemory.getStrategies('p1', 'situation1');
    assert.strictEqual(p1Situation1.length, 1);
    assert.strictEqual(p1Situation1[0].strategy, 'strategy1');
  });

  test('getTopStrategies returns sorted by win rate', () => {
    longTermMemory.saveStrategy('p1', 's1', 'low_perf', { won: false });
    longTermMemory.saveStrategy('p1', 's1', 'low_perf', { won: false });
    longTermMemory.saveStrategy('p1', 's2', 'high_perf', { won: true });
    longTermMemory.saveStrategy('p1', 's2', 'high_perf', { won: true });
    longTermMemory.saveStrategy('p1', 's2', 'high_perf', { won: true });
    
    const top = longTermMemory.getTopStrategies('p1', 5);
    assert.strictEqual(top[0].strategy, 'high_perf');
    // First strategy should have higher or equal win rate to subsequent ones
    assert.ok(top[0].winRate >= top[top.length - 1].winRate);
  });

  test('updateStrategy updates win rate', () => {
    const id = longTermMemory.saveStrategy('p1', 's1', 'test', { won: true });
    assert.strictEqual(longTermMemory.strategies.get(id).winRate, 1);
    
    longTermMemory.updateStrategy(id, { won: false });
    
    const strategy = longTermMemory.strategies.get(id);
    assert.strictEqual(strategy.wins, 1);
    assert.strictEqual(strategy.losses, 1);
    assert.strictEqual(strategy.winRate, 0.5);
  });

  test('evolveStrategy creates new variant', () => {
    const id = longTermMemory.saveStrategy(
      'p1',
      'buy_property',
      'aggressive_purchase',
      { won: true }
    );
    
    const evolved = longTermMemory.evolveStrategy(id);
    
    assert.ok(evolved);
    assert.notStrictEqual(evolved.id, id);
    assert.ok(evolved.strategy.includes('aggressive_purchase'));
  });

  test('exportStrategies returns valid JSON', () => {
    longTermMemory.saveStrategy('p1', 's1', 'strat1', { won: true });
    longTermMemory.saveStrategy('p2', 's2', 'strat2', { won: false });
    
    const exported = longTermMemory.exportStrategies();
    const parsed = JSON.parse(exported);
    
    assert.strictEqual(parsed.length, 2);
  });

  test('importStrategies restores from JSON', () => {
    longTermMemory.saveStrategy('p1', 's1', 'strat1', { won: true });
    longTermMemory.saveStrategy('p2', 's2', 'strat2', { won: false });
    
    const exported = longTermMemory.exportStrategies();
    
    const newMemory = new L3_LongTermMemory('test-import-' + Date.now());
    const success = newMemory.importStrategies(exported);
    
    assert.strictEqual(success, true);
    assert.ok(newMemory.strategies.size >= 2);
  });

  test('clear removes player strategies', () => {
    longTermMemory.saveStrategy('p1', 's1', 'strat1', { won: true });
    longTermMemory.saveStrategy('p2', 's2', 'strat2', { won: true });
    
    longTermMemory.clear('p1');
    
    assert.strictEqual(longTermMemory.getStrategies('p1', 's1').length, 0);
    assert.strictEqual(longTermMemory.getStrategies('p2', 's2').length, 1);
  });
});