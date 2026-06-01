/**
 * L0_RawEventCache - Raw event storage with circular buffer
 * Inspired by thunderbolt pipeline stages
 * 
 * This is the lowest level memory layer - stores all raw game events
 * with timestamps in a circular buffer for efficient memory usage.
 */

export class L0_RawEventCache {
  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
    this.buffer = [];
    this.head = 0;
    this.count = 0;
  }

  /**
   * Add event with timestamp to circular buffer
   * @param {string} event - Event type
   * @param {object} data - Event data
   */
  push(event, data) {
    const timestamp = Date.now();
    const entry = { event, data, timestamp };
    
    if (this.count >= this.maxSize) {
      // Overwrite oldest entry (circular buffer)
      this.buffer[this.head] = entry;
      this.head = (this.head + 1) % this.maxSize;
    } else {
      this.buffer.push(entry);
      this.count++;
    }
    
    return entry;
  }

  /**
   * Get most recent events
   * @param {number} count - Number of events to retrieve
   * @returns {Array} Most recent events (newest first)
   */
  getRecent(count = 100) {
    if (this.count === 0) return [];
    
    const result = [];
    const actualCount = Math.min(count, this.count);
    
    // Start from most recent (head - 1, or end of buffer if not full)
    let startIdx;
    if (this.count < this.maxSize) {
      startIdx = this.count - 1;
    } else {
      startIdx = (this.head - 1 + this.maxSize) % this.maxSize;
    }
    
    for (let i = 0; i < actualCount; i++) {
      const idx = (startIdx - i + this.maxSize) % this.maxSize;
      result.push(this.buffer[idx]);
    }
    
    return result;
  }

  /**
   * Filter events by type
   * @param {string} eventType - Event type to filter
   * @returns {Array} Matching events
   */
  getByType(eventType) {
    return this.buffer.slice(0, this.count).filter(e => e.event === eventType);
  }

  /**
   * Get events within time range
   * @param {number} start - Start timestamp
   * @param {number} end - End timestamp
   * @returns {Array} Events in range
   */
  getByTimeRange(start, end) {
    return this.buffer.slice(0, this.count).filter(
      e => e.timestamp >= start && e.timestamp <= end
    );
  }

  /**
   * Filter events by player
   * @param {string} playerId - Player ID
   * @returns {Array} Events for that player
   */
  getByPlayer(playerId) {
    return this.buffer.slice(0, this.count).filter(
      e => e.data && e.data.playerId === playerId
    );
  }

  /**
   * Clear all events
   */
  clear() {
    this.buffer = [];
    this.head = 0;
    this.count = 0;
  }

  /**
   * Get current number of stored events
   * @returns {number} Event count
   */
  size() {
    return this.count;
  }
}