/**
 * MarketSimulator - Economic Market Simulation
 * 
 * Simulates economic conditions and market dynamics for properties,
 * providing AI agents with market-aware decision making.
 */

export class MarketSimulator {
  /**
   * @param {object} memoryLayer - Memory layer for market history tracking
   */
  constructor(memoryLayer) {
    this.memoryLayer = memoryLayer;
    
    // Market cycle tracking
    this.marketCycles = {
      expansion: 0,
      peak: 1,
      contraction: 2,
      trough: 3,
    };
    
    // Season multipliers for property demand
    this.seasonMultipliers = {
      spring: 1.1,
      summer: 1.2,
      autumn: 1.0,
      winter: 0.9,
    };
    
    // Economic boom/bust modifiers
    this.economicModifiers = {
      boom: 1.3,
      normal: 1.0,
      recession: 0.7,
      depression: 0.5,
    };
    
    // Hotspot detection thresholds
    this.hotspotThreshold = 0.7;
  }

  /**
   * Get current market conditions based on game state
   * @param {object} gameState - Current game state
   * @returns {object} Market conditions (supply/demand analysis)
   */
  getCurrentMarketConditions(gameState) {
    const players = gameState.players || [];
    const tiles = gameState.tiles || [];
    const turn = gameState.turn || 1;
    
    // Calculate ownership distribution
    const ownershipStats = this._calculateOwnershipDistribution(players);
    
    // Calculate supply metrics
    const supplyMetrics = this._calculateSupplyMetrics(players, tiles);
    
    // Calculate demand metrics
    const demandMetrics = this._calculateDemandMetrics(players, tiles);
    
    // Determine market phase
    const marketPhase = this._calculateMarketPhase(turn, ownershipStats, supplyMetrics, demandMetrics);
    
    // Calculate market sentiment (0-1 scale)
    const sentiment = this._calculateMarketSentiment(players, ownershipStats);
    
    return {
      phase: marketPhase,
      sentiment,
      supply: supplyMetrics,
      demand: demandMetrics,
      ownership: ownershipStats,
      liquidityIndex: this._calculateLiquidityIndex(players),
      competitiveIndex: this._calculateCompetitiveIndex(players),
    };
  }

  /**
   * Predict market trend direction
   * @param {object} gameState - Current game state
   * @returns {string} Market trend: 'rising', 'falling', or 'stable'
   */
  predictMarketTrend(gameState) {
    const conditions = this.getCurrentMarketConditions(gameState);
    const turn = gameState.turn || 1;
    
    // Factor in game progression
    const gameProgress = Math.min(turn / 40, 1.0);
    
    // Calculate momentum indicators
    let momentum = 0;
    
    // Positive indicators
    if (conditions.sentiment > 0.6) momentum += 0.3;
    if (conditions.competitiveIndex > 0.7) momentum += 0.2;
    if (conditions.ownership.concentration < 0.5) momentum += 0.2;
    
    // Negative indicators
    if (conditions.liquidityIndex < 0.3) momentum -= 0.3;
    if (conditions.ownership.concentration > 0.7) momentum -= 0.2;
    
    // Game phase adjustments
    if (gameProgress > 0.7) {
      // Late game - market cools as properties become concentrated
      momentum -= 0.2;
    } else if (gameProgress > 0.3) {
      // Mid game - peak activity
      momentum += 0.1;
    }
    
    // Determine trend
    if (momentum > 0.2) return 'rising';
    if (momentum < -0.2) return 'falling';
    return 'stable';
  }

  /**
   * Simulate supply and demand for a specific property
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} Market price with供需分析
   */
  simulateSupplyDemand(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) {
      return { price: 0, supplyScore: 0, demandScore: 0, ratio: 1 };
    }
    
    // Get base price
    const basePrice = property.price || 100;
    
    // Calculate supply score (0-1, higher = more supply)
    const supplyScore = this._calculatePropertySupply(propertyId, gameState);
    
    // Calculate demand score (0-1, higher = more demand)
    const demandScore = this._calculatePropertyDemand(propertyId, gameState);
    
    // Calculate ratio
    const ratio = supplyScore > 0 ? demandScore / supplyScore : 1;
    
    // Apply multiplier based on ratio
    let multiplier = 1.0;
    if (ratio > 1.5) {
      multiplier = 1.2 + Math.min((ratio - 1.5) * 0.2, 0.3);
    } else if (ratio < 0.7) {
      multiplier = 0.8 - Math.min((0.7 - ratio) * 0.3, 0.3);
    }
    
    // Apply market conditions
    const conditions = this.getCurrentMarketConditions(gameState);
    const trendMultiplier = this._getTrendMultiplier(conditions);
    
    // Calculate final price
    const marketPrice = Math.round(basePrice * multiplier * trendMultiplier);
    
    // Get price confidence based on market stability
    const confidence = this._calculatePriceConfidence(conditions);
    
    return {
      price: marketPrice,
      basePrice,
      multiplier: Math.round(multiplier * 100) / 100,
      supplyScore: Math.round(supplyScore * 100) / 100,
      demandScore: Math.round(demandScore * 100) / 100,
      ratio: Math.round(ratio * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Get high-demand market hotspots
   * @param {object} gameState - Current game state
   * @returns {Array} Array of hotspot property IDs with scores
   */
  getMarketHotspots(gameState) {
    const tiles = gameState.tiles || [];
    const players = gameState.players || [];
    const properties = tiles.filter(t => t.type === 'property');
    
    const hotspots = [];
    
    for (const property of properties) {
      const marketData = this.simulateSupplyDemand(property.id, gameState);
      
      // Check if demand exceeds supply significantly
      if (marketData.ratio > this.hotspotThreshold) {
        // Calculate hotspot intensity
        const intensity = this._calculateHotspotIntensity(property, marketData, gameState);
        
        hotspots.push({
          propertyId: property.id,
          name: property.name || property.id,
          intensity: Math.round(intensity * 100) / 100,
          demandScore: marketData.demandScore,
          supplyScore: marketData.supplyScore,
          price: marketData.price,
        });
      }
    }
    
    // Sort by intensity
    hotspots.sort((a, b) => b.intensity - a.intensity);
    
    return hotspots.slice(0, 10); // Top 10 hotspots
  }

  /**
   * Calculate ownership distribution statistics
   * @private
   */
  _calculateOwnershipDistribution(players) {
    if (!players || players.length === 0) {
      return { concentration: 0, ownerCount: 0, avgPropertiesPerPlayer: 0 };
    }
    
    const propertyCounts = players.map(p => (p.properties || []).length);
    const totalProperties = propertyCounts.reduce((a, b) => a + b, 0);
    const avgProperties = totalProperties / players.length;
    
    // Calculate concentration (Gini-like coefficient)
    let sumDiffs = 0;
    for (const count of propertyCounts) {
      sumDiffs += Math.abs(count - avgProperties);
    }
    const concentration = sumDiffs / (2 * totalProperties * (players.length - 1) || 1);
    
    return {
      concentration: Math.min(1, Math.max(0, concentration || 0)),
      ownerCount: players.filter(p => (p.properties || []).length > 0).length,
      avgPropertiesPerPlayer: avgProperties,
    };
  }

  /**
   * Calculate supply metrics
   * @private
   */
  _calculateSupplyMetrics(players, tiles) {
    const properties = tiles.filter(t => t.type === 'property');
    const ownedProperties = properties.filter(p => p.owner);
    const unownedProperties = properties.filter(p => !p.owner);
    
    const totalSupply = properties.length;
    const availableSupply = unownedProperties.length;
    
    return {
      total: totalSupply,
      available: availableSupply,
      owned: ownedProperties.length,
      availableRatio: totalSupply > 0 ? availableSupply / totalSupply : 0,
      avgOwnershipTime: this._estimateAvgOwnershipTime(players),
    };
  }

  /**
   * Calculate demand metrics
   * @private
   */
  _calculateDemandMetrics(players, tiles) {
    if (!players || players.length === 0) {
      return { totalDemand: 0, avgDemandScore: 0, highDemandCount: 0 };
    }
    
    // Calculate cash reserves that could be used for purchases
    const totalCash = players.reduce((sum, p) => sum + (p.money || 0), 0);
    const avgCash = totalCash / players.length;
    
    // Count players with buying capacity
    const playersWithCash = players.filter(p => (p.money || 0) > 200).length;
    
    // Estimate demand based on available cash
    const demandScore = Math.min(1, avgCash / 500);
    
    return {
      totalDemand: totalCash,
      avgDemandScore: demandScore,
      highDemandCount: playersWithCash,
      buyingPressure: playersWithCash / players.length,
    };
  }

  /**
   * Calculate market phase
   * @private
   */
  _calculateMarketPhase(turn, ownershipStats, supplyMetrics, demandMetrics) {
    // Simple phase determination based on game progress
    const progress = Math.min(turn / 30, 1);
    
    if (progress < 0.25) return 'expansion';
    if (progress < 0.5) return 'peak';
    if (progress < 0.75) return 'contraction';
    return 'trough';
  }

  /**
   * Calculate market sentiment (0-1)
   * @private
   */
  _calculateMarketSentiment(players, ownershipStats) {
    if (!players || players.length === 0) return 0.5;
    
    // Base sentiment on player cash reserves
    const totalCash = players.reduce((sum, p) => sum + (p.money || 0), 0);
    const avgCash = totalCash / players.length;
    
    // Normalize to 0-1 scale
    let sentiment = Math.min(1, avgCash / 400);
    
    // Adjust for concentration
    if (ownershipStats.concentration > 0.6) {
      sentiment *= 0.8; // Less sentiment when market is concentrated
    }
    
    return Math.max(0, Math.min(1, sentiment));
  }

  /**
   * Calculate liquidity index
   * @private
   */
  _calculateLiquidityIndex(players) {
    if (!players || players.length === 0) return 0;
    
    const totalCash = players.reduce((sum, p) => sum + (p.money || 0), 0);
    const totalAssets = totalCash + this._estimatePropertyValues(players);
    
    return totalAssets > 0 ? totalCash / totalAssets : 0;
  }

  /**
   * Calculate competitive index
   * @private
   */
  _calculateCompetitiveIndex(players) {
    if (!players || players.length < 2) return 0;
    
    // Measure how close players are in money
    const moneyValues = players.map(p => p.money || 0);
    const maxMoney = Math.max(...moneyValues);
    const minMoney = Math.min(...moneyValues);
    
    if (maxMoney === 0) return 0;
    
    // High competition when money is evenly distributed
    const competition = 1 - ((maxMoney - minMoney) / maxMoney);
    return Math.max(0, Math.min(1, competition));
  }

  /**
   * Calculate property supply score
   * @private
   */
  _calculatePropertySupply(propertyId, gameState) {
    const tiles = gameState.tiles || [];
    const property = tiles.find(t => t.id === propertyId);
    
    if (!property) return 0.5;
    
    // If already owned, supply is low
    if (property.owner) return 0.2;
    
    // Check how many of same color group are available
    const colorGroup = property.colorGroup;
    const sameColor = tiles.filter(t => 
      t.colorGroup === colorGroup && 
      t.type === 'property' && 
      !t.owner
    );
    
    // If few available in color group, supply is low
    return Math.min(0.8, 0.2 + (sameColor.length * 0.1));
  }

  /**
   * Calculate property demand score
   * @private
   */
  _calculatePropertyDemand(propertyId, gameState) {
    const players = gameState.players || [];
    const tiles = gameState.tiles || [];
    const property = tiles.find(t => t.id === propertyId);
    
    if (!property) return 0;
    
    let demandScore = 0.3; // Base demand
    
    // Add demand based on potential ROI
    const rent = property.rent || 0;
    const price = property.price || 100;
    if (price > 0 && rent > 0) {
      const roi = rent / price;
      demandScore += Math.min(0.3, roi * 10);
    }
    
    // Add demand if player can complete color group
    const colorGroup = property.colorGroup;
    for (const player of players) {
      const playerProps = player.properties || [];
      const sameColorOwned = playerProps.filter(p => p.colorGroup === colorGroup).length;
      const sameColorTotal = tiles.filter(t => t.colorGroup === colorGroup && t.type === 'property').length;
      
      if (sameColorTotal > 0 && sameColorOwned === sameColorTotal - 1) {
        // Player is one away from monopoly
        demandScore += 0.3;
      }
    }
    
    return Math.min(1, demandScore);
  }

  /**
   * Calculate hotspot intensity
   * @private
   */
  _calculateHotspotIntensity(property, marketData, gameState) {
    let intensity = marketData.ratio * 0.4;
    
    // Boost based on demand score
    intensity += marketData.demandScore * 0.3;
    
    // Boost based on color group scarcity
    const tiles = gameState.tiles || [];
    const colorGroup = property.colorGroup;
    const sameColor = tiles.filter(t => t.colorGroup === colorGroup && t.type === 'property');
    
    if (sameColor.length <= 2) {
      intensity += 0.2;
    }
    
    return Math.min(1, intensity);
  }

  /**
   * Get trend multiplier
   * @private
   */
  _getTrendMultiplier(conditions) {
    switch (conditions.phase) {
      case 'expansion': return 1.1;
      case 'peak': return 1.2;
      case 'contraction': return 0.9;
      case 'trough': return 0.8;
      default: return 1.0;
    }
  }

  /**
   * Calculate price confidence
   * @private
   */
  _calculatePriceConfidence(conditions) {
    // Confidence is lower when market is unstable
    if (conditions.phase === 'peak' || conditions.phase === 'trough') {
      return 0.6;
    }
    return 0.8;
  }

  /**
   * Estimate average ownership time
   * @private
   */
  _estimateAvgOwnershipTime(players) {
    // Simplified estimation
    return 5; // rounds
  }

  /**
   * Estimate total property values
   * @private
   */
  _estimatePropertyValues(players) {
    if (!players) return 0;
    
    return players.reduce((sum, p) => {
      const props = p.properties || [];
      return sum + props.reduce((s, prop) => s + (prop.price || 0), 0);
    }, 0);
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