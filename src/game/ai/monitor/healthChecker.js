/**
 * HealthChecker - Checks agent health and provides recovery recommendations
 * Part of Direction D v7: Agent Performance Monitoring System
 */

export class HealthChecker {
  constructor(performanceMonitor) {
    this.performanceMonitor = performanceMonitor;
    
    // Component health thresholds
    this.componentThresholds = {
      decisionMaking: 0.7,     // 70% minimum success rate
      memoryAccess: 0.85,       // 85% minimum success rate
      communication: 0.8,      // 80% minimum success rate
      taskExecution: 0.75,      // 75% minimum success rate
      planning: 0.65            // 65% minimum success rate
    };
    
    // Recovery action templates
    this.recoveryTemplates = {
      lowPerformance: [
        { action: 'restart_component', priority: 'high' },
        { action: 'reduce_load', priority: 'medium' },
        { action: 'clear_cache', priority: 'low' }
      ],
      highLatency: [
        { action: 'optimize_queries', priority: 'high' },
        { action: 'scale_resources', priority: 'medium' },
        { action: 'enable_caching', priority: 'low' }
      ],
      errorSpike: [
        { action: 'investigate_errors', priority: 'high' },
        { action: 'rollback_changes', priority: 'high' },
        { action: 'increase_monitoring', priority: 'medium' }
      ],
      resourceExhaustion: [
        { action: 'free_resources', priority: 'high' },
        { action: 'increase_limits', priority: 'medium' },
        { action: 'cleanup_history', priority: 'low' }
      ]
    };
  }

  /**
   * Check overall health of an agent
   * @param {string} agentId - Agent identifier
   * @returns {Object} Health status with score and details
   */
  checkAgentHealth(agentId) {
    const score = this.performanceMonitor.getAgentScore(agentId);
    const alerts = this.performanceMonitor.getPerformanceAlerts(agentId);
    
    let status = 'healthy';
    let healthDetails = {};
    
    // Determine status based on score and alerts (only if we have metrics)
    const hasMetrics = this.performanceMonitor.getAgentMetrics(agentId, 'responseTime').length > 0 ||
                       this.performanceMonitor.getAgentMetrics(agentId, 'successRate').length > 0;
    
    if (!hasMetrics) {
      // No metrics means we can't determine health - treat as healthy
      status = 'healthy';
    } else if (score < 30 || alerts.some(a => a.severity === 'critical')) {
      status = 'critical';
    } else if (score < 60 || alerts.some(a => a.severity === 'warning')) {
      status = 'degraded';
    }
    
    // Check individual component health
    const componentHealth = this.checkAllComponents(agentId);
    
    // Collect metrics
    const metrics = {
      responseTime: this.getMetricStats(agentId, 'responseTime'),
      errorRate: this.getMetricStats(agentId, 'errorRate'),
      throughput: this.getMetricStats(agentId, 'throughput'),
      successRate: this.getMetricStats(agentId, 'successRate')
    };
    
    return {
      agentId,
      status,
      score,
      alerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      componentHealth,
      metrics,
      timestamp: Date.now()
    };
  }

  /**
   * Check health of a specific component
   * @param {string} agentId - Agent identifier
   * @param {string} component - Component name
   * @returns {Object} Component health status
   */
  checkComponentHealth(agentId, component) {
    // Simulate component health based on available metrics
    const metrics = this.performanceMonitor.getAgentMetrics(agentId, 'successRate');
    
    let healthScore = 1.0;
    let issues = [];
    
    // Calculate health based on success rate and error patterns
    if (metrics.length > 0) {
      const avgSuccessRate = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
      healthScore = avgSuccessRate;
      
      if (avgSuccessRate < this.componentThresholds[component]) {
        issues.push({
          type: 'low_success_rate',
          severity: 'warning',
          message: `Success rate ${(avgSuccessRate * 100).toFixed(1)}% below threshold ${(this.componentThresholds[component] * 100).toFixed(1)}%`
        });
      }
    }
    
    // Determine component status
    let status = 'healthy';
    if (healthScore < 0.5) {
      status = 'critical';
    } else if (healthScore < this.componentThresholds[component]) {
      status = 'degraded';
    }
    
    return {
      agentId,
      component,
      status,
      healthScore: Math.round(healthScore * 100),
      issues,
      timestamp: Date.now()
    };
  }

  /**
   * Get recommended recovery actions for an agent
   * @param {string} agentId - Agent identifier
   * @returns {Array} Array of recommended actions
   */
  getRecoveryActions(agentId) {
    const health = this.checkAgentHealth(agentId);
    const alerts = this.performanceMonitor.getPerformanceAlerts(agentId);
    const actions = [];
    
    if (health.status === 'healthy') {
      return [{ action: 'none', priority: 'info', message: 'Agent is healthy, no recovery needed' }];
    }
    
    // Generate recovery actions based on issues
    for (const alert of alerts) {
      const actionType = this.getActionType(alert.type);
      const template = this.recoveryTemplates[actionType] || this.recoveryTemplates.lowPerformance;
      
      for (const recoveryAction of template) {
        actions.push({
          ...recoveryAction,
          reason: alert.message,
          alertType: alert.type
        });
      }
    }
    
    // Check component health for additional actions
    for (const [component, data] of Object.entries(health.componentHealth)) {
      if (data.status !== 'healthy') {
        actions.push({
          action: `repair_${component}`,
          priority: 'medium',
          reason: `Component ${component} is ${data.status}`,
          component
        });
      }
    }
    
    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2, info: 3 };
    actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    // Remove duplicates
    const seen = new Set();
    return actions.filter(action => {
      const key = action.action;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Get action type based on alert type
   */
  getActionType(alertType) {
    const mapping = {
      responseTime: 'highLatency',
      errorRate: 'errorSpike',
      cpuUsage: 'resourceExhaustion',
      memoryUsage: 'resourceExhaustion',
      throughput: 'lowPerformance'
    };
    return mapping[alertType] || 'lowPerformance';
  }

  /**
   * Check health of all components
   */
  checkAllComponents(agentId) {
    const components = Object.keys(this.componentThresholds);
    const result = {};
    
    for (const component of components) {
      result[component] = this.checkComponentHealth(agentId, component);
    }
    
    return result;
  }

  /**
   * Get statistics for a metric
   */
  getMetricStats(agentId, metricType) {
    const metrics = this.performanceMonitor.getAgentMetrics(agentId, metricType);
    
    if (metrics.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0 };
    }
    
    const values = metrics.map(m => m.value);
    return {
      count: values.length,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }
}