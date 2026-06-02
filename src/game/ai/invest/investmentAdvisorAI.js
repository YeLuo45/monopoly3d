/**
 * InvestmentAdvisorAI - AI for Investment Decisions
 * 
 * Provides investment recommendations, portfolio analysis,
 * diversification scoring, and market timing for Monopoly.
 */

import { PropertyValuation } from '../property/propertyValuation.js';

export class InvestmentAdvisorAI {
  constructor(memoryLayer, financialTracker) {
    this.memoryLayer = memoryLayer;
    this.financialTracker = financialTracker;
    this.valuation = new PropertyValuation(memoryLayer);
    
    // Season/phase weights for timing
    this.seasonWeights = {
      early: { name: 'early', weight: 0.6, description: 'Property accumulation phase' },
      mid: { name: 'mid', weight: 0.8, description: 'Monopoly building phase' },
      late: { name: 'late', weight: 0.9, description: 'Rent maximization phase' },
      endgame: { name: 'endgame', weight: 0.5, description: 'Final榨取阶段' },
    };
    
    // Diversification thresholds
    this.diversificationThresholds = {
      excellent: 0.7,
      good: 0.5,
      fair: 0.3,
      poor: 0,
    };
  }

  /**
   * Get ranked investment recommendations for a player
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {Array} Ranked list of investment recommendations
   */
  getInvestmentRecommendations(playerId, gameState) {
    const recommendations = [];
    const availableProperties = this._getAvailableProperties(gameState);
    const player = this._getPlayer(playerId, gameState);
    
    if (!player) return recommendations;
    
    for (const property of availableProperties) {
      const score = this._calculateInvestmentScore(property.id, playerId, gameState);
      const expectedROI = this.valuation.getROI(property.id, gameState);
      const risk = this._assessPropertyRisk(property.id, gameState);
      const strategicValue = this.valuation.getStrategicValue(property.id, playerId, gameState);
      
      recommendations.push({
        propertyId: property.id,
        propertyName: property.name,
        score,
        expectedROI,
        risk,
        strategicValue: strategicValue.total,
        urgency: this._calculateUrgency(property, playerId, gameState),
        reasoning: this._generateInvestmentReasoning(property, score, strategicValue),
      });
    }
    
    // Sort by score descending
    recommendations.sort((a, b) => b.score - a.score);
    
    // Add rank
    return recommendations.map((rec, index) => ({
      ...rec,
      rank: index + 1,
    }));
  }

  /**
   * Decide if player should invest in a specific property
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {object} Investment decision with reasoning
   */
  shouldInvestInProperty(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) {
      return { decision: false, reasoning: 'Property not found', confidence: 0 };
    }
    
    const playerId = this._getCurrentPlayer(gameState)?.id;
    if (!playerId) {
      return { decision: false, reasoning: 'No active player', confidence: 0 };
    }
    
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { decision: false, reasoning: 'Player not found', confidence: 0 };
    }
    
    // Check if player can afford
    if (player.money < property.price) {
      return {
        decision: false,
        reasoning: `Cannot afford - need $${property.price}, have $${player.money}`,
        confidence: 0.9,
      };
    }
    
    // Check market timing
    const marketTiming = this.getMarketTiming(gameState);
    if (marketTiming.overall === 'bad') {
      return {
        decision: false,
        reasoning: 'Poor market timing - wait for better conditions',
        confidence: 0.6,
      };
    }
    
    // Calculate investment score
    const score = this._calculateInvestmentScore(propertyId, playerId, gameState);
    const strategicValue = this.valuation.getStrategicValue(propertyId, playerId, gameState);
    
    // Decision thresholds
    const buyThreshold = 50;
    const strongBuyThreshold = 70;
    
    if (score >= strongBuyThreshold) {
      return {
        decision: true,
        reasoning: `Strong buy - score ${score}, strategic value $${strategicValue.total}`,
        confidence: 0.85,
        score,
      };
    } else if (score >= buyThreshold) {
      return {
        decision: true,
        reasoning: `Buy - score ${score}, ROI ${this.valuation.getROI(propertyId, gameState)}%`,
        confidence: 0.7,
        score,
      };
    } else {
      return {
        decision: false,
        reasoning: `Hold - score ${score} below threshold ${buyThreshold}`,
        confidence: 0.6,
        score,
      };
    }
  }

  /**
   * Get portfolio diversification score (0-1)
   * @param {string} playerId - Player ID
   * @returns {number} Diversification score 0-1
   */
  getDiversificationScore(playerId) {
    if (!this.memoryLayer) return 0.5;
    
    const memory = this.memoryLayer;
    const player = memory.getPlayerState?.(playerId);
    if (!player) return 0.5;
    
    const properties = player.properties || [];
    if (properties.length === 0) return 0;
    if (properties.length === 1) return 0.1;
    
    // Count color groups
    const colorGroups = new Set();
    for (const prop of properties) {
      if (prop.colorGroup) {
        colorGroups.add(prop.colorGroup);
      }
    }
    
    // Calculate diversification ratio
    const uniqueGroups = colorGroups.size;
    const totalProperties = properties.length;
    const theoreticalMaxGroups = Math.min(totalProperties, 8); // 8 color groups in Monopoly
    
    // More groups = more diversified = better
    const diversification = uniqueGroups / theoreticalMaxGroups;
    
    // Penalize if heavily concentrated in one group
    const colorCounts = {};
    for (const prop of properties) {
      const group = prop.colorGroup || 'none';
      colorCounts[group] = (colorCounts[group] || 0) + 1;
    }
    
    const maxConcentration = Math.max(...Object.values(colorCounts)) / totalProperties;
    const concentrationPenalty = maxConcentration > 0.5 ? (maxConcentration - 0.5) * 0.3 : 0;
    
    return Math.max(0, Math.min(1, diversification - concentrationPenalty));
  }

  /**
   * Get concentration risk warning
   * @param {string} playerId - Player ID
   * @returns {object} Concentration risk analysis
   */
  getConcentrationRisk(playerId) {
    const diversificationScore = this.getDiversificationScore(playerId);
    
    let riskLevel = 'low';
    let riskPercentage = 0;
    let dominantColor = null;
    let recommendation = 'Portfolio is well diversified';
    
    if (diversificationScore < 0.3) {
      riskLevel = 'critical';
      riskPercentage = 90;
      recommendation = 'Critical: Overexposed to single color group - acquire properties in other groups';
    } else if (diversificationScore < 0.5) {
      riskLevel = 'high';
      riskPercentage = 70;
      recommendation = 'High risk: Portfolio needs rebalancing across color groups';
    } else if (diversificationScore < 0.7) {
      riskLevel = 'medium';
      riskPercentage = 40;
      recommendation = 'Moderate concentration - consider spreading investments';
    }
    
    return {
      riskLevel,
      riskPercentage,
      diversificationScore,
      dominantColor,
      recommendation,
      needsRebalancing: diversificationScore < 0.5,
    };
  }

  /**
   * Get overall market timing assessment
   * @param {object} gameState - Current game state
   * @returns {object} Market timing analysis
   */
  getMarketTiming(gameState) {
    const turn = gameState.turn || 0;
    const players = gameState.players || [];
    
    // Determine season based on turn
    let season;
    if (turn < 5) {
      season = this.seasonWeights.early;
    } else if (turn < 15) {
      season = this.seasonWeights.mid;
    } else if (turn < 30) {
      season = this.seasonWeights.late;
    } else {
      season = this.seasonWeights.endgame;
    }
    
    // Calculate market activity
    const totalProperties = (gameState.tiles || []).filter(t => t.type === 'property').length;
    const ownedProperties = players.reduce((sum, p) => sum + (p.properties?.length || 0), 0);
    const ownershipRate = totalProperties > 0 ? ownedProperties / totalProperties : 0;
    
    // Market liquidity - cash available
    const totalCash = players.reduce((sum, p) => sum + (p.money || 0), 0);
    const avgCashPerPlayer = players.length > 0 ? totalCash / players.length : 0;
    
    // Timing signals
    const signals = {
      season,
      ownershipRate,
      avgCashPerPlayer,
      isGoodTimeToInvest: season.weight > 0.6 && ownershipRate < 0.7,
      isGoodTimeToSell: ownershipRate > 0.8,
    };
    
    // Overall assessment
    let overall = 'neutral';
    if (season.weight > 0.7 && ownershipRate < 0.5) {
      overall = 'good';
    } else if (ownershipRate > 0.8 || avgCashPerPlayer < 200) {
      overall = 'bad';
    }
    
    return {
      season: season.name,
      seasonDescription: season.description,
      overall,
      signals,
      recommendedAction: this._getRecommendedMarketAction(signals),
    };
  }

  /**
   * Get best season for investment
   * @param {object} gameState - Current game state
   * @returns {object} Optimal timing recommendation
   */
  getBestSeasonForInvestment(gameState) {
    const currentSeason = this.getMarketTiming(gameState);
    const turn = gameState.turn || 0;
    
    // Calculate remaining turns
    const totalTiles = (gameState.tiles || []).length || 40;
    const estimatedTurnsRemaining = Math.max(0, 40 - turn);
    
    // Best season analysis
    const seasons = [
      { name: 'early', weight: 0.6, reason: 'Low prices, many options available' },
      { name: 'mid', weight: 0.8, reason: 'Balance of opportunity and market maturity' },
      { name: 'late', weight: 0.9, reason: 'Rent collection maximized, monopolies established' },
      { name: 'endgame', weight: 0.5, reason: 'Limited opportunities, focus on trading' },
    ];
    
    // Find best season
    const bestSeason = seasons.reduce((best, current) => 
      current.weight > best.weight ? current : best
    );
    
    // Recommend timing
    let recommendedTiming = 'now';
    let reasoning = 'Current season is favorable for investment';
    
    if (currentSeason.overall === 'bad') {
      if (currentSeason.season === 'early') {
        recommendedTiming = 'wait';
        reasoning = 'Wait until mid-game for better opportunities';
      } else {
        recommendedTiming = 'wait';
        reasoning = 'Market conditions unfavorable - wait for turnover';
      }
    } else if (currentSeason.season === 'late' && this.getDiversificationScore(gameState.currentPlayer) < 0.5) {
      recommendedTiming = 'now';
      reasoning = 'Must invest now to secure before endgame';
    }
    
    return {
      currentSeason: currentSeason.season,
      bestSeason: bestSeason.name,
      recommendedTiming,
      reasoning,
      estimatedTurnsRemaining,
      priority: currentSeason.overall === 'bad' ? 'low' : 'high',
    };
  }

  /**
   * Calculate investment score for a property
   * @private
   */
  _calculateInvestmentScore(propertyId, playerId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return 0;
    
    const strategicValue = this.valuation.getStrategicValue(propertyId, playerId, gameState);
    const roi = this.valuation.getROI(propertyId, gameState);
    const paybackPeriod = this.valuation.getPaybackPeriod(propertyId, gameState);
    
    // Base score from strategic value (normalized to 0-40)
    const valueScore = Math.min(40, (strategicValue.total / 10));
    
    // ROI score (0-30)
    const roiScore = Math.min(30, roi);
    
    // Strategic bonus (0-30)
    const monopolyPotential = this._calculateMonopolyPotential(property, playerId, gameState);
    const completionBonus = strategicValue.breakdown.completionBonus > 0 ? 15 : 0;
    const strategicBonus = completionBonus + (monopolyPotential * 15);
    
    // Risk penalty (-10 to 0)
    const risk = this._assessPropertyRisk(propertyId, gameState);
    const riskPenalty = risk === 'high' ? -10 : risk === 'medium' ? -5 : 0;
    
    return Math.max(0, Math.min(100, valueScore + roiScore + strategicBonus + riskPenalty));
  }

  /**
   * Calculate monopoly potential for a property
   * @private
   */
  _calculateMonopolyPotential(property, playerId, gameState) {
    const colorGroup = property.colorGroup;
    if (!colorGroup) return 0;
    
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    const tilesInGroup = (gameState.tiles || []).filter(t => 
      t.colorGroup === colorGroup && t.type === 'property'
    );
    
    const ownedInGroup = (player.properties || []).filter(p => 
      p.colorGroup === colorGroup
    ).length;
    
    if (tilesInGroup.length === 0) return 0;
    
    // Already has monopoly
    if (ownedInGroup === tilesInGroup.length) return 1;
    
    // Partial ownership
    return ownedInGroup / tilesInGroup.length;
  }

  /**
   * Assess risk level for a property
   * @private
   */
  _assessPropertyRisk(propertyId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return 'unknown';
    
    // High risk: expensive properties with low rent
    const roi = this.valuation.getROI(propertyId, gameState);
    if (roi < 3) return 'high';
    if (roi < 6) return 'medium';
    return 'low';
  }

  /**
   * Calculate urgency for acquiring a property
   * @private
   */
  _calculateUrgency(property, playerId, gameState) {
    const monopolyPotential = this._calculateMonopolyPotential(property, playerId, gameState);
    
    // High urgency if completing monopoly soon
    if (monopolyPotential >= 0.66) return 'critical';
    if (monopolyPotential >= 0.33) return 'high';
    return 'normal';
  }

  /**
   * Generate investment reasoning text
   * @private
   */
  _generateInvestmentReasoning(property, score, strategicValue) {
    const parts = [];
    
    if (strategicValue.breakdown.monopolyBonus > 0) {
      parts.push('Monopoly potential');
    }
    if (strategicValue.breakdown.completionBonus > 0) {
      parts.push('Near completion');
    }
    
    if (parts.length === 0) {
      parts.push('Standard investment');
    }
    
    return parts.join(', ');
  }

  /**
   * Get recommended market action
   * @private
   */
  _getRecommendedMarketAction(signals) {
    if (signals.ownershipRate > 0.8) {
      return 'Hold cash, wait for distressed sellers';
    }
    if (signals.avgCashPerPlayer < 200) {
      return 'Acquire properties from cash-strapped players';
    }
    return 'Balanced approach - invest in key properties';
  }

  /**
   * Get available (unowned) properties
   * @private
   */
  _getAvailableProperties(gameState) {
    const tiles = gameState.tiles || [];
    const ownedPropertyIds = new Set();
    
    for (const player of (gameState.players || [])) {
      for (const prop of (player.properties || [])) {
        ownedPropertyIds.add(prop.id);
      }
    }
    
    return tiles.filter(t => 
      t.type === 'property' && !ownedPropertyIds.has(t.id)
    );
  }

  /**
   * Get property by ID
   * @private
   */
  _getProperty(propertyId, gameState) {
    const tiles = gameState.tiles || [];
    return tiles.find(t => t.id === propertyId) || null;
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
   * Get current player from game state
   * @private
   */
  _getCurrentPlayer(gameState) {
    if (gameState.currentPlayer) return gameState.currentPlayer;
    const players = gameState.players || [];
    return players.find(p => p.isCurrent) || players[0] || null;
  }
}