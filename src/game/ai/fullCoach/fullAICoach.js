/**
 * FullAICoach - Complete AI Coaching System (Direction B v9)
 * 
 * Integrates all v1-v8 components into a unified coaching experience:
 * - L0-L4 Memory for context
 * - Embedding for situation matching
 * - StrategyAdvisor for recommendations
 * - LearningCoach for lesson context
 * - OpponentTracker for opponent-aware advice
 * - PerformanceDashboard for progress tracking
 */

import { L0_RawEventCache } from '../memory/l0_rawEventCache.js';
import { L1_SemanticMemory } from '../memory/l1_semanticMemory.js';
import { L2_WorkingMemory } from '../memory/l2_workingMemory.js';
import { L3_LongTermMemory } from '../memory/l3_longTermMemory.js';
import { L4_MetaCognition } from '../memory/l4_metaCognition.js';
import { SituationEncoder } from '../embedding/situationEncoder.js';
import { EmbeddingIndex } from '../embedding/embeddingIndex.js';
import { StrategyAdvisor } from '../advisor/strategyAdvisor.js';
import { LearningCoach, LESSON_IDS } from '../coach/learningCoach.js';
import { OpponentTracker } from '../modeling/opponentTracker.js';
import { PerformanceDashboard } from '../dashboard/performanceDashboard.js';
import { DecisionPatternAnalyzer } from '../analysis/decisionPatternAnalyzer.js';

export class FullAICoach {
  /**
   * @param {object} gameState - Initial game state
   * @param {string} playerId - Player ID to coach
   */
  constructor(gameState = {}, playerId = 'player1') {
    this.playerId = playerId;
    this.gameId = null;
    
    // Subsystem references
    this.memoryLayer = null;
    this.embedding = null;
    this.situationEncoder = null;
    this.advisor = null;
    this.coach = null;
    this.opponentTracker = null;
    this.dashboard = null;
    this.decisionAnalyzer = null;
    
    // Coaching state
    this.isInitialized = false;
    this.currentGameState = null;
    this.coachingActive = false;
    this.adviceHistory = [];
    
    // Event bus for subsystem communication
    this.eventBus = this._createEventBus();
    
    // Configuration
    this.config = {
      enableRealTimeFeedback: true,
      enableOpponentTracking: true,
      enableLessonProgress: true,
      adviceRefreshRate: 2000, // ms between advice updates
      maxAdviceHistory: 50,
    };
  }

  /**
   * Initialize all subsystems with the given game state
   * @param {object} gameState - Game state to initialize with
   * @param {string} playerId - Player ID to coach
   */
  initialize(gameState, playerId) {
    this.playerId = playerId;
    this.gameId = gameState.gameId || `game_${Date.now()}`;
    this.currentGameState = gameState;
    
    // Create memory layer (L0-L4)
    this.memoryLayer = this._createMemoryLayer();
    
    // Create embedding system
    this.situationEncoder = new SituationEncoder();
    this.embedding = new EmbeddingIndex(this.situationEncoder);
    
    // Create decision analyzer
    this.decisionAnalyzer = new DecisionPatternAnalyzer(this.memoryLayer);
    
    // Create strategy advisor
    this.advisor = new StrategyAdvisor(
      this.memoryLayer,
      this.embedding,
      this.decisionAnalyzer
    );
    
    // Create learning coach
    this.coach = new LearningCoach(this.memoryLayer, this.advisor);
    this.coach.startCoachSession(this.playerId);
    
    // Create opponent tracker
    this.opponentTracker = new OpponentTracker(this.memoryLayer);
    
    // Create performance dashboard
    this.dashboard = new PerformanceDashboard(
      this.memoryLayer,
      this.memoryLayer?.l4 // metaCognition
    );
    
    // Wire subsystems together via event bus
    this._wireEventBus();
    
    this.isInitialized = true;
    this.coachingActive = true;
    
    return this;
  }

  /**
   * Create the memory layer (L0-L4 hierarchy)
   * @returns {object} Memory layer with all levels
   */
  _createMemoryLayer() {
    const l0 = new L0_RawEventCache(10000);
    const l1 = new L1_SemanticMemory(l0);
    const l2 = new L2_WorkingMemory(l1);
    const l3 = new L3_LongTermMemory(l2);
    const l4 = new L4_MetaCognition(l3);
    
    return { l0, l1, l2, l3, l4 };
  }

  /**
   * Create event bus for subsystem communication
   * @returns {object} Event bus with subscribe/publish
   */
  _createEventBus() {
    const handlers = {};
    
    return {
      subscribe: (event, handler) => {
        if (!handlers[event]) handlers[event] = [];
        handlers[event].push(handler);
        return () => {
          handlers[event] = handlers[event].filter(h => h !== handler);
        };
      },
      publish: (event, data) => {
        if (handlers[event]) {
          handlers[event].forEach(h => {
            try {
              h(data);
            } catch (e) {
              console.warn(`Event handler error for ${event}:`, e);
            }
          });
        }
      },
    };
  }

  /**
   * Wire event bus to all subsystems for communication
   */
  _wireEventBus() {
    // Memory events propagate to all subscribers
    const memoryEvents = ['player_action', 'game_state_change', 'decision_made'];
    
    memoryEvents.forEach(event => {
      this.eventBus.subscribe(event, (data) => {
        if (this.memoryLayer?.l0) {
          this.memoryLayer.l0.push(event, data);
        }
      });
    });
  }

  /**
   * Get comprehensive coaching advice for current game state
   * @param {object} gameState - Current game state (optional, uses cached if not provided)
   * @returns {object} {primaryAdvice, reasoning, confidence, relatedLessons, phase, opponents}
   */
  getCoachingAdvice(gameState = null) {
    if (!this.isInitialized) {
      return this._emptyAdvice('Coach not initialized');
    }
    
    if (gameState) {
      this.currentGameState = gameState;
    }
    
    if (!this.currentGameState) {
      return this._emptyAdvice('No game state available');
    }
    
    // Get situation context
    const context = this._getSituationContext();
    
    // Get strategy recommendation from advisor
    const strategy = this.advisor.suggestNextMove(this.playerId, this.currentGameState);
    
    // Get lesson context from coach
    const lessonContext = this._getLessonContext();
    
    // Get opponent-aware advice
    const opponentAdvice = this._getOpponentAdvice();
    
    // Determine primary advice based on game phase
    const phase = this._getGamePhase();
    const primaryAdvice = this._determinePrimaryAdvice(strategy, phase, opponentAdvice);
    
    // Calculate confidence score
    const confidence = this._calculateConfidence(strategy, context);
    
    // Build related lessons from coach
    const relatedLessons = this._getRelatedLessons(strategy, lessonContext);
    
    const advice = {
      primaryAdvice,
      reasoning: this._generateReasoning(strategy, context, phase),
      confidence,
      phase,
      relatedLessons,
      opponentAnalysis: opponentAdvice,
      context,
      timestamp: Date.now(),
    };
    
    // Cache advice
    this._cacheAdvice(advice);
    
    return advice;
  }

  /**
   * Get real-time feedback on a player's action
   * @param {object} action - Action to evaluate { type, target, amount, etc. }
   * @param {object} gameState - Current game state
   * @returns {object} { feedback, score, suggestions }
   */
  getRealtimeFeedback(action, gameState) {
    if (!this.isInitialized || !this.config.enableRealTimeFeedback) {
      return { feedback: '', score: 0, suggestions: [] };
    }
    
    this.currentGameState = gameState;
    
    // Store action in memory
    this._recordAction(action, gameState);
    
    // Evaluate action based on type
    let feedback = '';
    let score = 0.5;
    let suggestions = [];
    
    switch (action.type) {
      case 'buy_property':
        const propertyEval = this._evaluatePropertyPurchase(action, gameState);
        feedback = propertyEval.feedback;
        score = propertyEval.score;
        suggestions = propertyEval.suggestions;
        break;
        
      case 'build_house':
        const buildEval = this._evaluateBuildAction(action, gameState);
        feedback = buildEval.feedback;
        score = buildEval.score;
        suggestions = buildEval.suggestions;
        break;
        
      case 'trade':
        const tradeEval = this._evaluateTrade(action, gameState);
        feedback = tradeEval.feedback;
        score = tradeEval.score;
        suggestions = tradeEval.suggestions;
        break;
        
      case 'mortgage':
        feedback = this._evaluateMortgage(action, gameState);
        score = 0.6;
        break;
        
      case 'pay_rent':
        feedback = this._evaluateRentPayment(action, gameState);
        score = 0.5;
        break;
        
      default:
        feedback = this._getGenericFeedback(action, gameState);
        score = 0.5;
    }
    
    // Update decision analyzer
    if (this.decisionAnalyzer?.recordDecision) {
      try {
        this.decisionAnalyzer.recordDecision({
          action,
          score,
          timestamp: Date.now(),
        });
      } catch (e) {
        // Ignore errors in decision recording
      }
    }
    
    return { feedback, score, suggestions };
  }

  /**
   * Called when a new game starts
   * @param {object} gameState - Game state at start
   */
  onGameStart(gameState) {
    if (!this.isInitialized) {
      this.initialize(gameState, this.playerId);
    }
    
    this.currentGameState = gameState;
    this.gameId = gameState.gameId || this.gameId;
    this.adviceHistory = [];
    
    // Initialize opponent tracking for all players
    if (gameState.players) {
      for (const player of gameState.players) {
        if (player.id !== this.playerId) {
          this.opponentTracker?.addOpponent(player.id);
        }
      }
    }
    
    // Reset coaching session
    this.coach?.startCoachSession(this.playerId);
    
    this.eventBus.publish('game_start', { gameState, playerId: this.playerId });
  }

  /**
   * Called when the current game ends
   * @param {object} gameState - Final game state
   * @param {object} result - { winner, placement, rewards }
   */
  onGameEnd(gameState, result) {
    this.currentGameState = gameState;
    
    // Record game result in memory
    this._recordGameResult(gameState, result);
    
    // Update dashboard with game metrics
    if (this.dashboard?.recordGameResult) {
      try {
        this.dashboard.recordGameResult(this.playerId, result);
      } catch (e) {
        // Ignore dashboard errors
      }
    }
    
    // End coaching session
    if (this.coach?.endCoachSession) {
      try {
        this.coach.endCoachSession(this.playerId);
      } catch (e) {
        // Ignore coach session errors
      }
    }
    
    // Update opponent models
    this.opponentTracker?.updateAllFromEvent({ type: 'game_end', data: result });
    
    this.eventBus.publish('game_end', { gameState, result, playerId: this.playerId });
  }

  /**
   * Called at the end of each turn
   * @param {object} gameState - Current game state
   */
  onTurnEnd(gameState) {
    this.currentGameState = gameState;
    
    // Record turn in memory
    if (this.memoryLayer?.l2?.addDecision) {
      try {
        this.memoryLayer.l2.addDecision({
          type: 'turn_end',
          turn: gameState.turn,
          position: this._getPlayerPosition(gameState),
          assets: this._getPlayerAssets(gameState),
        });
      } catch (e) {
        // Ignore addDecision errors
      }
    }
    
    // Update opponent profiles
    this.opponentTracker?.updateAllFromEvent({
      type: 'turn_end',
      playerId: gameState.currentPlayer,
    });
    
    this.eventBus.publish('turn_end', { gameState, playerId: this.playerId });
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Get situation context from embedding and memory
   * @returns {object} Context data
   */
  _getSituationContext() {
    const state = this.currentGameState;
    if (!state) return {};
    
    // Get encoded situation
    const encoded = this.situationEncoder?.encode(state) || {};
    
    // Get player-specific memory
    const recentDecisions = this.memoryLayer?.l2?.getRecentDecisions?.(10) || [];
    
    return {
      situation: encoded.summary || 'unknown',
      tokens: encoded.tokens || [],
      fingerprint: encoded.fingerprint || '',
      playerMoney: this._getPlayerMoney(state),
      playerPosition: this._getPlayerPosition(state),
      propertyCount: this._getPropertyCount(state),
      recentDecisions,
    };
  }

  /**
   * Get lesson context from learning coach
   * @returns {object} Lesson context
   */
  _getLessonContext() {
    if (!this.coach) return {};
    
    let lessonProgress = {};
    let currentLesson = null;
    
    if (this.coach.getLessonProgress) {
      lessonProgress = this.coach.getLessonProgress(this.playerId) || {};
    }
    
    if (this.coach.getCurrentLesson) {
      currentLesson = this.coach.getCurrentLesson(this.playerId);
    } else {
      // Fallback: find first incomplete lesson
      const lessons = this.coach.getAllLessons?.() || [];
      currentLesson = lessons.find(l => !lessonProgress[l.id]?.completed) || null;
    }
    
    return {
      lessonProgress,
      currentLesson,
      completedLessons: this.coach.getCompletedLessons 
        ? this.coach.getCompletedLessons(this.playerId) 
        : [],
      activeTips: this.coach.getActiveTips 
        ? this.coach.getActiveTips(this.playerId) 
        : [],
    };
  }

  /**
   * Get opponent-aware advice
   * @returns {object} Opponent analysis and recommendations
   */
  _getOpponentAdvice() {
    if (!this.opponentTracker) return {};
    
    const profiles = this.opponentTracker.getAllProfiles();
    const exploitable = this.opponentTracker.findMostExploitable();
    
    return {
      opponentCount: profiles.length,
      profiles,
      exploitableOpponent: exploitable ? {
        playerId: exploitable.playerId,
        exploitCount: exploitable.exploitCount,
      } : null,
    };
  }

  /**
   * Determine primary advice based on strategy and phase
   * @param {object} strategy - Strategy from advisor
   * @param {string} phase - Game phase
   * @param {object} opponentAdvice - Opponent analysis
   * @returns {string} Primary advice text
   */
  _determinePrimaryAdvice(strategy, phase, opponentAdvice) {
    if (!strategy?.primary) return 'Make a conservative move';
    
    const action = strategy.primary.action || {};
    
    // Override with phase-specific advice
    if (phase === 'early') {
      return action.type === 'buy_property' 
        ? 'Consider buying this property - early acquisition is key'
        : 'Focus on property acquisition';
    }
    
    if (phase === 'mid') {
      return 'Build your empire strategically - balance offense and defense';
    }
    
    if (phase === 'late') {
      return opponentAdvice?.exploitableOpponent
        ? `Exploit ${opponentAdvice.exploitableOpponent.playerId}'s weaknesses`
        : 'Maximize your rent income and close out the game';
    }
    
    return strategy.primary.reasoning || 'Continue building your position';
  }

  /**
   * Calculate confidence score for advice
   * @param {object} strategy - Strategy recommendation
   * @param {object} context - Situation context
   * @returns {number} Confidence 0-1
   */
  _calculateConfidence(strategy, context) {
    if (!strategy?.primary) return 0.3;
    
    let confidence = strategy.primary.confidence || 0.5;
    
    // Boost confidence based on memory match quality
    if (context.recentDecisions?.length > 5) {
      confidence = Math.min(0.95, confidence + 0.1);
    }
    
    // Reduce confidence if in unfamiliar territory
    if (!context.fingerprint) {
      confidence *= 0.8;
    }
    
    return Math.round(confidence * 100) / 100;
  }

  /**
   * Get related lessons from coach
   * @param {object} strategy - Strategy recommendation
   * @param {object} lessonContext - Lesson context
   * @returns {Array} Related lesson IDs
   */
  _getRelatedLessons(strategy, lessonContext) {
    const lessons = [];
    
    // Map strategy type to relevant lessons
    if (strategy?.phase === 'early') {
      lessons.push(LESSON_IDS.MONOPOLY_STRATEGY);
    }
    
    if (strategy?.phase === 'mid') {
      lessons.push(LESSON_IDS.RISK_MANAGEMENT);
    }
    
    if (strategy?.phase === 'late') {
      lessons.push(LESSON_IDS.ENDGAME_TACTICS);
    }
    
    // Add in-progress lessons
    if (lessonContext?.currentLesson) {
      lessons.push(lessonContext.currentLesson.id);
    }
    
    return [...new Set(lessons)]; // deduplicate
  }

  /**
   * Generate reasoning text for advice
   * @param {object} strategy - Strategy recommendation
   * @param {object} context - Situation context
   * @param {string} phase - Game phase
   * @returns {string} Reasoning text
   */
  _generateReasoning(strategy, context, phase) {
    const parts = [];
    
    // Add strategy reasoning
    if (strategy?.primary?.reasoning) {
      parts.push(strategy.primary.reasoning);
    }
    
    // Add context-based reasoning
    if (context.playerMoney !== undefined) {
      parts.push(`You have $${context.playerMoney}`);
    }
    
    // Add phase-specific reasoning
    if (phase === 'early') {
      parts.push('Early game - focus on property accumulation');
    } else if (phase === 'mid') {
      parts.push('Mid game - build strategically and complete monopolies');
    } else {
      parts.push('Late game - maximize returns and exploit weaknesses');
    }
    
    return parts.join('. ');
  }

  /**
   * Get current game phase
   * @returns {string} 'early', 'mid', or 'late'
   */
  _getGamePhase() {
    if (!this.currentGameState) return 'early';
    const turn = this.currentGameState.turn || 1;
    if (turn <= 5) return 'early';
    if (turn <= 15) return 'mid';
    return 'late';
  }

  /**
   * Get player money from game state
   * @returns {number} Player's current money
   */
  _getPlayerMoney(state = this.currentGameState) {
    if (!state?.players) return 0;
    const player = state.players.find(p => p.id === this.playerId);
    return player?.money || 0;
  }

  /**
   * Get player position on board
   * @returns {number} Tile position
   */
  _getPlayerPosition(state = this.currentGameState) {
    if (!state?.players) return 0;
    const player = state.players.find(p => p.id === this.playerId);
    return player?.position || 0;
  }

  /**
   * Get player property count
   * @returns {number} Number of properties owned
   */
  _getPropertyCount(state = this.currentGameState) {
    if (!state?.players) return 0;
    const player = state.players.find(p => p.id === this.playerId);
    return player?.properties?.length || 0;
  }

  /**
   * Get player assets
   * @returns {object} { money, properties, totalValue }
   */
  _getPlayerAssets(state = this.currentGameState) {
    return {
      money: this._getPlayerMoney(state),
      propertyCount: this._getPropertyCount(state),
    };
  }

  /**
   * Record an action in memory
   */
  _recordAction(action, gameState) {
    this.memoryLayer?.l0?.push('player_action', {
      action,
      playerId: this.playerId,
      gameState: this._sanitizeState(gameState),
    });
  }

  /**
   * Record game result in memory
   */
  _recordGameResult(gameState, result) {
    this.memoryLayer?.l0?.push('game_result', {
      gameId: this.gameId,
      result,
      playerId: this.playerId,
    });
  }

  /**
   * Cache advice in history
   */
  _cacheAdvice(advice) {
    this.adviceHistory.push(advice);
    if (this.adviceHistory.length > this.config.maxAdviceHistory) {
      this.adviceHistory.shift();
    }
  }

  /**
   * Return empty advice structure
   */
  _emptyAdvice(reason) {
    return {
      primaryAdvice: reason,
      reasoning: '',
      confidence: 0,
      phase: 'unknown',
      relatedLessons: [],
      opponentAnalysis: {},
      context: {},
      timestamp: Date.now(),
    };
  }

  /**
   * Sanitize game state for storage (remove circular refs)
   */
  _sanitizeState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  // ==================== ACTION EVALUATORS ====================

  _evaluatePropertyPurchase(action, gameState) {
    const shouldBuy = this.advisor?.suggestPropertyPurchase(
      action.tileId,
      this.playerId,
      gameState
    );
    
    if (shouldBuy?.shouldBuy) {
      return {
        feedback: shouldBuy.reasoning,
        score: shouldBuy.confidence,
        suggestions: [],
      };
    }
    
    return {
      feedback: shouldBuy?.reasoning || 'Consider skipping this property',
      score: shouldBuy?.confidence || 0.4,
      suggestions: ['Look for properties in color groups you are building'],
    };
  }

  _evaluateBuildAction(action, gameState) {
    return {
      feedback: 'Building houses increases your rent potential',
      score: 0.7,
      suggestions: ['Ensure you have enough cash reserve after building'],
    };
  }

  _evaluateTrade(action, gameState) {
    return {
      feedback: 'Trades can help complete monopolies',
      score: 0.6,
      suggestions: ['Always evaluate if the trade gives you a color group advantage'],
    };
  }

  _evaluateMortgage(action, gameState) {
    return 'Consider mortgaging properties as a last resort - you lose rent income';
  }

  _evaluateRentPayment(action, gameState) {
    const tile = gameState?.properties?.find(p => p.id === action.tileId);
    return tile?.owner 
      ? `Paid rent to ${tile.owner}. Ensure you keep enough cash for future rents.`
      : 'Rent payment recorded';
  }

  _getGenericFeedback(action, gameState) {
    return `Action recorded: ${action.type}`;
  }

  // ==================== PUBLIC GETTERS ====================

  /**
   * Get the memory layer
   * @returns {object} L0-L4 memory layer
   */
  getMemoryLayer() {
    return this.memoryLayer;
  }

  /**
   * Get the strategy advisor
   * @returns {StrategyAdvisor}
   */
  getAdvisor() {
    return this.advisor;
  }

  /**
   * Get the learning coach
   * @returns {LearningCoach}
   */
  getCoach() {
    return this.coach;
  }

  /**
   * Get the opponent tracker
   * @returns {OpponentTracker}
   */
  getOpponentTracker() {
    return this.opponentTracker;
  }

  /**
   * Get the performance dashboard
   * @returns {PerformanceDashboard}
   */
  getDashboard() {
    return this.dashboard;
  }

  /**
   * Get coaching session statistics
   * @returns {object} Session stats
   */
  getSessionStats() {
    return this.coach?.getSessionStats?.(this.playerId) || {};
  }

  /**
   * Check if coach is active and ready
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && this.coachingActive;
  }
}