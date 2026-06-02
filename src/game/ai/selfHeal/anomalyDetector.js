/**
 * AnomalyDetector - Detect unusual agent behavior patterns
 */
export class AnomalyDetector {
  constructor(performanceMonitor) {
    this.performanceMonitor = performanceMonitor;
    this.baselines = new Map();
    this.thresholds = { errorRate: 0.1, responseTime: 2.0, cpuUsage: 0.8 };
  }

  establishBaseline(agentId) {
    const metrics = this.performanceMonitor.getAgentMetrics(agentId, 'all', { hours: 24 });
    if (!metrics || metrics.length === 0) return null;

    const avgResponseTime = this._avg(metrics.map(m => m.responseTime || 0));
    const avgErrorRate = this._avg(metrics.map(m => m.errorRate || 0));
    const avgCpu = this._avg(metrics.map(m => m.cpuUsage || 0));

    const baseline = { responseTime: avgResponseTime, errorRate: avgErrorRate, cpuUsage: avgCpu };
    this.baselines.set(agentId, baseline);
    return baseline;
  }

  detectAnomalies(agentId) {
    const baseline = this.baselines.get(agentId);
    if (!baseline) return [];

    const metrics = this.performanceMonitor.getAgentMetrics(agentId, 'all', { minutes: 5 });
    const anomalies = [];

    for (const metric of metrics) {
      if (metric.responseTime > baseline.responseTime * this.thresholds.responseTime) {
        anomalies.push({ type: 'high_response_time', metric, baseline });
      }
      if (metric.errorRate > baseline.errorRate + this.thresholds.errorRate) {
        anomalies.push({ type: 'high_error_rate', metric, baseline });
      }
      if (metric.cpuUsage > baseline.cpuUsage * this.thresholds.cpuUsage) {
        anomalies.push({ type: 'high_cpu_usage', metric, baseline });
      }
    }
    return anomalies;
  }

  _avg(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  setThreshold(type, value) {
    this.thresholds[type] = value;
  }
}