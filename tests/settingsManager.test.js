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
  };
})();
global.localStorage = localStorageMock;

import { SettingsManager, DEFAULT_SETTINGS } from '../src/game/hooks/settingsManager.js';

describe('SettingsManager', () => {
  let settings;

  beforeEach(() => {
    localStorageMock.clear();
    settings = new SettingsManager('test-settings');
  });

  describe('constructor', () => {
    it('should create instance with default storage key', () => {
      const sm = new SettingsManager();
      assert.ok(sm instanceof SettingsManager);
    });

    it('should use custom storage key', () => {
      const sm = new SettingsManager('custom-key');
      assert.strictEqual(sm.storageKey, 'custom-key');
    });

    it('should initialize with default settings', () => {
      assert.strictEqual(settings.get('debugMode'), false);
      assert.strictEqual(settings.get('eventLogSize'), 100);
      assert.strictEqual(settings.get('language'), 'zh');
    });
  });

  describe('get and set', () => {
    it('should get setting value', () => {
      assert.strictEqual(settings.get('debugMode'), false);
      assert.strictEqual(settings.get('eventLogSize'), 100);
    });

    it('should get default value for unknown key', () => {
      assert.strictEqual(settings.get('unknown_key'), undefined);
      assert.strictEqual(settings.get('unknown_key', 'default'), 'default');
    });

    it('should set boolean values', () => {
      settings.set('debugMode', true);
      assert.strictEqual(settings.get('debugMode'), true);

      settings.set('soundEnabled', false);
      assert.strictEqual(settings.get('soundEnabled'), false);
    });

    it('should set numeric values', () => {
      settings.set('eventLogSize', 200);
      assert.strictEqual(settings.get('eventLogSize'), 200);
    });

    it('should set string values', () => {
      settings.set('language', 'en');
      assert.strictEqual(settings.get('language'), 'en');
    });

    it('should persist changes to localStorage', () => {
      settings.set('debugMode', true);

      const stored = JSON.parse(localStorage.getItem('test-settings'));
      assert.strictEqual(stored.debugMode, true);
    });

    it('should return false when setting value unchanged', () => {
      const result = settings.set('debugMode', false);
      assert.strictEqual(result, false);
    });
  });

  describe('getAll', () => {
    it('should return all settings as object', () => {
      const all = settings.getAll();
      assert.ok(typeof all === 'object');
      assert.strictEqual(all.debugMode, false);
      assert.strictEqual(all.eventLogSize, 100);
      assert.strictEqual(all.language, 'zh');
    });

    it('should return copy of settings', () => {
      const all1 = settings.getAll();
      const all2 = settings.getAll();
      assert.notStrictEqual(all1, all2);
    });
  });

  describe('reset', () => {
    it('should reset all settings to defaults', () => {
      settings.set('debugMode', true);
      settings.set('language', 'en');
      settings.set('eventLogSize', 500);

      settings.reset();

      assert.strictEqual(settings.get('debugMode'), false);
      assert.strictEqual(settings.get('language'), 'zh');
      assert.strictEqual(settings.get('eventLogSize'), 100);
    });

    it('should clear localStorage on reset', () => {
      settings.set('debugMode', true);
      settings.reset();

      const stored = localStorage.getItem('test-settings');
      const parsed = JSON.parse(stored);
      assert.strictEqual(parsed.debugMode, false);
    });
  });

  describe('validation', () => {
    it('should validate boolean settings', () => {
      settings.set('hookDebuggerEnabled', 'not a boolean');
      assert.strictEqual(settings.get('hookDebuggerEnabled'), false);

      settings.set('debugMode', true);
      assert.strictEqual(settings.get('debugMode'), true);

      settings.set('debugMode', 1);
      assert.strictEqual(settings.get('debugMode'), false);
    });

    it('should validate numeric settings with range', () => {
      settings.set('eventLogSize', 5);
      assert.strictEqual(settings.get('eventLogSize'), 10);

      settings.set('eventLogSize', 2000);
      assert.strictEqual(settings.get('eventLogSize'), 1000);
    });

    it('should validate string settings with allowed values', () => {
      settings.set('language', 'fr');
      assert.strictEqual(settings.get('language'), 'zh');

      settings.set('language', 'en');
      assert.strictEqual(settings.get('language'), 'en');
    });

    it('should validate musicVolume range', () => {
      settings.set('musicVolume', -0.5);
      assert.strictEqual(settings.get('musicVolume'), 0);

      settings.set('musicVolume', 1.5);
      assert.strictEqual(settings.get('musicVolume'), 1);

      settings.set('musicVolume', 0.5);
      assert.strictEqual(settings.get('musicVolume'), 0.5);
    });
  });

  describe('load from localStorage', () => {
    it('should load stored settings on initialization', () => {
      localStorage.setItem('test-settings', JSON.stringify({
        debugMode: true,
        language: 'en',
        eventLogSize: 200,
      }));

      const newSettings = new SettingsManager('test-settings');
      assert.strictEqual(newSettings.get('debugMode'), true);
      assert.strictEqual(newSettings.get('language'), 'en');
      assert.strictEqual(newSettings.get('eventLogSize'), 200);
    });

    it('should ignore invalid stored data', () => {
      localStorage.setItem('test-settings', 'not valid json');
      const newSettings = new SettingsManager('test-settings');

      assert.strictEqual(newSettings.get('debugMode'), false);
    });

    it('should ignore non-object stored data', () => {
      localStorage.setItem('test-settings', 'just a string');
      const newSettings = new SettingsManager('test-settings');

      assert.strictEqual(newSettings.get('debugMode'), false);
    });
  });

  describe('migrateIfNeeded', () => {
    it('should migrate legacy settings keys', () => {
      localStorage.setItem('monopoly3d-debug', 'true');
      localStorage.setItem('monopoly3d-language', 'en');
      localStorage.setItem('monopoly3d-sound', 'false');

      settings.migrateIfNeeded();

      assert.strictEqual(settings.get('debugMode'), true);
      assert.strictEqual(settings.get('language'), 'en');
      assert.strictEqual(settings.get('soundEnabled'), false);
    });

    it('should remove legacy keys after migration', () => {
      localStorage.setItem('monopoly3d-debug', 'true');

      settings.migrateIfNeeded();

      assert.strictEqual(localStorage.getItem('monopoly3d-debug'), null);
    });

    it('should not affect existing settings during migration', () => {
      settings.set('debugMode', true);
      localStorage.setItem('monopoly3d-language', 'en');

      settings.migrateIfNeeded();

      assert.strictEqual(settings.get('debugMode'), true);
    });
  });

  describe('edge cases', () => {
    it('should handle missing localStorage gracefully', () => {
      const originalLocalStorage = global.localStorage;
      global.localStorage = undefined;

      const sm = new SettingsManager('no-storage');
      sm.set('debugMode', true);
      assert.strictEqual(sm.get('debugMode'), true);

      global.localStorage = originalLocalStorage;
    });

    it('should handle localStorage getItem errors', () => {
      const badStorage = {
        getItem: () => { throw new Error('Storage error'); },
        setItem: () => {},
      };
      global.localStorage = badStorage;

      const sm = new SettingsManager('error-storage');
      assert.strictEqual(sm.get('debugMode'), false);

      global.localStorage = localStorageMock;
    });

    it('should handle localStorage setItem errors', () => {
      const badStorage = {
        getItem: () => null,
        setItem: () => { throw new Error('Storage error'); },
      };
      global.localStorage = badStorage;

      const sm = new SettingsManager('error-storage');
      // Should not throw
      sm.set('debugMode', true);

      global.localStorage = localStorageMock;
    });
  });

  describe('predefined settings', () => {
    it('should have all required settings defined', () => {
      const requiredSettings = [
        'debugMode',
        'eventLogSize',
        'hookDebuggerEnabled',
        'replayAutoSave',
        'ruleEngineEnabled',
        'soundEnabled',
        'musicVolume',
        'language',
      ];

      const all = settings.getAll();
      for (const key of requiredSettings) {
        assert.ok(key in all, `${key} should be defined`);
      }
    });

    it('should have correct default values', () => {
      assert.strictEqual(DEFAULT_SETTINGS.debugMode, false);
      assert.strictEqual(DEFAULT_SETTINGS.eventLogSize, 100);
      assert.strictEqual(DEFAULT_SETTINGS.hookDebuggerEnabled, false);
      assert.strictEqual(DEFAULT_SETTINGS.replayAutoSave, true);
      assert.strictEqual(DEFAULT_SETTINGS.ruleEngineEnabled, true);
      assert.strictEqual(DEFAULT_SETTINGS.soundEnabled, true);
      assert.strictEqual(DEFAULT_SETTINGS.musicVolume, 0.7);
      assert.strictEqual(DEFAULT_SETTINGS.language, 'zh');
    });
  });
});