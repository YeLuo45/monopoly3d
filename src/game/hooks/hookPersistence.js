/**
 * Hook Persistence - Save/load hook configurations to localStorage
 * 
 * Provides functionality to persist hookRegistry configurations and
 * event rules, with support for auto-save, export/import as JSON.
 */

import { HookRegistry } from './hookRegistry.js';

/**
 * HookPersistence class - manages persistence of hook configurations
 */
class HookPersistence {
  /**
   * Create a new HookPersistence instance
   * @param {HookRegistry} hookRegistry - The hook registry to persist
   * @param {EventBus} eventBus - The event bus for event subscriptions
   */
  constructor(hookRegistry, eventBus) {
    this.hookRegistry = hookRegistry;
    this.eventBus = eventBus;
    this._autoSaveEnabled = false;
    this._autoSaveKey = 'monopoly3d-hooks';
    this._autoSaveDebounceMs = 1000;
    this._debounceTimer = null;
    this._saveSubscription = null;
  }

  /**
   * Check if localStorage is available
   * @returns {boolean}
   */
  _hasLocalStorage() {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  }

  /**
   * Serialize hook configuration for storage
   * @param {object} hooksConfig - The hooks configuration object
   * @returns {string} JSON string
   */
  _serializeConfig(hooksConfig) {
    return JSON.stringify({
      version: 1,
      timestamp: Date.now(),
      hooks: hooksConfig,
    });
  }

  /**
   * Deserialize hook configuration from storage
   * @param {string} jsonStr - JSON string to parse
   * @returns {object|null} Parsed config or null if invalid
   */
  _deserializeConfig(jsonStr) {
    try {
      const config = JSON.parse(jsonStr);
      if (!config || !config.hooks) {
        return null;
      }
      return config;
    } catch (e) {
      return null;
    }
  }

  /**
   * Extract serializable hook configuration from hookRegistry
   * @returns {object} Hooks configuration object
   */
  _extractHookConfig() {
    const config = {};
    
    // Get all events that have registered hooks from the hookRegistry
    const hookData = this.hookRegistry._hooks;
    if (!hookData) {
      return config;
    }

    for (const [event, hooks] of Object.entries(hookData)) {
      const hasHooks = hooks.before?.length > 0 || 
                       hooks.after?.length > 0 || 
                       hooks.insteadOf?.length > 0;
      
      if (hasHooks) {
        config[event] = {
          before: (hooks.before || []).map(h => ({ priority: h.priority })),
          after: (hooks.after || []).map(h => ({ priority: h.priority })),
          insteadOf: (hooks.insteadOf || []).map(h => ({ priority: h.priority })),
        };
      }
    }

    return config;
  }

  /**
   * Save hook configurations to localStorage
   * @param {string} key - Storage key (default: 'monopoly3d-hooks')
   * @returns {boolean} Success status
   */
  saveHooks(key = 'monopoly3d-hooks') {
    if (!this._hasLocalStorage()) {
      console.warn('localStorage not available');
      return false;
    }

    try {
      const config = this._extractHookConfig();
      const serialized = this._serializeConfig(config);
      localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      console.error('Failed to save hooks:', e);
      return false;
    }
  }

  /**
   * Load hook configurations from localStorage
   * @param {string} key - Storage key (default: 'monopoly3d-hooks')
   * @returns {object|null} Loaded configuration or null if not found
   */
  loadHooks(key = 'monopoly3d-hooks') {
    if (!this._hasLocalStorage()) {
      console.warn('localStorage not available');
      return null;
    }

    try {
      const data = localStorage.getItem(key);
      if (!data) {
        return null;
      }
      return this._deserializeConfig(data);
    } catch (e) {
      console.error('Failed to load hooks:', e);
      return null;
    }
  }

  /**
   * List all saved hook configuration keys
   * @returns {string[]} Array of storage keys
   */
  listSavedKeys() {
    if (!this._hasLocalStorage()) {
      return [];
    }

    const keys = [];
    const prefix = 'monopoly3d-hooks';
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }
    } catch (e) {
      console.error('Failed to list saved keys:', e);
    }

    return keys;
  }

  /**
   * Delete a saved hook configuration
   * @param {string} key - Storage key to delete
   * @returns {boolean} Success status
   */
  deleteSaved(key) {
    if (!this._hasLocalStorage()) {
      console.warn('localStorage not available');
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Failed to delete saved hooks:', e);
      return false;
    }
  }

  /**
   * Enable auto-save on hook changes
   * @param {string} key - Storage key (default: 'monopoly3d-hooks')
   * @param {number} debounceMs - Debounce delay in ms (default: 1000)
   */
  enableAutoSave(key = 'monopoly3d-hooks', debounceMs = 1000) {
    if (this._autoSaveEnabled) {
      this.disableAutoSave();
    }

    this._autoSaveKey = key;
    this._autoSaveDebounceMs = debounceMs;
    this._autoSaveEnabled = true;

    // Subscribe to relevant events to trigger saves
    this._saveSubscription = this.eventBus.subscribe('hook_changed', () => {
      this._triggerAutoSave();
    });
  }

  /**
   * Trigger auto-save with debouncing
   * @private
   */
  _triggerAutoSave() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    this._debounceTimer = setTimeout(() => {
      this.saveHooks(this._autoSaveKey);
    }, this._autoSaveDebounceMs);
  }

  /**
   * Disable auto-save
   */
  disableAutoSave() {
    this._autoSaveEnabled = false;
    
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }

    if (this._saveSubscription) {
      this._saveSubscription();
      this._saveSubscription = null;
    }
  }

  /**
   * Export full hook configuration as JSON string
   * @returns {string} JSON configuration
   */
  exportConfig() {
    const config = this._extractHookConfig();
    return JSON.stringify({
      version: 1,
      timestamp: Date.now(),
      hooks: config,
    }, null, 2);
  }

  /**
   * Import hook configuration from JSON string
   * Note: This replaces existing hooks, use mergeConfig to add to existing
   * @param {string} jsonStr - JSON string to import
   * @returns {boolean} Success status
   */
  importConfig(jsonStr) {
    try {
      const config = JSON.parse(jsonStr);
      if (!config || !config.hooks) {
        console.error('Invalid configuration format');
        return false;
      }

      // Clear existing hooks
      this.hookRegistry.clear();

      // Re-register hooks from config
      for (const [event, hooks] of Object.entries(config.hooks)) {
        if (hooks.before) {
          hooks.before.forEach((hookConfig, index) => {
            this.hookRegistry.register(event, 'before', () => {}, hookConfig.priority || 0);
          });
        }
        if (hooks.after) {
          hooks.after.forEach((hookConfig, index) => {
            this.hookRegistry.register(event, 'after', () => {}, hookConfig.priority || 0);
          });
        }
        if (hooks.insteadOf) {
          hooks.insteadOf.forEach((hookConfig, index) => {
            this.hookRegistry.register(event, 'insteadOf', () => {}, hookConfig.priority || 0);
          });
        }
      }

      return true;
    } catch (e) {
      console.error('Failed to import config:', e);
      return false;
    }
  }

  /**
   * Merge hook configuration with existing hooks
   * @param {string} jsonStr - JSON string to merge
   * @returns {boolean} Success status
   */
  mergeConfig(jsonStr) {
    try {
      const config = JSON.parse(jsonStr);
      if (!config || !config.hooks) {
        console.error('Invalid configuration format');
        return false;
      }

      // Add hooks from config without clearing existing
      for (const [event, hooks] of Object.entries(config.hooks)) {
        if (hooks.before) {
          hooks.before.forEach((hookConfig, index) => {
            this.hookRegistry.register(event, 'before', () => {}, hookConfig.priority || 0);
          });
        }
        if (hooks.after) {
          hooks.after.forEach((hookConfig, index) => {
            this.hookRegistry.register(event, 'after', () => {}, hookConfig.priority || 0);
          });
        }
        if (hooks.insteadOf) {
          hooks.insteadOf.forEach((hookConfig, index) => {
            this.hookRegistry.register(event, 'insteadOf', () => {}, hookConfig.priority || 0);
          });
        }
      }

      return true;
    } catch (e) {
      console.error('Failed to merge config:', e);
      return false;
    }
  }
}

// Export singleton instance
export const hookPersistence = new HookPersistence(
  typeof hookRegistry !== 'undefined' ? hookRegistry : new HookRegistry(),
  typeof eventBus !== 'undefined' ? eventBus : null
);

// Named export for use in store
export { HookPersistence };