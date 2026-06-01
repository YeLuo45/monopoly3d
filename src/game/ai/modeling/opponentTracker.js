/**
 * OpponentTracker - Track all opponents during a game
 * Manages multiple OpponentModel instances
 */

import { OpponentModel } from './opponentModel.js';

export class OpponentTracker {
  /**
   * @param {object} memoryLayer - Memory layer for persistence (optional)
   */
  constructor(memoryLayer = null) {
    this.memoryLayer = memoryLayer;
    this.opponents = new Map(); // playerId -> OpponentModel
    this.gameId = null;
    this.createdAt = Date.now();
  }

  /**
   * Start tracking a new opponent
   * @param {string} playerId - Player ID to track
   */
  addOpponent(playerId) {
    if (this.opponents.has(playerId)) {
      return this.opponents.get(playerId); // Already tracking
    }

    const model = new OpponentModel(playerId);
    this.opponents.set(playerId, model);
    return model;
  }

  /**
   * Stop tracking an opponent
   * @param {string} playerId - Player ID to stop tracking
   */
  removeOpponent(playerId) {
    const model = this.opponents.get(playerId);
    if (model) {
      // Persist to memory layer if available
      if (this.memoryLayer) {
        this.memoryLayer.store(`opponent_model_${playerId}`, model.toJSON());
      }
      this.opponents.delete(playerId);
    }
  }

  /**
   * Get model for specific opponent
   * @param {string} playerId - Player ID
   * @returns {OpponentModel|null}
   */
  getOpponentModel(playerId) {
    return this.opponents.get(playerId) || null;
  }

  /**
   * Get all tracked opponent IDs
   * @returns {string[]} Array of player IDs
   */
  getAllOpponents() {
    return Array.from(this.opponents.keys());
  }

  /**
   * Get all opponent models
   * @returns {OpponentModel[]} Array of all models
   */
  getAllModels() {
    return Array.from(this.opponents.values());
  }

  /**
   * Update all opponent models from a game event
   * @param {object} event - Event object { type, playerId, data }
   * @param {object} data - Additional event data
   */
  updateAllFromEvent(event, data = {}) {
    const eventType = event.type || event;
    const playerId = event.playerId || event.actor || data.playerId;

    // Update specific player if identified
    if (playerId && this.opponents.has(playerId)) {
      const model = this.opponents.get(playerId);
      model.updateProfile(eventType, event.data || data);
    }

    // Update all models with global events (not player-specific)
    const globalEvents = ['game_phase_change', 'turn_start', 'turn_end'];
    if (globalEvents.includes(eventType)) {
      for (const model of this.opponents.values()) {
        model.updateProfile(eventType, event.data || data);
      }
    }

    // Update all models with opponent info for relevant events
    const opponentEvents = ['trade_offered', 'trade_accepted', 'trade_rejected'];
    if (opponentEvents.includes(eventType) && data.opponentId) {
      const opponentModel = this.opponents.get(data.opponentId);
      if (opponentModel) {
        opponentModel.updateProfile(eventType, data);
      }
    }
  }

  /**
   * Get comprehensive info on all opponents
   * @returns {object[]} Array of opponent profiles
   */
  getAllProfiles() {
    return this.getAllModels().map(model => model.getProfile());
  }

  /**
   * Find the most exploitable opponent
   * @returns {object} {playerId, model, exploitCount}
   */
  findMostExploitable() {
    let best = null;
    let maxExploits = 0;

    for (const [playerId, model] of this.opponents) {
      // Count exploitable traits
      const exploits = this._countExploitableTraits(model);
      if (exploits > maxExploits) {
        maxExploits = exploits;
        best = { playerId, model, exploitCount: exploits };
      }
    }

    return best;
  }

  _countExploitableTraits(model) {
    let count = 0;
    const traits = model.getProfile().traits;

    // Non-balanced traits are exploitable
    if (traits.riskTolerance !== 'balanced') count++;
    if (traits.tradingStyle !== 'fair') count++;
    if (traits.propertyFocus !== 'rent') count++;
    if (traits.reactionSpeed !== 'normal') count++;

    return count;
  }

  /**
   * Get opponent with specific trait
   * @param {string} traitType - Trait type (riskTolerance, tradingStyle, etc.)
   * @param {string} traitValue - Desired trait value
   * @returns {string|null} Player ID or null
   */
  findOpponentWithTrait(traitType, traitValue) {
    for (const [playerId, model] of this.opponents) {
      const profile = model.getProfile();
      if (profile.traits[traitType] === traitValue) {
        return playerId;
      }
    }
    return null;
  }

  /**
   * Save all opponent data to memory layer
   */
  persist() {
    if (!this.memoryLayer) return;

    for (const [playerId, model] of this.opponents) {
      this.memoryLayer.store(`opponent_model_${playerId}`, model.toJSON());
    }
    
    // Store tracker state
    this.memoryLayer.store('opponent_tracker', {
      playerIds: this.getAllOpponents(),
      gameId: this.gameId,
      createdAt: this.createdAt,
    });
  }

  /**
   * Load opponent data from memory layer
   * @param {string} playerId - Player ID to load
   * @returns {OpponentModel|null}
   */
  load(playerId) {
    if (!this.memoryLayer) return null;

    const data = this.memoryLayer.retrieve(`opponent_model_${playerId}`);
    if (data) {
      return OpponentModel.fromJSON(data);
    }
    return null;
  }

  /**
   * Clear all tracked opponents
   */
  clear() {
    this.opponents.clear();
    this.gameId = null;
  }

  /**
   * Set current game ID
   * @param {string} gameId - Game ID
   */
  setGameId(gameId) {
    this.gameId = gameId;
  }

  /**
   * Get summary statistics
   * @returns {object} Summary of all tracking
   */
  getSummary() {
    return {
      opponentCount: this.opponents.size,
      gameId: this.gameId,
      createdAt: this.createdAt,
      trackedPlayers: this.getAllOpponents(),
      totalEvents: this.getAllModels().reduce((sum, m) => sum + m.events.length, 0),
    };
  }
}