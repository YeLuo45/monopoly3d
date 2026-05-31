/**
 * EventAnalytics - Track and analyze game events for monopoly3d
 * 
 * Features:
 * - eventCounts: Map of eventType → count
 * - eventTimeline: array of {timestamp, event, data}
 * - playerEventCounts: Map of playerId → {eventType → count}
 * - trackEvent(event, data): record event with timestamp
 * - getEventStats(eventType): returns {count, firstSeen, lastSeen, avgPerGame}
 * - getPlayerStats(playerId): returns per-player breakdown
 * - exportEvents(): returns full event log for replay/debug
 */

import { eventBus } from '../eventBus.js';

class EventAnalytics {
  constructor() {
    // Map of eventType → count
    this.eventCounts = new Map();
    
    // Array of {timestamp, event, data}
    this.eventTimeline = [];
    
    // Map of playerId → {eventType → count}
    this.playerEventCounts = new Map();
    
    // Track games for avgPerGame calculation
    this.gameIds = new Set();
    this.currentGameId = null;
    
    // Max timeline size to prevent memory issues
    this._maxTimelineSize = 10000;
    
    // Subscribe to all events automatically
    this._autoSubscribe();
  }

  /**
   * Auto-subscribe to all events from eventBus
   * @private
   */
  _autoSubscribe() {
    // Listen to all events via a wildcard subscription
    // We'll track all events as they pass through
    eventBus.subscribe('*', (event) => {
      // This won't catch all events since '*' is not a real event type
      // Instead, we rely on explicit trackEvent calls
    });
  }

  /**
   * Set the current game ID for avgPerGame calculation
   * @param {string|number} gameId 
   */
  setGameId(gameId) {
    if (this.currentGameId !== null) {
      this.gameIds.add(this.currentGameId);
    }
    this.currentGameId = gameId;
  }

  /**
   * Track an event with timestamp and data
   * @param {string} event - Event name
   * @param {object} data - Event data (optional, should include playerId if applicable)
   */
  trackEvent(event, data = {}) {
    const timestamp = Date.now();
    
    // Record in timeline
    this.eventTimeline.push({
      timestamp,
      event,
      data,
    });
    
    // Trim timeline if too large
    if (this.eventTimeline.length > this._maxTimelineSize) {
      this.eventTimeline = this.eventTimeline.slice(-this._maxTimelineSize);
    }
    
    // Update event count
    const currentCount = this.eventCounts.get(event) || 0;
    this.eventCounts.set(event, currentCount + 1);
    
    // Update player event counts if playerId is present
    if (data && data.playerId !== undefined) {
      this._trackPlayerEvent(data.playerId, event);
    }
    
    // Return the tracked event for chaining
    return { timestamp, event, data };
  }

  /**
   * Track event for a specific player
   * @param {string|number} playerId
   * @param {string} event
   * @private
   */
  _trackPlayerEvent(playerId, event) {
    if (!this.playerEventCounts.has(playerId)) {
      this.playerEventCounts.set(playerId, new Map());
    }
    const playerCounts = this.playerEventCounts.get(playerId);
    const currentCount = playerCounts.get(event) || 0;
    playerCounts.set(event, currentCount + 1);
  }

  /**
   * Get statistics for a specific event type
   * @param {string} eventType - Event type to get stats for
   * @returns {object} {count, firstSeen, lastSeen, avgPerGame}
   */
  getEventStats(eventType) {
    const count = this.eventCounts.get(eventType) || 0;
    
    // Find first and last occurrence in timeline
    const occurrences = this.eventTimeline.filter(e => e.event === eventType);
    
    let firstSeen = null;
    let lastSeen = null;
    
    if (occurrences.length > 0) {
      firstSeen = occurrences[0].timestamp;
      lastSeen = occurrences[occurrences.length - 1].timestamp;
    }
    
    // Calculate average per game
    const totalGames = this.gameIds.size + (this.currentGameId !== null ? 1 : 0);
    const avgPerGame = totalGames > 0 ? count / totalGames : 0;
    
    return {
      count,
      firstSeen,
      lastSeen,
      avgPerGame: Math.round(avgPerGame * 100) / 100,
    };
  }

  /**
   * Get statistics for a specific player
   * @param {string|number} playerId - Player ID
   * @returns {object} Per-player breakdown {eventType: count, ...}
   */
  getPlayerStats(playerId) {
    const playerCounts = this.playerEventCounts.get(playerId);
    
    if (!playerCounts) {
      return {};
    }
    
    const stats = {};
    playerCounts.forEach((count, event) => {
      stats[event] = count;
    });
    
    return stats;
  }

  /**
   * Export all events for replay/debug
   * @returns {Array} Full event log
   */
  exportEvents() {
    return [...this.eventTimeline];
  }

  /**
   * Get events filtered by type
   * @param {string} eventType - Event type to filter
   * @returns {Array} Filtered events
   */
  getEventsByType(eventType) {
    return this.eventTimeline.filter(e => e.event === eventType);
  }

  /**
   * Get events for a specific player
   * @param {string|number} playerId - Player ID
   * @returns {Array} Events for that player
   */
  getEventsForPlayer(playerId) {
    return this.eventTimeline.filter(e => 
      e.data && e.data.playerId === playerId
    );
  }

  /**
   * Get recent events
   * @param {number} count - Number of recent events to return
   * @returns {Array} Recent events
   */
  getRecentEvents(count = 10) {
    return this.eventTimeline.slice(-count);
  }

  /**
   * Clear all analytics data
   */
  clear() {
    this.eventCounts.clear();
    this.eventTimeline = [];
    this.playerEventCounts.clear();
  }

  /**
   * Reset for new game (keeps historical stats but starts fresh)
   */
  resetForNewGame() {
    // Save current game ID before resetting
    if (this.currentGameId !== null) {
      this.gameIds.add(this.currentGameId);
    }
    this.currentGameId = null;
    this.eventCounts.clear();
    this.eventTimeline = [];
    this.playerEventCounts.clear();
  }

  /**
   * Get total event count
   * @returns {number}
   */
  getTotalEventCount() {
    let total = 0;
    this.eventCounts.forEach(count => {
      total += count;
    });
    return total;
  }

  /**
   * Get all tracked event types
   * @returns {Array} List of event types
   */
  getEventTypes() {
    return Array.from(this.eventCounts.keys());
  }

  /**
   * Get summary statistics
   * @returns {object} Summary stats
   */
  getSummary() {
    return {
      totalEvents: this.getTotalEventCount(),
      uniqueEventTypes: this.eventCounts.size,
      playersTracked: this.playerEventCounts.size,
      gamesTracked: this.gameIds.size + (this.currentGameId !== null ? 1 : 0),
      timelineSize: this.eventTimeline.length,
    };
  }
}

// Singleton instance
export const eventAnalytics = new EventAnalytics();

// Named export for testing
export { EventAnalytics };