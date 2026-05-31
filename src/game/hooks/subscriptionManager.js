/**
 * SubscriptionManager - Manage named event subscriptions with auto-cleanup
 * 
 * Features:
 * - createSubscription(name, event, handler): named subscription with auto-cleanup
 * - cancelSubscription(name): cancel by name
 * - cancelAll(event): cancel all for an event type
 * - listSubscriptions(): returns active subscription list
 * - pauseSubscription(name) / resumeSubscription(name): temporary pause
 * - Integrates with existing eventBus.subscribe()
 */

import { eventBus } from '../eventBus.js';

class SubscriptionManager {
  constructor() {
    // Map of subscription name → subscription info
    this._subscriptions = new Map();
    
    // Counter for auto-generating unique names
    this._nameCounter = 0;
  }

  /**
   * Create a named subscription
   * @param {string} name - Unique subscription name
   * @param {string} event - Event name to subscribe to
   * @param {function} handler - Handler function
   * @returns {object} Subscription info {name, event, handler, unsubscribe, paused}
   */
  createSubscription(name, event, handler) {
    // Generate unique name if not provided
    if (!name) {
      name = `sub_${++this._nameCounter}_${Date.now()}`;
    }
    
    // Check if name already exists
    if (this._subscriptions.has(name)) {
      // Cancel existing subscription with same name
      this.cancelSubscription(name);
    }
    
    // Create subscription using eventBus
    const unsubscribe = eventBus.subscribe(event, handler);
    
    const subscriptionInfo = {
      name,
      event,
      handler,
      unsubscribe,
      paused: false,
      createdAt: Date.now(),
    };
    
    this._subscriptions.set(name, subscriptionInfo);
    
    return subscriptionInfo;
  }

  /**
   * Cancel a subscription by name
   * @param {string} name - Subscription name
   * @returns {boolean} True if subscription was found and cancelled
   */
  cancelSubscription(name) {
    const subscription = this._subscriptions.get(name);
    
    if (!subscription) {
      return false;
    }
    
    // Call the unsubscribe function from eventBus
    if (subscription.unsubscribe) {
      subscription.unsubscribe();
    }
    
    this._subscriptions.delete(name);
    
    return true;
  }

  /**
   * Cancel all subscriptions for an event type
   * @param {string} event - Event name
   * @returns {number} Number of subscriptions cancelled
   */
  cancelAll(event) {
    let count = 0;
    
    this._subscriptions.forEach((sub, name) => {
      if (sub.event === event) {
        if (sub.unsubscribe) {
          sub.unsubscribe();
        }
        this._subscriptions.delete(name);
        count++;
      }
    });
    
    return count;
  }

  /**
   * List all active subscriptions
   * @returns {Array} Array of subscription info objects
   */
  listSubscriptions() {
    const list = [];
    
    this._subscriptions.forEach((sub) => {
      list.push({
        name: sub.name,
        event: sub.event,
        paused: sub.paused,
        createdAt: sub.createdAt,
      });
    });
    
    return list;
  }

  /**
   * Pause a subscription (handler won't be called but stays subscribed)
   * @param {string} name - Subscription name
   * @returns {boolean} True if subscription was found and paused
   */
  pauseSubscription(name) {
    const subscription = this._subscriptions.get(name);
    
    if (!subscription) {
      return false;
    }
    
    // Unsubscribe from eventBus but keep reference
    if (subscription.unsubscribe) {
      subscription.unsubscribe();
      subscription.unsubscribe = null;
    }
    
    subscription.paused = true;
    
    return true;
  }

  /**
   * Resume a paused subscription
   * @param {string} name - Subscription name
   * @returns {boolean} True if subscription was found and resumed
   */
  resumeSubscription(name) {
    const subscription = this._subscriptions.get(name);
    
    if (!subscription) {
      return false;
    }
    
    if (!subscription.paused) {
      return false; // Not paused
    }
    
    // Re-subscribe to eventBus
    subscription.unsubscribe = eventBus.subscribe(subscription.event, subscription.handler);
    subscription.paused = false;
    
    return true;
  }

  /**
   * Check if a subscription exists
   * @param {string} name - Subscription name
   * @returns {boolean}
   */
  hasSubscription(name) {
    return this._subscriptions.has(name);
  }

  /**
   * Get subscription info
   * @param {string} name - Subscription name
   * @returns {object|null} Subscription info or null
   */
  getSubscription(name) {
    const sub = this._subscriptions.get(name);
    
    if (!sub) {
      return null;
    }
    
    return {
      name: sub.name,
      event: sub.event,
      paused: sub.paused,
      createdAt: sub.createdAt,
    };
  }

  /**
   * Get all subscriptions for an event type
   * @param {string} event - Event name
   * @returns {Array} Array of subscription names
   */
  getSubscriptionsForEvent(event) {
    const names = [];
    
    this._subscriptions.forEach((sub, name) => {
      if (sub.event === event) {
        names.push(name);
      }
    });
    
    return names;
  }

  /**
   * Get total subscription count
   * @returns {number}
   */
  getCount() {
    return this._subscriptions.size;
  }

  /**
   * Get active (non-paused) subscription count
   * @returns {number}
   */
  getActiveCount() {
    let count = 0;
    
    this._subscriptions.forEach((sub) => {
      if (!sub.paused) {
        count++;
      }
    });
    
    return count;
  }

  /**
   * Clear all subscriptions
   */
  clear() {
    this._subscriptions.forEach((sub) => {
      if (sub.unsubscribe) {
        sub.unsubscribe();
      }
    });
    
    this._subscriptions.clear();
  }
}

// Singleton instance
export const subscriptionManager = new SubscriptionManager();

// Named export for testing
export { SubscriptionManager };