import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { HookRegistry, hookRegistry } from '../src/game/hooks/hookRegistry.js';

describe('HookRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it('should be a singleton export', () => {
    assert.ok(hookRegistry instanceof HookRegistry);
  });

  it('should register before hooks', () => {
    const handlerId = registry.register('property_purchase', 'before', (data) => {
      return { ...data, modified: true };
    });

    assert.ok(handlerId);
    assert.ok(registry.hasHooks('property_purchase', 'before'));
  });

  it('should register after hooks', () => {
    const handlerId = registry.register('rent_paid', 'after', (data) => {
      // Side effect tracking
    });

    assert.ok(handlerId);
    assert.ok(registry.hasHooks('rent_paid', 'after'));
  });

  it('should register insteadOf hooks', () => {
    const handlerId = registry.register('house_building', 'insteadOf', (data, originalFn) => {
      return originalFn(data);
    });

    assert.ok(handlerId);
    assert.ok(registry.hasHooks('house_building', 'insteadOf'));
  });

  it('should throw error for invalid hook type', () => {
    assert.throws(() => {
      registry.register('test', 'invalid', () => {});
    }, /Invalid hook type/);
  });

  it('should execute before hooks and modify data', () => {
    registry.register('property_purchase', 'before', (data) => {
      return { ...data, tax: data.price * 0.1 };
    });

    const result = registry.executeBefore('property_purchase', { price: 100 });
    assert.strictEqual(result.tax, 10);
  });

  it('should execute before hooks in priority order', () => {
    const results = [];

    registry.register('dice_roll', 'before', () => {
      results.push('low');
    }, 0);

    registry.register('dice_roll', 'before', () => {
      results.push('high');
    }, 100);

    registry.executeBefore('dice_roll', {});

    assert.deepStrictEqual(results, ['high', 'low']);
  });

  it('should return null from before hook to block action', () => {
    registry.register('rent_payment', 'before', () => null);

    const result = registry.executeBefore('rent_payment', { amount: 50 });
    assert.strictEqual(result, null);
  });

  it('should execute after hooks for side effects', () => {
    let sideEffect = null;

    registry.register('property_purchase', 'after', (data) => {
      sideEffect = data;
    });

    registry.executeAfter('property_purchase', { tileId: 5 });

    assert.strictEqual(sideEffect.tileId, 5);
  });

  it('should execute insteadOf hooks and pass original function', () => {
    let called = false;
    const originalFn = () => { called = true; };

    registry.register('house_building', 'insteadOf', (data, fn) => {
      return fn(data);
    });

    registry.executeInsteadOf('house_building', { tileId: 3 }, originalFn);
    assert.strictEqual(called, true);
  });

  it('should fallback to original function when no insteadOf hooks', () => {
    let called = false;
    const originalFn = () => { called = true; };

    // No hooks registered
    registry.executeInsteadOf('some_event', {}, originalFn);
    assert.strictEqual(called, true);
  });

  it('should unregister hooks', () => {
    const handlerId = registry.register('test_event', 'before', () => {});

    assert.ok(registry.hasHooks('test_event', 'before'));

    const removed = registry.unregister('test_event', 'before', handlerId);
    assert.strictEqual(removed, true);
    assert.ok(!registry.hasHooks('test_event', 'before'));
  });

  it('should return false when unregistering non-existent hook', () => {
    const removed = registry.unregister('test_event', 'before', 'non_existent_id');
    assert.strictEqual(removed, false);
  });

  it('should clear all hooks', () => {
    registry.register('event1', 'before', () => {});
    registry.register('event2', 'after', () => {});
    registry.register('event3', 'insteadOf', () => {});

    registry.clear();

    assert.ok(!registry.hasHooks('event1', 'before'));
    assert.ok(!registry.hasHooks('event2', 'after'));
    assert.ok(!registry.hasHooks('event3', 'insteadOf'));
  });

  it('should clear hooks for specific event', () => {
    registry.register('event1', 'before', () => {});
    registry.register('event1', 'after', () => {});
    registry.register('event2', 'before', () => {});

    registry.clearEvent('event1');

    assert.ok(!registry.hasHooks('event1', 'before'));
    assert.ok(!registry.hasHooks('event1', 'after'));
    assert.ok(registry.hasHooks('event2', 'before'));
  });

  it('should get hooks for an event', () => {
    registry.register('test_event', 'before', () => {}, 10);
    registry.register('test_event', 'after', () => {}, 5);

    const hooks = registry.getHooks('test_event');

    assert.strictEqual(hooks.before.length, 1);
    assert.strictEqual(hooks.after.length, 1);
    assert.strictEqual(hooks.insteadOf.length, 0);
  });

  it('should enable and disable hook execution', () => {
    let count = 0;

    registry.register('test', 'before', () => {
      count++;
    });

    registry.setEnabled(false);
    registry.executeBefore('test', {});
    assert.strictEqual(count, 0);

    registry.setEnabled(true);
    registry.executeBefore('test', {});
    assert.strictEqual(count, 1);
  });

  it('should handle errors in before hooks gracefully', () => {
    registry.register('test', 'before', () => {
      throw new Error('Test error');
    });

    registry.register('test', 'before', () => {
      return { modified: true };
    });

    const result = registry.executeBefore('test', {});
    assert.strictEqual(result.modified, true);
  });

  it('should handle errors in after hooks gracefully', () => {
    let sideEffect = false;

    registry.register('test', 'after', () => {
      throw new Error('Test error');
    });

    registry.register('test', 'after', () => {
      sideEffect = true;
    });

    // Should not throw
    registry.executeAfter('test', {});
    assert.strictEqual(sideEffect, true);
  });

  it('should work with multiple hooks of same type', () => {
    const results = [];

    registry.register('test', 'before', () => results.push(1));
    registry.register('test', 'before', () => results.push(2));
    registry.register('test', 'before', () => results.push(3));

    registry.executeBefore('test', {});

    assert.deepStrictEqual(results, [1, 2, 3]);
  });

  it('should pass data through chain of before hooks', () => {
    registry.register('test', 'before', (data) => ({
      ...data,
      step1: true,
    }));

    registry.register('test', 'before', (data) => ({
      ...data,
      step2: true,
    }));

    const result = registry.executeBefore('test', { initial: true });

    assert.strictEqual(result.initial, true);
    assert.strictEqual(result.step1, true);
    assert.strictEqual(result.step2, true);
  });
});