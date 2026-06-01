/**
 * MortgagePlannerAI - Strategic mortgage decisions
 * 
 * Provides AI-powered mortgage planning including when to mortgage/unmortgage
 * properties, liquidity management, and emergency planning.
 */

export class MortgagePlannerAI {
  constructor(memoryLayer, propertyValuation) {
    this.memoryLayer = memoryLayer;
    this.propertyValuation = propertyValuation;
    
    // Cash reserve thresholds
    this.minCashReserve = 300;         // Minimum operational cash
    this.emergencyCashReserve = 150;  // Emergency minimum
    this.opportunityCashThreshold = 500; // Cash needed for opportunities
    
    // Priority thresholds
    this.highPriorityThreshold = 0.8;
    this.mediumPriorityThreshold = 0.5;
  }

  /**
   * Determine if a property should be mortgaged
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} Recommendation {should, reason, priority}
   */
  shouldMortgage(propertyId, gameState) {
    const player = this._getPlayer(gameState.currentPlayerId, gameState);
    if (!player) {
      return { should: false, reason: 'Player not found', priority: 0 };
    }
    
    const property = this._getProperty(propertyId, gameState);
    if (!property) {
      return { should: false, reason: 'Property not found', priority: 0 };
    }
    
    // Check if already mortgaged (check player's property record, not tile)
    const playerProperty = (player.properties || []).find(p => p.id === propertyId);
    if (playerProperty && playerProperty.mortgaged) {
      return { should: false, reason: 'Already mortgaged', priority: 0 };
    }
    
    // Check cash position
    const cashRatio = player.money / this.minCashReserve;
    
    // Check if property generates rent (non-mortgagable if it generates good rent)
    const rent = property.rent || 0;
    const colorGroup = property.colorGroup;
    const sameColorOwned = (player.properties || []).filter(p => {
      const t = gameState.tiles?.find(t => t.id === p.id);
      return t && t.colorGroup === colorGroup;
    }).length;
    
    const tilesInGroup = (gameState.tiles || []).filter(t => 
      t.colorGroup === colorGroup && t.type === 'property'
    ).length;
    
    const isMonopoly = sameColorOwned === tilesInGroup && tilesInGroup > 0;
    
    // High-rent monopoly properties should NOT be mortgaged unless critical emergency
    // Only preserve if player has sufficient cash (cashRatio >= 1.0)
    if (isMonopoly && rent > 20 && cashRatio >= 1.0) {
      return { 
        should: false, 
        reason: 'High-rent monopoly property - preserve', 
        priority: 0 
      };
    }
    
    // Calculate priority based on cash need
    let priority = 0;
    let reason = '';
    
    if (cashRatio < 1.0) {
      // Critical - need cash
      priority = 1.0;
      reason = 'Critical cash shortage - mortgage to survive';
    } else if (cashRatio < 1.5) {
      // Low cash - mortgage lower-value properties
      priority = 0.7;
      reason = 'Low cash reserves - consider mortgage';
      
      // Lower priority for properties with rent potential
      if (rent > 10) {
        priority = 0.4;
        reason = 'Cash is low but property has rent potential';
      }
    } else if (cashRatio < 2.5) {
      // Moderate - mortgage for strategic purposes
      priority = 0.3;
      reason = 'Cash could be used more efficiently';
    }
    
    // If player is in danger of foreclosure, increase priority
    const turnsToDanger = this._getTurnsToDanger(player.id, gameState);
    if (turnsToDanger < 5) {
      priority = Math.min(1.0, priority + 0.3);
      reason = `Foreclosure risk in ${turnsToDanger} turns`;
    }
    
    return { should: priority > 0.5, reason, priority };
  }

  /**
   * Determine if a property should be unmortgaged
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} Recommendation {should, reason, timing}
   */
  shouldUnmortgage(propertyId, gameState) {
    const player = this._getPlayer(gameState.currentPlayerId, gameState);
    if (!player) {
      return { should: false, reason: 'Player not found', timing: 'never' };
    }
    
    const property = this._getProperty(propertyId, gameState);
    if (!property) {
      return { should: false, reason: 'Property not found', timing: 'never' };
    }
    
    // Check if mortgaged
    if (!property.mortgaged) {
      return { should: false, reason: 'Not mortgaged', timing: 'never' };
    }
    
    const mortgageValue = Math.floor((property.price || 0) * 0.5);
    
    // Check affordability
    if ((player.money || 0) < mortgageValue + this.minCashReserve) {
      return { should: false, reason: 'Cannot afford to unmortgage', timing: 'later' };
    }
    
    // Calculate timing
    const cashRatio = (player.money || 0) / this.minCashReserve;
    const rent = property.rent || 0;
    const colorGroup = property.colorGroup;
    
    // Monopoly properties with high rent should be unmortgaged ASAP
    const sameColorOwned = (player.properties || []).filter(p => {
      const t = gameState.tiles?.find(t => t.id === p.id);
      return t && t.colorGroup === colorGroup;
    }).length;
    
    const tilesInGroup = (gameState.tiles || []).filter(t => 
      t.colorGroup === colorGroup && t.type === 'property'
    ).length;
    
    const isMonopoly = sameColorOwned === tilesInGroup && tilesInGroup > 0;
    
    let timing = 'later';
    let reason = 'Not a priority';
    
    if (isMonopoly && rent > 15) {
      timing = 'immediate';
      reason = 'Monopoly property - unmortgage immediately for maximum rent';
    } else if (isMonopoly) {
      timing = 'soon';
      reason = 'Part of monopoly - unmortgage when cash allows';
    } else if (cashRatio > 3 && rent > 10) {
      timing = 'soon';
      reason = 'Strong cash position - unmortgage profitable properties';
    } else if (rent > 20) {
      timing = 'eventually';
      reason = 'High-rent property - plan to unmortgage';
    }
    
    return { should: timing !== 'never', reason, timing };
  }

  /**
   * Get full mortgage strategy for a player
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Complete mortgage plan
   */
  getMortgagePlan(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { actions: [], summary: 'Player not found' };
    }
    
    const actions = [];
    const properties = player.properties || [];
    
    // Identify properties to mortgage
    const toMortgage = [];
    for (const prop of properties) {
      if (prop.mortgaged) continue;
      
      const rec = this.shouldMortgage(prop.id, gameState);
      if (rec.should) {
        toMortgage.push({
          propertyId: prop.id,
          priority: rec.priority,
          reason: rec.reason,
        });
      }
    }
    
    // Sort by priority
    toMortgage.sort((a, b) => b.priority - a.priority);
    
    // Add mortgage actions
    for (const item of toMortgage) {
      actions.push({
        type: 'mortgage',
        propertyId: item.propertyId,
        priority: item.priority,
        reason: item.reason,
      });
    }
    
    // Identify properties to unmortgage
    const toUnmortgage = [];
    for (const prop of properties) {
      if (!prop.mortgaged) continue;
      
      const rec = this.shouldUnmortgage(prop.id, gameState);
      if (rec.should) {
        toUnmortgage.push({
          propertyId: prop.id,
          timing: rec.timing,
          reason: rec.reason,
        });
      }
    }
    
    // Sort by timing priority
    const timingOrder = { immediate: 0, soon: 1, eventually: 2, later: 3 };
    toUnmortgage.sort((a, b) => timingOrder[a.timing] - timingOrder[b.timing]);
    
    // Add unmortgage actions
    for (const item of toUnmortgage) {
      actions.push({
        type: 'unmortgage',
        propertyId: item.propertyId,
        timing: item.timing,
        reason: item.reason,
      });
    }
    
    return {
      actions,
      toMortgage: toMortgage.length,
      toUnmortgage: toUnmortgage.length,
      summary: this._generatePlanSummary(actions, player, gameState),
    };
  }

  /**
   * Get optimal cash reserve amount
   * @param {object} gameState - Current game state
   * @returns {number} Recommended cash reserve
   */
  getOptimalCashReserve(gameState) {
    // Base reserve
    let reserve = this.minCashReserve;
    
    // Increase based on game phase (later turns = higher reserve)
    const turn = gameState.turn || 1;
    if (turn > 20) {
      reserve += 100;
    }
    if (turn > 40) {
      reserve += 150;
    }
    
    // Count players - more players = more volatility = higher reserve
    const playerCount = (gameState.players || []).length;
    if (playerCount > 2) {
      reserve += 50 * (playerCount - 2);
    }
    
    return reserve;
  }

  /**
   * Check if player needs cash for an opportunity
   * @param {object} gameState - Current game state
   * @returns {object} Opportunity assessment
   */
  needsCashForOpportunity(gameState) {
    const player = this._getPlayer(gameState.currentPlayerId, gameState);
    if (!player) {
      return { needs: false, opportunity: null, amount: 0 };
    }
    
    const cash = player.money || 0;
    
    // Check for auction opportunity
    const auctionsActive = (gameState.auctions || []).length > 0;
    if (auctionsActive && cash < this.opportunityCashThreshold) {
      return {
        needs: true,
        opportunity: 'auction',
        amount: this.opportunityCashThreshold - cash,
      };
    }
    
    // Check for property purchase opportunity
    const currentPosition = gameState.currentPosition || 0;
    const tile = gameState.tiles?.[currentPosition];
    
    if (tile && tile.type === 'property' && !tile.owner && tile.price <= cash + 200) {
      return {
        needs: true,
        opportunity: 'property_purchase',
        amount: Math.max(0, tile.price - cash + 100),
      };
    }
    
    return { needs: false, opportunity: null, amount: 0 };
  }

  /**
   * Get emergency plan for low cash situations
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Emergency action plan
   */
  getEmergencyPlan(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { actions: [], priority: 'none' };
    }
    
    const actions = [];
    const cash = player.money || 0;
    
    // Calculate how much cash is needed
    const shortfall = this.minCashReserve - cash;
    if (shortfall <= 0) {
      return { actions: [], priority: 'none' };
    }
    
    // Priority 1: Sell houses/hotels
    actions.push({
      type: 'sell_houses',
      priority: 1,
      description: 'Sell houses/hotels on properties',
    });
    
    // Priority 2: Mortgage properties (highest rent first)
    const mortgagable = [];
    for (const prop of player.properties || []) {
      if (prop.mortgaged) continue;
      
      const tile = gameState.tiles?.find(t => t.id === prop.id);
      if (tile) {
        const mortgageValue = Math.floor((tile.price || 0) * 0.5);
        mortgagable.push({
          propertyId: prop.id,
          mortgageValue,
          rent: tile.rent || 0,
          isMonopoly: this._isPartOfMonopoly(prop.id, playerId, gameState),
        });
      }
    }
    
    // Sort by rent (highest first) - we want to keep low-rent properties mortgaged
    mortgagable.sort((a, b) => b.rent - a.rent);
    
    let totalMortgageValue = 0;
    for (const prop of mortgagable) {
      if (totalMortgageValue >= shortfall) break;
      actions.push({
        type: 'mortgage',
        propertyId: prop.propertyId,
        priority: 2,
        description: `Mortgage ${prop.isMonopoly ? 'non-monopoly ' : ''}property`,
        estimatedValue: prop.mortgageValue,
      });
      totalMortgageValue += prop.mortgageValue;
    }
    
    // Determine priority level
    let priority = 'low';
    if (shortfall > cash * 0.5) {
      priority = 'critical';
    } else if (shortfall > cash * 0.25) {
      priority = 'high';
    } else if (shortfall > 0) {
      priority = 'medium';
    }
    
    return {
      actions,
      priority,
      shortfall,
      totalAvailable: totalMortgageValue,
    };
  }

  /**
   * Get foreclosure risk assessment
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Risk assessment
   */
  getForeclosureRisk(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { risk: 'unknown', turnsToForeclosure: Infinity, severity: 0 };
    }
    
    const cash = player.money || 0;
    const reserve = this.emergencyCashReserve;
    
    if (cash <= reserve) {
      return {
        risk: 'critical',
        turnsToForeclosure: 0,
        severity: 1.0,
      };
    }
    
    // Estimate outflow per turn
    const outflow = this._estimateOutflow(playerId, gameState);
    
    if (outflow <= 0) {
      return { risk: 'low', turnsToForeclosure: Infinity, severity: 0 };
    }
    
    const availableCash = cash - reserve;
    const turnsToForeclosure = Math.floor(availableCash / outflow);
    
    // Calculate severity
    let severity = 0;
    if (turnsToForeclosure <= 1) {
      severity = 1.0;
    } else if (turnsToForeclosure <= 3) {
      severity = 0.8;
    } else if (turnsToForeclosure <= 5) {
      severity = 0.5;
    } else if (turnsToForeclosure <= 10) {
      severity = 0.3;
    }
    
    // Determine risk level
    let risk = 'low';
    if (turnsToForeclosure <= 1) {
      risk = 'critical';
    } else if (turnsToForeclosure <= 3) {
      risk = 'high';
    } else if (turnsToForeclosure <= 5) {
      risk = 'medium';
    }
    
    return {
      risk,
      turnsToForeclosure,
      severity,
      estimatedOutflow: outflow,
    };
  }

  /**
   * Get turns until player is in danger
   * @private
   */
  _getTurnsToDanger(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return Infinity;
    
    const outflow = this._estimateOutflow(playerId, gameState);
    if (outflow <= 0) return Infinity;
    
    const availableCash = (player.money || 0) - this.emergencyCashReserve;
    return Math.floor(availableCash / outflow);
  }

  /**
   * Estimate outflow per turn
   * @private
   */
  _estimateOutflow(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    // Average outflow estimate
    const avgRent = 30;
    const avgTax = 50;
    const avgCard = 25;
    
    // Probability-weighted outflow
    const outflow = (avgRent * 0.15) + (avgTax * 0.1) + (avgCard * 0.08);
    
    return outflow;
  }

  /**
   * Check if property is part of a monopoly
   * @private
   */
  _isPartOfMonopoly(propertyId, playerId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return false;
    
    const colorGroup = property.colorGroup;
    if (!colorGroup) return false;
    
    const player = this._getPlayer(playerId, gameState);
    if (!player) return false;
    
    const sameColorOwned = (player.properties || []).filter(p => {
      const t = gameState.tiles?.find(t => t.id === p.id);
      return t && t.colorGroup === colorGroup;
    }).length;
    
    const tilesInGroup = (gameState.tiles || []).filter(t => 
      t.colorGroup === colorGroup && t.type === 'property'
    ).length;
    
    return sameColorOwned === tilesInGroup && tilesInGroup > 0;
  }

  /**
   * Generate summary text for a plan
   * @private
   */
  _generatePlanSummary(actions, player, gameState) {
    const mortgageCount = actions.filter(a => a.type === 'mortgage').length;
    const unmortgageCount = actions.filter(a => a.type === 'unmortgage').length;
    
    if (mortgageCount === 0 && unmortgageCount === 0) {
      return 'No mortgage actions recommended';
    }
    
    let summary = '';
    if (mortgageCount > 0) {
      summary += `Mortgage ${mortgageCount} property(s). `;
    }
    if (unmortgageCount > 0) {
      summary += `Unmortgage ${unmortgageCount} property(s).`;
    }
    
    return summary.trim();
  }

  /**
   * Get player from game state
   * @private
   */
  _getPlayer(playerId, gameState) {
    const players = gameState.players || [];
    return players.find(p => p.id === playerId) || null;
  }

  /**
   * Get property from game state
   * @private
   */
  _getProperty(propertyId, gameState) {
    const tiles = gameState.tiles || [];
    return tiles.find(t => t.id === propertyId) || null;
  }
}