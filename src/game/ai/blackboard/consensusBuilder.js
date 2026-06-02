/**
 * ConsensusBuilder - Build Consensus Among Agents
 * 
 * Handles proposing values and voting among agents to reach consensus.
 * Uses proposal-voting mechanism for distributed decision making.
 */

class ConsensusBuilder {
  /**
   * @param {BlackboardStore} blackboardStore - The shared blackboard store
   */
  constructor(blackboardStore) {
    if (!blackboardStore) {
      throw new Error('ConsensusBuilder requires a BlackboardStore');
    }
    
    this.blackboard = blackboardStore;
    
    // Store proposals: key -> Map<proposalId, Proposal>
    this.proposals = new Map();
    
    // Store votes: key -> Map<proposalId, Map<agentId, vote>>
    this.votes = new Map();
    
    // Proposal ID counter
    this.proposalCounter = 0;
    
    // Consensus results cache: key -> consensus value
    this.consensusCache = new Map();
    
    // Configuration
    this.defaultThreshold = 0.5; // Majority threshold
    this.requiredVotes = 2; // Minimum votes to consider consensus
  }

  /**
   * Propose a value for a key
   * @param {string} key - The knowledge key
   * @param {*} value - The proposed value
   * @param {string} agentId - The proposing agent
   * @returns {Object} Proposal details
   */
  propose(key, value, agentId) {
    this.proposalCounter++;
    const proposalId = `proposal_${this.proposalCounter}_${Date.now()}`;
    
    const proposal = {
      proposalId,
      key,
      value,
      agentId,
      timestamp: Date.now(),
      votesFor: 0,
      votesAgainst: 0,
      voters: new Set()
    };
    
    // Initialize proposal storage
    if (!this.proposals.has(key)) {
      this.proposals.set(key, new Map());
    }
    this.proposals.get(key).set(proposalId, proposal);
    
    // Initialize votes storage
    if (!this.votes.has(key)) {
      this.votes.set(key, new Map());
    }
    this.votes.get(key).set(proposalId, new Map());
    
    // Write initial proposal to blackboard as a proposal entry
    this.blackboard.write(
      `__proposal__${key}__${proposalId}`,
      {
        proposalId,
        key,
        value,
        agentId,
        timestamp: proposal.timestamp,
        type: 'proposal'
      },
      agentId
    );
    
    return {
      success: true,
      proposalId,
      key,
      value,
      agentId,
      timestamp: proposal.timestamp
    };
  }

  /**
   * Vote on a proposal
   * @param {string} key - The knowledge key
   * @param {string} proposalId - The proposal ID
   * @param {string} agentId - The voting agent
   * @param {boolean} approve - Whether to vote for or against
   * @returns {Object} Vote result
   */
  vote(key, proposalId, agentId, approve = true) {
    // Verify proposal exists
    if (!this.proposals.has(key) || !this.proposals.get(key).has(proposalId)) {
      return {
        success: false,
        error: 'Proposal not found'
      };
    }
    
    const proposal = this.proposals.get(key).get(proposalId);
    
    // Prevent double voting
    const keyVotes = this.votes.get(key).get(proposalId);
    if (keyVotes.has(agentId)) {
      return {
        success: false,
        error: 'Agent has already voted on this proposal'
      };
    }
    
    // Record vote
    keyVotes.set(agentId, approve);
    
    if (approve) {
      proposal.votesFor++;
    } else {
      proposal.votesAgainst++;
    }
    proposal.voters.add(agentId);
    
    // Record vote in blackboard
    this.blackboard.write(
      `__vote__${key}__${proposalId}__${agentId}`,
      {
        proposalId,
        key,
        agentId,
        approve,
        timestamp: Date.now(),
        type: 'vote'
      },
      agentId
    );
    
    return {
      success: true,
      proposalId,
      agentId,
      approve,
      currentVotesFor: proposal.votesFor,
      currentVotesAgainst: proposal.votesAgainst
    };
  }

  /**
   * Get consensus value for a key
   * @param {string} key - The knowledge key
   * @param {number} threshold - Override for majority threshold
   * @returns {Object} Consensus result
   */
  getConsensus(key, threshold = this.defaultThreshold) {
    // Check if we have proposals for this key
    if (!this.proposals.has(key)) {
      // Check if there's a direct value on blackboard (pre-consensus)
      const directValue = this.blackboard.read(key);
      if (directValue !== undefined) {
        return {
          hasConsensus: true,
          value: directValue,
          source: 'direct',
          method: 'direct'
        };
      }
      return {
        hasConsensus: false,
        error: 'No proposals found for key'
      };
    }
    
    const keyProposals = this.proposals.get(key);
    
    // Find proposal with majority consensus
    let bestProposal = null;
    let bestRatio = 0;
    
    for (const [proposalId, proposal] of keyProposals) {
      const totalVotes = proposal.votesFor + proposal.votesAgainst;
      
      if (totalVotes < this.requiredVotes) {
        continue;
      }
      
      const ratio = proposal.votesFor / totalVotes;
      
      if (ratio >= threshold && ratio > bestRatio) {
        bestRatio = ratio;
        bestProposal = proposal;
      }
    }
    
    if (bestProposal) {
      // Store consensus
      this.consensusCache.set(key, {
        value: bestProposal.value,
        proposalId: bestProposal.proposalId,
        ratio: bestRatio,
        timestamp: Date.now()
      });
      
      return {
        hasConsensus: true,
        value: bestProposal.value,
        proposalId: bestProposal.proposalId,
        votesFor: bestProposal.votesFor,
        votesAgainst: bestProposal.votesAgainst,
        ratio: bestRatio,
        method: 'vote'
      };
    }
    
    return {
      hasConsensus: false,
      error: 'No proposal reached consensus threshold',
      bestProposal: bestProposal ? {
        proposalId: bestProposal.proposalId,
        votesFor: bestProposal.votesFor,
        votesAgainst: bestProposal.votesAgainst,
        ratio: bestRatio
      } : null
    };
  }

  /**
   * Get voting results for a key
   * @param {string} key - The knowledge key
   * @returns {Object[]} All proposals and their vote counts
   */
  getProposalResults(key) {
    if (!this.proposals.has(key)) {
      return [];
    }
    
    const results = [];
    const keyProposals = this.proposals.get(key);
    
    for (const [proposalId, proposal] of keyProposals) {
      results.push({
        proposalId,
        key,
        value: proposal.value,
        agentId: proposal.agentId,
        timestamp: proposal.timestamp,
        votesFor: proposal.votesFor,
        votesAgainst: proposal.votesAgainst,
        totalVotes: proposal.votesFor + proposal.votesAgainst,
        ratio: proposal.votesFor + proposal.votesAgainst > 0
          ? proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)
          : 0,
        voters: [...proposal.voters]
      });
    }
    
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get all active proposals for a key
   * @param {string} key - The knowledge key
   * @returns {Object[]} Active proposals
   */
  getActiveProposals(key) {
    if (!this.proposals.has(key)) {
      return [];
    }
    
    const active = [];
    const keyProposals = this.proposals.get(key);
    const now = Date.now();
    const expiryTime = 5 * 60 * 1000; // 5 minutes
    
    for (const [proposalId, proposal] of keyProposals) {
      if (now - proposal.timestamp < expiryTime) {
        active.push({
          proposalId,
          key,
          value: proposal.value,
          agentId: proposal.agentId,
          timestamp: proposal.timestamp,
          votesFor: proposal.votesFor,
          votesAgainst: proposal.votesAgainst
        });
      }
    }
    
    return active;
  }

  /**
   * Check if a specific agent has voted on a proposal
   * @param {string} key - The knowledge key
   * @param {string} proposalId - The proposal ID
   * @param {string} agentId - The agent to check
   * @returns {boolean}
   */
  hasVoted(key, proposalId, agentId) {
    if (!this.votes.has(key) || !this.votes.get(key).has(proposalId)) {
      return false;
    }
    return this.votes.get(key).get(proposalId).has(agentId);
  }

  /**
   * Get cached consensus for a key
   * @param {string} key - The knowledge key
   * @returns {Object|null} Cached consensus or null
   */
  getCachedConsensus(key) {
    return this.consensusCache.get(key) || null;
  }

  /**
   * Clear consensus cache for a key
   * @param {string} key - The knowledge key
   */
  clearConsensusCache(key) {
    this.consensusCache.delete(key);
  }

  /**
   * Clear all proposals for a key
   * @param {string} key - The knowledge key
   */
  clearProposals(key) {
    this.proposals.delete(key);
    this.votes.delete(key);
    this.consensusCache.delete(key);
  }
}

export { ConsensusBuilder };