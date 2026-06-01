/**
 * AIMemoryLayer - Multi-level memory system for game AI
 * 
 * Inspired by nanobot L0-L4 Memory pattern:
 * - L0: Raw events (event history, no processing)
 * - L1: Processed patterns (aggregated per-game stats)
 * - L2: Player models (individual player behavior profiles)
 * - L3: Strategic insights (learned rules from player behavior)
 * - L4: Cross-game memory (persisted across sessions)
 */

import { PlayerModel } from './playerModel.js';

export const MEMORY_LEVELS = {
  L0_RAW: 'L0',
  L1_PROCESSED: 'L1',
  L2_PLAYER: 'L2',
  L3_PATTERNS: 'L3',
  L4_CROSS_GAME: 'L4',
};

const STORAGE_KEY = 'monopoly3d_ai_memory';

export class AIMemoryLayer {
  constructor(eventBus) {
    this.eventBus = eventBus;
    
    // Memory stores by level
    this.l0_rawEvents = [];          // Raw event history
    this.l1_processed = {};          // Aggregated per-game stats
    this.l2_playerModels = {};       // playerId -> PlayerModel
    this.l3_learnedPatterns = [];    // Detected pattern sequences
    this.l4_crossGame = {};          // Persisted cross-game memory
    
    // Current game tracking
    this.currentGameId = null;
    this.currentGameStats = {};
    
    // Pattern detection
    this.patternWindow = 5;  // Number of events to consider for pattern
    this.patternMinFrequency = 2;  // Min occurrences to learn pattern
    
    // Event subscriptions
    this._subscriptions = [];
    
    // Initialize
    this._setupEventSubscriptions();
  }

  /**
   * Subscribe to relevant game events
   */
  _setupEventSubscriptions() {
    const events = [
      'property_purchase',
      'rent_paid',
      'rent_received',
      'dice_roll',
      'tile_visit',
      'question_answered',
      'turn_change',
      'game_start',
      'game_end',
      'property_buy_decision',
    ];

    events.forEach(eventType => {
      const handler = (eventObj) => {
        // In Node.js, the eventObj has structure: { type, detail, timestamp }
        // In browser, it's CustomEvent with eventObj.detail
        const eventData = eventObj.detail !== undefined ? eventObj.detail : eventObj;
        this.ingest(eventType, eventData);
      };
      this._subscriptions.push(
        this.eventBus.subscribe(eventType, handler)
      );
    });
  }

  /**
   * Clean up event subscriptions
   */
  destroy() {
    this._subscriptions.forEach(unsub => unsub());
    this._subscriptions = [];
  }

  /**
   * Ingest a raw event and process it into memory
   * @param {string} event - Event type
   * @param {object} data - Event data (can be raw event object from EventBus or just data)
   */
  ingest(event, data = {}) {
    const timestamp = Date.now();
    
    // In Node.js (testing), the event object has type and detail properties
    // In browser, it's dispatched with CustomEvent detail
    // Handle both cases: data could be { type, detail } or just { gameId, ... }
    let eventData;
    if (data && data.detail !== undefined) {
      eventData = data.detail;
    } else if (data && data.type && data !== event) {
      // Some events come as { type: 'event_name', detail: {...} }
      eventData = data.detail || data;
    } else {
      eventData = data;
    }
    
    // L0: Store raw event
    const rawEvent = {
      type: event,
      data: eventData,
      timestamp,
      gameId: this.currentGameId,
    };
    this.l0_rawEvents.push(rawEvent);
    
    // Limit L0 size
    const maxRawEvents = 1000;
    if (this.l0_rawEvents.length > maxRawEvents) {
      this.l0_rawEvents = this.l0_rawEvents.slice(-maxRawEvents);
    }
    
    // Process based on event type
    this._processEvent(event, data, timestamp);
    
    // L3: Pattern learning
    this._updatePatterns(event, data, timestamp);
    
    return rawEvent;
  }

  /**
   * Process event into appropriate memory levels
   */
  _processEvent(event, data, timestamp) {
    const playerId = data.playerId;
    
    switch (event) {
      case 'game_start':
        this._handleGameStart(data, timestamp);
        break;
      case 'game_end':
        this._handleGameEnd(data, timestamp);
        break;
      case 'property_purchase':
        this._handlePropertyPurchase(data, timestamp);
        break;
      case 'rent_paid':
        this._handleRentPaid(data, timestamp);
        break;
      case 'rent_received':
        this._handleRentReceived(data, timestamp);
        break;
      case 'dice_roll':
        this._handleDiceRoll(data, timestamp);
        break;
      case 'tile_visit':
        this._handleTileVisit(data, timestamp);
        break;
      case 'question_answered':
        this._handleQuestionAnswered(data, timestamp);
        break;
      case 'turn_change':
        this._handleTurnChange(data, timestamp);
        break;
    }
    
    // L2: Update player model if player identified
    if (playerId) {
      this.updatePlayerModel(playerId, event, data);
    }
  }

  _handleGameStart(data, timestamp) {
    this.currentGameId = data.gameId || `game_${timestamp}`;
    this.currentGameStats = {
      gameId: this.currentGameId,
      startTime: timestamp,
      propertiesBought: 0,
      totalRentPaid: 0,
      totalRentReceived: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      diceRolls: [],
      tilesVisited: new Set(),
    };
    
    // Initialize L1 for this game
    if (!this.l1_processed[this.currentGameId]) {
      this.l1_processed[this.currentGameId] = {
        gameId: this.currentGameId,
        startTime: timestamp,
        events: [],
      };
    }
  }

  _handleGameEnd(data, timestamp) {
    if (!this.currentGameId) return;
    
    this.currentGameStats.endTime = timestamp;
    this.currentGameStats.duration = timestamp - this.currentGameStats.startTime;
    
    // L1: Finalize game stats
    if (this.l1_processed[this.currentGameId]) {
      this.l1_processed[this.currentGameId] = {
        ...this.l1_processed[this.currentGameId],
        ...this.currentGameStats,
        tilesVisited: Array.from(this.currentGameStats.tilesVisited || new Set()),
      };
    }
    
    // Store in L4 cross-game memory
    this._updateCrossGameMemory();
    
    this.currentGameId = null;
    this.currentGameStats = {};
  }

  _handlePropertyPurchase(data, timestamp) {
    if (!this.currentGameId) return;
    
    this.currentGameStats.propertiesBought++;
    
    if (this.l1_processed[this.currentGameId]) {
      this.l1_processed[this.currentGameId].events.push({
        type: 'property_purchase',
        tileId: data.tileId,
        price: data.price,
        playerId: data.playerId,
        timestamp,
      });
    }
  }

  _handleRentPaid(data, timestamp) {
    if (!this.currentGameId) return;
    
    this.currentGameStats.totalRentPaid += data.amount || 0;
    
    if (this.l1_processed[this.currentGameId]) {
      this.l1_processed[this.currentGameId].events.push({
        type: 'rent_paid',
        amount: data.amount,
        from: data.from,
        to: data.to,
        tileId: data.tileId,
        timestamp,
      });
    }
  }

  _handleRentReceived(data, timestamp) {
    if (!this.currentGameId) return;
    
    this.currentGameStats.totalRentReceived += data.amount || 0;
  }

  _handleDiceRoll(data, timestamp) {
    if (!this.currentGameId) return;
    
    if (data.values) {
      this.currentGameStats.diceRolls.push(...data.values);
    }
    
    if (this.l1_processed[this.currentGameId]) {
      this.l1_processed[this.currentGameId].events.push({
        type: 'dice_roll',
        values: data.values,
        playerId: data.playerId,
        timestamp,
      });
    }
  }

  _handleTileVisit(data, timestamp) {
    if (!this.currentGameId) return;
    
    this.currentGameStats.tilesVisited.add(data.tileId);
    
    if (this.l1_processed[this.currentGameId]) {
      this.l1_processed[this.currentGameId].events.push({
        type: 'tile_visit',
        tileId: data.tileId,
        playerId: data.playerId,
        timestamp,
      });
    }
  }

  _handleQuestionAnswered(data, timestamp) {
    if (!this.currentGameId) return;
    
    this.currentGameStats.questionsAnswered++;
    if (data.correct) {
      this.currentGameStats.correctAnswers++;
    }
    
    if (this.l1_processed[this.currentGameId]) {
      this.l1_processed[this.currentGameId].events.push({
        type: 'question_answered',
        category: data.category,
        correct: data.correct,
        playerId: data.playerId,
        timestamp,
      });
    }
  }

  _handleTurnChange(data, timestamp) {
    if (!this.currentGameId) return;
    
    if (this.l1_processed[this.currentGameId]) {
      this.l1_processed[this.currentGameId].events.push({
        type: 'turn_change',
        playerId: data.playerId,
        turnNumber: data.turnNumber,
        timestamp,
      });
    }
  }

  /**
   * Update player model at L2
   * @param {string} playerId - Player ID
   * @param {string} event - Event type
   * @param {object} data - Event data
   */
  updatePlayerModel(playerId, event, data) {
    if (!this.l2_playerModels[playerId]) {
      this.l2_playerModels[playerId] = new PlayerModel(playerId);
    }
    
    this.l2_playerModels[playerId].recordAction(event, data);
  }

  /**
   * Get player model at L2
   * @param {string} playerId - Player ID
   * @returns {object|null} Player profile or null
   */
  getPlayerModel(playerId) {
    const model = this.l2_playerModels[playerId];
    return model ? model.getProfile() : null;
  }

  /**
   * Get all player models
   * @returns {object} Map of playerId -> profile
   */
  getAllPlayerModels() {
    const result = {};
    Object.keys(this.l2_playerModels).forEach(playerId => {
      result[playerId] = this.l2_playerModels[playerId].getProfile();
    });
    return result;
  }

  /**
   * Update learned patterns at L3
   */
  _updatePatterns(event, data, timestamp) {
    // Add to recent event sequence
    const recentEvents = this.l0_rawEvents.slice(-this.patternWindow);
    
    // Create pattern key from recent events
    const patternKey = recentEvents
      .slice(-this.patternWindow)
      .map(e => e.type)
      .join('->');
    
    if (patternKey.length > 0) {
      // Find existing pattern
      const existing = this.l3_learnedPatterns.find(p => p.pattern === patternKey);
      
      if (existing) {
        existing.frequency++;
        existing.lastSeen = timestamp;
        existing.events.push({ event, data, timestamp });
      } else {
        this.l3_learnedPatterns.push({
          pattern: patternKey,
          frequency: 1,
          lastSeen: timestamp,
          firstSeen: timestamp,
          events: [{ event, data, timestamp }],
        });
      }
    }
    
    // Clean up low-frequency patterns periodically
    if (this.l3_learnedPatterns.length > 100) {
      this.l3_learnedPatterns = this.l3_learnedPatterns.filter(
        p => p.frequency >= this.patternMinFrequency
      );
    }
  }

  /**
   * Learn a specific pattern from event sequence
   * @param {Array<string>} eventSequence - Array of event types
   * @returns {object} Learned pattern info
   */
  learnPattern(eventSequence) {
    const pattern = eventSequence.join('->');
    const timestamp = Date.now();
    
    const existing = this.l3_learnedPatterns.find(p => p.pattern === pattern);
    if (existing) {
      existing.frequency++;
      existing.lastSeen = timestamp;
      return existing;
    }
    
    const newPattern = {
      pattern,
      frequency: 1,
      firstSeen: timestamp,
      lastSeen: timestamp,
      events: [],
    };
    
    this.l3_learnedPatterns.push(newPattern);
    return newPattern;
  }

  /**
   * Get all learned patterns
   * @returns {Array} Array of pattern objects
   */
  getLearnedPatterns() {
    return this.l3_learnedPatterns
      .filter(p => p.frequency >= this.patternMinFrequency)
      .map(p => ({
        pattern: p.pattern,
        frequency: p.frequency,
        lastSeen: p.lastSeen,
      }));
  }

  /**
   * Update cross-game memory at L4
   */
  _updateCrossGameMemory() {
    if (!this.currentGameStats.gameId) return;
    
    const gameId = this.currentGameStats.gameId;
    
    // Aggregate stats across all games
    if (!this.l4_crossGame.aggregateStats) {
      this.l4_crossGame.aggregateStats = {
        totalGames: 0,
        totalPropertiesBought: 0,
        totalRentPaid: 0,
        totalQuestionsAnswered: 0,
        avgDiceRoll: 0,
        allDiceRolls: [],
      };
    }
    
    const agg = this.l4_crossGame.aggregateStats;
    agg.totalGames++;
    agg.totalPropertiesBought += this.currentGameStats.propertiesBought || 0;
    agg.totalRentPaid += this.currentGameStats.totalRentPaid || 0;
    agg.totalQuestionsAnswered += this.currentGameStats.questionsAnswered || 0;
    
    if (this.currentGameStats.diceRolls) {
      agg.allDiceRolls.push(...this.currentGameStats.diceRolls);
      agg.avgDiceRoll = agg.allDiceRolls.reduce((a, b) => a + b, 0) / agg.allDiceRolls.length;
    }
    
    // Store recent game summaries
    if (!this.l4_crossGame.recentGames) {
      this.l4_crossGame.recentGames = [];
    }
    
    this.l4_crossGame.recentGames.push({
      gameId,
      startTime: this.currentGameStats.startTime,
      endTime: this.currentGameStats.endTime,
      duration: this.currentGameStats.duration,
      propertiesBought: this.currentGameStats.propertiesBought,
      rentPaid: this.currentGameStats.totalRentPaid,
    });
    
    // Keep only last 20 games
    if (this.l4_crossGame.recentGames.length > 20) {
      this.l4_crossGame.recentGames = this.l4_crossGame.recentGames.slice(-20);
    }
    
    // Copy player models to L4 for persistence
    this.l4_crossGame.playerProfiles = {};
    Object.keys(this.l2_playerModels).forEach(playerId => {
      this.l4_crossGame.playerProfiles[playerId] = 
        this.l2_playerModels[playerId].toJSON();
    });
  }

  /**
   * Get memories at a specific level
   * @param {string} level - Memory level (L0, L1, L2, L3, L4)
   * @returns {*} Memory data at that level
   */
  getMemory(level) {
    switch (level) {
      case MEMORY_LEVELS.L0_RAW:
        return [...this.l0_rawEvents];
      case MEMORY_LEVELS.L1_PROCESSED:
        return { ...this.l1_processed };
      case MEMORY_LEVELS.L2_PLAYER:
        return this.getAllPlayerModels();
      case MEMORY_LEVELS.L3_PATTERNS:
        return this.getLearnedPatterns();
      case MEMORY_LEVELS.L4_CROSS_GAME:
        return { ...this.l4_crossGame };
      default:
        return null;
    }
  }

  /**
   * Query memories (semantic-like query on memories)
   * @param {object} query - Query object
   * @returns {Array} Matching events/memories
   */
  query(query) {
    const { type, playerId, level, limit, pattern } = query;
    let results = [];
    
    // Determine which level to query
    const queryLevel = level || MEMORY_LEVELS.L0_RAW;
    
    switch (queryLevel) {
      case MEMORY_LEVELS.L0_RAW:
        results = this._queryL0(query);
        break;
      case MEMORY_LEVELS.L1_PROCESSED:
        results = this._queryL1(query);
        break;
      case MEMORY_LEVELS.L2_PLAYER:
        results = this._queryL2(query);
        break;
      case MEMORY_LEVELS.L3_PATTERNS:
        results = this._queryL3(query);
        break;
      default:
        results = this._queryL0(query);
    }
    
    // Apply pattern matching if specified
    if (pattern) {
      results = results.filter(r => {
        const str = JSON.stringify(r).toLowerCase();
        return str.toLowerCase().includes(pattern.toLowerCase());
      });
    }
    
    // Apply limit
    if (limit && limit > 0) {
      results = results.slice(-limit);
    }
    
    return results;
  }

  _queryL0(query) {
    let events = [...this.l0_rawEvents];
    
    if (query.type) {
      events = events.filter(e => e.type === query.type);
    }
    if (query.playerId) {
      events = events.filter(e => e.data && e.data.playerId === query.playerId);
    }
    if (query.gameId) {
      events = events.filter(e => e.gameId === query.gameId);
    }
    
    return events;
  }

  _queryL1(query) {
    let games = Object.values(this.l1_processed);
    
    if (query.gameId) {
      games = games.filter(g => g.gameId === query.gameId);
    }
    
    return games;
  }

  _queryL2(query) {
    const results = [];
    
    if (query.playerId) {
      const model = this.l2_playerModels[query.playerId];
      if (model) {
        results.push(model.getProfile());
      }
    } else {
      results.push(...Object.values(this.getAllPlayerModels()));
    }
    
    if (query.playStyle) {
      return results.filter(r => r.playStyle === query.playStyle);
    }
    
    return results;
  }

  _queryL3(query) {
    let patterns = this.getLearnedPatterns();
    
    if (query.minFrequency) {
      patterns = patterns.filter(p => p.frequency >= query.minFrequency);
    }
    if (query.pattern) {
      patterns = patterns.filter(p => p.pattern.includes(query.pattern));
    }
    
    return patterns;
  }

  /**
   * Save memory to persistent storage (L4)
   */
  saveToStorage() {
    try {
      const data = {
        version: 1,
        timestamp: Date.now(),
        l4_crossGame: this.l4_crossGame,
        l3_learnedPatterns: this.l3_learnedPatterns.map(p => ({
          pattern: p.pattern,
          frequency: p.frequency,
          firstSeen: p.firstSeen,
          lastSeen: p.lastSeen,
        })),
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Failed to save AI memory:', e);
      return false;
    }
  }

  /**
   * Load memory from persistent storage (L4)
   */
  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return false;
      
      const data = JSON.parse(saved);
      
      // Restore L4 cross-game memory
      if (data.l4_crossGame) {
        this.l4_crossGame = data.l4_crossGame;
        
        // Restore player models from profiles
        if (data.l4_crossGame.playerProfiles) {
          Object.entries(data.l4_crossGame.playerProfiles).forEach(([playerId, json]) => {
            this.l2_playerModels[playerId] = PlayerModel.fromJSON(json);
          });
        }
      }
      
      // Restore patterns
      if (data.l3_learnedPatterns) {
        this.l3_learnedPatterns = data.l3_learnedPatterns;
      }
      
      return true;
    } catch (e) {
      console.error('Failed to load AI memory:', e);
      return false;
    }
  }

  /**
   * Clear all memory
   */
  clearMemory() {
    this.l0_rawEvents = [];
    this.l1_processed = {};
    this.l2_playerModels = {};
    this.l3_learnedPatterns = [];
    this.l4_crossGame = {};
    this.currentGameId = null;
    this.currentGameStats = {};
  }

  /**
   * Clear only session memory (L0, L1, L2)
   */
  clearSessionMemory() {
    this.l0_rawEvents = [];
    this.l1_processed = {};
    this.l2_playerModels = {};
    this.currentGameId = null;
    this.currentGameStats = {};
  }
}