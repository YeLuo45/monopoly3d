/**
 * DebtManager - Manage debts and repayments
 * 
 * Tracks player debts, calculates leverage ratios, determines optimal
 * repayment strategies, and assesses credit capacity.
 */

export class DebtManager {
  constructor() {
    // Thresholds for credit assessment
    this.maxLeverageRatio = 0.8;      // Max 80% debt-to-value
    this.warningLeverageRatio = 0.5;  // Warning at 50%
    
    // Interest rates (simplified Monopoly 10% on mortgages)
    this.mortgageInterestRate = 0.1;
    
    // Minimum credit score threshold
    this.minCreditScore = 0.3;
  }

  /**
   * Track debt status for a player
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Debt status
   */
  trackDebt(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { totalDebt: 0, mortgageCount: 0, propertiesMortgaged: [], monthlyInterest: 0 };
    }
    
    const properties = player.properties || [];
    let totalDebt = 0;
    const propertiesMortgaged = [];
    let monthlyInterest = 0;
    
    for (const prop of properties) {
      if (prop.mortgaged) {
        const tile = gameState.tiles?.find(t => t.id === prop.id);
        if (tile) {
          // Mortgage value is typically 50% of purchase price
          const mortgageValue = Math.floor((tile.price || 0) * 0.5);
          totalDebt += mortgageValue;
          propertiesMortgaged.push({
            propertyId: prop.id,
            propertyName: tile.name,
            mortgageValue,
          });
          monthlyInterest += mortgageValue * this.mortgageInterestRate;
        }
      }
    }
    
    return {
      totalDebt,
      mortgageCount: propertiesMortgaged.length,
      propertiesMortgaged,
      monthlyInterest: Math.round(monthlyInterest * 100) / 100,
    };
  }

  /**
   * Get debt-to-value ratio for a player
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {number} Ratio (0-1), 1 = fully leveraged
   */
  getDebtToValueRatio(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    const properties = player.properties || [];
    let totalValue = 0;
    let totalDebt = 0;
    
    for (const prop of properties) {
      const tile = gameState.tiles?.find(t => t.id === prop.id);
      if (tile) {
        // Calculate property value
        let value = tile.price || 0;
        if (tile.hotel) {
          value += tile.houseCost * 4; // Hotel costs ~4x house
        } else if (tile.houses > 0) {
          value += (tile.houseCost || 0) * tile.houses;
        }
        
        totalValue += value;
        
        if (prop.mortgaged) {
          totalDebt += Math.floor((tile.price || 0) * 0.5);
        }
      }
    }
    
    if (totalValue === 0) return 0;
    
    return Math.round((totalDebt / totalValue) * 100) / 100;
  }

  /**
   * Get optimal order for repaying debts
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {Array} Ordered list of properties to unmortgage
   */
  getOptimalRepaymentOrder(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return [];
    
    const properties = player.properties || [];
    const mortgagedProperties = properties.filter(p => p.mortgaged);
    
    // Score each property for repayment priority
    const scored = mortgagedProperties.map(prop => {
      const tile = gameState.tiles?.find(t => t.id === prop.id);
      if (!tile) return { propertyId: prop.id, score: 0, mortgageValue: 0 };
      
      const mortgageValue = Math.floor((tile.price || 0) * 0.5);
      const rent = tile.rent || 0;
      const colorGroup = tile.colorGroup;
      
      // Calculate score (higher = more urgent to repay)
      let score = 0;
      
      // Monopoly properties are higher priority (double rent)
      const sameColorOwned = properties.filter(p => {
        const t = gameState.tiles?.find(t => t.id === p.id);
        return t && t.colorGroup === colorGroup;
      }).length;
      
      const tilesInGroup = (gameState.tiles || []).filter(t => 
        t.colorGroup === colorGroup && t.type === 'property'
      ).length;
      
      if (sameColorOwned === tilesInGroup && tilesInGroup > 0) {
        score += 50; // Monopoly bonus
      }
      
      // High rent properties are higher priority
      score += rent * 2;
      
      // Cheaper mortgages are lower priority (free up cash for expensive ones)
      score -= mortgageValue * 0.1;
      
      return {
        propertyId: prop.id,
        propertyName: tile.name,
        score,
        mortgageValue,
        rent,
        isMonopoly: sameColorOwned === tilesInGroup && tilesInGroup > 0,
      };
    });
    
    // Sort by score descending (highest priority first)
    scored.sort((a, b) => b.score - a.score);
    
    return scored;
  }

  /**
   * Determine if player should pay off a mortgage early
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} Recommendation {should, reason, savings}
   */
  shouldPayOffDebt(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) {
      return { should: false, reason: 'Property not found', savings: 0 };
    }
    
    const player = this._getPlayer(gameState.currentPlayerId, gameState);
    if (!player) {
      return { should: false, reason: 'Player not found', savings: 0 };
    }
    
    const mortgageValue = Math.floor((property.price || 0) * 0.5);
    const canAfford = (player.money || 0) >= mortgageValue;
    
    if (!canAfford) {
      return { should: false, reason: 'Cannot afford to unmortgage', savings: 0 };
    }
    
    // Calculate interest savings (10% per turn in Monopoly)
    const totalInterest = mortgageValue * this.mortgageInterestRate;
    
    // If rent income is high relative to mortgage, prioritize paying off
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
    
    // High-rent or monopoly properties should be unmortgaged sooner
    if (isMonopoly && rent > 20) {
      return { 
        should: true, 
        reason: 'Monopoly property with high rent - prioritize', 
        savings: totalInterest 
      };
    }
    
    // If player has excess cash, unmortgage
    const excessCash = (player.money || 0) - mortgageValue - 500; // Keep 500 reserve
    if (excessCash > mortgageValue * 2) {
      return { 
        should: true, 
        reason: 'Sufficient cash reserves', 
        savings: totalInterest 
      };
    }
    
    return { 
      should: false, 
      reason: 'Keep cash for opportunities', 
      savings: totalInterest 
    };
  }

  /**
   * Get credit rating for a player (0-1)
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {number} Credit score (0-1, higher = better)
   */
  getCreditRating(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    let score = 1.0; // Start with perfect credit
    
    // Reduce for high leverage
    const leverage = this.getDebtToValueRatio(playerId, gameState);
    score -= leverage * 0.5;
    
    // Reduce for low cash
    const cashRatio = (player.money || 0) / 1000;
    if (cashRatio < 0.5) {
      score -= (0.5 - cashRatio) * 0.3;
    }
    
    // Reduce for many mortgaged properties
    const { mortgageCount } = this.trackDebt(playerId, gameState);
    const propertyCount = (player.properties || []).length;
    if (propertyCount > 0) {
      const mortgageRatio = mortgageCount / propertyCount;
      score -= mortgageRatio * 0.2;
    }
    
    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
  }

  /**
   * Get maximum borrowing capacity
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Borrowing capacity info
   */
  getMaxBorrowingCapacity(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { maxBorrowing: 0, availableCapacity: 0, reason: 'Player not found' };
    }
    
    // Calculate total property value
    let totalValue = 0;
    let unmortgagedValue = 0;
    
    for (const prop of player.properties || []) {
      const tile = gameState.tiles?.find(t => t.id === prop.id);
      if (tile) {
        let value = tile.price || 0;
        if (tile.hotel) {
          value += tile.houseCost * 4;
        } else if (tile.houses > 0) {
          value += (tile.houseCost || 0) * tile.houses;
        }
        
        totalValue += value;
        
        if (!prop.mortgaged) {
          unmortgagedValue += value;
        }
      }
    }
    
    // Max borrowing is based on unmortgaged property value (50% mortgage rate)
    const maxBorrowing = Math.floor(unmortgagedValue * 0.5);
    
    // Current debt reduces capacity
    const { totalDebt } = this.trackDebt(playerId, gameState);
    const availableCapacity = Math.max(0, maxBorrowing - totalDebt);
    
    let reason = 'OK';
    if (availableCapacity === 0) {
      reason = 'No unmortgaged properties available';
    } else if (availableCapacity < maxBorrowing * 0.3) {
      reason = 'Limited capacity due to existing debt';
    }
    
    return {
      maxBorrowing,
      currentDebt: totalDebt,
      availableCapacity,
      reason,
    };
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