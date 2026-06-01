/**
 * PropertyManagerAI - AI for managing owned properties optimally
 * 
 * Handles building decisions, selling decisions, mortgage decisions,
 * and portfolio management for AI players.
 */

export class PropertyManagerAI {
  /**
   * @param {object} memoryLayer - AI memory layer
   * @param {object} opponentModel - Opponent model for prediction
   */
  constructor(memoryLayer, opponentModel) {
    this.memoryLayer = memoryLayer;
    this.opponentModel = opponentModel;
    
    // Building priorities by color group
    this.colorBuildingPriority = {
      darkBlue: 1,    // Highest value
      green: 2,
      yellow: 3,
      red: 4,
      orange: 5,
      pink: 6,
      lightBlue: 7,
      brown: 8,       // Lowest priority
      railroad: 9,
      utility: 10,
    };
    
    // Minimum sell prices as percentage of fair value
    this.minSellPriceRate = 0.8;
    this.goodSellPriceRate = 1.0;
    
    // Mortgage thresholds
    this.mortgageThresholdLow = 300;   // Mortgage if money below this
    this.mortgageThresholdHigh = 500;  // Unmortgage if money above this
  }

  /**
   * Decide whether to build a house on property
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} Decision {shouldBuild, reason}
   */
  shouldBuildHouse(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return { shouldBuild: false, reason: 'Property not found' };
    
    const player = this._getOwner(propertyId, gameState);
    if (!player) return { shouldBuild: false, reason: 'Not owned' };
    
    // Check if already max houses
    if ((property.houses || 0) >= 4) {
      return { shouldBuild: false, reason: 'Max houses reached' };
    }
    
    // Check money
    const houseCost = property.houseCost || 50;
    if (player.money < houseCost + this._getMoneyBuffer()) {
      return { shouldBuild: false, reason: 'Insufficient funds', cost: houseCost };
    }
    
    // Check if monopoly or near-monopoly
    const monopolyStatus = this._getMonopolyStatus(property, player, gameState);
    if (!monopolyStatus.isMonopoly && !monopolyStatus.nearMonopoly) {
      return { shouldBuild: false, reason: 'Not a monopoly or near-monopoly' };
    }
    
    // Check ROI
    const roi = this._calculateHouseROI(property, gameState);
    if (roi < 0.15) {
      return { shouldBuild: false, reason: 'ROI below threshold', roi };
    }
    
    // Calculate potential gain
    const rentIncrease = this._calculateRentIncrease(property, gameState);
    const turnProfit = rentIncrease * 0.1; // Approximate turns per rent collection
    
    return {
      shouldBuild: true,
      reason: turnProfit > houseCost * 0.1 ? 'Profitable investment' : 'Strategic build',
      cost: houseCost,
      roi,
      monopolyStatus,
    };
  }

  /**
   * Decide whether to build/upgrade to hotel
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} Decision {shouldBuild, reason}
   */
  shouldBuildHotel(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return { shouldBuild: false, reason: 'Property not found' };
    
    const player = this._getOwner(propertyId, gameState);
    if (!player) return { shouldBuild: false, reason: 'Not owned' };
    
    // Check if already has hotel
    if (property.hotel) {
      return { shouldBuild: false, reason: 'Already has hotel' };
    }
    
    // Need 4 houses to upgrade to hotel
    if ((property.houses || 0) < 4) {
      return { shouldBuild: false, reason: 'Need 4 houses first', houses: property.houses };
    }
    
    // Check money
    const hotelCost = property.houseCost ? property.houseCost * 4 : 200;
    if (player.money < hotelCost + this._getMoneyBuffer()) {
      return { shouldBuild: false, reason: 'Insufficient funds', cost: hotelCost };
    }
    
    // Check if monopoly
    const monopolyStatus = this._getMonopolyStatus(property, player, gameState);
    if (!monopolyStatus.isMonopoly) {
      return { shouldBuild: false, reason: 'Not a monopoly' };
    }
    
    // Check ROI
    const roi = this._calculateHotelROI(property, gameState);
    if (roi < 0.20) {
      return { shouldBuild: false, reason: 'ROI below threshold', roi };
    }
    
    return {
      shouldBuild: true,
      reason: 'Hotel upgrade profitable',
      cost: hotelCost,
      roi,
      monopolyStatus,
    };
  }

  /**
   * Get optimal building order for player
   * @param {object} gameState - Current game state
   * @returns {Array} Priority-ordered properties for building
   */
  getOptimalBuildOrder(gameState) {
    const playerId = this._getCurrentPlayerId(gameState);
    if (!playerId) return [];
    
    const player = this._getPlayer(playerId, gameState);
    if (!player) return [];
    
    const properties = player.properties || [];
    
    // Score each property for building priority
    const scored = properties.map(prop => {
      const property = this._getProperty(prop.id, gameState);
      if (!property) return null;
      
      const monopolyStatus = this._getMonopolyStatus(property, player, gameState);
      const colorPriority = this.colorBuildingPriority[property.colorGroup] || 10;
      const houses = property.houses || 0;
      const hotel = property.hotel || false;
      
      let score = 0;
      
      // Monopoly bonus
      if (monopolyStatus.isMonopoly) score += 100;
      else if (monopolyStatus.nearMonopoly) score += 50;
      
      // Color priority (lower is better)
      score += (11 - colorPriority) * 5;
      
      // Houses already built (closer to hotel the better)
      if (!hotel) score += houses * 10;
      
      // ROI potential (simplified)
      if (!hotel && houses < 4) score += 20;
      
      return {
        propertyId: prop.id,
        score,
        houses,
        hotel,
        isMonopoly: monopolyStatus.isMonopoly,
        colorPriority,
      };
    }).filter(Boolean);
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    return scored;
  }

  /**
   * Evaluate sell decision
   * @param {string} propertyId - Property ID
   * @param {number} offer - Offer amount
   * @param {object} gameState - Current game state
   * @returns {object} Decision {shouldSell, reason, fairPrice}
   */
  shouldSellProperty(propertyId, offer, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return { shouldSell: false, reason: 'Property not found' };
    
    const player = this._getOwner(propertyId, gameState);
    if (!player) return { shouldSell: false, reason: 'Not owned' };
    
    const minPrice = this.getMinimumSellPrice(propertyId, gameState);
    const fairValue = this._getFairValue(propertyId, gameState);
    
    // Always accept if offer is good
    if (offer >= fairValue * this.goodSellPriceRate) {
      return { shouldSell: true, reason: 'Good price', profit: offer - property.price };
    }
    
    // Consider selling if offer is acceptable
    if (offer >= minPrice) {
      // Check opponent model for negotiation leverage
      const opponentId = this._getOfferMakerId(gameState);
      if (opponentId && this.opponentModel) {
        const prediction = this.opponentModel.predictTradeResponse({ receivedValue: offer, givenValue: fairValue });
        if (prediction.willAccept && prediction.confidence > 0.6) {
          return { shouldSell: true, reason: 'Acceptable price', profit: offer - property.price };
        }
      }
      
      // Check if we need money desperately
      if (player.money < this.mortgageThresholdLow) {
        return { shouldSell: true, reason: 'Need cash', profit: offer - property.price };
      }
      
      // Check if opponent completing monopoly hurts us
      const opponent = this._getPlayer(opponentId, gameState);
      if (opponent) {
        const monopolyStatus = this._getMonopolyStatus(property, player, gameState);
        const opponentMonopoly = this._wouldCompleteMonopoly(property, opponent, gameState);
        
        if (monopolyStatus.isMonopoly && opponentMonopoly) {
          return { shouldSell: false, reason: 'Do not help opponent complete monopoly' };
        }
      }
    }
    
    return { shouldSell: false, reason: 'Price too low', minPrice, fairValue };
  }

  /**
   * Get minimum acceptable sell price
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {number} Minimum price
   */
  getMinimumSellPrice(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return 0;
    
    const player = this._getOwner(propertyId, gameState);
    if (!player) return 0;
    
    // Base minimum: recover investment
    let minPrice = property.price || 0;
    
    // Add house/hotel investments
    const houses = property.houses || 0;
    const hotel = property.hotel || false;
    const houseCost = property.houseCost || 50;
    
    minPrice += houses * houseCost;
    if (hotel) minPrice += houseCost * 4;
    
    // Apply minimum sell rate
    minPrice *= this.minSellPriceRate;
    
    // Adjust for monopoly value if applicable
    const monopolyStatus = this._getMonopolyStatus(property, player, gameState);
    if (monopolyStatus.isMonopoly) {
      // Monopoly properties are worth more
      minPrice *= 1.2;
    }
    
    return Math.round(minPrice);
  }

  /**
   * Decide whether to mortgage a property
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} Decision {shouldMortgage, reason}
   */
  shouldMortgage(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return { shouldMortgage: false, reason: 'Property not found' };
    
    const player = this._getOwner(propertyId, gameState);
    if (!player) return { shouldMortgage: false, reason: 'Not owned' };
    
    // Check if already mortgaged
    if (property.mortgaged) {
      return { shouldMortgage: false, reason: 'Already mortgaged' };
    }
    
    // Check if it's a monopoly property with buildings
    const monopolyStatus = this._getMonopolyStatus(property, player, gameState);
    if (monopolyStatus.isMonopoly && (property.houses > 0 || property.hotel)) {
      return { shouldMortgage: false, reason: 'Do not mortgage monopoly with improvements' };
    }
    
    // Check money situation
    if (player.money < this.mortgageThresholdLow) {
      // Calculate potential raise
      const mortgageValue = (property.price || 0) * 0.5;
      
      return {
        shouldMortgage: true,
        reason: 'Need cash for game survival',
        raiseAmount: mortgageValue,
      };
    }
    
    return { shouldMortgage: false, reason: 'Money situation adequate' };
  }

  /**
   * Decide whether to unmortgage a property
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} Decision {shouldUnmortgage, reason}
   */
  shouldUnmortgage(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return { shouldUnmortgage: false, reason: 'Property not found' };
    
    const player = this._getOwner(propertyId, gameState);
    if (!player) return { shouldUnmortgage: false, reason: 'Not owned' };
    
    // Can only unmortgage if currently mortgaged
    if (!property.mortgaged) {
      return { shouldUnmortgage: false, reason: 'Not mortgaged' };
    }
    
    // Check money
    const unmortgageCost = this._getUnmortgageCost(property);
    if (player.money < unmortgageCost + this._getMoneyBuffer()) {
      return { shouldUnmortgage: false, reason: 'Insufficient funds', cost: unmortgageCost };
    }
    
    // Check if we have plenty of money
    if (player.money > this.mortgageThresholdHigh * 2) {
      return {
        shouldUnmortgage: true,
        reason: 'Good time to unmortgage',
        cost: unmortgageCost,
      };
    }
    
    // Priority: unmortgage monopolies first
    const monopolyStatus = this._getMonopolyStatus(property, player, gameState);
    if (monopolyStatus.isMonopoly) {
      return {
        shouldUnmortgage: true,
        reason: 'Priority unmortgage of monopoly',
        cost: unmortgageCost,
      };
    }
    
    return { shouldUnmortgage: false, reason: 'Wait for better时机', cost: unmortgageCost };
  }

  /**
   * Get full portfolio analysis for player
   * @param {string} playerId - Player ID
   * @returns {object} Portfolio analysis
   */
  getPropertyPortfolio(playerId) {
    // This would typically use memoryLayer to get player's property history
    return {
      totalProperties: 0,
      monopolies: [],
      nearMonopolies: [],
      mortgagedProperties: [],
      improvedProperties: [],
      totalInvested: 0,
      totalValue: 0,
      estimatedAnnualIncome: 0,
    };
  }

  /**
   * Get which monopolies to complete first
   * @param {string} playerId - Player ID
   * @returns {Array} Priority-ordered monopolies to complete
   */
  getMonopolyPriorities(playerId) {
    // This would use memoryLayer and opponentModel to determine priorities
    return [];
  }

  // ============ Private Helper Methods ============

  /**
   * Get monopoly status for property
   * @private
   */
  _getMonopolyStatus(property, player, gameState) {
    const colorGroup = property.colorGroup;
    if (!colorGroup) return { isMonopoly: false, nearMonopoly: false };
    
    const tilesInGroup = (gameState.tiles || [])
      .filter(t => t.colorGroup === colorGroup && t.type === 'property');
    
    const ownedInGroup = tilesInGroup.filter(t =>
      player.properties.some(p => p.id === t.id)
    ).length;
    
    return {
      isMonopoly: ownedInGroup === tilesInGroup.length,
      nearMonopoly: ownedInGroup === tilesInGroup.length - 1,
      owned: ownedInGroup,
      total: tilesInGroup.length,
    };
  }

  /**
   * Calculate house building ROI
   * @private
   */
  _calculateHouseROI(property, gameState) {
    const houseCost = property.houseCost || 50;
    const currentHouses = property.houses || 0;
    const baseRent = property.rent || 0;
    
    const nextRentKey = `rentWith${currentHouses + 1}House`;
    const nextRent = property[nextRentKey] || baseRent * (1 + (currentHouses + 1) * 0.5);
    const currentRent = currentHouses > 0
      ? (property[`rentWith${currentHouses}House`] || baseRent * (1 + currentHouses * 0.5))
      : baseRent;
    
    const rentIncrease = nextRent - currentRent;
    const visitsPerYear = 40;
    const visitProb = 0.1;
    
    const annualIncrease = rentIncrease * visitsPerYear * visitProb;
    return annualIncrease / houseCost;
  }

  /**
   * Calculate hotel upgrade ROI
   * @private
   */
  _calculateHotelROI(property, gameState) {
    const hotelCost = property.houseCost ? property.houseCost * 4 : 200;
    const baseRent = property.rent || 0;
    const hotelRent = property.hotelRent || baseRent * 5;
    const rentWith4Houses = property.rentWith4House || baseRent * 3.5;
    
    const rentIncrease = hotelRent - rentWith4Houses;
    const visitsPerYear = 40;
    const visitProb = 0.1;
    
    const annualIncrease = rentIncrease * visitsPerYear * visitProb;
    return annualIncrease / hotelCost;
  }

  /**
   * Calculate rent increase from house
   * @private
   */
  _calculateRentIncrease(property, gameState) {
    const currentHouses = property.houses || 0;
    const baseRent = property.rent || 0;
    
    const nextRentKey = `rentWith${currentHouses + 1}House`;
    const nextRent = property[nextRentKey] || baseRent * (1 + (currentHouses + 1) * 0.5);
    const currentRent = currentHouses > 0
      ? (property[`rentWith${currentHouses}House`] || baseRent * (1 + currentHouses * 0.5))
      : baseRent;
    
    return nextRent - currentRent;
  }

  /**
   * Get fair value for property
   * @private
   */
  _getFairValue(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return 0;
    
    let value = property.price || 0;
    value += (property.houses || 0) * (property.houseCost || 50);
    if (property.hotel) value += (property.houseCost || 50) * 4;
    
    return value;
  }

  /**
   * Check if selling would complete opponent's monopoly
   * @private
   */
  _wouldCompleteMonopoly(property, opponent, gameState) {
    const colorGroup = property.colorGroup;
    if (!colorGroup) return false;
    
    const tilesInGroup = (gameState.tiles || [])
      .filter(t => t.colorGroup === colorGroup && t.type === 'property');
    
    const ownedByOpponent = tilesInGroup.filter(t =>
      opponent.properties.some(p => p.id === t.id)
    ).length;
    
    return ownedByOpponent === tilesInGroup.length - 1;
  }

  /**
   * Get unmortgage cost
   * @private
   */
  _getUnmortgageCost(property) {
    const mortgageValue = (property.price || 0) * 0.5;
    // Unmortgage cost is mortgage value plus 10% interest
    return Math.round(mortgageValue * 1.1);
  }

  /**
   * Get minimum money buffer
   * @private
   */
  _getMoneyBuffer() {
    return 200;
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
   * Get owner of property
   * @private
   */
  _getOwner(propertyId, gameState) {
    const players = gameState.players || [];
    for (const player of players) {
      if ((player.properties || []).some(p => p.id === propertyId)) {
        return player;
      }
    }
    return null;
  }

  /**
   * Get player by ID
   * @private
   */
  _getPlayer(playerId, gameState) {
    return (gameState.players || []).find(p => p.id === playerId) || null;
  }

  /**
   * Get current player ID from game state
   * @private
   */
  _getCurrentPlayerId(gameState) {
    return gameState.currentPlayerId || (gameState.players?.[0]?.id);
  }

  /**
   * Get offer maker ID (placeholder)
   * @private
   */
  _getOfferMakerId(gameState) {
    return gameState.offerMakerId || null;
  }
}