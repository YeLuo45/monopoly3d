/**
 * EconomicSystemFacade - Unified facade integrating all economic AI systems
 * 
 * Provides a single entry point for coordinating trading, investment,
 * and banking AI decisions with conflict resolution and prioritization.
 */

import { TradeEvaluator } from './trading/tradeEvaluator.js';
import { InvestmentAdvisorAI } from './invest/investmentAdvisorAI.js';
import { BankingAI } from './bank/bankingAI.js';
import { FinancialTracker } from './finance/financialTracker.js';
import { EconomicCoordinationHub } from './economicCoordinationHub.js';

export class EconomicSystemFacade {
  /**
   * @param {Object} memoryLayer - AI memory layer for storing decisions and learning
   * @param {Object} opponentModel - Opponent model for predicting opponent behavior
   */
  constructor(memoryLayer = null, opponentModel = null) {
    this.memoryLayer = memoryLayer;
    this.opponentModel = opponentModel;

    // Initialize individual AI systems
    this.tradingAI = new TradeEvaluator(memoryLayer);
    this.investmentAI = new InvestmentAdvisorAI(memoryLayer, null);
    this.bankingAI = new BankingAI(memoryLayer);
    this.financialTracker = new FinancialTracker();
    
    // Initialize coordination hub
    this.coordinationHub = new EconomicCoordinationHub();
    this._registerAISystems();

    // Configuration
    this.config = {
      decisionThreshold: 0.5,
      conflictResolutionStrategy: 'priority', // 'priority' | 'value' | 'risk'
      maxActionsPerTurn: 5,
      confidenceWeight: 0.7,
      strategicWeight: 0.3,
    };
  }

  /**
   * Register all AI systems with the coordination hub
   * @private
   */
  _registerAISystems() {
    this.coordinationHub.registerSystem('trading', {
      weight: 1.0,
      evaluate: (context, gameState) => this._evaluateTrading(context, gameState),
    });

    this.coordinationHub.registerSystem('investment', {
      weight: 1.0,
      evaluate: (context, gameState) => this._evaluateInvestment(context, gameState),
    });

    this.coordinationHub.registerSystem('banking', {
      weight: 1.0,
      evaluate: (context, gameState) => this._evaluateBanking(context, gameState),
    });

    this.coordinationHub.registerSystem('financial', {
      weight: 0.8,
      evaluate: (context, gameState) => this._evaluateFinancial(context, gameState),
    });
  }

  /**
   * Unified decision engine - coordinates all AI systems
   * @param {Object} context - Decision context { playerId, situation, availableActions }
   * @param {Object} gameState - Current game state
   * @returns {Object} { decision, confidence, reasoning, systemsUsed }
   */
  makeDecision(context, gameState) {
    if (!context || !gameState) {
      return {
        decision: null,
        confidence: 0,
        reasoning: 'Invalid context or game state',
        systemsUsed: [],
      };
    }

    const { playerId, situation } = context;

    // Query all registered systems
    const recommendations = this.coordinationHub.querySystems(context, gameState);

    // Detect and resolve conflicts
    const conflicts = this.coordinationHub.detectConflicts(recommendations);
    const resolvedActions = conflicts.length > 0
      ? this.coordinationHub.resolveConflicts(conflicts, gameState)
      : recommendations;

    // Get prioritized actions
    const prioritizedActions = this.getPrioritizedActions(playerId, gameState);

    // Select best action
    const bestAction = prioritizedActions.length > 0
      ? prioritizedActions[0]
      : { action: 'hold', reason: 'No favorable actions available' };

    // Calculate overall confidence
    const confidence = this._calculateDecisionConfidence(recommendations);

    return {
      decision: bestAction.action,
      target: bestAction.target,
      confidence,
      reasoning: bestAction.reason,
      systemsUsed: Object.keys(recommendations),
      priority: bestAction.priority,
    };
  }

  /**
   * Get trading decision for a specific property
   * @param {string} propertyId - Property ID
   * @param {Object} gameState - Current game state
   * @returns {Object} { decision, fairness, bias, reasoning }
   */
  getTradingDecision(propertyId, gameState) {
    const playerId = this._getCurrentPlayerId(gameState);

    // Evaluate the property in potential trades
    const trade = this._createTradeContext(propertyId, playerId, gameState);
    if (!trade) {
      return {
        decision: 'no_trade',
        fairness: 0.5,
        bias: 0,
        reasoning: 'Property not found or not tradeable',
      };
    }

    const evaluation = this.tradingAI.evaluateTrade(trade, playerId, gameState);

    return {
      decision: evaluation.fairness >= 0.5 ? 'accept' : 'reject',
      fairness: evaluation.fairness,
      bias: evaluation.bias,
      reasoning: this._generateTradeReasoning(evaluation),
      adjustments: evaluation.recommendedAdjustments,
    };
  }

  /**
   * Get investment decision for a specific property
   * @param {string} propertyId - Property ID
   * @param {Object} gameState - Current game state
   * @returns {Object} { decision, score, roi, risk, reasoning }
   */
  getInvestmentDecision(propertyId, gameState) {
    const decision = this.investmentAI.shouldInvestInProperty(propertyId, gameState);

    // Enhance with additional metrics
    const playerId = this._getCurrentPlayerId(gameState);
    const marketTiming = this.investmentAI.getMarketTiming(gameState);
    const diversificationScore = this.investmentAI.getDiversificationScore(playerId);

    return {
      decision: decision.decision ? 'buy' : 'hold',
      score: decision.score || 0,
      roi: this.investmentAI.valuation?.getROI(propertyId, gameState) || 0,
      risk: decision.risk || 'unknown',
      reasoning: decision.reasoning,
      confidence: decision.confidence || 0.5,
      marketTiming,
      diversificationScore,
    };
  }

  /**
   * Get banking decision for a loan
   * @param {string} loanId - Loan ID
   * @param {Object} gameState - Current game state
   * @returns {Object} { decision, amount, rate, reasoning, urgency }
   */
  getBankingDecision(loanId, gameState) {
    const playerId = this._getCurrentPlayerId(gameState);

    // Get loan details from loan manager
    const loan = this.bankingAI.loanManager?.getLoanById(loanId);
    if (!loan) {
      // Return recommendations for taking a new loan
      const optimalLoan = this.bankingAI.getOptimalLoanAmount(playerId, gameState);
      return {
        decision: 'no_loan',
        amount: 0,
        rate: 0,
        reasoning: 'Loan not found',
        urgency: 'low',
        recommendations: optimalLoan,
      };
    }

    // Evaluate early payoff
    const payoffDecision = this.bankingAI.shouldPayOffLoanEarly(loanId, gameState);

    return {
      decision: payoffDecision.should ? 'pay_off' : 'maintain',
      amount: loan.remainingBalance || loan.principal,
      rate: loan.rate,
      reasoning: payoffDecision.reason,
      urgency: payoffDecision.urgency,
      priority: this.bankingAI.getPaymentPriority(gameState),
    };
  }

  /**
   * Get prioritized action list for a player
   * @param {string} playerId - Player ID
   * @param {Object} gameState - Current game state
   * @returns {Array} Ranked action list { action, target, priority, reason }
   */
  getPrioritizedActions(playerId, gameState) {
    const actions = [];

    // Get investment recommendations
    const investments = this.investmentAI.getInvestmentRecommendations(playerId, gameState);
    for (const inv of investments.slice(0, 3)) {
      actions.push({
        action: 'invest',
        target: inv.propertyId,
        priority: inv.rank,
        score: inv.score,
        reason: inv.reasoning,
        expectedROI: inv.expectedROI,
      });
    }

    // Get loan priorities
    const loanPriorities = this.bankingAI.getPaymentPriority(gameState);
    for (const loan of loanPriorities.slice(0, 2)) {
      actions.push({
        action: 'pay_debt',
        target: loan.id,
        priority: loan.priority === 'high' ? 1 : loan.priority === 'medium' ? 2 : 3,
        reason: loan.reason,
        urgency: loan.urgency,
      });
    }

    // Get best loan offer if player needs cash
    const player = this._getPlayer(playerId, gameState);
    if (player && player.money < 500) {
      const bestLoan = this.bankingAI.getBestLoanOffer(gameState);
      if (bestLoan) {
        actions.push({
          action: 'take_loan',
          target: 'bank',
          priority: 2,
          reason: `Available loan at ${(bestLoan.rate * 100).toFixed(1)}% rate`,
          amount: bestLoan.maxAmount,
        });
      }
    }

    // Sort by priority (lower number = higher priority)
    actions.sort((a, b) => a.priority - b.priority);

    return actions.slice(0, this.config.maxActionsPerTurn);
  }

  /**
   * Resolve conflicts between conflicting recommendations
   * @param {Array} actions - Array of conflicting actions
   * @param {Object} gameState - Current game state
   * @returns {Array} Resolved actions
   */
  resolveConflicts(actions, gameState) {
    if (actions.length <= 1) return actions;

    // Group by action type
    const grouped = {};
    for (const action of actions) {
      const key = action.action;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(action);
    }

    // For each group, keep the highest priority
    const resolved = [];
    for (const [key, group] of Object.entries(grouped)) {
      if (group.length === 1) {
        resolved.push(group[0]);
      } else {
        // Keep highest scoring action
        group.sort((a, b) => (b.score || 0) - (a.score || 0));
        resolved.push(group[0]);
      }
    }

    return resolved;
  }

  // Private helper methods

  /**
   * Evaluate trading system
   * @private
   */
  _evaluateTrading(context, gameState) {
    const { playerId, situation } = context;
    if (situation?.type === 'trade') {
      const evaluation = this.tradingAI.evaluateTrade(
        situation.trade,
        playerId,
        gameState
      );
      return {
        system: 'trading',
        score: evaluation.fairness * 100,
        recommendation: evaluation.fairness >= 0.5 ? 'accept' : 'reject',
        details: evaluation,
      };
    }
    return null;
  }

  /**
   * Evaluate investment system
   * @private
   */
  _evaluateInvestment(context, gameState) {
    const { playerId, situation } = context;
    if (situation?.propertyId) {
      const decision = this.investmentAI.shouldInvestInProperty(
        situation.propertyId,
        gameState
      );
      return {
        system: 'investment',
        score: decision.score || 0,
        recommendation: decision.decision ? 'invest' : 'hold',
        details: decision,
      };
    }
    return null;
  }

  /**
   * Evaluate banking system
   * @private
   */
  _evaluateBanking(context, gameState) {
    const { playerId, situation } = context;
    if (situation?.loanId) {
      const decision = this.bankingAI.shouldPayOffLoanEarly(
        situation.loanId,
        gameState
      );
      return {
        system: 'banking',
        score: decision.should ? 80 : 30,
        recommendation: decision.should ? 'pay_off' : 'maintain',
        details: decision,
      };
    }
    return null;
  }

  /**
   * Evaluate financial system
   * @private
   */
  _evaluateFinancial(context, gameState) {
    const { playerId } = context;
    const player = this._getPlayer(playerId, gameState);
    if (!player) return null;

    const cashFlow = this.financialTracker?.calculateCashFlow?.(playerId, gameState) || 0;
    return {
      system: 'financial',
      score: cashFlow > 0 ? 70 : 30,
      recommendation: cashFlow > 0 ? 'healthy' : 'concern',
      details: { cashFlow },
    };
  }

  /**
   * Create trade context for evaluation
   * @private
   */
  _createTradeContext(propertyId, playerId, gameState) {
    const property = this._getProperty(propertyId, gameState);
    if (!property) return null;

    return {
      offered: { properties: [propertyId], money: 0 },
      requested: { properties: [], money: property.price || 100 },
      players: [playerId, 'partner'],
    };
  }

  /**
   * Generate trading reasoning text
   * @private
   */
  _generateTradeReasoning(evaluation) {
    if (evaluation.health === 'healthy') {
      return 'Trade is balanced and mutually beneficial';
    } else if (evaluation.health === 'unfair') {
      return 'Trade significantly favors one party - reject';
    } else if (evaluation.health === 'one-sided') {
      return 'Trade lacks balance - consider adjustments';
    } else if (evaluation.bias > 0.1) {
      return 'Trade favors you - consider accepting';
    } else if (evaluation.bias < -0.1) {
      return 'Trade favors opponent - negotiate better terms';
    }
    return 'Trade is neutral';
  }

  /**
   * Calculate overall decision confidence
   * @private
   */
  _calculateDecisionConfidence(recommendations) {
    const values = Object.values(recommendations).filter(r => r && r.score !== undefined);
    if (values.length === 0) return 0.5;

    const avgScore = values.reduce((sum, r) => sum + r.score, 0) / values.length;
    return Math.min(1, avgScore / 100 * this.config.confidenceWeight +
      this.config.strategicWeight * (values.length / 4));
  }

  /**
   * Get current player ID from game state
   * @private
   */
  _getCurrentPlayerId(gameState) {
    return gameState.currentPlayerId || gameState.playerId || 'current';
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
   * Get property by ID
   * @private
   */
  _getProperty(propertyId, gameState) {
    const tiles = gameState.tiles || [];
    return tiles.find(t => t.id === propertyId);
  }

  /**
   * Update configuration
   * @param {Object} newConfig - Configuration overrides
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}
