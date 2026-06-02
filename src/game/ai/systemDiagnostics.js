/**
 * SystemDiagnostics - System-Wide Diagnostics for Multi-Agent Systems
 * 
 * Provides comprehensive diagnostics for all multi-agent system components
 * including health checking, performance monitoring, and recommendations.
 */

import { WorkflowState } from './orchestrate/orchestrationEngine.js';

export class SystemDiagnostics {
  /**
   * Create a new SystemDiagnostics
   * @param {MultiAgentSystemFacade} multiAgentSystem - The facade to diagnose
   */
  constructor(multiAgentSystem) {
    this.multiAgentSystem = multiAgentSystem;
    
    // Diagnostic state
    this.lastRunAt = null;
    this.diagnosticHistory = [];
    this.maxHistorySize = 50;
    
    // Component checks
    this.checks = {
      coordinator: this._checkCoordinator.bind(this),
      messageBus: this._checkMessageBus.bind(this),
      blackboard: this._checkBlackboard.bind(this),
      orchestration: this._checkOrchestration.bind(this),
      integration: this._checkIntegration.bind(this)
    };
  }

  /**
   * Run full diagnostics on all components
   * @returns {Object} Full diagnostic report
   */
  runFullDiagnostics() {
    const startTime = Date.now();
    
    const report = {
      timestamp: Date.now(),
      duration: 0,
      version: '1.0.0',
      components: {},
      overallHealth: 'unknown',
      healthScore: 0,
      issues: [],
      recommendations: [],
      systemStatus: null
    };
    
    // Run all component checks
    for (const [componentName, checkFn] of Object.entries(this.checks)) {
      try {
        report.components[componentName] = checkFn();
      } catch (error) {
        report.components[componentName] = {
          health: 'unknown',
          error: error.message,
          issues: [{ severity: 'critical', message: `Check failed: ${error.message}` }]
        };
      }
    }
    
    // Calculate overall health
    const healthScores = {
      healthy: 100,
      good: 80,
      degraded: 50,
      unhealthy: 20,
      unknown: 0
    };
    
    const componentResults = Object.values(report.components);
    const healthValues = componentResults.map(c => healthScores[c.health] || 0);
    report.healthScore = healthValues.reduce((a, b) => a + b, 0) / healthValues.length;
    
    // Determine overall health
    if (report.healthScore >= 90) {
      report.overallHealth = 'healthy';
    } else if (report.healthScore >= 70) {
      report.overallHealth = 'good';
    } else if (report.healthScore >= 40) {
      report.overallHealth = 'degraded';
    } else if (report.healthScore >= 20) {
      report.overallHealth = 'unhealthy';
    } else {
      report.overallHealth = 'critical';
    }
    
    // Collect all issues and recommendations
    for (const [componentName, result] of Object.entries(report.components)) {
      if (result.issues) {
        for (const issue of result.issues) {
          report.issues.push({ component: componentName, ...issue });
        }
      }
      if (result.recommendations) {
        for (const rec of result.recommendations) {
          report.recommendations.push({ component: componentName, ...rec });
        }
      }
    }
    
    // Sort issues by severity
    report.issues.sort((a, b) => {
      const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
      return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
    });
    
    // Get system status
    report.systemStatus = this.multiAgentSystem.getSystemStatus();
    
    report.duration = Date.now() - startTime;
    
    // Update state
    this.lastRunAt = report.timestamp;
    this._addToHistory(report);
    
    return report;
  }

  /**
   * Check a specific component
   * @param {string} componentName - Name of component to check
   * @returns {Object} Component check result
   */
  checkComponent(componentName) {
    const checkFn = this.checks[componentName];
    
    if (!checkFn) {
      return {
        health: 'unknown',
        error: `Unknown component: ${componentName}`,
        issues: [{ severity: 'error', message: `Component ${componentName} not found` }],
        recommendations: [{ priority: 'high', action: 'Verify component name' }]
      };
    }
    
    return checkFn();
  }

  /**
   * Generate a diagnostic report
   * @returns {Object} Diagnostic report
   */
  generateReport() {
    const fullReport = this.runFullDiagnostics();
    
    // Format report for display
    const reportLines = [
      '='.repeat(60),
      'SYSTEM DIAGNOSTIC REPORT',
      '='.repeat(60),
      `Generated: ${new Date(fullReport.timestamp).toISOString()}`,
      `Duration: ${fullReport.duration}ms`,
      '',
      `Overall Health: ${fullReport.overallHealth.toUpperCase()}`,
      `Health Score: ${fullReport.healthScore.toFixed(1)}%`,
      '',
      '-'.repeat(60),
      'COMPONENT STATUS',
      '-'.repeat(60)
    ];
    
    for (const [name, result] of Object.entries(fullReport.components)) {
      reportLines.push(
        `${name}: ${result.health.toUpperCase()}`,
        `  - Status: ${result.status || 'N/A'}`
      );
    }
    
    if (fullReport.issues.length > 0) {
      reportLines.push('', '-'.repeat(60), 'ISSUES', '-'.repeat(60));
      for (const issue of fullReport.issues) {
        reportLines.push(`[${issue.severity.toUpperCase()}] ${issue.component}: ${issue.message}`);
      }
    }
    
    if (fullReport.recommendations.length > 0) {
      reportLines.push('', '-'.repeat(60), 'RECOMMENDATIONS', '-'.repeat(60));
      for (const rec of fullReport.recommendations) {
        reportLines.push(`[${rec.priority.toUpperCase()}] ${rec.component}: ${rec.action}`);
      }
    }
    
    reportLines.push('='.repeat(60));
    
    return {
      text: reportLines.join('\n'),
      data: fullReport
    };
  }

  /**
   * Get improvement recommendations
   * @returns {Object[]} Array of recommendations
   */
  getRecommendations() {
    const report = this.runFullDiagnostics();
    return report.recommendations;
  }

  /**
   * Get diagnostic history
   * @param {number} limit - Maximum entries to return
   * @returns {Object[]} History entries
   */
  getHistory(limit = null) {
    if (limit !== null) {
      return this.diagnosticHistory.slice(-limit);
    }
    return [...this.diagnosticHistory];
  }

  /**
   * Check coordinator component
   * @returns {Object}
   * @private
   */
  _checkCoordinator() {
    const coordinator = this.multiAgentSystem.getCoordinator();
    const stats = coordinator.getStats();
    
    const result = {
      health: 'healthy',
      status: `${stats.agentCount} agents`,
      issues: [],
      recommendations: []
    };
    
    // Check agent count
    if (stats.agentCount === 0) {
      result.health = 'unhealthy';
      result.issues.push({
        severity: 'critical',
        message: 'No agents registered in coordinator'
      });
      result.recommendations.push({
        priority: 'high',
        action: 'Register agents before starting simulation'
      });
    } else if (stats.agentCount < 3) {
      result.health = 'degraded';
      result.issues.push({
        severity: 'warning',
        message: 'Low agent count, may affect coordination quality'
      });
      result.recommendations.push({
        priority: 'medium',
        action: 'Consider registering additional agents'
      });
    }
    
    // Check paused state
    if (stats.isPaused) {
      result.issues.push({
        severity: 'warning',
        message: 'Coordinator is paused'
      });
      result.recommendations.push({
        priority: 'medium',
        action: 'Resume coordinator if appropriate'
      });
    }
    
    // Check message queue size
    if (stats.messageCount > 500) {
      result.issues.push({
        severity: 'info',
        message: 'High message volume in history'
      });
    }
    
    return result;
  }

  /**
   * Check message bus component
   * @returns {Object}
   * @private
   */
  _checkMessageBus() {
    const messageBus = this.multiAgentSystem.getMessageBus();
    const historySize = messageBus.messageHistory.length;
    const channels = messageBus.getChannelList();
    
    const result = {
      health: 'healthy',
      status: `${channels.length} channels, ${historySize} messages`,
      issues: [],
      recommendations: []
    };
    
    // Check history size
    if (historySize > 900) {
      result.health = 'degraded';
      result.issues.push({
        severity: 'warning',
        message: 'Message history approaching limit (900/1000)'
      });
      result.recommendations.push({
        priority: 'low',
        action: 'Consider resetting message bus periodically'
      });
    }
    
    // Check channel subscriptions
    if (channels.length === 0) {
      result.issues.push({
        severity: 'info',
        message: 'No channel subscriptions active'
      });
    }
    
    // Check for unprocessed messages
    let unprocessedCount = 0;
    for (const channel of channels) {
      const subscribers = messageBus.getSubscribers(channel.channel);
      if (subscribers.length === 0) {
        unprocessedCount++;
      }
    }
    
    if (unprocessedCount > 0) {
      result.issues.push({
        severity: 'info',
        message: `${unprocessedCount} channels have no subscribers`
      });
    }
    
    return result;
  }

  /**
   * Check blackboard component
   * @returns {Object}
   * @private
   */
  _checkBlackboard() {
    const blackboard = this.multiAgentSystem.getBlackboard();
    const keyCount = blackboard.keys().length;
    const historySize = blackboard.globalHistory.length;
    
    const result = {
      health: 'healthy',
      status: `${keyCount} keys, ${historySize} history entries`,
      issues: [],
      recommendations: []
    };
    
    // Check key count
    if (keyCount === 0) {
      result.health = 'degraded';
      result.issues.push({
        severity: 'warning',
        message: 'Blackboard is empty'
      });
      result.recommendations.push({
        priority: 'medium',
        action: 'Initialize game state on blackboard'
      });
    }
    
    // Check history size
    if (historySize > 900) {
      result.health = 'degraded';
      result.issues.push({
        severity: 'warning',
        message: 'Global history approaching limit'
      });
      result.recommendations.push({
        priority: 'low',
        action: 'Consider clearing old history'
      });
    }
    
    return result;
  }

  /**
   * Check orchestration component
   * @returns {Object}
   * @private
   */
  _checkOrchestration() {
    const engine = this.multiAgentSystem.getOrchestrationEngine();
    const workflowIds = engine.getWorkflowIds();
    const activeIds = engine.getActiveWorkflowIds();
    
    const result = {
      health: 'healthy',
      status: `${workflowIds.length} workflows, ${activeIds.length} active`,
      issues: [],
      recommendations: []
    };
    
    // Check active workflows
    if (activeIds.length > 10) {
      result.health = 'degraded';
      result.issues.push({
        severity: 'warning',
        message: 'High number of active workflows'
      });
      result.recommendations.push({
        priority: 'medium',
        action: 'Monitor workflow completion rates'
      });
    }
    
    // Check completed workflows
    const completedCount = workflowIds.length - activeIds.length;
    if (completedCount > 100) {
      result.issues.push({
        severity: 'info',
        message: 'Many completed workflows stored'
      });
      result.recommendations.push({
        priority: 'low',
        action: 'Consider clearing old workflows'
      });
    }
    
    // Check for failed workflows
    let failedCount = 0;
    for (const workflowId of workflowIds) {
      const state = engine.getWorkflowState(workflowId);
      if (state && state.status === WorkflowState.FAILED) {
        failedCount++;
      }
    }
    
    if (failedCount > 0) {
      result.health = 'degraded';
      result.issues.push({
        severity: 'error',
        message: `${failedCount} failed workflows detected`
      });
      result.recommendations.push({
        priority: 'high',
        action: 'Investigate and clear failed workflows'
      });
    }
    
    return result;
  }

  /**
   * Check integration between components
   * @returns {Object}
   * @private
   */
  _checkIntegration() {
    const result = {
      health: 'healthy',
      status: 'integrated',
      issues: [],
      recommendations: []
    };
    
    // Verify all systems are accessible
    try {
      this.multiAgentSystem.getCoordinator();
    } catch (error) {
      result.health = 'unhealthy';
      result.issues.push({
        severity: 'critical',
        message: 'Cannot access coordinator'
      });
    }
    
    try {
      this.multiAgentSystem.getMessageBus();
    } catch (error) {
      result.health = 'unhealthy';
      result.issues.push({
        severity: 'critical',
        message: 'Cannot access message bus'
      });
    }
    
    try {
      this.multiAgentSystem.getBlackboard();
    } catch (error) {
      result.health = 'unhealthy';
      result.issues.push({
        severity: 'critical',
        message: 'Cannot access blackboard'
      });
    }
    
    try {
      this.multiAgentSystem.getOrchestrationEngine();
    } catch (error) {
      result.health = 'unhealthy';
      result.issues.push({
        severity: 'critical',
        message: 'Cannot access orchestration engine'
      });
    }
    
    // Check initialization
    const status = this.multiAgentSystem.getSystemStatus();
    if (!status.initialized) {
      result.health = 'degraded';
      result.issues.push({
        severity: 'warning',
        message: 'Multi-agent system not initialized'
      });
      result.recommendations.push({
        priority: 'high',
        action: 'Call initialize() before use'
      });
    }
    
    return result;
  }

  /**
   * Add report to history
   * @param {Object} report 
   * @private
   */
  _addToHistory(report) {
    this.diagnosticHistory.push(report);
    
    // Trim history if needed
    while (this.diagnosticHistory.length > this.maxHistorySize) {
      this.diagnosticHistory.shift();
    }
  }

  /**
   * Clear diagnostic history
   */
  clearHistory() {
    this.diagnosticHistory = [];
  }
}