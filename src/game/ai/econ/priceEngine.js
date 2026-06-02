/**
 * PriceEngine - Dynamic Pricing
 * 
 * Provides dynamic pricing for properties based on market conditions,
 * historical trends, and seasonal adjustments.
 */

export class PriceEngine {
  constructor() {
    // Price history tracking
    this.priceHistory = new Map();
    this.maxHistoryPerProperty = 10;
    
    // Base price adjustments by game phase
    this.phaseAdjustments = {
      early: 0.9,    // 0-10 turns - lower prices, opportunities
      mid: 1.0,      // 11-30 turns - normal prices
      late: 1.15,    // 31-50 turns - higher prices
      end: 1.25,     // 50+ turns - premium prices
    };
    
    // Seasonal adjustments (turns-based seasons in game)
    this.seasonAdjustments = {
      q1: 0.95,      // Turns 1-12 - Winter/early
      q2: 1.0,       // Turns 13-24 - Spring
      q3: 1.05,      // Turns 25-36 - Summer/peak
      q4: 1.1,       // Turns 37-48 - Autumn
      wrap: 1.15,     // Turns 49+ - End of game wrap
    };
  }

  /**
   * Get dynamic price for a property based on market conditions
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} Dynamic price details
   */
  getDynamicPrice(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) {
      return { price: 0, adjustedPrice: 0, breakdown: {} };
    }
    
    const basePrice = property.price || 100;
    const turn = gameState.turn || 1;
    
    // Get various adjustment factors
    const phaseAdjustment = this._getPhaseAdjustment(turn);
    const seasonAdjustment = this._getSeasonalAdjustment(propertyId, turn, gameState);
    const marketAdjustment = this._getMarketAdjustment(gameState);
    const demandAdjustment = this._getDemandAdjustment(propertyId, gameState);
    const scarcityAdjustment = this._getScarcityAdjustment(propertyId, gameState);
    
    // Calculate cumulative multiplier
    const totalMultiplier = phaseAdjustment * seasonAdjustment * marketAdjustment * demandAdjustment * scarcityAdjustment;
    
    // Calculate final price
    const adjustedPrice = Math.round(basePrice * totalMultiplier);
    
    // Calculate price confidence based on market stability
    const confidence = this._calculatePriceConfidence(gameState);
    
    return {
      basePrice,
      adjustedPrice,
      totalMultiplier: Math.round(totalMultiplier * 100) / 100,
      confidence,
      breakdown: {
        base: basePrice,
        phase: { adjustment: phaseAdjustment, effect: Math.round(basePrice * (phaseAdjustment - 1)) },
        season: { adjustment: seasonAdjustment, effect: Math.round(basePrice * (seasonAdjustment - 1)) },
        market: { adjustment: marketAdjustment, effect: Math.round(basePrice * (marketAdjustment - 1)) },
        demand: { adjustment: demandAdjustment, effect: Math.round(basePrice * (demandAdjustment - 1)) },
        scarcity: { adjustment: scarcityAdjustment, effect: Math.round(basePrice * (scarcityAdjustment - 1)) },
      },
    };
  }

  /**
   * Get price trend for a property
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} Price trend analysis
   */
  getPriceTrend(propertyId, gameState) {
    const history = this.priceHistory.get(propertyId) || [];
    const current = this.getDynamicPrice(propertyId, gameState);
    
    if (history.length < 2) {
      return {
        direction: 'stable',
        momentum: 0,
        history: history.length,
        projection: current.adjustedPrice,
      };
    }
    
    // Calculate trend from history
    const recentPrices = history.slice(-5);
    const first = recentPrices[0];
    const last = recentPrices[recentPrices.length - 1];
    
    const priceChange = last - first;
    const percentChange = first > 0 ? priceChange / first : 0;
    
    // Calculate momentum (velocity of price change)
    let momentum = 0;
    if (recentPrices.length >= 2) {
      for (let i = 1; i < recentPrices.length; i++) {
        momentum += recentPrices[i] - recentPrices[i - 1];
      }
      momentum /= recentPrices.length - 1;
    }
    
    // Determine direction
    let direction = 'stable';
    if (percentChange > 0.05) direction = 'rising';
    else if (percentChange < -0.05) direction = 'falling';
    
    // Project future price
    const projection = this._projectPrice(current.adjustedPrice, momentum, 5);
    
    return {
      direction,
      momentum: Math.round(momentum),
      percentChange: Math.round(percentChange * 100) / 100,
      historyLength: history.length,
      projection: Math.round(projection),
      recentPrices: recentPrices.slice(-3),
    };
  }

  /**
   * Adjust price for market conditions
   * @param {number} basePrice - Base price to adjust
   * @param {object} gameState - Current game state
   * @returns {object} Market-adjusted price with breakdown
   */
  adjustForMarketConditions(basePrice, gameState) {
    const marketConditions = this._analyzeMarketConditions(gameState);
    
    // Market condition multipliers
    const marketMultipliers = {
      bullish: 1.15,
      stable: 1.0,
      bearish: 0.85,
    };
    
    const trendMultipliers = {
      rising: 1.1,
      stable: 1.0,
      falling: 0.9,
    };
    
    const marketMultiplier = marketMultipliers[marketConditions.marketPhase] || 1.0;
    const trendMultiplier = trendMultipliers[marketConditions.marketTrend] || 1.0;
    
    // Calculate adjusted price
    const adjustedPrice = Math.round(basePrice * marketMultiplier * trendMultiplier);
    
    // Add to price history
    this._recordPrice('market', adjustedPrice, gameState);
    
    return {
      basePrice,
      adjustedPrice,
      marketPhase: marketConditions.marketPhase,
      marketTrend: marketConditions.marketTrend,
      marketMultiplier: Math.round(marketMultiplier * 100) / 100,
      trendMultiplier: Math.round(trendMultiplier * 100) / 100,
    };
  }

  /**
   * Get seasonal adjustment factor for a property
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} Seasonal adjustment details
   */
  getSeasonalAdjustment(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) {
      return { adjustment: 1.0, season: 'unknown', explanation: '' };
    }
    
    const turn = gameState.turn || 1;
    const season = this._getSeason(turn);
    const colorGroup = property.colorGroup;
    
    // Color group seasonal preferences
    const colorSeasonBonus = {
      brown: { q1: 1.1, q2: 1.05, q3: 0.95, q4: 1.0, wrap: 1.0 },
      lightBlue: { q1: 1.05, q2: 1.1, q3: 1.0, q4: 0.95, wrap: 1.05 },
      pink: { q1: 0.95, q2: 1.05, q3: 1.1, q4: 1.0, wrap: 1.0 },
      orange: { q1: 1.0, q2: 0.95, q3: 1.05, q4: 1.1, wrap: 1.0 },
      red: { q1: 0.9, q2: 1.0, q3: 1.1, q4: 1.05, wrap: 1.0 },
      yellow: { q1: 1.0, q2: 1.1, q3: 1.05, q4: 0.95, wrap: 1.0 },
      green: { q1: 1.05, q2: 1.0, q3: 1.0, q4: 1.1, wrap: 1.05 },
      darkBlue: { q1: 1.1, q2: 1.0, q3: 0.95, q4: 1.0, wrap: 1.15 },
      railroad: { q1: 1.0, q2: 1.0, q3: 1.0, q4: 1.0, wrap: 1.0 },
      utility: { q1: 1.0, q2: 1.0, q3: 1.0, q4: 1.0, wrap: 1.0 },
    };
    
    const bonuses = colorSeasonBonus[colorGroup] || { q1: 1, q2: 1, q3: 1, q4: 1, wrap: 1 };
    const adjustment = bonuses[season] || 1.0;
    
    const explanations = {
      q1: 'Early game - investment phase',
      q2: 'Mid-game build-up',
      q3: 'Peak season - high activity',
      q4: 'Late game consolidation',
      wrap: 'End game - final trades',
    };
    
    return {
      adjustment: Math.round(adjustment * 100) / 100,
      season,
      colorGroup,
      explanation: explanations[season] || '',
    };
  }

  /**
   * Get phase adjustment based on turn number
   * @private
   */
  _getPhaseAdjustment(turn) {
    if (turn <= 10) return this.phaseAdjustments.early;
    if (turn <= 30) return this.phaseAdjustments.mid;
    if (turn <= 50) return this.phaseAdjustments.late;
    return this.phaseAdjustments.end;
  }

  /**
   * Get season key for turn
   * @private
   */
  _getSeason(turn) {
    if (turn <= 12) return 'q1';
    if (turn <= 24) return 'q2';
    if (turn <= 36) return 'q3';
    if (turn <= 48) return 'q4';
    return 'wrap';
  }

  /**
   * Get seasonal adjustment factor
   * @private
   */
  _getSeasonalAdjustment(propertyId, turn, gameState) {
    const season = this._getSeason(turn);
    const adjustment = this.seasonAdjustments[season] || 1.0;
    
    // Record price for trend tracking
    const price = this._getBasePrice(propertyId, gameState);
    this._recordPrice(propertyId, price * adjustment, gameState);
    
    return adjustment;
  }

  /**
   * Get market adjustment factor
   * @private
   */
  _getMarketAdjustment(gameState) {
    const players = gameState.players || [];
    if (players.length === 0) return 1.0;
    
    // Calculate average player wealth
    const totalWealth = players.reduce((sum, p) => {
      return sum + (p.money || 0) + ((p.properties || []).length * 100);
    }, 0);
    const avgWealth = totalWealth / players.length;
    
    // Higher wealth = higher prices
    return Math.min(1.2, Math.max(0.8, avgWealth / 400));
  }

  /**
   * Get demand adjustment factor
   * @private
   */
  _getDemandAdjustment(propertyId, gameState) {
    const players = gameState.players || [];
    let demandScore = 1.0;
    
    // Check if any player is close to completing a monopoly
    const tiles = gameState.tiles || [];
    const property = tiles.find(t => t.id === propertyId);
    
    if (!property) return 1.0;
    
    const colorGroup = property.colorGroup;
    
    for (const player of players) {
      const props = player.properties || [];
      const sameColor = props.filter(p => p.colorGroup === colorGroup).length;
      const totalInGroup = tiles.filter(t => t.colorGroup === colorGroup && t.type === 'property').length;
      
      if (totalInGroup > 0 && sameColor === totalInGroup - 1) {
        // Player wants last property for monopoly
        demandScore += 0.15;
      }
    }
    
    return Math.min(1.3, demandScore);
  }

  /**
   * Get scarcity adjustment factor
   * @private
   */
  _getScarcityAdjustment(propertyId, gameState) {
    const tiles = gameState.tiles || [];
    const property = tiles.find(t => t.id === propertyId);
    
    if (!property) return 1.0;
    
    const colorGroup = property.colorGroup;
    const sameColorTotal = tiles.filter(t => t.colorGroup === colorGroup && t.type === 'property').length;
    const sameColorAvailable = tiles.filter(t => 
      t.colorGroup === colorGroup && 
      t.type === 'property' && 
      !t.owner
    ).length;
    
    if (sameColorTotal === 0) return 1.0;
    
    // Scarce properties get premium
    const scarcityRatio = sameColorAvailable / sameColorTotal;
    if (scarcityRatio < 0.3) {
      return 1.15; // Premium for rare properties
    } else if (scarcityRatio < 0.5) {
      return 1.08;
    }
    
    return 1.0;
  }

  /**
   * Calculate price confidence
   * @private
   */
  _calculatePriceConfidence(gameState) {
    const players = gameState.players || [];
    const turn = gameState.turn || 1;
    
    // More players = more market activity = higher confidence
    let confidence = Math.min(0.9, 0.6 + (players.length * 0.05));
    
    // Late game has more predictable pricing
    if (turn > 30) confidence += 0.1;
    
    return Math.min(1, Math.max(0.5, confidence));
  }

  /**
   * Project future price
   * @private
   */
  _projectPrice(currentPrice, momentum, horizon) {
    // Simple linear projection
    return currentPrice + (momentum * horizon);
  }

  /**
   * Analyze market conditions
   * @private
   */
  _analyzeMarketConditions(gameState) {
    const turn = gameState.turn || 1;
    const players = gameState.players || [];
    
    // Determine market phase based on turn
    let marketPhase = 'stable';
    if (turn <= 10) marketPhase = 'bullish';
    else if (turn > 40) marketPhase = 'bearish';
    
    // Calculate market trend based on player wealth distribution
    const moneyValues = players.map(p => p.money || 0);
    const maxMoney = Math.max(...moneyValues, 1);
    const minMoney = Math.min(...moneyValues, 0);
    
    let marketTrend = 'stable';
    if (maxMoney > minMoney * 2) marketTrend = 'rising';
    else if (maxMoney < minMoney * 0.5) marketTrend = 'falling';
    
    return { marketPhase, marketTrend };
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
   * Get base price for property
   * @private
   */
  _getBasePrice(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    return property ? (property.price || 100) : 100;
  }

  /**
   * Record price for history tracking
   * @private
   */
  _recordPrice(propertyId, price, gameState) {
    if (!this.priceHistory.has(propertyId)) {
      this.priceHistory.set(propertyId, []);
    }
    
    const history = this.priceHistory.get(propertyId);
    history.push({
      price,
      turn: gameState.turn || 1,
      timestamp: Date.now(),
    });
    
    // Keep history limited
    while (history.length > this.maxHistoryPerProperty) {
      history.shift();
    }
  }
}