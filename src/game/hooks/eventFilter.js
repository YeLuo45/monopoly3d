/**
 * EventFilter - Filter and transform events based on configurable rules
 * 
 * Provides filtering and transformation capabilities for the event system.
 * Events pass through rules before being dispatched to subscribers.
 */

let ruleIdCounter = 0;
function generateRuleId() {
  return `ef_rule_${++ruleIdCounter}_${Date.now()}`;
}

/**
 * EventFilter class - wraps eventBus to add filtering/transformation
 */
class EventFilter {
  /**
   * @param {EventBus} eventBus - The event bus to wrap
   */
  constructor(eventBus) {
    this._eventBus = eventBus;
    this._filterRules = {};    // { eventType: [{ id, filterFn }] }
    this._transformRules = {}; // { eventType: [{ id, transformFn }] }
  }

  /**
   * Add a filter rule for an event type
   * @param {string} eventType - Event name to filter
   * @param {function} filterFn - Filter function: (data) => boolean
   * @returns {string} Rule ID for removal
   */
  addRule(eventType, filterFn) {
    if (typeof filterFn !== 'function') {
      throw new Error('filterFn must be a function');
    }

    const ruleId = generateRuleId();

    if (!this._filterRules[eventType]) {
      this._filterRules[eventType] = [];
    }

    this._filterRules[eventType].push({
      id: ruleId,
      filterFn,
    });

    return ruleId;
  }

  /**
   * Add a transform rule for an event type
   * @param {string} eventType - Event name to transform
   * @param {function} transformFn - Transform function: (data) => newData
   * @returns {string} Rule ID for removal
   */
  addTransform(eventType, transformFn) {
    if (typeof transformFn !== 'function') {
      throw new Error('transformFn must be a function');
    }

    const ruleId = generateRuleId();

    if (!this._transformRules[eventType]) {
      this._transformRules[eventType] = [];
    }

    this._transformRules[eventType].push({
      id: ruleId,
      transformFn,
    });

    return ruleId;
  }

  /**
   * Remove a filter rule
   * @param {string} eventType - Event name
   * @param {string} ruleId - Rule ID to remove
   * @returns {boolean} True if removed
   */
  removeRule(eventType, ruleId) {
    if (!this._filterRules[eventType]) {
      return false;
    }

    const index = this._filterRules[eventType].findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this._filterRules[eventType].splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all filter rules for an event type
   * @param {string} eventType - Event name
   * @returns {Array} Array of rule objects
   */
  getRules(eventType) {
    return this._filterRules[eventType] || [];
  }

  /**
   * Clear all filter rules for an event type
   * @param {string} eventType - Event name
   */
  clearRules(eventType) {
    if (eventType) {
      delete this._filterRules[eventType];
      delete this._transformRules[eventType];
    } else {
      this._filterRules = {};
      this._transformRules = {};
    }
  }

  /**
   * Publish an event with filtering and transformation
   * Events pass through rules before being dispatched
   * @param {string} event - Event name
   * @param {object} data - Event data
   * @returns {boolean} True if event was published (not blocked)
   */
  publishFiltered(event, data) {
    // Apply transforms first (chained)
    let transformedData = { ...data };

    if (this._transformRules[event]) {
      for (const rule of this._transformRules[event]) {
        try {
          const result = rule.transformFn(transformedData);
          if (result !== undefined) {
            transformedData = result;
          }
        } catch (e) {
          console.error(`Transform error for ${event}:`, e);
        }
      }
    }

    // Check if blocked by any filter
    if (this._filterRules[event]) {
      for (const rule of this._filterRules[event]) {
        try {
          if (!rule.filterFn(transformedData)) {
            return false; // Event blocked
          }
        } catch (e) {
          console.error(`Filter error for ${event}:`, e);
        }
      }
    }

    // Publish to event bus
    this._eventBus.publish(event, transformedData);
    return true;
  }

  /**
   * Subscribe to an event (bypasses filters - raw subscription)
   * @param {string} event - Event name
   * @param {function} handler - Handler function
   * @returns {function} Unsubscribe function
   */
  subscribe(event, handler) {
    return this._eventBus.subscribe(event, handler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {function} handler - Handler to remove
   */
  unsubscribe(event, handler) {
    this._eventBus.unsubscribe(event, handler);
  }

  /**
   * Get event history from underlying event bus
   * @returns {Array} Event history
   */
  getEventHistory() {
    return this._eventBus.getEventHistory();
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this._eventBus.clearHistory();
  }

  /**
   * Get filter rule count for an event type
   * @param {string} eventType - Event name
   * @returns {number} Number of filter rules
   */
  getFilterCount(eventType) {
    return this._filterRules[eventType]?.length || 0;
  }

  /**
   * Get transform rule count for an event type
   * @param {string} eventType - Event name
   * @returns {number} Number of transform rules
   */
  getTransformCount(eventType) {
    return this._transformRules[eventType]?.length || 0;
  }

  /**
   * Check if event type has any rules
   * @param {string} eventType - Event name
   * @returns {boolean}
   */
  hasRules(eventType) {
    return this.getFilterCount(eventType) > 0 || this.getTransformCount(eventType) > 0;
  }
}

export { EventFilter };