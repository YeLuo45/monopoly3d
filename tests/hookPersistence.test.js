import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null,
  };
})();
global.localStorage = localStorageMock;

import { HookPersistence } from '../src/game/hooks/hookPersistence.js';
import { HookRegistry } from '../src/game/hooks/hookRegistry.js';
import { EventBus } from '../src/game/eventBus.js';

describe('HookPersistence', () => {
  let hookRegistry;
  let eventBus;
  let persistence;

  beforeEach(() => {
    localStorageMock.clear();
    hookRegistry = new HookRegistry();
    eventBus = new EventBus();
    persistence = new HookPersistence(hookRegistry, eventBus);
  });

  describe('constructor', () => {
    it('should create instance with hookRegistry and eventBus', () => {
      assert.ok(persistence instanceof HookPersistence);
      assert.strictEqual(persistence.hookRegistry, hookRegistry);
      assert.strictEqual(persistence.eventBus, eventBus);
    });

    it('should initialize with auto-save disabled', () => {
      assert.strictEqual(persistence._autoSaveEnabled, false);
    });
  });

  describe('saveHooks and loadHooks', () => {
    it('should save and load hook configurations', () => {
      hookRegistry.register('property_purchase', 'before', () => {}, 10);
      hookRegistry.register('dice_roll', 'after', () => {}, 5);

      const saved = persistence.saveHooks('test-hooks');
      assert.strictEqual(saved, true);

      const loaded = persistence.loadHooks('test-hooks');
      assert.ok(loaded !== null);
      assert.ok(loaded.hooks);
      assert.ok(loaded.hooks.property_purchase);
      assert.ok(loaded.hooks.dice_roll);
    });

    it('should return false when localStorage unavailable', () => {
      const originalLocalStorage = global.localStorage;
      global.localStorage = undefined;

      const saved = persistence.saveHooks('test-key');
      assert.strictEqual(saved, false);

      global.localStorage = originalLocalStorage;
    });

    it('should return null when no saved hooks exist', () => {
      const loaded = persistence.loadHooks('non-existent-key');
      assert.strictEqual(loaded, null);
    });

    it('should overwrite existing saved hooks with same key', () => {
      hookRegistry.register('test_event', 'before', () => {}, 1);
      persistence.saveHooks('shared-key');

      hookRegistry.clear();
      hookRegistry.register('test_event', 'after', () => {}, 2);
      persistence.saveHooks('shared-key');

      const loaded = persistence.loadHooks('shared-key');
      assert.ok(loaded.hooks.test_event);
      assert.strictEqual(loaded.hooks.test_event.after.length, 1);
    });
  });

  describe('listSavedKeys', () => {
    it('should list all saved hook configuration keys', () => {
      persistence.saveHooks('monopoly3d-hooks-1');
      persistence.saveHooks('monopoly3d-hooks-2');
      persistence.saveHooks('monopoly3d-hooks-3');

      const keys = persistence.listSavedKeys();
      assert.ok(Array.isArray(keys));
      assert.ok(keys.includes('monopoly3d-hooks-1'));
      assert.ok(keys.includes('monopoly3d-hooks-2'));
      assert.ok(keys.includes('monopoly3d-hooks-3'));
    });

    it('should return empty array when no keys saved', () => {
      const keys = persistence.listSavedKeys();
      assert.ok(Array.isArray(keys));
      assert.strictEqual(keys.length, 0);
    });

    it('should not include unrelated keys', () => {
      localStorage.setItem('other-key', 'value');
      localStorage.setItem('monopoly3d-hooks-special', 'value');

      const keys = persistence.listSavedKeys();
      assert.ok(!keys.includes('other-key'));
    });
  });

  describe('deleteSaved', () => {
    it('should delete a saved hook configuration', () => {
      persistence.saveHooks('to-delete');
      assert.ok(persistence.loadHooks('to-delete') !== null);

      const deleted = persistence.deleteSaved('to-delete');
      assert.strictEqual(deleted, true);
      assert.strictEqual(persistence.loadHooks('to-delete'), null);
    });

    it('should return true even if key does not exist', () => {
      const deleted = persistence.deleteSaved('non-existent');
      assert.strictEqual(deleted, true);
    });

    it('should not affect other saved keys', () => {
      persistence.saveHooks('monopoly3d-hooks-keep-1');
      persistence.saveHooks('monopoly3d-hooks-keep-2');
      persistence.saveHooks('monopoly3d-hooks-delete-me');

      persistence.deleteSaved('monopoly3d-hooks-delete-me');

      const keys = persistence.listSavedKeys();
      assert.ok(keys.includes('monopoly3d-hooks-keep-1'));
      assert.ok(keys.includes('monopoly3d-hooks-keep-2'));
      assert.ok(!keys.includes('monopoly3d-hooks-delete-me'));
    });
  });

  describe('enableAutoSave and disableAutoSave', () => {
    it('should enable auto-save with debounce', () => {
      persistence.enableAutoSave('auto-save-key', 500);
      assert.strictEqual(persistence._autoSaveEnabled, true);
      assert.strictEqual(persistence._autoSaveKey, 'auto-save-key');
      assert.strictEqual(persistence._autoSaveDebounceMs, 500);
    });

    it('should disable auto-save', () => {
      persistence.enableAutoSave();
      persistence.disableAutoSave();

      assert.strictEqual(persistence._autoSaveEnabled, false);
    });

    it('should replace existing auto-save when re-enabled', () => {
      persistence.enableAutoSave('key-1', 1000);
      persistence.enableAutoSave('key-2', 2000);

      assert.strictEqual(persistence._autoSaveKey, 'key-2');
      assert.strictEqual(persistence._autoSaveDebounceMs, 2000);
    });
  });

  describe('exportConfig and importConfig', () => {
    it('should export hook configuration as JSON', () => {
      hookRegistry.register('test_event', 'before', () => {}, 5);

      const exported = persistence.exportConfig();
      const parsed = JSON.parse(exported);

      assert.strictEqual(parsed.version, 1);
      assert.ok(parsed.timestamp > 0);
      assert.ok(parsed.hooks);
      assert.ok(parsed.hooks.test_event);
    });

    it('should import valid configuration', () => {
      const configStr = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        hooks: {
          property_purchase: {
            before: [{ priority: 10 }],
            after: [{ priority: 5 }],
          },
        },
      });

      const imported = persistence.importConfig(configStr);
      assert.strictEqual(imported, true);
      assert.ok(hookRegistry.hasHooks('property_purchase', 'before'));
      assert.ok(hookRegistry.hasHooks('property_purchase', 'after'));
    });

    it('should return false for invalid JSON', () => {
      const result = persistence.importConfig('not valid json');
      assert.strictEqual(result, false);
    });

    it('should return false for missing hooks property', () => {
      const result = persistence.importConfig('{"version": 1}');
      assert.strictEqual(result, false);
    });

    it('should clear existing hooks on import', () => {
      hookRegistry.register('existing_event', 'before', () => {}, 1);
      assert.ok(hookRegistry.hasHooks('existing_event', 'before'));

      const configStr = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        hooks: {},
      });

      persistence.importConfig(configStr);
      assert.ok(!hookRegistry.hasHooks('existing_event', 'before'));
    });
  });

  describe('mergeConfig', () => {
    it('should merge configuration with existing hooks', () => {
      hookRegistry.register('event1', 'before', () => {}, 1);

      const configStr = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        hooks: {
          event2: {
            before: [{ priority: 2 }],
          },
        },
      });

      const merged = persistence.mergeConfig(configStr);
      assert.strictEqual(merged, true);
      assert.ok(hookRegistry.hasHooks('event1', 'before'));
      assert.ok(hookRegistry.hasHooks('event2', 'before'));
    });

    it('should return false for invalid JSON', () => {
      const result = persistence.mergeConfig('invalid');
      assert.strictEqual(result, false);
    });

    it('should add hooks to same event on multiple merges', () => {
      const configStr1 = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        hooks: {
          same_event: { before: [{ priority: 1 }] },
        },
      });

      const configStr2 = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        hooks: {
          same_event: { before: [{ priority: 2 }] },
        },
      });

      persistence.mergeConfig(configStr1);
      persistence.mergeConfig(configStr2);

      const hooks = hookRegistry.getHooks('same_event');
      assert.strictEqual(hooks.before.length, 2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty hook registry', () => {
      const saved = persistence.saveHooks('empty-hooks');
      const loaded = persistence.loadHooks('empty-hooks');

      assert.strictEqual(saved, true);
      assert.ok(loaded !== null);
      assert.deepStrictEqual(loaded.hooks, {});
    });

    it('should handle corrupted JSON in localStorage', () => {
      localStorage.setItem('corrupted', '{ invalid json');

      const loaded = persistence.loadHooks('corrupted');
      assert.strictEqual(loaded, null);

      localStorage.removeItem('corrupted');
    });
  });
});