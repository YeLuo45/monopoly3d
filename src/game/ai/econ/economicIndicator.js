/**
 * EconomicIndicator - Track Economic Health
 * 
 * Calculates economic indicators for game state analysis,
 * including GDP growth, inflation, employment, and recession risk.
 */

export class EconomicIndicator {
  constructor() {
    // Historical tracking
    this.history = [];
    this.maxHistorySize = 20;
    
    // Thresholds for economic analysis
    this.recessionThreshold = 0.3;
    this.inflationThreshold = 0.15;
    this.bearMarketThreshold = 0.2;
  }

  /**
   * Calculate GDP growth rate based on game state
   * @param {object} gameState - Current game state
   * @returns {number} GDP growth rate as decimal
   */
  calculateGDPGrowth(gameState) {
    const players = gameState.players || [];
    const turn = gameState.turn || 1;
    
    if (players.length === 0) return 0;
    
    // Calculate total economic activity
    let totalMoney = 0;
    let totalPropertyValue = 0;
    let totalRentCollected = 0;
    
    for (const player of players) {
      totalMoney += player.money || 0;
      
      const properties = player.properties || [];
      for (const prop of properties) {
        totalPropertyValue += prop.price || 0;
        totalRentCollected += prop.rent || 0;
      }
    }
    
    // GDP proxy: money velocity + property appreciation + rent
    // Normalize by number of players
    const gdpPerPlayer = (totalMoney + totalPropertyValue * 0.5 + totalRentCollected * 10) / players.length;
    
    // Add to history for growth calculation
    const currentGDP = {
      turn,
      value: gdpPerPlayer,
      timestamp: Date.now(),
    };
    
    this._addToHistory(currentGDP);
    
    // Calculate growth rate from history
    if (this.history.length < 2) return 0.02; // Default modest growth
    
    const previousGDP = this.history[this.history.length - 2];
    if (!previousGDP || previousGDP.value === 0) return 0.02;
    
    const growthRate = (currentGDP.value - previousGDP.value) / previousGDP.value;
    
    // Clamp to reasonable bounds (-30% to +50%)
    return Math.max(-0.3, Math.min(0.5, growthRate));
  }

  /**
   * Get inflation pressure indicator
   * @param {object} gameState - Current game state
   * @returns {number} Inflation pressure (0-1 scale)
   */
  getInflationPressure(gameState) {
    const players = gameState.players || [];
    const turn = gameState.turn || 1;
    
    if (players.length === 0) return 0;
    
    // Calculate money supply vs goods supply
    let totalMoney = 0;
    let totalProperties = 0;
    
    for (const player of players) {
      totalMoney += player.money || 0;
      totalProperties += (player.properties || []).length;
    }
    
    // Inflation pressure = money per property ratio
    const moneyPerProperty = totalProperties > 0 ? totalMoney / totalProperties : totalMoney / 10;
    
    // Game progression factor (more money in system as game progresses)
    const progressionFactor = Math.min(turn / 30, 1.5);
    
    // Normalize to 0-1 scale
    let pressure = (moneyPerProperty / 200) * progressionFactor;
    
    // Add pressure from rapid money generation (rent accumulation)
    const rentPressure = this._calculateRentPressure(gameState);
    pressure = pressure * 0.7 + rentPressure * 0.3;
    
    return Math.max(0, Math.min(1, pressure));
  }

  /**
   * Get employment rate as economic health indicator
   * @param {object} gameState - Current game state
   * @returns {number} Employment rate (0-1 scale)
   */
  getEmploymentRate(gameState) {
    const players = gameState.players || [];
    const tiles = gameState.tiles || [];
    
    if (players.length === 0) return 0;
    
    // Employment proxy: properties with active rent generation
    let employedSlots = 0;
    let totalSlots = 0;
    
    for (const player of players) {
      const properties = player.properties || [];
      employedSlots += properties.filter(p => !p.mortgaged).length;
      totalSlots += properties.length;
    }
    
    // Add "employment" from players being active in game
    const activePlayers = players.filter(p => !p.bankrupt && (p.money || 0) > 0).length;
    
    // Base employment rate
    const baseRate = totalSlots > 0 ? employedSlots / totalSlots : 0;
    
    // Active player bonus (everyone employed in game sense)
    const activeBonus = activePlayers / players.length * 0.3;
    
    return Math.max(0, Math.min(1, baseRate * 0.7 + activeBonus));
  }

  /**
   * Predict recession probability
   * @param {number} probability - Initial probability estimate (0-1)
   * @param {object} gameState - Current game state
   * @returns {object} Recession risk analysis
   */
  predictRecession(probability, gameState) {
    // Build on initial probability
    let recessionRisk = probability;
    
    // GDP contraction factor
    const gdpGrowth = this.calculateGDPGrowth(gameState);
    if (gdpGrowth < 0) {
      recessionRisk += Math.abs(gdpGrowth) * 0.5;
    }
    
    // High inflation pressure increases recession risk
    const inflation = this.getInflationPressure(gameState);
    if (inflation > 0.6) {
      recessionRisk += 0.15;
    }
    
    // Low employment increases risk
    const employment = this.getEmploymentRate(gameState);
    if (employment < 0.4) {
      recessionRisk += 0.1;
    }
    
    // Liquidity crunch
    const players = gameState.players || [];
    const lowCashPlayers = players.filter(p => (p.money || 0) < 200).length;
    const liquidityRisk = lowCashPlayers / players.length;
    recessionRisk += liquidityRisk * 0.2;
    
    // Clamp final risk
    recessionRisk = Math.max(0, Math.min(1, recessionRisk));
    
    // Determine severity
    let severity = 'none';
    if (recessionRisk > 0.7) severity = 'severe';
    else if (recessionRisk > 0.5) severity = 'moderate';
    else if (recessionRisk > 0.3) severity = 'mild';
    
    return {
      probability: Math.round(recessionRisk * 100) / 100,
      severity,
      gdpFactor: Math.round(gdpGrowth * 100) / 100,
      inflationFactor: Math.round(inflation * 100) / 100,
      employmentFactor: Math.round(employment * 100) / 100,
      liquidityFactor: Math.round(liquidityRisk * 100) / 100,
    };
  }

  /**
   * Get economic forecast for future horizon
   * @param {number} horizon - Forecast horizon in turns
   * @param {object} gameState - Current game state
   * @returns {object} Economic forecast
   */
  getEconomicForecast(horizon, gameState) {
    // Get current indicators
    const gdpGrowth = this.calculateGDPGrowth(gameState);
    const inflation = this.getInflationPressure(gameState);
    const employment = this.getEmploymentRate(gameState);
    
    // Project forward based on historical trends
    const projectedGDP = this._projectGDP(gdpGrowth, horizon);
    const projectedInflation = this._projectInflation(inflation, horizon);
    const projectedEmployment = this._projectEmployment(employment, horizon);
    
    // Calculate overall economic health score
    const healthScore = this._calculateHealthScore(gdpGrowth, inflation, employment);
    
    // Generate outlook
    let outlook = 'stable';
    if (healthScore > 0.7) outlook = 'bullish';
    else if (healthScore < 0.4) outlook = 'bearish';
    
    // Determine confidence based on history length
    const confidence = Math.min(0.9, this.history.length * 0.05 + 0.5);
    
    return {
      horizon,
      outlook,
      healthScore: Math.round(healthScore * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      projections: {
        gdpGrowth: Math.round(projectedGDP * 100) / 100,
        inflation: Math.round(projectedInflation * 100) / 100,
        employment: Math.round(projectedEmployment * 100) / 100,
      },
      risks: this._identifyRisks(gdpGrowth, inflation, employment),
      opportunities: this._identifyOpportunities(gdpGrowth, inflation, employment),
    };
  }

  /**
   * Add data point to history
   * @private
   */
  _addToHistory(dataPoint) {
    this.history.push(dataPoint);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Calculate rent pressure component
   * @private
   */
  _calculateRentPressure(gameState) {
    const players = gameState.players || [];
    
    let totalRent = 0;
    let totalIncome = 0;
    
    for (const player of players) {
      totalIncome += player.money || 0;
      const properties = player.properties || [];
      totalRent += properties.reduce((sum, p) => sum + (p.rent || 0), 0);
    }
    
    // High rent relative to money supply indicates inflation
    if (totalIncome === 0) return 0;
    
    return Math.min(1, (totalRent * 10) / totalIncome);
  }

  /**
   * Project GDP growth forward
   * @private
   */
  _projectGDP(currentGrowth, horizon) {
    // Apply diminishing returns for longer horizons
    const dampening = Math.exp(-horizon / 20);
    const trend = currentGrowth * dampening;
    return currentGrowth + trend * 0.1;
  }

  /**
   * Project inflation forward
   * @private
   */
  _projectInflation(currentInflation, horizon) {
    // Inflation tends to persist and grow slightly
    const persistence = 0.9;
    const drift = 0.02;
    
    let projected = currentInflation;
    for (let i = 0; i < horizon; i++) {
      projected = projected * persistence + drift;
      projected = Math.min(1, projected);
    }
    
    return projected;
  }

  /**
   * Project employment forward
   * @private
   */
  _projectEmployment(currentEmployment, horizon) {
    // Employment tends to be mean-reverting
    const target = 0.7;
    const speed = 0.1;
    
    let projected = currentEmployment;
    for (let i = 0; i < horizon; i++) {
      projected += (target - projected) * speed;
    }
    
    return Math.max(0, Math.min(1, projected));
  }

  /**
   * Calculate overall health score
   * @private
   */
  _calculateHealthScore(gdpGrowth, inflation, employment) {
    // GDP growth contribution (positive if growing)
    const gdpScore = gdpGrowth > 0 ? 0.3 : 0.3 + gdpGrowth;
    
    // Inflation contribution (negative if high)
    const inflationScore = 0.3 * (1 - inflation);
    
    // Employment contribution
    const employmentScore = employment * 0.4;
    
    return Math.max(0, Math.min(1, gdpScore + inflationScore + employmentScore));
  }

  /**
   * Identify economic risks
   * @private
   */
  _identifyRisks(gdpGrowth, inflation, employment) {
    const risks = [];
    
    if (gdpGrowth < -0.1) {
      risks.push({ type: 'recession', severity: 'high', description: 'GDP contraction detected' });
    }
    
    if (inflation > 0.7) {
      risks.push({ type: 'inflation', severity: 'high', description: 'High inflation pressure' });
    }
    
    if (employment < 0.5) {
      risks.push({ type: 'unemployment', severity: 'moderate', description: 'Low employment rate' });
    }
    
    if (inflation > 0.4 && gdpGrowth < 0) {
      risks.push({ type: 'stagflation', severity: 'high', description: 'Stagflation risk detected' });
    }
    
    return risks;
  }

  /**
   * Identify economic opportunities
   * @private
   */
  _identifyOpportunities(gdpGrowth, inflation, employment) {
    const opportunities = [];
    
    if (gdpGrowth > 0.1) {
      opportunities.push({ type: 'growth', potential: 'high', description: 'Strong economic growth' });
    }
    
    if (inflation < 0.3 && employment > 0.6) {
      opportunities.push({ type: 'prosperity', potential: 'moderate', description: 'Economic prosperity conditions' });
    }
    
    if (employment > 0.8) {
      opportunities.push({ type: 'full_employment', potential: 'moderate', description: 'Full employment boosts consumer spending' });
    }
    
    if (gdpGrowth > 0.05 && inflation < 0.4) {
      opportunities.push({ type: 'balanced_growth', potential: 'high', description: 'Sustainable balanced growth' });
    }
    
    return opportunities;
  }
}