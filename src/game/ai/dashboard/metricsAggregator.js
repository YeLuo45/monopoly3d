/**
 * MetricsAggregator - Aggregate raw metrics from memory layer
 * 
 * Provides functions to extract and aggregate performance metrics
 * from the memory layer for the AI Performance Dashboard.
 */

export class MetricsAggregator {
  /**
   * @param {object} memoryLayer - Memory layer instance (L0-L4)
   */
  constructor(memoryLayer) {
    this.memoryLayer = memoryLayer;
    this.supportedMetrics = [
      'win_rate',
      'avg_placement',
      'money_final',
      'rent_collected',
      'properties_owned',
      'questions_answered',
      'trade_count',
      'decisions_made',
      'self_assessment_accuracy',
    ];
  }

  /**
   * Get raw metric value from memory layer
   * @param {string} playerId - Player ID
   * @param {string} metricName - Metric name
   * @param {number} games - Number of recent games to analyze
   * @returns {number} Metric value
   */
  getRawMetric(playerId, metricName, games = 20) {
    switch (metricName) {
      case 'win_rate':
        return this._getWinRate(playerId, games);
      case 'avg_placement':
        return this._getAveragePlacement(playerId, games);
      case 'money_final':
        return this._getAverageMoney(playerId, games);
      case 'rent_collected':
        return this._getTotalRentCollected(playerId, games);
      case 'properties_owned':
        return this._getAveragePropertiesOwned(playerId, games);
      case 'questions_answered':
        return this._getQuestionsAnswered(playerId, games);
      case 'trade_count':
        return this._getTradeCount(playerId, games);
      case 'decisions_made':
        return this._getDecisionsMade(playerId, games);
      case 'self_assessment_accuracy':
        return this._getSelfAssessmentAccuracy(playerId);
      default:
        return 0;
    }
  }

  /**
   * Aggregate data points using specified method
   * @param {string} metricName - Metric to aggregate
   * @param {Array} dataPoints - Array of data points
   * @returns {object} Aggregated result {avg, min, max, median}
   */
  aggregate(metricName, dataPoints) {
    if (!dataPoints || dataPoints.length === 0) {
      return { avg: 0, min: 0, max: 0, median: 0 };
    }

    const sorted = [...dataPoints].sort((a, b) => a - b);
    const sum = dataPoints.reduce((a, b) => a + b, 0);
    const avg = sum / dataPoints.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = this._calculateMedian(sorted);

    return { avg, min, max, median };
  }

  /**
   * Get win rate for player
   * @private
   */
  _getWinRate(playerId, games) {
    const l4 = this.memoryLayer?.l4 || this.memoryLayer;
    if (l4 && typeof l4.getDetailedStats === 'function') {
      const stats = l4.getDetailedStats(playerId, games);
      return stats.winRate || 0;
    }
    return 0;
  }

  /**
   * Get average placement (rank) for player
   * @private
   */
  _getAveragePlacement(playerId, games) {
    const l4 = this.memoryLayer?.l4 || this.memoryLayer;
    if (l4 && l4.performanceLog) {
      const log = l4.performanceLog.get(playerId);
      if (log && log.length > 0) {
        const recent = log.slice(-games);
        // Assume placement is stored as rank (1-4)
        const placements = recent
          .map(entry => entry.rank)
          .filter(r => r !== undefined);
        if (placements.length > 0) {
          return placements.reduce((a, b) => a + b, 0) / placements.length;
        }
      }
    }
    // Fallback: calculate from wins
    const winRate = this._getWinRate(playerId, games);
    // Estimate placement based on win rate (higher win rate = better placement)
    // For 4 players, average placement 1-4, where 1 is best
    // Assume players with higher win rate get better (lower) placement
    return 4 - (winRate * 3);
  }

  /**
   * Get average final money across games
   * @private
   */
  _getAverageMoney(playerId, games) {
    const l4 = this.memoryLayer?.l4 || this.memoryLayer;
    if (l4 && l4.performanceLog) {
      const log = l4.performanceLog.get(playerId);
      if (log && log.length > 0) {
        const recent = log.slice(-games);
        const moneyValues = recent
          .map(entry => entry.moneyFinal)
          .filter(m => m !== undefined);
        if (moneyValues.length > 0) {
          return moneyValues.reduce((a, b) => a + b, 0) / moneyValues.length;
        }
      }
    }
    return 0;
  }

  /**
   * Get total rent collected across games
   * @private
   */
  _getTotalRentCollected(playerId, games) {
    const l3 = this.memoryLayer?.l3 || this.memoryLayer;
    if (l3 && l3.strategies) {
      let total = 0;
      const strategies = Array.from(l3.strategies.values())
        .filter(s => s.playerId === playerId);
      for (const strategy of strategies) {
        total += strategy.rentCollected || 0;
      }
      return total;
    }
    return 0;
  }

  /**
   * Get average properties owned across games
   * @private
   */
  _getAveragePropertiesOwned(playerId, games) {
    const l3 = this.memoryLayer?.l3 || this.memoryLayer;
    if (l3 && l3.strategies) {
      let total = 0;
      let count = 0;
      const strategies = Array.from(l3.strategies.values())
        .filter(s => s.playerId === playerId);
      for (const strategy of strategies) {
        if (strategy.propertiesOwned !== undefined) {
          total += strategy.propertiesOwned;
          count++;
        }
      }
      return count > 0 ? total / count : 0;
    }
    return 0;
  }

  /**
   * Get questions answered count
   * @private
   */
  _getQuestionsAnswered(playerId, games) {
    const l2 = this.memoryLayer?.l2 || this.memoryLayer;
    if (l2 && typeof l2.getQuestionsAnswered === 'function') {
      return l2.getQuestionsAnswered(playerId);
    }
    return 0;
  }

  /**
   * Get trade count across games
   * @private
   */
  _getTradeCount(playerId, games) {
    const l3 = this.memoryLayer?.l3 || this.memoryLayer;
    if (l3 && l3.strategies) {
      let total = 0;
      const strategies = Array.from(l3.strategies.values())
        .filter(s => s.playerId === playerId);
      for (const strategy of strategies) {
        total += strategy.tradeCount || 0;
      }
      return total;
    }
    return 0;
  }

  /**
   * Get decisions made count
   * @private
   */
  _getDecisionsMade(playerId, games) {
    const l2 = this.memoryLayer?.l2 || this.memoryLayer;
    if (l2 && typeof l2.getDecisions === 'function') {
      const decisions = l2.getDecisions(playerId);
      return decisions.length;
    }
    return 0;
  }

  /**
   * Get self-assessment accuracy
   * @private
   */
  _getSelfAssessmentAccuracy(playerId) {
    const l4 = this.memoryLayer?.l4 || this.memoryLayer;
    if (l4 && typeof l4.getSelfConfidence === 'function') {
      const confidence = l4.getSelfConfidence(playerId);
      // Self-assessment accuracy is based on how well confidence matches actual performance
      // For now, we derive it from the confidence score
      // In a real scenario, we'd compare predicted vs actual outcomes
      return confidence;
    }
    return 0.5;
  }

  /**
   * Calculate median from sorted array
   * @private
   */
  _calculateMedian(sortedArray) {
    const len = sortedArray.length;
    if (len === 0) return 0;
    if (len % 2 === 0) {
      return (sortedArray[len / 2 - 1] + sortedArray[len / 2]) / 2;
    }
    return sortedArray[Math.floor(len / 2)];
  }

  /**
   * Check if metric is supported
   * @param {string} metricName - Metric name
   * @returns {boolean}
   */
  isSupported(metricName) {
    return this.supportedMetrics.includes(metricName);
  }

  /**
   * Get all supported metric names
   * @returns {Array<string>}
   */
  getSupportedMetrics() {
    return [...this.supportedMetrics];
  }
}