/**
 * PropertyValuation - Value properties for trading and insurance
 * 
 * Provides objective and strategic valuation of properties
 * to support AI trading decisions and investment analysis.
 */

export class PropertyValuation {
  constructor(memoryLayer) {
    this.memoryLayer = memoryLayer;
    
    // Base rent multipliers by color group
    this.colorMultipliers = {
      brown: 1.0,
      lightBlue: 1.1,
      pink: 1.2,
      orange: 1.3,
      red: 1.4,
      yellow: 1.5,
      green: 1.6,
      darkBlue: 1.8,
      railroad: 1.25,
      utility: 1.15,
    };
    
    // Mortgage value is typically 50% of purchase price
    this.mortgageRate = 0.5;
    
    // House cost multipliers for ROI calculation
    this.houseCostMultiplier = 1.0;
    this.hotelCostMultiplier = 4.0;
  }

  /**
   * Get fair market value for a property
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {number} Fair market value
   */
  getFairValue(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return 0;
    
    // Base value from purchase price
    let baseValue = property.price || 0;
    
    // Add value for houses
    const houses = property.houses || 0;
    const hasHotel = property.hotel || false;
    const houseValue = houses * property.houseCost * this.houseCostMultiplier;
    const hotelValue = hasHotel ? property.houseCost * this.hotelCostMultiplier : 0;
    
    // Apply color group multiplier for strategic value
    const colorMult = this.colorMultipliers[property.colorGroup] || 1.0;
    
    // Calculate annual rent potential (based on typical game rounds)
    const annualRent = this._estimateAnnualRent(property, gameState);
    
    // Fair value = base + improvements + strategic premium
    const improvementValue = houseValue + hotelValue;
    const strategicPremium = baseValue * (colorMult - 1) * 0.3;
    
    return Math.round(baseValue + improvementValue + strategicPremium);
  }

  /**
   * Get strategic value to a specific player
   * @param {string} propertyId - Property ID
   * @param {string} playerId - Target player ID
   * @param {object} gameState - Current game state
   * @returns {object} Strategic value breakdown
   */
  getStrategicValue(propertyId, playerId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return { total: 0, breakdown: {} };
    
    const player = this._getPlayer(playerId, gameState);
    if (!player) return { total: 0, breakdown: {} };
    
    const fairValue = this.getFairValue(propertyId, gameState);
    
    // Calculate various value components
    const monopolyBonus = this._calculateMonopolyBonus(property, playerId, gameState);
    const completionBonus = this._calculateCompletionBonus(property, playerId, gameState);
    const opponentDistress = this._calculateOpponentDistress(property, playerId, gameState);
    const liquidityValue = this._calculateLiquidityValue(property, playerId, gameState);
    
    const breakdown = {
      fairValue,
      monopolyBonus,
      completionBonus,
      opponentDistress,
      liquidityValue,
    };
    
    const total = fairValue + monopolyBonus + completionBonus + opponentDistress + liquidityValue;
    
    return {
      total: Math.round(total),
      breakdown,
    };
  }

  /**
   * Get return on investment percentage
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {number} ROI as percentage
   */
  getROI(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return 0;
    
    const purchasePrice = property.price || 0;
    if (purchasePrice === 0) return 0;
    
    // Calculate annual rent
    const annualRent = this._estimateAnnualRent(property, gameState);
    
    // ROI = (annual rent / purchase price) * 100
    const roi = (annualRent / purchasePrice) * 100;
    
    return Math.round(roi * 100) / 100;
  }

  /**
   * Get payback period in years
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {number} Years to recoup investment
   */
  getPaybackPeriod(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return Infinity;
    
    const purchasePrice = property.price || 0;
    if (purchasePrice === 0) return Infinity;
    
    // Calculate annual rent
    const annualRent = this._estimateAnnualRent(property, gameState);
    
    if (annualRent === 0) return Infinity;
    
    // Payback period = purchase price / annual rent
    const payback = purchasePrice / annualRent;
    
    return Math.round(payback * 100) / 100;
  }

  /**
   * Estimate annual rent for a property
   * @private
   */
  _estimateAnnualRent(property, gameState) {
    // Base rent from property
    let baseRent = property.rent || 0;
    
    // Houses multiplier
    const houses = property.houses || 0;
    const hasHotel = property.hotel || false;
    
    if (hasHotel) {
      baseRent = property.hotelRent || baseRent * 5;
    } else if (houses > 0) {
      const houseRentKey = `rentWith${houses}House`;
      baseRent = property[houseRentKey] || baseRent * (1 + houses * 0.5);
    }
    
    // Estimate visits per year (roughly 20 turns with 4 players)
    const estimatedVisitsPerYear = 40;
    
    // Probability of landing based on game state
    const visitProbability = this._estimateVisitProbability(property, gameState);
    
    // Expected annual rent
    const expectedRent = baseRent * estimatedVisitsPerYear * visitProbability;
    
    return expectedRent;
  }

  /**
   * Estimate probability of landing on a property
   * @private
   */
  _estimateVisitProbability(property, gameState) {
    // Simplified estimation based on property position
    const tiles = gameState.tiles || [];
    const propertyIndex = tiles.findIndex(t => t.id === property.id);
    
    if (propertyIndex === -1) return 0.1;
    
    // Middle tiles are visited more frequently
    const middleIndex = tiles.length / 2;
    const distanceFromMiddle = Math.abs(propertyIndex - middleIndex);
    const normalizedDistance = distanceFromMiddle / middleIndex;
    
    // Base probability around 5-15%
    const probability = 0.10 - (normalizedDistance * 0.05);
    
    return Math.max(0.05, Math.min(0.15, probability));
  }

  /**
   * Calculate monopoly bonus value
   * @private
   */
  _calculateMonopolyBonus(property, playerId, gameState) {
    const colorGroup = property.colorGroup;
    if (!colorGroup) return 0;
    
    // Count properties of same color owned by player
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    const playerProperties = player.properties || [];
    const sameColorProperties = playerProperties.filter(p => p.colorGroup === colorGroup);
    
    // If player owns all properties in color group, add monopoly bonus
    const tilesInGroup = (gameState.tiles || []).filter(t => t.colorGroup === colorGroup && t.type === 'property');
    
    if (tilesInGroup.length > 0 && sameColorProperties.length === tilesInGroup.length) {
      // Monopoly bonus is 50% of base value
      return (property.price || 0) * 0.5;
    }
    
    return 0;
  }

  /**
   * Calculate set completion bonus
   * @private
   */
  _calculateCompletionBonus(property, playerId, gameState) {
    const colorGroup = property.colorGroup;
    if (!colorGroup) return 0;
    
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    const playerProperties = player.properties || [];
    const tilesInGroup = (gameState.tiles || []).filter(t => t.colorGroup === colorGroup && t.type === 'property');
    
    if (tilesInGroup.length === 0) return 0;
    
    const ownedInGroup = tilesInGroup.filter(t => 
      playerProperties.some(p => p.id === t.id)
    ).length;
    
    const totalInGroup = tilesInGroup.length;
    const remaining = totalInGroup - ownedInGroup;
    
    // Value increases as player gets closer to completing set
    if (remaining === 1) {
      // Critical completion - last property needed
      return property.price * 0.4;
    } else if (remaining === 2) {
      return property.price * 0.2;
    }
    
    return 0;
  }

  /**
   * Calculate opponent distress premium
   * @private
   */
  _calculateOpponentDistress(property, playerId, gameState) {
    const opponents = this._getOpponents(playerId, gameState);
    let distressPremium = 0;
    
    for (const opponent of opponents) {
      // Low money opponents are more likely to sell
      if (opponent.money < 200) {
        distressPremium += property.price * 0.1;
      }
      // Opponents with mortgaged properties in same color group
      const mortgagedInGroup = (opponent.properties || [])
        .filter(p => p.colorGroup === property.colorGroup && p.mortgaged);
      
      if (mortgagedInGroup.length > 0) {
        distressPremium += property.price * 0.05;
      }
    }
    
    return Math.min(distressPremium, property.price * 0.3);
  }

  /**
   * Calculate liquidity value
   * @private
   */
  _calculateLiquidityValue(property, playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    // High-money players value liquidity less
    if (player.money > 1000) {
      return property.price * 0.05;
    }
    
    // Low-money players value cash more
    if (player.money < 300) {
      return property.price * 0.15;
    }
    
    return property.price * 0.1;
  }

  /**
   * Get property from game state
   * @private
   */
  _getProperty(propertyId, gameState) {
    const tiles = gameState.tiles || [];
    return tiles.find(t => t.id === propertyId) || null;
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
   * Get opponents of a player
   * @private
   */
  _getOpponents(playerId, gameState) {
    const players = gameState.players || [];
    return players.filter(p => p.id !== playerId);
  }
}