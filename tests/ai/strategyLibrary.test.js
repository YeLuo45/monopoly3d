import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StrategyLibrary } from '../../src/game/ai/advisor/strategyLibrary.js';

describe('StrategyLibrary', () => {
  it('has all 5 built-in strategies', () => {
    const lib = new StrategyLibrary();
    const names = lib.listStrategies().map(s => s.name);
    assert.ok(names.includes('aggressive_early'));
    assert.ok(names.includes('defensive_mid'));
    assert.ok(names.includes('final_push'));
    assert.ok(names.includes('rent_focus'));
    assert.ok(names.includes('monopoly_hunt'));
  });

  it('getStrategiesByPhase returns correct strategies', () => {
    const lib = new StrategyLibrary();
    const early = lib.getStrategiesByPhase('early');
    assert.ok(early.length >= 3);
    assert.ok(early.some(s => s.name === 'aggressive_early'));

    const mid = lib.getStrategiesByPhase('mid');
    assert.ok(mid.some(s => s.name === 'defensive_mid'));

    const late = lib.getStrategiesByPhase('late');
    assert.ok(late.some(s => s.name === 'final_push'));
  });

  it('getStrategy returns strategy by name', () => {
    const lib = new StrategyLibrary();
    const s = lib.getStrategy('aggressive_early');
    assert.ok(s);
    assert.strictEqual(s.phase, 'early');
    assert.ok(s.rules.length > 0);
  });

  it('getStrategy returns null for unknown name', () => {
    const lib = new StrategyLibrary();
    assert.strictEqual(lib.getStrategy('nonexistent'), null);
  });

  it('addCustomStrategy adds new strategy', () => {
    const lib = new StrategyLibrary();
    const added = lib.addCustomStrategy({ name: 'test_strategy', desc: 'Test', rules: [] });
    assert.strictEqual(added, true);
    assert.ok(lib.getStrategy('test_strategy'));
  });

  it('addCustomStrategy rejects invalid template', () => {
    const lib = new StrategyLibrary();
    assert.strictEqual(lib.addCustomStrategy({ name: 'no_rules' }), false);
    assert.strictEqual(lib.addCustomStrategy({ rules: [] }), false);
  });

  it('removeStrategy removes custom strategy', () => {
    const lib = new StrategyLibrary();
    lib.addCustomStrategy({ name: 'removable', desc: 'To remove', rules: [] });
    assert.ok(lib.getStrategy('removable'));
    const removed = lib.removeStrategy('removable');
    assert.strictEqual(removed, true);
    assert.strictEqual(lib.getStrategy('removable'), null);
  });

  it('removeStrategy cannot remove built-in strategy', () => {
    const lib = new StrategyLibrary();
    const removed = lib.removeStrategy('aggressive_early');
    assert.strictEqual(removed, false);
    assert.ok(lib.getStrategy('aggressive_early'));
  });

  it('listStrategies returns all strategies with metadata', () => {
    const lib = new StrategyLibrary();
    const all = lib.listStrategies();
    assert.ok(all.length >= 5);
    const first = all[0];
    assert.ok(typeof first.name === 'string');
    assert.ok(typeof first.desc === 'string');
    assert.ok(typeof first.phase === 'string');
  });
});