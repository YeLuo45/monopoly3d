/**
 * AuctionStrategy - Strategy templates for different auction scenarios
 * 
 * Provides pre-built strategies and dynamic selection logic.
 */

export class AuctionStrategy {
  constructor() {
    this.strategies = new Map();
    this.initializeStrategies();
  }

  /**
   * Initialize pre-built strategy templates
   */
  initializeStrategies() {
    this.strategies.set('conservative', {
      name: 'conservative',
      bidRatio: 0.7,
      maxOverpay: 0.1,
      threshold: 0.5,
      description: 'Bid close to property value, minimal overpayment',
      adaptForOpponent: false,
    });

    this.strategies.set('aggressive', {
      name: 'aggressive',
      bidRatio: 0.95,
      maxOverpay: 0.4,
      threshold: 0.3,
      description: 'Overpay to win, prioritizes winning over value',
      adaptForOpponent: false,
    });

    this.strategies.set('opportunistic', {
      name: 'opportunistic',
      bidRatio: 0.85,
      maxOverpay: 0.2,
      threshold: 0.7,
      description: 'Bid only on high-value targets with good odds',
      adaptForOpponent: true,
    });

    this.strategies.set('sniper', {
      name: 'sniper',
      bidRatio: 0.8,
      maxOverpay: 0.15,
      threshold: 0.6,
      description: 'Wait for good deals, low bid but strategic',
      adaptForOpponent: true,
    });

    this.strategies.set('defensive', {
      name: 'defensive',
      bidRatio: 0.65,
      maxOverpay: 0.05,
      threshold: 0.4,
      description: 'Block opponents from getting properties',
      adaptForOpponent: true,
    });
  }

  /**
   * Get conservative bidder strategy
   * @returns {object} Strategy config
   */
  getConservativeBidder() {
    return {
      ...this.strategies.get('conservative'),
      modifyForPhase: (phase) => {
        if (phase === 'early') {
          return { bidRatio: 0.75, maxOverpay: 0.15 };
        }
        if (phase === 'late') {
          return { bidRatio: 0.6, maxOverpay: 0.05 };
        }
        return {};
      },
    };
  }

  /**
   * Get aggressive bidder strategy
   * @returns {object} Strategy config
   */
  getAggressiveBidder() {
    return {
      ...this.strategies.get('aggressive'),
      modifyForPhase: (phase) => {
        if (phase === 'early') {
          return { bidRatio: 1.0, maxOverpay: 0.5 };
        }
        if (phase === 'late') {
          return { bidRatio: 0.9, maxOverpay: 0.3 };
        }
        return {};
      },
    };
  }

  /**
   * Get opportunistic bidder strategy
   * @returns {object} Strategy config
   */
  getOpportunisticBidder() {
    return {
      ...this.strategies.get('opportunistic'),
      modifyForPhase: (phase) => {
        if (phase === 'early') {
          return { threshold: 0.8 }; // Only best deals early
        }
        if (phase === 'late') {
          return { threshold: 0.5 }; // More flexible late
        }
        return {};
      },
    };
  }

  /**
   * Select optimal strategy based on game state and property value
   * @param {object} gameState - Current game state
   * @param {number} propertyValue - Assessed property value
   * @returns {object} Selected strategy with modifications
   */
  selectStrategy(gameState, propertyValue) {
    const phase = this.determinePhase(gameState);
    const playerMoney = this.getPlayerMoney(gameState);
    const competitivePressure = this.assessCompetitivePressure(gameState);
    
    // High-value property in early game -> aggressive
    if (propertyValue > 200 && phase === 'early') {
      return this.getAggressiveBidder();
    }
    
    // Low on money -> conservative
    if (playerMoney < propertyValue * 2) {
      return this.getConservativeBidder();
    }
    
    // High competition -> defensive or conservative
    if (competitivePressure > 0.7) {
      return this.getConservativeBidder();
    }
    
    // Late game with monopoly chance -> opportunistic
    if (phase === 'late' && this.hasMonopolyPotential(gameState)) {
      return this.getOpportunisticBidder();
    }
    
    // Default: balanced opportunistic
    return this.getOpportunisticBidder();
  }

  /**
   * Modify strategy based on specific opponent profile
   * @param {object} baseStrategy - Base strategy config
   * @param {object} opponentProfile - Opponent's known profile
   * @returns {object} Modified strategy
   */
  modifyForOpponent(baseStrategy, opponentProfile) {
    if (!opponentProfile) return baseStrategy;

    const modified = { ...baseStrategy };
    
    // Against conservative players - can bid higher
    if (opponentProfile.style === 'conservative' || opponentProfile.conservatism > 0.7) {
      modified.bidRatio = Math.min(modified.bidRatio + 0.1, 1.0);
      modified.maxOverpay = Math.min(modified.maxOverpay + 0.1, 0.5);
    }
    
    // Against aggressive players - match aggression or go defensive
    if (opponentProfile.aggressiveness > 0.7) {
      if (modified.name === 'defensive') {
        // Double down on defensive
        modified.maxOverpay = modified.maxOverpay * 0.5;
        modified.bidRatio = modified.bidRatio * 0.9;
      } else {
        // Match their aggression
        modified.bidRatio = Math.min(modified.bidRatio + 0.15, 1.0);
      }
    }
    
    // Against weak players (low money) - can be more aggressive
    if (opponentProfile.relativeWealth < 0.3) {
      modified.maxOverpay = Math.min(modified.maxOverpay + 0.1, 0.5);
    }
    
    // Learn from past behavior - if opponent often overpays, be patient
    if (opponentProfile.overbidTendency > 0.6) {
      modified.threshold = Math.min(modified.threshold + 0.1, 1.0);
    }
    
    return modified;
  }

  /**
   * Determine current game phase
   * @param {object} gameState - Game state
   * @returns {string} 'early', 'mid', or 'late'
   */
  determinePhase(gameState) {
    const turn = gameState?.turn || 1;
    
    if (turn <= 5) return 'early';
    if (turn <= 15) return 'mid';
    return 'late';
  }

  /**
   * Get current player's money
   * @param {object} gameState - Game state
   * @returns {number}
   */
  getPlayerMoney(gameState) {
    const currentIdx = gameState?.currentPlayerIndex ?? 0;
    return gameState?.players?.[currentIdx]?.money || 
           gameState?.players?.[0]?.money || 0;
  }

  /**
   * Assess how competitive the auction will be
   * @param {object} gameState - Game state
   * @returns {number} 0-1 pressure score
   */
  assessCompetitivePressure(gameState) {
    const players = gameState?.players || [];
    const activePlayers = players.filter(p => !p.bankrupt);
    
    // More players = more pressure
    let pressure = (activePlayers.length - 2) * 0.1;
    
    // Check for players with lots of properties (they're bidding)
    for (const player of activePlayers) {
      if ((player.properties?.length || 0) > 5) {
        pressure += 0.1;
      }
    }
    
    return Math.min(Math.max(pressure, 0), 1);
  }

  /**
   * Check if player has monopoly potential
   * @param {object} gameState - Game state
   * @returns {boolean}
   */
  hasMonopolyPotential(gameState) {
    const currentIdx = gameState?.currentPlayerIndex ?? 0;
    const player = gameState?.players?.[currentIdx] || gameState?.players?.[0];
    const properties = player?.properties || [];
    
    // Group properties by color
    const colorGroups = new Map();
    for (const prop of properties) {
      if (prop.colorGroup) {
        const existing = colorGroups.get(prop.colorGroup) || 0;
        colorGroups.set(prop.colorGroup, existing + 1);
      }
    }
    
    // Check if close to any monopoly (missing 1-2)
    for (const [, count] of colorGroups) {
      if (count >= 2 && count <= 3) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get all available strategy names
   * @returns {string[]}
   */
  getStrategyNames() {
    return Array.from(this.strategies.keys());
  }

  /**
   * Get raw strategy by name
   * @param {string} name - Strategy name
   * @returns {object}
   */
  getStrategy(name) {
    return this.strategies.get(name) || null;
  }
}