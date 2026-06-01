/**
 * RuleEngine - Declarative rule system for game events
 * 
 * Inspired by thunderbolt pipeline/feedback loops.
 * Provides predefined rule types and custom rule evaluation.
 */

let ruleIdCounter = 0;
function generateRuleId() {
  return `re_rule_${++ruleIdCounter}_${Date.now()}`;
}

/**
 * Predefined rule type handlers
 */
const RuleTypes = {
  /**
   * Fire when player property count > N
   */
  property_threshold: (condition, data) => {
    const { playerId, threshold } = condition;
    if (data.playerId !== playerId) return false;
    return data.propertyCount > threshold;
  },

  /**
   * Fire when player money changes by > N
   */
  money_change: (condition, data) => {
    const { playerId, threshold, direction } = condition;
    if (playerId && data.playerId !== playerId) return false;
    const change = Math.abs(data.change || data.newValue - data.oldValue);
    if (direction === 'increase' && data.change < 0) return false;
    if (direction === 'decrease' && data.change > 0) return false;
    return change > threshold;
  },

  /**
   * Fire after same player takes N consecutive turns
   */
  consecutive_turns: (condition, data) => {
    const { playerId, threshold } = condition;
    if (playerId && data.playerId !== playerId) return false;
    return data.consecutiveCount >= threshold;
  },

  /**
   * Fire when rent > 50% of player money
   */
  rent_overload: (condition, data) => {
    const { playerId } = condition;
    if (playerId && data.playerId !== playerId) return false;
    const { rent, playerMoney } = data;
    if (!playerMoney || playerMoney <= 0) return false;
    return rent > playerMoney * 0.5;
  },
};

/**
 * RuleEngine class - manages declarative rules for game events
 */
class RuleEngine {
  /**
   * @param {EventBus} eventBus - The event bus to use for actions
   * @param {HookRegistry} hookRegistry - Optional hook registry
   */
  constructor(eventBus, hookRegistry = null) {
    this._eventBus = eventBus;
    this._hookRegistry = hookRegistry;
    this._rules = [];
    this._enabled = true;
    this._consecutiveTurns = {}; // Track consecutive turns per player
  }

  /**
   * Add a rule to the engine
   * @param {object} ruleDef - Rule definition
   * @param {string} ruleDef.event - Event name to listen for
   * @param {function|object} ruleDef.condition - Condition function or predefined type config
   * @param {function} ruleDef.action - Action to execute when condition is met
   * @param {number} ruleDef.priority - Priority (higher runs first, default: 0)
   * @param {string} [ruleDef.ruleType] - Predefined rule type ('property_threshold', etc.)
   * @returns {string} Rule ID for removal
   */
  addRule({ event, condition, action, priority = 0, ruleType = null }) {
    if (!event || typeof event !== 'string') {
      throw new Error('Rule must have an event name');
    }
    if (!condition) {
      throw new Error('Rule must have a condition');
    }
    if (!action) {
      throw new Error('Rule must have an action');
    }

    const ruleId = generateRuleId();

    const rule = {
      id: ruleId,
      event,
      condition,
      action,
      priority,
      ruleType,
      enabled: true,
      triggerCount: 0,
    };

    this._rules.push(rule);

    // Sort by priority (descending)
    this._rules.sort((a, b) => b.priority - a.priority);

    return ruleId;
  }

  /**
   * Remove a rule by ID
   * @param {string} ruleId - Rule ID to remove
   * @returns {boolean} True if removed
   */
  removeRule(ruleId) {
    const index = this._rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this._rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Evaluate rules for an event and data
   * @param {string} event - Event name
   * @param {object} data - Event data
   * @returns {Array} Array of triggered rule results
   */
  evaluate(event, data) {
    if (!this._enabled) return [];

    const results = [];

    // Update consecutive turns tracking for turn_change events
    if (event === 'turn_change') {
      this._updateConsecutiveTurns(data);
    }

    // Find matching rules
    for (const rule of this._rules) {
      if (rule.event !== event || !rule.enabled) continue;

      const matched = this._evaluateCondition(rule, data);
      if (matched) {
        rule.triggerCount++;
        try {
          const result = rule.action(data, this._eventBus);
          results.push({
            ruleId: rule.id,
            event,
            result,
          });
        } catch (e) {
          console.error(`Rule action error for ${event}:`, e);
          results.push({
            ruleId: rule.id,
            event,
            error: e.message,
          });
        }
      }
    }

    return results;
  }

  /**
   * Evaluate a single rule's condition
   * @param {object} rule - Rule object
   * @param {object} data - Event data
   * @returns {boolean} True if condition matches
   */
  _evaluateCondition(rule, data) {
    // Predefined rule type
    if (rule.ruleType && RuleTypes[rule.ruleType]) {
      return RuleTypes[rule.ruleType](rule.condition, data);
    }

    // Custom condition function
    if (typeof rule.condition === 'function') {
      return rule.condition(data);
    }

    // Condition object (must be truthy)
    return !!rule.condition;
  }

  /**
   * Update consecutive turns tracking
   * @param {object} data - turn_change event data
   */
  _updateConsecutiveTurns(data) {
    const { playerId, consecutiveCount } = data;
    if (consecutiveCount !== undefined) {
      this._consecutiveTurns[playerId] = consecutiveCount;
    } else {
      // Simple tracking if not provided
      const prevPlayer = this._lastPlayerId;
      if (prevPlayer === playerId) {
        this._consecutiveTurns[playerId] = (this._consecutiveTurns[playerId] || 0) + 1;
      } else {
        this._consecutiveTurns[playerId] = 1;
      }
      this._lastPlayerId = playerId;
    }
  }

  /**
   * Get all active (enabled) rules
   * @returns {Array} Array of rule objects
   */
  getActiveRules() {
    return this._rules.filter(r => r.enabled);
  }

  /**
   * Get rules for a specific event
   * @param {string} event - Event name
   * @returns {Array} Array of matching rules
   */
  getRulesForEvent(event) {
    return this._rules.filter(r => r.event === event);
  }

  /**
   * Export rules as JSON
   * @returns {string} JSON string of rules
   */
  exportRules() {
    const exportData = this._rules.map(r => ({
      event: r.event,
      condition: r.condition,
      action: r.action.toString(), // Serialize function
      priority: r.priority,
      ruleType: r.ruleType,
    }));
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import rules from JSON
   * @param {string} jsonStr - JSON string of rules
   * @returns {number} Number of rules imported
   */
  importRules(jsonStr) {
    try {
      const rules = JSON.parse(jsonStr);
      let count = 0;

      for (const rule of rules) {
        if (!rule.event) continue;

        // Reconstruct action function from string if it's a string
        let actionFn = rule.action;
        if (typeof actionFn === 'string') {
          actionFn = eval(`(${actionFn})`);
        }

        // Condition is either a function string or an object
        let condition = rule.condition;
        if (typeof condition === 'string') {
          condition = eval(`(${condition})`);
        }

        this.addRule({
          event: rule.event,
          condition: condition,
          action: actionFn,
          priority: rule.priority || 0,
          ruleType: rule.ruleType || null,
        });
        count++;
      }

      return count;
    } catch (e) {
      console.error('Failed to import rules:', e);
      return 0;
    }
  }

  /**
   * Clear all rules
   */
  clearRules() {
    this._rules = [];
    this._consecutiveTurns = {};
  }

  /**
   * Enable/disable the rule engine
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled;
  }

  /**
   * Check if engine is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  /**
   * Enable a specific rule
   * @param {string} ruleId - Rule ID
   * @returns {boolean} True if found and enabled
   */
  enableRule(ruleId) {
    const rule = this._rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = true;
      return true;
    }
    return false;
  }

  /**
   * Disable a specific rule
   * @param {string} ruleId - Rule ID
   * @returns {boolean} True if found and disabled
   */
  disableRule(ruleId) {
    const rule = this._rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = false;
      return true;
    }
    return false;
  }

  /**
   * Get rule statistics
   * @returns {object} Stats object
   */
  getStats() {
    return {
      totalRules: this._rules.length,
      enabledRules: this._rules.filter(r => r.enabled).length,
      totalTriggers: this._rules.reduce((sum, r) => sum + (r.triggerCount || 0), 0),
      byEvent: this._rules.reduce((acc, r) => {
        acc[r.event] = (acc[r.event] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}

export { RuleEngine, RuleTypes };