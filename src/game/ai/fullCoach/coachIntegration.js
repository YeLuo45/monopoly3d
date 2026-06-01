/**
 * CoachIntegration - Wire together all AI subsystems
 * 
 * Provides unified interface to access all AI components:
 * - Memory Layer (L0-L4)
 * - Embedding System
 * - Strategy Advisor
 * - Learning Coach
 * - Opponent Tracker
 * - Performance Dashboard
 * 
 * Part of Direction B v9: Full AI Coach Integration
 */

import { L0_RawEventCache } from '../memory/l0_rawEventCache.js';
import { L1_SemanticMemory } from '../memory/l1_semanticMemory.js';
import { L2_WorkingMemory } from '../memory/l2_workingMemory.js';
import { L3_LongTermMemory } from '../memory/l3_longTermMemory.js';
import { L4_MetaCognition } from '../memory/l4_metaCognition.js';
import { SituationEncoder } from '../embedding/situationEncoder.js';
import { EmbeddingIndex } from '../embedding/embeddingIndex.js';
import { StrategyAdvisor } from '../advisor/strategyAdvisor.js';
import { LearningCoach } from '../coach/learningCoach.js';
import { OpponentTracker } from '../modeling/opponentTracker.js';
import { PerformanceDashboard } from '../dashboard/performanceDashboard.js';
import { DecisionPatternAnalyzer } from '../analysis/decisionPatternAnalyzer.js';

export class CoachIntegration {
  /**
   * @param {object} store - Game store with state and subscribers
   */
  constructor(store = null) {
    this.store = store;
    
    // Subsystem instances
    this.memoryLayer = null;
    this.embedding = null;
    this.situationEncoder = null;
    this.advisor = null;
    this.coach = null;
    this.opponentTracker = null;
    this.dashboard = null;
    this.decisionAnalyzer = null;
    
    // Event bus for cross-subsystem communication
    this.eventBus = this._createEventBus();
    
    // Initialization state
    this.isInitialized = false;
  }

  /**
   * Initialize and wire all subsystems
   * @param {object} options - Configuration options
   * @returns {CoachIntegration} this for chaining
   */
  initialize(options = {}) {
    // Create all subsystems
    this._createMemoryLayer();
    this._createEmbedding();
    this._createDecisionAnalyzer();
    this._createAdvisor();
    this._createCoach();
    this._createOpponentTracker();
    this._createDashboard();
    
    // Wire them together
    this.wireMemoryLayer();
    this.wireStrategyAdvisor();
    this.wireLearningCoach();
    this.wireOpponentTracker();
    this.wirePerformanceDashboard();
    
    // Connect to game store if provided
    if (this.store) {
      this._wireStore();
    }
    
    this.isInitialized = true;
    return this;
  }

  /**
   * Create the L0-L4 memory hierarchy
   */
  _createMemoryLayer() {
    const l0 = new L0_RawEventCache(10000);
    const l1 = new L1_SemanticMemory(l0);
    const l2 = new L2_WorkingMemory(l1);
    const l3 = new L3_LongTermMemory(l2);
    const l4 = new L4_MetaCognition(l3);
    
    this.memoryLayer = { l0, l1, l2, l3, l4 };
  }

  /**
   * Create embedding and encoding subsystems
   */
  _createEmbedding() {
    this.situationEncoder = new SituationEncoder();
    this.embedding = new EmbeddingIndex(this.situationEncoder);
  }

  /**
   * Create decision pattern analyzer
   */
  _createDecisionAnalyzer() {
    this.decisionAnalyzer = new DecisionPatternAnalyzer(this.memoryLayer);
  }

  /**
   * Create strategy advisor with dependencies
   */
  _createAdvisor() {
    this.advisor = new StrategyAdvisor(
      this.memoryLayer,
      this.embedding,
      this.decisionAnalyzer
    );
  }

  /**
   * Create learning coach with dependencies
   */
  _createCoach() {
    this.coach = new LearningCoach(this.memoryLayer, this.advisor);
  }

  /**
   * Create opponent tracker
   */
  _createOpponentTracker() {
    this.opponentTracker = new OpponentTracker(this.memoryLayer);
  }

  /**
   * Create performance dashboard
   */
  _createDashboard() {
    this.dashboard = new PerformanceDashboard(
      this.memoryLayer,
      this.memoryLayer.l4
    );
  }

  /**
   * Wire memory layer to event bus for automatic event capture
   */
  wireMemoryLayer() {
    if (!this.memoryLayer) return this;
    
    // Subscribe to game events and route them to L0
    const events = ['player_action', 'game_state_change', 'turn_start', 'turn_end'];
    
    events.forEach(event => {
      this.eventBus.subscribe(event, (data) => {
        if (this.memoryLayer?.l0) {
          this.memoryLayer.l0.push(event, data);
        }
      });
    });
    
    return this;
  }

  /**
   * Wire strategy advisor to memory and embedding
   */
  wireStrategyAdvisor() {
    if (!this.advisor) return this;
    
    // Advisor already has references from constructor
    // But we can subscribe to advice events
    this.eventBus.subscribe('advice_requested', (data) => {
      const result = this.advisor.suggestNextMove(data.playerId, data.gameState);
      this.eventBus.publish('advice_generated', {
        ...result,
        timestamp: Date.now(),
      });
    });
    
    return this;
  }

  /**
   * Wire learning coach to memory and advisor
   */
  wireLearningCoach() {
    if (!this.coach) return this;
    
    // Coach receives events for lesson progression
    this.eventBus.subscribe('game_end', (data) => {
      this.coach.endCoachSession(data.playerId);
    });
    
    this.eventBus.subscribe('lesson_progress', (data) => {
      // Update coach with new progress
      if (this.memoryLayer?.l3) {
        this.memoryLayer.l3.store(`lesson_${data.lessonId}`, data.progress);
      }
    });
    
    return this;
  }

  /**
   * Wire opponent tracker to event bus
   */
  wireOpponentTracker() {
    if (!this.opponentTracker) return this;
    
    // Subscribe to events that affect opponent models
    const events = [
      'player_action',
      'trade_offered',
      'trade_accepted',
      'trade_rejected',
      'property_purchased',
      'house_built',
    ];
    
    events.forEach(event => {
      this.eventBus.subscribe(event, (data) => {
        this.opponentTracker.updateAllFromEvent({ type: event, data });
      });
    });
    
    return this;
  }

  /**
   * Wire performance dashboard to memory
   */
  wirePerformanceDashboard() {
    if (!this.dashboard) return this;
    
    // Dashboard needs game results
    this.eventBus.subscribe('game_end', (data) => {
      this.dashboard.recordGameResult(data.playerId, data.result);
    });
    
    // Track decision quality for metrics
    this.eventBus.subscribe('decision_made', (data) => {
      this.dashboard.recordDecision(data.playerId, data.decision);
    });
    
    return this;
  }

  /**
   * Connect to game store for reactive updates
   */
  _wireStore() {
    if (!this.store?.subscribe) return;
    
    // Subscribe to game state changes
    const unsubscribe = this.store.subscribe(
      state => state,
      (currentState, previousState) => {
        if (currentState?.turn !== previousState?.turn) {
          this.eventBus.publish('turn_change', {
            turn: currentState.turn,
            currentPlayer: currentState.currentPlayer,
          });
        }
        
        if (currentState?.screen === 'game_over') {
          this.eventBus.publish('game_over', { gameState: currentState });
        }
      }
    );
    
    return unsubscribe;
  }

  /**
   * Create event bus for internal pub/sub
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
          handlers[event].forEach(handler => {
            try {
              handler(data);
            } catch (e) {
              console.warn(`Event bus error [${event}]:`, e);
            }
          });
        }
      },
      
      clear: (event) => {
        if (event) {
          delete handlers[event];
        } else {
          Object.keys(handlers).forEach(k => delete handlers[k]);
        }
      },
    };
  }

  /**
   * Get a subsystem by name
   * @param {string} name - Subsystem name
   * @returns {object|null} Subsystem instance or null
   */
  getSubsystem(name) {
    const subsystemMap = {
      memoryLayer: this.memoryLayer,
      memory: this.memoryLayer,
      l0: this.memoryLayer?.l0,
      l1: this.memoryLayer?.l1,
      l2: this.memoryLayer?.l2,
      l3: this.memoryLayer?.l3,
      l4: this.memoryLayer?.l4,
      embedding: this.embedding,
      situationEncoder: this.situationEncoder,
      advisor: this.advisor,
      coach: this.coach,
      learningCoach: this.coach,
      opponentTracker: this.opponentTracker,
      opponents: this.opponentTracker,
      dashboard: this.dashboard,
      performance: this.dashboard,
      decisionAnalyzer: this.decisionAnalyzer,
    };
    
    return subsystemMap[name] || null;
  }

  /**
   * Get all subsystems as a structured object
   * @returns {object} All subsystems
   */
  getAllSubsystems() {
    return {
      memory: {
        l0: this.memoryLayer?.l0,
        l1: this.memoryLayer?.l1,
        l2: this.memoryLayer?.l2,
        l3: this.memoryLayer?.l3,
        l4: this.memoryLayer?.l4,
      },
      embedding: this.embedding,
      situationEncoder: this.situationEncoder,
      advisor: this.advisor,
      coach: this.coach,
      opponentTracker: this.opponentTracker,
      dashboard: this.dashboard,
      decisionAnalyzer: this.decisionAnalyzer,
    };
  }

  /**
   * Check if integration is ready
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Reset all subsystems (for new game)
   */
  reset() {
    this.memoryLayer = null;
    this.embedding = null;
    this.situationEncoder = null;
    this.advisor = null;
    this.coach = null;
    this.opponentTracker = null;
    this.dashboard = null;
    this.decisionAnalyzer = null;
    this.eventBus.clear();
    this.isInitialized = false;
  }

  /**
   * Get integration status report
   * @returns {object} Status of all subsystems
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      subsystems: {
        memoryLayer: !!this.memoryLayer,
        embedding: !!this.embedding,
        advisor: !!this.advisor,
        coach: !!this.coach,
        opponentTracker: !!this.opponentTracker,
        dashboard: !!this.dashboard,
        decisionAnalyzer: !!this.decisionAnalyzer,
      },
      eventBusHandlers: Object.keys(this.eventBus).length,
    };
  }
}