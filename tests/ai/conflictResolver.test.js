/**
 * ConflictResolver Test Suite
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ConflictResolver, ResolutionStrategy, ConflictType } from '../../src/game/ai/cloud/conflictResolver.js';

describe('ConflictResolver', () => {
  let resolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  // Constructor tests
  test('constructor initializes empty custom strategies', () => {
    assert.ok(resolver.customStrategies instanceof Map);
    assert.strictEqual(resolver.customStrategies.size, 0);
    assert.ok(Array.isArray(resolver.resolutionHistory));
  });

  // Basic resolution tests
  test('resolve returns secondary when primary is null', () => {
    const secondary = { value: 1 };
    const result = resolver.resolve(null, secondary, ResolutionStrategy.LOCAL_WINS);
    assert.strictEqual(result.value, 1);
    assert.ok(result._resolution);
    assert.strictEqual(result._resolution.strategy, ResolutionStrategy.LOCAL_WINS);
  });

  test('resolve returns primary when secondary is null', () => {
    const primary = { value: 1 };
    const result = resolver.resolve(primary, null, ResolutionStrategy.LOCAL_WINS);
    assert.strictEqual(result.value, 1);
    assert.ok(result._resolution);
    assert.strictEqual(result._resolution.strategy, ResolutionStrategy.LOCAL_WINS);
  });

  test('resolve throws error when both are null', () => {
    assert.throws(
      () => resolver.resolve(null, null, ResolutionStrategy.LOCAL_WINS),
      /At least one data source must be provided/
    );
  });

  test('LOCAL_WINS strategy returns primary data', () => {
    const primary = { value: 1, name: 'local' };
    const secondary = { value: 2, name: 'remote' };

    const result = resolver.resolve(primary, secondary, ResolutionStrategy.LOCAL_WINS);
    
    assert.strictEqual(result.value, 1);
    assert.strictEqual(result.name, 'local');
    assert.ok(result._resolution);
    assert.strictEqual(result._resolution.strategy, ResolutionStrategy.LOCAL_WINS);
  });

  test('REMOTE_WINS strategy returns secondary data', () => {
    const primary = { value: 1 };
    const secondary = { value: 2 };

    const result = resolver.resolve(primary, secondary, ResolutionStrategy.REMOTE_WINS);
    
    assert.strictEqual(result.value, 2);
    assert.ok(result._resolution);
    assert.strictEqual(result._resolution.strategy, ResolutionStrategy.REMOTE_WINS);
  });

  test('LATEST_WINS strategy returns most recent data', () => {
    const primary = { value: 1, updatedAt: 1000 };
    const secondary = { value: 2, updatedAt: 2000 };

    const result = resolver.resolve(primary, secondary, ResolutionStrategy.LATEST_WINS);
    
    assert.strictEqual(result.value, 2);
    assert.strictEqual(result._resolution.source, 'remote');
  });

  test('MERGE strategy combines both data', () => {
    const primary = { value: 1, localOnly: true };
    const secondary = { value: 2, remoteOnly: true };

    const result = resolver.resolve(primary, secondary, ResolutionStrategy.MERGE);
    
    assert.strictEqual(result.value, 2); // secondary wins in conflict
    assert.strictEqual(result.localOnly, true);
    assert.strictEqual(result.remoteOnly, true);
    assert.ok(result._resolution);
    assert.strictEqual(result._resolution.strategy, ResolutionStrategy.MERGE);
  });

  // autoResolve tests
  test('autoResolve uses LATEST_WINS for concurrent edit', () => {
    const primary = { value: 1, updatedAt: 1000 };
    const secondary = { value: 2, updatedAt: 2000 };

    const result = resolver.autoResolve(primary, secondary);
    
    assert.strictEqual(result.value, 2);
  });

  test('autoResolve uses LOCAL_WINS when deleted in remote', () => {
    const primary = { value: 1 };

    const result = resolver.autoResolve(primary, null);
    
    assert.strictEqual(result.value, 1);
    assert.strictEqual(result._resolution.strategy, ResolutionStrategy.LOCAL_WINS);
  });

  test('autoResolve uses REMOTE_WINS when deleted in local', () => {
    const secondary = { value: 1 };

    const result = resolver.autoResolve(null, secondary);
    
    assert.strictEqual(result.value, 1);
    assert.strictEqual(result._resolution.strategy, ResolutionStrategy.REMOTE_WINS);
  });

  // Strategy listing tests
  test('getAvailableStrategies returns all strategies', () => {
    const strategies = resolver.getAvailableStrategies();
    
    assert.ok(Array.isArray(strategies));
    assert.strictEqual(strategies.length, 5);
    
    const strategyNames = strategies.map(s => s.name);
    assert.ok(strategyNames.includes(ResolutionStrategy.LOCAL_WINS));
    assert.ok(strategyNames.includes(ResolutionStrategy.REMOTE_WINS));
    assert.ok(strategyNames.includes(ResolutionStrategy.LATEST_WINS));
    assert.ok(strategyNames.includes(ResolutionStrategy.MERGE));
    assert.ok(strategyNames.includes(ResolutionStrategy.MANUAL));
  });

  // Custom strategy tests
  test('registerCustomStrategy adds custom strategy', () => {
    resolver.registerCustomStrategy('customStrategy', (primary, secondary) => ({
      combined: true
    }));

    const customStrategies = resolver.getCustomStrategies();
    assert.ok(customStrategies.includes('customStrategy'));
  });

  test('registerCustomStrategy throws error for non-function', () => {
    assert.throws(
      () => resolver.registerCustomStrategy('bad', 'not a function'),
      /Strategy function must be a function/
    );
  });

  // compareData tests
  test('compareData detects added keys', () => {
    const primary = { existing: 1 };
    const secondary = { existing: 1, new: 2 };

    const diff = resolver.compareData(primary, secondary);
    
    assert.ok(diff.added.includes('new'));
    assert.ok(!diff.removed.includes('existing'));
  });

  test('compareData detects removed keys', () => {
    const primary = { existing: 1, removed: 2 };
    const secondary = { existing: 1 };

    const diff = resolver.compareData(primary, secondary);
    
    assert.ok(diff.removed.includes('removed'));
  });

  test('compareData detects changed values', () => {
    const primary = { value: 1 };
    const secondary = { value: 2 };

    const diff = resolver.compareData(primary, secondary);
    
    assert.ok(diff.changed.includes('value'));
  });

  // Resolution history tests
  test('getResolutionHistory returns history', () => {
    resolver.resolve({ id: 'p1' }, { id: 'p2' }, ResolutionStrategy.LOCAL_WINS);

    const history = resolver.getResolutionHistory();
    assert.ok(history.length > 0);
  });

  // validateResolved tests
  test('validateResolved returns true for valid object', () => {
    const resolved = { value: 1 };
    const isValid = resolver.validateResolved(resolved);
    assert.strictEqual(isValid, true);
  });

  test('validateResolved returns false for null', () => {
    const isValid = resolver.validateResolved(null);
    assert.strictEqual(isValid, false);
  });

  test('validateResolved validates against schema', () => {
    const resolved = { value: 1 };
    const schema = { required: ['value'] };
    
    const isValid = resolver.validateResolved(resolved, schema);
    assert.strictEqual(isValid, true);
  });

  test('emits conflict:detected and conflict:resolved events', () => {
    let detected = false;
    let resolved = false;
    
    resolver.on('conflict:detected', () => { detected = true; });
    resolver.on('conflict:resolved', () => { resolved = true; });

    resolver.resolve({ value: 1 }, { value: 2 }, ResolutionStrategy.LOCAL_WINS);

    assert.strictEqual(detected, true);
    assert.strictEqual(resolved, true);
  });
});