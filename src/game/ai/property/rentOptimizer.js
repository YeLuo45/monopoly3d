/**
 * RentOptimizer - Optimize rent collection and property upgrades
 * 
 * Provides analysis for when to build houses/hotels and how
 * to maximize rent income from owned properties.
 */

export class RentOptimizer {
  constructor() {
    // Building cost thresholds (multiplier on property price)
    this.buildingCostRate = 0.5;
    
    // House count thresholds by property type
    this.maxHouses = 4;
    this.hotelThreshold = 4;
    
    // Break-even multipliers
    this.minHouseROI = 0.15;  // 15% minimum ROI to build a house
    this.minHotelROI = 0.20; // 20% minimum ROI to upgrade to hotel
    
    // Safe money buffer (keep this much cash after building)
    this.minMoneyBuffer = 200;
  }

  /**
   * Calculate optimal rent for a property
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} Rent analysis
   */
  calculateOptimalRent(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return { baseRent: 0, optimalRent: 0, houses: 0 };
    
    const player = this._getOwner(propertyId, gameState);
    if (!player) return { baseRent: 0, optimalRent: 0, houses: 0 };
    
    const houses = property.houses || 0;
    const hasHotel = property.hotel || false;
    
    // Get base rent
    let baseRent = property.rent || 0;
    if (hasHotel) {
      baseRent = property.hotelRent || baseRent * 5;
    } else if (houses > 0) {
      const houseRentKey = `rentWith${houses}House`;
      baseRent = property[houseRentKey] || baseRent * (1 + houses * 0.5);
    }
    
    // Calculate visit probability
    const visitProb = this._getVisitProbability(property, gameState);
    
    // Player balance factor (desperate players charge more)
    const balanceFactor = this._getBalanceFactor(player);
    
    // Opponent factor (if opponents are rich, they pay more)
    const opponentFactor = this._getOpponentFactor(propertyId, gameState);
    
    // Optimal rent with factors applied
    const optimalRent = Math.round(baseRent * (1 + balanceFactor) * (1 + opponentFactor));
    
    return {
      baseRent,
      optimalRent,
      houses,
      hasHotel,
      visitProbability: visitProb,
    };
  }

  /**
   * Get house building threshold
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} Threshold analysis
   */
  getHouseThreshold(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return { shouldBuild: false, reason: 'Property not found' };
    
    const player = this._getOwner(propertyId, gameState);
    if (!player) return { shouldBuild: false, reason: 'Not owned' };
    
    const currentHouses = property.houses || 0;
    if (currentHouses >= this.maxHouses) {
      return { shouldBuild: false, reason: 'Max houses reached' };
    }
    
    // Check if player can afford it
    const houseCost = property.houseCost || 50;
    const availableMoney = player.money - this.minMoneyBuffer;
    
    if (availableMoney < houseCost) {
      return { shouldBuild: false, reason: 'Insufficient funds', cost: houseCost };
    }
    
    // Calculate expected ROI
    const annualRentIncrease = this._estimateRentIncrease(property, currentHouses, gameState);
    const roi = annualRentIncrease / houseCost;
    
    if (roi < this.minHouseROI) {
      return { shouldBuild: false, reason: 'ROI too low', roi, threshold: this.minHouseROI };
    }
    
    // Check if this completes a monopoly
    const monopolyBonus = this._checkMonopolyCompletion(property, player, gameState);
    
    return {
      shouldBuild: true,
      reason: 'Good investment',
      cost: houseCost,
      roi,
      monopolyBonus,
    };
  }

  /**
   * Get hotel upgrade threshold
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} Threshold analysis
   */
  getHotelThreshold(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return { shouldBuild: false, reason: 'Property not found' };
    
    const player = this._getOwner(propertyId, gameState);
    if (!player) return { shouldBuild: false, reason: 'Not owned' };
    
    const currentHouses = property.houses || 0;
    const hasHotel = property.hotel || false;
    
    if (hasHotel) {
      return { shouldBuild: false, reason: 'Already has hotel' };
    }
    
    if (currentHouses < this.hotelThreshold) {
      return { shouldBuild: false, reason: `Need ${this.hotelThreshold} houses first`, houses: currentHouses };
    }
    
    // Hotel upgrade cost
    const hotelCost = property.houseCost ? property.houseCost * 4 : 200;
    const availableMoney = player.money - this.minMoneyBuffer;
    
    if (availableMoney < hotelCost) {
      return { shouldBuild: false, reason: 'Insufficient funds', cost: hotelCost };
    }
    
    // Calculate ROI for hotel
    const annualRentIncrease = this._estimateHotelRentIncrease(property, gameState);
    const roi = annualRentIncrease / hotelCost;
    
    if (roi < this.minHotelROI) {
      return { shouldBuild: false, reason: 'ROI too low', roi, threshold: this.minHotelROI };
    }
    
    return {
      shouldBuild: true,
      reason: 'Hotel upgrade profitable',
      cost: hotelCost,
      roi,
    };
  }

  /**
   * Analyze rent enhancement ROI
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} ROI analysis
   */
  analyzeRentEnhancement(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return null;
    
    const player = this._getOwner(propertyId, gameState);
    if (!player) return null;
    
    const currentHouses = property.houses || 0;
    const hasHotel = property.hotel || false;
    
    // Calculate current annual rent
    const currentRent = this._calculateCurrentAnnualRent(property, gameState);
    
    // Calculate potential rent with improvements
    const potentialRentWithHouse = currentHouses < this.maxHouses 
      ? this._estimateRentIncrease(property, currentHouses + 1, gameState)
      : 0;
    const potentialRentWithHotel = !hasHotel && currentHouses >= this.hotelThreshold
      ? this._estimateHotelRentIncrease(property, gameState)
      : 0;
    
    // House analysis
    const houseCost = property.houseCost || 50;
    const houseROI = potentialRentWithHouse > 0 ? potentialRentWithHouse / houseCost : 0;
    const housePaybackYears = potentialRentWithHouse > 0 ? houseCost / potentialRentWithHouse : Infinity;
    
    // Hotel analysis
    const hotelCost = property.houseCost ? property.houseCost * 4 : 200;
    const hotelROI = potentialRentWithHotel > 0 ? potentialRentWithHotel / hotelCost : 0;
    const hotelPaybackYears = potentialRentWithHotel > 0 ? hotelCost / potentialRentWithHotel : Infinity;
    
    return {
      current: {
        houses: currentHouses,
        hasHotel,
        annualRent: currentRent,
      },
      house: {
        cost: houseCost,
        additionalRent: potentialRentWithHouse,
        roi: houseROI,
        paybackYears: Math.round(housePaybackYears * 100) / 100,
      },
      hotel: {
        cost: hotelCost,
        additionalRent: potentialRentWithHotel,
        roi: hotelROI,
        paybackYears: Math.round(hotelPaybackYears * 100) / 100,
      },
    };
  }

  /**
   * Estimate rent increase from adding one house
   * @private
   */
  _estimateRentIncrease(property, currentHouses, gameState) {
    const baseRent = property.rent || 0;
    
    // Get rent with one more house
    const nextHouseCount = currentHouses + 1;
    const nextRentKey = `rentWith${nextHouseCount}House`;
    const nextRent = property[nextRentKey] || baseRent * (1 + nextHouseCount * 0.5);
    
    // Current rent
    const currentRentKey = `rentWith${currentHouses}House`;
    const currentRent = currentHouses > 0 
      ? (property[currentRentKey] || baseRent * (1 + currentHouses * 0.5))
      : baseRent;
    
    const rentIncrease = nextRent - currentRent;
    
    // Apply visit probability
    const visitProb = this._getVisitProbability(property, gameState);
    const visitsPerYear = 40;
    
    return rentIncrease * visitsPerYear * visitProb;
  }

  /**
   * Estimate additional annual rent from hotel upgrade
   * @private
   */
  _estimateHotelRentIncrease(property, gameState) {
    const baseRent = property.rent || 0;
    const hotelRent = property.hotelRent || baseRent * 5;
    const rentWith4Houses = property.rentWith4House || baseRent * 3.5;
    
    const rentIncrease = hotelRent - rentWith4Houses;
    
    // Apply visit probability
    const visitProb = this._getVisitProbability(property, gameState);
    const visitsPerYear = 40;
    
    return rentIncrease * visitsPerYear * visitProb;
  }

  /**
   * Calculate current annual rent
   * @private
   */
  _calculateCurrentAnnualRent(property, gameState) {
    let baseRent = property.rent || 0;
    const houses = property.houses || 0;
    const hasHotel = property.hotel || false;
    
    if (hasHotel) {
      baseRent = property.hotelRent || baseRent * 5;
    } else if (houses > 0) {
      const rentKey = `rentWith${houses}House`;
      baseRent = property[rentKey] || baseRent * (1 + houses * 0.5);
    }
    
    const visitProb = this._getVisitProbability(property, gameState);
    const visitsPerYear = 40;
    
    return baseRent * visitsPerYear * visitProb;
  }

  /**
   * Get visit probability for a property
   * @private
   */
  _getVisitProbability(property, gameState) {
    const tiles = gameState.tiles || [];
    const propertyIndex = tiles.findIndex(t => t.id === property.id);
    
    if (propertyIndex === -1) return 0.1;
    
    const middleIndex = tiles.length / 2;
    const distanceFromMiddle = Math.abs(propertyIndex - middleIndex);
    const normalizedDistance = distanceFromMiddle / middleIndex;
    
    return Math.max(0.05, 0.10 - (normalizedDistance * 0.05));
  }

  /**
   * Get player balance factor
   * @private
   */
  _getBalanceFactor(player) {
    if (player.money < 200) return 0.3;  // Desperate for income
    if (player.money < 500) return 0.15;
    return 0;
  }

  /**
   * Get opponent factor
   * @private
   */
  _getOpponentFactor(propertyId, gameState) {
    const opponents = this._getOpponents(propertyId, gameState);
    if (opponents.length === 0) return 0;
    
    const avgMoney = opponents.reduce((sum, p) => sum + (p.money || 0), 0) / opponents.length;
    
    if (avgMoney > 800) return 0.1;  // Rich opponents pay more
    return 0;
  }

  /**
   * Check if building house completes a monopoly
   * @private
   */
  _checkMonopolyCompletion(property, player, gameState) {
    const colorGroup = property.colorGroup;
    if (!colorGroup) return false;
    
    const tilesInGroup = (gameState.tiles || [])
      .filter(t => t.colorGroup === colorGroup && t.type === 'property');
    
    const ownedInGroup = tilesInGroup.filter(t =>
      player.properties.some(p => p.id === t.id)
    ).length;
    
    // If player owns all but one, building completes monopoly
    return ownedInGroup === tilesInGroup.length - 1;
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
      const properties = player.properties || [];
      if (properties.some(p => p.id === propertyId)) {
        return player;
      }
    }
    return null;
  }

  /**
   * Get opponents
   * @private
   */
  _getOpponents(propertyId, gameState) {
    const owner = this._getOwner(propertyId, gameState);
    if (!owner) return [];
    
    const players = gameState.players || [];
    return players.filter(p => p.id !== owner.id);
  }
}