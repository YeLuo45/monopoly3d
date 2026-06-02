/**
 * InsuranceManager - AI for Insurance & Risk Management
 * 
 * Makes intelligent decisions about:
 * - Whether to insure properties
 * - Optimal coverage levels
 * - When to file claims
 * - Portfolio risk assessment
 */

export class InsuranceManager {
  constructor(memoryLayer) {
    this.memoryLayer = memoryLayer;
    
    // Insurance portfolio: playerId -> Map<propertyId, insurancePolicy>
    this.portfolio = new Map();
    
    // Premium rates by property type (percentage of property value per turn)
    this.premiumRates = {
      brown: 0.015,
      lightBlue: 0.018,
      pink: 0.020,
      orange: 0.022,
      red: 0.025,
      yellow: 0.027,
      green: 0.030,
      darkBlue: 0.035,
      railroad: 0.010,
      utility: 0.015,
    };
    
    // Coverage ratios (percentage of property value covered)
    this.coverageLevels = {
      basic: 0.50,
      standard: 0.75,
      premium: 0.90,
      full: 1.00,
    };
    
    // Claim deductible percentage
    this.deductibleRate = 0.10;
    
    // Risk thresholds
    this.riskThresholds = {
      low: 0.25,
      medium: 0.50,
      high: 0.75,
    };
  }

  /**
   * Determine if a property should be insured
   * @param {string} propertyId - Property to evaluate
   * @param {object} gameState - Current game state
   * @returns {{should: boolean, premium: number, coverage: number, reason: string}}
   */
  shouldInsureProperty(propertyId, gameState) {
    const property = this._findProperty(propertyId, gameState);
    if (!property) {
      return { should: false, premium: 0, coverage: 0, reason: 'Property not found' };
    }
    
    const player = this._getPlayerById(property.ownerId, gameState);
    if (!player) {
      return { should: false, premium: 0, coverage: 0, reason: 'No owner found' };
    }
    
    // Check if already insured
    if (this.isPropertyInsured(propertyId, player.id)) {
      return { should: false, premium: 0, coverage: 0, reason: 'Already insured' };
    }
    
    // Calculate risk score
    const riskScore = this.getPropertyRiskScore(propertyId, gameState);
    
    // Calculate premium
    const premium = this._calculatePremium(property, gameState);
    
    // Determine optimal coverage
    const coverage = this.getOptimalCoverageLevel(propertyId, gameState);
    const coverageAmount = property.price * coverage;
    
    // Decision logic
    const shouldInsure = this._shouldInsureDecision(riskScore, premium, player, property, gameState);
    
    return {
      should: shouldInsure,
      premium,
      coverage: coverageAmount,
      coverageLevel: coverage,
      riskScore,
      reason: shouldInsure 
        ? `High risk property (${(riskScore * 100).toFixed(0)}%), coverage justified`
        : `Low risk (${(riskScore * 100).toFixed(0)}%), self-insurance preferred`,
    };
  }

  /**
   * Get optimal coverage level for a property
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {number} Coverage ratio (0-1)
   */
  getOptimalCoverageLevel(propertyId, gameState) {
    const property = this._findProperty(propertyId, gameState);
    if (!property) return 0;
    
    const riskScore = this.getPropertyRiskScore(propertyId, gameState);
    const player = this._getPlayerById(property.ownerId, gameState);
    
    if (!player) return 0;
    
    // High-value properties or high-risk get premium coverage
    const propertyValue = property.price + (property.houses || 0) * (property.houseCost || 0);
    const valueRatio = Math.min(propertyValue / 500, 1); // Cap at 500 value ratio
    
    // Risk-weighted decision
    const combinedScore = (riskScore * 0.6) + (valueRatio * 0.4);
    
    if (combinedScore >= 0.70) return this.coverageLevels.premium;
    if (combinedScore >= 0.45) return this.coverageLevels.standard;
    if (combinedScore >= 0.25) return this.coverageLevels.basic;
    return this.coverageLevels.basic;
  }

  /**
   * Get all insured properties for a player
   * @param {string} playerId - Player ID
   * @returns {Array} List of insured properties with policy details
   */
  getInsurancePortfolio(playerId) {
    const playerPolicies = this.portfolio.get(playerId);
    if (!playerPolicies) return [];
    
    return Array.from(playerPolicies.values()).map(policy => ({
      propertyId: policy.propertyId,
      premium: policy.premium,
      coverage: policy.coverage,
      coverageLevel: policy.coverageLevel,
      startTurn: policy.startTurn,
      claims: policy.claims || [],
    }));
  }

  /**
   * Check if a property is currently insured
   * @param {string} propertyId - Property ID
   * @param {string} playerId - Player ID
   * @returns {boolean}
   */
  isPropertyInsured(propertyId, playerId) {
    const playerPolicies = this.portfolio.get(playerId);
    if (!playerPolicies) return false;
    return playerPolicies.has(propertyId);
  }

  /**
   * Purchase insurance for a property
   * @param {string} propertyId - Property ID
   * @param {string} playerId - Player ID
   * @param {number} coverageLevel - Coverage level ratio
   * @param {number} premium - Premium amount per turn
   * @param {object} gameState - Current game state
   */
  purchaseInsurance(propertyId, playerId, coverageLevel, premium, gameState) {
    const property = this._findProperty(propertyId, gameState);
    if (!property) return false;
    
    const coverage = property.price * coverageLevel;
    
    if (!this.portfolio.has(playerId)) {
      this.portfolio.set(playerId, new Map());
    }
    
    const playerPolicies = this.portfolio.get(playerId);
    playerPolicies.set(propertyId, {
      propertyId,
      premium,
      coverage,
      coverageLevel,
      startTurn: gameState.turn || 0,
      claims: [],
      deductible: property.price * this.deductibleRate,
    });
    
    return true;
  }

  /**
   * Determine if a claim should be filed
   * @param {string} propertyId - Property ID
   * @param {number} damageAmount - Damage amount to claim
   * @param {object} gameState - Current game state
   * @returns {{should: boolean, amount: number, reason: string}}
   */
  shouldFileClaim(propertyId, damageAmount, gameState) {
    const player = this._getCurrentPlayer(gameState);
    if (!player) {
      return { should: false, amount: 0, reason: 'No player found' };
    }
    
    const policy = this._getPolicy(propertyId, player.id);
    if (!policy) {
      return { should: false, amount: 0, reason: 'No insurance policy' };
    }
    
    // Check if damage exceeds deductible
    if (damageAmount <= policy.deductible) {
      return { 
        should: false, 
        amount: 0, 
        reason: `Damage ($${damageAmount}) below deductible ($${policy.deductible})` 
      };
    }
    
    // Calculate claim amount (coverage minus deductible, capped at coverage limit)
    const claimAmount = Math.min(damageAmount - policy.deductible, policy.coverage);
    
    // Don't file small claims - maintain no-claims bonus concept
    const smallClaimThreshold = policy.premium * 3;
    if (claimAmount < smallClaimThreshold) {
      return { 
        should: false, 
        amount: 0, 
        reason: `Claim amount ($${claimAmount}) not worth filing (premium: $${policy.premium})` 
      };
    }
    
    return {
      should: true,
      amount: claimAmount,
      reason: `Damage ($${damageAmount}) exceeds deductible ($${policy.deductible}), claiming $${claimAmount}`,
    };
  }

  /**
   * Estimate expected claim value for a property
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {number} Expected claim value per turn
   */
  estimateClaimValue(propertyId, gameState) {
    const property = this._findProperty(propertyId, gameState);
    if (!property) return 0;
    
    const riskScore = this.getPropertyRiskScore(propertyId, gameState);
    const policy = this._getPolicy(propertyId, property.ownerId);
    
    if (!policy) return 0;
    
    // Expected loss = probability of incident * expected damage * coverage
    const incidentProbability = riskScore * 0.1; // Base rate
    const expectedDamage = property.price * 0.3; // Typical damage ratio
    const expectedClaim = incidentProbability * expectedDamage * policy.coverageLevel;
    
    return expectedClaim;
  }

  /**
   * Get risk score for a property (0-1)
   * @param {string} propertyId - Property ID
   * @param {object} gameState - Current game state
   * @returns {number} Risk score 0-1
   */
  getPropertyRiskScore(propertyId, gameState) {
    const property = this._findProperty(propertyId, gameState);
    if (!property) return 0;
    
    const tile = gameState.tiles.find(t => t.id === propertyId);
    const owner = this._getPlayerById(property.ownerId, gameState);
    
    if (!owner) return 0;
    
    // Base risk from property type/color
    const colorGroup = property.colorGroup || 'brown';
    const baseRisk = this._getColorGroupRisk(colorGroup);
    
    // Risk from opponent presence on tile
    const opponentLandingRisk = this._getOpponentLandingRisk(propertyId, gameState);
    
    // Risk from property value (higher value = higher risk)
    const valueRisk = Math.min((property.price || 0) / 400, 1) * 0.2;
    
    // Risk from number of opponents still in game
    const activeOpponents = gameState.players.filter(p => p.money > 0 && p.id !== owner.id);
    const opponentRisk = Math.min(activeOpponents.length / 4, 1) * 0.2;
    
    // House/development risk (more houses = higher risk but also higher reward)
    const developmentRisk = (property.houses || 0) > 0 ? 0.15 : 0;
    
    // Combine risks
    const totalRisk = baseRisk + opponentLandingRisk + valueRisk + opponentRisk + developmentRisk;
    
    return Math.min(totalRisk, 1);
  }

  /**
   * Get total portfolio risk for a player
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {{score: number, insuredValue: number, uninsuredValue: number, riskFactors: Array}}
   */
  getTotalPortfolioRisk(playerId, gameState) {
    const player = this._getPlayerById(playerId, gameState);
    if (!player) return { score: 0, insuredValue: 0, uninsuredValue: 0, riskFactors: [] };
    
    const properties = player.properties || [];
    const riskFactors = [];
    
    let totalInsuredValue = 0;
    let totalUninsuredValue = 0;
    let totalRiskScore = 0;
    
    for (const prop of properties) {
      const property = this._findProperty(prop.id, gameState);
      if (!property) continue;
      
      const riskScore = this.getPropertyRiskScore(prop.id, gameState);
      const propertyValue = property.price + (property.houses || 0) * (property.houseCost || 0);
      const isInsured = this.isPropertyInsured(prop.id, playerId);
      
      if (isInsured) {
        totalInsuredValue += propertyValue;
      } else {
        totalUninsuredValue += propertyValue;
        totalRiskScore += riskScore * propertyValue;
      }
      
      if (riskScore > 0.5) {
        riskFactors.push({
          propertyId: prop.id,
          name: property.name,
          riskScore,
          reason: 'High landing probability or high value',
        });
      }
    }
    
    // Weighted risk score
    const exposure = totalUninsuredValue || 1;
    const weightedRisk = totalRiskScore / exposure;
    
    return {
      score: Math.min(weightedRisk, 1),
      insuredValue: totalInsuredValue,
      uninsuredValue: totalUninsuredValue,
      riskFactors: riskFactors.sort((a, b) => b.riskScore - a.riskScore),
      recommendation: weightedRisk > 0.5 
        ? 'Consider insuring high-value properties' 
        : 'Portfolio risk is acceptable',
    };
  }

  // Helper methods
  
  _findProperty(propertyId, gameState) {
    const id = typeof propertyId === 'object' ? propertyId.id : propertyId;
    return gameState.tiles?.find(t => t.id === id && t.type === 'property');
  }
  
  _getPlayerById(playerId, gameState) {
    return gameState.players?.find(p => p.id === playerId);
  }
  
  _getCurrentPlayer(gameState) {
    return this._getPlayerById(gameState.currentPlayerId, gameState);
  }
  
  _getPolicy(propertyId, playerId) {
    const playerPolicies = this.portfolio.get(playerId);
    if (!playerPolicies) return null;
    return playerPolicies.get(propertyId);
  }
  
  _calculatePremium(property, gameState) {
    const colorGroup = property.colorGroup || 'brown';
    const baseRate = this.premiumRates[colorGroup] || 0.02;
    
    // Adjust for houses/development
    const developmentMultiplier = 1 + (property.houses || 0) * 0.1;
    
    // Adjust for game phase (later = higher risk of landing)
    const gamePhase = (gameState.turn || 0) / 40; // Assume 40 turns average
    const phaseMultiplier = 1 + gamePhase * 0.3;
    
    return Math.round(property.price * baseRate * developmentMultiplier * phaseMultiplier);
  }
  
  _getColorGroupRisk(colorGroup) {
    const riskMap = {
      brown: 0.15,
      lightBlue: 0.18,
      pink: 0.20,
      orange: 0.22,
      red: 0.25,
      yellow: 0.27,
      green: 0.30,
      darkBlue: 0.35,
      railroad: 0.12,
      utility: 0.18,
    };
    return riskMap[colorGroup] || 0.20;
  }
  
  _getOpponentLandingRisk(propertyId, gameState) {
    // Estimate based on property position and typical dice distributions
    const property = this._findProperty(propertyId, gameState);
    if (!property) return 0;
    
    // Properties in the middle of the board (positions 6-14) have higher landing rates
    const tileIndex = gameState.tiles?.findIndex(t => t.id === propertyId) || 0;
    const normalizedPosition = tileIndex / 40;
    
    // Higher landing probability in middle positions
    if (normalizedPosition > 0.15 && normalizedPosition < 0.35) {
      return 0.15;
    }
    if (normalizedPosition > 0.35 && normalizedPosition < 0.65) {
      return 0.20;
    }
    
    return 0.10;
  }
  
  _shouldInsureDecision(riskScore, premium, player, property, gameState) {
    // Don't insure if player is low on cash
    if (player.money < 200) return false;
    
    // Don't insure brown properties (low value, low risk)
    if (property.colorGroup === 'brown' && riskScore < 0.4) return false;
    
    // Insure dark blue and high-risk properties
    if (riskScore > 0.6) return true;
    
    // Insure if premium is less than 5% of player money and property is medium-high risk
    if (riskScore > 0.4 && premium < player.money * 0.05) return true;
    
    return false;
  }
}