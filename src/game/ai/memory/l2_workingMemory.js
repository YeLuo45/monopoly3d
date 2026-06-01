/**
 * L2_WorkingMemory - Current session decision tracking
 * 
 * Tracks decisions made during the current session with full
 * reasoning chains for later analysis and revision.
 */

export class L2_WorkingMemory {
  constructor() {
    this.decisions = [];
    this.nextId = 1;
  }

  /**
   * Record a decision
   * @param {object} decision - Decision object
   * @param {string} decision.playerId - Player ID
   * @param {string} decision.situation - Situation description
   * @param {string} decision.action - Action taken
   * @param {string} decision.reasoning - Reasoning behind decision
   * @returns {object} Decision with ID
   */
  pushDecision(decision) {
    const id = `decision_${this.nextId++}`;
    const timestamp = Date.now();
    
    const fullDecision = {
      id,
      playerId: decision.playerId,
      situation: decision.situation,
      action: decision.action,
      reasoning: decision.reasoning,
      timestamp,
      chain: [decision.reasoning], // Initial reasoning chain
    };
    
    this.decisions.push(fullDecision);
    return fullDecision;
  }

  /**
   * Get all decisions for a player this session
   * @param {string} playerId - Player ID
   * @returns {Array} Player's decisions
   */
  getDecisions(playerId) {
    return this.decisions.filter(d => d.playerId === playerId);
  }

  /**
   * Get full reasoning chain for a decision
   * @param {string} decisionId - Decision ID
   * @returns {Array} Reasoning chain steps
   */
  getReasoningChain(decisionId) {
    const decision = this.decisions.find(d => d.id === decisionId);
    return decision ? decision.chain : [];
  }

  /**
   * Update/add reasoning to a decision
   * @param {string} decisionId - Decision ID
   * @param {string} newReasoning - New reasoning to add
   * @returns {boolean} Success
   */
  reviseDecision(decisionId, newReasoning) {
    const decision = this.decisions.find(d => d.id === decisionId);
    if (!decision) return false;
    
    decision.chain.push(newReasoning);
    decision.reasoning = newReasoning; // Keep latest reasoning accessible
    return true;
  }

  /**
   * Clear all session decisions
   */
  clear() {
    this.decisions = [];
    this.nextId = 1;
  }

  /**
   * Get all decisions
   * @returns {Array} All decisions
   */
  getAllDecisions() {
    return this.decisions;
  }

  /**
   * Get decision count
   * @returns {number} Total decisions
   */
  size() {
    return this.decisions.length;
  }
}