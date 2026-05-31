/**
 * GameReplay - Record, save, load and playback game events
 * 
 * Features:
 * - Record events from eventBus
 * - Save/load replays to localStorage
 * - Export/import replays as JSON
 * - Auto-record on game_start, stop on game_end (via store integration)
 */

import { eventBus } from '../eventBus.js';

const STORAGE_PREFIX = 'monopoly3d_replay_';
const REPLAY_LIST_KEY = 'monopoly3d_replay_list';

class GameReplay {
  /**
   * @param {EventBus} bus - Event bus instance to record from
   * @param {number} maxEvents - Maximum events to record (default 1000)
   */
  constructor(bus, maxEvents = 1000) {
    this.eventBus = bus;
    this.maxEvents = maxEvents;
    
    // Recording state
    this.isRecording = false;
    this.gameId = null;
    this.startTime = null;
    this.events = [];
    
    // Bound publish wrapper for intercepting events
    this._originalPublish = null;
    this._boundPublish = null;
  }

  /**
   * Start recording events for a game
   * @param {string} gameId - Unique game identifier
   */
  startRecording(gameId) {
    if (this.isRecording) {
      this.stopRecording();
    }
    
    this.gameId = gameId;
    this.startTime = Date.now();
    this.events = [];
    this.isRecording = true;
    
    // Wrap the eventBus publish method to intercept all events
    this._originalPublish = this.eventBus.publish.bind(this.eventBus);
    this._boundPublish = (event, data) => {
      this._recordEvent(event, data);
      return this._originalPublish(event, data);
    };
    this.eventBus.publish = this._boundPublish;
  }

  /**
   * Internal: Record an event
   * @param {string} event - Event type
   * @param {object} data - Event data
   */
  _recordEvent(event, data) {
    if (!this.isRecording) return;
    
    // Respect maxEvents limit
    if (this.events.length >= this.maxEvents) {
      this.events.shift(); // Remove oldest
    }
    
    this.events.push({
      type: event,
      data: data || {},
      timestamp: Date.now(),
    });
  }

  /**
   * Stop recording
   */
  stopRecording() {
    // Restore original publish method
    if (this._originalPublish && this.eventBus) {
      this.eventBus.publish = this._originalPublish;
      this._originalPublish = null;
      this._boundPublish = null;
    }
    this.isRecording = false;
  }

  /**
   * Get current recording
   * @returns {object} Recording data {gameId, startTime, events[], duration}
   */
  getRecording() {
    const endTime = Date.now();
    return {
      gameId: this.gameId,
      startTime: this.startTime,
      endTime: endTime,
      events: [...this.events],
      duration: this.isRecording ? (endTime - this.startTime) : (endTime - this.startTime),
      eventCount: this.events.length,
    };
  }

  /**
   * Save recording to localStorage
   * @param {string} key - Storage key (will be prefixed)
   * @returns {boolean} Success
   */
  saveToStorage(key) {
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage not available');
      return false;
    }
    
    const recording = this.getRecording();
    if (!recording.gameId) {
      console.warn('No active recording to save');
      return false;
    }
    
    try {
      const storageKey = STORAGE_PREFIX + key;
      localStorage.setItem(storageKey, JSON.stringify(recording));
      
      // Update replay list
      this._addToReplayList(key);
      
      return true;
    } catch (e) {
      console.error('Failed to save replay:', e);
      return false;
    }
  }

  /**
   * Load recording from localStorage
   * @param {string} key - Storage key
   * @returns {object|null} Recording data or null
   */
  loadFromStorage(key) {
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage not available');
      return null;
    }
    
    try {
      const storageKey = STORAGE_PREFIX + key;
      const data = localStorage.getItem(storageKey);
      
      if (!data) return null;
      
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load replay:', e);
      return null;
    }
  }

  /**
   * List all saved replays
   * @returns {Array} Array of {key, gameId, eventCount, duration, savedAt}
   */
  listReplays() {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    
    try {
      const listJson = localStorage.getItem(REPLAY_LIST_KEY);
      if (!listJson) return [];
      
      const list = JSON.parse(listJson);
      return list.map(entry => ({
        key: entry.key,
        gameId: entry.gameId,
        eventCount: entry.eventCount,
        duration: entry.duration,
        savedAt: entry.savedAt,
      }));
    } catch (e) {
      console.error('Failed to list replays:', e);
      return [];
    }
  }

  /**
   * Add a replay to the list
   * @param {string} key - Storage key
   */
  _addToReplayList(key) {
    try {
      const recording = this.getRecording();
      const listJson = localStorage.getItem(REPLAY_LIST_KEY);
      const list = listJson ? JSON.parse(listJson) : [];
      
      // Remove existing entry with same key
      const filteredList = list.filter(entry => entry.key !== key);
      
      filteredList.push({
        key: key,
        gameId: recording.gameId,
        eventCount: recording.eventCount,
        duration: recording.duration,
        savedAt: Date.now(),
      });
      
      localStorage.setItem(REPLAY_LIST_KEY, JSON.stringify(filteredList));
    } catch (e) {
      console.error('Failed to update replay list:', e);
    }
  }

  /**
   * Delete a replay from localStorage
   * @param {string} key - Storage key
   * @returns {boolean} Success
   */
  deleteReplay(key) {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    
    try {
      const storageKey = STORAGE_PREFIX + key;
      localStorage.removeItem(storageKey);
      
      // Remove from list
      const listJson = localStorage.getItem(REPLAY_LIST_KEY);
      if (listJson) {
        const list = JSON.parse(listJson);
        const filteredList = list.filter(entry => entry.key !== key);
        localStorage.setItem(REPLAY_LIST_KEY, JSON.stringify(filteredList));
      }
      
      return true;
    } catch (e) {
      console.error('Failed to delete replay:', e);
      return false;
    }
  }

  /**
   * Export recording as JSON string
   * @returns {string} JSON representation
   */
  exportReplay() {
    return JSON.stringify(this.getRecording(), null, 2);
  }

  /**
   * Import replay from JSON string
   * @param {string} jsonStr - JSON string from exportReplay
   * @returns {object|null} Parsed recording or null
   */
  importReplay(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      
      // Validate basic structure
      if (!data.events || !Array.isArray(data.events)) {
        throw new Error('Invalid replay format: missing events array');
      }
      
      return data;
    } catch (e) {
      console.error('Failed to import replay:', e);
      return null;
    }
  }
}

export { GameReplay, STORAGE_PREFIX, REPLAY_LIST_KEY };