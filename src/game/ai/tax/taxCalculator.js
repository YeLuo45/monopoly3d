/**
 * Tax Calculator
 * 
 * Calculates various taxes for the monopoly game including property tax,
 * capital gains, income tax, and tax bracket determination.
 */

class TaxCalculator {
  constructor() {
    // Default tax rates (can be overridden by game state)
    this.defaultPropertyTaxRate = 0.015; // 1.5% annual property tax
    this.defaultCapitalGainsRate = 0.15; // 15% capital gains tax
    this.defaultIncomeTaxRate = 0.25; // 25% income tax
    
    // Tax brackets (progressive tax system)
    this.taxBrackets = [
      { min: 0, max: 5000, rate: 0.10 },
      { min: 5000, max: 20000, rate: 0.15 },
      { min: 20000, max: 50000, rate: 0.20 },
      { min: 50000, max: 100000, rate: 0.25 },
      { min: 100000, max: Infinity, rate: 0.30 }
    ];
    
    // Deduction limits
    this.maxPropertyDeduction = 5000;
    this.maxCharitableDeduction = 1000;
  }

  /**
   * Calculate annual property tax for a property
   * @param {string} propertyId - Property identifier
   * @param {Object} gameState - Current game state
   * @returns {number} Annual property tax amount
   */
  calculatePropertyTax(propertyId, gameState) {
    if (!propertyId || !gameState) {
      throw new Error('Property ID and game state are required');
    }
    
    const property = this.findProperty(propertyId, gameState);
    if (!property) {
      throw new Error(`Property not found: ${propertyId}`);
    }
    
    // Get property value (use purchase price or current valuation)
    const propertyValue = property.currentValue || property.purchasePrice || property.value || 0;
    
    // Get tax rate (can be customized by game state)
    const taxRate = gameState.taxRates?.propertyTaxRate || this.defaultPropertyTaxRate;
    
    // Calculate base tax
    const baseTax = propertyValue * taxRate;
    
    // Apply any exemptions or special rates
    const isExempt = property.taxExempt || property.exemptFromTax;
    if (isExempt) {
      return 0;
    }
    
    // Apply improvements bonus (better properties pay more)
    const improvementMultiplier = 1 + (property.improvementLevel || 0) * 0.1;
    
    return baseTax * improvementMultiplier;
  }

  /**
   * Calculate capital gains tax on property sale
   * @param {string} playerId - Player identifier
   * @param {number} salePrice - Sale price of property
   * @param {number} purchasePrice - Original purchase price
   * @returns {number} Capital gains tax amount
   */
  calculateCapitalGains(playerId, salePrice, purchasePrice) {
    if (typeof salePrice !== 'number' || typeof purchasePrice !== 'number') {
      throw new Error('Sale price and purchase price must be numbers');
    }
    
    if (salePrice < 0 || purchasePrice < 0) {
      throw new Error('Prices cannot be negative');
    }
    
    // Calculate gain
    const gain = salePrice - purchasePrice;
    
    // No gain or loss = no tax
    if (gain <= 0) {
      return 0;
    }
    
    // Apply capital gains rate
    const taxRate = this.defaultCapitalGainsRate;
    
    return gain * taxRate;
  }

  /**
   * Calculate income tax based on player income
   * @param {string} playerId - Player identifier
   * @param {Object} gameState - Current game state
   * @returns {number} Income tax amount
   */
  calculateIncomeTax(playerId, gameState) {
    if (!playerId || !gameState) {
      throw new Error('Player ID and game state are required');
    }
    
    const player = this.findPlayer(playerId, gameState);
    if (!player) {
      throw new Error(`Player not found: ${playerId}`);
    }
    
    // Calculate total income (rent, dividends, selling properties, etc.)
    const income = this.calculateTotalIncome(player, gameState);
    
    // Get applicable tax rate based on bracket
    const bracket = this.getTaxBracket(playerId, gameState);
    const taxRate = bracket.rate;
    
    // Apply standard deduction
    const standardDeduction = 2000;
    const taxableIncome = Math.max(0, income - standardDeduction);
    
    return taxableIncome * taxRate;
  }

  /**
   * Apply tax deductions to reduce gross tax
   * @param {number} grossTax - Original tax amount
   * @param {Array} deductions - Array of deduction objects {type, amount}
   * @returns {number} Final tax after deductions
   */
  applyTaxDeductions(grossTax, deductions) {
    if (typeof grossTax !== 'number' || grossTax < 0) {
      throw new Error('Gross tax must be a non-negative number');
    }
    
    if (!Array.isArray(deductions)) {
      throw new Error('Deductions must be an array');
    }
    
    let totalDeduction = 0;
    
    for (const deduction of deductions) {
      if (deduction.type === 'property') {
        totalDeduction += Math.min(deduction.amount, this.maxPropertyDeduction);
      } else if (deduction.type === 'charitable') {
        totalDeduction += Math.min(deduction.amount, this.maxCharitableDeduction);
      } else if (deduction.type === 'loss') {
        // Tax loss deduction (can offset gains)
        totalDeduction += Math.abs(deduction.amount);
      } else {
        // Generic deduction
        totalDeduction += Math.abs(deduction.amount);
      }
    }
    
    // Cannot reduce tax below zero
    return Math.max(0, grossTax - totalDeduction);
  }

  /**
   * Get the current tax bracket for a player
   * @param {string} playerId - Player identifier
   * @param {Object} gameState - Current game state
   * @returns {Object} Tax bracket {min, max, rate}
   */
  getTaxBracket(playerId, gameState) {
    if (!playerId || !gameState) {
      throw new Error('Player ID and game state are required');
    }
    
    const player = this.findPlayer(playerId, gameState);
    if (!player) {
      throw new Error(`Player not found: ${playerId}`);
    }
    
    const income = this.calculateTotalIncome(player, gameState);
    
    // Find appropriate bracket
    for (const bracket of this.taxBrackets) {
      if (income >= bracket.min && income < bracket.max) {
        return bracket;
      }
    }
    
    // Default to highest bracket
    return this.taxBrackets[this.taxBrackets.length - 1];
  }

  /**
   * Calculate total income for a player
   * @param {Object} player - Player object
   * @param {Object} gameState - Current game state
   * @returns {number} Total income
   */
  calculateTotalIncome(player, gameState) {
    let totalIncome = 0;
    
    // Base income from game (if any)
    if (player.baseIncome) {
      totalIncome += player.baseIncome;
    }
    
    // Rent collected from properties
    if (player.rentCollected) {
      totalIncome += player.rentCollected;
    }
    
    // Property sales
    if (player.propertiesSoldValue) {
      totalIncome += player.propertiesSoldValue;
    }
    
    // Dividends from investments
    if (player.dividends) {
      totalIncome += player.dividends;
    }
    
    // Interest income
    if (player.interestIncome) {
      totalIncome += player.interestIncome;
    }
    
    return totalIncome;
  }

  /**
   * Find a property by ID in game state
   * @param {string} propertyId - Property identifier
   * @param {Object} gameState - Game state
   * @returns {Object|null} Property object
   */
  findProperty(propertyId, gameState) {
    if (gameState.properties) {
      return gameState.properties.find(p => p.id === propertyId) || null;
    }
    if (gameState.board) {
      for (const cell of gameState.board) {
        if (cell.propertyId === propertyId || cell.id === propertyId) {
          return cell;
        }
      }
    }
    return gameState[propertyId] || null;
  }

  /**
   * Find a player by ID in game state
   * @param {string} playerId - Player identifier
   * @param {Object} gameState - Game state
   * @returns {Object|null} Player object
   */
  findPlayer(playerId, gameState) {
    if (gameState.players) {
      return gameState.players.find(p => p.id === playerId) || null;
    }
    return gameState[playerId] || null;
  }
}

export { TaxCalculator };