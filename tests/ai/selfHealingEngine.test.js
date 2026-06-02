import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SelfHealingEngine } from '../../src/game/ai/selfHeal/selfHealingEngine.js';

function createMockHealthChecker() {
  return {
    checkAgentHealth: (agentId) => {
      if (agentId === 'healthy-agent') return { status: 'healthy' };
      if (agentId === 'degraded-agent') return { status: 'degraded' };
      return { status: 'unhealthy' };
    }
  };
}

describe('SelfHealingEngine', () => {
  describe('constructor', () => {
    it('initializes with health checker', () => {
      const checker = createMockHealthChecker();
      const engine = new SelfHealingEngine(checker);
      assert.ok(engine.healthChecker);
      assert.strictEqual(engine.recoveryStrategies.size, 4);
    });
  });

  describe('registerStrategy', () => {
    it('registers new recovery strategy', () => {
      const checker = createMockHealthChecker();
      const engine = new SelfHealingEngine(checker);
      engine.registerStrategy('custom', (agentId) => ({ action: 'custom', params: { agentId } }));
      assert.ok(engine.recoveryStrategies.has('custom'));
    });
  });

  describe('detectAndRecover', () => {
    it('returns no recovery for healthy agent', () => {
      const checker = createMockHealthChecker();
      const engine = new SelfHealingEngine(checker);
      const result = engine.detectAndRecover('healthy-agent', {});
      assert.strictEqual(result.recovered, false);
    });

    it('recovers degraded agent with reduce_load', () => {
      const checker = createMockHealthChecker();
      const engine = new SelfHealingEngine(checker);
      const result = engine.detectAndRecover('degraded-agent', {});
      assert.strictEqual(result.recovered, true);
      assert.strictEqual(result.strategy, 'reduce_load');
    });

    it('recovers unhealthy agent with restart', () => {
      const checker = createMockHealthChecker();
      const engine = new SelfHealingEngine(checker);
      const result = engine.detectAndRecover('unhealthy-agent', {});
      assert.strictEqual(result.recovered, true);
      assert.ok(['restart', 'reset_state'].includes(result.strategy));
    });

    it('escalates after multiple failures', () => {
      const checker = createMockHealthChecker();
      const engine = new SelfHealingEngine(checker);
      // Simulate 4 failures
      for (let i = 0; i < 4; i++) {
        engine.recordFailure('unhealthy-agent', 'restart', { status: 'unhealthy' });
      }
      const result = engine.detectAndRecover('unhealthy-agent', {});
      assert.strictEqual(result.strategy, 'escalate');
    });
  });

  describe('executeRecovery', () => {
    it('executes known strategy', () => {
      const checker = createMockHealthChecker();
      const engine = new SelfHealingEngine(checker);
      const result = engine.executeRecovery('restart', 'agent1', {});
      assert.strictEqual(result.action, 'restart');
    });

    it('fails for unknown strategy', () => {
      const checker = createMockHealthChecker();
      const engine = new SelfHealingEngine(checker);
      const result = engine.executeRecovery('unknown', 'agent1', {});
      assert.strictEqual(result.success, false);
    });
  });

  describe('getFailureCount', () => {
    it('returns 0 for agent with no failures', () => {
      const checker = createMockHealthChecker();
      const engine = new SelfHealingEngine(checker);
      assert.strictEqual(engine.getFailureCount('agent1'), 0);
    });

    it('returns count of recorded failures', () => {
      const checker = createMockHealthChecker();
      const engine = new SelfHealingEngine(checker);
      engine.recordFailure('agent1', 'restart', {});
      engine.recordFailure('agent1', 'restart', {});
      assert.strictEqual(engine.getFailureCount('agent1'), 2);
    });
  });

  describe('getRecoveryHistory', () => {
    it('returns recorded history', () => {
      const checker = createMockHealthChecker();
      const engine = new SelfHealingEngine(checker);
      engine.recordFailure('agent1', 'restart', { status: 'unhealthy' });
      const history = engine.getRecoveryHistory('agent1');
      assert.strictEqual(history.length, 1);
    });

    it('returns empty for unknown agent', () => {
      const checker = createMockHealthChecker();
      const engine = new SelfHealingEngine(checker);
      const history = engine.getRecoveryHistory('unknown');
      assert.strictEqual(history.length, 0);
    });
  });

  describe('clearHistory', () => {
    it('clears failure history', () => {
      const checker = createMockHealthChecker();
      const engine = new SelfHealingEngine(checker);
      engine.recordFailure('agent1', 'restart', {});
      engine.clearHistory('agent1');
      assert.strictEqual(engine.getFailureCount('agent1'), 0);
    });
  });
});