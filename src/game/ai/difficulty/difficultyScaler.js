/**
 * Difficulty Scaler
 * 
 * Scales game parameters based on difficulty level to provide
 * appropriate challenge for players. Part of the Dynamic Difficulty
 * Adjustment System (Direction E v6).
 */

import { DynamicDifficultyEngine } from './dynamicDifficultyEngine.js';

export class DifficultyScaler {
  /**
   * @param {DynamicDifficultyEngine} difficultyEngine - The difficulty engine instance
   */
  constructor(difficultyEngine) {
    this.difficultyEngine = difficultyEngine;
    
    // Difficulty level definitions with scaling parameters
    this.difficultyParams = {
      // Very Easy - beginner-friendly, generous mechanics
      very_easy: {
        aiErrorRate: 0.35,           // AI makes more mistakes
        rentMultiplier: 0.5,          // Pay less rent
        purchaseCostReduction: 0.2,   // 20% cheaper property purchases
        moneyBonus: 500,              // Starting bonus money
        chanceBonus: 0.15,            // Better chance card odds
        jailEscapeRate: 0.8,         // 80% chance to roll doubles
        bankruptcyProtection: true,   // Protect from bankruptcy once
        auctionDiscount: 0.3,         // 30% off auctions
        passGoBonus: 250,             // Extra pass-go money
      },
      
      // Easy - supportive, some advantages
      easy: {
        aiErrorRate: 0.25,
        rentMultiplier: 0.7,
        purchaseCostReduction: 0.1,
        moneyBonus: 250,
        chanceBonus: 0.1,
        jailEscapeRate: 0.6,
        bankruptcyProtection: false,
        auctionDiscount: 0.15,
        passGoBonus: 100,
      },
      
      // Normal - balanced gameplay (default)
      normal: {
        aiErrorRate: 0.15,
        rentMultiplier: 1.0,
        purchaseCostReduction: 0,
        moneyBonus: 0,
        chanceBonus: 0,
        jailEscapeRate: 0.35,        // ~1/3 probability (2 dice)
        bankruptcyProtection: false,
        auctionDiscount: 0,
        passGoBonus: 0,
      },
      
      // Hard - challenging, fewer advantages
      hard: {
        aiErrorRate: 0.08,
        rentMultiplier: 1.2,
        purchaseCostReduction: -0.1,  // 10% more expensive
        moneyBonus: -100,
        chanceBonus: -0.05,
        jailEscapeRate: 0.2,
        bankruptcyProtection: false,
        auctionDiscount: 0,
        passGoBonus: -50,
      },
      
      // Very Hard - expert-level challenge
      very_hard: {
        aiErrorRate: 0.03,
        rentMultiplier: 1.4,
        purchaseCostReduction: -0.2,
        moneyBonus: -250,
        chanceBonus: -0.1,
        jailEscapeRate: 0.15,
        bankruptcyProtection: false,
        auctionDiscount: 0,
        passGoBonus: -100,
      },
    };
  }

  /**
   * Scale a base value by difficulty level
   * @param {number} baseValue - The base value to scale
   * @param {string} difficulty - Difficulty level (very_easy, easy, normal, hard, very_hard)
   * @param {string} paramType - Type of parameter to scale
   * @returns {number} Scaled value
   */
  getScaledValue(baseValue, difficulty, paramType = 'neutral') {
    const params = this.getDifficultyParams(difficulty);
    
    // Apply scaling based on parameter type
    switch (paramType) {
      case 'cost_reduction':
        // Negative means increase cost, so subtract from 1
        return baseValue * (1 - params.purchaseCostReduction);
        
      case 'rent':
        return baseValue * params.rentMultiplier;
        
      case 'money':
        return baseValue + params.moneyBonus;
        
      case 'pass_go':
        return baseValue + 200 + params.passGoBonus; // base 200
        
      case 'auction':
        return baseValue * (1 - params.auctionDiscount);
        
      default:
        // Neutral scaling - minimal adjustment
        return baseValue;
    }
  }

  /**
   * Scale a probability by difficulty level
   * @param {number} baseProb - Base probability (0-1)
   * @param {string} difficulty - Difficulty level
   * @param {string} probType - Type of probability
   * @returns {number} Scaled probability (clamped 0-1)
   */
  getScaledProbability(baseProb, difficulty, probType = 'chance') {
    const params = this.getDifficultyParams(difficulty);
    
    switch (probType) {
      case 'chance':
        // Chance events - positive bonus means better odds
        return this._clamp(baseProb + params.chanceBonus, 0, 1);
        
      case 'jail_escape':
        // Jail escape - positive bonus means easier escape
        return this._clamp(params.jailEscapeRate, 0, 1);
        
      case 'ai_error':
        // AI error rate - higher = easier for player
        return params.aiErrorRate;
        
      case 'bankruptcy':
        // Bankruptcy protection
        return params.bankruptcyProtection ? 1 : 0;
        
      default:
        return baseProb;
    }
  }

  /**
   * Get difficulty parameters for a level
   * @param {string} difficulty - Difficulty level name
   * @returns {Object} Difficulty parameters
   */
  getDifficultyParams(difficulty) {
    return this.difficultyParams[difficulty] || this.difficultyParams.normal;
  }

  /**
   * Get all difficulty levels
   * @returns {Array} Array of difficulty level names
   */
  getDifficultyLevels() {
    return Object.keys(this.difficultyParams);
  }

  /**
   * Get scaled rent for a property
   * @param {number} baseRent - Base rent amount
   * @param {string} playerId - Player identifier (for difficulty lookup)
   * @returns {number} Scaled rent
   */
  getScaledRent(baseRent, playerId) {
    const difficulty = this.difficultyEngine.getDifficulty(playerId);
    return Math.round(this.getScaledValue(baseRent, difficulty, 'rent'));
  }

  /**
   * Get scaled property purchase price
   * @param {number} basePrice - Base property price
   * @param {string} playerId - Player identifier
   * @returns {number} Scaled price
   */
  getScaledPrice(basePrice, playerId) {
    const difficulty = this.difficultyEngine.getDifficulty(playerId);
    return Math.round(this.getScaledValue(basePrice, difficulty, 'cost_reduction'));
  }

  /**
   * Get scaled starting money for a new game
   * @param {number} baseAmount - Base starting amount (e.g., 1500)
   * @param {string} difficulty - Difficulty level
   * @returns {number} Scaled starting amount
   */
  getScaledStartingMoney(baseAmount, difficulty) {
    return Math.round(this.getScaledValue(baseAmount, difficulty, 'money'));
  }

  /**
   * Check if player has bankruptcy protection at current difficulty
   * @param {string} difficulty - Difficulty level
   * @returns {boolean} Whether bankruptcy protection is active
   */
  hasBankruptcyProtection(difficulty) {
    const params = this.getDifficultyParams(difficulty);
    return params.bankruptcyProtection;
  }

  /**
   * Get AI error rate for difficulty
   * @param {string} difficulty - Difficulty level
   * @returns {number} AI error rate (0-1)
   */
  getAIErrorRate(difficulty) {
    const params = this.getDifficultyParams(difficulty);
    return params.aiErrorRate;
  }

  /**
   * Get scaled pass-go bonus
   * @param {string} difficulty - Difficulty level
   * @returns {number} Pass-go bonus amount
   */
  getPassGoBonus(difficulty) {
    const params = this.getDifficultyParams(difficulty);
    return 200 + params.passGoBonus; // Base 200 + difficulty modifier
  }

  // ==================== Private Methods ====================

  /**
   * Clamp a value between min and max
   * @private
   */
  _clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
}