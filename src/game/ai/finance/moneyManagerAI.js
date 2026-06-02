/**
 * MoneyManagerAI - AI Strategic Money Management
 * 
 * Manages player money strategically, making decisions about spending,
 * investments, and asset liquidation to optimize game outcomes.
 */

export class MoneyManagerAI {
  constructor(memoryLayer) {
    this.memoryLayer = memoryLayer;
    
    // Cash safety thresholds
    this.minCashReserve = 200;
    this.emergencyCashReserve = 500;
    this.comfortableCashLevel = 1000;
    
    // Spending risk tolerance (0-1)
    this.riskTolerance = 0.5;
  }

  /**
   * Decide if player should spend money on a purchase
   * @param {number} amount - Amount to spend
   * @param {string} reason - Reason for spending
   * @param {object} gameState - Current game state
   * @returns {object} Decision {should, reasoning}
   */
  shouldSpendMoney(amount, reason, gameState) {
    const player = this._getCurrentPlayer(gameState);
    if (!player) {
      return { should: false, reasoning: 'Unknown player' };
    }
    
    const currentCash = player.money || 0;
    const safeCash = this.getSafeCashLevel(player.id, gameState);
    const availableCash = currentCash - safeCash;
    
    // Can't spend what we don't have
    if (amount > currentCash) {
      return { 
        should: false, 
        reasoning: `Insufficient funds: need $${amount}, have $${currentCash}` 
      };
    }
    
    // Emergency situation - don't spend
    if (this._isEmergencySituation(player.id, gameState)) {
      return { 
        should: false, 
        reasoning: 'Emergency situation - cash reserves needed' 
      };
    }
    
    // Calculate spending recommendation based on reason
    const priorityLevel = this._getSpendingPriority(reason, gameState);
    
    // High priority spending (rent, taxes, etc)
    if (priorityLevel === 'critical') {
      return { 
        should: true, 
        reasoning: `Critical expense: ${reason}` 
      };
    }
    
    // Investment spending
    if (priorityLevel === 'investment') {
      const expectedReturn = this._estimateReturnOnSpending(amount, reason, gameState);
      if (expectedReturn > 0.1) { // >10% expected ROI
        return { 
          should: true, 
          reasoning: `Good investment opportunity with ${(expectedReturn * 100).toFixed(1)}% expected return` 
        };
      } else if (availableCash < amount * 0.5) {
        return { 
          should: false, 
          reasoning: 'Insufficient surplus for investment' 
        };
      }
    }
    
    // Moderate spending with available cash
    if (amount <= availableCash * this.riskTolerance) {
      return { 
        should: true, 
        reasoning: `Affordable expenditure within risk tolerance` 
      };
    }
    
    // Large expenditure check
    if (amount > availableCash) {
      return { 
        should: false, 
        reasoning: `Exceeds safe spending limit: $${amount} > $${availableCash} available` 
      };
    }
    
    return { 
      should: true, 
      reasoning: `Discretionary spending approved` 
    };
  }

  /**
   * Get maximum bid amount for a property
   * @param {string} propertyId - Property being bid on
   * @param {object} gameState - Current game state
   * @returns {number} Maximum acceptable bid
   */
  getOptimalPurchaseAmount(propertyId, gameState) {
    const player = this._getCurrentPlayer(gameState);
    if (!player) return 0;
    
    const property = this._getProperty(propertyId, gameState);
    if (!property) return 0;
    
    const propertyValue = this._calculateStrategicValue(propertyId, player.id, gameState);
    const currentCash = player.money || 0;
    const safeCash = this.getSafeCashLevel(player.id, gameState);
    const availableCash = currentCash - safeCash;
    
    // Base maximum is strategic value
    let maxBid = propertyValue;
    
    // Add premium for monopoly potential (up to 30%)
    const monopolyPotential = this._getMonopolyPotential(property, player.id, gameState);
    maxBid += property.price * monopolyPotential * 0.3;
    
    // Cap at available cash minus safe reserve
    maxBid = Math.min(maxBid, availableCash);
    
    // Never bid more than purchase price * 1.5
    maxBid = Math.min(maxBid, property.price * 1.5);
    
    return Math.max(0, Math.round(maxBid));
  }

  /**
   * Get minimum safe cash level for player
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {number} Minimum cash to maintain
   */
  getSafeCashLevel(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return this.minCashReserve;
    
    const currentCash = player.money || 0;
    
    // Base reserve
    let reserve = this.minCashReserve;
    
    // Increase if player is low on cash relative to game phase
    const turn = gameState.turn || 1;
    const isEarlyGame = turn < 10;
    const isMidGame = turn >= 10 && turn < 25;
    
    if (isEarlyGame) {
      reserve = this.minCashReserve;
    } else if (isMidGame) {
      reserve = this.emergencyCashReserve;
    } else {
      // Late game - need more reserves
      reserve = this.comfortableCashLevel;
    }
    
    // If cash is already below comfortable level, use half as minimum
    if (currentCash < this.comfortableCashLevel) {
      reserve = Math.min(reserve, currentCash * 0.3);
    }
    
    return Math.max(this.minCashReserve, Math.round(reserve));
  }

  /**
   * Determine if player should liquidate assets
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Liquidation decision {should, assets, reasoning}
   */
  shouldLiquidateAssets(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { should: false, assets: [], reasoning: 'Unknown player' };
    }
    
    const currentCash = player.money || 0;
    const safeCash = this.getSafeCashLevel(playerId, gameState);
    const cashDeficit = safeCash - currentCash;
    
    // No need to liquidate
    if (cashDeficit <= 0) {
      return { should: false, assets: [], reasoning: 'Sufficient cash reserves' };
    }
    
    // Calculate if we're in crisis
    const isCrisis = this._isEmergencySituation(playerId, gameState);
    
    // Get properties sorted by liquidation value (mortgage value)
    const properties = player.properties || [];
    const liquidatableAssets = this._getLiquidatableAssets(playerId, gameState);
    
    if (liquidatableAssets.length === 0) {
      return { 
        should: false, 
        assets: [], 
        reasoning: 'No liquidatable assets available' 
      };
    }
    
    // Calculate total liquidation value
    const totalValue = liquidatableAssets.reduce((sum, asset) => sum + asset.liquidationValue, 0);
    
    if (isCrisis && cashDeficit > totalValue * 0.3) {
      // Must liquidate more aggressively
      return { 
        should: true, 
        assets: liquidatableAssets,
        reasoning: `Crisis mode: liquidating assets to cover $${cashDeficit} deficit` 
      };
    }
    
    if (cashDeficit > totalValue * 0.5) {
      // Moderate need - liquidate some assets
      const assetsNeeded = this._selectAssetsForLiquidation(liquidatableAssets, cashDeficit);
      return { 
        should: true, 
        assets: assetsNeeded,
        reasoning: `Liquidating assets to maintain safe cash level` 
      };
    }
    
    return { 
      should: false, 
      assets: [],
      reasoning: 'Cash reserves sufficient for now' 
    };
  }

  /**
   * Evaluate ROI for a property investment
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} ROI analysis {roi, paybackPeriod, reasoning}
   */
  evaluateInvestment(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) {
      return { roi: 0, paybackPeriod: Infinity, reasoning: 'Property not found' };
    }
    
    const purchasePrice = property.price || 0;
    if (purchasePrice === 0) {
      return { roi: 0, paybackPeriod: Infinity, reasoning: 'Invalid property price' };
    }
    
    const expectedRent = this._estimatePropertyRent(property, gameState);
    const visitsPerTurn = this._estimateVisitsPerTurn(property, gameState);
    const turnsPerYear = 20; // Standard Monopoly estimate
    
    // Annual expected rent
    const annualRent = expectedRent * visitsPerTurn * turnsPerYear;
    
    // ROI calculation
    const roi = (annualRent / purchasePrice) * 100;
    
    // Payback period in turns
    const paybackPeriod = annualRent > 0 ? purchasePrice / annualRent : Infinity;
    const paybackTurns = paybackPeriod * turnsPerYear;
    
    // Strategic factors
    const strategicValue = this._calculateStrategicValue(propertyId, null, gameState);
    const premium = ((strategicValue - purchasePrice) / purchasePrice) * 100;
    
    const reasoning = premium > 20 
      ? 'Excellent investment with high strategic value'
      : premium > 0 
        ? 'Good investment with moderate strategic value'
        : 'Below market value - consider negotiating';
    
    return { 
      roi: Math.round(roi * 100) / 100,
      paybackPeriod: Math.round(paybackTurns * 100) / 100,
      reasoning
    };
  }

  /**
   * Find the best value property in the game
   * @param {object} gameState - Current game state
   * @returns {object} Best value property {propertyId, valuePerDollar}
   */
  getBestValueProperty(gameState) {
    const tiles = gameState.tiles || [];
    const properties = tiles.filter(t => t.type === 'property' && t.price > 0);
    
    let bestProperty = null;
    let bestValuePerDollar = 0;
    
    for (const property of properties) {
      const strategicValue = this._calculateStrategicValue(property.id, null, gameState);
      const valuePerDollar = strategicValue / property.price;
      
      if (valuePerDollar > bestValuePerDollar) {
        bestValuePerDollar = valuePerDollar;
        bestProperty = property;
      }
    }
    
    return { 
      propertyId: bestProperty?.id || null,
      valuePerDollar: Math.round(bestValuePerDollar * 100) / 100
    };
  }

  /**
   * Check if player is in emergency situation
   * @private
   */
  _isEmergencySituation(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return false;
    
    const cash = player.money || 0;
    const totalAssets = this._calculateTotalAssets(playerId, gameState);
    
    // Bankrupt if can't pay rent
    if (cash < 50 && totalAssets < 200) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate total player assets
   * @private
   */
  _calculateTotalAssets(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    let total = player.money || 0;
    const properties = player.properties || [];
    
    for (const prop of properties) {
      const property = this._getProperty(prop.id, gameState);
      if (property) {
        total += property.price * 0.5; // Mortgage value
      }
    }
    
    return total;
  }

  /**
   * Get spending priority level
   * @private
   */
  _getSpendingPriority(reason, gameState) {
    const lowerReason = reason.toLowerCase();
    
    if (lowerReason.includes('rent') || lowerReason.includes('tax') || lowerReason.includes('fee')) {
      return 'critical';
    }
    
    if (lowerReason.includes('property') || lowerReason.includes('bid') || lowerReason.includes('buy')) {
      return 'investment';
    }
    
    if (lowerReason.includes('house') || lowerReason.includes('hotel') || lowerReason.includes('build')) {
      return 'investment';
    }
    
    if (lowerReason.includes('trade') || lowerReason.includes('mortgage')) {
      return 'moderate';
    }
    
    return 'discretionary';
  }

  /**
   * Estimate return on spending
   * @private
   */
  _estimateReturnOnSpending(amount, reason, gameState) {
    const priorityLevel = this._getSpendingPriority(reason, gameState);
    
    if (priorityLevel === 'investment') {
      // Estimate ~15% ROI on property investments
      return 0.15;
    }
    
    if (priorityLevel === 'critical') {
      // Avoiding bankruptcy is 100% ROI
      return 1.0;
    }
    
    return 0;
  }

  /**
   * Get monopoly potential for a property
   * @private
   */
  _getMonopolyPotential(property, playerId, gameState) {
    const colorGroup = property.colorGroup;
    if (!colorGroup) return 0;
    
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    const playerProperties = player.properties || [];
    const sameColorOwned = playerProperties.filter(p => p.colorGroup === colorGroup).length;
    
    const tilesInGroup = (gameState.tiles || [])
      .filter(t => t.colorGroup === colorGroup && t.type === 'property').length;
    
    if (tilesInGroup === 0) return 0;
    
    // Higher score for properties closer to completing monopoly
    return (sameColorOwned + 1) / tilesInGroup;
  }

  /**
   * Calculate strategic value of a property
   * @private
   */
  _calculateStrategicValue(propertyId, playerId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return 0;
    
    let value = property.price || 0;
    
    // Add expected rent value (10 turns)
    const expectedRent = this._estimatePropertyRent(property, gameState);
    value += expectedRent * 10;
    
    // Monopoly bonus
    if (playerId) {
      const monopolyPotential = this._getMonopolyPotential(property, playerId, gameState);
      if (monopolyPotential >= 1.0) {
        value += property.price * 0.5;
      }
    }
    
    return value;
  }

  /**
   * Get liquidatable assets for a player
   * @private
   */
  _getLiquidatableAssets(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return [];
    
    const assets = [];
    const properties = player.properties || [];
    
    for (const prop of properties) {
      if (prop.mortgaged) continue; // Already mortgaged
      
      const property = this._getProperty(prop.id, gameState);
      if (property) {
        assets.push({
          id: prop.id,
          name: property.name,
          purchasePrice: property.price,
          liquidationValue: property.price * 0.5, // Mortgage value
          houses: property.houses || 0,
        });
      }
    }
    
    // Sort by liquidation value (lowest first - sell cheap ones first)
    assets.sort((a, b) => a.liquidationValue - b.liquidationValue);
    
    return assets;
  }

  /**
   * Select assets for liquidation to cover deficit
   * @private
   */
  _selectAssetsForLiquidation(assets, targetAmount) {
    const selected = [];
    let totalValue = 0;
    
    for (const asset of assets) {
      if (totalValue >= targetAmount) break;
      
      selected.push(asset);
      totalValue += asset.liquidationValue;
    }
    
    return selected;
  }

  /**
   * Estimate property rent
   * @private
   */
  _estimatePropertyRent(property, gameState) {
    let rent = property.rent || 0;
    
    const houses = property.houses || 0;
    const hasHotel = property.hotel || false;
    
    if (hasHotel) {
      rent = property.hotelRent || rent * 5;
    } else if (houses > 0) {
      const houseKey = `rentWith${houses}House`;
      rent = property[houseKey] || rent * (1 + houses * 0.5);
    }
    
    return rent;
  }

  /**
   * Estimate visits per turn for a property
   * @private
   */
  _estimateVisitsPerTurn(property, gameState) {
    // Base visit probability
    const baseProb = 0.1;
    const tiles = gameState.tiles || [];
    const propertyIndex = tiles.findIndex(t => t.id === property.id);
    
    if (propertyIndex === -1) return baseProb;
    
    // Middle properties visited more often
    const middleIndex = tiles.length / 2;
    const distanceFromMiddle = Math.abs(propertyIndex - middleIndex);
    const normalizedDistance = distanceFromMiddle / middleIndex;
    
    return baseProb - (normalizedDistance * 0.05);
  }

  /**
   * Get current player
   * @private
   */
  _getCurrentPlayer(gameState) {
    const currentPlayerId = gameState.currentPlayerId;
    if (!currentPlayerId) return null;
    return this._getPlayer(currentPlayerId, gameState);
  }

  /**
   * Get player by ID
   * @private
   */
  _getPlayer(playerId, gameState) {
    const players = gameState.players || [];
    return players.find(p => p.id === playerId) || null;
  }

  /**
   * Get property by ID
   * @private
   */
  _getProperty(propertyId, gameState) {
    const tiles = gameState.tiles || [];
    return tiles.find(t => t.id === propertyId) || null;
  }
}