/**
 * OpponentModel - Behavioral profile of a single opponent
 * Tracks opponent actions to build and maintain a behavioral profile
 * Used for predicting opponent decisions and exploiting weaknesses
 */

export class OpponentModel {
  constructor(playerId) {
    this.playerId = playerId;
    
    // Raw event tracking
    this.events = [];
    this.tradeHistory = [];
    this.propertyAcquisitions = [];
    this.auctionBids = [];
    this.rentPayments = [];
    this.moneyTransfers = [];
    this.decisions = []; // { type, choice, timeTaken, context }
    
    // Computed traits (cached)
    this._traits = null;
    this._profile = null;
    this._traitHistory = {
      riskTolerance: [],
      tradingStyle: [],
      propertyFocus: [],
      reactionSpeed: [],
    };
    
    // Statistics
    this.stats = {
      totalTrades: 0,
      tradesAccepted: 0,
      tradesRejected: 0,
      auctionsEntered: 0,
      auctionsWon: 0,
      propertiesBought: 0,
      propertiesSold: 0,
      rentPaid: 0,
      rentReceived: 0,
      avgDecisionTime: 0,
      decisionsMade: 0,
    };
    
    this.lastUpdate = Date.now();
  }

  /**
   * Update model from game event
   * @param {string} eventType - Type of event
   * @param {object} data - Event data
   */
  updateProfile(eventType, data) {
    this.events.push({
      type: eventType,
      data,
      timestamp: Date.now(),
    });
    
    switch (eventType) {
      case 'trade_offered':
        this._recordTradeOffer(data);
        break;
      case 'trade_accepted':
        this._recordTradeAccepted(data);
        break;
      case 'trade_rejected':
        this._recordTradeRejected(data);
        break;
      case 'property_acquired':
        this._recordPropertyAcquisition(data);
        break;
      case 'property_sold':
        this._recordPropertySold(data);
        break;
      case 'auction_entered':
        this._recordAuctionEntered(data);
        break;
      case 'auction_bid':
        this._recordAuctionBid(data);
        break;
      case 'auction_won':
        this._recordAuctionWon(data);
        break;
      case 'rent_paid':
        this._recordRentPayment(data);
        break;
      case 'rent_received':
        this._recordRentReceived(data);
        break;
      case 'decision_made':
        this._recordDecision(data);
        break;
      case 'property_purchased':
        this._recordPropertyPurchased(data);
        break;
    }
    
    // Invalidate caches
    this._traits = null;
    this._profile = null;
    this.lastUpdate = Date.now();
  }

  // ============ Private Event Handlers ============

  _recordTradeOffer(data) {
    this.tradeHistory.push({
      ...data,
      outcome: 'pending',
      timestamp: Date.now(),
    });
    this.stats.totalTrades++;
  }

  _recordTradeAccepted(data) {
    const pending = this.tradeHistory.find(t => t.outcome === 'pending' && t.id === data.id);
    if (pending) {
      pending.outcome = 'accepted';
      pending.receivedItems = data.receivedItems;
      pending.givenItems = data.givenItems;
    }
    this.stats.tradesAccepted++;
  }

  _recordTradeRejected(data) {
    const pending = this.tradeHistory.find(t => t.outcome === 'pending' && t.id === data.id);
    if (pending) {
      pending.outcome = 'rejected';
    }
    this.stats.tradesRejected++;
  }

  _recordPropertyAcquisition(data) {
    this.propertyAcquisitions.push({
      ...data,
      timestamp: Date.now(),
    });
  }

  _recordPropertySold(data) {
    this.stats.propertiesSold++;
  }

  _recordAuctionEntered(data) {
    this.auctionBids.push({
      auctionId: data.auctionId,
      propertyId: data.propertyId,
      entered: true,
      timestamp: Date.now(),
    });
    this.stats.auctionsEntered++;
  }

  _recordAuctionBid(data) {
    const auction = this.auctionBids.find(a => a.auctionId === data.auctionId);
    if (auction) {
      auction.bids = auction.bids || [];
      auction.bids.push({
        amount: data.amount,
        timestamp: Date.now(),
      });
    }
  }

  _recordAuctionWon(data) {
    const auction = this.auctionBids.find(a => a.auctionId === data.auctionId);
    if (auction) {
      auction.won = true;
      auction.winningBid = data.amount;
    }
    this.stats.auctionsWon++;
  }

  _recordRentPayment(data) {
    this.rentPayments.push({
      amount: data.amount,
      propertyId: data.propertyId,
      from: data.from,
      to: data.to,
      timestamp: Date.now(),
    });
    this.stats.rentPaid += data.amount;
  }

  _recordRentReceived(data) {
    this.stats.rentReceived += data.amount;
  }

  _recordDecision(data) {
    this.decisions.push({
      type: data.type,
      choice: data.choice,
      context: data.context,
      timeTaken: data.timeTaken || 0,
      timestamp: Date.now(),
    });
    
    // Update stats
    this.stats.decisionsMade++;
    const totalTime = this.stats.avgDecisionTime * (this.stats.decisionsMade - 1);
    this.stats.avgDecisionTime = (totalTime + (data.timeTaken || 0)) / this.stats.decisionsMade;
  }

  _recordPropertyPurchased(data) {
    this.stats.propertiesBought++;
  }

  // ============ Trait Computation ============

  /**
   * Get risk tolerance trait
   * @returns {'conservative'|'balanced'|'aggressive'}
   */
  getRiskTolerance() {
    this._computeTraits();
    return this._traits.riskTolerance;
  }

  /**
   * Get trading style trait
   * @returns {'generous'|'fair'|'exploitative'}
   */
  getTradingStyle() {
    this._computeTraits();
    return this._traits.tradingStyle;
  }

  /**
   * Get property focus trait
   * @returns {'rent'|'monopoly'|'liquidity'}
   */
  getPropertyFocus() {
    this._computeTraits();
    return this._traits.propertyFocus;
  }

  /**
   * Get reaction speed trait
   * @returns {'slow'|'normal'|'fast'}
   */
  getReactionSpeed() {
    this._computeTraits();
    return this._traits.reactionSpeed;
  }

  _computeTraits() {
    if (this._traits) return;

    // Risk Tolerance: Based on decision patterns and financial behavior
    const riskScore = this._calculateRiskScore();
    let riskTolerance;
    if (riskScore < 0.3) riskTolerance = 'conservative';
    else if (riskScore > 0.7) riskTolerance = 'aggressive';
    else riskTolerance = 'balanced';

    // Trading Style: Based on trade acceptance and deal-making behavior
    const tradingScore = this._calculateTradingScore();
    let tradingStyle;
    if (tradingScore < 0.3) tradingStyle = 'generous';
    else if (tradingScore > 0.7) tradingStyle = 'exploitative';
    else tradingStyle = 'fair';

    // Property Focus: Based on property acquisition patterns
    const propertyScore = this._calculatePropertyScore();
    let propertyFocus;
    if (propertyScore < 0.33) propertyFocus = 'liquidity';
    else if (propertyScore < 0.66) propertyFocus = 'rent';
    else propertyFocus = 'monopoly';

    // Reaction Speed: Based on average decision time
    const speedScore = this._calculateSpeedScore();
    let reactionSpeed;
    if (speedScore < 0.3) reactionSpeed = 'slow';
    else if (speedScore > 0.7) reactionSpeed = 'fast';
    else reactionSpeed = 'normal';

    this._traits = {
      riskTolerance,
      tradingStyle,
      propertyFocus,
      reactionSpeed,
    };

    // Track history for learning
    this._traitHistory.riskTolerance.push({ value: riskTolerance, time: Date.now() });
    this._traitHistory.tradingStyle.push({ value: tradingStyle, time: Date.now() });
    this._traitHistory.propertyFocus.push({ value: propertyFocus, time: Date.now() });
    this._traitHistory.reactionSpeed.push({ value: reactionSpeed, time: Date.now() });
  }

  _calculateRiskScore() {
    let score = 0;
    let factors = 0;

    // Factor 1: Trade risk
    if (this.stats.totalTrades > 0) {
      // High auction participation = higher risk tolerance
      const auctionRate = this.stats.auctionsEntered / this.events.length;
      score += auctionRate * 2;
      factors++;
    }

    // Factor 2: Money flow ratio
    if (this.stats.rentReceived > 0) {
      const ratio = this.stats.rentPaid / this.stats.rentReceived;
      score += Math.min(ratio, 2) / 2;
      factors++;
    }

    // Factor 3: Property trading frequency
    if (this.stats.totalTrades > 0) {
      const tradeRate = this.stats.propertiesSold / this.stats.totalTrades;
      score += tradeRate;
      factors++;
    }

    // Factor 4: Decision patterns
    const riskyDecisions = this.decisions.filter(d => d.context?.risky).length;
    if (this.decisions.length > 0) {
      score += riskyDecisions / this.decisions.length;
      factors++;
    }

    return factors > 0 ? Math.min(score / factors, 1) : 0.5;
  }

  _calculateTradingScore() {
    if (this.stats.totalTrades === 0) return 0.5;

    const acceptRate = this.stats.tradesAccepted / this.stats.totalTrades;
    
    // Low accept rate but high counter-offers = exploitative
    const hasCounterOffers = this.tradeHistory.some(t => t.counterOffered);
    
    if (acceptRate < 0.3) return 0.8; // Exploitative
    if (acceptRate > 0.7) return 0.2; // Generous
    return 0.5; // Fair
  }

  _calculatePropertyScore() {
    if (this.propertyAcquisitions.length === 0) return 0.5;

    // Check if focused on high-rent or complete sets
    const highRentProps = this.propertyAcquisitions.filter(p => p.rentPotential > 100);
    const setCompleters = this.propertyAcquisitions.filter(p => p.completesSet);

    const totalProps = this.propertyAcquisitions.length;
    const highRentRatio = highRentProps.length / totalProps;
    const setCompletionRatio = setCompleters.length / totalProps;

    // More set completions = monopoly focus
    // More high-rent = rent focus
    // More liquid assets = liquidity focus
    return (highRentRatio * 0.4 + setCompletionRatio * 0.6);
  }

  _calculateSpeedScore() {
    const avgTime = this.stats.avgDecisionTime;
    if (avgTime === 0) return 0.5; // Unknown
    
    // Fast: < 2 seconds, Normal: 2-5 seconds, Slow: > 5 seconds
    if (avgTime < 2000) return 0.8;
    if (avgTime > 5000) return 0.2;
    return 0.5;
  }

  // ============ Prediction Methods ============

  /**
   * Predict what opponent will do in given game state
   * @param {object} gameState - Current game state
   * @returns {object} Predicted action
   */
  predictAction(gameState) {
    this._computeTraits();
    
    const { action, confidence } = this._predictBasedOnTraits(gameState);
    
    return {
      predictedAction: action,
      confidence,
      reasoning: this._getReasoning(),
      traits: { ...this._traits },
    };
  }

  _predictBasedOnTraits(gameState) {
    const traits = this._traits;
    
    // Default prediction based on common game situations
    if (gameState.phase === 'property_purchase') {
      if (traits.riskTolerance === 'aggressive') {
        return { action: 'buy', confidence: 0.8 };
      } else if (traits.riskTolerance === 'conservative') {
        return { action: 'auction', confidence: 0.6 };
      }
      return { action: 'buy', confidence: 0.5 };
    }
    
    if (gameState.phase === 'trade_response') {
      if (traits.tradingStyle === 'generous') {
        return { action: 'accept', confidence: 0.7 };
      } else if (traits.tradingStyle === 'exploitative') {
        return { action: 'reject', confidence: 0.6 };
      }
      return { action: 'negotiate', confidence: 0.4 };
    }
    
    if (gameState.phase === 'auction') {
      if (traits.riskTolerance === 'aggressive') {
        return { action: 'overbid', confidence: 0.7 };
      }
      return { action: 'drop_out', confidence: 0.5 };
    }
    
    if (gameState.phase === 'rent_payment') {
      if (traits.riskTolerance === 'aggressive') {
        return { action: 'negotiate', confidence: 0.6 };
      }
      return { action: 'pay', confidence: 0.8 };
    }
    
    return { action: 'unknown', confidence: 0 };
  }

  _getReasoning() {
    const traits = this._traits;
    return `Opponent is ${traits.riskTolerance} in risk, ${traits.tradingStyle} in trades, ` +
           `focuses on ${traits.propertyFocus}, and reacts ${traits.reactionSpeed}.`;
  }

  /**
   * Predict if opponent will accept a trade offer
   * @param {object} offer - Trade offer { given, received }
   * @returns {object} Prediction result
   */
  predictTradeResponse(offer) {
    this._computeTraits();
    
    const myValue = offer.receivedValue || 0;
    const theirValue = offer.givenValue || 0;
    const valueRatio = theirValue > 0 ? myValue / theirValue : 1;
    
    // Adjust based on trading style
    const style = this._traits.tradingStyle;
    let acceptThreshold;
    
    if (style === 'generous') {
      acceptThreshold = 0.7; // Accept even if slightly losing
    } else if (style === 'exploitative') {
      acceptThreshold = 1.3; // Only accept if clearly winning
    } else {
      acceptThreshold = 1.0; // Accept if fair
    }
    
    const willAccept = valueRatio >= acceptThreshold;
    const confidence = Math.min(Math.abs(valueRatio - acceptThreshold) / 0.5, 1) * 0.5 + 0.3;
    
    return {
      willAccept,
      confidence,
      valueRatio,
      styleAdjustment: style,
    };
  }

  // ============ Profile & Serialization ============

  /**
   * Get full profile object
   * @returns {object} Complete profile
   */
  getProfile() {
    if (this._profile) return this._profile;
    
    this._computeTraits();
    
    this._profile = {
      playerId: this.playerId,
      traits: { ...this._traits },
      traitHistory: { ...this._traitHistory },
      stats: { ...this.stats },
      eventCount: this.events.length,
      lastUpdate: this.lastUpdate,
      tradeHistorySize: this.tradeHistory.length,
      propertyAcquisitionsCount: this.propertyAcquisitions.length,
      decisionsCount: this.decisions.length,
    };
    
    return this._profile;
  }

  /**
   * Serialize to JSON
   * @returns {object} JSON representation
   */
  toJSON() {
    return {
      playerId: this.playerId,
      events: this.events,
      tradeHistory: this.tradeHistory,
      propertyAcquisitions: this.propertyAcquisitions,
      auctionBids: this.auctionBids,
      rentPayments: this.rentPayments,
      moneyTransfers: this.moneyTransfers,
      decisions: this.decisions,
      stats: this.stats,
      _traitHistory: this._traitHistory,
      lastUpdate: this.lastUpdate,
    };
  }

  /**
   * Deserialize from JSON
   * @param {object} data - JSON object
   * @returns {OpponentModel} New instance
   */
  static fromJSON(data) {
    const model = new OpponentModel(data.playerId);
    model.events = data.events || [];
    model.tradeHistory = data.tradeHistory || [];
    model.propertyAcquisitions = data.propertyAcquisitions || [];
    model.auctionBids = data.auctionBids || [];
    model.rentPayments = data.rentPayments || [];
    model.moneyTransfers = data.moneyTransfers || [];
    model.decisions = data.decisions || [];
    model.stats = data.stats || model.stats;
    model._traitHistory = data._traitHistory || model._traitHistory;
    model.lastUpdate = data.lastUpdate || Date.now();
    return model;
  }
}