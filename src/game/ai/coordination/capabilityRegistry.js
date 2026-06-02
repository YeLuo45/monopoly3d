/**
 * CapabilityRegistry - Registry of Agent Capabilities
 * 
 * Tracks which agents have what capabilities and helps find
 * the best agent for a given task based on game state.
 */

export class CapabilityRegistry {
  constructor() {
    // Maps capability -> Set of agent IDs
    this.capabilityMap = new Map();
    // Maps agent ID -> Set of capabilities
    this.agentCapabilities = new Map();
    // Agent performance metrics: agentId -> capability -> score
    this.performanceMetrics = new Map();
  }

  /**
   * Register which agents have what capabilities
   * @param {string} capability - The capability identifier
   * @param {string[]} agents - Array of agent IDs that have this capability
   */
  register(capability, agents) {
    if (!this.capabilityMap.has(capability)) {
      this.capabilityMap.set(capability, new Set());
    }
    
    const agentsSet = this.capabilityMap.get(capability);
    for (const agentId of agents) {
      agentsSet.add(agentId);
      
      // Update reverse mapping
      if (!this.agentCapabilities.has(agentId)) {
        this.agentCapabilities.set(agentId, new Set());
      }
      this.agentCapabilities.get(agentId).add(capability);
      
      // Initialize performance metrics
      if (!this.performanceMetrics.has(agentId)) {
        this.performanceMetrics.set(agentId, new Map());
      }
      if (!this.performanceMetrics.get(agentId).has(capability)) {
        this.performanceMetrics.get(agentId).set(capability, 1.0);
      }
    }
  }

  /**
   * Find the best agent for a given capability and game state
   * @param {string} capability - The capability to search for
   * @param {Object} gameState - Current game state for context
   * @returns {string|null} - The best agent ID or null
   */
  findBestAgent(capability, gameState = {}) {
    const agents = this.getAgentsWithCapability(capability);
    if (agents.length === 0) return null;
    
    if (agents.length === 1) return agents[0];
    
    // Score agents based on performance metrics and game state
    let bestAgent = null;
    let bestScore = -Infinity;
    
    for (const agentId of agents) {
      const baseScore = this.performanceMetrics.get(agentId)?.get(capability) || 1.0;
      
      // Factor in game state if provided
      let contextBonus = 0;
      if (gameState.urgency === 'high') {
        contextBonus += this.getUrgencyBonus(agentId, capability);
      }
      if (gameState.turn === agentId) {
        contextBonus += 0.5; // Prefer current turn agent
      }
      
      const totalScore = baseScore + contextBonus;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestAgent = agentId;
      }
    }
    
    return bestAgent;
  }

  /**
   * Get urgency bonus for agent
   * @param {string} agentId 
   * @param {string} capability 
   * @returns {number}
   */
  getUrgencyBonus(agentId, capability) {
    // Agents with high responsiveness get bonus
    const responsiveness = this.getAgentResponsiveness(agentId);
    return responsiveness * 0.3;
  }

  /**
   * Get agent responsiveness score (placeholder for real metric)
   * @param {string} agentId 
   * @returns {number} 0-1
   */
  getAgentResponsiveness(agentId) {
    return 0.7; // Default middle score
  }

  /**
   * Get all agents with a specific capability
   * @param {string} capability - The capability to search for
   * @returns {string[]} - Array of agent IDs
   */
  getAgentsWithCapability(capability) {
    const agents = this.capabilityMap.get(capability);
    return agents ? Array.from(agents) : [];
  }

  /**
   * Get all capabilities of an agent
   * @param {string} agentId - The agent ID
   * @returns {string[]} - Array of capability identifiers
   */
  getCapabilities(agentId) {
    const capabilities = this.agentCapabilities.get(agentId);
    return capabilities ? Array.from(capabilities) : [];
  }

  /**
   * Update performance metric for an agent's capability
   * @param {string} agentId 
   * @param {string} capability 
   * @param {number} score - New score (0-1)
   */
  updatePerformance(agentId, capability, score) {
    if (this.performanceMetrics.has(agentId)) {
      this.performanceMetrics.get(agentId).set(capability, score);
    }
  }

  /**
   * Check if an agent has a specific capability
   * @param {string} agentId 
   * @param {string} capability 
   * @returns {boolean}
   */
  hasCapability(agentId, capability) {
    const caps = this.agentCapabilities.get(agentId);
    return caps ? caps.has(capability) : false;
  }

  /**
   * Clear all registries
   */
  clear() {
    this.capabilityMap.clear();
    this.agentCapabilities.clear();
    this.performanceMetrics.clear();
  }

  /**
   * Get registry statistics
   * @returns {Object}
   */
  getStats() {
    return {
      totalCapabilities: this.capabilityMap.size,
      totalAgents: this.agentCapabilities.size,
      capabilities: Array.from(this.capabilityMap.keys()),
      agents: Array.from(this.agentCapabilities.keys())
    };
  }
}