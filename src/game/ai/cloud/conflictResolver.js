/**
 * ConflictResolver - Data Conflict Resolution System
 * 
 * Provides various strategies for resolving data conflicts
 * between local and remote data sources.
 */

import { EventEmitter } from 'events';

const ResolutionStrategy = {
  LOCAL_WINS: 'local',
  REMOTE_WINS: 'remote',
  LATEST_WINS: 'latest',
  MERGE: 'merge',
  MANUAL: 'manual',
  CUSTOM: 'custom'
};

const ConflictType = {
  VERSION_MISMATCH: 'version_mismatch',
  DATA_MISMATCH: 'data_mismatch',
  DELETED_IN_REMOTE: 'deleted_in_remote',
  DELETED_IN_LOCAL: 'deleted_in_local',
  CONCURRENT_EDIT: 'concurrent_edit'
};

class ConflictResolver extends EventEmitter {
  /**
   * Create a new ConflictResolver
   */
  constructor() {
    super();
    this.customStrategies = new Map(); // name -> strategy function
    this.resolutionHistory = []; // Track resolution history
    this.maxHistorySize = 100;
  }

  /**
   * Resolve conflict using specified strategy
   * @param {Object} primary - Primary data (usually local)
   * @param {Object} secondary - Secondary data (usually remote)
   * @param {string} strategy - Resolution strategy
   * @returns {Object} Resolved data
   */
  resolve(primary, secondary, strategy) {
    if (!primary && !secondary) {
      throw new Error('At least one data source must be provided');
    }

    const conflictType = this._detectConflictType(primary, secondary);
    this.emit('conflict:detected', { conflictType, strategy });

    let resolved;
    switch (strategy) {
      case ResolutionStrategy.LOCAL_WINS:
        resolved = this._localWins(primary, secondary);
        break;
      case ResolutionStrategy.REMOTE_WINS:
        resolved = this._remoteWins(primary, secondary);
        break;
      case ResolutionStrategy.LATEST_WINS:
        resolved = this._latestWins(primary, secondary);
        break;
      case ResolutionStrategy.MERGE:
        resolved = this._merge(primary, secondary);
        break;
      case ResolutionStrategy.MANUAL:
        resolved = null; // Requires manual resolution
        break;
      case ResolutionStrategy.CUSTOM:
        resolved = this._applyCustomStrategy(primary, secondary);
        break;
      default:
        resolved = this._latestWins(primary, secondary);
    }

    if (resolved !== null) {
      this._recordResolution(primary, secondary, resolved, strategy, conflictType);
    }

    this.emit('conflict:resolved', { strategy, conflictType, resolved });
    return resolved;
  }

  /**
   * Auto-resolve conflict using best available strategy
   * @param {Object} primary - Primary data
   * @param {Object} secondary - Secondary data
   * @returns {Object} Resolved data
   */
  autoResolve(primary, secondary) {
    const conflictType = this._detectConflictType(primary, secondary);
    let strategy;

    switch (conflictType) {
      case ConflictType.DELETED_IN_REMOTE:
        strategy = ResolutionStrategy.LOCAL_WINS;
        break;
      case ConflictType.DELETED_IN_LOCAL:
        strategy = ResolutionStrategy.REMOTE_WINS;
        break;
      case ConflictType.VERSION_MISMATCH:
        strategy = ResolutionStrategy.LATEST_WINS;
        break;
      case ConflictType.CONCURRENT_EDIT:
        strategy = ResolutionStrategy.MERGE;
        break;
      default:
        strategy = ResolutionStrategy.LATEST_WINS;
    }

    return this.resolve(primary, secondary, strategy);
  }

  /**
   * Get list of available resolution strategies
   * @returns {Array} Available strategies
   */
  getAvailableStrategies() {
    return [
      {
        name: ResolutionStrategy.LOCAL_WINS,
        description: 'Keep local version and discard remote changes',
        type: 'single-source'
      },
      {
        name: ResolutionStrategy.REMOTE_WINS,
        description: 'Keep remote version and discard local changes',
        type: 'single-source'
      },
      {
        name: ResolutionStrategy.LATEST_WINS,
        description: 'Keep the most recently modified version',
        type: 'timestamp-based'
      },
      {
        name: ResolutionStrategy.MERGE,
        description: 'Merge both versions, keeping non-conflicting changes',
        type: 'merge'
      },
      {
        name: ResolutionStrategy.MANUAL,
        description: 'Requires manual resolution',
        type: 'interactive'
      }
    ];
  }

  /**
   * Register a custom resolution strategy
   * @param {string} name - Strategy name
   * @param {Function} strategyFn - Strategy function (primary, secondary) => resolved
   */
  registerCustomStrategy(name, strategyFn) {
    if (typeof strategyFn !== 'function') {
      throw new Error('Strategy function must be a function');
    }
    this.customStrategies.set(name, strategyFn);
    this.emit('strategy:registered', { name });
  }

  /**
   * Get registered custom strategies
   * @returns {Array} Custom strategy names
   */
  getCustomStrategies() {
    return Array.from(this.customStrategies.keys());
  }

  /**
   * Detect type of conflict
   * @param {Object} primary - Primary data
   * @param {Object} secondary - Secondary data
   * @returns {string} Conflict type
   */
  _detectConflictType(primary, secondary) {
    // Check for deletion conflicts
    if (primary && !secondary) return ConflictType.DELETED_IN_REMOTE;
    if (!primary && secondary) return ConflictType.DELETED_IN_LOCAL;

    // Check for version mismatch
    if (primary.version !== secondary.version) return ConflictType.VERSION_MISMATCH;

    // Check for data content mismatch
    if (JSON.stringify(primary) !== JSON.stringify(secondary)) {
      return ConflictType.CONCURRENT_EDIT;
    }

    return ConflictType.DATA_MISMATCH;
  }

  /**
   * Local wins strategy - prefer primary data
   * @private
   */
  _localWins(primary, secondary) {
    const data = primary || secondary;
    return {
      ...data,
      _resolution: {
        strategy: ResolutionStrategy.LOCAL_WINS,
        resolvedAt: new Date().toISOString(),
        source: primary ? 'local' : 'remote'
      }
    };
  }

  /**
   * Remote wins strategy - prefer secondary data
   * @private
   */
  _remoteWins(primary, secondary) {
    const data = secondary || primary;
    return {
      ...data,
      _resolution: {
        strategy: ResolutionStrategy.REMOTE_WINS,
        resolvedAt: new Date().toISOString(),
        source: secondary ? 'remote' : 'local'
      }
    };
  }

  /**
   * Latest wins strategy - prefer most recent data
   * @private
   */
  _latestWins(primary, secondary) {
    if (!primary) return this._remoteWins(primary, secondary);
    if (!secondary) return this._localWins(primary, secondary);

    const primaryTime = primary?.updatedAt || primary?.timestamp || 0;
    const secondaryTime = secondary?.updatedAt || secondary?.timestamp || 0;

    const winner = primaryTime >= secondaryTime ? primary : secondary;
    return {
      ...winner,
      _resolution: {
        strategy: ResolutionStrategy.LATEST_WINS,
        resolvedAt: new Date().toISOString(),
        source: primaryTime >= secondaryTime ? 'local' : 'remote'
      }
    };
  }

  /**
   * Merge strategy - combine both versions
   * @private
   */
  _merge(primary, secondary) {
    const merged = this._deepMerge(primary, secondary);
    return {
      ...merged,
      _resolution: {
        strategy: ResolutionStrategy.MERGE,
        resolvedAt: new Date().toISOString(),
        source: 'merged'
      }
    };
  }

  /**
   * Deep merge two objects
   * @private
   */
  _deepMerge(primary, secondary) {
    if (!primary || typeof primary !== 'object') return secondary;
    if (!secondary || typeof secondary !== 'object') return primary;

    const result = { ...primary };

    for (const key of Object.keys(secondary)) {
      if (result[key] === undefined) {
        result[key] = secondary[key];
      } else if (typeof result[key] === 'object' && typeof secondary[key] === 'object') {
        result[key] = this._deepMerge(result[key], secondary[key]);
      } else if (result[key] !== secondary[key]) {
        // Conflicting primitive values - use secondary (remote) as fallback
        result[key] = secondary[key];
      }
    }

    return result;
  }

  /**
   * Apply custom strategy
   * @private
   */
  _applyCustomStrategy(primary, secondary) {
    const customStrategy = this.customStrategies.get(ResolutionStrategy.CUSTOM);
    if (customStrategy) {
      return customStrategy(primary, secondary);
    }
    throw new Error('No custom strategy registered');
  }

  /**
   * Record resolution for history
   * @private
   */
  _recordResolution(primary, secondary, resolved, strategy, conflictType) {
    this.resolutionHistory.push({
      primaryId: primary?.id,
      secondaryId: secondary?.id,
      strategy,
      conflictType,
      resolvedAt: Date.now()
    });

    // Trim history if needed
    if (this.resolutionHistory.length > this.maxHistorySize) {
      this.resolutionHistory.shift();
    }
  }

  /**
   * Get resolution history
   * @param {number} limit - Max number of records
   * @returns {Array} Resolution history
   */
  getResolutionHistory(limit = 50) {
    return this.resolutionHistory.slice(-limit).reverse();
  }

  /**
   * Compare two data objects and return differences
   * @param {Object} primary - Primary data
   * @param {Object} secondary - Secondary data
   * @returns {Object} Differences
   */
  compareData(primary, secondary) {
    const differences = {
      added: [],
      removed: [],
      changed: []
    };

    const allKeys = new Set([
      ...Object.keys(primary || {}),
      ...Object.keys(secondary || {})
    ]);

    for (const key of allKeys) {
      const inPrimary = key in (primary || {});
      const inSecondary = key in (secondary || {});

      if (inPrimary && !inSecondary) {
        differences.removed.push(key);
      } else if (!inPrimary && inSecondary) {
        differences.added.push(key);
      } else if (JSON.stringify(primary[key]) !== JSON.stringify(secondary[key])) {
        differences.changed.push(key);
      }
    }

    return differences;
  }

  /**
   * Validate resolved data
   * @param {Object} resolved - Resolved data
   * @param {Object} schema - Optional schema to validate against
   * @returns {boolean} Is valid
   */
  validateResolved(resolved, schema = null) {
    if (!resolved || typeof resolved !== 'object') return false;
    if (schema) {
      // Basic schema validation
      for (const key of Object.keys(schema)) {
        if (schema[key].required && !(key in resolved)) {
          return false;
        }
      }
    }
    return true;
  }
}

export { ConflictResolver, ResolutionStrategy, ConflictType };