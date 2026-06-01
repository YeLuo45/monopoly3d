/**
 * CashFlowAnalyzer - Analyze and predict cash flow
 * 
 * Analyzes player cash flow patterns, projects future cash positions,
 * and identifies risks of cash shortfalls.
 */

export class CashFlowAnalyzer {
  constructor(memoryLayer) {
    this.memoryLayer = memoryLayer;
    
    // Average expenses per turn by category
    this.expenseRates = {
      rent: 0.15,           // 15% chance of paying rent
      tax: 0.1,             // 10% chance of taxes
      card: 0.08,           // 8% chance of chance/community chest
      building: 0.05,       // 5% chance of building costs
    };
    
    // Default cash reserve minimum
    this.minCashReserve = 200;
  }

  /**
   * Analyze cash flow for a player
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Cash flow analysis {inflow, outflow, net}
   */
  analyzeCashFlow(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { inflow: 0, outflow: 0, net: 0 };
    }
    
    const inflow = this._calculateInflow(playerId, gameState);
    const outflow = this._calculateOutflow(playerId, gameState);
    const net = inflow - outflow;
    
    return { inflow, outflow, net };
  }

  /**
   * Project cash flow for future turns
   * @param {string} playerId - Player ID
   * @param {number} turns - Number of turns to project
   * @param {object} gameState - Current game state
   * @returns {object} Projected cash position
   */
  projectCashFlow(playerId, turns, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { projectedCash: 0, inflow: 0, outflow: 0, risk: 'unknown' };
    }
    
    const currentCash = player.money || 0;
    const { inflow, outflow } = this.analyzeCashFlow(playerId, gameState);
    
    // Average net per turn
    const netPerTurn = inflow - outflow;
    const projectedCash = currentCash + (netPerTurn * turns);
    
    // Calculate risk level
    const risk = this._calculateProjectedRisk(currentCash, projectedCash, outflow, turns);
    
    return {
      projectedCash,
      inflow,
      outflow,
      netPerTurn,
      turns,
      risk,
    };
  }

  /**
   * Get cash shortfall risk assessment
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Risk assessment
   */
  getCashShortfallRisk(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { risk: 'unknown', turnsToShortfall: Infinity, severity: 0 };
    }
    
    const currentCash = player.money || 0;
    const { outflow } = this.analyzeCashFlow(playerId, gameState);
    
    if (outflow <= 0) {
      return { risk: 'low', turnsToShortfall: Infinity, severity: 0 };
    }
    
    // Calculate turns until cash runs out (with reserve)
    const availableCash = currentCash - this.minCashReserve;
    const turnsToShortfall = Math.floor(availableCash / outflow);
    
    // Calculate severity (0-1)
    let severity = 0;
    if (currentCash < this.minCashReserve) {
      severity = 1.0;
    } else {
      severity = 1 - (currentCash / (this.minCashReserve * 5));
    }
    severity = Math.max(0, Math.min(1, severity));
    
    // Determine risk level
    let risk = 'low';
    if (turnsToShortfall <= 2) {
      risk = 'critical';
    } else if (turnsToShortfall <= 5) {
      risk = 'high';
    } else if (turnsToShortfall <= 10) {
      risk = 'medium';
    }
    
    return { risk, turnsToShortfall, severity };
  }

  /**
   * Estimate rent income for a player
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {number} Expected rent income per turn
   */
  estimateRentIncome(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    const properties = player.properties || [];
    let totalRent = 0;
    
    for (const prop of properties) {
      if (prop.mortgaged) continue; // Mortgaged properties don't generate rent
      
      const tile = gameState.tiles?.find(t => t.id === prop.id);
      if (!tile) continue;
      
      // Base rent
      let rent = tile.rent || 0;
      
      // Add house/hotel rent
      if (tile.hotel) {
        rent = tile.hotelRent || rent * 5;
      } else if (tile.houses > 0) {
        const houseKey = `rentWith${tile.houses}House`;
        rent = tile[houseKey] || rent * (1 + tile.houses * 0.5);
      }
      
      // Probability of being landed on (simplified)
      const visitProb = this._estimateVisitProbability(tile, gameState);
      totalRent += rent * visitProb;
    }
    
    return Math.round(totalRent * 100) / 100;
  }

  /**
   * Get outstanding rent (rent owed to player from others)
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {number} Outstanding rent owed
   */
  getOutstandingRent(playerId, gameState) {
    // In a real implementation, this would track rent due from other players
    // For now, return 0 as Monopoly doesn't have pending rent in the same way
    return 0;
  }

  /**
   * Calculate total inflow (income) for a player
   * @private
   */
  _calculateInflow(playerId, gameState) {
    const rentIncome = this.estimateRentIncome(playerId, gameState);
    
    // Add other income sources (passing Go, etc)
    const passingGoIncome = this._estimatePassingGoIncome(playerId, gameState);
    
    return rentIncome + passingGoIncome;
  }

  /**
   * Calculate total outflow (expenses) for a player
   * @private
   */
  _calculateOutflow(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    // Estimate rent paid to others
    const rentPaid = this._estimateRentPaid(playerId, gameState);
    
    // Estimate other expenses
    const otherExpenses = this._estimateOtherExpenses(playerId, gameState);
    
    return rentPaid + otherExpenses;
  }

  /**
   * Estimate income from passing Go
   * @private
   */
  _estimatePassingGoIncome(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    // Average $200 per pass (standard Monopoly)
    const tiles = gameState.tiles || [];
    const positions = tiles.length || 40;
    
    // Average turns to pass Go
    const avgTurnsToPassGo = positions / 6; // ~6 spaces per turn average
    
    return 200 / avgTurnsToPassGo;
  }

  /**
   * Estimate rent paid to other players
   * @private
   */
  _estimateRentPaid(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    // This would need opponent property analysis
    // Simplified: assume 10% chance of landing on opponent property with rent
    const avgRentPerLanding = 20;
    const probabilityOfRent = 0.1;
    
    return avgRentPerLanding * probabilityOfRent;
  }

  /**
   * Estimate other expenses (taxes, cards, etc)
   * @private
   */
  _estimateOtherExpenses(playerId, gameState) {
    let total = 0;
    
    // Tax spaces
    const taxExpense = 100 * this.expenseRates.tax;
    total += taxExpense;
    
    // Chance/community chest (average $25 per card)
    const cardExpense = 25 * this.expenseRates.card;
    total += cardExpense;
    
    return total;
  }

  /**
   * Estimate probability of landing on a property
   * @private
   */
  _estimateVisitProbability(property, gameState) {
    const tiles = gameState.tiles || [];
    const propertyIndex = tiles.findIndex(t => t.id === property.id);
    
    if (propertyIndex === -1) return 0.1;
    
    const middleIndex = tiles.length / 2;
    const distanceFromMiddle = Math.abs(propertyIndex - middleIndex);
    const normalizedDistance = distanceFromMiddle / middleIndex;
    
    // Base probability 5-15%
    const probability = 0.10 - (normalizedDistance * 0.05);
    
    return Math.max(0.05, Math.min(0.15, probability));
  }

  /**
   * Calculate risk based on projected cash position
   * @private
   */
  _calculateProjectedRisk(currentCash, projectedCash, outflow, turns) {
    if (projectedCash < 0) return 'critical';
    if (projectedCash < this.minCashReserve) return 'high';
    if (projectedCash < this.minCashReserve * 2) return 'medium';
    return 'low';
  }

  /**
   * Get player from game state
   * @private
   */
  _getPlayer(playerId, gameState) {
    const players = gameState.players || [];
    return players.find(p => p.id === playerId) || null;
  }
}