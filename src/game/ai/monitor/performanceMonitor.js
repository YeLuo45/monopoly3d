/**
 * PerformanceMonitor - Tracks and analyzes agent performance metrics
 * Part of Direction D v7: Agent Performance Monitoring System
 */

export class PerformanceMonitor {
  constructor() {
    // Store metrics: Map<agentId, Map<metric, Array<{value, timestamp}>>>
    this.metrics = new Map();
    
    // Threshold configuration for alerts
    this.thresholds = {
      responseTime: 1000,      // ms
      errorRate: 0.05,         // 5%
      cpuUsage: 0.8,           // 80%
      memoryUsage: 0.9,        // 90%
      throughput: 10           // ops/sec minimum
    };
    
    // Score weights for overall performance calculation
    this.scoreWeights = {
      responseTime: 0.25,
      errorRate: 0.25,
      throughput: 0.25,
      successRate: 0.25
    };
  }

  /**
   * Record a metric for an agent
   * @param {string} agentId - Agent identifier
   * @param {string} metric - Metric name (responseTime, errorRate, cpuUsage, memoryUsage, throughput, successRate)
   * @param {number} value - Metric value
   * @param {number} timestamp - Timestamp (optional, defaults to Date.now())
   */
  recordMetric(agentId, metric, value, timestamp = Date.now()) {
    if (!this.metrics.has(agentId)) {
      this.metrics.set(agentId, new Map());
    }
    
    const agentMetrics = this.metrics.get(agentId);
    if (!agentMetrics.has(metric)) {
      agentMetrics.set(metric, []);
    }
    
    agentMetrics.get(metric).push({ value, timestamp });
    
    // Keep only last 1000 entries per metric to prevent memory issues
    const entries = agentMetrics.get(metric);
    if (entries.length > 1000) {
      entries.shift();
    }
  }

  /**
   * Get metrics for an agent within a time range
   * @param {string} agentId - Agent identifier
   * @param {string} metricType - Type of metric to retrieve
   * @param {Object} timeRange - { start, end } timestamps
   * @returns {Array} Array of metric entries within the range
   */
  getAgentMetrics(agentId, metricType, timeRange = null) {
    const agentMetrics = this.metrics.get(agentId);
    if (!agentMetrics) {
      return [];
    }
    
    const metrics = agentMetrics.get(metricType);
    if (!metrics) {
      return [];
    }
    
    if (!timeRange) {
      return [...metrics];
    }
    
    return metrics.filter(entry => 
      entry.timestamp >= timeRange.start && entry.timestamp <= timeRange.end
    );
  }

  /**
   * Calculate overall performance score for an agent (0-100)
   * @param {string} agentId - Agent identifier
   * @returns {number} Performance score
   */
  getAgentScore(agentId) {
    const agentMetrics = this.metrics.get(agentId);
    if (!agentMetrics) {
      return 0;
    }
    
    let totalScore = 0;
    let weightSum = 0;
    
    // Calculate response time score (lower is better)
    const responseTimes = agentMetrics.get('responseTime');
    if (responseTimes && responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((sum, e) => sum + e.value, 0) / responseTimes.length;
      const responseScore = Math.max(0, 100 - (avgResponseTime / this.thresholds.responseTime) * 100);
      totalScore += responseScore * this.scoreWeights.responseTime;
      weightSum += this.scoreWeights.responseTime;
    }
    
    // Calculate error rate score (lower is better)
    const errorRates = agentMetrics.get('errorRate');
    if (errorRates && errorRates.length > 0) {
      const avgErrorRate = errorRates.reduce((sum, e) => sum + e.value, 0) / errorRates.length;
      const errorScore = Math.max(0, 100 - (avgErrorRate / this.thresholds.errorRate) * 100);
      totalScore += errorScore * this.scoreWeights.errorRate;
      weightSum += this.scoreWeights.errorRate;
    }
    
    // Calculate throughput score (higher is better)
    const throughputs = agentMetrics.get('throughput');
    if (throughputs && throughputs.length > 0) {
      const avgThroughput = throughputs.reduce((sum, e) => sum + e.value, 0) / throughputs.length;
      const throughputScore = Math.min(100, (avgThroughput / this.thresholds.throughput) * 100);
      totalScore += throughputScore * this.scoreWeights.throughput;
      weightSum += this.scoreWeights.throughput;
    }
    
    // Calculate success rate score (higher is better)
    const successRates = agentMetrics.get('successRate');
    if (successRates && successRates.length > 0) {
      const avgSuccessRate = successRates.reduce((sum, e) => sum + e.value, 0) / successRates.length;
      const successScore = avgSuccessRate * 100;
      totalScore += successScore * this.scoreWeights.successRate;
      weightSum += this.scoreWeights.successRate;
    }
    
    return weightSum > 0 ? Math.round(totalScore / weightSum) : 0;
  }

  /**
   * Compare performance between two agents
   * @param {string} agentA - First agent ID
   * @param {string} agentB - Second agent ID
   * @returns {Object} Comparison result with scores and differences
   */
  compareAgents(agentA, agentB) {
    const scoreA = this.getAgentScore(agentA);
    const scoreB = this.getAgentScore(agentB);
    
    const metricsComparison = {};
    const metricTypes = ['responseTime', 'errorRate', 'throughput', 'successRate'];
    
    for (const metric of metricTypes) {
      const metricsA = this.getAgentMetrics(agentA, metric);
      const metricsB = this.getAgentMetrics(agentB, metric);
      
      const avgA = metricsA.length > 0 
        ? metricsA.reduce((sum, e) => sum + e.value, 0) / metricsA.length 
        : 0;
      const avgB = metricsB.length > 0 
        ? metricsB.reduce((sum, e) => sum + e.value, 0) / metricsB.length 
        : 0;
      
      metricsComparison[metric] = {
        agentA: avgA,
        agentB: avgB,
        difference: avgA - avgB,
        better: metric === 'responseTime' || metric === 'errorRate' 
          ? (avgA < avgB ? 'agentA' : 'agentB')
          : (avgA > avgB ? 'agentA' : 'agentB')
      };
    }
    
    return {
      agentA,
      agentB,
      scoreA,
      scoreB,
      winner: scoreA > scoreB ? agentA : scoreB < scoreB ? agentB : 'tie',
      metricsComparison
    };
  }

  /**
   * Get performance alerts for an agent based on threshold violations
   * @param {string} agentId - Agent identifier
   * @returns {Array} Array of alert objects
   */
  getPerformanceAlerts(agentId) {
    const alerts = [];
    const agentMetrics = this.metrics.get(agentId);
    
    if (!agentMetrics) {
      return alerts;
    }
    
    // Check response time
    const responseTimes = agentMetrics.get('responseTime');
    if (responseTimes && responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((sum, e) => sum + e.value, 0) / responseTimes.length;
      if (avgResponseTime > this.thresholds.responseTime) {
        alerts.push({
          type: 'responseTime',
          severity: avgResponseTime > this.thresholds.responseTime * 2 ? 'critical' : 'warning',
          message: `High average response time: ${avgResponseTime.toFixed(2)}ms`,
          threshold: this.thresholds.responseTime,
          actual: avgResponseTime
        });
      }
    }
    
    // Check error rate
    const errorRates = agentMetrics.get('errorRate');
    if (errorRates && errorRates.length > 0) {
      const avgErrorRate = errorRates.reduce((sum, e) => sum + e.value, 0) / errorRates.length;
      if (avgErrorRate > this.thresholds.errorRate) {
        alerts.push({
          type: 'errorRate',
          severity: avgErrorRate > this.thresholds.errorRate * 2 ? 'critical' : 'warning',
          message: `High error rate: ${(avgErrorRate * 100).toFixed(2)}%`,
          threshold: this.thresholds.errorRate,
          actual: avgErrorRate
        });
      }
    }
    
    // Check CPU usage
    const cpuUsages = agentMetrics.get('cpuUsage');
    if (cpuUsages && cpuUsages.length > 0) {
      const avgCpuUsage = cpuUsages.reduce((sum, e) => sum + e.value, 0) / cpuUsages.length;
      if (avgCpuUsage > this.thresholds.cpuUsage) {
        alerts.push({
          type: 'cpuUsage',
          severity: avgCpuUsage > this.thresholds.cpuUsage * 1.2 ? 'critical' : 'warning',
          message: `High CPU usage: ${(avgCpuUsage * 100).toFixed(2)}%`,
          threshold: this.thresholds.cpuUsage,
          actual: avgCpuUsage
        });
      }
    }
    
    // Check memory usage
    const memoryUsages = agentMetrics.get('memoryUsage');
    if (memoryUsages && memoryUsages.length > 0) {
      const avgMemoryUsage = memoryUsages.reduce((sum, e) => sum + e.value, 0) / memoryUsages.length;
      if (avgMemoryUsage > this.thresholds.memoryUsage) {
        alerts.push({
          type: 'memoryUsage',
          severity: avgMemoryUsage > this.thresholds.memoryUsage * 1.1 ? 'critical' : 'warning',
          message: `High memory usage: ${(avgMemoryUsage * 100).toFixed(2)}%`,
          threshold: this.thresholds.memoryUsage,
          actual: avgMemoryUsage
        });
      }
    }
    
    // Check throughput
    const throughputs = agentMetrics.get('throughput');
    if (throughputs && throughputs.length > 0) {
      const avgThroughput = throughputs.reduce((sum, e) => sum + e.value, 0) / throughputs.length;
      if (avgThroughput < this.thresholds.throughput) {
        alerts.push({
          type: 'throughput',
          severity: avgThroughput < this.thresholds.throughput * 0.5 ? 'critical' : 'warning',
          message: `Low throughput: ${avgThroughput.toFixed(2)} ops/sec`,
          threshold: this.thresholds.throughput,
          actual: avgThroughput
        });
      }
    }
    
    return alerts;
  }

  /**
   * Update a threshold value
   * @param {string} thresholdName - Name of the threshold
   * @param {number} value - New threshold value
   */
  setThreshold(thresholdName, value) {
    if (thresholdName in this.thresholds) {
      this.thresholds[thresholdName] = value;
    }
  }

  /**
   * Clear all metrics for an agent
   * @param {string} agentId - Agent identifier
   */
  clearMetrics(agentId) {
    if (this.metrics.has(agentId)) {
      this.metrics.delete(agentId);
    }
  }
}