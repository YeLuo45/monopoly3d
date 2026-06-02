/**
 * BalancedContentGenerator - Balance game content generation
 * 
 * Ensures generated content maintains proper game balance by analyzing
 * and adjusting property values, rent rates, and economic metrics.
 */

export class BalancedContentGenerator {
  /**
   * Create a balanced content generator
   * @param {object} gameMetrics - Game metrics for balance reference
   */
  constructor(gameMetrics = {}) {
    this.gameMetrics = {
      averagePropertyPrice: gameMetrics.averagePropertyPrice || 200,
      averageRentRate: gameMetrics.averageRentRate || 0.06,
      averageROI: gameMetrics.averageROI || 0.12,
      targetBalanceScore: gameMetrics.targetBalanceScore || 0.5,
      maxPriceSpread: gameMetrics.maxPriceSpread || 2.5,
      minRentMultiplier: gameMetrics.minRentMultiplier || 0.04,
      maxRentMultiplier: gameMetrics.maxRentMultiplier || 0.10,
      ...gameMetrics,
    };

    this.balanceRules = {
      minPrice: 30,
      maxPrice: 600,
      minRentToPriceRatio: 0.03,
      maxRentToPriceRatio: 0.12,
      maxHouseCostRatio: 0.6,
      minHouseCostRatio: 0.3,
    };

    this.statHistory = [];
  }

  /**
   * Generate a balanced property with adjusted stats
   * @returns {object} Balanced property
   */
  generateBalancedProperty() {
    const id = `balanced_prop_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Use weighted random for color group
    const colorGroup = this._weightedRandomColor();
    
    // Generate base price within balanced range
    const basePrice = this._calculateBalancedPrice(colorGroup);
    
    // Calculate rent based on balanced rent multiplier
    const rentMultiplier = this._calculateBalancedRentMultiplier(colorGroup);
    const rent = Math.max(1, Math.round(basePrice * rentMultiplier));
    
    // Calculate house costs
    const houseCost = Math.round(basePrice * this._randomInRange(0.35, 0.55));
    
    // Generate house rent tiers
    const rentTiers = this._generateRentTiers(rent, basePrice);
    
    const property = {
      id,
      type: 'property',
      name: this._generatePropertyName(colorGroup),
      colorGroup,
      price: basePrice,
      rent,
      rentWith1House: rentTiers.rentWith1House,
      rentWith2House: rentTiers.rentWith2House,
      rentWith3House: rentTiers.rentWith3House,
      rentWith4House: rentTiers.rentWith4House,
      hotelRent: rentTiers.hotelRent,
      houseCost,
      mortgageValue: Math.round(basePrice * 0.5),
      balanceScore: this._calculateBalanceScore({ price: basePrice, rent, rentMultiplier }),
    };

    this.statHistory.push({ type: 'property', data: property });
    return property;
  }

  /**
   * Check if content is balanced
   * @param {object} content - Content to check
   * @returns {object} Balance check result
   */
  checkBalance(content) {
    if (content.type === 'property') {
      return this._checkPropertyBalance(content);
    } else if (content.type === 'event') {
      return this._checkEventBalance(content);
    } else if (content.type === 'card') {
      return this._checkCardBalance(content);
    }

    return {
      balanced: true,
      score: 0.5,
      issues: [],
      warnings: [],
    };
  }

  /**
   * Check property balance
   * @private
   */
  _checkPropertyBalance(property) {
    const issues = [];
    const warnings = [];

    // Check price bounds
    if (property.price < this.balanceRules.minPrice) {
      issues.push(`Price ${property.price} below minimum ${this.balanceRules.minPrice}`);
    }
    if (property.price > this.balanceRules.maxPrice) {
      issues.push(`Price ${property.price} above maximum ${this.balanceRules.maxPrice}`);
    }

    // Check rent to price ratio
    const rentRatio = property.rent / property.price;
    if (rentRatio < this.balanceRules.minRentToPriceRatio) {
      issues.push(`Rent/price ratio ${rentRatio.toFixed(3)} below minimum ${this.balanceRules.minRentToPriceRatio}`);
    }
    if (rentRatio > this.balanceRules.maxRentToPriceRatio) {
      warnings.push(`Rent/price ratio ${rentRatio.toFixed(3)} above typical ${this.balanceRules.maxRentToPriceRatio}`);
    }

    // Check house cost ratio
    if (property.houseCost) {
      const houseCostRatio = property.houseCost / property.price;
      if (houseCostRatio < this.balanceRules.minHouseCostRatio) {
        warnings.push(`House cost ratio ${houseCostRatio.toFixed(2)} below typical`);
      }
      if (houseCostRatio > this.balanceRules.maxHouseCostRatio) {
        warnings.push(`House cost ratio ${houseCostRatio.toFixed(2)} above typical`);
      }
    }

    // Calculate balance score
    const score = this._calculateBalanceScore(property);

    return {
      balanced: issues.length === 0,
      score: Math.max(0, Math.min(1, score)),
      issues,
      warnings,
    };
  }

  /**
   * Check event balance
   * @private
   */
  _checkEventBalance(event) {
    const issues = [];
    const warnings = [];

    const effect = event.effect || {};

    // Check money effects
    if (effect.type === 'money' || effect.amount) {
      const amount = Math.abs(effect.amount || 0);
      if (amount > 500) {
        warnings.push(`Large money effect: ${amount}`);
      }
      if (amount > 1000) {
        issues.push(`Excessive money effect: ${amount}`);
      }
    }

    // Check movement effects
    if (effect.type === 'movement' || effect.spaces) {
      const spaces = Math.abs(effect.spaces || 0);
      if (spaces > 20) {
        warnings.push(`Large movement: ${spaces} spaces`);
      }
    }

    // Check jail-related effects
    if (effect.destination === 'jail') {
      warnings.push('Jail destination event - may be harsh');
    }

    return {
      balanced: issues.length === 0,
      score: issues.length === 0 ? 0.7 - warnings.length * 0.1 : 0.3,
      issues,
      warnings,
    };
  }

  /**
   * Check card balance
   * @private
   */
  _checkCardBalance(card) {
    const issues = [];
    const warnings = [];

    const amount = Math.abs(card.amount || 0);

    if (amount > 300) {
      warnings.push(`Large card value: ${amount}`);
    }
    if (amount > 500) {
      issues.push(`Excessive card value: ${amount}`);
    }

    if (card.action === 'go_to_jail') {
      warnings.push('Jail card - may be harsh');
    }

    return {
      balanced: issues.length === 0,
      score: issues.length === 0 ? 0.6 - warnings.length * 0.1 : 0.3,
      issues,
      warnings,
    };
  }

  /**
   * Adjust content to target balance
   * @param {object} content - Content to adjust
   * @param {number} targetBalance - Target balance score (0-1)
   * @returns {object} Adjusted content
   */
  adjustContent(content, targetBalance = 0.5) {
    if (content.type === 'property') {
      return this._adjustProperty(content, targetBalance);
    }

    // For non-property content, return as-is with adjusted score
    return {
      ...content,
      balanceScore: targetBalance,
      wasAdjusted: false,
    };
  }

  /**
   * Adjust property to target balance
   * @private
   */
  _adjustProperty(property, targetBalance) {
    const adjusted = { ...property };
    let score = this._calculateBalanceScore(property);
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations && Math.abs(score - targetBalance) > 0.05) {
      const diff = targetBalance - score;

      if (score < targetBalance) {
        // Increase value - reduce price or increase rent
        if (this.rng() > 0.5 && adjusted.price > this.balanceRules.minPrice) {
          adjusted.price = Math.max(this.balanceRules.minPrice, Math.round(adjusted.price * 0.95));
          adjusted.mortgageValue = Math.round(adjusted.price * 0.5);
        } else {
          adjusted.rent = Math.max(1, Math.round(adjusted.rent * 1.05));
          this._recalculateRentTiers(adjusted);
        }
      } else {
        // Decrease value - increase price or reduce rent
        if (this.rng() > 0.5 && adjusted.price < this.balanceRules.maxPrice) {
          adjusted.price = Math.min(this.balanceRules.maxPrice, Math.round(adjusted.price * 1.05));
          adjusted.mortgageValue = Math.round(adjusted.price * 0.5);
        } else {
          adjusted.rent = Math.max(1, Math.round(adjusted.rent * 0.95));
          this._recalculateRentTiers(adjusted);
        }
      }

      adjusted.balanceScore = this._calculateBalanceScore(adjusted);
      score = adjusted.balanceScore;
      iterations++;
    }

    adjusted.wasAdjusted = iterations > 0;
    adjusted.adjustmentIterations = iterations;
    return adjusted;
  }

  /**
   * Calculate balance score for property
   * @private
   */
  _calculateBalanceScore(property) {
    const rentRatio = property.rent / property.price;
    
    // Ideal ratio around 0.06
    const idealRatio = 0.06;
    const ratioDeviation = Math.abs(rentRatio - idealRatio) / idealRatio;
    
    // Price deviation from average
    const priceDeviation = Math.abs(property.price - this.gameMetrics.averagePropertyPrice) / this.gameMetrics.averagePropertyPrice;
    
    // Combined score (0-1, higher is better)
    const score = 1 - (ratioDeviation * 0.5 + priceDeviation * 0.3);
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate balanced price for color group
   * @private
   */
  _calculateBalancedPrice(colorGroup) {
    const ranges = {
      brown: [60, 100],
      lightBlue: [100, 150],
      pink: [150, 200],
      orange: [200, 250],
      red: [250, 350],
      yellow: [280, 400],
      green: [300, 450],
      darkBlue: [350, 500],
    };

    const range = ranges[colorGroup] || [100, 300];
    const midPrice = (range[0] + range[1]) / 2;
    const variance = (range[1] - range[0]) / 2;

    // Target the middle with some variation
    return Math.round(midPrice + this._randomInRange(-0.5, 0.5) * variance);
  }

  /**
   * Calculate balanced rent multiplier for color group
   * @private
   */
  _calculateBalancedRentMultiplier(colorGroup) {
    const multipliers = {
      brown: 0.05,
      lightBlue: 0.055,
      pink: 0.06,
      orange: 0.065,
      red: 0.07,
      yellow: 0.075,
      green: 0.08,
      darkBlue: 0.085,
    };

    const base = multipliers[colorGroup] || 0.06;
    return base * this._randomInRange(0.9, 1.1);
  }

  /**
   * Generate rent tiers for property
   * @private
   */
  _generateRentTiers(baseRent, price) {
    const tierMultiplier = this._randomInRange(0.25, 0.35);
    return {
      rentWith1House: Math.round(baseRent * (3 + tierMultiplier * 2)),
      rentWith2House: Math.round(baseRent * (6 + tierMultiplier * 4)),
      rentWith3House: Math.round(baseRent * (10 + tierMultiplier * 6)),
      rentWith4House: Math.round(baseRent * (16 + tierMultiplier * 8)),
      hotelRent: Math.round(baseRent * (22 + tierMultiplier * 10)),
    };
  }

  /**
   * Recalculate rent tiers after adjustment
   * @private
   */
  _recalculateRentTiers(property) {
    const tiers = this._generateRentTiers(property.rent, property.price);
    property.rentWith1House = tiers.rentWith1House;
    property.rentWith2House = tiers.rentWith2House;
    property.rentWith3House = tiers.rentWith3House;
    property.rentWith4House = tiers.rentWith4House;
    property.hotelRent = tiers.hotelRent;
  }

  /**
   * Get weighted random color group
   * @private
   */
  _weightedRandomColor() {
    const weights = {
      brown: 2,
      lightBlue: 2,
      pink: 3,
      orange: 3,
      red: 3,
      yellow: 3,
      green: 2,
      darkBlue: 1,
    };

    const colors = Object.keys(weights);
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (const color of colors) {
      random -= weights[color];
      if (random <= 0) return color;
    }

    return colors[colors.length - 1];
  }

  /**
   * Generate property name
   * @private
   */
  _generatePropertyName(colorGroup) {
    const names = {
      brown: ['Brown Street', 'Oak Avenue', 'Elm Lane'],
      lightBlue: ['Light Blue Boulevard', 'Sky Place', 'Cloud Way'],
      pink: ['Pink Palace', 'Rose Road', 'Magenta Lane'],
      orange: ['Orange Avenue', 'Sunset Street', 'Citrus Lane'],
      red: ['Red Square', 'Crimson Court', 'Ruby Road'],
      yellow: ['Yellow Way', 'Gold Avenue', 'Amber Alley'],
      green: ['Green Garden', 'Emerald Street', 'Forest Lane'],
      darkBlue: ['Dark Blue Drive', 'Navy Place', 'Indigo Island'],
    };

    const options = names[colorGroup] || ['Unknown Street'];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Simple random number generator
   * @private
   */
  rng() {
    return Math.random();
  }

  /**
   * Get random number in range
   * @private
   */
  _randomInRange(min, max) {
    return min + this.rng() * (max - min);
  }

  /**
   * Get balance statistics
   * @returns {object} Balance statistics
   */
  getStats() {
    const properties = this.statHistory.filter(s => s.type === 'property');
    if (properties.length === 0) {
      return { count: 0, averageBalanceScore: 0 };
    }

    const avgScore = properties.reduce((sum, p) => sum + (p.data.balanceScore || 0), 0) / properties.length;

    return {
      count: properties.length,
      averageBalanceScore: Math.round(avgScore * 100) / 100,
      byColorGroup: this._groupByColor(properties),
    };
  }

  /**
   * Group properties by color
   * @private
   */
  _groupByColor(properties) {
    const groups = {};
    for (const p of properties) {
      const color = p.data.colorGroup;
      if (!groups[color]) groups[color] = [];
      groups[color].push(p.data);
    }
    return groups;
  }

  /**
   * Clear statistics
   */
  clearStats() {
    this.statHistory = [];
  }
}