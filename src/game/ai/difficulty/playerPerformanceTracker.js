/**
 * Player Performance Tracker
 * 
 * Tracks player performance metrics over time to identify trends
 * and patterns. Part of the Dynamic Difficulty Adjustment System (Direction E v6).
 */

export class PlayerPerformanceTracker {
  constructor() {
    // Store performance history per player
    // Structure: { playerId: { history: [], trendCache: Map } }
    this.playerData = new Map();
    
    // Configuration
    this.maxHistorySize = 100;
    this.trendThreshold = 0.1; // 10% change threshold for trend detection
    this.smoothingFactor = 0.3; // EMA smoothing factor
  }

  /**
   * Record performance metrics for a player
   * @param {string} playerId - Player identifier
   * @param {Object} metrics - Performance metrics to record
   */
  recordPerformance(playerId, metrics) {
    if (!this.playerData.has(playerId)) {
      this.playerData.set(playerId, {
        history: [],
        trendCache: new Map(),
      });
    }

    const playerRecord = this.playerData.get(playerId);
    
    // Create performance entry with timestamp
    const entry = {
      timestamp: Date.now(),
      metrics: { ...metrics },
      // Pre-calculate simple aggregations
      overallScore: this._calculateOverallScore(metrics),
    };

    // Add to history
    playerRecord.history.push(entry);

    // Trim history if needed
    if (playerRecord.history.length > this.maxHistorySize) {
      playerRecord.history.shift();
    }

    // Clear trend cache since new data invalidates it
    playerRecord.trendCache.clear();

    return entry;
  }

  /**
   * Get performance history for a player
   * @param {string} playerId - Player identifier
   * @param {Object} range - Optional range filter { start, end } or count
   * @returns {Array} Performance history entries
   */
  getPerformanceHistory(playerId, range = {}) {
    const playerRecord = this.playerData.get(playerId);
    
    if (!playerRecord) {
      return [];
    }

    let history = playerRecord.history;

    // Filter by count (last N entries)
    if (typeof range.count === 'number') {
      return history.slice(-range.count);
    }

    // Filter by time range
    if (range.start !== undefined || range.end !== undefined) {
      const startTime = range.start || 0;
      const endTime = range.end || Date.now();
      
      history = history.filter(
        entry => entry.timestamp >= startTime && entry.timestamp <= endTime
      );
    }

    return history;
  }

  /**
   * Get performance trend for a player
   * @param {string} playerId - Player identifier
   * @returns {Object} Trend analysis { direction, magnitude, confidence }
   */
  getPerformanceTrend(playerId) {
    const history = this.getPerformanceHistory(playerId, { count: 10 });
    
    if (history.length < 2) {
      return {
        direction: 'stable',
        magnitude: 0,
        confidence: 0,
        sampleSize: history.length,
      };
    }

    // Calculate trend using linear regression on overall scores
    const scores = history.map((entry, index) => ({
      x: index,
      y: entry.overallScore,
    }));

    // Simple linear regression
    const n = scores.length;
    const sumX = scores.reduce((acc, s) => acc + s.x, 0);
    const sumY = scores.reduce((acc, s) => acc + s.y, 0);
    const sumXY = scores.reduce((acc, s) => acc + s.x * s.y, 0);
    const sumX2 = scores.reduce((acc, s) => acc + s.x * s.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;

    // Normalize slope to get magnitude (per-entry change rate)
    const avgScore = sumY / n;
    const magnitude = avgScore !== 0 ? slope / avgScore : 0;

    // Determine direction
    let direction = 'stable';
    if (magnitude > this.trendThreshold) {
      direction = 'improving';
    } else if (magnitude < -this.trendThreshold) {
      direction = 'declining';
    }

    // Confidence based on sample size and variance
    const variance = this._calculateVariance(scores.map(s => s.y));
    const confidence = this._calculateConfidence(n, variance);

    return {
      direction,
      magnitude,
      confidence,
      sampleSize: n,
      slope,
    };
  }

  /**
   * Check if a player is improving
   * @param {string} playerId - Player identifier
   * @returns {boolean} True if player is improving
   */
  isImproving(playerId) {
    const trend = this.getPerformanceTrend(playerId);
    
    // Consider improving if trend direction is positive and confidence is reasonable
    return trend.direction === 'improving' && trend.confidence > 0.5;
  }

  /**
   * Get average performance over a window
   * @param {string} playerId - Player identifier
   * @param {number} windowSize - Number of recent entries to average
   * @returns {number} Average overall score
   */
  getAveragePerformance(playerId, windowSize = 5) {
    const history = this.getPerformanceHistory(playerId, { count: windowSize });
    
    if (history.length === 0) {
      return 0;
    }

    const sum = history.reduce((acc, entry) => acc + entry.overallScore, 0);
    return sum / history.length;
  }

  /**
   * Get performance volatility (standard deviation)
   * @param {string} playerId - Player identifier
   * @param {number} windowSize - Number of recent entries
   * @returns {number} Standard deviation of scores
   */
  getPerformanceVolatility(playerId, windowSize = 10) {
    const history = this.getPerformanceHistory(playerId, { count: windowSize });
    
    if (history.length < 2) {
      return 0;
    }

    const scores = history.map(entry => entry.overallScore);
    return this._calculateStdDev(scores);
  }

  /**
   * Clear all data for a player
   * @param {string} playerId - Player identifier
   */
  clearPlayerData(playerId) {
    this.playerData.delete(playerId);
  }

  /**
   * Clear all tracked data
   */
  clearAll() {
    this.playerData.clear();
  }

  // ==================== Private Methods ====================

  /**
   * Calculate overall score from metrics
   * @private
   */
  _calculateOverallScore(metrics) {
    // Simple weighted average of key metrics
    const weights = {
      winRate: 0.3,
      moneyBalance: 0.2,
      propertyCount: 0.15,
      decisionAccuracy: 0.25,
      activityLevel: 0.1,
    };

    let score = 0;
    let totalWeight = 0;

    if (metrics.winRate !== undefined) {
      score += metrics.winRate * weights.winRate;
      totalWeight += weights.winRate;
    }

    if (metrics.moneyBalance !== undefined) {
      // Normalize: assume 5000 is good, scale accordingly
      const normalized = Math.min(1, metrics.moneyBalance / 5000);
      score += normalized * weights.moneyBalance;
      totalWeight += weights.moneyBalance;
    }

    if (metrics.propertyCount !== undefined) {
      // Normalize: assume 10 properties is good
      const normalized = Math.min(1, metrics.propertyCount / 10);
      score += normalized * weights.propertyCount;
      totalWeight += weights.propertyCount;
    }

    if (metrics.decisionAccuracy !== undefined) {
      score += metrics.decisionAccuracy * weights.decisionAccuracy;
      totalWeight += weights.decisionAccuracy;
    }

    if (metrics.activityLevel !== undefined) {
      score += metrics.activityLevel * weights.activityLevel;
      totalWeight += weights.activityLevel;
    }

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Calculate variance of an array
   * @private
   */
  _calculateVariance(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   * @private
   */
  _calculateStdDev(values) {
    return Math.sqrt(this._calculateVariance(values));
  }

  /**
   * Calculate confidence score based on sample size and variance
   * @private
   */
  _calculateConfidence(sampleSize, variance) {
    // Higher sample size = higher confidence
    // Lower variance = higher confidence
    const sizeFactor = Math.min(1, sampleSize / 10);
    const varianceFactor = Math.max(0, 1 - variance * 10);
    
    return (sizeFactor * 0.6 + varianceFactor * 0.4);
  }
}