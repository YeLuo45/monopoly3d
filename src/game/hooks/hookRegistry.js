/**
 * Hook Registry - before/after/insteadOf hook system for monopoly3d
 * 
 * Hook types:
 * - 'before': Run before an action, can modify data
 * - 'after': Run after an action, for side effects
 * - 'insteadOf': Replace the original action entirely
 * 
 * Supported events:
 * - property_purchase, rent_payment, house_building, dice_roll, player_move
 */

// Generate unique IDs for hooks
let hookIdCounter = 0;
function generateHookId() {
  return `hook_${++hookIdCounter}_${Date.now()}`;
}

/**
 * HookRegistry class - manages before/after/insteadOf hooks
 */
class HookRegistry {
  constructor() {
    this._hooks = {
      // Structure: { eventType: { before: [], after: [], insteadOf: [] } }
    };
    this._enabled = true;
  }

  /**
   * Register a hook
   * @param {string} event - Event name (e.g., 'property_purchase')
   * @param {string} type - Hook type: 'before' | 'after' | 'insteadOf'
   * @param {function} handler - Hook handler function
   * @param {number} priority - Higher priority runs first (default: 0)
   * @returns {string} Handler ID for unregistration
   */
  register(event, type, handler, priority = 0) {
    if (!['before', 'after', 'insteadOf'].includes(type)) {
      throw new Error(`Invalid hook type: ${type}. Must be 'before', 'after', or 'insteadOf'`);
    }

    const handlerId = generateHookId();

    if (!this._hooks[event]) {
      this._hooks[event] = { before: [], after: [], insteadOf: [] };
    }

    if (!this._hooks[event][type]) {
      this._hooks[event][type] = [];
    }

    this._hooks[event][type].push({
      id: handlerId,
      handler,
      priority,
    });

    // Sort by priority (higher first)
    this._hooks[event][type].sort((a, b) => b.priority - a.priority);

    return handlerId;
  }

  /**
   * Unregister a hook
   * @param {string} event - Event name
   * @param {string} type - Hook type
   * @param {string} handlerId - Handler ID to remove
   * @returns {boolean} True if handler was found and removed
   */
  unregister(event, type, handlerId) {
    if (!this._hooks[event] || !this._hooks[event][type]) {
      return false;
    }

    const hooks = this._hooks[event][type];
    const index = hooks.findIndex(h => h.id === handlerId);
    
    if (index !== -1) {
      hooks.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Execute before hooks - can modify data before action
   * @param {string} event - Event name
   * @param {object} data - Data to pass to hooks
   * @returns {object|null} Modified data or null if blocked
   */
  executeBefore(event, data) {
    if (!this._enabled) return data;
    if (!this._hooks[event] || !this._hooks[event].before) {
      return data;
    }

    let modifiedData = { ...data };

    for (const hook of this._hooks[event].before) {
      try {
        const result = hook.handler(modifiedData);
        if (result === null) {
          // Hook returned null means block the action
          return null;
        }
        if (result !== undefined) {
          modifiedData = result;
        }
      } catch (e) {
        console.error(`Error in before hook for ${event}:`, e);
      }
    }

    return modifiedData;
  }

  /**
   * Execute after hooks - for side effects
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  executeAfter(event, data) {
    if (!this._enabled) return;
    if (!this._hooks[event] || !this._hooks[event].after) {
      return;
    }

    for (const hook of this._hooks[event].after) {
      try {
        hook.handler(data);
      } catch (e) {
        console.error(`Error in after hook for ${event}:`, e);
      }
    }
  }

  /**
   * Execute insteadOf hooks - can replace behavior entirely
   * @param {string} event - Event name
   * @param {object} data - Event data
   * @param {function} originalFn - Original function to potentially replace
   * @returns {*} Result from insteadOf hook or original function
   */
  executeInsteadOf(event, data, originalFn) {
    if (!this._enabled) return originalFn ? originalFn(data) : undefined;
    if (!this._hooks[event] || !this._hooks[event].insteadOf) {
      return originalFn ? originalFn(data) : undefined;
    }

    // Find highest priority insteadOf hook
    const insteadOfHooks = this._hooks[event].insteadOf;
    if (insteadOfHooks.length === 0) {
      return originalFn ? originalFn(data) : undefined;
    }

    // Use highest priority hook
    const hook = insteadOfHooks[0];

    try {
      return hook.handler(data, originalFn);
    } catch (e) {
      console.error(`Error in insteadOf hook for ${event}:`, e);
      return originalFn ? originalFn(data) : undefined;
    }
  }

  /**
   * Check if event has hooks of a specific type
   * @param {string} event - Event name
   * @param {string} type - Hook type
   * @returns {boolean}
   */
  hasHooks(event, type) {
    return !!(this._hooks[event] && this._hooks[event][type] && 
              this._hooks[event][type].length > 0);
  }

  /**
   * Get all registered hooks for an event
   * @param {string} event - Event name
   * @returns {object} Hooks object with before, after, insteadOf arrays
   */
  getHooks(event) {
    return this._hooks[event] || { before: [], after: [], insteadOf: [] };
  }

  /**
   * Clear all hooks
   */
  clear() {
    this._hooks = {};
  }

  /**
   * Clear hooks for a specific event
   * @param {string} event - Event name
   */
  clearEvent(event) {
    if (this._hooks[event]) {
      this._hooks[event] = { before: [], after: [], insteadOf: [] };
    }
  }

  /**
   * Enable/disable hook execution
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled;
  }

  /**
   * Check if hooks are enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }
}

// Singleton instance
export const hookRegistry = new HookRegistry();

// Named export for use in store
export { HookRegistry };