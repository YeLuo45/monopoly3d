/**
 * BudgetOptimizer - Optimize Budget Allocation
 * 
 * Distributes player money across different needs (housing, emergency,
 * investments) and resolves budget conflicts between competing priorities.
 */

export class BudgetOptimizer {
  constructor() {
    // Budget allocations as percentages
    this.defaultAllocations = {
      emergency: 0.2,      // 20% emergency fund
      housing: 0.3,       // 30% house building
      investment: 0.25,   // 25% property acquisition
      reserve: 0.15,      // 15% operational reserve
      upgrade: 0.1,       // 10% upgrades
    };
    
    // Minimum cash thresholds
    this.minCashThreshold = 200;
    this.emergencyThreshold = 500;
  }

  /**
   * Allocate budget for a player based on game state
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Budget allocation {categories, total, recommendations}
   */
  allocateBudget(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { categories: {}, total: 0, recommendations: [] };
    }
    
    const totalMoney = player.money || 0;
    const allocations = { ...this.defaultAllocations };
    const recommendations = [];
    
    // Adjust based on game phase
    const turn = gameState.turn || 1;
    const isEarlyGame = turn < 10;
    const isLateGame = turn > 25;
    
    // Early game: more to investment
    if (isEarlyGame) {
      allocations.investment = 0.4;
      allocations.housing = 0.2;
      allocations.emergency = 0.15;
      allocations.reserve = 0.15;
      allocations.upgrade = 0.1;
    }
    
    // Late game: more to emergency
    if (isLateGame) {
      allocations.emergency = 0.3;
      allocations.housing = 0.25;
      allocations.investment = 0.2;
      allocations.reserve = 0.15;
      allocations.upgrade = 0.1;
    }
    
    // Check cash flow health
    const cashFlowHealth = this._assessCashFlowHealth(playerId, gameState);
    
    if (cashFlowHealth === 'critical') {
      // Force emergency allocation
      allocations.emergency = 0.5;
      allocations.investment = 0.1;
      allocations.housing = 0.15;
      allocations.reserve = 0.15;
      allocations.upgrade = 0.1;
      
      recommendations.push({
        priority: 'critical',
        message: 'Critical cash flow - maximize emergency reserves',
      });
    }
    
    // Calculate category amounts
    const categories = {
      emergency: Math.round(totalMoney * allocations.emergency),
      housing: Math.round(totalMoney * allocations.housing),
      investment: Math.round(totalMoney * allocations.investment),
      reserve: Math.round(totalMoney * allocations.reserve),
      upgrade: Math.round(totalMoney * allocations.upgrade),
    };
    
    // Add recommendations
    if (categories.emergency < this.emergencyThreshold) {
      recommendations.push({
        priority: 'high',
        message: `Emergency fund low: $${categories.emergency} < $${this.emergencyThreshold} target`,
      });
    }
    
    const monopolyCount = this._countMonopolies(playerId, gameState);
    if (monopolyCount > 0) {
      recommendations.push({
        priority: 'high',
        message: `Own ${monopolyCount} monopoly(ies) - prioritize house building`,
      });
    }
    
    return {
      categories,
      total: totalMoney,
      allocations,
      recommendations,
    };
  }

  /**
   * Get budget for house building
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {number} Budget amount for housing
   */
  getHousingBudget(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    const totalMoney = player.money || 0;
    const safeMoney = this._getSafeMoney(playerId, gameState);
    const availableMoney = Math.min(totalMoney, safeMoney);
    
    // Find properties that can be built on (monopolies)
    const monopolies = this._getMonopolyProperties(playerId, gameState);
    
    if (monopolies.length === 0) {
      return 0; // No monopolies - can't build
    }
    
    // Calculate cost of building on each monopoly
    let totalBudgetNeeded = 0;
    const buildingPlan = [];
    
    for (const mono of monopolies) {
      const tilesInGroup = mono.tilesInGroup;
      const housesNeeded = mono.housesNeeded;
      
      if (housesNeeded > 0) {
        const costPerHouse = mono.houseCost;
        const totalCost = housesNeeded * costPerHouse;
        totalBudgetNeeded += totalCost;
        
        buildingPlan.push({
          colorGroup: mono.colorGroup,
          housesNeeded,
          costPerHouse,
          totalCost,
        });
      }
    }
    
    if (totalBudgetNeeded === 0) {
      return 0; // All built up or no houses needed
    }
    
    // Available budget is a portion of safe money
    const housingBudget = Math.min(
      availableMoney * this.defaultAllocations.housing,
      totalBudgetNeeded
    );
    
    return Math.round(housingBudget);
  }

  /**
   * Get emergency fund size
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Emergency fund details {current, target, deficit}
   */
  getEmergencyFund(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { current: 0, target: 0, deficit: 0 };
    }
    
    const currentCash = player.money || 0;
    const turn = gameState.turn || 1;
    
    // Target based on game phase
    let target = this.minCashThreshold;
    if (turn > 10) {
      target = this.emergencyThreshold;
    }
    if (turn > 25) {
      target = this.emergencyThreshold * 2;
    }
    
    // Adjust for opponent wealth
    const opponentWealth = this._getAverageOpponentWealth(playerId, gameState);
    if (opponentWealth > 2000) {
      target *= 1.5; // Need more reserves against rich opponents
    }
    
    const deficit = Math.max(0, target - currentCash);
    
    return {
      current: currentCash,
      target: Math.round(target),
      deficit: Math.round(deficit),
      sufficient: currentCash >= target,
    };
  }

  /**
   * Resolve budget conflict between two options
   * @param {object} optionA - First option {name, cost, priority, expectedReturn}
   * @param {object} optionB - Second option {name, cost, priority, expectedReturn}
   * @param {object} gameState - Current game state
   * @returns {object} Resolution {winner, loser, reasoning}
   */
  resolveBudgetConflict(optionA, optionB, gameState) {
    // Validate inputs
    if (!optionA || !optionB) {
      return { winner: null, loser: null, reasoning: 'Invalid options' };
    }
    
    // Priority overrides everything
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityA = priorityOrder[optionA.priority] ?? 2;
    const priorityB = priorityOrder[optionB.priority] ?? 2;
    
    if (priorityA !== priorityB) {
      const winner = priorityA < priorityB ? optionA : optionB;
      const loser = priorityA < priorityB ? optionB : optionA;
      return {
        winner: winner.name,
        loser: loser.name,
        reasoning: `${winner.name} wins due to higher priority (${winner.priority})`,
      };
    }
    
    // Same priority - compare expected return
    const returnA = optionA.expectedReturn || 0;
    const returnB = optionB.expectedReturn || 0;
    
    if (Math.abs(returnA - returnB) > 0.01) {
      const winner = returnA > returnB ? optionA : optionB;
      const loser = returnA > returnB ? optionB : optionA;
      return {
        winner: winner.name,
        loser: loser.name,
        reasoning: `${winner.name} wins due to better ROI (${(returnA * 100).toFixed(1)}% vs ${(returnB * 100).toFixed(1)}%)`,
      };
    }
    
    // Same priority and return - compare cost (prefer cheaper)
    const winner = optionA.cost <= optionB.cost ? optionA : optionB;
    const loser = optionA.cost <= optionB.cost ? optionB : optionA;
    return {
      winner: winner.name,
      loser: loser.name,
      reasoning: `${winner.name} wins due to lower cost ($${winner.cost} vs $${loser.cost})`,
    };
  }

  /**
   * Get investment budget
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Investment budget details
   */
  getInvestmentBudget(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { available: 0, recommendations: [] };
    }
    
    const totalMoney = player.money || 0;
    const safeMoney = this._getSafeMoney(playerId, gameState);
    const available = Math.min(totalMoney * 0.25, safeMoney - this.minCashThreshold);
    
    // Find best property investments
    const recommendations = this._getPropertyRecommendations(playerId, gameState);
    
    return {
      available: Math.max(0, Math.round(available)),
      recommendations: recommendations.slice(0, 3), // Top 3
    };
  }

  /**
   * Assess if cash flow is healthy
   * @private
   */
  _assessCashFlowHealth(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 'unknown';
    
    const cash = player.money || 0;
    
    if (cash < this.minCashThreshold) {
      return 'critical';
    }
    
    if (cash < this.emergencyThreshold) {
      return 'low';
    }
    
    return 'healthy';
  }

  /**
   * Get safe money (money that can be spent without risk)
   * @private
   */
  _getSafeMoney(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    const cash = player.money || 0;
    const turn = gameState.turn || 1;
    
    // Safe money is cash minus minimum threshold
    let threshold = this.minCashThreshold;
    if (turn > 10) {
      threshold = this.emergencyThreshold;
    }
    
    return Math.max(0, cash - threshold);
  }

  /**
   * Count monopolies owned by player
   * @private
   */
  _countMonopolies(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    const playerProperties = player.properties || [];
    const colorGroups = new Set();
    
    for (const prop of playerProperties) {
      if (prop.colorGroup) {
        colorGroups.add(prop.colorGroup);
      }
    }
    
    let monopolies = 0;
    
    for (const colorGroup of colorGroups) {
      const tilesInGroup = (gameState.tiles || [])
        .filter(t => t.colorGroup === colorGroup && t.type === 'property');
      
      const ownedInGroup = tilesInGroup.filter(t =>
        playerProperties.some(p => p.id === t.id)
      );
      
      if (ownedInGroup.length === tilesInGroup.length && tilesInGroup.length > 0) {
        monopolies++;
      }
    }
    
    return monopolies;
  }

  /**
   * Get monopoly properties with building info
   * @private
   */
  _getMonopolyProperties(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return [];
    
    const playerProperties = player.properties || [];
    const colorGroups = new Set();
    
    for (const prop of playerProperties) {
      if (prop.colorGroup) {
        colorGroups.add(prop.colorGroup);
      }
    }
    
    const monopolies = [];
    
    for (const colorGroup of colorGroups) {
      const tilesInGroup = (gameState.tiles || [])
        .filter(t => t.colorGroup === colorGroup && t.type === 'property');
      
      const ownedInGroup = tilesInGroup.filter(t =>
        playerProperties.some(p => p.id === t.id)
      );
      
      if (ownedInGroup.length === tilesInGroup.length && tilesInGroup.length > 0) {
        // Calculate houses needed to fully build
        let maxHouses = 0;
        let houseCost = 50;
        
        for (const tile of ownedInGroup) {
          maxHouses += 5 - (tile.houses || 0); // 5 houses to hotel
          houseCost = tile.houseCost || 50;
        }
        
        monopolies.push({
          colorGroup,
          tilesInGroup: ownedInGroup.length,
          housesNeeded: maxHouses,
          houseCost,
        });
      }
    }
    
    return monopolies;
  }

  /**
   * Get property investment recommendations
   * @private
   */
  _getPropertyRecommendations(playerId, gameState) {
    const tiles = gameState.tiles || [];
    const properties = tiles.filter(t => t.type === 'property');
    
    const recommendations = [];
    
    for (const property of properties) {
      // Skip if already owned
      const player = this._getPlayer(playerId, gameState);
      if (player?.properties?.some(p => p.id === property.id)) continue;
      
      // Calculate value score
      const rentValue = property.rent || 0;
      const price = property.price || 1;
      const valueScore = rentValue / price;
      
      recommendations.push({
        id: property.id,
        name: property.name,
        price,
        rent: rentValue,
        valueScore: Math.round(valueScore * 100) / 100,
      });
    }
    
    // Sort by value score
    recommendations.sort((a, b) => b.valueScore - a.valueScore);
    
    return recommendations;
  }

  /**
   * Get average opponent wealth
   * @private
   */
  _getAverageOpponentWealth(playerId, gameState) {
    const players = gameState.players || [];
    const opponents = players.filter(p => p.id !== playerId);
    
    if (opponents.length === 0) return 0;
    
    let totalWealth = 0;
    
    for (const opponent of opponents) {
      totalWealth += opponent.money || 0;
    }
    
    return totalWealth / opponents.length;
  }

  /**
   * Get player by ID
   * @private
   */
  _getPlayer(playerId, gameState) {
    const players = gameState.players || [];
    return players.find(p => p.id === playerId) || null;
  }
}