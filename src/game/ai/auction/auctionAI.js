/**
 * AuctionAI - Smart auction bidder that optimizes auction outcomes
 * 
 * Uses memory layer and opponent modeling to make intelligent bidding decisions.
 */

export class AuctionAI {
  /**
   * @param {object} memoryLayer - AI memory layer (L0-L4)
   * @param {object} opponentModel - Opponent modeling engine
   */
  constructor(memoryLayer, opponentModel) {
    this.memory = memoryLayer;
    this.opponentModel = opponentModel;
    this.bidHistory = [];
    this.strategyProfiles = new Map();
    
    // Initialize default bid parameters
    this.defaultMaxBidRatio = 1.2; // Max 120% of property value
    this.minConfidenceThreshold = 0.3;
  }

  /**
   * Calculate optimal bid for a property
   * @param {string} propertyId - Property to bid on
   * @param {object} gameState - Current game state
   * @returns {object} {bid, confidence, reasoning}
   */
  calculateOptimalBid(propertyId, gameState) {
    const propertyValue = this.assessPropertyValue(propertyId, gameState);
    const winProb = this.calculateWinProbability(propertyId, gameState);
    const phase = this.adjustForPhase(gameState);
    
    const myPlayer = this.getCurrentPlayer(gameState);
    const myMoney = myPlayer?.money || 0;
    
    // Calculate base bid as a fraction of property value
    let baseBidRatio = 0.8;
    
    // Adjust based on game phase
    if (phase === 'early') {
      baseBidRatio = 0.85; // More aggressive early
    } else if (phase === 'late') {
      baseBidRatio = 0.9; // Still need properties
    }
    
    // Adjust based on win probability (higher chance = can bid more)
    if (winProb > 0.7) {
      baseBidRatio = Math.min(baseBidRatio + 0.1, 1.0);
    } else if (winProb < 0.3) {
      baseBidRatio = Math.max(baseBidRatio - 0.15, 0.5);
    }
    
    // Calculate bid amount
    let bid = Math.floor(propertyValue * baseBidRatio);
    
    // Cap at what we can afford (leave some buffer)
    const maxAffordable = Math.floor(myMoney * 0.9);
    bid = Math.min(bid, maxAffordable);
    
    // Ensure bid is positive
    bid = Math.max(bid, 1);
    
    // Calculate confidence based on various factors
    let confidence = 0.5;
    confidence += winProb * 0.3;
    confidence += this.getStrategicValueBoost(propertyId, gameState) * 0.2;
    
    // Build reasoning
    const reasoning = this.buildBidReasoning(propertyId, propertyValue, winProb, phase, gameState);
    
    // Store this bid in history
    this.bidHistory.push({
      propertyId,
      bid,
      propertyValue,
      winProb,
      phase,
      timestamp: Date.now()
    });
    
    return { bid, confidence: Math.min(confidence, 1), reasoning };
  }

  /**
   * Determine if we should participate in an auction
   * @param {string} propertyId - Property being auctioned
   * @param {object} gameState - Current game state
   * @returns {boolean}
   */
  shouldParticipate(propertyId, gameState) {
    const propertyValue = this.assessPropertyValue(propertyId, gameState);
    
    // Don't participate if property value is too low
    if (propertyValue < 30) {
      return false;
    }
    
    // Check if we already own similar properties (monopoly potential)
    const monopolyBonus = this.getMonopolyPotential(propertyId, gameState);
    
    // Don't participate if we can't afford it
    const myPlayer = this.getCurrentPlayer(gameState);
    if (!myPlayer || myPlayer.money < propertyValue * 0.5) {
      return false;
    }
    
    // High monopoly potential = definitely participate
    if (monopolyBonus > 0.8) {
      return true;
    }
    
    // Low value properties - skip
    if (monopolyBonus < 0.3 && propertyValue < 80) {
      return false;
    }
    
    return true;
  }

  /**
   * Adjust bid based on opponent behavior
   * @param {number} currentBid - Current highest bid
   * @param {Array} opponents - Other players in auction
   * @param {string} propertyId - Property being auctioned
   * @param {object} gameState - Current game state
   * @returns {number} Adjusted bid
   */
  adjustBidFromOpponents(currentBid, opponents, propertyId, gameState) {
    const propertyValue = this.assessPropertyValue(propertyId, gameState);
    const maxBid = Math.floor(propertyValue * this.defaultMaxBidRatio);
    
    let adjustedBid = currentBid;
    
    for (const opponent of opponents) {
      if (!opponent || !opponent.id) continue;
      
      // Get opponent's bidding pattern from model
      const profile = this.getOpponentProfile(opponent.id);
      
      if (profile) {
        // If opponent is aggressive, be more willing to outbid
        if (profile.aggressiveness > 0.7) {
          const increment = Math.floor(propertyValue * 0.05);
          adjustedBid += increment;
        }
        
        // If opponent tends to overpay, be more cautious
        if (profile.overbidTendency > 0.6) {
          // Only match if we really want this property
          const strategicValue = this.getMonopolyPotential(propertyId, gameState);
          if (strategicValue < 0.7) {
            adjustedBid = currentBid; // Don't raise further
          }
        }
      }
    }
    
    // Cap at max bid
    adjustedBid = Math.min(adjustedBid, maxBid);
    
    // Leave some money for other opportunities
    const myPlayer = this.getCurrentPlayer(gameState);
    if (myPlayer) {
      adjustedBid = Math.min(adjustedBid, Math.floor(myPlayer.money * 0.85));
    }
    
    return adjustedBid;
  }

  /**
   * Assess true property value for bidding decisions
   * @param {string} propertyId - Property to assess
   * @param {object} gameState - Current game state
   * @returns {number} Property value
   */
  assessPropertyValue(propertyId, gameState) {
    const property = this.findProperty(propertyId, gameState);
    
    if (!property) {
      return 50; // Default fallback
    }
    
    let value = property.price || 50;
    
    // Factor in rent potential
    if (property.rent && Array.isArray(property.rent)) {
      const baseRent = property.rent[0];
      // Calculate ROI - higher is better
      const roi = baseRent / value;
      // Properties with higher ROI are worth more
      value += baseRent * 3; // Add value of 3 years rent
    }
    
    // Add monopoly potential
    const monopolyBonus = this.getMonopolyPotential(propertyId, gameState);
    value = Math.floor(value * (1 + monopolyBonus * 0.5));
    
    // Check if it's a corner property (high value)
    if (this.isCornerProperty(propertyId, gameState)) {
      value = Math.floor(value * 1.1);
    }
    
    // Check if it's a utility - special case
    if (property.type === 'utility') {
      value = Math.floor(value * 1.15); // Utilities are valuable
    }
    
    return value;
  }

  /**
   * Calculate probability of winning this auction
   * @param {string} propertyId - Property being auctioned
   * @param {object} gameState - Current game state
   * @returns {number} Probability 0-1
   */
  calculateWinProbability(propertyId, gameState) {
    const myPlayer = this.getCurrentPlayer(gameState);
    if (!myPlayer) return 0.5;
    
    const propertyValue = this.assessPropertyValue(propertyId, gameState);
    const myMoney = myPlayer.money || 0;
    
    // Base probability on relative wealth
    let prob = 0.5;
    
    // Money advantage
    if (myMoney > propertyValue * 3) {
      prob += 0.25;
    } else if (myMoney < propertyValue) {
      prob -= 0.3;
    }
    
    // Property strategic value affects how hard we'll fight
    const strategicValue = this.getMonopolyPotential(propertyId, gameState);
    if (strategicValue > 0.8) {
      prob += 0.1; // We're more motivated
    }
    
    // Count competitors
    const activePlayers = gameState.players?.filter(p => !p.bankrupt) || [];
    if (activePlayers.length <= 2) {
      prob += 0.1;
    } else if (activePlayers.length > 4) {
      prob -= 0.1;
    }
    
    // Factor in opponent tendencies
    if (this.opponentModel) {
      const aggressiveOpponents = this.getAggressiveOpponentCount(gameState);
      prob -= aggressiveOpponents * 0.05;
    }
    
    return Math.max(0.1, Math.min(0.9, prob));
  }

  /**
   * Adjust strategy based on game phase
   * @param {object} gameState - Current game state
   * @returns {string} Phase: 'early', 'mid', 'late'
   */
  adjustForPhase(gameState) {
    const turn = gameState?.turn || 1;
    
    if (turn <= 5) {
      return 'early';
    } else if (turn <= 15) {
      return 'mid';
    } else {
      return 'late';
    }
  }

  /**
   * Get current player from game state
   * @param {object} gameState - Game state
   * @returns {object} Current player
   */
  getCurrentPlayer(gameState) {
    const currentIdx = gameState?.currentPlayerIndex ?? 0;
    return gameState?.players?.[currentIdx] || gameState?.players?.[0];
  }

  /**
   * Find property by ID in game state
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Game state
   * @returns {object} Property or null
   */
  findProperty(propertyId, gameState) {
    const props = gameState?.properties || gameState?.tiles || [];
    return props.find(p => p.id == propertyId) || null;
  }

  /**
   * Calculate monopoly potential for a property
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Game state
   * @returns {number} 0-1 score
   */
  getMonopolyPotential(propertyId, gameState) {
    const property = this.findProperty(propertyId, gameState);
    if (!property) return 0;
    
    const colorGroup = property.colorGroup;
    if (!colorGroup) return 0;
    
    const props = gameState?.properties || gameState?.tiles || [];
    const sameColor = props.filter(p => p.colorGroup === colorGroup);
    
    if (sameColor.length === 0) return 0;
    
    // Count how many of this color I own
    const myPlayer = this.getCurrentPlayer(gameState);
    const myProps = myPlayer?.properties || [];
    const myColorCount = myProps.filter(p => p.colorGroup === colorGroup).length;
    
    // Already have monopoly
    if (myColorCount === sameColor.length) {
      return 1.0;
    }
    
    // Can still complete monopoly
    const needed = sameColor.length - myColorCount;
    if (needed === 1) {
      return 0.9;
    } else if (needed === 2) {
      return 0.6;
    }
    
    return 0.3;
  }

  /**
   * Get boost from strategic property value
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Game state
   * @returns {number} 0-1 boost
   */
  getStrategicValueBoost(propertyId, gameState) {
    let boost = 0;
    
    // Corner properties are strategic
    if (this.isCornerProperty(propertyId, gameState)) {
      boost += 0.2;
    }
    
    // High-value properties
    const property = this.findProperty(propertyId, gameState);
    if (property && property.price > 200) {
      boost += 0.15;
    }
    
    // Monopoly potential
    boost += this.getMonopolyPotential(propertyId, gameState) * 0.3;
    
    return Math.min(boost, 0.5);
  }

  /**
   * Check if property is a corner space
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Game state
   * @returns {boolean}
   */
  isCornerProperty(propertyId, gameState) {
    // Standard Monopoly corners: Go, Jail, Free Parking, Go To Jail
    const cornerIds = [1, 11, 21, 31]; // Simplified
    return cornerIds.includes(parseInt(propertyId));
  }

  /**
   * Get opponent profile from model
   * @param {string} opponentId - Opponent ID
   * @returns {object} Profile or null
   */
  getOpponentProfile(opponentId) {
    if (this.strategyProfiles.has(opponentId)) {
      return this.strategyProfiles.get(opponentId);
    }
    
    if (this.opponentModel?.getProfile) {
      const profile = this.opponentModel.getProfile(opponentId);
      this.strategyProfiles.set(opponentId, profile);
      return profile;
    }
    
    return null;
  }

  /**
   * Get count of aggressive opponents
   * @param {object} gameState - Game state
   * @returns {number}
   */
  getAggressiveOpponentCount(gameState) {
    let count = 0;
    const players = gameState.players || [];
    
    for (const player of players) {
      if (player.id === this.getCurrentPlayer(gameState)?.id) continue;
      
      const profile = this.getOpponentProfile(player.id);
      if (profile?.aggressiveness > 0.7) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Build reasoning string for bid decision
   * @param {string} propertyId - Property ID
   * @param {number} propertyValue - Assessed value
   * @param {number} winProb - Win probability
   * @param {string} phase - Game phase
   * @param {object} gameState - Game state
   * @returns {string} Reasoning
   */
  buildBidReasoning(propertyId, propertyValue, winProb, phase, gameState) {
    const property = this.findProperty(propertyId, gameState);
    const name = property?.name || `Property ${propertyId}`;
    
    let reasoning = `${name} valued at ${propertyValue}. `;
    reasoning += `Win probability: ${Math.round(winProb * 100)}%. `;
    reasoning += `Phase: ${phase}.`;
    
    return reasoning;
  }
}