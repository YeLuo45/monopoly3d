/**
 * Player Segmentation System
 * 
 * Segments players based on behavior patterns into distinct categories:
 * - casual: Relaxed players who enjoy the experience
 * - strategic: Calculated players who plan ahead
 * - competitive: Aggressive players focused on winning
 * - social: Players who prioritize interactions
 */

const SEGMENT_TYPES = {
  CASUAL: 'casual',
  STRATEGIC: 'strategic',
  COMPETITIVE: 'competitive',
  SOCIAL: 'social'
};

const SEGMENT_WEIGHTS = {
  // Behavior metric weights for segmentation
  riskTolerance: 0.15,
  tradeFrequency: 0.20,
  socialInteractions: 0.25,
  strategicPlanning: 0.20,
  winIntensity: 0.20
};

const SEGMENT_THRESHOLDS = {
  // Thresholds for segment classification
  CASUAL: {
    strategicPlanning: { min: 0.0, max: 0.4 },
    riskTolerance: { min: 0.0, max: 0.5 },
    winIntensity: { min: 0.0, max: 0.4 }
  },
  STRATEGIC: {
    strategicPlanning: { min: 0.5, max: 1.0 },
    riskTolerance: { min: 0.3, max: 0.7 },
    winIntensity: { min: 0.3, max: 0.7 }
  },
  COMPETITIVE: {
    winIntensity: { min: 0.6, max: 1.0 },
    riskTolerance: { min: 0.5, max: 1.0 },
    strategicPlanning: { min: 0.3, max: 0.9 }
  },
  SOCIAL: {
    socialInteractions: { min: 0.5, max: 1.0 },
    tradeFrequency: { min: 0.4, max: 1.0 },
    winIntensity: { min: 0.0, max: 0.6 }
  }
};

/**
 * Player behavior metrics that are tracked
 */
class PlayerMetrics {
  constructor(playerId) {
    this.playerId = playerId;
    this.tradesCompleted = 0;
    this.tradesProposed = 0;
    this.socialMessages = 0;
    this.auctionsWon = 0;
    this.auctionsLost = 0;
    this.propertiesAcquired = 0;
    this.propertiesLost = 0;
    this.jailVisits = 0;
    this.goJailCount = 0;
    this.gamesPlayed = 0;
    this.gamesWon = 0;
    this.totalWins = 0;
    this.moneyEarned = 0;
    this.moneySpent = 0;
    this.moneyLost = 0;
    this.turnsPlayed = 0;
    this.plannedMoves = 0;
    this.impulsiveMoves = 0;
    this.highValueTrades = 0;
    this.lowValueTrades = 0;
    this.propertiesDeveloped = 0;
    this.mortgageActions = 0;
    this.bankruptcyCount = 0;
    this.firstPlaceFinishes = 0;
    this.lastPlaceFinishes = 0;
    this.timestamp = Date.now();
  }

  /**
   * Get trade success rate
   */
  getTradeSuccessRate() {
    const total = this.tradesCompleted + this.tradesProposed;
    return total > 0 ? this.tradesCompleted / total : 0.5;
  }

  /**
   * Get auction win rate
   */
  getAuctionWinRate() {
    const total = this.auctionsWon + this.auctionsLost;
    return total > 0 ? this.auctionsWon / total : 0.5;
  }

  /**
   * Get win rate
   */
  getWinRate() {
    return this.gamesPlayed > 0 ? this.gamesWon / this.gamesPlayed : 0;
  }

  /**
   * Get strategic planning ratio
   */
  getStrategicPlanningRatio() {
    const total = this.plannedMoves + this.impulsiveMoves;
    return total > 0 ? this.plannedMoves / total : 0.5;
  }

  /**
   * Get risk tolerance score (0-1)
   */
  getRiskTolerance() {
    // Based on going to jail, bankruptcy, high value trades
    const jailRisk = Math.min(this.jailVisits / 10, 1);
    const bankruptcyRisk = Math.min(this.bankruptcyCount / 5, 1);
    const highValueRatio = this.highValueTrades / Math.max(this.tradesCompleted, 1);
    return Math.min((jailRisk + bankruptcyRisk + highValueRatio) / 3, 1);
  }

  /**
   * Get social interaction score (0-1)
   */
  getSocialInteractionScore() {
    return Math.min(this.socialMessages / 50 + this.tradesCompleted / 20, 1);
  }

  /**
   * Get win intensity score (0-1)
   */
  getWinIntensity() {
    return this.getWinRate() * 0.6 + (this.firstPlaceFinishes / Math.max(this.gamesPlayed, 1)) * 0.4;
  }
}

/**
 * Player Segmentor - Segments players based on behavior
 */
class PlayerSegmentor {
  /**
   * @param {Object} analyticsEngine - Analytics engine for tracking metrics
   */
  constructor(analyticsEngine) {
    this.analyticsEngine = analyticsEngine;
    this.segmentCache = new Map();
    this.metricsCache = new Map();
    this.analyticsEngine = analyticsEngine || {
      trackEvent: () => {},
      getPlayerMetrics: (playerId) => this.metricsCache.get(playerId) || new PlayerMetrics(playerId)
    };
  }

  /**
   * Segment a player based on their behavior
   * @param {string} playerId - Player identifier
   * @returns {string} Segment type: 'casual'|'strategic'|'competitive'|'social'
   */
  segmentPlayer(playerId) {
    const metrics = this.analyzePlayerBehavior(playerId);
    const segment = this.classifyPlayer(metrics);
    this.segmentCache.set(playerId, {
      segment,
      timestamp: Date.now(),
      confidence: this.calculateConfidence(metrics)
    });
    return segment;
  }

  /**
   * Get cached segment for a player
   * @param {string} playerId - Player identifier
   * @returns {Object|null} Cached segment data or null
   */
  getPlayerSegment(playerId) {
    const cached = this.segmentCache.get(playerId);
    if (!cached) return null;
    
    // Check if cache is still valid (5 minutes)
    const age = Date.now() - cached.timestamp;
    if (age > 5 * 60 * 1000) {
      return null;
    }
    return cached;
  }

  /**
   * Analyze player behavior and return metrics
   * @param {string} playerId - Player identifier
   * @returns {PlayerMetrics} Player metrics object
   */
  analyzePlayerBehavior(playerId) {
    if (this.metricsCache.has(playerId)) {
      return this.metricsCache.get(playerId);
    }
    
    const metrics = this.analyticsEngine.getPlayerMetrics(playerId);
    this.metricsCache.set(playerId, metrics);
    return metrics;
  }

  /**
   * Update player segment
   * @param {string} playerId - Player identifier
   * @returns {string} New segment type
   */
  updateSegment(playerId) {
    this.segmentCache.delete(playerId);
    return this.segmentPlayer(playerId);
  }

  /**
   * Classify player into segment based on metrics
   * @param {PlayerMetrics} metrics - Player metrics
   * @returns {string} Segment type
   */
  classifyPlayer(metrics) {
    const scores = this.calculateSegmentScores(metrics);
    return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
  }

  /**
   * Calculate scores for each segment
   * @param {PlayerMetrics} metrics - Player metrics
   * @returns {Object} Scores for each segment
   */
  calculateSegmentScores(metrics) {
    const strategicPlanning = metrics.getStrategicPlanningRatio();
    const riskTolerance = metrics.getRiskTolerance();
    const socialInteractions = metrics.getSocialInteractionScore();
    const winIntensity = metrics.getWinIntensity();
    const tradeFrequency = metrics.getTradeSuccessRate();

    return {
      [SEGMENT_TYPES.CASUAL]: (
        (1 - strategicPlanning) * SEGMENT_WEIGHTS.strategicPlanning +
        (1 - riskTolerance) * SEGMENT_WEIGHTS.riskTolerance +
        (1 - winIntensity) * SEGMENT_WEIGHTS.winIntensity
      ),
      [SEGMENT_TYPES.STRATEGIC]: (
        strategicPlanning * SEGMENT_WEIGHTS.strategicPlanning +
        (1 - riskTolerance) * SEGMENT_WEIGHTS.riskTolerance +
        (1 - winIntensity) * SEGMENT_WEIGHTS.winIntensity
      ),
      [SEGMENT_TYPES.COMPETITIVE]: (
        winIntensity * SEGMENT_WEIGHTS.winIntensity +
        riskTolerance * SEGMENT_WEIGHTS.riskTolerance +
        strategicPlanning * SEGMENT_WEIGHTS.strategicPlanning
      ),
      [SEGMENT_TYPES.SOCIAL]: (
        socialInteractions * SEGMENT_WEIGHTS.socialInteractions +
        tradeFrequency * SEGMENT_WEIGHTS.tradeFrequency +
        (1 - winIntensity) * SEGMENT_WEIGHTS.winIntensity
      )
    };
  }

  /**
   * Calculate confidence in segment classification
   * @param {PlayerMetrics} metrics - Player metrics
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(metrics) {
    const totalActions = metrics.gamesPlayed + metrics.tradesCompleted + metrics.turnsPlayed;
    if (totalActions === 0) return 0;
    return Math.min(totalActions / 50, 1);
  }

  /**
   * Get all segments for a player
   * @param {string} playerId - Player identifier
   * @returns {Object} All segment scores
   */
  getAllSegmentScores(playerId) {
    const metrics = this.analyzePlayerBehavior(playerId);
    return this.calculateSegmentScores(metrics);
  }

  /**
   * Clear segment cache
   */
  clearCache() {
    this.segmentCache.clear();
  }

  /**
   * Record a player action for metrics tracking
   * @param {string} playerId - Player identifier
   * @param {string} actionType - Type of action
   * @param {Object} data - Action data
   */
  recordAction(playerId, actionType, data = {}) {
    let metrics = this.metricsCache.get(playerId);
    if (!metrics) {
      metrics = new PlayerMetrics(playerId);
      this.metricsCache.set(playerId, metrics);
    }

    switch (actionType) {
      case 'trade':
        if (data.completed) metrics.tradesCompleted++;
        else metrics.tradesProposed++;
        if (data.value > 1000) metrics.highValueTrades++;
        else metrics.lowValueTrades++;
        break;
      case 'auction':
        if (data.won) metrics.auctionsWon++;
        else metrics.auctionsLost++;
        break;
      case 'social':
        metrics.socialMessages++;
        break;
      case 'property':
        if (data.acquired) metrics.propertiesAcquired++;
        else metrics.propertiesLost++;
        break;
      case 'jail':
        metrics.jailVisits++;
        break;
      case 'go_jail':
        metrics.goJailCount++;
        break;
      case 'win':
        metrics.gamesWon++;
        metrics.totalWins++;
        break;
      case 'game':
        metrics.gamesPlayed++;
        break;
      case 'money':
        if (data.earned) metrics.moneyEarned += data.amount;
        else if (data.spent) metrics.moneySpent += data.amount;
        else metrics.moneyLost += data.amount;
        break;
      case 'turn':
        metrics.turnsPlayed++;
        break;
      case 'planned_move':
        metrics.plannedMoves++;
        break;
      case 'impulsive_move':
        metrics.impulsiveMoves++;
        break;
      case 'develop':
        metrics.propertiesDeveloped++;
        break;
      case 'mortgage':
        metrics.mortgageActions++;
        break;
      case 'bankruptcy':
        metrics.bankruptcyCount++;
        break;
      case 'first_place':
        metrics.firstPlaceFinishes++;
        break;
      case 'last_place':
        metrics.lastPlaceFinishes++;
        break;
    }

    this.analyticsEngine.trackEvent?.(playerId, actionType, data);
  }
}

export { 
  PlayerSegmentor, 
  PlayerMetrics, 
  SEGMENT_TYPES, 
  SEGMENT_WEIGHTS, 
  SEGMENT_THRESHOLDS 
};