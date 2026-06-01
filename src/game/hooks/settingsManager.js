/**
 * Settings Manager - Manage game settings and preferences with localStorage persistence
 * 
 * Provides typed getters/setters for predefined settings with localStorage
 * backing and migration support for old settings format.
 */

/**
 * Default settings configuration
 */
const DEFAULT_SETTINGS = {
  debugMode: false,
  eventLogSize: 100,
  hookDebuggerEnabled: false,
  replayAutoSave: true,
  ruleEngineEnabled: true,
  soundEnabled: true,
  musicVolume: 0.7,
  language: 'zh',
};

/**
 * Settings schema - defines type and validation for each setting
 */
const SETTINGS_SCHEMA = {
  debugMode: { type: 'boolean', default: false },
  eventLogSize: { type: 'number', default: 100, min: 10, max: 1000 },
  hookDebuggerEnabled: { type: 'boolean', default: false },
  replayAutoSave: { type: 'boolean', default: true },
  ruleEngineEnabled: { type: 'boolean', default: true },
  soundEnabled: { type: 'boolean', default: true },
  musicVolume: { type: 'number', default: 0.7, min: 0, max: 1 },
  language: { type: 'string', default: 'zh', allowed: ['zh', 'en'] },
};

/**
 * SettingsManager class - manages game settings with localStorage persistence
 */
class SettingsManager {
  /**
   * Create a new SettingsManager instance
   * @param {string} storageKey - localStorage key (default: 'monopoly3d-settings')
   */
  constructor(storageKey = 'monopoly3d-settings') {
    this.storageKey = storageKey;
    this._settings = { ...DEFAULT_SETTINGS };
    this._load();
  }

  /**
   * Check if localStorage is available
   * @returns {boolean}
   */
  _hasLocalStorage() {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  }

  /**
   * Validate a setting value against schema
   * @param {string} key - Setting key
   * @param {*} value - Value to validate
   * @returns {*} Validated value
   */
  _validate(key, value) {
    const schema = SETTINGS_SCHEMA[key];
    if (!schema) {
      return value;
    }

    // Type validation
    if (schema.type === 'boolean') {
      // Only accept actual booleans, reject truthy/falsy strings
      if (typeof value === 'boolean') {
        return value;
      }
      return schema.default;
    }
    if (schema.type === 'number') {
      if (typeof value !== 'number') {
        return schema.default;
      }
      // Range validation
      if (schema.min !== undefined && value < schema.min) {
        return schema.min;
      }
      if (schema.max !== undefined && value > schema.max) {
        return schema.max;
      }
    }
    if (schema.type === 'string' && schema.allowed) {
      if (!schema.allowed.includes(value)) {
        return schema.default;
      }
    }

    return value;
  }

  /**
   * Load settings from localStorage
   * @private
   */
  _load() {
    if (!this._hasLocalStorage()) {
      return;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored);
      if (typeof parsed !== 'object' || parsed === null) {
        return;
      }

      // Apply stored settings with validation
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (parsed[key] !== undefined) {
          this._settings[key] = this._validate(key, parsed[key]);
        }
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  /**
   * Save settings to localStorage
   * @private
   */
  _save() {
    if (!this._hasLocalStorage()) {
      return;
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this._settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  /**
   * Get a setting value
   * @param {string} key - Setting key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Setting value
   */
  get(key, defaultValue) {
    if (key in this._settings) {
      return this._settings[key];
    }
    return defaultValue !== undefined ? defaultValue : DEFAULT_SETTINGS[key];
  }

  /**
   * Set a setting value
   * @param {string} key - Setting key
   * @param {*} value - Value to set
   * @returns {boolean} Success status
   */
  set(key, value) {
    const validated = this._validate(key, value);
    
    if (validated !== this._settings[key]) {
      this._settings[key] = validated;
      this._save();
      return true;
    }
    
    return false;
  }

  /**
   * Get all settings
   * @returns {object} All settings as object
   */
  getAll() {
    return { ...this._settings };
  }

  /**
   * Reset settings to defaults
   */
  reset() {
    this._settings = { ...DEFAULT_SETTINGS };
    this._save();
  }

  /**
   * Migrate settings from old format if needed
   * Handles migration of legacy settings keys to current format
   */
  migrateIfNeeded() {
    if (!this._hasLocalStorage()) {
      return;
    }

    try {
      // Check for legacy settings keys
      const legacyKeys = [
        'monopoly3d-debug',
        'monopoly3d-language',
        'monopoly3d-sound',
      ];

      let migrated = false;

      for (const legacyKey of legacyKeys) {
        const legacyValue = localStorage.getItem(legacyKey);
        if (legacyValue !== null) {
          // Map legacy keys to new format
          if (legacyKey === 'monopoly3d-debug') {
            this._settings.debugMode = legacyValue === 'true';
            migrated = true;
          } else if (legacyKey === 'monopoly3d-language') {
            this._settings.language = legacyValue === 'en' ? 'en' : 'zh';
            migrated = true;
          } else if (legacyKey === 'monopoly3d-sound') {
            this._settings.soundEnabled = legacyValue !== 'false';
            migrated = true;
          }
          // Remove legacy key
          localStorage.removeItem(legacyKey);
        }
      }

      if (migrated) {
        this._save();
      }
    } catch (e) {
      console.error('Failed to migrate settings:', e);
    }
  }
}

// Export singleton instance
export const settingsManager = new SettingsManager();

// Named export for use in store
export { SettingsManager, DEFAULT_SETTINGS, SETTINGS_SCHEMA };