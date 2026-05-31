/**
 * Game Event Bus - Pub/Sub system for monopoly3d
 * 
 * Event types:
 * - player_move, property_purchase, rent_paid, dice_roll, turn_change
 * - game_start, game_end, house_built, question_answered, jail_enter, jail_exit
 */

// EventTarget polyfill for Node.js environment (for testing)
class EventTargetPolyfill {
  constructor() {
    this._listeners = new Map();
  }

  addEventListener(type, handler) {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }
    this._listeners.get(type).add(handler);
  }

  removeEventListener(type, handler) {
    if (this._listeners.has(type)) {
      this._listeners.get(type).delete(handler);
    }
  }

  dispatchEvent(event) {
    const type = event.type || event;
    if (this._listeners.has(type)) {
      this._listeners.get(type).forEach(handler => {
        try {
          handler(event);
        } catch (e) {
          console.error(`Event handler error for ${type}:`, e);
        }
      });
    }
    return true;
  }
}

// Use native EventTarget in browser, polyfill in Node.js
const EventBusBase = typeof EventTarget !== 'undefined' ? EventTarget : EventTargetPolyfill;

/**
 * EventBus class - provides pub/sub event system for game events
 * Extends EventTarget for native DOM-like API compatibility
 */
class EventBus extends EventBusBase {
  constructor() {
    super();
    this._history = [];
    this._maxHistorySize = 100;
  }

  /**
   * Publish an event to all subscribers
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  publish(event, data = {}) {
    const eventData = {
      type: event,
      data,
      timestamp: Date.now(),
    };

    // Add to history
    this._history.push(eventData);
    if (this._history.length > this._maxHistorySize) {
      this._history.shift();
    }

    // Dispatch to all listeners (using custom event object)
    const customEvent = {
      type: event,
      detail: data,
      timestamp: eventData.timestamp,
    };
    
    if (typeof EventTarget !== 'undefined') {
      // Browser environment - use native dispatchEvent
      const eventObj = new CustomEvent(event, { detail: data });
      super.dispatchEvent(eventObj);
    } else {
      // Node.js environment - use polyfill
      this.dispatchEvent(customEvent);
    }

    return eventData;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name to subscribe to
   * @param {function} handler - Handler function called when event fires
   * @returns {function} Unsubscribe function
   */
  subscribe(event, handler) {
    this.addEventListener(event, handler);
    
    // Return unsubscribe function
    return () => {
      this.unsubscribe(event, handler);
    };
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {function} handler - Handler to remove
   */
  unsubscribe(event, handler) {
    this.removeEventListener(event, handler);
  }

  /**
   * Get event history
   * @returns {Array} Array of past events with timestamps
   */
  getEventHistory() {
    return [...this._history];
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this._history = [];
  }

  /**
   * Get events by type
   * @param {string} eventType - Event type to filter
   * @returns {Array} Filtered event history
   */
  getEventsByType(eventType) {
    return this._history.filter(e => e.type === eventType);
  }

  /**
   * Get recent events (last n events)
   * @param {number} count - Number of recent events to return
   * @returns {Array} Recent events
   */
  getRecentEvents(count = 10) {
    return this._history.slice(-count);
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Named export for use in store
export { EventBus };