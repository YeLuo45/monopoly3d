/**
 * Banking AI
 * 
 * AI system for banking decisions including loan evaluation and payment strategies.
 */

import { LoanManager } from './loanManager.js';
import { InterestCalculator } from './interestCalculator.js';

class BankingAI {
  /**
   * @param {Object} memoryLayer - AI memory layer for storing decisions and learning
   */
  constructor(memoryLayer = null) {
    this.memoryLayer = memoryLayer;
    this.loanManager = new LoanManager();
    this.calculator = new InterestCalculator();

    // Default thresholds for loan decisions
    this.config = {
      maxDebtToWorthRatio: 0.5,      // Max 50% debt to net worth
      minInterestRateThreshold: 0.08, // 8% - rates above this are bad
      goodInterestRateThreshold: 0.04, // 4% - rates below this are excellent
      emergencyFundMonths: 3,         // Months of expenses to keep as reserve
      highInterestThreshold: 0.12,    // 12% - critically high rate
      loanToValueRatio: 0.7,          // Max 70% LTV for property loans
      minSavingsForRefinance: 500,    // Minimum dollar savings to justify refinance
      riskAdjustedReturnTarget: 0.10  // 10% target for investment returns
    };
  }

  /**
   * Update configuration with game-specific parameters
   * @param {Object} newConfig - Configuration overrides
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get basic game state info or create mock state
   * @param {Object} gameState - Current game state
   * @returns {Object} Normalized game state
   */
  normalizeGameState(gameState) {
    if (!gameState) {
      return {
        players: {},
        turn: 0,
        phase: 'unknown'
      };
    }

    return {
      players: gameState.players || {},
      turn: gameState.turn || 0,
      phase: gameState.phase || 'playing',
      board: gameState.board || { properties: [] }
    };
  }

  /**
   * Evaluate if taking a loan makes sense
   * @param {number} amount - Loan amount requested
   * @param {number} interestRate - Annual interest rate (as decimal)
   * @param {Object} gameState - Current game state
   * @returns {Object} {should: boolean, reason: string, confidence: number}
   */
  shouldTakeLoan(amount, interestRate, gameState) {
    const state = this.normalizeGameState(gameState);
    const playerId = this.memoryLayer?.playerId || 'current';

    // Get player's financial situation
    const playerMoney = this.getPlayerMoney(state, playerId);
    const playerNetWorth = this.estimateNetWorth(state, playerId);
    const totalExistingDebt = this.loanManager.getTotalDebt(playerId);

    // Calculate new debt level
    const newTotalDebt = totalExistingDebt + amount;
    const debtToWorthRatio = playerNetWorth > 0 ? newTotalDebt / playerNetWorth : Infinity;

    // Evaluate interest rate
    const rateEvaluation = this.evaluateInterestRate(interestRate, state);

    // Determine if loan makes financial sense
    let should = true;
    let reason = '';

    // Check 1: Debt burden
    if (debtToWorthRatio > this.config.maxDebtToWorthRatio) {
      should = false;
      reason = `Debt would exceed ${this.config.maxDebtToWorthRatio * 100}% of net worth`;
    }

    // Check 2: Interest rate
    else if (interestRate > this.config.highInterestThreshold) {
      should = false;
      reason = `Interest rate of ${(interestRate * 100).toFixed(1)}% is prohibitively high`;
    }

    // Check 3: Monthly payment affordability
    const estimatedMonthlyPayment = this.calculator.calculateMonthlyPayment(
      amount, interestRate, 60 // Assume 60 month term
    );
    const monthlyIncome = this.estimateMonthlyIncome(state, playerId);

    if (monthlyIncome > 0 && estimatedMonthlyPayment > monthlyIncome * 0.4) {
      should = false;
      reason = `Monthly payment would exceed 40% of estimated income`;
    }

    // If still considering, rate quality matters
    if (should && !rateEvaluation.isGoodRate) {
      reason = rateEvaluation.explanation;
    } else if (should) {
      reason = `Rate of ${(interestRate * 100).toFixed(1)}% is favorable for ${rateEvaluation.rating}`;
    }

    // Calculate confidence based on how clear the decision is
    const confidence = this.calculateDecisionConfidence(
      debtToWorthRatio < this.config.maxDebtToWorthRatio,
      interestRate < this.config.highInterestThreshold,
      rateEvaluation.isGoodRate
    );

    return { should, reason, confidence };
  }

  /**
   * Calculate maximum loan amount a player should take
   * @param {string} playerId - Player identifier
   * @param {Object} gameState - Current game state
   * @returns {Object} {maxAmount: number, recommendedAmount: number, factors: Array}
   */
  getOptimalLoanAmount(playerId, gameState) {
    const state = this.normalizeGameState(gameState);
    const playerNetWorth = this.estimateNetWorth(state, playerId);
    const playerMoney = this.getPlayerMoney(state, playerId);
    const existingDebt = this.loanManager.getTotalDebt(playerId);

    // Calculate max based on debt-to-worth ratio
    const maxDebtBasedOnWorth = playerNetWorth * this.config.maxDebtToWorthRatio;
    const availableDebtCapacity = Math.max(0, maxDebtBasedOnWorth - existingDebt);

    // Calculate based on emergency fund requirement
    const monthlyExpenses = this.estimateMonthlyExpenses(state, playerId);
    const emergencyFundNeeded = monthlyExpenses * this.config.emergencyFundMonths;
    const availableCashAfterReserve = Math.max(0, playerMoney - emergencyFundNeeded);

    // Take the minimum
    const maxAmount = Math.min(availableDebtCapacity, availableCashAfterReserve * 5); // 5x as rough guide
    const recommendedAmount = Math.floor(maxAmount * 0.5); // 50% of max as conservative rec

    const factors = [
      { factor: 'Net Worth Limit', value: availableDebtCapacity, weight: 0.4 },
      { factor: 'Cash Reserve', value: availableCashAfterReserve * 5, weight: 0.3 },
      { factor: 'Emergency Buffer', value: emergencyFundNeeded, weight: 0.3 }
    ];

    return {
      maxAmount: Math.max(0, maxAmount),
      recommendedAmount,
      factors,
      currentDebt: existingDebt,
      debtCapacity: availableDebtCapacity
    };
  }

  /**
   * Determine if early loan payoff makes sense
   * @param {string} loanId - Loan identifier
   * @param {Object} gameState - Current game state
   * @returns {Object} {should: boolean, reason: string, urgency: 'low'|'medium'|'high'}
   */
  shouldPayOffLoanEarly(loanId, gameState) {
    const loan = this.loanManager.getLoanById(loanId);
    if (!loan) {
      return { should: false, reason: 'Loan not found', urgency: 'low' };
    }

    const state = this.normalizeGameState(gameState);
    const playerId = loan.playerId;
    const playerMoney = this.getPlayerMoney(state, playerId);
    const playerNetWorth = this.estimateNetWorth(state, playerId);
    const remainingBalance = loan.remainingBalance;
    const remainingInterest = this.calculator.calculateTrueCost({
      ...loan,
      paymentsMade: loan.paymentsMade
    }).remainingInterest;

    // Determine urgency
    let urgency = 'low';
    let reason = '';

    // High interest loan should be paid off urgently
    if (loan.rate > this.config.highInterestThreshold) {
      urgency = 'high';
      reason = `High interest rate of ${(loan.rate * 100).toFixed(1)}% - pay off ASAP`;
    }
    // Good interest rate, low urgency
    else if (loan.rate < this.config.goodInterestRateThreshold) {
      urgency = 'low';
      reason = 'Low interest rate - better uses for cash exist';
    }
    // Medium urgency for average rates
    else {
      urgency = 'medium';
      reason = `Moderate rate of ${(loan.rate * 100).toFixed(1)}% - consider paying extra`;
    }

    // Check if player has sufficient funds
    const canAffordToPayOff = playerMoney > remainingBalance;

    if (!canAffordToPayOff) {
      return { should: false, reason: 'Insufficient funds to pay off', urgency };
    }

    // Calculate if early payoff makes financial sense
    // Compare to investment opportunities
    const investmentReturn = this.estimateInvestmentReturn(state, playerId);
    const loanCostRate = loan.rate;

    // If you can earn more investing than the loan costs, don't prepay
    if (investmentReturn > loanCostRate * 1.5) {
      return {
        should: false,
        reason: `Investment return (${(investmentReturn * 100).toFixed(1)}%) exceeds loan cost`,
        urgency
      };
    }

    return { should: true, reason, urgency };
  }

  /**
   * Get priority order for paying debts
   * @param {Object} gameState - Current game state
   * @returns {Array} Array of {id, priority, loan} sorted by priority
   */
  getPaymentPriority(gameState) {
    const state = this.normalizeGameState(gameState);
    const playerId = this.memoryLayer?.playerId || 'current';
    const activeLoans = this.loanManager.getActiveLoans(playerId);

    if (activeLoans.length === 0) {
      return [];
    }

    const priorities = activeLoans.map(loan => {
      // Score based on multiple factors (higher = more urgent)
      let score = 0;

      // High interest = high priority (weighted heavily)
      if (loan.rate > this.config.highInterestThreshold) {
        score += 30;
      } else if (loan.rate > this.config.minInterestRateThreshold) {
        score += 20;
      } else {
        score += 10;
      }

      // Small balance = higher priority (psychological wins)
      const debtRatio = loan.remainingBalance / this.loanManager.getTotalDebt(playerId);
      score += (1 - debtRatio) * 15;

      // Close to payoff = slightly higher priority
      const payoffProgress = loan.paymentsMade / loan.term;
      score += payoffProgress * 10;

      // Determine priority level
      let priority;
      if (score >= 35) {
        priority = 'high';
      } else if (score >= 25) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      return {
        id: loan.id,
        priority,
        score,
        loan,
        reason: this.getPriorityReason(loan, score)
      };
    });

    // Sort by score descending
    priorities.sort((a, b) => b.score - a.score);

    return priorities;
  }

  /**
   * Get human-readable reason for priority
   * @param {Object} loan - Loan object
   * @param {number} score - Priority score
   * @returns {string} Reason description
   */
  getPriorityReason(loan, score) {
    if (loan.rate > this.config.highInterestThreshold) {
      return 'High interest - costly to maintain';
    }
    if (score >= 35) {
      return 'High priority debt';
    }
    if (score >= 25) {
      return 'Moderate priority';
    }
    return 'Low priority - consider minimum payments';
  }

  /**
   * Evaluate if an interest rate is good or bad
   * @param {number} interestRate - Annual rate (as decimal)
   * @param {Object} gameState - Current game state
   * @returns {Object} {isGoodRate: boolean, rating: string, explanation: string}
   */
  evaluateInterestRate(interestRate, gameState) {
    const state = this.normalizeGameState(gameState);

    let rating;
    let isGoodRate;

    if (interestRate <= this.config.goodInterestRateThreshold) {
      rating = 'excellent';
      isGoodRate = true;
    } else if (interestRate <= this.config.minInterestRateThreshold) {
      rating = 'fair';
      isGoodRate = true;
    } else if (interestRate <= this.config.highInterestThreshold) {
      rating = 'poor';
      isGoodRate = false;
    } else {
      rating = 'predatory';
      isGoodRate = false;
    }

    const explanation = this.getRateExplanation(interestRate, rating, state);

    return { isGoodRate, rating, explanation };
  }

  /**
   * Get detailed explanation for rate evaluation
   */
  getRateExplanation(rate, rating, state) {
    const marketRate = 0.06; // Assume 6% market rate
    const diff = rate - marketRate;

    let baseExplanation = {
      excellent: `Rate of ${(rate * 100).toFixed(1)}% is well below market average`,
      fair: `Rate of ${(rate * 100).toFixed(1)}% is competitive`,
      poor: `Rate of ${(rate * 100).toFixed(1)}% is above average`,
      predatory: `Rate of ${(rate * 100).toFixed(1)}% is dangerously high`
    }[rating];

    if (diff > 0.02) {
      baseExplanation += ` (${(diff * 100).toFixed(1)}% above market)`;
    } else if (diff < -0.02) {
      baseExplanation += ` (${Math.abs(diff * 100).toFixed(1)}% below market)`;
    }

    return baseExplanation;
  }

  /**
   * Find the best available loan offer from options
   * @param {Object} gameState - Current game state
   * @returns {Object|null} Best loan offer or null if none available
   */
  getBestLoanOffer(gameState) {
    const state = this.normalizeGameState(gameState);
    const availableOffers = state.loanOffers || [];

    if (!Array.isArray(availableOffers) || availableOffers.length === 0) {
      // Return mock best offer based on market rates
      return {
        source: 'bank',
        rate: 0.06,
        maxAmount: 10000,
        term: 60,
        rating: 'fair',
        recommendation: 'standard'
      };
    }

    // Find the best offer by effective rate
    let bestOffer = null;
    let bestEffectiveRate = Infinity;

    for (const offer of availableOffers) {
      const effectiveRate = this.calculator.calculateEffectiveRate(offer.rate, 12);
      if (effectiveRate < bestEffectiveRate) {
        bestEffectiveRate = effectiveRate;
        bestOffer = offer;
      }
    }

    if (bestOffer) {
      const evaluation = this.evaluateInterestRate(bestOffer.rate, state);
      bestOffer.rating = evaluation.rating;
      bestOffer.effectiveRate = bestEffectiveRate;
    }

    return bestOffer;
  }

  // Helper methods

  /**
   * Get player's current money
   */
  getPlayerMoney(state, playerId) {
    const player = state.players[playerId];
    return player?.money ?? player?.cash ?? 1000; // Default to 1000 if not found
  }

  /**
   * Estimate player's net worth
   */
  estimateNetWorth(state, playerId) {
    const player = state.players[playerId];
    if (!player) return 1000;

    const cash = player.money ?? player.cash ?? 0;
    const properties = player.properties ?? [];
    const propertyValue = properties.reduce((sum, p) => sum + (p.value ?? p.price ?? 0), 0);

    return cash + propertyValue;
  }

  /**
   * Estimate player's monthly income
   */
  estimateMonthlyIncome(state, playerId) {
    const player = state.players[playerId];
    return player?.monthlyIncome ?? player?.income ?? 200;
  }

  /**
   * Estimate player's monthly expenses
   */
  estimateMonthlyExpenses(state, playerId) {
    return this.estimateMonthlyIncome(state, playerId) * 0.7; // Assume 70% of income
  }

  /**
   * Estimate investment return potential
   */
  estimateInvestmentReturn(state, playerId) {
    // Default to 7% real estate, 8% stock market average
    return 0.075;
  }

  /**
   * Calculate decision confidence (0-1)
   */
  calculateDecisionConfidence(...conditions) {
    const trueCount = conditions.filter(Boolean).length;
    return trueCount / conditions.length;
  }
}

export { BankingAI };