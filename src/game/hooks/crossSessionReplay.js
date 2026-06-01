/**
 * CrossSessionReplay - Cross-session replay system using localStorage + event serialization
 * 
 * Provides persistent replay recording that survives browser sessions with
 * full event serialization, import/export, and metadata tracking.
 */

import { EventSerializer } from './eventSerializer.js';

const REPLAY_STORAGE_PREFIX = 'monopoly3d_xsr_';
const REPLAY_LIST_KEY = 'monopoly3d_xsr_list';
const REPLAY_VERSION = '1.0.0';

export class CrossSessionReplay {
  /**
   * @param {EventBus} eventBus - Event bus instance
   * @param {EventSerializer} eventSerializer - Event serializer instance
   * @param {GameReplay} gameReplay - GameReplay instance for recording
   */
  constructor(eventBus, eventSerializer, gameReplay) {
    this.eventBus = eventBus;
    this.eventSerializer = eventSerializer || new EventSerializer();
    this.gameReplay = gameReplay;
    
    // Active replay state
    this.activeReplayId = null;
    this.activeGameId = null;
    this.startTime = null;
    
    // Metadata storage per replay
    this.metadata = {};
    
    // Subscribe to game events if gameReplay is provided
    this._setupEventSubscription();
  }

  /**
   * Internal: Setup event subscription for game events
   * @private
   */
  _setupEventSubscription() {
    if (this.eventBus) {
      this._unsubscribe = this.eventBus.subscribe('game_end', () => {
        // Auto-save when game ends if we have an active replay
        if (this.activeReplayId) {
          this.saveReplay(this.activeReplayId);
        }
      });
    }
  }

  /**
   * Create a new replay recording session
   * @param {string} gameId - Unique game identifier
   * @returns {string} replayId - The created replay ID
   */
  createReplay(gameId) {
    const replayId = `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.activeReplayId = replayId;
    this.activeGameId = gameId;
    this.startTime = Date.now();
    this.metadata[replayId] = {
      gameId,
      createdAt: Date.now(),
      turnCount: 0,
      playerCount: 0,
      players: [],
      winner: null,
      duration: 0,
      theme: null,
    };
    
    // Start game replay recording if available
    if (this.gameReplay) {
      this.gameReplay.startRecording(gameId);
    }
    
    return replayId;
  }

  /**
   * Save current replay to localStorage with metadata
   * @param {string} replayId - Replay ID to save
   * @returns {boolean} Success
   */
  saveReplay(replayId) {
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage not available');
      return false;
    }
    
    // Get events from gameReplay if available
    let events = [];
    let gameId = this.activeGameId;
    let duration = 0;
    
    if (this.gameReplay) {
      const recording = this.gameReplay.getRecording();
      events = recording.events || [];
      gameId = recording.gameId || gameId;
      duration = recording.duration || (Date.now() - this.startTime);
    }
    
    // Serialize events
    const serializedEvents = this.eventSerializer.serializeEvents(events);
    
    const replayData = {
      replayId,
      gameId,
      version: REPLAY_VERSION,
      createdAt: this.metadata[replayId]?.createdAt || Date.now(),
      savedAt: Date.now(),
      duration,
      eventCount: events.length,
      metadata: this.metadata[replayId] || {},
      events: JSON.parse(serializedEvents),
    };
    
    try {
      const storageKey = REPLAY_STORAGE_PREFIX + replayId;
      localStorage.setItem(storageKey, JSON.stringify(replayData));
      
      // Update replay list
      this._addToReplayList(replayId, replayData);
      
      return true;
    } catch (e) {
      console.error('Failed to save replay:', e);
      return false;
    }
  }

  /**
   * Load a replay from localStorage
   * @param {string} replayId - Replay ID to load
   * @returns {object|null} Replay data or null
   */
  loadReplay(replayId) {
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage not available');
      return null;
    }
    
    try {
      const storageKey = REPLAY_STORAGE_PREFIX + replayId;
      const data = localStorage.getItem(storageKey);
      
      if (!data) return null;
      
      const replayData = JSON.parse(data);
      
      // Deserialize events if they exist
      if (replayData.events && Array.isArray(replayData.events)) {
        // The events are stored as serialized event objects, need to deserialize each
        replayData.events = replayData.events.map(evt => 
          this.eventSerializer.deserializeEvent(evt)
        );
      }
      
      return replayData;
    } catch (e) {
      console.error('Failed to load replay:', e);
      return null;
    }
  }

  /**
   * Delete a saved replay
   * @param {string} replayId - Replay ID to delete
   * @returns {boolean} Success
   */
  deleteReplay(replayId) {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    
    try {
      const storageKey = REPLAY_STORAGE_PREFIX + replayId;
      localStorage.removeItem(storageKey);
      
      // Remove from list
      this._removeFromReplayList(replayId);
      
      // Clean up metadata
      delete this.metadata[replayId];
      
      return true;
    } catch (e) {
      console.error('Failed to delete replay:', e);
      return false;
    }
  }

  /**
   * List all saved replays
   * @returns {Array} Array of {replayId, gameId, timestamp, duration, playerCount}
   */
  listReplays() {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    
    try {
      const listJson = localStorage.getItem(REPLAY_LIST_KEY);
      if (!listJson) return [];
      
      const list = JSON.parse(listJson);
      return list
        .filter(entry => entry.replayId)
        .map(entry => ({
          replayId: entry.replayId,
          gameId: entry.gameId,
          timestamp: entry.savedAt,
          duration: entry.duration,
          playerCount: entry.playerCount || 0,
        }))
        .sort((a, b) => b.timestamp - a.timestamp); // Newest first
    } catch (e) {
      console.error('Failed to list replays:', e);
      return [];
    }
  }

  /**
   * Register auto-save on game end
   * @param {string} key - Key for auto-save (unused, uses activeReplayId)
   * @returns {function} Cleanup function to unregister
   */
  autoSaveOnGameEnd(key) {
    // This is now handled by the internal subscription
    // Return unsubscribe function
    return () => {
      if (this._unsubscribe) {
        this._unsubscribe();
        this._unsubscribe = null;
      }
    };
  }

  /**
   * Export a replay as downloadable JSON file
   * @param {string} replayId - Replay ID to export
   * @returns {string|null} JSON string or null if failed
   */
  exportReplayFile(replayId) {
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage not available');
      return null;
    }
    
    try {
      const storageKey = REPLAY_STORAGE_PREFIX + replayId;
      const data = localStorage.getItem(storageKey);
      
      if (!data) return null;
      
      const replayData = JSON.parse(data);
      
      // Build export data with proper event format
      const exportData = {
        version: REPLAY_VERSION,
        exportedAt: Date.now(),
        replayId: replayData.replayId,
        gameId: replayData.gameId,
        metadata: replayData.metadata || {},
        events: replayData.events || [],
        duration: replayData.duration || 0,
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (e) {
      console.error('Failed to export replay:', e);
      return null;
    }
  }

  /**
   * Import a replay from file content
   * @param {string} fileContent - JSON string from export
   * @returns {object|null} Parsed replay data or null
   */
  importReplayFile(fileContent) {
    try {
      const data = JSON.parse(fileContent);
      
      // Validate structure
      if (!data.events) {
        throw new Error('Invalid replay format: missing events');
      }
      
      // Events from export are already in proper format, just use them directly
      const events = Array.isArray(data.events) ? data.events : [];
      
      const replayData = {
        replayId: data.replayId || `imported_${Date.now()}`,
        gameId: data.gameId,
        version: data.version || REPLAY_VERSION,
        createdAt: data.createdAt || Date.now(),
        savedAt: Date.now(),
        duration: data.duration || 0,
        metadata: data.metadata || {},
        events: events,
      };
      
      return replayData;
    } catch (e) {
      console.error('Failed to import replay:', e);
      return null;
    }
  }

  /**
   * Add metadata to a replay
   * @param {string} replayId - Replay ID
   * @param {object} metadata - Metadata object {players, winner, duration, theme, ...}
   */
  addMetadata(replayId, metadata) {
    if (!this.metadata[replayId]) {
      this.metadata[replayId] = {};
    }
    
    this.metadata[replayId] = {
      ...this.metadata[replayId],
      ...metadata,
    };
  }

  /**
   * Get metadata for a replay
   * @param {string} replayId - Replay ID
   * @returns {object|null} Metadata object or null
   */
  getMetadata(replayId) {
    return this.metadata[replayId] ? { ...this.metadata[replayId] } : null;
  }

  /**
   * Internal: Add replay to the list
   * @private
   */
  _addToReplayList(replayId, replayData) {
    try {
      const listJson = localStorage.getItem(REPLAY_LIST_KEY);
      const list = listJson ? JSON.parse(listJson) : [];
      
      // Remove existing entry with same replayId
      const filteredList = list.filter(entry => entry.replayId !== replayId);
      
      filteredList.push({
        replayId,
        gameId: replayData.gameId,
        savedAt: replayData.savedAt,
        duration: replayData.duration,
        playerCount: replayData.metadata?.playerCount || 0,
        eventCount: replayData.eventCount || 0,
      });
      
      localStorage.setItem(REPLAY_LIST_KEY, JSON.stringify(filteredList));
    } catch (e) {
      console.error('Failed to update replay list:', e);
    }
  }

  /**
   * Internal: Remove replay from the list
   * @private
   */
  _removeFromReplayList(replayId) {
    try {
      const listJson = localStorage.getItem(REPLAY_LIST_KEY);
      if (!listJson) return;
      
      const list = JSON.parse(listJson);
      const filteredList = list.filter(entry => entry.replayId !== replayId);
      localStorage.setItem(REPLAY_LIST_KEY, JSON.stringify(filteredList));
    } catch (e) {
      console.error('Failed to update replay list:', e);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }
}

export default CrossSessionReplay;