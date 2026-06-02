/**
 * Metrics Dashboard
 * 
 * Provides dashboard data for the Real-Time Analytics UI.
 * Part of the Real-Time Analytics System (Direction E v3).
 */

export class MetricsDashboard {
  /**
   * @param {GameAnalyticsEngine} analyticsEngine - The analytics engine instance
   */
  constructor(analyticsEngine) {
    this.analyticsEngine = analyticsEngine;
    
    // Chart configuration
    this.chartConfig = {
      defaultTimeRange: 60000, // 1 minute
      maxDataPoints: 100,
      refreshInterval: 5000, // 5 seconds
    };
    
    // Alert thresholds
    this.alertThresholds = {
      money_balance: { warning: 500, critical: 100 },
      net_worth: { declining: -200 },
      properties_owned: { min: 2 },
      decisions_correct_accuracy: { min: 0.5 },
    };
  }

  /**
   * Get all dashboard data for a player
   * @param {string} playerId - Player identifier
   * @returns {Object} Complete dashboard data
   */
  getDashboardData(playerId) {
    if (!playerId) {
      throw new Error('playerId is required');
    }
    
    const performance = this.analyticsEngine.analyzePlayerPerformance(playerId);
    const insights = this.analyticsEngine.getInsights(playerId);
    const recommendations = this.analyticsEngine.getRecommendations(playerId);
    const alerts = this.getAlerts(playerId);
    const trends = this.analyticsEngine.analyzeGameTrends();
    
    // Get current metrics summary
    const currentMetrics = this.analyticsEngine.metricsCollector.getCurrentMetrics(playerId);
    
    return {
      playerId,
      generatedAt: Date.now(),
      summary: {
        overallScore: performance.overallScore || 0,
        status: performance.status || 'no_data',
        alertCount: alerts.length,
        recommendationCount: recommendations.count,
        insightCount: insights.insights.length,
      },
      performance,
      insights: insights.insights,
      recommendations: recommendations.recommendations,
      alerts,
      trends,
      metrics: currentMetrics,
      refreshInterval: this.chartConfig.refreshInterval,
    };
  }

  /**
   * Get chart data for a specific metric
   * @param {string} playerId - Player identifier
   * @param {string} metricType - Type of metric
   * @param {Object} timeRange - Time range with start and end (optional)
   * @returns {Object} Chart-ready data
   */
  getMetricChartData(playerId, metricType, timeRange) {
    if (!playerId || !metricType) {
      throw new Error('playerId and metricType are required');
    }
    
    const now = Date.now();
    const range = timeRange || {
      start: now - this.chartConfig.defaultTimeRange,
      end: now,
    };
    
    // Get raw metric history
    const history = this.analyticsEngine.metricsCollector.getMetricHistory(
      playerId,
      metricType,
      range
    );
    
    // Resample data if too many points
    const sampledData = this._resampleData(history, this.chartConfig.maxDataPoints);
    
    // Calculate statistics
    const stats = this._calculateChartStats(sampledData);
    
    // Get unit label
    const metricInfo = this.analyticsEngine.metricsCollector.metricTypes[metricType] || {};
    
    return {
      metricType,
      playerId,
      timeRange: range,
      dataPoints: sampledData.length,
      data: sampledData,
      statistics: stats,
      unit: metricInfo.unit || 'value',
      labels: this._generateLabels(sampledData, range),
    };
  }

  /**
   * Get alerts for a player
   * @param {string} playerId - Player identifier
   * @returns {Array} List of alerts
   */
  getAlerts(playerId) {
    if (!playerId) {
      throw new Error('playerId is required');
    }
    
    const alerts = [];
    const currentMetrics = this.analyticsEngine.metricsCollector.getCurrentMetrics(playerId);
    
    if (!currentMetrics || !currentMetrics.metrics) {
      return alerts;
    }
    
    const metrics = currentMetrics.metrics;
    
    // Money balance alerts
    if (metrics.money_balance) {
      const balance = metrics.money_balance.current;
      if (balance <= this.alertThresholds.money_balance.critical) {
        alerts.push({
          type: 'critical',
          category: 'financial',
          title: 'Critical Balance',
          message: `Your balance ($${balance}) is critically low!`,
          metric: 'money_balance',
          value: balance,
          threshold: this.alertThresholds.money_balance.critical,
          timestamp: Date.now(),
        });
      } else if (balance <= this.alertThresholds.money_balance.warning) {
        alerts.push({
          type: 'warning',
          category: 'financial',
          title: 'Low Balance',
          message: `Your balance ($${balance}) is running low.`,
          metric: 'money_balance',
          value: balance,
          threshold: this.alertThresholds.money_balance.warning,
          timestamp: Date.now(),
        });
      }
    }
    
    // Property alerts
    if (metrics.properties_owned) {
      const owned = metrics.properties_owned.current;
      if (owned < this.alertThresholds.properties_owned.min) {
        alerts.push({
          type: 'info',
          category: 'property',
          title: 'Property Opportunity',
          message: 'You own few properties. Consider acquiring more.',
          metric: 'properties_owned',
          value: owned,
          threshold: this.alertThresholds.properties_owned.min,
          timestamp: Date.now(),
        });
      }
    }
    
    // Decision accuracy alerts
    if (metrics.decisions_made && metrics.decisions_correct) {
      const decisions = metrics.decisions_made.current;
      const correct = metrics.decisions_correct.current;
      if (decisions >= 5) { // Only alert after minimum decisions
        const accuracy = correct / decisions;
        if (accuracy < this.alertThresholds.decisions_correct_accuracy.min) {
          alerts.push({
            type: 'warning',
            category: 'decision',
            title: 'Decision Accuracy Low',
            message: `Your decision accuracy (${(accuracy * 100).toFixed(1)}%) could be improved.`,
            metric: 'decisions_correct',
            value: accuracy,
            threshold: this.alertThresholds.decisions_correct_accuracy.min,
            timestamp: Date.now(),
          });
        }
      }
    }
    
    // Net worth decline alerts
    if (metrics.net_worth) {
      const now = Date.now();
      const recentNetWorth = this.analyticsEngine.metricsCollector.aggregateMetrics(
        playerId,
        'net_worth',
        { start: now - 60000, end: now }
      );
      const historicalNetWorth = this.analyticsEngine.metricsCollector.aggregateMetrics(
        playerId,
        'net_worth',
        { start: now - 300000, end: now - 60000 }
      );
      
      if (recentNetWorth.avg && historicalNetWorth.avg) {
        const decline = historicalNetWorth.avg - recentNetWorth.avg;
        if (decline > this.alertThresholds.net_worth.declining) {
          alerts.push({
            type: 'warning',
            category: 'financial',
            title: 'Net Worth Declining',
            message: `Your net worth has decreased by $${decline.toFixed(0)} recently.`,
            metric: 'net_worth',
            value: recentNetWorth.avg,
            decline: decline,
            threshold: this.alertThresholds.net_worth.declining,
            timestamp: Date.now(),
          });
        }
      }
    }
    
    // Sort by severity
    alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.type] - severityOrder[b.type];
    });
    
    return alerts;
  }

  /**
   * Resample data to target number of points
   * @private
   */
  _resampleData(data, maxPoints) {
    if (data.length <= maxPoints) {
      return data;
    }
    
    const result = [];
    const step = data.length / maxPoints;
    
    for (let i = 0; i < maxPoints; i++) {
      const index = Math.floor(i * step);
      result.push(data[index]);
    }
    
    // Always include the last point
    if (result[result.length - 1] !== data[data.length - 1]) {
      result.push(data[data.length - 1]);
    }
    
    return result;
  }

  /**
   * Calculate statistics for chart data
   * @private
   */
  _calculateChartStats(data) {
    if (!data || data.length === 0) {
      return { min: null, max: null, avg: null, current: null, change: null };
    }
    
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const current = values[values.length - 1];
    const first = values[0];
    const change = first !== 0 ? (current - first) / first : 0;
    
    return { min, max, avg, current, change };
  }

  /**
   * Generate labels for chart
   * @private
   */
  _generateLabels(data, range) {
    const labels = [];
    const duration = range.end - range.start;
    
    for (const point of data) {
      const offset = point.timestamp - range.start;
      const percent = duration > 0 ? (offset / duration) * 100 : 0;
      labels.push(`${percent.toFixed(0)}%`);
    }
    
    return labels;
  }

  /**
   * Get dashboard configuration
   * @returns {Object} Dashboard configuration
   */
  getConfig() {
    return {
      chartConfig: { ...this.chartConfig },
      alertThresholds: { ...this.alertThresholds },
    };
  }

  /**
   * Update configuration
   * @param {Object} config - New configuration values
   */
  updateConfig(config) {
    if (config.refreshInterval) {
      this.chartConfig.refreshInterval = config.refreshInterval;
    }
    if (config.maxDataPoints) {
      this.chartConfig.maxDataPoints = config.maxDataPoints;
    }
    if (config.alertThresholds) {
      this.alertThresholds = { ...this.alertThresholds, ...config.alertThresholds };
    }
  }
}