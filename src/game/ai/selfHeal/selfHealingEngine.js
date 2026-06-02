/**
 * SelfHealingEngine - Automatic error recovery for agents
 */
export class SelfHealingEngine {
  constructor(healthChecker) {
    this.healthChecker = healthChecker;
    this.recoveryStrategies = new Map();
    this.failureHistory = new Map();
    this._initStrategies();
  }

  _initStrategies() {
    this.registerStrategy('restart', (agentId) => ({ action: 'restart', params: { agentId } }));
    this.registerStrategy('reset_state', (agentId) => ({ action: 'reset_state', params: { agentId } }));
    this.registerStrategy('reduce_load', (agentId) => ({ action: 'reduce_load', params: { agentId } }));
    this.registerStrategy('escalate', (agentId) => ({ action: 'escalate', params: { agentId } }));
  }

  registerStrategy(name, fn) {
    this.recoveryStrategies.set(name, fn);
  }

  detectAndRecover(agentId, gameState) {
    const health = this.healthChecker.checkAgentHealth(agentId);
    if (health.status === 'healthy') {
      return { recovered: false, reason: 'agent_healthy' };
    }

    const failures = this.getFailureCount(agentId);
    const strategy = this._selectStrategy(agentId, health, failures);
    const recovery = this.executeRecovery(strategy, agentId, gameState);

    this.recordFailure(agentId, strategy, health);
    return { recovered: true, strategy, health };
  }

  _selectStrategy(agentId, health, failures) {
    if (failures > 3) return 'escalate';
    if (health.status === 'degraded') return 'reduce_load';
    if (health.status === 'unhealthy') return 'restart';
    return 'reset_state';
  }

  executeRecovery(strategyName, agentId, gameState) {
    const fn = this.recoveryStrategies.get(strategyName);
    if (!fn) return { success: false, reason: 'unknown_strategy' };
    return fn(agentId);
  }

  getFailureCount(agentId) {
    return this.failureHistory.get(agentId)?.length || 0;
  }

  recordFailure(agentId, strategy, health) {
    if (!this.failureHistory.has(agentId)) {
      this.failureHistory.set(agentId, []);
    }
    this.failureHistory.get(agentId).push({ strategy, health, timestamp: Date.now() });
  }

  getRecoveryHistory(agentId) {
    return this.failureHistory.get(agentId) || [];
  }

  clearHistory(agentId) {
    this.failureHistory.delete(agentId);
  }
}