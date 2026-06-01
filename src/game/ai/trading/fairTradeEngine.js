/**
 * FairTradeEngine - Engine for finding and proposing fair trades
 * 
 * Provides trade opportunity discovery, fair value calculations,
 * and trade negotiation utilities.
 */

import { TradeEvaluator } from './tradeEvaluator.js';

export class FairTradeEngine {
  /**
   * @param {object} memoryLayer - AIMemoryLayer instance
   * @param {object} embeddingIndex - EmbeddingIndex for similarity search
   */
  constructor(memoryLayer, embeddingIndex = null) {
    this.memoryLayer = memoryLayer;
    this.embeddingIndex = embeddingIndex;
    this.evaluator = new TradeEvaluator(memoryLayer);
  }

  /**
   * Find potential trade opportunities for a player
   * @param {string} playerId - Player seeking trades
   * @param {object} gameState - Current game state
   * @returns {Array} Array of {partnerId, trade, fairness} objects
   */
  findTradeOpportunities(playerId, gameState) {
    const opportunities = [];
    const playerProperties = this.getPlayerProperties(playerId, gameState);
    const playerNeeds = this.analyzePlayerNeeds(playerId, gameState);
    
    // Find compatible partners
    const partners = this.findCompatiblePartners(playerId, gameState);
    
    for (const partnerId of partners) {
      const partnerProperties = this.getPlayerProperties(partnerId, gameState);
      const partnerNeeds = this.analyzePlayerNeeds(partnerId, gameState);
      
      // Check if there's potential for mutual benefit
      const mutualBenefit = this.findMutualBenefit(
        playerId, playerProperties, playerNeeds,
        partnerId, partnerProperties, partnerNeeds,
        gameState
      );
      
      if (mutualBenefit) {
        const trade = this.buildTradeProposal(playerId, partnerId, mutualBenefit, gameState);
        const fairness = this.evaluator.evaluateFairness(trade.offered, trade.requested, gameState);
        
        opportunities.push({
          partnerId,
          trade,
          fairness,
        });
      }
    }
    
    // Sort by fairness (most fair first)
    opportunities.sort((a, b) => b.fairness - a.fairness);
    
    return opportunities;
  }

  /**
   * Find players with complementary property needs
   * @param {string} playerId - Player to find partners for
   * @param {object} gameState - Current game state
   * @returns {Array} Array of compatible partner player IDs
   */
  findCompatiblePartners(playerId, gameState) {
    const partners = [];
    
    if (!gameState.players) return partners;
    
    const playerProperties = this.getPlayerProperties(playerId, gameState);
    const playerColors = this.getPropertyColors(playerProperties);
    
    for (const player of gameState.players) {
      if (player.id === playerId) continue;
      
      const partnerProperties = this.getPlayerProperties(player.id, gameState);
      const partnerColors = this.getPropertyColors(partnerProperties);
      
      // Check for complementary needs (partner has what player needs or vice versa)
      const playerNeedsPartnerHas = playerColors.filter(c => partnerColors.includes(c));
      const partnerNeedsPlayerHas = playerColors.filter(c => playerColors.includes(c));
      
      // Also consider money needs
      const playerLowMoney = this.isPlayerLowOnMoney(playerId, gameState);
      const partnerLowMoney = this.isPlayerLowOnMoney(player.id, gameState);
      
      // Compatible if:
      // 1. They have complementary colors (can form monopolies)
      // 2. One has money and other has properties (or vice versa)
      if (playerNeedsPartnerHas.length > 0 || partnerNeedsPlayerHas.length > 0 ||
          (playerLowMoney && partnerProperties.length > 0) ||
          (partnerLowMoney && playerProperties.length > 0)) {
        partners.push(player.id);
      }
    }
    
    return partners;
  }

  /**
   * Propose a trade between two players
   * @param {string} proposerId - Player proposing the trade
   * @param {string} partnerId - Player receiving the proposal
   * @param {object} offer - {properties: [], money: Number} What proposer offers
   * @param {object} request - {properties: [], money: Number} What proposer wants
   * @param {object} gameState - Current game state
   * @returns {object} {trade, fairness, tips}
   */
  proposeTrade(proposerId, partnerId, offer, request, gameState) {
    const trade = {
      players: [proposerId, partnerId],
      offered: offer,
      requested: request,
      timestamp: Date.now(),
    };
    
    const evaluation = this.evaluator.evaluateTrade(trade, proposerId, gameState);
    const tips = this.generateTradeTips(trade, proposerId, gameState);
    
    return {
      trade,
      fairness: evaluation.fairness,
      bias: evaluation.bias,
      health: evaluation.health,
      tips,
    };
  }

  /**
   * Auto-negotiate to iteratively improve trade fairness
   * @param {object} trade - Initial trade object
   * @param {number} iterations - Max negotiation iterations (default 5)
   * @returns {object} {trade, fairness, iterations}
   */
  autoNegotiate(trade, iterations = 5) {
    let currentTrade = { ...trade };
    let currentFairness = this.evaluator.evaluateFairness(
      currentTrade.offered, currentTrade.requested, {}
    );
    
    for (let i = 0; i < iterations && currentFairness < 0.95; i++) {
      const improvement = this.findTradeImprovement(currentTrade);
      
      if (!improvement) break;
      
      // Apply improvement
      if (improvement.addMoney) {
        if (improvement.target === 'offered') {
          currentTrade.offered.money = (currentTrade.offered.money || 0) + improvement.addMoney;
        } else {
          currentTrade.requested.money = (currentTrade.requested.money || 0) + improvement.addMoney;
        }
      }
      
      if (improvement.removeProperty) {
        const props = currentTrade[improvement.target]?.properties || [];
        const idx = props.indexOf(improvement.removeProperty);
        if (idx !== -1) {
          currentTrade[improvement.target].properties.splice(idx, 1);
        }
      }
      
      if (improvement.addProperty) {
        const props = currentTrade[improvement.target]?.properties || [];
        props.push(improvement.addProperty);
      }
      
      currentFairness = this.evaluator.evaluateFairness(
        currentTrade.offered, currentTrade.requested, {}
      );
    }
    
    return {
      trade: currentTrade,
      fairness: currentFairness,
      iterations: iterations,
    };
  }

  /**
   * Calculate fair value of a single property
   * @param {string} propertyId - Property identifier
   * @param {object} gameState - Current game state
   * @returns {number} Property value
   */
  calculatePropertyValue(propertyId, gameState) {
    return this.evaluator.calculatePropertyValue(propertyId, gameState);
  }

  /**
   * Calculate total value of a property bundle
   * @param {Array} propertyIds - Array of property IDs
   * @param {object} gameState - Current game state
   * @returns {number} Total bundle value
   */
  calculateBundleValue(propertyIds, gameState) {
    return this.evaluator.calculateEquityValue(propertyIds, gameState);
  }

  // --- Helper methods ---

  /**
   * Get all properties owned by a player
   */
  getPlayerProperties(playerId, gameState) {
    const properties = [];
    if (gameState.properties) {
      for (const prop of gameState.properties) {
        if (prop.owner === playerId) {
          properties.push(prop.id);
        }
      }
    }
    return properties;
  }

  /**
   * Analyze what a player needs (colors, money, etc.)
   */
  analyzePlayerNeeds(playerId, gameState) {
    const needs = {
      colors: new Set(),
      money: 0,
      properties: [],
    };
    
    const owned = this.getPlayerProperties(playerId, gameState);
    
    // Check which color groups are incomplete
    const colorGroups = {
      'brown': ['mediterranean_ave', 'baltic_ave'],
      'light_blue': ['oriental_ave', 'vermont_ave', 'connecticut_ave'],
      'pink': ['st_charles_place', 'states_ave', 'virginia_ave'],
      'orange': ['st_james_place', 'tennessee_ave', 'new_york_ave'],
      'red': ['kentucky_ave', 'indiana_ave', 'illinois_ave'],
      'yellow': ['atlantic_ave', 'ventnor_ave', 'marvin_gardens'],
      'green': ['pacific_ave', 'north_carolina_ave', 'pennsylvania_ave'],
      'dark_blue': ['park_place', 'boardwalk'],
    };
    
    for (const [color, props] of Object.entries(colorGroups)) {
      const ownedInGroup = props.filter(p => owned.includes(p));
      if (ownedInGroup.length > 0 && ownedInGroup.length < props.length) {
        // Partially owned - need remaining properties
        const needed = props.filter(p => !owned.includes(p));
        needed.forEach(p => needs.colors.add(p));
      }
    }
    
    // Check money situation
    const player = gameState.players?.find(p => p.id === playerId);
    if (player) {
      needs.money = player.money || 0;
    }
    
    return needs;
  }

  /**
   * Get color groups for properties
   */
  getPropertyColors(propertyIds) {
    const colorGroups = {
      'brown': ['mediterranean_ave', 'baltic_ave'],
      'light_blue': ['oriental_ave', 'vermont_ave', 'connecticut_ave'],
      'pink': ['st_charles_place', 'states_ave', 'virginia_ave'],
      'orange': ['st_james_place', 'tennessee_ave', 'new_york_ave'],
      'red': ['kentucky_ave', 'indiana_ave', 'illinois_ave'],
      'yellow': ['atlantic_ave', 'ventnor_ave', 'marvin_gardens'],
      'green': ['pacific_ave', 'north_carolina_ave', 'pennsylvania_ave'],
      'dark_blue': ['park_place', 'boardwalk'],
    };
    
    const colors = new Set();
    for (const propId of propertyIds) {
      for (const [color, props] of Object.entries(colorGroups)) {
        if (props.includes(propId)) {
          colors.add(color);
        }
      }
    }
    return Array.from(colors);
  }

  /**
   * Check if player is low on money
   */
  isPlayerLowOnMoney(playerId, gameState) {
    const player = gameState.players?.find(p => p.id === playerId);
    return player && (player.money || 0) < 500;
  }

  /**
   * Find mutual benefit opportunities between two players
   */
  findMutualBenefit(playerAId, playerAProps, playerANeeds, playerBId, playerBProps, playerBNeeds, gameState) {
    const benefit = { giveA: [], giveB: [], moneyA: 0, moneyB: 0 };
    
    // Find properties A has that B needs (completing B's monopoly)
    for (const prop of playerAProps) {
      if (playerBNeeds.colors.has(prop)) {
        benefit.giveA.push(prop);
      }
    }
    
    // Find properties B has that A needs (completing A's monopoly)
    for (const prop of playerBProps) {
      if (playerANeeds.colors.has(prop)) {
        benefit.giveB.push(prop);
      }
    }
    
    // If no complementary properties found, no mutual benefit
    if (benefit.giveA.length === 0 && benefit.giveB.length === 0) {
      return null;
    }
    
    return benefit;
  }

  /**
   * Build a trade proposal from mutual benefit analysis
   */
  buildTradeProposal(proposerId, partnerId, mutualBenefit, gameState) {
    return {
      players: [proposerId, partnerId],
      offered: {
        properties: mutualBenefit.giveA,
        money: mutualBenefit.moneyA,
      },
      requested: {
        properties: mutualBenefit.giveB,
        money: mutualBenefit.moneyB,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Find a single improvement to make trade more fair
   */
  findTradeImprovement(trade) {
    const offeredValue = this.evaluator.calculateEquityValue(trade.offered?.properties || [], {}) + (trade.offered?.money || 0);
    const requestedValue = this.evaluator.calculateEquityValue(trade.requested?.properties || [], {}) + (trade.requested?.money || 0);
    
    const diff = offeredValue - requestedValue;
    
    // If offering side is too high, need to balance
    if (Math.abs(diff) < 10) return null; // Already fair enough
    
    if (diff > 0) {
      // Offered side is worth more - can add money to requested side or remove from offered
      return {
        target: 'requested',
        addMoney: diff,
      };
    } else {
      return {
        target: 'offered',
        addMoney: -diff,
      };
    }
  }

  /**
   * Generate tips for a trade
   */
  generateTradeTips(trade, playerId, gameState) {
    const tips = [];
    const evaluation = this.evaluator.evaluateTrade(trade, playerId, gameState);
    
    if (evaluation.health === 'unfair') {
      tips.push('This trade is significantly unbalanced. Consider renegotiating.');
    }
    
    if (evaluation.health === 'one-sided') {
      tips.push('This trade favors one side heavily. Add properties or money to balance.');
    }
    
    if (evaluation.recommendedAdjustments?.length > 0) {
      for (const adj of evaluation.recommendedAdjustments) {
        tips.push(adj.message);
      }
    }
    
    // Check monopoly implications
    const playerOffered = trade.offered?.properties || [];
    const colorGroups = {
      'brown': ['mediterranean_ave', 'baltic_ave'],
      'light_blue': ['oriental_ave', 'vermont_ave', 'connecticut_ave'],
      'pink': ['st_charles_place', 'states_ave', 'virginia_ave'],
      'orange': ['st_james_place', 'tennessee_ave', 'new_york_ave'],
      'red': ['kentucky_ave', 'indiana_ave', 'illinois_ave'],
      'yellow': ['atlantic_ave', 'ventnor_ave', 'marvin_gardens'],
      'green': ['pacific_ave', 'north_carolina_ave', 'pennsylvania_ave'],
      'dark_blue': ['park_place', 'boardwalk'],
    };
    
    for (const [color, props] of Object.entries(colorGroups)) {
      const owned = gameState.properties?.filter(p => p.owner === playerId && props.includes(p.id))?.map(p => p.id) || [];
      const inTrade = playerOffered.filter(p => props.includes(p));
      
      if (owned.length === props.length && inTrade.length > 0) {
        tips.push(`Caution: Trading away your ${color} monopoly can reduce your rent income.`);
      }
    }
    
    return tips;
  }
}