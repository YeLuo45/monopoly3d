/**
 * BlackboardStore - Shared Knowledge Repository
 * 
 * A central store for agent knowledge sharing using the Blackboard Pattern.
 * Provides read/write access to shared knowledge with history tracking.
 */

class BlackboardStore {
  constructor() {
    // Main knowledge storage: key -> { value, metadata }
    this.store = new Map();
    
    // History of changes per key: key -> [{ value, sourceAgent, timestamp }]
    this.history = new Map();
    
    // Contributors tracking: key -> Set<agentId>
    this.contributors = new Map();
    
    // Global history log (all changes)
    this.globalHistory = [];
    
    // Configuration
    this.maxHistoryPerKey = 100;
    this.maxGlobalHistory = 1000;
  }

  /**
   * Write a value to the blackboard
   * @param {string} key - The knowledge key
   * @param {*} value - The value to store
   * @param {string} sourceAgent - The agent contributing this knowledge
   * @returns {Object} The written entry with metadata
   */
  write(key, value, sourceAgent) {
    const timestamp = Date.now();
    
    // Get existing contributors or create new set
    if (!this.contributors.has(key)) {
      this.contributors.set(key, new Set());
    }
    this.contributors.get(key).add(sourceAgent);
    
    // Store previous value for history
    const previousValue = this.store.has(key) ? this.store.get(key).value : null;
    
    // Create entry with metadata
    const entry = {
      key,
      value,
      sourceAgent,
      timestamp,
      previousValue,
      version: this._getNextVersion(key)
    };
    
    // Write to store
    this.store.set(key, {
      value,
      sourceAgent,
      timestamp,
      version: entry.version
    });
    
    // Add to history
    this._addToHistory(key, entry);
    
    // Add to global history
    this._addToGlobalHistory({
      action: 'write',
      key,
      value,
      sourceAgent,
      timestamp,
      previousValue
    });
    
    return entry;
  }

  /**
   * Partial update to an existing value
   * @param {string} key - The knowledge key
   * @param {Object} partial - Partial object to merge with existing value
   * @param {string} sourceAgent - The agent contributing this update
   * @returns {Object} The updated entry with metadata
   */
  update(key, partial, sourceAgent) {
    const timestamp = Date.now();
    
    if (!this.store.has(key)) {
      // If key doesn't exist, treat as write
      return this.write(key, partial, sourceAgent);
    }
    
    // Get existing value
    const existing = this.store.get(key);
    const previousValue = existing.value;
    
    // Merge partial update
    let newValue;
    if (typeof previousValue === 'object' && previousValue !== null &&
        typeof partial === 'object' && partial !== null) {
      newValue = { ...previousValue, ...partial };
    } else {
      newValue = partial;
    }
    
    // Update contributors
    if (!this.contributors.has(key)) {
      this.contributors.set(key, new Set());
    }
    this.contributors.get(key).add(sourceAgent);
    
    // Create entry
    const entry = {
      key,
      value: newValue,
      sourceAgent,
      timestamp,
      previousValue,
      version: this._getNextVersion(key) || 1
    };
    
    // Update store
    this.store.set(key, {
      value: newValue,
      sourceAgent,
      timestamp,
      version: entry.version
    });
    
    // Add to history
    this._addToHistory(key, entry);
    
    // Add to global history
    this._addToGlobalHistory({
      action: 'update',
      key,
      value: newValue,
      sourceAgent,
      timestamp,
      previousValue,
      partial
    });
    
    return entry;
  }

  /**
   * Read a value from the blackboard
   * @param {string} key - The knowledge key
   * @param {*} defaultValue - Default value if key not found
   * @returns {*} The stored value or default
   */
  read(key, defaultValue = undefined) {
    if (!this.store.has(key)) {
      return defaultValue;
    }
    return this.store.get(key).value;
  }

  /**
   * Read all entries matching a pattern
   * @param {string|RegExp} pattern - Pattern to match keys
   * @returns {Object[]} Array of matching entries
   */
  readAll(pattern) {
    const results = [];
    const regex = this._patternToRegex(pattern);
    
    for (const [key, entry] of this.store) {
      if (regex.test(key)) {
        results.push({
          key,
          ...entry
        });
      }
    }
    
    return results;
  }

  /**
   * Get history of changes for a key
   * @param {string} key - The knowledge key
   * @param {number} limit - Maximum number of history entries
   * @returns {Object[]} History entries
   */
  getHistory(key, limit = null) {
    const keyHistory = this.history.get(key) || [];
    if (limit !== null) {
      return keyHistory.slice(-limit);
    }
    return [...keyHistory];
  }

  /**
   * Get all agents who contributed to a key
   * @param {string} key - The knowledge key
   * @returns {string[]} Array of agent IDs
   */
  getContributors(key) {
    const contributorSet = this.contributors.get(key);
    if (!contributorSet) {
      return [];
    }
    return [...contributorSet];
  }

  /**
   * Check if a key exists
   * @param {string} key - The knowledge key
   * @returns {boolean}
   */
  has(key) {
    return this.store.has(key);
  }

  /**
   * Delete a key from the blackboard
   * @param {string} key - The knowledge key
   * @param {string} sourceAgent - The agent deleting
   * @returns {boolean} Whether deletion succeeded
   */
  delete(key, sourceAgent) {
    if (!this.store.has(key)) {
      return false;
    }
    
    const deleted = this.store.get(key);
    this.store.delete(key);
    
    // Add deletion to history
    this._addToGlobalHistory({
      action: 'delete',
      key,
      value: deleted.value,
      sourceAgent,
      timestamp: Date.now()
    });
    
    return true;
  }

  /**
   * Clear all data (use with caution)
   */
  clear() {
    this.store.clear();
    this.history.clear();
    this.contributors.clear();
    this.globalHistory = [];
  }

  /**
   * Get all keys
   * @returns {string[]} All keys in the store
   */
  keys() {
    return [...this.store.keys()];
  }

  /**
   * Get metadata for a key
   * @param {string} key - The knowledge key
   * @returns {Object|null} Metadata or null if not found
   */
  getMetadata(key) {
    if (!this.store.has(key)) {
      return null;
    }
    const entry = this.store.get(key);
    return {
      key,
      sourceAgent: entry.sourceAgent,
      timestamp: entry.timestamp,
      version: entry.version
    };
  }

  /**
   * Get global history
   * @param {number} limit - Maximum entries to return
   * @returns {Object[]} Global history entries
   */
  getGlobalHistory(limit = null) {
    if (limit !== null) {
      return this.globalHistory.slice(-limit);
    }
    return [...this.globalHistory];
  }

  // Private helper methods

  _getNextVersion(key) {
    const keyHistory = this.history.get(key);
    if (!keyHistory || keyHistory.length === 0) {
      return 1;
    }
    return keyHistory[keyHistory.length - 1].version + 1;
  }

  _addToHistory(key, entry) {
    if (!this.history.has(key)) {
      this.history.set(key, []);
    }
    
    const keyHistory = this.history.get(key);
    keyHistory.push({
      value: entry.value,
      sourceAgent: entry.sourceAgent,
      timestamp: entry.timestamp,
      version: entry.version
    });
    
    // Trim history if needed
    if (keyHistory.length > this.maxHistoryPerKey) {
      keyHistory.shift();
    }
  }

  _addToGlobalHistory(entry) {
    this.globalHistory.push(entry);
    
    // Trim global history if needed
    if (this.globalHistory.length > this.maxGlobalHistory) {
      this.globalHistory.shift();
    }
  }

  _patternToRegex(pattern) {
    if (pattern instanceof RegExp) {
      return pattern;
    }
    // Convert glob-like pattern to regex
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`);
  }
}

export { BlackboardStore };