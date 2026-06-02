/**
 * PortfolioBuilder - Build Optimal Property Portfolios
 * 
 * Constructs and maintains optimal property portfolios based on
 * investment goals, risk tolerance, and market conditions.
 */

import { PropertyValuation } from '../property/propertyValuation.js';

export class PortfolioBuilder {
  constructor() {
    this.valuation = new PropertyValuation();
    
    // Target allocation by color group
    this.targetAllocation = {
      brown: 0.05,
      lightBlue: 0.08,
      pink: 0.10,
      orange: 0.15,
      red: 0.18,
      yellow: 0.15,
      green: 0.12,
      darkBlue: 0.10,
      railroad: 0.05,
      utility: 0.02,
    };
    
    // Minimum portfolio size for effectiveness
    this.minPortfolioSize = 3;
    this.maxConcentration = 0.4; // Max 40% in single group
  }

  /**
   * Build optimal portfolio for a player
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Optimal portfolio composition
   */
  buildOptimalPortfolio(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { portfolio: [], score: 0, missingGroups: [], recommendations: [] };
    }
    
    const currentPortfolio = player.properties || [];
    const availableProperties = this._getAvailableProperties(gameState);
    
    // Analyze current holdings
    const currentAnalysis = this._analyzeCurrentHoldings(currentPortfolio, gameState);
    
    // Calculate ideal portfolio
    const idealPortfolio = this._buildIdealAllocation(player, gameState);
    
    // Gap analysis
    const gaps = this._analyzeGaps(currentPortfolio, idealPortfolio, gameState);
    
    // Find best properties to fill gaps
    const acquisitionTargets = this._findAcquisitionTargets(gaps, availableProperties, player, gameState);
    
    // Calculate portfolio score
    const score = this._calculatePortfolioScore(currentPortfolio, gameState);
    
    return {
      currentCount: currentPortfolio.length,
      idealCount: idealPortfolio.length,
      currentAnalysis,
      gaps,
      acquisitionTargets,
      score,
      diversificationStatus: this._getDiversificationStatus(currentPortfolio),
      recommendations: this._generatePortfolioRecommendations(currentPortfolio, gaps, acquisitionTargets),
    };
  }

  /**
   * Suggest next best property addition
   * @param {Array} currentPortfolio - Current property IDs
   * @param {object} gameState - Current game state
   * @returns {object} Suggestion with reasoning
   */
  suggestPropertyAddition(currentPortfolio, gameState) {
    const availableProperties = this._getAvailableProperties(gameState);
    if (availableProperties.length === 0) {
      return { suggestion: null, reasoning: 'No properties available', score: 0 };
    }
    
    // Score each available property
    const scoredProperties = availableProperties.map(property => {
      const strategicValue = this.valuation.getStrategicValue(property.id, currentPortfolio.ownerId || 'unknown', gameState);
      const roi = this.valuation.getROI(property.id, gameState);
      const gapFilling = this._calculatesGapFilling(property, currentPortfolio, gameState);
      
      // Combined score
      const score = (strategicValue.total * 0.4) + (roi * 2) + (gapFilling * 30);
      
      return {
        propertyId: property.id,
        propertyName: property.name,
        colorGroup: property.colorGroup,
        price: property.price,
        score,
        strategicValue: strategicValue.total,
        roi,
        gapFilling,
        reasoning: this._generateAdditionReasoning(property, strategicValue, gapFilling),
      };
    });
    
    // Sort by score
    scoredProperties.sort((a, b) => b.score - a.score);
    
    const best = scoredProperties[0];
    
    return {
      suggestion: {
        propertyId: best.propertyId,
        propertyName: best.propertyName,
        colorGroup: best.colorGroup,
        price: best.price,
      },
      reasoning: best.reasoning,
      score: best.score,
      alternatives: scoredProperties.slice(1, 4).map(p => ({
        propertyId: p.propertyId,
        propertyName: p.propertyName,
        score: p.score,
      })),
    };
  }

  /**
   * Check if portfolio needs rebalancing
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {boolean} True if rebalancing needed
   */
  needsRebalancing(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return false;
    
    const portfolio = player.properties || [];
    
    // Check concentration
    const concentrationCheck = this._checkConcentration(portfolio);
    if (concentrationCheck.needsRebalancing) return true;
    
    // Check diversification
    const uniqueGroups = new Set(portfolio.map(p => p.colorGroup)).size;
    if (portfolio.length >= this.minPortfolioSize && uniqueGroups < 3) return true;
    
    // Check if missing key groups based on game phase
    const turn = gameState.turn || 0;
    if (turn > 20) {
      const missingKeyGroups = this._getMissingKeyGroups(portfolio, gameState);
      if (missingKeyGroups.length > 0) return true;
    }
    
    return false;
  }

  /**
   * Get actions needed to rebalance portfolio
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {Array} List of rebalancing actions
   */
  getRebalancingActions(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return [];
    
    const portfolio = player.properties || [];
    const actions = [];
    
    // Analyze concentration issues
    const concentration = this._checkConcentration(portfolio);
    if (concentration.overConcentratedGroups.length > 0) {
      for (const group of concentration.overConcentratedGroups) {
        actions.push({
          type: 'reduce',
          colorGroup: group,
          reason: `Over-concentrated in ${group} (${concentration.groupPercentages[group]}%)`,
          priority: 'high',
        });
      }
    }
    
    // Analyze missing groups
    const missingGroups = this._getMissingGroups(portfolio, gameState);
    if (missingGroups.length > 0) {
      actions.push({
        type: 'acquire',
        colorGroups: missingGroups,
        reason: `Missing diversification in ${missingGroups.join(', ')}`,
        priority: 'medium',
      });
    }
    
    // Analyze monopolies
    const incompleteMonopolies = this._getIncompleteMonopolies(portfolio, gameState);
    if (incompleteMonopolies.length > 0) {
      for (const mono of incompleteMonopolies) {
        actions.push({
          type: 'complete_monopoly',
          colorGroup: mono.colorGroup,
          missingProperties: mono.missing,
          reason: `Complete ${mono.colorGroup} monopoly - need ${mono.missing.join(', ')}`,
          priority: mono.missing.length === 1 ? 'high' : 'medium',
        });
      }
    }
    
    return actions;
  }

  /**
   * Analyze current holdings
   * @private
   */
  _analyzeCurrentHoldings(portfolio, gameState) {
    const analysis = {
      totalValue: 0,
      totalProperties: portfolio.length,
      byColorGroup: {},
      monopolies: [],
      incompleteSets: [],
      mortgagedProperties: [],
    };
    
    for (const prop of portfolio) {
      const property = this._getProperty(prop.id, gameState);
      if (!property) continue;
      
      // Track value
      const fairValue = this.valuation.getFairValue(prop.id, gameState);
      analysis.totalValue += fairValue;
      
      // Track by color group
      const group = property.colorGroup || 'unknown';
      if (!analysis.byColorGroup[group]) {
        analysis.byColorGroup[group] = [];
      }
      analysis.byColorGroup[group].push({
        id: property.id,
        name: property.name,
        value: fairValue,
      });
      
      // Track mortgaged
      if (prop.mortgaged) {
        analysis.mortgagedProperties.push(property.id);
      }
    }
    
    // Find complete and incomplete sets
    for (const [group, props] of Object.entries(analysis.byColorGroup)) {
      if (group === 'unknown' || group === 'railroad' || group === 'utility') continue;
      
      const tilesInGroup = (gameState.tiles || []).filter(t => t.colorGroup === group);
      if (tilesInGroup.length > 0 && props.length === tilesInGroup.length) {
        analysis.monopolies.push(group);
      } else if (props.length > 0) {
        analysis.incompleteSets.push({
          colorGroup: group,
          owned: props.length,
          total: tilesInGroup.length,
          missing: tilesInGroup.length - props.length,
        });
      }
    }
    
    return analysis;
  }

  /**
   * Build ideal allocation based on player state
   * @private
   */
  _buildIdealAllocation(player, gameState) {
    const ideal = [];
    const money = player.money || 0;
    
    // Scale targets based on available cash
    const affordableGroups = [];
    
    for (const [group, targetPct] of Object.entries(this.targetAllocation)) {
      // Find cheapest property in group
      const groupTiles = (gameState.tiles || []).filter(t => t.colorGroup === group && t.type === 'property');
      if (groupTiles.length === 0) continue;
      
      const cheapestPrice = Math.min(...groupTiles.map(t => t.price || 0));
      const estimatedCost = cheapestPrice * groupTiles.length;
      
      if (estimatedCost <= money * 0.3) { // Can afford ~30% in this group
        affordableGroups.push({ group, targetPct, estimatedCost });
      }
    }
    
    // Normalize targets to 100%
    const totalTarget = affordableGroups.reduce((sum, g) => sum + g.targetPct, 0);
    for (const g of affordableGroups) {
      const normalizedPct = g.targetPct / totalTarget;
      ideal.push({
        colorGroup: g.group,
        targetPercentage: normalizedPct,
        estimatedCost: g.estimatedCost,
      });
    }
    
    return ideal;
  }

  /**
   * Analyze gaps between current and ideal
   * @private
   */
  _analyzeGaps(currentPortfolio, idealPortfolio, gameState) {
    const gaps = {
      underweight: [],
      overweight: [],
      missing: [],
    };
    
    const currentGroups = new Set(
      currentPortfolio.map(p => this._getProperty(p.id, gameState)?.colorGroup).filter(Boolean)
    );
    
    for (const ideal of idealPortfolio) {
      const currentCount = currentPortfolio.filter(p => 
        this._getProperty(p.id, gameState)?.colorGroup === ideal.colorGroup
      ).length;
      
      if (currentCount === 0 && ideal.estimatedCost <= (currentPortfolio[0]?.id ? 1000 : 0)) {
        gaps.missing.push(ideal.colorGroup);
      } else if (currentCount === 0) {
        gaps.underweight.push({
          colorGroup: ideal.colorGroup,
          targetWeight: ideal.targetPercentage,
        });
      }
    }
    
    return gaps;
  }

  /**
   * Find best properties to acquire
   * @private
   */
  _findAcquisitionTargets(gaps, availableProperties, player, gameState) {
    const targets = [];
    
    for (const group of gaps.missing) {
      const groupProperties = availableProperties.filter(p => p.colorGroup === group);
      
      // Sort by price ascending (best value first)
      groupProperties.sort((a, b) => (a.price || 0) - (b.price || 0));
      
      if (groupProperties.length > 0) {
        const cheapest = groupProperties[0];
        targets.push({
          propertyId: cheapest.id,
          propertyName: cheapest.name,
          colorGroup: group,
          price: cheapest.price,
          priority: 'high',
        });
      }
    }
    
    return targets;
  }

  /**
   * Calculate portfolio score
   * @private
   */
  _calculatePortfolioScore(portfolio, gameState) {
    if (portfolio.length === 0) return 0;
    
    let score = 50; // Base score
    
    // Bonus for diversification
    const uniqueGroups = new Set(portfolio.map(p => p.colorGroup)).size;
    score += uniqueGroups * 5;
    
    // Bonus for monopolies
    const analysis = this._analyzeCurrentHoldings(portfolio, gameState);
    score += analysis.monopolies.length * 15;
    
    // Bonus for completed sets
    score += analysis.incompleteSets.filter(s => s.missing === 1).length * 5;
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get diversification status
   * @private
   */
  _getDiversificationStatus(portfolio) {
    if (portfolio.length < this.minPortfolioSize) {
      return { status: 'building', message: 'Portfolio under construction' };
    }
    
    const uniqueGroups = new Set(portfolio.map(p => p.colorGroup)).size;
    
    if (uniqueGroups >= 5) {
      return { status: 'excellent', message: 'Well diversified portfolio' };
    } else if (uniqueGroups >= 3) {
      return { status: 'good', message: 'Adequately diversified' };
    } else {
      return { status: 'poor', message: 'Needs more diversification' };
    }
  }

  /**
   * Generate portfolio recommendations
   * @private
   */
  _generatePortfolioRecommendations(portfolio, gaps, targets) {
    const recommendations = [];
    
    if (gaps.missing.length > 0) {
      recommendations.push({
        type: 'acquire',
        priority: 'high',
        message: `Acquire properties in: ${gaps.missing.join(', ')}`,
      });
    }
    
    if (targets.length > 0) {
      recommendations.push({
        type: 'priority_targets',
        priority: 'high',
        message: `Priority targets: ${targets.map(t => t.propertyName).join(', ')}`,
      });
    }
    
    return recommendations;
  }

  /**
   * Check concentration in portfolio
   * @private
   */
  _checkConcentration(portfolio) {
    const groupCounts = {};
    
    for (const prop of portfolio) {
      const group = prop.colorGroup || 'unknown';
      groupCounts[group] = (groupCounts[group] || 0) + 1;
    }
    
    const total = portfolio.length;
    const groupPercentages = {};
    const overConcentratedGroups = [];
    
    for (const [group, count] of Object.entries(groupCounts)) {
      const pct = count / total;
      groupPercentages[group] = Math.round(pct * 100);
      
      if (pct > this.maxConcentration) {
        overConcentratedGroups.push(group);
      }
    }
    
    return {
      needsRebalancing: overConcentratedGroups.length > 0,
      overConcentratedGroups,
      groupPercentages,
    };
  }

  /**
   * Get missing groups in portfolio
   * @private
   */
  _getMissingGroups(portfolio, gameState) {
    const ownedGroups = new Set(
      portfolio.map(p => this._getProperty(p.id, gameState)?.colorGroup).filter(Boolean)
    );
    
    const allGroups = Object.keys(this.targetAllocation);
    return allGroups.filter(g => !ownedGroups.has(g) && g !== 'railroad' && g !== 'utility');
  }

  /**
   * Get missing key groups (for late game)
   * @private
   */
  _getMissingKeyGroups(portfolio, gameState) {
    const ownedGroups = new Set(
      portfolio.map(p => this._getProperty(p.id, gameState)?.colorGroup).filter(Boolean)
    );
    
    // Key groups are red, yellow, green, dark blue
    const keyGroups = ['red', 'yellow', 'green', 'darkBlue'];
    return keyGroups.filter(g => !ownedGroups.has(g));
  }

  /**
   * Get incomplete monopolies
   * @private
   */
  _getIncompleteMonopolies(portfolio, gameState) {
    const ownedGroups = {};
    
    for (const prop of portfolio) {
      const property = this._getProperty(prop.id, gameState);
      if (!property || !property.colorGroup) continue;
      
      if (!ownedGroups[property.colorGroup]) {
        ownedGroups[property.colorGroup] = [];
      }
      ownedGroups[property.colorGroup].push(property.id);
    }
    
    const incomplete = [];
    
    for (const [group, owned] of Object.entries(ownedGroups)) {
      const tilesInGroup = (gameState.tiles || []).filter(t => t.colorGroup === group);
      const ownedIds = new Set(owned);
      const missing = tilesInGroup.filter(t => !ownedIds.has(t.id)).map(t => t.name);
      
      if (missing.length > 0 && missing.length <= 2) {
        incomplete.push({
          colorGroup: group,
          owned: owned.length,
          total: tilesInGroup.length,
          missing,
        });
      }
    }
    
    return incomplete;
  }

  /**
   * Calculate how much a property fills portfolio gaps
   * @private
   */
  _calculatesGapFilling(property, currentPortfolio, gameState) {
    const group = property.colorGroup;
    if (!group) return 0;
    
    const currentInGroup = currentPortfolio.filter(p => 
      this._getProperty(p.id, gameState)?.colorGroup === group
    ).length;
    
    const tilesInGroup = (gameState.tiles || []).filter(t => t.colorGroup === group).length;
    
    if (tilesInGroup === 0) return 0;
    
    return (currentInGroup + 1) / tilesInGroup;
  }

  /**
   * Generate addition reasoning
   * @private
   */
  _generateAdditionReasoning(property, strategicValue, gapFilling) {
    const parts = [];
    
    if (strategicValue.breakdown.monopolyBonus > 0) {
      parts.push('monopoly opportunity');
    }
    if (gapFilling > 0.5) {
      parts.push('fills portfolio gap');
    }
    if (strategicValue.breakdown.completionBonus > 0) {
      parts.push('near completion');
    }
    
    return parts.length > 0 ? parts.join(', ') : 'good investment';
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
}