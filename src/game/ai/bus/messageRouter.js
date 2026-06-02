/**
 * MessageRouter - Intelligent Message Routing
 * 
 * Routes messages based on patterns, content inspection,
 * and dynamic routing rules.
 */

export class MessageRouter {
  /**
   * @param {MessageBus} messageBus - Associated message bus instance
   */
  constructor(messageBus) {
    this.messageBus = messageBus;
    
    // Routing rules: pattern -> destinations[]
    this.routes = new Map();
    
    // Default destination for unmatched messages
    this.defaultRoute = null;
    
    // Routing statistics
    this.routingStats = {
      totalRouted: 0,
      patternMatches: 0,
      defaultRoutes: 0
    };
  }

  /**
   * Add a routing rule
   * @param {string} pattern - Pattern to match (string or regex-like)
   * @param {object} destination - Destination configuration
   * @returns {function} Remove route function
   */
  addRoute(pattern, destination) {
    if (!this.routes.has(pattern)) {
      this.routes.set(pattern, []);
    }

    const destinations = this.routes.get(pattern);
    destinations.push({
      ...destination,
      addedAt: Date.now()
    });

    // Return remove function
    return () => {
      this.removeRoute(pattern, destination);
    };
  }

  /**
   * Remove a specific route
   * @param {string} pattern - Pattern identifier
   * @param {object} destination - Destination to remove
   * @returns {boolean} True if removed
   */
  removeRoute(pattern, destination = null) {
    if (!this.routes.has(pattern)) {
      return false;
    }

    if (destination) {
      const destinations = this.routes.get(pattern);
      const index = destinations.findIndex(
        d => d.channel === destination.channel || d.agent === destination.agent
      );

      if (index !== -1) {
        destinations.splice(index, 1);
        return true;
      }
      return false;
    } else {
      // Remove all routes for this pattern
      this.routes.delete(pattern);
      return true;
    }
  }

  /**
   * Set default route for unmatched messages
   * @param {object} destination - Default destination
   */
  setDefaultRoute(destination) {
    this.defaultRoute = {
      ...destination,
      isDefault: true,
      addedAt: Date.now()
    };
  }

  /**
   * Remove default route
   */
  clearDefaultRoute() {
    this.defaultRoute = null;
  }

  /**
   * Route a message to appropriate destinations
   * @param {object} message - Message to route
   * @returns {object[]} Array of routing results
   */
  routeMessage(message) {
    const results = [];
    this.routingStats.totalRouted++;

    // Check each routing rule
    for (const [pattern, destinations] of this.routes) {
      if (this._matchesPattern(message, pattern)) {
        this.routingStats.patternMatches++;

        for (const dest of destinations) {
          const result = this._deliverToDestination(message, dest);
          results.push(result);
        }
      }
    }

    // If no matches, use default route
    if (results.length === 0 && this.defaultRoute) {
      this.routingStats.defaultRoutes++;
      const result = this._deliverToDestination(message, this.defaultRoute);
      results.push(result);
    }

    return results;
  }

  /**
   * Check if message matches a pattern
   * @param {object} message - Message to check
   * @param {string} pattern - Pattern to match
   * @returns {boolean}
   * @private
   */
  _matchesPattern(message, pattern) {
    // Direct string match on message type
    if (message.type === pattern) return true;
    
    // Check payload fields
    if (message.payload) {
      // Match on payload.type
      if (message.payload.type === pattern) return true;
      
      // Match on payload.channel
      if (message.payload.channel === pattern) return true;
      
      // Match on payload.action
      if (message.payload.action === pattern) return true;
      
      // Match on payload.target
      if (message.payload.target === pattern) return true;
    }
    
    // Regex-style matching if pattern contains special chars
    if (pattern.includes('*') || pattern.includes('?')) {
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      
      const messageStr = JSON.stringify(message);
      try {
        const regex = new RegExp(regexPattern);
        return regex.test(messageStr);
      } catch {
        return false;
      }
    }
    
    return false;
  }

  /**
   * Deliver message to a destination
   * @param {object} message - Message to deliver
   * @param {object} destination - Destination config
   * @returns {object} Delivery result
   * @private
   */
  _deliverToDestination(message, destination) {
    const result = {
      destination,
      success: false,
      deliveredAt: Date.now()
    };

    try {
      if (destination.channel) {
        // Broadcast to channel
        const count = this.messageBus.publish(destination.channel, {
          ...message.payload,
          routedFrom: message.id || message.channel
        });
        result.success = true;
        result.subscriberCount = count;
      }

      if (destination.agent) {
        // Direct message to agent
        this.messageBus.send(destination.agent, 'router', {
          ...message.payload,
          routedFrom: message.id || message.channel
        });
        result.success = true;
      }

      if (destination.handler) {
        // Call handler function directly
        destination.handler(message);
        result.success = true;
      }
    } catch (error) {
      result.error = error.message;
    }

    return result;
  }

  /**
   * Get current routing table
   * @returns {object} Routing table representation
   */
  getRoutingTable() {
    const table = [];

    for (const [pattern, destinations] of this.routes) {
      table.push({
        pattern,
        destinations: destinations.map(d => ({
          channel: d.channel,
          agent: d.agent,
          priority: d.priority,
          addedAt: d.addedAt
        }))
      });
    }

    return {
      rules: table,
      defaultRoute: this.defaultRoute,
      stats: { ...this.routingStats }
    };
  }

  /**
   * Get routing statistics
   * @returns {object} Statistics object
   */
  getStats() {
    return { ...this.routingStats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.routingStats = {
      totalRouted: 0,
      patternMatches: 0,
      defaultRoutes: 0
    };
  }

  /**
   * Check if any routes exist for a pattern
   * @param {string} pattern - Pattern to check
   * @returns {boolean}
   */
  hasRoute(pattern) {
    return this.routes.has(pattern);
  }

  /**
   * Get number of routing rules
   * @returns {number}
   */
  getRouteCount() {
    let count = 0;
    for (const destinations of this.routes.values()) {
      count += destinations.length;
    }
    return count;
  }

  /**
   * Clear all routes
   */
  clearRoutes() {
    this.routes.clear();
    this.defaultRoute = null;
  }
}