/**
 * L3_LongTermMemory - Cross-session persistent strategy storage
 * 
 * Stores learned strategies across sessions, tracking outcomes
 * and evolving strategies based on performance.
 */

export class L3_LongTermMemory {
  constructor(storageKey = 'monopoly3d-l3') {
    this.storageKey = storageKey;
    this.strategies = new Map(); // strategyId -> strategy
    this.nextId = 1;
    this._loadFromStorage();
  }

  /**
   * Load strategies from storage
   */
  _loadFromStorage() {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        this.strategies = new Map(data.strategies || []);
        this.nextId = data.nextId || 1;
      }
    } catch (e) {
      // Silent fail - just use empty memory
    }
  }

  /**
   * Save strategies to storage
   */
  _saveToStorage() {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const data = {
        strategies: Array.from(this.strategies.entries()),
        nextId: this.nextId,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Learn a strategy from game outcome
   * @param {string} playerId - Player ID
   * @param {string} situation - Situation description
   * @param {string} strategy - Strategy description
   * @param {object} outcome - Outcome object {won, reward, penalty}
   * @returns {string} Strategy ID
   */
  saveStrategy(playerId, situation, strategy, outcome) {
    const id = `strategy_${this.nextId++}`;
    
    const entry = {
      id,
      playerId,
      situation,
      strategy,
      outcomes: [],
      wins: 0,
      losses: 0,
      totalGames: 0,
      winRate: 0,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };
    
    if (outcome) {
      entry.outcomes.push(outcome);
      if (outcome.won) entry.wins++;
      else entry.losses++;
      entry.totalGames++;
      entry.winRate = entry.wins / entry.totalGames;
    }
    
    this.strategies.set(id, entry);
    this._saveToStorage();
    
    return id;
  }

  /**
   * Get learned strategies for a situation
   * @param {string} playerId - Player ID
   * @param {string} situation - Situation to match
   * @returns {Array} Matching strategies
   */
  getStrategies(playerId, situation) {
    const results = [];
    
    for (const strategy of this.strategies.values()) {
      if (strategy.playerId === playerId && strategy.situation === situation) {
        results.push(strategy);
      }
    }
    
    return results;
  }

  /**
   * Get top performing strategies for a player
   * @param {string} playerId - Player ID
   * @param {number} limit - Max results
   * @returns {Array} Top strategies sorted by win rate
   */
  getTopStrategies(playerId, limit = 5) {
    const playerStrategies = Array.from(this.strategies.values())
      .filter(s => s.playerId === playerId && s.totalGames >= 1)
      .sort((a, b) => b.winRate - a.winRate);
    
    return playerStrategies.slice(0, limit);
  }

  /**
   * Update strategy with new outcome
   * @param {string} strategyId - Strategy ID
   * @param {object} outcome - New outcome {won, reward, penalty}
   * @returns {boolean} Success
   */
  updateStrategy(strategyId, outcome) {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return false;
    
    if (outcome) {
      strategy.outcomes.push(outcome);
      if (outcome.won) strategy.wins++;
      else strategy.losses++;
      strategy.totalGames++;
      strategy.winRate = strategy.wins / strategy.totalGames;
    }
    
    strategy.lastUsed = Date.now();
    this._saveToStorage();
    
    return true;
  }

  /**
   * Evolve strategy based on performance
   * @param {string} strategyId - Strategy ID to evolve
   * @returns {object} Evolved strategy
   */
  evolveStrategy(strategyId) {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return null;
    
    // Simple evolution: adjust strategy based on win rate
    let evolved = strategy.strategy;
    
    if (strategy.winRate < 0.3) {
      // Low win rate - suggest more conservative approach
      evolved = evolved + ' (consider: reduce risk, wait for better opportunities)';
    } else if (strategy.winRate > 0.7) {
      // High win rate - can be more aggressive
      evolved = evolved + ' (potential: increase aggression when ahead)';
    }
    
    // Create new evolved strategy
    const newId = this.saveStrategy(
      strategy.playerId,
      strategy.situation,
      evolved,
      null // No outcome for evolved strategy yet
    );
    
    return this.strategies.get(newId);
  }

  /**
   * Export all strategies as JSON
   * @returns {string} JSON string
   */
  exportStrategies() {
    return JSON.stringify(Array.from(this.strategies.entries()));
  }

  /**
   * Import strategies from JSON
   * @param {string} jsonStr - JSON string
   * @returns {boolean} Success
   */
  importStrategies(jsonStr) {
    try {
      const entries = JSON.parse(jsonStr);
      this.strategies = new Map(entries);
      this._saveToStorage();
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Clear strategies for a player
   * @param {string} playerId - Player ID
   */
  clear(playerId) {
    for (const [id, strategy] of this.strategies.entries()) {
      if (strategy.playerId === playerId) {
        this.strategies.delete(id);
      }
    }
    this._saveToStorage();
  }

  /**
   * Get all strategies
   * @returns {Array} All strategies
   */
  getAllStrategies() {
    return Array.from(this.strategies.values());
  }
}