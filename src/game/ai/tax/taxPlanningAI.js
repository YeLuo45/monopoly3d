/**
 * Tax Planning AI
 * 
 * AI system for tax optimization and strategic tax planning in monopoly games.
 * Uses memory layer for learning from past decisions and tax outcomes.
 */

class TaxPlanningAI {
  /**
   * @param {Object} memoryLayer - Memory layer for learning and pattern recognition
   */
  constructor(memoryLayer = null) {
    this.memoryLayer = memoryLayer;
    
    // Tax planning parameters
    this.prepayThreshold = 0.05; // Prepay if discount > 5%
    this.earlyPaymentDiscount = 0.10; // 10% discount for early payment
    this.latePaymentPenalty = 0.05; // 5% penalty for late payment
    
    // ROI thresholds
    this.minimumPostTaxROI = 0.08; // Minimum 8% ROI after taxes
    this.goodPostTaxROI = 0.12; // Good 12% ROI after taxes
    
    // Asset protection settings
    this.protectionStrategies = [
      { name: 'HOMESTEAD_EXEMPTION', description: 'Protect primary residence from tax claims' },
      { name: 'BUSINESS_STRUCTURE', description: 'Use business entity for asset protection' },
      { name: 'INSURANCE_COVERAGE', description: 'Transfer risk through insurance' },
      { name: 'LEGAL_ENTITY', description: 'Create separate legal entities for different assets' },
      { name: 'INVESTMENT_TAX_LOSS', description: 'Offset gains with tax losses' }
    ];
  }

  /**
   * Get comprehensive tax optimization plan for a player
   * @param {string} playerId - Player identifier
   * @param {Object} gameState - Current game state
   * @returns {Object} Tax optimization plan with strategies and recommendations
   */
  getTaxOptimizationPlan(playerId, gameState) {
    if (!playerId || !gameState) {
      throw new Error('Player ID and game state are required');
    }
    
    const player = this.findPlayer(playerId, gameState);
    if (!player) {
      throw new Error(`Player not found: ${playerId}`);
    }
    
    const plan = {
      playerId,
      currentTurn: gameState.turn,
      strategies: [],
      recommendations: [],
      expectedSavings: 0,
      riskLevel: 'LOW'
    };
    
    // Analyze current tax situation
    const currentTaxBurden = this.estimateTaxImpact(playerId, gameState);
    plan.currentTaxBurden = currentTaxBurden;
    
    // Get property-specific optimizations
    const propertyStrategies = this.getPropertyStrategies(player, gameState);
    plan.strategies.push(...propertyStrategies);
    
    // Get income tax optimizations
    const incomeStrategies = this.getIncomeStrategies(player, gameState);
    plan.strategies.push(...incomeStrategies);
    
    // Get timing optimizations
    const timingStrategies = this.getTimingStrategies(player, gameState);
    plan.strategies.push(...timingStrategies);
    
    // Calculate expected total savings
    plan.expectedSavings = this.calculateExpectedSavings(plan.strategies);
    
    // Generate actionable recommendations
    plan.recommendations = this.generateRecommendations(plan.strategies, player, gameState);
    
    // Assess overall risk level
    plan.riskLevel = this.assessPlanRisk(plan.strategies);
    
    return plan;
  }

  /**
   * Determine if a player should prepay property tax early
   * @param {string} propertyId - Property identifier
   * @param {Object} gameState - Current game state
   * @returns {Object} Decision {shouldPrepay, discount, reason}
   */
  shouldPrepayTax(propertyId, gameState) {
    if (!propertyId || !gameState) {
      throw new Error('Property ID and game state are required');
    }
    
    const property = this.findProperty(propertyId, gameState);
    if (!property) {
      throw new Error(`Property not found: ${propertyId}`);
    }
    
    // Get annual tax for property
    const annualTax = this.estimatePropertyTax(propertyId, gameState);
    
    if (annualTax === 0) {
      return {
        shouldPrepay: false,
        discount: 0,
        reason: 'Property is tax exempt'
      };
    }
    
    // Calculate early payment benefit
    const discountAmount = annualTax * this.earlyPaymentDiscount;
    const prepaymentBenefit = discountAmount;
    
    // Check if player has enough cash
    const player = this.findPlayer(property.ownerId, gameState);
    const hasSufficientCash = player && player.cash >= annualTax;
    
    // Decision logic
    const shouldPrepay = hasSufficientCash && discountAmount >= this.prepayThreshold * annualTax;
    
    return {
      shouldPrepay,
      discount: discountAmount,
      reason: shouldPrepay 
        ? `Early payment saves $${discountAmount.toFixed(2)} (${this.earlyPaymentDiscount * 100}%)`
        : `Cash insufficient or discount too small ($${discountAmount.toFixed(2)})`
    };
  }

  /**
   * Estimate total tax impact for a player
   * @param {string} playerId - Player identifier
   * @param {Object} gameState - Current game state
   * @returns {Object} Tax impact breakdown {propertyTax, incomeTax, capitalGains, total}
   */
  estimateTaxImpact(playerId, gameState) {
    if (!playerId || !gameState) {
      throw new Error('Player ID and game state are required');
    }
    
    const player = this.findPlayer(playerId, gameState);
    if (!player) {
      throw new Error(`Player not found: ${playerId}`);
    }
    
    // Calculate property taxes
    let propertyTax = 0;
    if (player.properties) {
      for (const propId of player.properties) {
        propertyTax += this.estimatePropertyTax(propId, gameState);
      }
    }
    
    // Calculate income tax
    const incomeTax = this.estimateIncomeTax(playerId, gameState);
    
    // Calculate potential capital gains
    let capitalGains = 0;
    if (player.propertiesSold) {
      for (const sale of player.propertiesSold) {
        capitalGains += this.calculateCapitalGain(sale.salePrice, sale.purchasePrice);
      }
    }
    
    const total = propertyTax + incomeTax + capitalGains;
    
    return {
      propertyTax,
      incomeTax,
      capitalGains,
      total,
      effectiveRate: total / (this.getTotalIncome(player) || 1)
    };
  }

  /**
   * Calculate post-tax ROI for a property
   * @param {string} propertyId - Property identifier
   * @param {Object} gameState - Current game state
   * @returns {Object} ROI analysis {grossROI, netROI, taxImpact, recommendation}
   */
  getPostTaxROI(propertyId, gameState) {
    if (!propertyId || !gameState) {
      throw new Error('Property ID and game state are required');
    }
    
    const property = this.findProperty(propertyId, gameState);
    if (!property) {
      throw new Error(`Property not found: ${propertyId}`);
    }
    
    // Get property financials
    const purchasePrice = property.purchasePrice || property.value || 0;
    const annualRent = property.rent || 0;
    const annualTax = this.estimatePropertyTax(propertyId, gameState);
    
    // Calculate gross ROI (before tax)
    const grossROI = purchasePrice > 0 ? annualRent / purchasePrice : 0;
    
    // Calculate net ROI (after tax)
    const netCashFlow = annualRent - annualTax;
    const netROI = purchasePrice > 0 ? netCashFlow / purchasePrice : 0;
    
    // Determine tax impact
    const taxImpact = annualTax;
    const taxRate = annualRent > 0 ? annualTax / annualRent : 0;
    
    // Generate recommendation
    let recommendation = 'HOLD';
    if (netROI < this.minimumPostTaxROI) {
      recommendation = 'CONSIDER_SELLING';
    } else if (netROI >= this.goodPostTaxROI) {
      recommendation = 'STRONG_BUY';
    }
    
    return {
      propertyId,
      purchasePrice,
      annualRent,
      taxImpact,
      grossROI,
      netROI,
      taxRate,
      recommendation
    };
  }

  /**
   * Get asset protection strategies for a player
   * @param {string} playerId - Player identifier
   * @returns {Array} Available protection strategies
   */
  getAssetProtectionStrategies(playerId) {
    if (!playerId) {
      throw new Error('Player ID is required');
    }
    
    const strategies = [...this.protectionStrategies];
    
    // Add dynamic strategies based on player profile
    // This would use memory layer in production
    const appliedStrategies = strategies.map(strategy => ({
      ...strategy,
      applicable: true,
      priority: this.getStrategyPriority(strategy.name, playerId)
    }));
    
    // Sort by priority
    appliedStrategies.sort((a, b) => b.priority - a.priority);
    
    return appliedStrategies;
  }

  /**
   * Suggest optimal ownership structuring
   * @param {string} playerId - Player identifier
   * @param {Object} gameState - Current game state
   * @returns {Object} Structuring suggestion {type, rationale, benefits}
   */
  suggestStructuring(playerId, gameState) {
    if (!playerId || !gameState) {
      throw new Error('Player ID and game state are required');
    }
    
    const player = this.findPlayer(playerId, gameState);
    if (!player) {
      throw new Error(`Player not found: ${playerId}`);
    }
    
    // Analyze portfolio
    const portfolioValue = this.getPortfolioValue(player, gameState);
    const propertyCount = player.properties?.length || 0;
    
    // Determine optimal structure
    let suggestedType = 'INDIVIDUAL';
    let rationale = 'Simple individual ownership';
    let benefits = ['Easy to manage', 'No additional costs'];
    
    if (portfolioValue > 50000) {
      suggestedType = 'PARTNERSHIP';
      rationale = 'Large portfolio benefits from partnership structure';
      benefits = ['Liability protection', 'Tax advantages', 'Easier transfer'];
    }
    
    if (propertyCount > 5) {
      suggestedType = 'CORPORATION';
      rationale = 'Multiple properties benefit from corporate structure';
      benefits = ['Asset protection', 'Pass-through taxation', 'Creditor protection'];
    }
    
    return {
      playerId,
      currentStructure: player.ownershipStructure || 'INDIVIDUAL',
      suggestedType,
      rationale,
      benefits,
      estimatedSavings: this.estimateStructuringSavings(suggestedType, player, gameState)
    };
  }

  // === Helper Methods ===

  /**
   * Estimate property tax for a property
   */
  estimatePropertyTax(propertyId, gameState) {
    const property = this.findProperty(propertyId, gameState);
    if (!property) return 0;
    
    // Check for exemption
    const isExempt = property.taxExempt || property.exemptFromTax;
    if (isExempt) return 0;
    
    const value = property.currentValue || property.purchasePrice || 0;
    const taxRate = gameState.taxRates?.propertyTaxRate || 0.015;
    
    return value * taxRate;
  }

  /**
   * Estimate income tax for a player
   */
  estimateIncomeTax(playerId, gameState) {
    const player = this.findPlayer(playerId, gameState);
    if (!player) return 0;
    
    const income = this.getTotalIncome(player);
    const taxableIncome = Math.max(0, income - 2000); // Standard deduction
    const bracket = this.getTaxBracket(taxableIncome);
    
    return taxableIncome * bracket.rate;
  }

  /**
   * Calculate capital gain
   */
  calculateCapitalGain(salePrice, purchasePrice) {
    const gain = salePrice - purchasePrice;
    return gain > 0 ? gain * 0.15 : 0; // 15% rate
  }

  /**
   * Get player total income
   */
  getTotalIncome(player) {
    return (player.rentCollected || 0) +
           (player.baseIncome || 0) +
           (player.dividends || 0) +
           (player.propertiesSoldValue || 0);
  }

  /**
   * Get tax bracket based on income
   */
  getTaxBracket(income) {
    if (income < 5000) return { rate: 0.10 };
    if (income < 20000) return { rate: 0.15 };
    if (income < 50000) return { rate: 0.20 };
    if (income < 100000) return { rate: 0.25 };
    return { rate: 0.30 };
  }

  /**
   * Get property strategies
   */
  getPropertyStrategies(player, gameState) {
    const strategies = [];
    
    if (!player.properties || player.properties.length === 0) {
      return strategies;
    }
    
    for (const propId of player.properties) {
      const roi = this.getPostTaxROI(propId, gameState);
      
      if (roi.netROI < this.minimumPostTaxROI) {
        strategies.push({
          type: 'PROPERTY_TAX_LOSS',
          propertyId: propId,
          action: 'Consider selling',
          reason: `Low post-tax ROI: ${(roi.netROI * 100).toFixed(1)}%`,
          potentialSavings: 0
        });
      }
      
      // Check for prepayment benefit
      const prepayDecision = this.shouldPrepayTax(propId, gameState);
      if (prepayDecision.shouldPrepay) {
        strategies.push({
          type: 'EARLY_TAX_PAYMENT',
          propertyId: propId,
          action: 'Prepay property tax',
          reason: prepayDecision.reason,
          potentialSavings: prepayDecision.discount
        });
      }
    }
    
    return strategies;
  }

  /**
   * Get income tax strategies
   */
  getIncomeStrategies(player, gameState) {
    const strategies = [];
    
    const income = this.getTotalIncome(player);
    
    // Suggest tax loss harvesting if player has losses
    if (player.taxLosses && player.taxLosses > 0) {
      strategies.push({
        type: 'TAX_LOSS_HARVESTING',
        action: 'Harvest tax losses',
        reason: `Offset gains with $${player.taxLosses} in losses`,
        potentialSavings: player.taxLosses * 0.15
      });
    }
    
    // Suggest retirement contributions if available
    if (gameState.retirementContributions) {
      strategies.push({
        type: 'RETIREMENT_CONTRIBUTION',
        action: 'Maximize retirement contributions',
        reason: 'Reduces taxable income',
        potentialSavings: gameState.retirementContributions * 0.25
      });
    }
    
    return strategies;
  }

  /**
   * Get timing strategies
   */
  getTimingStrategies(player, gameState) {
    const strategies = [];
    
    // Suggest deferring income if near year end
    const currentTurn = gameState.turn || 1;
    const turnsUntilYearEnd = 40 - (currentTurn % 40);
    
    if (turnsUntilYearEnd <= 5 && turnsUntilYearEnd > 0) {
      strategies.push({
        type: 'INCOME_DEFERRED',
        action: 'Defer income to next year',
        reason: `${turnsUntilYearEnd} turns until year end`,
        potentialSavings: 'Varies'
      });
    }
    
    return strategies;
  }

  /**
   * Calculate expected savings from strategies
   */
  calculateExpectedSavings(strategies) {
    return strategies.reduce((sum, s) => {
      return sum + (typeof s.potentialSavings === 'number' ? s.potentialSavings : 0);
    }, 0);
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(strategies, player, gameState) {
    return strategies
      .filter(s => s.potentialSavings > 0 || s.type === 'PROPERTY_TAX_LOSS')
      .map(s => ({
        action: s.action,
        reason: s.reason,
        priority: s.potentialSavings > 100 ? 'HIGH' : 'MEDIUM'
      }));
  }

  /**
   * Assess risk level of the plan
   */
  assessPlanRisk(strategies) {
    const highRiskTypes = ['AGGRESSIVE_DEDUCTIONS', 'UNDOCUMENTED_CLAIMS'];
    const hasHighRisk = strategies.some(s => highRiskTypes.includes(s.type));
    
    if (hasHighRisk) return 'HIGH';
    
    const mediumRiskTypes = ['INCOME_DEFERRED', 'COMPLEX_STRUCTURE'];
    const hasMediumRisk = strategies.some(s => mediumRiskTypes.includes(s.type));
    
    if (hasMediumRisk) return 'MEDIUM';
    
    return 'LOW';
  }

  /**
   * Get strategy priority
   */
  getStrategyPriority(strategyName, playerId) {
    const priorities = {
      'INVESTMENT_TAX_LOSS': 10,
      'HOMESTEAD_EXEMPTION': 8,
      'INSURANCE_COVERAGE': 7,
      'BUSINESS_STRUCTURE': 5,
      'LEGAL_ENTITY': 3
    };
    
    return priorities[strategyName] || 5;
  }

  /**
   * Get portfolio value
   */
  getPortfolioValue(player, gameState) {
    if (!player.properties || player.properties.length === 0) {
      return 0;
    }
    
    return player.properties.reduce((sum, propId) => {
      const property = this.findProperty(propId, gameState);
      return sum + (property?.currentValue || property?.value || 0);
    }, 0);
  }

  /**
   * Estimate structuring savings
   */
  estimateStructuringSavings(structureType, player, gameState) {
    const baseSavings = {
      'INDIVIDUAL': 0,
      'PARTNERSHIP': 2000,
      'CORPORATION': 5000
    };
    
    return baseSavings[structureType] || 0;
  }

  /**
   * Find property by ID
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
   * Find player by ID
   */
  findPlayer(playerId, gameState) {
    if (gameState.players) {
      return gameState.players.find(p => p.id === playerId) || null;
    }
    return gameState[playerId] || null;
  }
}

export { TaxPlanningAI };