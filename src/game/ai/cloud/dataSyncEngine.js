/**
 * DataSyncEngine - Data Synchronization Engine
 * 
 * Handles synchronization of game entities between local and cloud storage.
 * Manages sync queues, conflict detection, and data resolution.
 */

import { EventEmitter } from 'events';

const SyncState = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CONFLICT: 'conflict'
};

const EntityType = {
  GAME_STATE: 'game_state',
  PLAYER_DATA: 'player_data',
  PROPERTY: 'property',
  ACCOUNT: 'account',
  ACHIEVEMENT: 'achievement',
  SETTINGS: 'settings'
};

class DataSyncEngine extends EventEmitter {
  /**
   * Create a new DataSyncEngine
   * @param {CloudSaveManager} cloudSaveManager - Cloud save manager instance
   */
  constructor(cloudSaveManager) {
    super();
    this.cloudSaveManager = cloudSaveManager;
    this.syncQueues = new Map(); // playerId -> Map<entityType, entities[]>
    this.syncHistory = new Map(); // playerId -> completed syncs
    this.conflicts = new Map(); // playerId -> unresolved conflicts
    this.lastSyncTimes = new Map(); // playerId -> timestamp
    this.batchSize = 50;
  }

  /**
   * Sync a specific entity
   * @param {string} playerId - Player ID
   * @param {string} entityType - Type of entity
   * @param {string} entityId - Entity ID
   * @returns {Promise<Object>} Sync result
   */
  async syncEntity(playerId, entityType, entityId) {
    if (!playerId || !entityType || !entityId) {
      throw new Error('playerId, entityType, and entityId are required');
    }

    const syncId = this._generateSyncId(playerId, entityType, entityId);
    const timestamp = Date.now();

    this.emit('sync:entityStarted', { playerId, entityType, entityId, syncId });

    try {
      // Get current entity state
      const localData = this._getLocalEntityData(playerId, entityType, entityId);
      const remoteData = await this._fetchRemoteEntity(playerId, entityType, entityId);

      // Check for conflicts
      if (this._hasConflict(localData, remoteData)) {
        const conflict = this._createConflictRecord(localData, remoteData, syncId);
        this._addConflict(playerId, conflict);
        this.emit('sync:conflict', { playerId, entityType, entityId, conflict });
        return {
          success: false,
          syncId,
          conflict: true,
          conflictData: conflict
        };
      }

      // Perform sync
      const result = await this._performSync(playerId, entityType, entityId, localData, remoteData);
      
      this._recordSyncHistory(playerId, { syncId, entityType, entityId, timestamp, status: SyncState.COMPLETED });
      this.emit('sync:entityCompleted', { playerId, entityType, entityId, syncId, result });

      return {
        success: true,
        syncId,
        result
      };
    } catch (error) {
      this._recordSyncHistory(playerId, { syncId, entityType, entityId, timestamp, status: SyncState.FAILED, error: error.message });
      this.emit('sync:entityFailed', { playerId, entityType, entityId, syncId, error: error.message });
      throw error;
    }
  }

  /**
   * Resolve sync conflict
   * @param {string} playerId - Player ID
   * @param {string} conflictId - Conflict ID
   * @param {string} strategy - Resolution strategy ('local', 'remote', 'merge', 'latest')
   * @returns {Promise<Object>} Resolution result
   */
  async resolveConflict(playerId, conflictId, strategy = 'latest') {
    const conflict = this._getConflict(playerId, conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found for player ${playerId}`);
    }

    this.emit('sync:resolvingConflict', { playerId, conflictId, strategy });

    const { localData, remoteData } = conflict;
    const resolved = this.resolveDataConflict(localData, remoteData, strategy);

    // Apply resolved data
    await this._applyResolvedData(playerId, conflict.entityType, conflict.entityId, resolved);

    // Remove conflict after resolution
    this._removeConflict(playerId, conflictId);

    this.emit('sync:conflictResolved', { playerId, conflictId, strategy, resolved });
    return { success: true, resolved, strategy };
  }

  /**
   * Resolve data conflict between local and remote
   * @param {Object} localData - Local data
   * @param {Object} remoteData - Remote data
   * @param {string} strategy - Resolution strategy
   * @returns {Object} Resolved data
   */
  resolveDataConflict(localData, remoteData, strategy) {
    switch (strategy) {
      case 'local':
        return localData;
      case 'remote':
        return remoteData;
      case 'latest':
        const localTime = localData?.updatedAt || 0;
        const remoteTime = remoteData?.updatedAt || 0;
        return localTime > remoteTime ? localData : remoteData;
      case 'merge':
        return this._mergeData(localData, remoteData);
      default:
        return localData;
    }
  }

  /**
   * Get pending sync items for a player
   * @param {string} playerId - Player ID
   * @returns {Array} Pending sync items
   */
  getPendingSync(playerId) {
    const queue = this.syncQueues.get(playerId);
    if (!queue) return [];

    const pending = [];
    for (const [entityType, entities] of queue) {
      for (const entity of entities) {
        if (entity.state === SyncState.PENDING) {
          pending.push({
            playerId,
            entityType,
            entityId: entity.entityId,
            queuedAt: entity.queuedAt,
            syncId: entity.syncId
          });
        }
      }
    }
    return pending.sort((a, b) => a.queuedAt - b.queuedAt);
  }

  /**
   * Clear sync queue for a player
   * @param {string} playerId - Player ID
   */
  clearSyncQueue(playerId) {
    this.syncQueues.set(playerId, new Map());
    this.emit('sync:queueCleared', { playerId });
  }

  /**
   * Add entity to sync queue
   * @param {string} playerId - Player ID
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {Object} data - Entity data
   */
  queueEntitySync(playerId, entityType, entityId, data) {
    if (!this.syncQueues.has(playerId)) {
      this.syncQueues.set(playerId, new Map());
    }

    const queue = this.syncQueues.get(playerId);
    if (!queue.has(entityType)) {
      queue.set(entityType, []);
    }

    const entities = queue.get(entityType);
    const existingIndex = entities.findIndex(e => e.entityId === entityId);

    const syncItem = {
      entityId,
      data,
      state: SyncState.PENDING,
      queuedAt: Date.now(),
      syncId: this._generateSyncId(playerId, entityType, entityId)
    };

    if (existingIndex !== -1) {
      entities[existingIndex] = syncItem;
    } else {
      entities.push(syncItem);
    }

    this.emit('sync:entityQueued', { playerId, entityType, entityId });
  }

  /**
   * Get sync history for a player
   * @param {string} playerId - Player ID
   * @param {number} limit - Max number of entries
   * @returns {Array} Sync history
   */
  getSyncHistory(playerId, limit = 50) {
    const history = this.syncHistory.get(playerId) || [];
    return history.slice(-limit).reverse();
  }

  /**
   * Get unresolved conflicts for a player
   * @param {string} playerId - Player ID
   * @returns {Array} Unresolved conflicts
   */
  getUnresolvedConflicts(playerId) {
    return this.conflicts.get(playerId) || [];
  }

  /**
   * Batch sync multiple entities
   * @param {string} playerId - Player ID
   * @param {Array} entities - Entities to sync [{entityType, entityId}]
   * @returns {Promise<Object>} Batch sync result
   */
  async batchSync(playerId, entities) {
    const results = {
      success: 0,
      failed: 0,
      conflicts: 0,
      items: []
    };

    const batches = this._chunkArray(entities, this.batchSize);

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(({ entityType, entityId }) => 
          this.syncEntity(playerId, entityType, entityId)
        )
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          if (result.value.conflict) {
            results.conflicts++;
          } else if (result.value.success) {
            results.success++;
          } else {
            results.failed++;
          }
          results.items.push(result.value);
        } else {
          results.failed++;
          results.items.push({ success: false, error: result.reason.message });
        }
      }
    }

    this.emit('sync:batchCompleted', { playerId, results });
    return results;
  }

  // Private helper methods

  _generateSyncId(playerId, entityType, entityId) {
    return `${playerId}_${entityType}_${entityId}_${Date.now()}`;
  }

  _hasConflict(localData, remoteData) {
    if (!localData || !remoteData) return false;
    if (localData.version !== remoteData.version) return true;
    if (localData.checksum !== remoteData.checksum) return true;
    return false;
  }

  _createConflictRecord(localData, remoteData, syncId) {
    return {
      id: syncId,
      localData,
      remoteData,
      createdAt: Date.now(),
      entityType: localData?.entityType || 'unknown',
      entityId: localData?.entityId || 'unknown'
    };
  }

  _addConflict(playerId, conflict) {
    if (!this.conflicts.has(playerId)) {
      this.conflicts.set(playerId, []);
    }
    this.conflicts.get(playerId).push(conflict);
  }

  _getConflict(playerId, conflictId) {
    const conflicts = this.conflicts.get(playerId) || [];
    return conflicts.find(c => c.id === conflictId);
  }

  _removeConflict(playerId, conflictId) {
    if (this.conflicts.has(playerId)) {
      const conflicts = this.conflicts.get(playerId);
      const index = conflicts.findIndex(c => c.id === conflictId);
      if (index !== -1) {
        conflicts.splice(index, 1);
      }
    }
  }

  _getLocalEntityData(playerId, entityType, entityId) {
    const queue = this.syncQueues.get(playerId);
    if (!queue) return null;

    const entities = queue.get(entityType) || [];
    const entity = entities.find(e => e.entityId === entityId);
    return entity?.data || null;
  }

  async _fetchRemoteEntity(playerId, entityType, entityId) {
    // Simulate fetching remote data
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          entityType,
          entityId,
          version: 1,
          updatedAt: Date.now() - 60000,
          checksum: 'abc123'
        });
      }, 50);
    });
  }

  async _performSync(playerId, entityType, entityId, localData, remoteData) {
    // Simulate sync operation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          syncedAt: Date.now(),
          source: 'cloud',
          data: localData || remoteData
        });
      }, 100);
    });
  }

  _mergeData(localData, remoteData) {
    const merged = { ...localData };
    for (const key of Object.keys(remoteData)) {
      if (localData[key] === undefined) {
        merged[key] = remoteData[key];
      } else if (typeof localData[key] === 'object' && typeof remoteData[key] === 'object') {
        merged[key] = this._mergeData(localData[key], remoteData[key]);
      }
    }
    return merged;
  }

  async _applyResolvedData(playerId, entityType, entityId, data) {
    // Apply resolved data to local queue
    const queue = this.syncQueues.get(playerId);
    if (queue && queue.has(entityType)) {
      const entities = queue.get(entityType);
      const index = entities.findIndex(e => e.entityId === entityId);
      if (index !== -1) {
        entities[index].data = data;
        entities[index].state = SyncState.PENDING;
      }
    }
  }

  _recordSyncHistory(playerId, syncRecord) {
    if (!this.syncHistory.has(playerId)) {
      this.syncHistory.set(playerId, []);
    }
    const history = this.syncHistory.get(playerId);
    history.push(syncRecord);
    
    // Keep only last 1000 records
    if (history.length > 1000) {
      history.shift();
    }
  }

  _chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export { DataSyncEngine, SyncState, EntityType };