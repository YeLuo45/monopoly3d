/**
 * TradeEvaluator - Evaluates fairness of Monopoly trades
 * 
 * Provides comprehensive trade analysis including:
 * - Fairness scoring (0-1 scale, 0.5 = fair)
 * - Equity value calculation for properties
 * - Trade health assessment
 * - Improvement recommendations
 */

export class TradeEvaluator {
  /**
   * @param {object} memoryLayer - AIMemoryLayer instance for accessing game data
   */
  constructor(memoryLayer) {
    this.memoryLayer = memoryLayer;
    
    // Property value multipliers based on position and monopoly status
    this.positionMultiplier = {
      early: 0.8,    // Positions 1-10
      mid: 1.0,     // Positions 11-20
      late: 1.2,    // Positions 21-40
    };
    
    // Base rent values by property type (simplified Monopoly board)
    this.baseRentValues = {
      // Brown (positions 1-2)
      'mediterranean_ave': 30,
      'baltic_ave': 30,
      // Light Blue (positions 3-5)
      'oriental_ave': 50,
      'vermont_ave': 50,
      'connecticut_ave': 60,
      // Pink (positions 6-8)
      'st_charles_place': 70,
      'states_ave': 70,
      'virginia_ave': 80,
      // Orange (positions 9-11)
      'st_james_place': 90,
      'tennessee_ave': 90,
      'new_york_ave': 100,
      // Red (positions 12-14)
      'kentucky_ave': 110,
      'indiana_ave': 110,
      'illinois_ave': 120,
      // Yellow (positions 15-17)
      'atlantic_ave': 130,
      'ventnor_ave': 130,
      'marvin_gardens': 140,
      // Green (positions 18-21)
      'pacific_ave': 150,
      'north_carolina_ave': 150,
      'pennsylvania_ave': 160,
      // Dark Blue (positions 22, 25)
      'park_place': 175,
      'boardwalk': 200,
      // Railroads (positions 5, 15, 25, 35)
      'reading_rr': 200,
      'pennsylvania_rr': 200,
      'b_and_o_rr': 200,
      'short_rr': 200,
      // Utilities (positions 12, 28)
      'electric_company': 150,
      'water_works': 150,
    };
  }

  /**
   * Core evaluation of a trade
   * @param {object} trade - Trade object {offered: {properties: [], money: Number}, requested: {properties: [], money: Number}, players: [proposerId, partnerId]}
   * @param {string} playerId - Player ID performing evaluation (to determine bias)
   * @param {object} gameState - Current game state
   * @returns {object} {fairness, bias, recommendedAdjustments, health}
   */
  evaluateTrade(trade, playerId, gameState) {
    const fairness = this.evaluateFairness(trade.offered, trade.requested, gameState);
    const bias = this.calculateBias(trade, playerId, gameState);
    const health = this.assessTradeHealth(trade, gameState);
    const adjustments = this.recommendImprovements(trade, playerId, gameState);
    
    return {
      fairness,
      bias,
      health,
      recommendedAdjustments: adjustments,
    };
  }

  /**
   * Evaluate fairness of a trade (0-1 scale, 0.5 = fair)
   * @param {object} offered - {properties: [], money: Number}
   * @param {object} requested - {properties: [], money: Number}
   * @param {object} gameState - Current game state
   * @returns {number} Fairness score 0-1
   */
  evaluateFairness(offered, requested, gameState) {
    const offeredValue = this.calculateEquityValue(offered.properties || [], gameState) + (offered.money || 0);
    const requestedValue = this.calculateEquityValue(requested.properties || [], gameState) + (requested.money || 0);
    
    if (offeredValue === 0 && requestedValue === 0) {
      return 0.5; // Neutral trade (e.g., property for property with equal value)
    }
    
    const ratio = Math.min(offeredValue, requestedValue) / Math.max(offeredValue, requestedValue);
    
    // Return ratio clamped to 0-1, with 0.5 being perfectly fair
    return Math.max(0, Math.min(1, ratio));
  }

  /**
   * Calculate equity value of properties
   * @param {Array} properties - Array of property IDs or property objects
   * @param {object} gameState - Current game state
   * @returns {number} Total equity value
   */
  calculateEquityValue(properties, gameState) {
    let totalValue = 0;
    
    for (const prop of properties) {
      const propId = typeof prop === 'string' ? prop : prop.id;
      const propValue = this.calculatePropertyValue(propId, gameState);
      totalValue += propValue;
    }
    
    return totalValue;
  }

  /**
   * Calculate value of a single property considering position, monopolies, rent potential
   * @param {string} propertyId - Property identifier
   * @param {object} gameState - Current game state
   * @returns {number} Property value
   */
  calculatePropertyValue(propertyId, gameState) {
    let baseValue = this.baseRentValues[propertyId] || 100;
    
    // Get position multiplier based on board position
    const position = this.getPropertyPosition(propertyId, gameState);
    let posMultiplier = 1.0;
    if (position <= 10) posMultiplier = 0.8;
    else if (position <= 20) posMultiplier = 1.0;
    else if (position <= 40) posMultiplier = 1.2;
    
    // Check monopoly bonus (30% increase if player owns all of a color)
    const monopolyBonus = this.getMonopolyBonus(propertyId, gameState);
    
    // Check house/hotel investment value
    const houseBonus = this.getHouseBonus(propertyId, gameState);
    
    // Calculate final value
    const value = baseValue * posMultiplier * (1 + monopolyBonus) * (1 + houseBonus);
    
    return Math.round(value);
  }

  /**
   * Get property board position
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Game state
   * @returns {number} Position (1-40)
   */
  getPropertyPosition(propertyId, gameState) {
    if (gameState.board) {
      const prop = gameState.board.find(p => p.id === propertyId);
      return prop ? prop.position || 0 : 0;
    }
    // Default positions for standard Monopoly properties
    const defaultPositions = {
      'mediterranean_ave': 1, 'baltic_ave': 2,
      'oriental_ave': 3, 'vermont_ave': 4, 'connecticut_ave': 5,
      'st_charles_place': 6, 'states_ave': 7, 'virginia_ave': 8,
      'st_james_place': 9, 'tennessee_ave': 10, 'new_york_ave': 11,
      'kentucky_ave': 12, 'indiana_ave': 13, 'illinois_ave': 14,
      'atlantic_ave': 15, 'ventnor_ave': 16, 'marvin_gardens': 17,
      'pacific_ave': 18, 'north_carolina_ave': 19, 'pennsylvania_ave': 20,
      'park_place': 22, 'boardwalk': 25,
      'reading_rr': 5, 'pennsylvania_rr': 15, 'b_and_o_rr': 25, 'short_rr': 35,
      'electric_company': 12, 'water_works': 28,
    };
    return defaultPositions[propertyId] || 0;
  }

  /**
   * Get monopoly bonus (fractional increase)
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Game state
   * @returns {number} Bonus multiplier (0.3 = 30% increase)
   */
  getMonopolyBonus(propertyId, gameState) {
    const colorGroups = {
      'brown': ['mediterranean_ave', 'baltic_ave'],
      'light_blue': ['oriental_ave', 'vermont_ave', 'connecticut_ave'],
      'pink': ['st_charles_place', 'states_ave', 'virginia_ave'],
      'orange': ['st_james_place', 'tennessee_ave', 'new_york_ave'],
      'red': ['kentucky_ave', 'indiana_ave', 'illinois_ave'],
      'yellow': ['atlantic_ave', 'ventnor_ave', 'marvin_gardens'],
      'green': ['pacific_ave', 'north_carolina_ave', 'pennsylvania_ave'],
      'dark_blue': ['park_place', 'boardwalk'],
    };
    
    for (const [color, props] of Object.entries(colorGroups)) {
      if (props.includes(propertyId)) {
        const owner = this.getPropertyOwner(propertyId, gameState);
        if (owner) {
          const ownedInGroup = props.filter(p => this.getPropertyOwner(p, gameState) === owner);
          if (ownedInGroup.length === props.length) {
            return 0.3; // 30% bonus for full monopoly
          }
        }
        return 0;
      }
    }
    
    // Railroads and utilities
    if (['reading_rr', 'pennsylvania_rr', 'b_and_o_rr', 'short_rr'].includes(propertyId)) {
      const owner = this.getPropertyOwner(propertyId, gameState);
      if (owner) {
        const railroads = ['reading_rr', 'pennsylvania_rr', 'b_and_o_rr', 'short_rr'];
        const ownedRrs = railroads.filter(r => this.getPropertyOwner(r, gameState) === owner);
        if (ownedRrs.length === 4) return 0.5; // 50% bonus for all railroads
        if (ownedRrs.length >= 2) return 0.2;
      }
    }
    
    return 0;
  }

  /**
   * Get house/hotel bonus
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Game state
   * @returns {number} Bonus multiplier
   */
  getHouseBonus(propertyId, gameState) {
    if (gameState.properties) {
      const prop = gameState.properties.find(p => p.id === propertyId);
      if (prop && prop.houses !== undefined) {
        if (prop.houses === 5) return 1.5; // Hotel
        if (prop.houses > 0) return prop.houses * 0.2; // 20% per house
      }
    }
    return 0;
  }

  /**
   * Get property owner
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Game state
   * @returns {string|null} Owner player ID or null
   */
  getPropertyOwner(propertyId, gameState) {
    if (gameState.properties) {
      const prop = gameState.properties.find(p => p.id === propertyId);
      return prop ? prop.owner : null;
    }
    return null;
  }

  /**
   * Assess overall trade health
   * @param {object} trade - Trade object
   * @param {object} gameState - Current game state
   * @returns {string} 'healthy' | 'unfair' | 'one-sided' | 'risky'
   */
  assessTradeHealth(trade, gameState) {
    const fairness = this.evaluateFairness(trade.offered, trade.requested, gameState);
    const offeredValue = this.calculateEquityValue(trade.offered?.properties || [], gameState) + (trade.offered?.money || 0);
    const requestedValue = this.calculateEquityValue(trade.requested?.properties || [], gameState) + (trade.requested?.money || 0);
    
    // Very low fairness indicates unfair trade
    if (fairness < 0.3) return 'unfair';
    
    // One-sided: one party gives only properties, other gives only money (or nothing)
    const offeredHasProperties = trade.offered?.properties?.length > 0;
    const offeredHasMoney = (trade.offered?.money || 0) > 0;
    const requestedHasProperties = trade.requested?.properties?.length > 0;
    const requestedHasMoney = (trade.requested?.money || 0) > 0;
    
    if (offeredHasProperties && !offeredHasMoney && !requestedHasProperties && requestedHasMoney) {
      return 'one-sided';
    }
    if (!offeredHasProperties && offeredHasMoney && requestedHasProperties && !requestedHasMoney) {
      return 'one-sided';
    }
    
    // Risky: trade involves high-value properties or large money
    const highValueThreshold = 500;
    if (offeredValue > highValueThreshold || requestedValue > highValueThreshold) {
      if (fairness < 0.6) return 'risky';
    }
    
    // Healthy: fair trade with reasonable values
    if (fairness >= 0.6) return 'healthy';
    
    return 'unfair';
  }

  /**
   * Calculate bias toward a specific player
   * @param {object} trade - Trade object
   * @param {string} playerId - Player ID to check bias for
   * @param {object} gameState - Game state
   * @returns {number} Bias score (-1 to 1), positive = favors playerId
   */
  calculateBias(trade, playerId, gameState) {
    const proposerId = trade.players?.[0];
    const partnerId = trade.players?.[1];
    
    if (!proposerId || !partnerId) return 0;
    
    // Determine which side the player is on
    const isProposer = playerId === proposerId;
    const playerOffered = isProposer ? trade.offered : trade.requested;
    const playerRequested = isProposer ? trade.requested : trade.offered;
    
    const offeredValue = this.calculateEquityValue(playerOffered?.properties || [], gameState) + (playerOffered?.money || 0);
    const requestedValue = this.calculateEquityValue(playerRequested?.properties || [], gameState) + (playerRequested?.money || 0);
    
    if (offeredValue === 0 && requestedValue === 0) return 0;
    
    // Calculate bias: positive means player is getting more value
    const netGain = requestedValue - offeredValue;
    const totalValue = offeredValue + requestedValue;
    
    return totalValue > 0 ? netGain / totalValue : 0;
  }

  /**
   * Suggest a fair trade between two sets of properties
   * @param {Array} playerAProps - Properties player A would give
   * @param {Array} playerBProps - Properties player B would give
   * @param {object} gameState - Current game state
   * @returns {object} {offerA, offerB, fairness} - suggested balanced offers
   */
  suggestFairTrade(playerAProps, playerBProps, gameState) {
    const valueA = this.calculateEquityValue(playerAProps, gameState);
    const valueB = this.calculateEquityValue(playerBProps, gameState);
    
    const diff = Math.abs(valueA - valueB);
    
    // If already fair, suggest keeping as-is
    if (diff < 50) {
      return {
        offerA: { properties: playerAProps, money: 0 },
        offerB: { properties: playerBProps, money: 0 },
        fairness: 1.0,
      };
    }
    
    // Suggest adjustments to balance the trade
    let offerA = { properties: [...playerAProps], money: 0 };
    let offerB = { properties: [...playerBProps], money: 0 };
    
    if (valueA > valueB) {
      // Player A should give or receive money adjustment
      offerB.money = diff;
      offerA.money = 0;
    } else {
      // Player B should give or receive money adjustment
      offerA.money = diff;
      offerB.money = 0;
    }
    
    const fairness = this.evaluateFairness(offerA, offerB, gameState);
    
    return { offerA, offerB, fairness };
  }

  /**
   * Recommend how to make a trade fair
   * @param {object} trade - Current trade object
   * @param {string} playerId - Player ID to recommend improvements for
   * @param {object} gameState - Current game state
   * @returns {Array} Array of improvement suggestions
   */
  recommendImprovements(trade, playerId, gameState) {
    const suggestions = [];
    const offeredValue = this.calculateEquityValue(trade.offered?.properties || [], gameState) + (trade.offered?.money || 0);
    const requestedValue = this.calculateEquityValue(trade.requested?.properties || [], gameState) + (trade.requested?.money || 0);
    
    const proposerId = trade.players?.[0];
    const isProposer = playerId === proposerId;
    
    if (isProposer) {
      // Proposer is giving too much
      if (offeredValue > requestedValue) {
        const diff = offeredValue - requestedValue;
        if (diff > 50) {
          suggestions.push({
            type: 'add_money',
            target: 'offered',
            amount: diff,
            message: `Add $${diff} to your offer to balance the trade`,
          });
        }
        suggestions.push({
          type: 'remove_property',
          target: 'offered',
          message: 'Consider removing a property from your offer',
        });
      } else {
        // Proposer is receiving too much
        const diff = requestedValue - offeredValue;
        if (diff > 50) {
          suggestions.push({
            type: 'add_money',
            target: 'requested',
            amount: diff,
            message: `Add $${diff} to what you receive to balance the trade`,
          });
        }
      }
    } else {
      // Partner is giving too much
      if (offeredValue > requestedValue) {
        const diff = offeredValue - requestedValue;
        if (diff > 50) {
          suggestions.push({
            type: 'add_money',
            target: 'offered',
            amount: diff,
            message: `Add $${diff} to your offer to balance the trade`,
          });
        }
      }
    }
    
    // Check for monopoly implications
    const monopolySuggestions = this.getMonopolySuggestions(trade, playerId, gameState);
    suggestions.push(...monopolySuggestions);
    
    return suggestions;
  }

  /**
   * Get monopoly-related improvement suggestions
   * @param {object} trade - Trade object
   * @param {string} playerId - Player ID
   * @param {object} gameState - Game state
   * @returns {Array} Monopoly-based suggestions
   */
  getMonopolySuggestions(trade, playerId, gameState) {
    const suggestions = [];
    
    // Check if giving up a monopoly
    const playerProps = trade.offered?.properties || [];
    
    const colorGroups = {
      'brown': ['mediterranean_ave', 'baltic_ave'],
      'light_blue': ['oriental_ave', 'vermont_ave', 'connecticut_ave'],
      'pink': ['st_charles_place', 'states_ave', 'virginia_ave'],
      'orange': ['st_james_place', 'tennessee_ave', 'new_york_ave'],
      'red': ['kentucky_ave', 'indiana_ave', 'illinois_ave'],
      'yellow': ['atlantic_ave', 'ventnor_ave', 'marvin_gardens'],
      'green': ['pacific_ave', 'north_carolina_ave', 'pennsylvania_ave'],
      'dark_blue': ['park_place', 'boardwalk'],
    };
    
    for (const [color, props] of Object.entries(colorGroups)) {
      const owned = props.filter(p => this.getPropertyOwner(p, gameState) === playerId);
      const inTrade = playerProps.filter(p => props.includes(p));
      
      if (owned.length === props.length && inTrade.length > 0) {
        suggestions.push({
          type: 'warning',
          message: `Warning: Trading away properties may break your ${color} monopoly`,
        });
      }
    }
    
    return suggestions;
  }
}