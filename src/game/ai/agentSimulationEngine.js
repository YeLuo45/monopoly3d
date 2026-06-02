/**
 * AgentSimulationEngine - Simulate Multi-Agent Interactions
 * 
 * Provides simulation capabilities for multi-agent systems to test
 * agent behavior, decision patterns, and system coordination.
 */

import { AgentType } from './multiAgentSystemFacade.js';

export class AgentSimulationEngine {
  /**
   * Create a new AgentSimulationEngine
   * @param {MultiAgentSystemFacade} multiAgentSystem - The facade to simulate
   */
  constructor(multiAgentSystem) {
    this.multiAgentSystem = multiAgentSystem;
    
    // Simulation state
    this.isRunning = false;
    this.currentTurn = 0;
    this.maxTurns = 100;
    
    // Simulation data collection
    this.decisionLog = [];
    this.agentBehaviorProfiles = new Map();
    this.simulationMetrics = {
      totalDecisions: 0,
      successfulDecisions: 0,
      failedDecisions: 0,
      averageDecisionTime: 0,
      messagesExchanged: 0,
      workflowExecutions: 0
    };
    
    // Simulation report
    this.report = null;
  }

  /**
   * Simulate a single turn for all agents
   * @param {Object} gameState - Current game state
   * @param {string[]} agents - Array of agent IDs to simulate
   * @returns {Promise<Object>} Turn simulation result
   */
  async simulateTurn(gameState, agents) {
    if (!this.isRunning) {
      this.isRunning = true;
    }
    
    const turnStartTime = Date.now();
    const turnResult = {
      turn: this.currentTurn,
      startTime: turnStartTime,
      decisions: [],
      messages: [],
      gameState: null
    };
    
    // Update game state in system
    turnResult.gameState = gameState;
    
    // Simulate each agent's turn
    for (const agentId of agents) {
      // Create decision context for this turn
      const context = this._createTurnContext(agentId, gameState);
      
      // Make decision through the facade
      const decision = await this.multiAgentSystem.makeDecision(
        agentId,
        context,
        gameState
      );
      
      // Log decision
      turnResult.decisions.push({
        agentId,
        decision,
        timestamp: Date.now() - turnStartTime
      });
      
      // Update behavior profile
      this._updateBehaviorProfile(agentId, decision);
      
      // Track metrics
      this._updateMetrics(decision);
    }
    
    // Simulate inter-agent communication
    const messageCount = await this._simulateCommunication(agents);
    turnResult.messagesExchanged = messageCount;
    
    turnResult.duration = Date.now() - turnStartTime;
    this.currentTurn++;
    
    // Store turn in log
    this.decisionLog.push(turnResult);
    
    return turnResult;
  }

  /**
   * Simulate a full game
   * @param {Object} gameState - Initial game state
   * @param {string[]} agents - Array of agent IDs
   * @param {number} maxTurns - Maximum number of turns (default: 100)
   * @returns {Promise<Object>} Full simulation result
   */
  async simulateGame(gameState, agents, maxTurns = 100) {
    const simulationStart = Date.now();
    
    this.maxTurns = maxTurns;
    this.currentTurn = 0;
    this.isRunning = true;
    
    const gameResult = {
      startTime: simulationStart,
      initialState: gameState,
      agents: [...agents],
      turns: [],
      finalTurn: 0,
      endState: null,
      reason: 'max-turns-reached'
    };
    
    // Reset behavior profiles
    for (const agentId of agents) {
      this.agentBehaviorProfiles.set(agentId, {
        agentId,
        totalDecisions: 0,
        successfulDecisions: 0,
        failedDecisions: 0,
        decisionTypes: {},
        averageDuration: 0,
        messagesSent: 0,
        actions: []
      });
    }
    
    // Initialize the system
    await this.multiAgentSystem.initialize(gameState);
    
    // Simulate turns until max or game end
    let currentState = { ...gameState };
    
    while (this.currentTurn < this.maxTurns && this.isRunning) {
      // Check for game end conditions
      if (this._isGameOver(currentState)) {
        gameResult.reason = 'game-over';
        break;
      }
      
      // Simulate turn
      const turnResult = await this.simulateTurn(currentState, agents);
      gameResult.turns.push(turnResult);
      gameResult.finalTurn = this.currentTurn;
      
      // Update current state (simplified - in real would be updated by game logic)
      currentState = this._advanceGameState(currentState);
    }
    
    gameResult.endTime = Date.now();
    gameResult.duration = gameResult.endTime - simulationStart;
    gameResult.endState = currentState;
    
    // Generate simulation report
    this.report = this._generateReport(gameResult);
    
    this.isRunning = false;
    
    return gameResult;
  }

  /**
   * Stop the simulation
   */
  stop() {
    this.isRunning = false;
  }

  /**
   * Get simulation report
   * @returns {Object|null} Simulation report
   */
  getSimulationReport() {
    return this.report;
  }

  /**
   * Get behavior profile for an agent
   * @param {string} agentId - Agent identifier
   * @returns {Object|null} Behavior profile
   */
  getAgentBehaviorProfile(agentId) {
    return this.agentBehaviorProfiles.get(agentId) || null;
  }

  /**
   * Get all agent behavior profiles
   * @returns {Object[]} Array of behavior profiles
   */
  getAllBehaviorProfiles() {
    return Array.from(this.agentBehaviorProfiles.values());
  }

  /**
   * Get simulation metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    return { ...this.simulationMetrics };
  }

  /**
   * Get decision log
   * @returns {Object[]} Decision log entries
   */
  getDecisionLog() {
    return [...this.decisionLog];
  }

  /**
   * Create context for a turn
   * @param {string} agentId 
   * @param {Object} gameState 
   * @returns {Object}
   * @private
   */
  _createTurnContext(agentId, gameState) {
    return {
      turn: this.currentTurn,
      phase: gameState.phase || 'unknown',
      position: gameState.position || 0,
      cash: gameState.cash || 0,
      properties: gameState.properties || []
    };
  }

  /**
   * Update behavior profile for an agent
   * @param {string} agentId 
   * @param {Object} decision 
   * @private
   */
  _updateBehaviorProfile(agentId, decision) {
    let profile = this.agentBehaviorProfiles.get(agentId);
    
    if (!profile) {
      profile = {
        agentId,
        totalDecisions: 0,
        successfulDecisions: 0,
        failedDecisions: 0,
        decisionTypes: {},
        averageDuration: 0,
        messagesSent: 0,
        actions: []
      };
      this.agentBehaviorProfiles.set(agentId, profile);
    }
    
    profile.totalDecisions++;
    
    if (decision.success) {
      profile.successfulDecisions++;
      
      // Track decision type
      const decisionType = decision.decision?.action || 'unknown';
      profile.decisionTypes[decisionType] = (profile.decisionTypes[decisionType] || 0) + 1;
      
      // Track action
      if (decision.decision?.decision?.action) {
        profile.actions.push(decision.decision.decision.action);
      }
    } else {
      profile.failedDecisions++;
    }
    
    // Update average duration
    const duration = decision.duration || 0;
    profile.averageDuration = 
      (profile.averageDuration * (profile.totalDecisions - 1) + duration) / 
      profile.totalDecisions;
  }

  /**
   * Update simulation metrics
   * @param {Object} decision 
   * @private
   */
  _updateMetrics(decision) {
    this.simulationMetrics.totalDecisions++;
    
    if (decision.success) {
      this.simulationMetrics.successfulDecisions++;
    } else {
      this.simulationMetrics.failedDecisions++;
    }
    
    // Update average decision time
    const duration = decision.duration || 0;
    this.simulationMetrics.averageDecisionTime =
      (this.simulationMetrics.averageDecisionTime * 
        (this.simulationMetrics.totalDecisions - 1) + duration) /
      this.simulationMetrics.totalDecisions;
  }

  /**
   * Simulate inter-agent communication
   * @param {string[]} agents 
   * @returns {Promise<number>} Number of messages exchanged
   * @private
   */
  async _simulateCommunication(agents) {
    const messageBus = this.multiAgentSystem.getMessageBus();
    const coordinator = this.multiAgentSystem.getCoordinator();
    let messageCount = 0;
    
    // Simple simulation: each agent broadcasts a status update via coordinator
    for (const agentId of agents) {
      // Use coordinator's broadcast if available, otherwise use messageBus publish
      if (typeof coordinator.broadcastMessage === 'function') {
        messageCount += coordinator.broadcastMessage(agentId, {
          type: 'status-update',
          agentId,
          turn: this.currentTurn,
          timestamp: Date.now()
        }) || 0;
      } else {
        // Fallback: publish to a channel
        messageBus.publish(`status:${agentId}`, {
          type: 'status-update',
          agentId,
          turn: this.currentTurn,
          timestamp: Date.now()
        });
        messageCount++;
      }
      
      // Update profile
      const profile = this.agentBehaviorProfiles.get(agentId);
      if (profile) {
        profile.messagesSent++;
      }
    }
    
    this.simulationMetrics.messagesExchanged += messageCount;
    
    return messageCount;
  }

  /**
   * Check if game is over
   * @param {Object} gameState 
   * @returns {boolean}
   * @private
   */
  _isGameOver(gameState) {
    // Simple game end detection
    if (gameState.gameOver) {
      return true;
    }
    
    // Check if only one player remains
    if (gameState.players && gameState.players.length <= 1) {
      return true;
    }
    
    return false;
  }

  /**
   * Advance game state (simplified)
   * @param {Object} gameState 
   * @returns {Object}
   * @private
   */
  _advanceGameState(gameState) {
    return {
      ...gameState,
      turn: this.currentTurn,
      phase: this._getNextPhase(gameState.phase)
    };
  }

  /**
   * Get next phase
   * @param {string} currentPhase 
   * @returns {string}
   * @private
   */
  _getNextPhase(currentPhase) {
    const phases = ['setup', 'playing', 'auction', 'trading', 'end'];
    const currentIndex = phases.indexOf(currentPhase || 'playing');
    return phases[(currentIndex + 1) % phases.length];
  }

  /**
   * Generate simulation report
   * @param {Object} gameResult 
   * @returns {Object}
   * @private
   */
  _generateReport(gameResult) {
    const profiles = this.getAllBehaviorProfiles();
    const metrics = this.getMetrics();
    
    // Calculate win probabilities (simplified)
    const agentPerformances = profiles.map(p => ({
      agentId: p.agentId,
      successRate: p.totalDecisions > 0 
        ? (p.successfulDecisions / p.totalDecisions * 100).toFixed(2) 
        : 0,
      avgDecisionTime: p.averageDuration.toFixed(2),
      totalDecisions: p.totalDecisions,
      messagesSent: p.messagesSent
    }));
    
    return {
      simulationId: `sim-${Date.now()}`,
      timestamp: Date.now(),
      duration: gameResult.duration,
      turnsSimulated: gameResult.finalTurn,
      reason: gameResult.reason,
      metrics: {
        totalDecisions: metrics.totalDecisions,
        successfulDecisions: metrics.successfulDecisions,
        failedDecisions: metrics.failedDecisions,
        successRate: metrics.totalDecisions > 0
          ? (metrics.successfulDecisions / metrics.totalDecisions * 100).toFixed(2)
          : 0,
        averageDecisionTime: metrics.averageDecisionTime.toFixed(2),
        messagesExchanged: metrics.messagesExchanged
      },
      agentPerformances,
      behaviorProfiles: profiles
    };
  }

  /**
   * Reset simulation state
   */
  reset() {
    this.isRunning = false;
    this.currentTurn = 0;
    this.decisionLog = [];
    this.agentBehaviorProfiles.clear();
    this.simulationMetrics = {
      totalDecisions: 0,
      successfulDecisions: 0,
      failedDecisions: 0,
      averageDecisionTime: 0,
      messagesExchanged: 0,
      workflowExecutions: 0
    };
    this.report = null;
  }
}