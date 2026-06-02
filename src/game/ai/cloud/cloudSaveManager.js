/**
 * CloudSaveManager - Cloud Save Management System
 * 
 * Handles saving, loading, and syncing game data to cloud storage.
 * Provides a unified interface for cloud-based game state persistence.
 */

import { EventEmitter } from 'events';

const SaveOperation = {
  SAVE: 'save',
  LOAD: 'load',
  LIST: 'list',
  DELETE: 'delete'
};

const SyncStatus = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  CONFLICT: 'conflict',
  ERROR: 'error',
  SUCCESS: 'success'
};

class CloudSaveManager extends EventEmitter {
  /**
   * Create a new CloudSaveManager
   * @param {string} apiEndpoint - The API endpoint for cloud operations
   */
  constructor(apiEndpoint = 'https://api.monopoly3d.example.com') {
    super();
    this.apiEndpoint = apiEndpoint;
    this.saves = new Map(); // In-memory cache: playerId -> saves[]
    this.syncQueue = new Map(); // playerId -> pending sync operations
    this.syncStatus = new Map(); // playerId -> SyncStatus
    this.lastSync = new Map(); // playerId -> timestamp
    this.retryAttempts = new Map(); // playerId -> retry count
    this.maxRetries = 3;
    this.retryDelay = 1000; // ms
  }

  /**
   * Save game state to cloud
   * @param {string} playerId - Player ID
   * @param {Object} gameState - Game state to save
   * @returns {Promise<Object>} Save result with saveId and timestamp
   */
  async saveGame(playerId, gameState) {
    if (!playerId || !gameState) {
      throw new Error('playerId and gameState are required');
    }

    const saveId = `${playerId}_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    const saveEntry = {
      saveId,
      playerId,
      gameState: this._sanitizeState(gameState),
      timestamp,
      version: 1,
      checksum: this._generateChecksum(gameState),
      metadata: {
        createdAt: timestamp,
        updatedAt: timestamp,
        size: JSON.stringify(gameState).length
      }
    };

    // Simulate cloud API call
    const result = await this._simulateApiCall(SaveOperation.SAVE, { playerId, saveEntry });
    
    // Update local cache
    if (!this.saves.has(playerId)) {
      this.saves.set(playerId, []);
    }
    this.saves.get(playerId).push(saveEntry);
    
    this.emit('save:completed', { playerId, saveId, timestamp });
    return {
      success: true,
      saveId,
      timestamp,
      cloudUrl: `${this.apiEndpoint}/saves/${saveId}`
    };
  }

  /**
   * Load game state from cloud
   * @param {string} playerId - Player ID
   * @param {string} saveId - Optional save ID (loads most recent if not specified)
   * @returns {Promise<Object>} Loaded game state
   */
  async loadGame(playerId, saveId = null) {
    if (!playerId) {
      throw new Error('playerId is required');
    }

    // Simulate cloud API call
    const result = await this._simulateApiCall(SaveOperation.LOAD, { playerId, saveId });
    
    // Try to find in local cache first
    if (this.saves.has(playerId)) {
      const saves = this.saves.get(playerId);
      if (saveId) {
        const save = saves.find(s => s.saveId === saveId);
        if (save) {
          this.emit('load:completed', { playerId, saveId });
          return save.gameState;
        }
      } else if (saves.length > 0) {
        // Return most recent save
        const mostRecent = saves[saves.length - 1];
        this.emit('load:completed', { playerId, saveId: mostRecent.saveId });
        return mostRecent.gameState;
      }
    }

    throw new Error(`No save found for player ${playerId}`);
  }

  /**
   * List all saves for a player
   * @param {string} playerId - Player ID
   * @returns {Promise<Array>} List of save entries
   */
  async listSaves(playerId) {
    if (!playerId) {
      throw new Error('playerId is required');
    }

    const result = await this._simulateApiCall(SaveOperation.LIST, { playerId });
    
    const saves = this.saves.get(playerId) || [];
    return saves.map(save => ({
      saveId: save.saveId,
      timestamp: save.timestamp,
      version: save.version,
      checksum: save.checksum,
      size: save.metadata.size,
      gameMode: save.gameState?.gameMode || 'unknown'
    }));
  }

  /**
   * Delete a save
   * @param {string} playerId - Player ID
   * @param {string} saveId - Save ID to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteSave(playerId, saveId) {
    if (!playerId || !saveId) {
      throw new Error('playerId and saveId are required');
    }

    await this._simulateApiCall(SaveOperation.DELETE, { playerId, saveId });
    
    // Remove from local cache
    if (this.saves.has(playerId)) {
      const saves = this.saves.get(playerId);
      const index = saves.findIndex(s => s.saveId === saveId);
      if (index !== -1) {
        saves.splice(index, 1);
      }
    }

    this.emit('save:deleted', { playerId, saveId });
    return { success: true, saveId };
  }

  /**
   * Sync local progress to cloud
   * @param {string} playerId - Player ID
   * @returns {Promise<Object>} Sync result
   */
  async syncProgress(playerId) {
    if (!playerId) {
      throw new Error('playerId is required');
    }

    this.syncStatus.set(playerId, SyncStatus.SYNCING);
    this.emit('sync:started', { playerId });

    try {
      const localSaves = this.saves.get(playerId) || [];
      const pendingSync = this.syncQueue.get(playerId) || [];
      
      // Simulate sync operation
      const result = await this._simulateApiCall('sync', { playerId, localSaves, pendingSync });
      
      this.syncStatus.set(playerId, SyncStatus.SUCCESS);
      this.lastSync.set(playerId, Date.now());
      
      // Clear sync queue on success
      this.syncQueue.set(playerId, []);
      this.retryAttempts.set(playerId, 0);
      
      this.emit('sync:completed', { playerId, result });
      return {
        success: true,
        syncedItems: pendingSync.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.syncStatus.set(playerId, SyncStatus.ERROR);
      this.emit('sync:error', { playerId, error: error.message });
      throw error;
    }
  }

  /**
   * Get sync status for a player
   * @param {string} playerId - Player ID
   * @returns {Object} Sync status information
   */
  getSyncStatus(playerId) {
    if (!playerId) {
      throw new Error('playerId is required');
    }

    const status = this.syncStatus.get(playerId) || SyncStatus.IDLE;
    const lastSyncTime = this.lastSync.get(playerId);
    const pendingCount = (this.syncQueue.get(playerId) || []).length;
    const retryCount = this.retryAttempts.get(playerId) || 0;

    return {
      playerId,
      status,
      lastSync: lastSyncTime ? new Date(lastSyncTime).toISOString() : null,
      pendingSyncItems: pendingCount,
      retryAttempts: retryCount,
      isStale: lastSyncTime ? (Date.now() - lastSyncTime) > 3600000 : true, // 1 hour
      needsSync: pendingCount > 0
    };
  }

  /**
   * Add item to sync queue
   * @param {string} playerId - Player ID
   * @param {Object} syncItem - Item to sync
   */
  addToSyncQueue(playerId, syncItem) {
    if (!playerId || !syncItem) {
      throw new Error('playerId and syncItem are required');
    }

    if (!this.syncQueue.has(playerId)) {
      this.syncQueue.set(playerId, []);
    }
    
    const queue = this.syncQueue.get(playerId);
    queue.push({
      ...syncItem,
      queuedAt: Date.now(),
      id: `${playerId}_sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
    this.emit('sync:itemQueued', { playerId, syncItem });
  }

  /**
   * Get sync queue for a player
   * @param {string} playerId - Player ID
   * @returns {Array} Sync queue items
   */
  getSyncQueue(playerId) {
    return this.syncQueue.get(playerId) || [];
  }

  /**
   * Clear sync queue for a player
   * @param {string} playerId - Player ID
   */
  clearSyncQueue(playerId) {
    this.syncQueue.set(playerId, []);
    this.emit('sync:queueCleared', { playerId });
  }

  /**
   * Get storage usage for a player
   * @param {string} playerId - Player ID
   * @returns {Object} Storage usage info
   */
  getStorageUsage(playerId) {
    const saves = this.saves.get(playerId) || [];
    const totalSize = saves.reduce((acc, save) => acc + save.metadata.size, 0);
    
    return {
      playerId,
      saveCount: saves.length,
      totalSize,
      totalSizeFormatted: this._formatBytes(totalSize)
    };
  }

  /**
   * Export all player data
   * @param {string} playerId - Player ID
   * @returns {Object} All player data for export
   */
  exportPlayerData(playerId) {
    return {
      playerId,
      saves: this.saves.get(playerId) || [],
      syncQueue: this.syncQueue.get(playerId) || [],
      syncStatus: this.getSyncStatus(playerId),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import player data
   * @param {string} playerId - Player ID
   * @param {Object} data - Data to import
   */
  importPlayerData(playerId, data) {
    if (data.saves) {
      this.saves.set(playerId, data.saves);
    }
    if (data.syncQueue) {
      this.syncQueue.set(playerId, data.syncQueue);
    }
    this.emit('data:imported', { playerId });
  }

  // Private helper methods

  /**
   * Simulate an API call (for testing/demo purposes)
   * @private
   */
  async _simulateApiCall(operation, payload) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Use deterministic success for tests (Math.random can cause flaky tests)
        if (typeof process.env.NODE_ENV !== 'undefined' && process.env.NODE_ENV === 'test') {
          resolve({ operation, payload, success: true, timestamp: Date.now() });
        } else if (Math.random() < 0.95) { // 95% success rate for production
          resolve({ operation, payload, success: true, timestamp: Date.now() });
        } else {
          reject(new Error(`API call failed for ${operation}`));
        }
      }, 10);
    });
  }

  /**
   * Sanitize game state before saving
   * @private
   */
  _sanitizeState(gameState) {
    return JSON.parse(JSON.stringify(gameState));
  }

  /**
   * Generate checksum for game state
   * @private
   */
  _generateChecksum(gameState) {
    const str = JSON.stringify(gameState);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Format bytes to human readable string
   * @private
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export { CloudSaveManager, SaveOperation, SyncStatus };