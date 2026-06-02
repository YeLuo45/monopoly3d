/**
 * AgentCoordinator - Central Coordinator for Multiple AI Agents
 * 
 * Manages agent registration, task delegation, action coordination,
 * and inter-agent communication.
 */

import { CapabilityRegistry } from './capabilityRegistry.js';
import { TaskDispatcher } from './taskDispatcher.js';
import { EventEmitter } from 'events';

export const AgentType = {
  STRATEGIC: 'strategic',
  TACTICAL: 'tactical',
  REACTIVE: 'reactive',
  ANALYTICAL: 'analytical'
};

export class AgentCoordinator extends EventEmitter {
  /**
   * @param {Object} memoryLayer - The memory layer instance
   */
  constructor(memoryLayer = null) {
    super();
    
    this.memoryLayer = memoryLayer;
    
    // Agent registry
    this.agents = new Map(); // agentId -> agent info
    this.capabilityRegistry = new CapabilityRegistry();
    this.taskDispatcher = new TaskDispatcher(this);
    
    // Message queues
    this.messageQueue = new Map(); // agentId -> array of messages
    this.messageHistory = [];
    
    // Coordinator state
    this.coordinationHistory = [];
    this.isPaused = false;
  }

  /**
   * Register an AI agent
   * @param {string} agentId - Unique agent identifier
   * @param {string} agentType - Type of agent (strategic, tactical, etc.)
   * @param {string[]} capabilities - Array of capability identifiers
   * @returns {boolean} - Success
   */
  registerAgent(agentId, agentType, capabilities = []) {
    if (this.agents.has(agentId)) {
      return false; // Already registered
    }
    
    const agent = {
      id: agentId,
      type: agentType,
      capabilities: [...capabilities],
      registeredAt: Date.now(),
      lastActive: Date.now(),
      status: 'active'
    };
    
    this.agents.set(agentId, agent);
    
    // Register capabilities
    for (const capability of capabilities) {
      this.capabilityRegistry.register(capability, [agentId]);
    }
    
    // Initialize message queue
    this.messageQueue.set(agentId, []);
    
    this.emit('agent:registered', agent);
    
    return true;
  }

  /**
   * Unregister an agent
   * @param {string} agentId - Agent to remove
   * @returns {boolean} - Success
   */
  unregisterAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    // Remove from capability registry
    for (const capability of agent.capabilities) {
      const agents = this.capabilityRegistry.getAgentsWithCapability(capability);
      const filtered = agents.filter(id => id !== agentId);
      // Note: CapabilityRegistry doesn't have removeAgent method
      // This would need to be added for full support
    }
    
    this.agents.delete(agentId);
    this.messageQueue.delete(agentId);
    
    this.emit('agent:unregistered', agent);
    
    return true;
  }

  /**
   * Get agent by ID
   * @param {string} agentId - Agent identifier
   * @returns {Object|null} - Agent info or null
   */
  getAgent(agentId) {
    return this.agents.get(agentId) || null;
  }

  /**
   * Get all registered agents
   * @returns {Object[]} - Array of agent info objects
   */
  getAllAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Check if agent can handle task
   * @param {string} agentId - Agent to check
   * @param {string[]} requiredCapabilities - Required capabilities
   * @returns {boolean}
   */
  canHandleTask(agentId, requiredCapabilities) {
    if (requiredCapabilities.length === 0) return true;
    
    const agentCaps = this.capabilityRegistry.getCapabilities(agentId);
    return requiredCapabilities.every(cap => agentCaps.includes(cap));
  }

  /**
   * Delegate a task to the best available agent
   * @param {Object} task - Task object
   * @param {string[]} requiredCapabilities - Required capabilities
   * @returns {string|null} - Task ID or null
   */
  delegateTask(task, requiredCapabilities = []) {
    // Find best agent for this task
    const bestAgent = this.capabilityRegistry.findBestAgent(
      requiredCapabilities[0] || 'general',
      task.gameState || {}
    );
    
    if (!bestAgent) {
      this.emit('task:undelegated', { task, reason: 'No available agent' });
      return null;
    }
    
    // Create task with delegation info
    const delegatedTask = {
      ...task,
      requiredCapabilities,
      delegatedTo: bestAgent,
      delegatedAt: Date.now()
    };
    
    // Enqueue task
    const taskId = this.taskDispatcher.enqueueTask(delegatedTask);
    
    this.emit('task:delegated', { taskId, task: delegatedTask, agent: bestAgent });
    
    return taskId;
  }

  /**
   * Coordinate multi-agent actions
   * @param {Object[]} actions - Array of actions to coordinate
   * @param {Object} gameState - Current game state
   * @returns {Object[]} - Ordered/prioritized actions
   */
  coordinateAction(actions, gameState = {}) {
    if (!Array.isArray(actions) || actions.length === 0) {
      return [];
    }
    
    // Sort actions by priority and dependencies
    const coordinated = this.resolveActionDependencies(actions, gameState);
    
    // Record coordination
    this.coordinationHistory.push({
      timestamp: Date.now(),
      actionCount: actions.length,
      gameState: gameState.phase || 'unknown'
    });
    
    this.emit('actions:coordinated', { actions: coordinated, gameState });
    
    return coordinated;
  }

  /**
   * Resolve action dependencies and ordering
   * @param {Object[]} actions 
   * @param {Object} gameState 
   * @returns {Object[]}
   */
  resolveActionDependencies(actions, gameState) {
    // Separate actions with and without dependencies
    const independent = [];
    const dependent = new Map(); // actionId -> dependsOn
    
    for (const action of actions) {
      if (action.dependsOn && action.dependsOn.length > 0) {
        dependent.set(action.id || action, action);
      } else {
        independent.push(action);
      }
    }
    
    // Sort independent actions by priority
    independent.sort((a, b) => (b.priority || 5) - (a.priority || 5));
    
    // Build dependent chain
    const ordered = [...independent];
    
    for (const [actionId, action] of dependent) {
      // Find insertion point based on dependencies
      const deps = action.dependsOn;
      let insertIndex = ordered.length;
      
      for (const depId of deps) {
        const depIndex = ordered.findIndex(a => (a.id || a) === depId);
        if (depIndex !== -1 && depIndex < insertIndex) {
          insertIndex = depIndex + 1;
        }
      }
      
      ordered.splice(insertIndex, 0, action);
    }
    
    return ordered;
  }

  /**
   * Send message from one agent to another
   * @param {string} fromAgent - Sender ID
   * @param {string} toAgent - Recipient ID
   * @param {Object} message - Message object
   * @returns {boolean} - Success
   */
  sendMessage(fromAgent, toAgent, message) {
    if (!this.agents.has(fromAgent) || !this.agents.has(toAgent)) {
      return false;
    }
    
    const envelope = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: fromAgent,
      to: toAgent,
      payload: message,
      timestamp: Date.now(),
      read: false
    };
    
    // Add to recipient's queue
    const queue = this.messageQueue.get(toAgent);
    if (queue) {
      queue.push(envelope);
    }
    
    this.messageHistory.push(envelope);
    
    this.emit('message:sent', envelope);
    
    return true;
  }

  /**
   * Broadcast message to all agents
   * @param {string} sender - Sender ID
   * @param {Object} message - Message to broadcast
   * @returns {number} - Number of agents notified
   */
  broadcastMessage(sender, message) {
    let count = 0;
    
    for (const agentId of this.agents.keys()) {
      if (agentId !== sender) {
        if (this.sendMessage(sender, agentId, message)) {
          count++;
        }
      }
    }
    
    this.emit('message:broadcast', { sender, message, recipientCount: count });
    
    return count;
  }

  /**
   * Get pending messages for an agent
   * @param {string} agentId - Agent ID
   * @param {boolean} markAsRead - Mark messages as read
   * @returns {Object[]} - Array of messages
   */
  getMessages(agentId, markAsRead = true) {
    const queue = this.messageQueue.get(agentId);
    if (!queue) return [];
    
    const messages = [...queue];
    
    if (markAsRead) {
      for (const msg of messages) {
        msg.read = true;
      }
    }
    
    return messages;
  }

  /**
   * Clear message queue for an agent
   * @param {string} agentId - Agent ID
   */
  clearMessages(agentId) {
    const queue = this.messageQueue.get(agentId);
    if (queue) {
      queue.length = 0;
    }
  }

  /**
   * Pause coordination (stop new task delegation)
   */
  pause() {
    this.isPaused = true;
    this.emit('coordinator:paused');
  }

  /**
   * Resume coordination
   */
  resume() {
    this.isPaused = false;
    this.emit('coordinator:resumed');
  }

  /**
   * Get coordinator statistics
   * @returns {Object}
   */
  getStats() {
    return {
      agentCount: this.agents.size,
      taskStats: this.taskDispatcher.getStats(),
      messageCount: this.messageHistory.length,
      coordinationEvents: this.coordinationHistory.length,
      isPaused: this.isPaused,
      capabilities: this.capabilityRegistry.getStats()
    };
  }

  /**
   * Clear all coordinator state
   */
  clear() {
    this.agents.clear();
    this.messageQueue.clear();
    this.messageHistory = [];
    this.coordinationHistory = [];
    this.capabilityRegistry.clear();
    this.taskDispatcher.clear();
  }
}