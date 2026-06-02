/**
 * MultiAgentSystemFacade - Unified Facade for Multi-Agent System Integration
 * 
 * Provides a unified API integrating all previous multi-agent systems:
 * - AgentCoordinator: Central agent coordination
 * - MessageBus: Inter-agent messaging
 * - BlackboardStore: Shared knowledge repository
 * - OrchestrationEngine: Workflow execution
 */

import { AgentCoordinator, AgentType } from './coordination/agentCoordinator.js';
import { MessageBus, messageBus } from './bus/messageBus.js';
import { BlackboardStore } from './blackboard/blackboardStore.js';
import { OrchestrationEngine, WorkflowState, StepType, createStep } from './orchestrate/orchestrationEngine.js';
import { HealthChecker } from './monitor/healthChecker.js';

export class MultiAgentSystemFacade {
  /**
   * Create a new MultiAgentSystemFacade
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Core systems
    this.coordinator = new AgentCoordinator(options.memoryLayer || null);
    this.messageBus = new MessageBus();
    this.blackboard = new BlackboardStore();
    this.orchestrationEngine = new OrchestrationEngine(
      this.coordinator,
      this.messageBus,
      this.blackboard
    );

    // System state
    this.isInitialized = false;
    this.initializedAt = null;
    this.gameState = null;
    
    // Health monitoring
    this.healthChecker = new HealthChecker();
    
    // Diagnostic tracking
    this.diagnosticHistory = [];
    this.lastDiagnosticAt = null;
  }

  /**
   * Initialize all multi-agent systems with game state
   * @param {Object} gameState - Initial game state
   * @returns {Promise<void>}
   */
  async initialize(gameState) {
    if (this.isInitialized) {
      return;
    }

    this.gameState = gameState || {};
    
    // Initialize coordinator with agents
    this._registerDefaultAgents();
    
    // Subscribe coordination events to message bus
    this._setupEventBindings();
    
    // Initialize blackboard with game state
    this._initializeBlackboard(gameState);
    
    this.isInitialized = true;
    this.initializedAt = Date.now();
  }

  /**
   * Make a coordinated decision for an agent
   * @param {string} agentId - The agent making the decision
   * @param {Object} context - Decision context
   * @param {Object} gameState - Current game state
   * @returns {Promise<Object>} Decision result
   */
  async makeDecision(agentId, context = {}, gameState = {}) {
    if (!this.isInitialized) {
      await this.initialize(gameState);
    }

    // Update game state
    if (gameState !== this.gameState) {
      this.gameState = gameState;
      this._updateBlackboardGameState(gameState);
    }

    // Get agent info
    const agent = this.coordinator.getAgent(agentId);
    if (!agent) {
      return {
        success: false,
        error: `Agent ${agentId} not found`,
        agentId
      };
    }

    // Record decision request
    const decisionStartTime = Date.now();
    
    try {
      // Read relevant knowledge from blackboard
      const relevantKnowledge = this._getRelevantKnowledge(agentId, context);
      
      // Check for messages
      const messages = this.messageBus.getMessages(agentId);
      
      // Create decision context
      const fullContext = {
        ...context,
        agent,
        gameState: this.gameState,
        knowledge: relevantKnowledge,
        pendingMessages: messages
      };

      // Broadcast decision request
      this.messageBus.publish('decision:request', {
        agentId,
        context: fullContext,
        timestamp: Date.now()
      });

      // Execute decision workflow if defined
      const decisionResult = await this._executeDecisionWorkflow(
        agentId,
        agent,
        fullContext
      );

      // Record decision
      this.blackboard.write(
        `decision:${agentId}:${Date.now()}`,
        {
          ...decisionResult,
          agentId,
          context: context,
          duration: Date.now() - decisionStartTime
        },
        'system'
      );

      return {
        success: true,
        agentId,
        decision: decisionResult,
        duration: Date.now() - decisionStartTime
      };

    } catch (error) {
      return {
        success: false,
        agentId,
        error: error.message,
        duration: Date.now() - decisionStartTime
      };
    }
  }

  /**
   * Get the AgentCoordinator instance
   * @returns {AgentCoordinator}
   */
  getCoordinator() {
    return this.coordinator;
  }

  /**
   * Get the MessageBus instance
   * @returns {MessageBus}
   */
  getMessageBus() {
    return this.messageBus;
  }

  /**
   * Get the BlackboardStore instance
   * @returns {BlackboardStore}
   */
  getBlackboard() {
    return this.blackboard;
  }

  /**
   * Get the OrchestrationEngine instance
   * @returns {OrchestrationEngine}
   */
  getOrchestrationEngine() {
    return this.orchestrationEngine;
  }

  /**
   * Get overall system health status
   * @returns {Object} System status
   */
  getSystemStatus() {
    const coordinatorStats = this.coordinator.getStats();
    const channelList = this.messageBus.getChannelList();
    
    return {
      initialized: this.isInitialized,
      initializedAt: this.initializedAt,
      uptime: this.isInitialized ? Date.now() - this.initializedAt : 0,
      coordinator: {
        agentCount: coordinatorStats.agentCount,
        coordinationEvents: coordinatorStats.coordinationEvents,
        messageCount: coordinatorStats.messageCount,
        isPaused: coordinatorStats.isPaused
      },
      messageBus: {
        channelCount: channelList.length,
        messageHistorySize: this.messageBus.messageHistory.length
      },
      blackboard: {
        keyCount: this.blackboard.keys().length,
        globalHistorySize: this.blackboard.globalHistory.length
      },
      orchestration: {
        workflowCount: this.orchestrationEngine.workflows.size,
        activeWorkflowCount: this.orchestrationEngine.activeWorkflows.size
      }
    };
  }

  /**
   * Run system diagnostics
   * @returns {Object} Diagnostic results
   */
  diagnose() {
    const startTime = Date.now();
    
    const diagnostics = {
      timestamp: Date.now(),
      duration: 0,
      components: {},
      overallHealth: 'unknown',
      issues: [],
      recommendations: []
    };

    // Check each component
    diagnostics.components.coordinator = this._diagnoseCoordinator();
    diagnostics.components.messageBus = this._diagnoseMessageBus();
    diagnostics.components.blackboard = this._diagnoseBlackboard();
    diagnostics.components.orchestration = this._diagnoseOrchestration();

    // Calculate overall health
    const componentHealths = Object.values(diagnostics.components).map(c => c.health);
    if (componentHealths.every(h => h === 'healthy')) {
      diagnostics.overallHealth = 'healthy';
    } else if (componentHealths.some(h => h === 'degraded')) {
      diagnostics.overallHealth = 'degraded';
    } else {
      diagnostics.overallHealth = 'unhealthy';
    }

    // Collect issues
    for (const [name, result] of Object.entries(diagnostics.components)) {
      if (result.issues.length > 0) {
        diagnostics.issues.push(...result.issues.map(i => ({ component: name, ...i })));
      }
      if (result.recommendations.length > 0) {
        diagnostics.recommendations.push(
          ...result.recommendations.map(r => ({ component: name, ...r }))
        );
      }
    }

    diagnostics.duration = Date.now() - startTime;
    
    // Record diagnostic
    this.diagnosticHistory.push(diagnostics);
    this.lastDiagnosticAt = diagnostics.timestamp;
    
    return diagnostics;
  }

  /**
   * Register default agents for the system
   * @private
   */
  _registerDefaultAgents() {
    // Register strategic agent
    this.coordinator.registerAgent('strategic-1', AgentType.STRATEGIC, [
      'strategic-planning',
      'long-term-analysis'
    ]);
    
    // Register tactical agent
    this.coordinator.registerAgent('tactical-1', AgentType.TACTICAL, [
      'tactical-execution',
      'short-term-planning'
    ]);
    
    // Register reactive agent
    this.coordinator.registerAgent('reactive-1', AgentType.REACTIVE, [
      'immediate-response',
      'reflex-action'
    ]);
    
    // Register analytical agent
    this.coordinator.registerAgent('analytical-1', AgentType.ANALYTICAL, [
      'data-analysis',
      'pattern-recognition'
    ]);
  }

  /**
   * Setup event bindings between systems
   * @private
   */
  _setupEventBindings() {
    // Bind coordinator events to message bus
    this.coordinator.on('agent:registered', (agent) => {
      this.messageBus.publish('agent:registered', agent);
    });
    
    this.coordinator.on('task:delegated', (data) => {
      this.messageBus.publish('task:delegated', data);
    });
    
    this.coordinator.on('message:sent', (envelope) => {
      this.messageBus.publish('message:sent', envelope);
    });

    // Bind message bus events to blackboard
    this.messageBus.subscribe('decision:request', 'system', (msg) => {
      this.blackboard.write(
        `event:decision:${msg.payload.agentId}`,
        msg.payload,
        'messageBus'
      );
    });
  }

  /**
   * Initialize blackboard with game state
   * @param {Object} gameState 
   * @private
   */
  _initializeBlackboard(gameState) {
    if (gameState) {
      this.blackboard.write('game:state', gameState, 'system');
      this.blackboard.write('game:phase', gameState.phase || 'unknown', 'system');
      this.blackboard.write('game:players', gameState.players || [], 'system');
    }
  }

  /**
   * Update blackboard with game state changes
   * @param {Object} gameState 
   * @private
   */
  _updateBlackboardGameState(gameState) {
    this.blackboard.update('game:state', gameState, 'system');
    if (gameState.phase) {
      this.blackboard.update('game:phase', gameState.phase, 'system');
    }
  }

  /**
   * Get relevant knowledge for an agent
   * @param {string} agentId 
   * @param {Object} context 
   * @returns {Object}
   * @private
   */
  _getRelevantKnowledge(agentId, context) {
    const knowledge = {
      gameState: this.blackboard.read('game:state'),
      gamePhase: this.blackboard.read('game:phase'),
      players: this.blackboard.read('game:players'),
      recentDecisions: this.blackboard.getGlobalHistory(10)
    };
    
    // Get agent-specific knowledge
    const agentKnowledge = this.blackboard.readAll(`*${agentId}*`);
    if (agentKnowledge.length > 0) {
      knowledge.agentSpecific = agentKnowledge;
    }
    
    return knowledge;
  }

  /**
   * Execute a decision workflow for an agent
   * @param {string} agentId 
   * @param {Object} agent 
   * @param {Object} context 
   * @returns {Promise<Object>}
   * @private
   */
  async _executeDecisionWorkflow(agentId, agent, context) {
    // Create a simple decision workflow
    const workflow = {
      id: `decision-${agentId}-${Date.now()}`,
      name: `Decision for ${agentId}`,
      steps: [
        createStep('analyze-context', async (ctx) => {
          return {
            success: true,
            context: ctx,
            analyzedAt: Date.now()
          };
        }),
        createStep('formulate-decision', async (ctx) => {
          // Simple decision based on agent type
          let decision = { action: 'wait', target: null };
          
          switch (ctx.agent.type) {
            case AgentType.STRATEGIC:
              decision = { action: 'strategic-review', target: 'board' };
              break;
            case AgentType.TACTICAL:
              decision = { action: 'evaluate-positions', target: 'properties' };
              break;
            case AgentType.REACTIVE:
              decision = { action: 'check-immediate', target: 'threats' };
              break;
            case AgentType.ANALYTICAL:
              decision = { action: 'analyze-patterns', target: 'history' };
              break;
          }
          
          return { success: true, decision };
        })
      ]
    };
    
    try {
      const result = await this.orchestrationEngine.executeWorkflow(
        workflow,
        { agent, context }
      );
      
      return result;
    } catch (error) {
      // Fallback to simple decision if workflow fails
      return {
        success: false,
        error: error.message,
        fallbackDecision: { action: 'wait' }
      };
    }
  }

  /**
   * Diagnose the coordinator component
   * @private
   */
  _diagnoseCoordinator() {
    const result = {
      health: 'healthy',
      issues: [],
      recommendations: []
    };
    
    const stats = this.coordinator.getStats();
    
    if (stats.agentCount === 0) {
      result.health = 'unhealthy';
      result.issues.push({ severity: 'critical', message: 'No agents registered' });
      result.recommendations.push({ priority: 'high', action: 'Register agents' });
    } else if (stats.agentCount < 3) {
      result.health = 'degraded';
      result.issues.push({ severity: 'warning', message: 'Low agent count' });
      result.recommendations.push({ priority: 'medium', action: 'Consider adding more agents' });
    }
    
    if (stats.isPaused) {
      result.issues.push({ severity: 'warning', message: 'Coordinator is paused' });
      result.recommendations.push({ priority: 'high', action: 'Resume coordinator if appropriate' });
    }
    
    return result;
  }

  /**
   * Diagnose the message bus component
   * @private
   */
  _diagnoseMessageBus() {
    const result = {
      health: 'healthy',
      issues: [],
      recommendations: []
    };
    
    const historySize = this.messageBus.messageHistory.length;
    const channels = this.messageBus.getChannelList();
    
    if (historySize > 900) {
      result.health = 'degraded';
      result.issues.push({ severity: 'warning', message: 'Message history near limit' });
      result.recommendations.push({ priority: 'low', action: 'Consider clearing old messages' });
    }
    
    if (channels.length === 0) {
      result.recommendations.push({ priority: 'low', action: 'Subscribe to channels for more activity' });
    }
    
    return result;
  }

  /**
   * Diagnose the blackboard component
   * @private
   */
  _diagnoseBlackboard() {
    const result = {
      health: 'healthy',
      issues: [],
      recommendations: []
    };
    
    const keyCount = this.blackboard.keys().length;
    const historySize = this.blackboard.globalHistory.length;
    
    if (keyCount === 0) {
      result.health = 'degraded';
      result.recommendations.push({ priority: 'medium', action: 'Initialize game state on blackboard' });
    }
    
    if (historySize > 900) {
      result.health = 'degraded';
      result.issues.push({ severity: 'warning', message: 'Global history near limit' });
      result.recommendations.push({ priority: 'low', action: 'Consider clearing old history' });
    }
    
    return result;
  }

  /**
   * Diagnose the orchestration engine component
   * @private
   */
  _diagnoseOrchestration() {
    const result = {
      health: 'healthy',
      issues: [],
      recommendations: []
    };
    
    const workflowIds = this.orchestrationEngine.getWorkflowIds();
    const activeIds = this.orchestrationEngine.getActiveWorkflowIds();
    
    if (workflowIds.length > 50) {
      result.health = 'degraded';
      result.issues.push({ severity: 'info', message: 'Many completed workflows stored' });
      result.recommendations.push({ priority: 'low', action: 'Consider clearing old workflows' });
    }
    
    if (activeIds.length > 10) {
      result.health = 'degraded';
      result.issues.push({ severity: 'warning', message: 'High number of active workflows' });
      result.recommendations.push({ priority: 'medium', action: 'Monitor workflow completion' });
    }
    
    return result;
  }

  /**
   * Clear all system state
   */
  clear() {
    this.coordinator.clear();
    this.messageBus.reset();
    this.blackboard.clear();
    this.orchestrationEngine.clearWorkflows();
    
    this.isInitialized = false;
    this.initializedAt = null;
    this.gameState = null;
  }
}

export { AgentType };