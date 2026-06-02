/**
 * InvestmentScreener - Screen Properties for Investment
 * 
 * Applies filtering criteria to identify properties that meet
 * investment thresholds based on ROI, risk, and location factors.
 */

import { PropertyValuation } from '../property/propertyValuation.js';

export class InvestmentScreener {
  constructor() {
    this.valuation = new PropertyValuation();
    
    // Default screening thresholds
    this.defaultThresholds = {
      minROI: 5,           // Minimum 5% ROI
      maxRisk: 'medium',   // Maximum risk level
      minStrategicValue: 50, // Minimum strategic value
    };
    
    // Color group risk factors
    this.colorRiskFactors = {
      brown: { risk: 'low', liquidity: 'high', volatility: 'low' },
      lightBlue: { risk: 'low', liquidity: 'high', volatility: 'low' },
      pink: { risk: 'medium', liquidity: 'medium', volatility: 'medium' },
      orange: { risk: 'medium', liquidity: 'high', volatility: 'medium' },
      red: { risk: 'medium', liquidity: 'high', volatility: 'medium' },
      yellow: { risk: 'medium', liquidity: 'medium', volatility: 'medium' },
      green: { risk: 'medium', liquidity: 'medium', volatility: 'high' },
      darkBlue: { risk: 'high', liquidity: 'low', volatility: 'high' },
      railroad: { risk: 'low', liquidity: 'high', volatility: 'low' },
      utility: { risk: 'medium', liquidity: 'medium', volatility: 'medium' },
    };
    
    // Location factors for landing probability
    this.locationBonus = {
      // Tile positions that are commonly landed on
      1: 1.0,   // Start
      3: 1.1,   // Early game
      6: 1.2,   // Just after chance
      8: 1.1,   // Orange area
      9: 1.2,   // Orange
      11: 1.1,  // Pink area
      12: 1.3,  // Railroad
      13: 1.1,  // Jail visit
      14: 1.0,  // Pink
      15: 1.2,  // Railroad
      16: 1.1,  // Red area
      18: 1.2,  // Orange/Red
      19: 1.1,  // Red
      21: 1.2,  // Yellow area
      23: 1.1,  // Yellow
      24: 1.3,  // Railroad
      26: 1.1,  // Green area
      27: 1.2,  // Chance near go
      28: 1.0,  // Green
      31: 1.0,  // Dark blue area
      32: 1.1,  // Chance
      34: 1.3,  // Railroad
      37: 1.1,  // Dark blue
    };
  }

  /**
   * Check if property passes minimum criteria
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {boolean} True if property passes all minimum criteria
   */
  passesMinimumCriteria(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return false;
    
    // Check if property is available
    if (!this._isAvailable(propertyId, gameState)) return false;
    
    // Check ROI threshold
    const roi = this.valuation.getROI(propertyId, gameState);
    if (roi < this.defaultThresholds.minROI) return false;
    
    // Check risk level
    const risk = this._assessRisk(propertyId, gameState);
    if (this._riskToNumeric(risk) > this._riskToNumeric(this.defaultThresholds.maxRisk)) {
      return false;
    }
    
    // Check strategic value
    const playerId = this._getCurrentPlayer(gameState)?.id;
    if (playerId) {
      const strategicValue = this.valuation.getStrategicValue(propertyId, playerId, gameState);
      if (strategicValue.total < this.defaultThresholds.minStrategicValue) return false;
    }
    
    return true;
  }

  /**
   * Score property for investment (0-100)
   * @param {string} propertyId - Property ID
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {number} Investment score 0-100
   */
  scoreProperty(propertyId, playerId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return 0;
    
    // Base score starts at 50
    let score = 50;
    
    // ROI component (0-25)
    const roi = this.valuation.getROI(propertyId, gameState);
    score += Math.min(25, roi * 2);
    
    // Strategic value component (0-25)
    const strategicValue = this.valuation.getStrategicValue(propertyId, playerId, gameState);
    score += Math.min(25, strategicValue.total / 10);
    
    // Risk penalty (-15 to 0)
    const risk = this._assessRisk(propertyId, gameState);
    if (risk === 'high') score -= 15;
    else if (risk === 'medium') score -= 5;
    
    // Liquidity bonus (0-10)
    const liquidity = this._getLiquidity(property.colorGroup);
    if (liquidity === 'high') score += 10;
    else if (liquidity === 'medium') score += 5;
    
    // Location bonus (0-10)
    const locationBonus = this._getLocationBonus(propertyId, gameState);
    score += locationBonus;
    
    // Strategic bonuses
    if (strategicValue.breakdown.monopolyBonus > 0) score += 10;
    if (strategicValue.breakdown.completionBonus > 0) score += 8;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Filter properties by minimum ROI
   * @param {number} minROI - Minimum ROI percentage
   * @param {object} gameState - Current game state
   * @returns {Array} Properties meeting ROI threshold
   */
  filterByROI(minROI, gameState) {
    const availableProperties = this._getAvailableProperties(gameState);
    
    return availableProperties
      .filter(property => {
        const roi = this.valuation.getROI(property.id, gameState);
        return roi >= minROI;
      })
      .map(property => ({
        propertyId: property.id,
        propertyName: property.name,
        price: property.price,
        roi: this.valuation.getROI(property.id, gameState),
      }))
      .sort((a, b) => b.roi - a.roi);
  }

  /**
   * Filter properties by maximum risk
   * @param {string} maxRisk - Maximum risk level ('low', 'medium', 'high')
   * @param {object} gameState - Current game state
   * @returns {Array} Properties within risk threshold
   */
  filterByRisk(maxRisk, gameState) {
    const availableProperties = this._getAvailableProperties(gameState);
    const maxRiskNumeric = this._riskToNumeric(maxRisk);
    
    return availableProperties
      .filter(property => {
        const risk = this._assessRisk(property.id, gameState);
        return this._riskToNumeric(risk) <= maxRiskNumeric;
      })
      .map(property => ({
        propertyId: property.id,
        propertyName: property.name,
        price: property.price,
        risk: this._assessRisk(property.id, gameState),
      }))
      .sort((a, b) => this._riskToNumeric(a.risk) - this._riskToNumeric(b.risk));
  }

  /**
   * Filter properties by location preference
   * @param {object} gameState - Current game state
   * @returns {Array} Properties sorted by location quality
   */
  filterByLocation(gameState) {
    const availableProperties = this._getAvailableProperties(gameState);
    
    return availableProperties
      .map(property => {
        const locationScore = this._calculateLocationScore(property.id, gameState);
        return {
          propertyId: property.id,
          propertyName: property.name,
          colorGroup: property.colorGroup,
          price: property.price,
          locationScore,
        };
      })
      .sort((a, b) => b.locationScore - a.locationScore);
  }

  /**
   * Assess risk level for a property
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {string} Risk level ('low', 'medium', 'high')
   */
  _assessRisk(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return 'unknown';
    
    // Get base risk from color group
    const colorRisk = this.colorRiskFactors[property.colorGroup] || { risk: 'medium' };
    
    // ROI-based risk adjustment
    const roi = this.valuation.getROI(propertyId, gameState);
    if (roi < 3) return 'high';
    if (roi < 5) {
      return colorRisk.risk === 'low' ? 'medium' : 'high';
    }
    
    return colorRisk.risk;
  }

  /**
   * Get liquidity rating for color group
   * @param {string} colorGroup - Color group name
   * @returns {string} Liquidity level
   */
  _getLiquidity(colorGroup) {
    const factors = this.colorRiskFactors[colorGroup];
    return factors?.liquidity || 'medium';
  }

  /**
   * Get location bonus for a property
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {number} Location bonus (0-10)
   */
  _getLocationBonus(propertyId, gameState) {
    const tiles = gameState.tiles || [];
    const index = tiles.findIndex(t => t.id === propertyId);
    
    if (index === -1) return 0;
    
    // Find adjacent tiles with chance/community
    const adjacentChance = this._hasAdjacentChance(index, tiles);
    
    let bonus = this.locationBonus[index + 1] || 1.0;
    
    // Bonus for being near chance/community
    if (adjacentChance) bonus += 0.1;
    
    // Convert to 0-10 scale
    return Math.round((bonus - 0.9) * 50);
  }

  /**
   * Calculate location score for a property
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {number} Location score
   */
  _calculateLocationScore(propertyId, gameState) {
    const tiles = gameState.tiles || [];
    const index = tiles.findIndex(t => t.id === propertyId);
    
    if (index === -1) return 0;
    
    // Base score from position
    const baseScore = this.locationBonus[index + 1] || 1.0;
    
    // Factor in adjacent tiles
    const neighbors = this._getNeighborIndices(index, tiles.length);
    const neighborBonus = neighbors.reduce((sum, ni) => {
      const neighbor = tiles[ni];
      if (neighbor?.type === 'chance' || neighbor?.type === 'community') {
        return sum + 0.2;
      }
      return sum;
    }, 0);
    
    // Convert to 0-100 scale
    return Math.round((baseScore + neighborBonus) * 50);
  }

  /**
   * Check if property has adjacent chance/community
   * @private
   */
  _hasAdjacentChance(index, tiles) {
    const neighbors = this._getNeighborIndices(index, tiles.length);
    return neighbors.some(ni => {
      const tile = tiles[ni];
      return tile?.type === 'chance' || tile?.type === 'community';
    });
  }

  /**
   * Get adjacent tile indices
   * @private
   */
  _getNeighborIndices(index, totalTiles) {
    const prev = index === 0 ? totalTiles - 1 : index - 1;
    const next = index === totalTiles - 1 ? 0 : index + 1;
    return [prev, next];
  }

  /**
   * Convert risk level to numeric for comparison
   * @private
   */
  _riskToNumeric(risk) {
    switch (risk) {
      case 'low': return 0;
      case 'medium': return 1;
      case 'high': return 2;
      default: return 3;
    }
  }

  /**
   * Check if property is available (not owned)
   * @private
   */
  _isAvailable(propertyId, gameState) {
    for (const player of (gameState.players || [])) {
      if ((player.properties || []).some(p => p.id === propertyId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get property by ID
   * @private
   */
  _getProperty(propertyId, gameState) {
    const tiles = gameState.tiles || [];
    return tiles.find(t => t.id === propertyId) || null;
  }

  /**
   * Get current player from game state
   * @private
   */
  _getCurrentPlayer(gameState) {
    if (gameState.currentPlayer) return gameState.currentPlayer;
    const players = gameState.players || [];
    return players.find(p => p.isCurrent) || players[0] || null;
  }

  /**
   * Get available (unowned) properties
   * @private
   */
  _getAvailableProperties(gameState) {
    const tiles = gameState.tiles || [];
    const ownedPropertyIds = new Set();
    
    for (const player of (gameState.players || [])) {
      for (const prop of (player.properties || [])) {
        ownedPropertyIds.add(prop.id);
      }
    }
    
    return tiles.filter(t => 
      t.type === 'property' && !ownedPropertyIds.has(t.id)
    );
  }
}