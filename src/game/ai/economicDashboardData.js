/**
 * EconomicDashboardData - Generate dashboard data for UI
 * 
 * Provides comprehensive financial metrics, risk assessments,
 * and actionable recommendations for the economic AI system.
 */

export class EconomicDashboardData {
  constructor() {
    // Score weights for financial health
    this.healthWeights = {
      liquidity: 0.25,
      profitability: 0.30,
      stability: 0.25,
      growth: 0.20,
    };

    // Risk thresholds
    this.riskThresholds = {
      cashReserve: { low: 500, critical: 100 },
      debtToIncome: { low: 0.3, critical: 0.5 },
      propertyConcentration: { low: 0.4, critical: 0.6 },
    };

    // Dashboard refresh interval
    this.lastUpdate = null;
    this.cacheDuration = 1000; // 1 second cache
  }

  /**
   * Get all dashboard data for a player
   * @param {string} playerId - Player ID
   * @param {Object} gameState - Current game state
   * @returns {Object} Complete dashboard data
   */
  getDashboardData(playerId, gameState) {
    // Check cache
    if (this._isCacheValid()) {
      return this._cachedDashboard;
    }

    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return this._createEmptyDashboard(playerId);
    }

    const dashboard = {
      playerId,
      timestamp: Date.now(),

      // Core financial metrics
      financialHealth: this.getFinancialHealthScore(playerId, gameState),
      investmentScore: this.getInvestmentScore(playerId, gameState),
      riskScore: this.getRiskScore(playerId, gameState),

      // Detailed breakdowns
      liquidity: this._calculateLiquidity(player, gameState),
      profitability: this._calculateProfitability(player, gameState),
      stability: this._calculateStability(player, gameState),
      growth: this._calculateGrowth(player, gameState),

      // Alerts and warnings
      alerts: this.getAlerts(playerId, gameState),

      // Actionable recommendations
      recommendations: this.getRecommendations(playerId, gameState),

      // Property portfolio summary
      portfolio: this._getPortfolioSummary(player, gameState),

      // Cash flow analysis
      cashFlow: this._analyzeCashFlow(player, gameState),

      // Debt analysis
      debt: this._analyzeDebt(player, gameState),
    };

    this._cachedDashboard = dashboard;
    this.lastUpdate = Date.now();

    return dashboard;
  }

  /**
   * Get financial health score (0-100)
   * @param {string} playerId - Player ID
   * @param {Object} gameState - Current game state
   * @returns {Object} { score, grade, factors }
   */
  getFinancialHealthScore(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return { score: 0, grade: 'F', factors: {} };

    const liquidity = this._calculateLiquidity(player, gameState);
    const profitability = this._calculateProfitability(player, gameState);
    const stability = this._calculateStability(player, gameState);
    const growth = this._calculateGrowth(player, gameState);

    // Weighted score
    const score = Math.round(
      liquidity.score * this.healthWeights.liquidity +
      profitability.score * this.healthWeights.profitability +
      stability.score * this.healthWeights.stability +
      growth.score * this.healthWeights.growth
    );

    // Determine grade
    let grade;
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return {
      score,
      grade,
      factors: { liquidity, profitability, stability, growth },
    };
  }

  /**
   * Get investment score (0-100)
   * @param {string} playerId - Player ID
   * @param {Object} gameState - Current game state
   * @returns {Object} { score, quality, recommendations }
   */
  getInvestmentScore(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return { score: 0, quality: 'poor', recommendations: [] };

    const properties = player.properties || [];
    const money = player.money || 0;

    // Calculate investment quality
    let score = 50;
    const factors = [];

    // Property count factor
    if (properties.length > 0) {
      score += Math.min(20, properties.length * 3);
      factors.push({ factor: 'property_count', value: properties.length });
    }

    // Cash reserves factor
    if (money >= 1000) {
      score += 15;
    } else if (money >= 500) {
      score += 10;
    } else if (money < 100) {
      score -= 20;
    }
    factors.push({ factor: 'cash_reserves', value: money });

    // Monopoly bonus factor
    const monopolies = this._countMonopolies(player, gameState);
    score += monopolies * 10;
    factors.push({ factor: 'monopolies', value: monopolies });

    // Diversification factor (penalize concentration)
    const concentration = this._calculateConcentration(player, gameState);
    score -= concentration * 15;
    factors.push({ factor: 'concentration_risk', value: concentration });

    // Determine quality
    let quality;
    if (score >= 80) quality = 'excellent';
    else if (score >= 60) quality = 'good';
    else if (score >= 40) quality = 'fair';
    else quality = 'poor';

    return {
      score: Math.max(0, Math.min(100, score)),
      quality,
      factors,
      propertyCount: properties.length,
      monopolyCount: monopolies,
    };
  }

  /**
   * Get risk exposure score (0-100, lower is better)
   * @param {string} playerId - Player ID
   * @param {Object} gameState - Current game state
   * @returns {Object} { score, level, factors }
   */
  getRiskScore(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return { score: 100, level: 'critical', factors: [] };

    const factors = [];
    let riskScore = 30; // Base risk

    // Cash reserve risk
    const money = player.money || 0;
    if (money < this.riskThresholds.cashReserve.critical) {
      riskScore += 30;
      factors.push({ factor: 'low_cash', value: money, severity: 'critical' });
    } else if (money < this.riskThresholds.cashReserve.low) {
      riskScore += 15;
      factors.push({ factor: 'low_cash', value: money, severity: 'warning' });
    }

    // Debt risk
    const debt = player.debt || 0;
    const netWorth = this._estimateNetWorth(player, gameState);
    const debtToWorth = netWorth > 0 ? debt / netWorth : 0;

    if (debtToWorth > this.riskThresholds.debtToIncome.critical) {
      riskScore += 25;
      factors.push({ factor: 'high_debt', value: debtToWorth, severity: 'critical' });
    } else if (debtToWorth > this.riskThresholds.debtToIncome.low) {
      riskScore += 10;
      factors.push({ factor: 'high_debt', value: debtToWorth, severity: 'warning' });
    }

    // Concentration risk
    const concentration = this._calculateConcentration(player, gameState);
    if (concentration > this.riskThresholds.propertyConcentration.critical) {
      riskScore += 20;
      factors.push({ factor: 'concentration', value: concentration, severity: 'critical' });
    } else if (concentration > this.riskThresholds.propertyConcentration.low) {
      riskScore += 10;
      factors.push({ factor: 'concentration', value: concentration, severity: 'warning' });
    }

    // Liquidity risk (unimproved properties)
    const unimprovedCount = (player.properties || []).filter(p => !p.houses).length;
    const liquidityRisk = unimprovedCount * 2;
    riskScore += Math.min(15, liquidityRisk);
    factors.push({ factor: 'illiquid_properties', value: unimprovedCount });

    // Determine risk level
    let level;
    if (riskScore >= 70) level = 'critical';
    else if (riskScore >= 50) level = 'high';
    else if (riskScore >= 30) level = 'medium';
    else level = 'low';

    return {
      score: Math.max(0, Math.min(100, riskScore)),
      level,
      factors,
    };
  }

  /**
   * Get important alerts for the player
   * @param {string} playerId - Player ID
   * @param {Object} gameState - Current game state
   * @returns {Array} Array of alert objects
   */
  getAlerts(playerId, gameState) {
    const alerts = [];
    const player = this._getPlayer(playerId, gameState);

    if (!player) return alerts;

    // Critical cash warning
    if (player.money < this.riskThresholds.cashReserve.critical) {
      alerts.push({
        type: 'critical',
        category: 'liquidity',
        title: 'Critical Cash Low',
        message: `Only $${player.money} remaining - sell properties or take loan immediately`,
        action: 'sell_property',
      });
    }

    // High debt warning
    const debt = player.debt || 0;
    if (debt > 0) {
      const netWorth = this._estimateNetWorth(player, gameState);
      const ratio = netWorth > 0 ? debt / netWorth : 0;
      if (ratio > 0.5) {
        alerts.push({
          type: 'warning',
          category: 'debt',
          title: 'High Debt Level',
          message: `Debt represents ${(ratio * 100).toFixed(0)}% of net worth`,
          action: 'pay_debt',
        });
      }
    }

    // Opportunity alerts
    const turn = gameState.turn || 0;
    if (turn > 5 && turn < 15) {
      const availableMonopolies = this._findAvailableMonopolies(player, gameState);
      if (availableMonopolies.length > 0) {
        alerts.push({
          type: 'opportunity',
          category: 'investment',
          title: 'Monopoly Opportunity',
          message: `${availableMonopolies.length} properties available to complete monopolies`,
          action: 'buy_property',
          targets: availableMonopolies,
        });
      }
    }

    // Rent vulnerability
    const rentExposure = this._calculateRentExposure(player, gameState);
    if (rentExposure > 200) {
      alerts.push({
        type: 'warning',
        category: 'risk',
        title: 'High Rent Exposure',
        message: `Could pay up to $${rentExposure} in rent on a single turn`,
        action: 'build_houses',
      });
    }

    return alerts;
  }

  /**
   * Get action recommendations for the player
   * @param {string} playerId - Player ID
   * @param {Object} gameState - Current game state
   * @returns {Array} Array of recommendation objects
   */
  getRecommendations(playerId, gameState) {
    const recommendations = [];
    const player = this._getPlayer(playerId, gameState);

    if (!player) return recommendations;

    // Low cash recommendations
    if (player.money < 500) {
      recommendations.push({
        priority: 1,
        action: 'sell_property',
        title: 'Increase Cash Reserves',
        reasoning: 'Cash is critically low - consider selling properties or taking a loan',
        potentialGain: Math.min(500, player.money * 2),
      });
    }

    // Investment opportunities
    const turn = gameState.turn || 0;
    if (turn < 10 && player.money >= 200) {
      const undervalued = this._findUndervaluedProperties(player, gameState);
      if (undervalued.length > 0) {
        recommendations.push({
          priority: 2,
          action: 'buy',
          title: 'Early Game Investment',
          reasoning: 'Properties available at good prices',
          targets: undervalued.slice(0, 3),
        });
      }
    }

    // Debt management
    if ((player.debt || 0) > 0) {
      recommendations.push({
        priority: 3,
        action: 'pay_debt',
        title: 'Reduce Debt Burden',
        reasoning: 'Lower debt improves financial health score',
        potentialSavings: Math.round(player.debt * 0.1),
      });
    }

    // House building
    const monopolies = this._getMonopolyGroups(player, gameState);
    if (monopolies.length > 0) {
      recommendations.push({
        priority: 2,
        action: 'build_houses',
        title: 'Maximize Monopoly Returns',
        reasoning: `Build houses on ${monopolies.length} monopoly(ies) to increase rent`,
        targets: monopolies,
      });
    }

    // Diversification
    const concentration = this._calculateConcentration(player, gameState);
    if (concentration > 0.5) {
      recommendations.push({
        priority: 4,
        action: 'diversify',
        title: 'Diversify Portfolio',
        reasoning: 'Reduce concentration in single color group',
        diversificationScore: 1 - concentration,
      });
    }

    // Sort by priority
    recommendations.sort((a, b) => a.priority - b.priority);

    return recommendations;
  }

  // Private calculation methods

  /**
   * Calculate liquidity score
   * @private
   */
  _calculateLiquidity(player, gameState) {
    const money = player.money || 0;
    const turn = gameState.turn || 0;
    const expectedExpenses = this._estimateExpenses(player, gameState);

    let score = 50;
    if (money >= expectedExpenses * 3) score += 30;
    else if (money >= expectedExpenses * 2) score += 20;
    else if (money < expectedExpenses) score -= 20;

    return {
      score: Math.max(0, Math.min(100, score)),
      cash: money,
      runway: expectedExpenses > 0 ? Math.floor(money / expectedExpenses) : 99,
    };
  }

  /**
   * Calculate profitability score
   * @private
   */
  _calculateProfitability(player, gameState) {
    const properties = player.properties || [];
    const money = player.money || 0;

    // Estimate rent income
    let totalRent = 0;
    for (const prop of properties) {
      totalRent += prop.rent || prop.baseRent || 10;
    }

    let score = 50;
    if (totalRent > 100) score += 25;
    else if (totalRent > 50) score += 15;
    else if (totalRent === 0 && properties.length > 0) score -= 10;

    // Money buffer factor
    if (money > 2000) score += 15;
    else if (money < 200) score -= 20;

    return {
      score: Math.max(0, Math.min(100, score)),
      rentIncome: totalRent,
      cashBuffer: money,
    };
  }

  /**
   * Calculate stability score
   * @private
   */
  _calculateStability(player, gameState) {
    const debt = player.debt || 0;
    const money = player.money || 0;
    const netWorth = this._estimateNetWorth(player, gameState);

    let score = 60;
    const debtRatio = netWorth > 0 ? debt / netWorth : 0;

    if (debtRatio < 0.2) score += 20;
    else if (debtRatio > 0.5) score -= 25;

    if (money > 1000) score += 10;
    else if (money < 200) score -= 15;

    return {
      score: Math.max(0, Math.min(100, score)),
      debtRatio,
      debt: debt,
    };
  }

  /**
   * Calculate growth score
   * @private
   */
  _calculateGrowth(player, gameState) {
    const properties = player.properties || [];
    const turn = gameState.turn || 0;

    let score = 50;

    // Property growth
    const expectedProps = turn * 0.5;
    if (properties.length > expectedProps) score += 20;
    else if (properties.length < expectedProps * 0.5) score -= 15;

    // Monopoly growth
    const monopolies = this._countMonopolies(player, gameState);
    score += monopolies * 8;

    // House development
    const totalHouses = properties.reduce((sum, p) => sum + (p.houses || 0), 0);
    score += Math.min(10, totalHouses * 2);

    return {
      score: Math.max(0, Math.min(100, score)),
      propertyGrowth: properties.length - expectedProps,
      monopolies,
      houses: totalHouses,
    };
  }

  /**
   * Get player by ID
   * @private
   */
  _getPlayer(playerId, gameState) {
    const players = gameState.players || [];
    if (Array.isArray(players)) {
      return players.find(p => p.id === playerId);
    }
    return players[playerId];
  }

  /**
   * Estimate net worth
   * @private
   */
  _estimateNetWorth(player, gameState) {
    const cash = player.money || 0;
    const propertyValue = (player.properties || []).reduce(
      (sum, p) => sum + (p.value || p.price || 0), 0
    );
    return cash + propertyValue;
  }

  /**
   * Estimate expenses
   * @private
   */
  _estimateExpenses(player, gameState) {
    const properties = player.properties || [];
    const mortgagePayments = properties.length * 10;
    return 50 + mortgagePayments;
  }

  /**
   * Calculate property concentration
   * @private
   */
  _calculateConcentration(player, gameState) {
    const properties = player.properties || [];
    if (properties.length === 0) return 0;

    const colorGroups = {};
    for (const prop of properties) {
      const color = prop.colorGroup || 'none';
      colorGroups[color] = (colorGroups[color] || 0) + 1;
    }

    const maxCount = Math.max(...Object.values(colorGroups));
    return maxCount / properties.length;
  }

  /**
   * Count monopolies
   * @private
   */
  _countMonopolies(player, gameState) {
    return this._getMonopolyGroups(player, gameState).length;
  }

  /**
   * Get monopoly groups
   * @private
   */
  _getMonopolyGroups(player, gameState) {
    const properties = player.properties || [];
    const monopolies = [];

    const colorGroups = {
      brown: 2, light_blue: 3, pink: 3, orange: 3,
      red: 3, yellow: 3, green: 3, dark_blue: 2,
    };

    for (const [color, count] of Object.entries(colorGroups)) {
      const owned = properties.filter(p => p.colorGroup === color).length;
      if (owned === count) {
        monopolies.push(color);
      }
    }

    return monopolies;
  }

  /**
   * Find available monopolies
   * @private
   */
  _findAvailableMonopolies(player, gameState) {
    // Placeholder - would check game state for available properties
    return [];
  }

  /**
   * Find undervalued properties
   * @private
   */
  _findUndervaluedProperties(player, gameState) {
    // Placeholder - would analyze market for deals
    return [];
  }

  /**
   * Calculate rent exposure
   * @private
   */
  _calculateRentExposure(player, gameState) {
    const properties = player.properties || [];
    return properties.reduce((sum, p) => sum + (p.rent || 0) * 4, 0);
  }

  /**
   * Get portfolio summary
   * @private
   */
  _getPortfolioSummary(player, gameState) {
    const properties = player.properties || [];
    return {
      totalProperties: properties.length,
      totalValue: properties.reduce((sum, p) => sum + (p.value || p.price || 0), 0),
      monopolies: this._countMonopolies(player, gameState),
      totalHouses: properties.reduce((sum, p) => sum + (p.houses || 0), 0),
    };
  }

  /**
   * Analyze cash flow
   * @private
   */
  _analyzeCashFlow(player, gameState) {
    return {
      income: player.monthlyIncome || 100,
      expenses: this._estimateExpenses(player, gameState),
      net: (player.monthlyIncome || 100) - this._estimateExpenses(player, gameState),
    };
  }

  /**
   * Analyze debt
   * @private
   */
  _analyzeDebt(player, gameState) {
    return {
      total: player.debt || 0,
      paymentsRemaining: player.loanPayments || 0,
      interestRate: player.avgInterestRate || 0.06,
    };
  }

  /**
   * Check if cache is valid
   * @private
   */
  _isCacheValid() {
    if (!this.lastUpdate) return false;
    return Date.now() - this.lastUpdate < this.cacheDuration;
  }

  /**
   * Create empty dashboard
   * @private
   */
  _createEmptyDashboard(playerId) {
    return {
      playerId,
      timestamp: Date.now(),
      financialHealth: { score: 0, grade: 'F', factors: {} },
      investmentScore: { score: 0, quality: 'poor', recommendations: [] },
      riskScore: { score: 100, level: 'critical', factors: [] },
      alerts: [],
      recommendations: [],
      portfolio: { totalProperties: 0, totalValue: 0, monopolies: 0, totalHouses: 0 },
      cashFlow: { income: 0, expenses: 0, net: 0 },
      debt: { total: 0, paymentsRemaining: 0, interestRate: 0 },
    };
  }
}
