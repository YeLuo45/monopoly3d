/**
 * EconomicCoordinationHub - Coordinate between different economic AI systems
 * 
 * Manages system registration, priority weighting, conflict detection
 * and resolution across trading, investment, and banking AI systems.
 */

export class EconomicCoordinationHub {
  constructor() {
    // Registered systems storage
    this.systems = new Map();

    // Priority weights for each system
    this.priorities = new Map();

    // Default priorities
    this.defaultPriorities = {
      trading: 1.0,
      investment: 1.0,
      banking: 0.9,
      financial: 0.8,
      risk: 1.0,
      tax: 0.7,
    };

    // Conflict resolution settings
    this.config = {
      conflictThreshold: 0.3, // Score difference threshold for conflict
      autoResolve: true,
      resolutionStrategy: 'priority', // 'priority' | 'value' | 'risk-adjusted'
    };
  }

  /**
   * Register an AI system with the hub
   * @param {string} systemName - Unique system identifier
   * @param {Object} system - System object with evaluate function
   * @param {number} system.weight - System weight (0-1)
   * @param {Function} system.evaluate - Evaluation function
   */
  registerSystem(systemName, system) {
    if (!systemName || typeof systemName !== 'string') {
      throw new Error('Invalid system name');
    }

    if (!system || typeof system.evaluate !== 'function') {
      throw new Error('System must have an evaluate function');
    }

    this.systems.set(systemName, {
      name: systemName,
      weight: system.weight || this.defaultPriorities[systemName] || 1.0,
      evaluate: system.evaluate,
      enabled: true,
      callCount: 0,
      lastCall: null,
    });

    // Set default priority if not already set
    if (!this.priorities.has(systemName)) {
      this.priorities.set(systemName, this.defaultPriorities[systemName] || 1.0);
    }
  }

  /**
   * Unregister a system
   * @param {string} systemName - System to remove
   */
  unregisterSystem(systemName) {
    this.systems.delete(systemName);
    this.priorities.delete(systemName);
  }

  /**
   * Check if a system is registered
   * @param {string} systemName - System to check
   * @returns {boolean}
   */
  hasSystem(systemName) {
    return this.systems.has(systemName);
  }

  /**
   * Enable or disable a system
   * @param {string} systemName - System to toggle
   * @param {boolean} enabled - Enable/disable state
   */
  setSystemEnabled(systemName, enabled) {
    const system = this.systems.get(systemName);
    if (system) {
      system.enabled = enabled;
    }
  }

  /**
   * Query all registered systems for recommendations
   * @param {Object} context - Query context { playerId, situation }
   * @param {Object} gameState - Current game state
   * @returns {Object} Map of systemName -> recommendation
   */
  querySystems(context, gameState) {
    const results = {};

    for (const [name, system] of this.systems) {
      if (!system.enabled) continue;

      try {
        const startTime = Date.now();
        const result = system.evaluate(context, gameState);
        const duration = Date.now() - startTime;

        if (result) {
          results[name] = {
            ...result,
            weight: system.weight,
            priority: this.priorities.get(name) || 1.0,
            duration,
          };
        }

        system.callCount++;
        system.lastCall = Date.now();
      } catch (error) {
        console.error(`System ${name} evaluation failed:`, error.message);
        results[name] = {
          system: name,
          error: true,
          message: error.message,
        };
      }
    }

    return results;
  }

  /**
   * Set priority for a specific system
   * @param {string} systemName - System to adjust
   * @param {number} priority - Priority value (0-1)
   */
  setSystemPriority(systemName, priority) {
    if (!this.systems.has(systemName)) {
      throw new Error(`System ${systemName} not registered`);
    }

    const clampedPriority = Math.max(0, Math.min(1, priority));
    this.priorities.set(systemName, clampedPriority);

    // Update system weight
    const system = this.systems.get(systemName);
    system.weight = clampedPriority;
  }

  /**
   * Get current priority for a system
   * @param {string} systemName - System to query
   * @returns {number} Priority value
   */
  getSystemPriority(systemName) {
    return this.priorities.get(systemName) ?? this.defaultPriorities[systemName] ?? 1.0;
  }

  /**
   * Get all system priorities
   * @returns {Object} Map of systemName -> priority
   */
  getAllPriorities() {
    const result = {};
    for (const [name, priority] of this.priorities) {
      result[name] = priority;
    }
    return result;
  }

  /**
   * Detect conflicts between system recommendations
   * @param {Object} recommendations - Map of systemName -> recommendation
   * @returns {Array} Array of detected conflicts
   */
  detectConflicts(recommendations) {
    const conflicts = [];
    const entries = Object.entries(recommendations).filter(([_, r]) => r && !r.error);

    // Check for opposing recommendations
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [nameA, recA] = entries[i];
        const [nameB, recB] = entries[j];

        // Check if recommendations are opposing
        if (this._areConflicting(recA, recB)) {
          conflicts.push({
            systems: [nameA, nameB],
            recommendations: [recA, recB],
            type: this._getConflictType(recA, recB),
            severity: this._calculateConflictSeverity(recA, recB),
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two recommendations are conflicting
   * @private
   */
  _areConflicting(recA, recB) {
    if (!recA.recommendation || !recB.recommendation) return false;

    const recAVal = recA.recommendation.toLowerCase();
    const recBVal = recB.recommendation.toLowerCase();

    // Direct opposition
    const opposing = [
      ['buy', 'sell'],
      ['accept', 'reject'],
      ['invest', 'divest'],
      ['take_loan', 'pay_debt'],
    ];

    for (const [valA, valB] of opposing) {
      if ((recAVal === valA && recBVal === valB) ||
          (recAVal === valB && recBVal === valA)) {
        return true;
      }
    }

    // Score-based conflict
    const scoreA = recA.score || 50;
    const scoreB = recB.score || 50;
    const diff = Math.abs(scoreA - scoreB);
    return diff > this.config.conflictThreshold * 100;
  }

  /**
   * Get the type of conflict
   * @private
   */
  _getConflictType(recA, recB) {
    if (!recA.recommendation || !recB.recommendation) return 'unknown';

    const recAVal = recA.recommendation.toLowerCase();
    const recBVal = recB.recommendation.toLowerCase();

    if ((recAVal === 'buy' && recBVal === 'sell') ||
        (recAVal === 'sell' && recBVal === 'buy')) {
      return 'buy_sell';
    }
    if ((recAVal === 'accept' && recBVal === 'reject') ||
        (recAVal === 'reject' && recBVal === 'accept')) {
      return 'accept_reject';
    }
    if ((recAVal === 'take_loan' && recBVal === 'pay_debt') ||
        (recAVal === 'pay_debt' && recBVal === 'take_loan')) {
      return 'cash_flow';
    }

    return 'score_difference';
  }

  /**
   * Calculate conflict severity
   * @private
   */
  _calculateConflictSeverity(recA, recB) {
    const scoreA = recA.score || 50;
    const scoreB = recB.score || 50;
    const scoreDiff = Math.abs(scoreA - scoreB);

    if (scoreDiff > 50) return 'high';
    if (scoreDiff > 30) return 'medium';
    return 'low';
  }

  /**
   * Resolve conflicts using configured strategy
   * @param {Array} conflicts - Array of conflicts to resolve
   * @param {Object} gameState - Current game state
   * @returns {Array} Resolved actions
   */
  resolveConflicts(conflicts, gameState) {
    const resolved = [];

    for (const conflict of conflicts) {
      const resolution = this._resolveSingleConflict(conflict, gameState);
      resolved.push(resolution);
    }

    return resolved;
  }

  /**
   * Resolve a single conflict
   * @private
   */
  _resolveSingleConflict(conflict, gameState) {
    const { systems, recommendations, type } = conflict;
    const priorityA = this.getSystemPriority(systems[0]);
    const priorityB = this.getSystemPriority(systems[1]);

    // Strategy: priority-based
    if (this.config.resolutionStrategy === 'priority') {
      if (priorityA > priorityB) {
        return { winner: systems[0], recommendation: recommendations[0], conflict };
      } else if (priorityB > priorityA) {
        return { winner: systems[1], recommendation: recommendations[1], conflict };
      }
    }

    // Strategy: value-based (higher score wins)
    if (this.config.resolutionStrategy === 'value') {
      const scoreA = recommendations[0].score || 0;
      const scoreB = recommendations[1].score || 0;
      return scoreA >= scoreB
        ? { winner: systems[0], recommendation: recommendations[0], conflict }
        : { winner: systems[1], recommendation: recommendations[1], conflict };
    }

    // Strategy: risk-adjusted (prefer lower risk when scores are close)
    if (this.config.resolutionStrategy === 'risk-adjusted') {
      const scoreA = recommendations[0].score || 50;
      const scoreB = recommendations[1].score || 50;
      const riskA = recommendations[0].risk || 'medium';
      const riskB = recommendations[1].risk || 'medium';

      const riskPenalty = { high: 15, medium: 5, low: 0 };
      const adjustedA = scoreA - (riskPenalty[riskA] || 5);
      const adjustedB = scoreB - (riskPenalty[riskB] || 5);

      return adjustedA >= adjustedB
        ? { winner: systems[0], recommendation: recommendations[0], conflict }
        : { winner: systems[1], recommendation: recommendations[1], conflict };
    }

    // Default: first system wins
    return { winner: systems[0], recommendation: recommendations[0], conflict };
  }

  /**
   * Get system statistics
   * @returns {Object} System usage statistics
   */
  getSystemStats() {
    const stats = {};
    for (const [name, system] of this.systems) {
      stats[name] = {
        enabled: system.enabled,
        weight: system.weight,
        priority: this.priorities.get(name),
        callCount: system.callCount,
        lastCall: system.lastCall,
      };
    }
    return stats;
  }

  /**
   * Reset all statistics
   */
  resetStats() {
    for (const system of this.systems.values()) {
      system.callCount = 0;
      system.lastCall = null;
    }
  }

  /**
   * Get list of registered system names
   * @returns {Array} Array of system names
   */
  getSystemNames() {
    return Array.from(this.systems.keys());
  }
}
