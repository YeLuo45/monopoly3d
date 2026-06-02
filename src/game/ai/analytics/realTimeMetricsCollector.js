/**
 * Real-Time Metrics Collector
 * 
 * Collects and aggregates real-time game metrics for players.
 * Part of the Real-Time Analytics System (Direction E v3).
 */

export class RealTimeMetricsCollector {
  constructor() {
    // Internal storage: Map<playerId, Map<metricType, Array<{value, timestamp}>>>
    this.metrics = new Map();
    
    // Configuration
    this.config = {
      maxMetricsPerPlayer: 10000,
      defaultTimeWindow: 60000, // 60 seconds
      cleanupInterval: 300000,  // 5 minutes
    };
    
    // Metric type definitions with aggregation preferences
    this.metricTypes = {
      // Money metrics
      money_balance: { unit: 'currency', min: 0 },
      money_income: { unit: 'currency', min: 0 },
      money_expense: { unit: 'currency', min: 0 },
      
      // Property metrics
      properties_owned: { unit: 'count', min: 0 },
      properties_mortgaged: { unit: 'count', min: 0 },
      rent_collected: { unit: 'currency', min: 0 },
      rent_paid: { unit: 'currency', min: 0 },
      
      // Position and movement
      position: { unit: 'board_position', min: 0, max: 39 },
      spaces_moved: { unit: 'count', min: 0 },
      
      // Game events
      dice_roll: { unit: 'dice_sum', min: 2, max: 12 },
      dice_doubles: { unit: 'count', min: 0 },
      jail_visits: { unit: 'count', min: 0 },
      go_pass_count: { unit: 'count', min: 0 },
      
      // Trading
      trades_proposed: { unit: 'count', min: 0 },
      trades_accepted: { unit: 'count', min: 0 },
      trades_rejected: { unit: 'count', min: 0 },
      
      // Auction
      auctions_won: { unit: 'count', min: 0 },
      auctions_lost: { unit: 'count', min: 0 },
      auction_bid_total: { unit: 'currency', min: 0 },
      
      // Performance metrics
      net_worth: { unit: 'currency', min: 0 },
      turn_count: { unit: 'count', min: 0 },
      bankruptcy_count: { unit: 'count', min: 0 },
      
      // Decision metrics
      decisions_made: { unit: 'count', min: 0 },
      decisions_correct: { unit: 'count', min: 0 },
      
      // Time metrics
      turn_duration: { unit: 'milliseconds', min: 0 },
      game_time_elapsed: { unit: 'milliseconds', min: 0 },
    };
    
    // Start cleanup timer
    this.cleanupTimer = null;
    this._startCleanupTimer();
  }

  /**
   * Record a metric for a player
   * @param {string} playerId - Player identifier
   * @param {string} metricType - Type of metric
   * @param {number} value - Metric value
   * @param {number} timestamp - Unix timestamp in milliseconds (optional, defaults to now)
   */
  recordMetric(playerId, metricType, value, timestamp = Date.now()) {
    if (!playerId || !metricType) {
      throw new Error('playerId and metricType are required');
    }
    
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('value must be a valid number');
    }
    
    // Initialize player metrics if not exists
    if (!this.metrics.has(playerId)) {
      this.metrics.set(playerId, new Map());
    }
    
    const playerMetrics = this.metrics.get(playerId);
    
    // Initialize metric type array if not exists
    if (!playerMetrics.has(metricType)) {
      playerMetrics.set(metricType, []);
    }
    
    const metricData = playerMetrics.get(metricType);
    
    // Add new metric entry
    metricData.push({
      value,
      timestamp,
    });
    
    // Enforce max metrics limit
    if (metricData.length > this.config.maxMetricsPerPlayer) {
      // Remove oldest entries (keep most recent maxMetricsPerPlayer)
      const removed = metricData.length - this.config.maxMetricsPerPlayer;
      metricData.splice(0, removed);
    }
  }

  /**
   * Get current metrics for a player
   * @param {string} playerId - Player identifier
   * @returns {Object} Current metrics summary
   */
  getCurrentMetrics(playerId) {
    if (!playerId) {
      throw new Error('playerId is required');
    }
    
    const playerMetrics = this.metrics.get(playerId);
    
    if (!playerMetrics) {
      return {
        playerId,
        metrics: {},
        summary: {
          totalMetricTypes: 0,
          totalMetricPoints: 0,
          lastUpdated: null,
        },
      };
    }
    
    const result = {
      playerId,
      metrics: {},
      summary: {
        totalMetricTypes: 0,
        totalMetricPoints: 0,
        lastUpdated: null,
      },
    };
    
    for (const [metricType, dataPoints] of playerMetrics) {
      if (dataPoints.length === 0) continue;
      
      result.summary.totalMetricTypes++;
      result.summary.totalMetricPoints += dataPoints.length;
      
      const latestPoint = dataPoints[dataPoints.length - 1];
      if (!result.summary.lastUpdated || latestPoint.timestamp > result.summary.lastUpdated) {
        result.summary.lastUpdated = latestPoint.timestamp;
      }
      
      // Calculate current value (latest)
      result.metrics[metricType] = {
        current: latestPoint.value,
        unit: this.metricTypes[metricType]?.unit || 'unknown',
        dataPoints: dataPoints.length,
        latestTimestamp: latestPoint.timestamp,
      };
    }
    
    return result;
  }

  /**
   * Aggregate metrics over a time range
   * @param {string} playerId - Player identifier
   * @param {string} metricType - Type of metric
   * @param {Object} timeRange - Time range with start and end timestamps
   * @returns {Object} Aggregated metric data
   */
  aggregateMetrics(playerId, metricType, timeRange) {
    if (!playerId || !metricType) {
      throw new Error('playerId and metricType are required');
    }
    
    const { start, end } = timeRange || { start: 0, end: Date.now() };
    
    const playerMetrics = this.metrics.get(playerId);
    
    if (!playerMetrics) {
      return {
        metricType,
        playerId,
        count: 0,
        sum: 0,
        min: null,
        max: null,
        avg: null,
        start,
        end,
      };
    }
    
    const metricData = playerMetrics.get(metricType);
    
    if (!metricData || metricData.length === 0) {
      return {
        metricType,
        playerId,
        count: 0,
        sum: 0,
        min: null,
        max: null,
        avg: null,
        start,
        end,
      };
    }
    
    // Filter by time range
    const filteredData = metricData.filter(
      (point) => point.timestamp >= start && point.timestamp <= end
    );
    
    if (filteredData.length === 0) {
      return {
        metricType,
        playerId,
        count: 0,
        sum: 0,
        min: null,
        max: null,
        avg: null,
        start,
        end,
      };
    }
    
    // Calculate aggregations
    const values = filteredData.map((point) => point.value);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = sum / values.length;
    
    return {
      metricType,
      playerId,
      count: filteredData.length,
      sum,
      min,
      max,
      avg,
      start,
      end,
    };
  }

  /**
   * Get average value for a metric type
   * @param {string} playerId - Player identifier
   * @param {string} metricType - Type of metric
   * @param {number} timeWindow - Time window in ms (optional, uses default)
   * @returns {number} Average value
   */
  getAverageMetric(playerId, metricType, timeWindow = this.config.defaultTimeWindow) {
    const end = Date.now();
    const start = end - timeWindow;
    
    const aggregation = this.aggregateMetrics(playerId, metricType, { start, end });
    
    return aggregation.avg;
  }

  /**
   * Get metric history for charting
   * @param {string} playerId - Player identifier
   * @param {string} metricType - Type of metric
   * @param {Object} timeRange - Time range with start and end timestamps
   * @returns {Array} Array of {timestamp, value} objects
   */
  getMetricHistory(playerId, metricType, timeRange) {
    if (!playerId || !metricType) {
      throw new Error('playerId and metricType are required');
    }
    
    const { start, end } = timeRange || { start: 0, end: Date.now() };
    
    const playerMetrics = this.metrics.get(playerId);
    
    if (!playerMetrics) {
      return [];
    }
    
    const metricData = playerMetrics.get(metricType);
    
    if (!metricData) {
      return [];
    }
    
    return metricData
      .filter((point) => point.timestamp >= start && point.timestamp <= end)
      .map((point) => ({
        timestamp: point.timestamp,
        value: point.value,
      }));
  }

  /**
   * Clear all metrics for a player
   * @param {string} playerId - Player identifier
   */
  clearPlayerMetrics(playerId) {
    if (!playerId) {
      throw new Error('playerId is required');
    }
    
    this.metrics.delete(playerId);
  }

  /**
   * Clear all metrics
   */
  clearAllMetrics() {
    this.metrics.clear();
  }

  /**
   * Get list of all metric types being tracked
   * @returns {Array} List of metric type names
   */
  getMetricTypes() {
    return Object.keys(this.metricTypes);
  }

  /**
   * Start the cleanup timer for old metrics
   * @private
   */
  _startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this._cleanupOldMetrics();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up old metrics beyond retention period
   * @private
   */
  _cleanupOldMetrics() {
    const now = Date.now();
    const retentionPeriod = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [playerId, playerMetrics] of this.metrics) {
      for (const [metricType, dataPoints] of playerMetrics) {
        // Remove points older than retention period
        const validPoints = dataPoints.filter(
          (point) => now - point.timestamp < retentionPeriod
        );
        
        if (validPoints.length === 0) {
          playerMetrics.delete(metricType);
        } else {
          dataPoints.length = 0;
          dataPoints.push(...validPoints);
        }
      }
      
      // Remove player if no metrics left
      if (playerMetrics.size === 0) {
        this.metrics.delete(playerId);
      }
    }
  }

  /**
   * Stop cleanup timer (for shutdown)
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clearAllMetrics();
  }
}