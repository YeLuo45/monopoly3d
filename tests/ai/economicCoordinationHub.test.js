/**
 * EconomicCoordinationHub Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

import { EconomicCoordinationHub } from '../../src/game/ai/economicCoordinationHub.js';

describe('EconomicCoordinationHub', () => {
  let hub;

  before(() => {
    hub = new EconomicCoordinationHub();
  });

  after(() => {
    hub = null;
  });

  describe('constructor', () => {
    it('should initialize empty systems map', () => {
      const h = new EconomicCoordinationHub();
      assert.strictEqual(h.systems.size, 0);
    });

    it('should have default configuration', () => {
      assert.ok(hub.config);
      assert.strictEqual(typeof hub.config.conflictThreshold, 'number');
      assert.strictEqual(typeof hub.config.autoResolve, 'boolean');
    });

    it('should have default priorities', () => {
      assert.ok(hub.defaultPriorities);
      assert.strictEqual(hub.defaultPriorities.trading, 1.0);
      assert.strictEqual(hub.defaultPriorities.investment, 1.0);
    });
  });

  describe('registerSystem', () => {
    it('should register a new system', () => {
      hub.registerSystem('testSystem', {
        weight: 1.0,
        evaluate: () => ({ score: 50, recommendation: 'hold' }),
      });

      assert.ok(hub.hasSystem('testSystem'));
    });

    it('should throw for invalid system name', () => {
      assert.throws(() => {
        hub.registerSystem(null, { evaluate: () => {} });
      }, Error);
    });

    it('should throw for missing evaluate function', () => {
      assert.throws(() => {
        hub.registerSystem('badSystem', {});
      }, Error);
    });

    it('should set default weight from priorities', () => {
      const h = new EconomicCoordinationHub();
      h.registerSystem('trading', { evaluate: () => {} });
      assert.strictEqual(h.getSystemPriority('trading'), 1.0);
    });
  });

  describe('unregisterSystem', () => {
    it('should remove a registered system', () => {
      hub.registerSystem('tempSystem', { evaluate: () => {} });
      assert.ok(hub.hasSystem('tempSystem'));

      hub.unregisterSystem('tempSystem');
      assert.ok(!hub.hasSystem('tempSystem'));
    });
  });

  describe('hasSystem', () => {
    it('should return true for registered system', () => {
      hub.registerSystem('checkSystem', { evaluate: () => {} });
      assert.strictEqual(hub.hasSystem('checkSystem'), true);
    });

    it('should return false for unregistered system', () => {
      assert.strictEqual(hub.hasSystem('nonexistent'), false);
    });
  });

  describe('setSystemEnabled', () => {
    it('should enable/disable a system', () => {
      hub.registerSystem('toggleSystem', { evaluate: () => {} });
      hub.setSystemEnabled('toggleSystem', false);
      assert.ok(!hub.systems.get('toggleSystem').enabled);

      hub.setSystemEnabled('toggleSystem', true);
      assert.ok(hub.systems.get('toggleSystem').enabled);
    });
  });

  describe('querySystems', () => {
    it('should query all registered systems', () => {
      const h = new EconomicCoordinationHub();
      h.registerSystem('sysA', {
        weight: 1.0,
        evaluate: () => ({ score: 80, recommendation: 'buy' }),
      });
      h.registerSystem('sysB', {
        weight: 0.8,
        evaluate: () => ({ score: 60, recommendation: 'hold' }),
      });

      const results = h.querySystems({ playerId: 'p1' }, { turn: 5 });
      assert.ok(results.sysA);
      assert.ok(results.sysB);
      assert.strictEqual(results.sysA.score, 80);
      assert.strictEqual(results.sysB.score, 60);
    });

    it('should include weight and priority in results', () => {
      const h = new EconomicCoordinationHub();
      h.registerSystem('weightedSys', {
        weight: 0.7,
        evaluate: () => ({ score: 70, recommendation: 'hold' }),
      });

      const results = h.querySystems({}, {});
      assert.strictEqual(results.weightedSys.weight, 0.7);
    });

    it('should handle evaluation errors gracefully', () => {
      const h = new EconomicCoordinationHub();
      h.registerSystem('errorSys', {
        evaluate: () => { throw new Error('Test error'); },
      });

      const results = h.querySystems({}, {});
      assert.ok(results.errorSys.error);
    });

    it('should skip disabled systems', () => {
      const h = new EconomicCoordinationHub();
      h.registerSystem('disabledSys', { evaluate: () => ({ score: 100 }) });
      h.setSystemEnabled('disabledSys', false);

      const results = h.querySystems({}, {});
      assert.ok(!results.disabledSys);
    });
  });

  describe('setSystemPriority', () => {
    it('should set priority for a system', () => {
      hub.registerSystem('prioritySys', { evaluate: () => {} });
      hub.setSystemPriority('prioritySys', 0.5);
      assert.strictEqual(hub.getSystemPriority('prioritySys'), 0.5);
    });

    it('should clamp priority to 0-1 range', () => {
      hub.registerSystem('clampSys', { evaluate: () => {} });
      hub.setSystemPriority('clampSys', 1.5);
      assert.strictEqual(hub.getSystemPriority('clampSys'), 1);

      hub.setSystemPriority('clampSys', -0.5);
      assert.strictEqual(hub.getSystemPriority('clampSys'), 0);
    });

    it('should throw for unregistered system', () => {
      assert.throws(() => {
        hub.setSystemPriority('nonexistent', 0.5);
      }, Error);
    });
  });

  describe('getSystemPriority', () => {
    it('should return system priority', () => {
      hub.registerSystem('getPrioritySys', { evaluate: () => {} });
      hub.setSystemPriority('getPrioritySys', 0.75);
      assert.strictEqual(hub.getSystemPriority('getPrioritySys'), 0.75);
    });

    it('should return default priority for unknown system', () => {
      assert.strictEqual(typeof hub.getSystemPriority('unknown'), 'number');
    });
  });

  describe('getAllPriorities', () => {
    it('should return all system priorities', () => {
      const h = new EconomicCoordinationHub();
      h.registerSystem('a', { evaluate: () => {} });
      h.registerSystem('b', { evaluate: () => {} });
      h.setSystemPriority('a', 0.9);

      const priorities = h.getAllPriorities();
      assert.ok(priorities.a);
      assert.ok(priorities.b);
    });
  });

  describe('detectConflicts', () => {
    it('should detect opposing buy/sell recommendations', () => {
      const recommendations = {
        sysA: { score: 80, recommendation: 'buy' },
        sysB: { score: 70, recommendation: 'sell' },
      };

      const conflicts = hub.detectConflicts(recommendations);
      assert.ok(conflicts.length > 0);
    });

    it('should detect accept/reject conflicts', () => {
      const recommendations = {
        sysA: { score: 90, recommendation: 'accept' },
        sysB: { score: 85, recommendation: 'reject' },
      };

      const conflicts = hub.detectConflicts(recommendations);
      assert.ok(conflicts.length > 0);
    });

    it('should detect score-based conflicts', () => {
      const recommendations = {
        sysA: { score: 90, recommendation: 'hold' },
        sysB: { score: 20, recommendation: 'hold' },
      };

      const conflicts = hub.detectConflicts(recommendations);
      assert.ok(conflicts.length > 0);
    });

    it('should return empty array when no conflicts', () => {
      const recommendations = {
        sysA: { score: 70, recommendation: 'buy' },
        sysB: { score: 65, recommendation: 'buy' },
      };

      const conflicts = hub.detectConflicts(recommendations);
      assert.strictEqual(conflicts.length, 0);
    });
  });

  describe('resolveConflicts', () => {
    it('should resolve conflicts using priority strategy', () => {
      const h = new EconomicCoordinationHub();
      h.registerSystem('highPriority', { evaluate: () => ({ score: 60, recommendation: 'buy' }) });
      h.registerSystem('lowPriority', { evaluate: () => ({ score: 80, recommendation: 'sell' }) });
      h.setSystemPriority('highPriority', 1.0);
      h.setSystemPriority('lowPriority', 0.5);

      const conflicts = [
        {
          systems: ['highPriority', 'lowPriority'],
          recommendations: [
            { score: 60, recommendation: 'buy' },
            { score: 80, recommendation: 'sell' },
          ],
          type: 'buy_sell',
        },
      ];

      h.config.resolutionStrategy = 'priority';
      const resolved = h.resolveConflicts(conflicts, {});
      assert.ok(resolved.length > 0);
      assert.strictEqual(resolved[0].winner, 'highPriority');
    });

    it('should resolve conflicts using value strategy', () => {
      const conflicts = [
        {
          systems: ['valA', 'valB'],
          recommendations: [
            { score: 60, recommendation: 'buy' },
            { score: 90, recommendation: 'sell' },
          ],
          type: 'buy_sell',
        },
      ];

      hub.config.resolutionStrategy = 'value';
      const resolved = hub.resolveConflicts(conflicts, {});
      assert.ok(resolved.length > 0);
      assert.strictEqual(resolved[0].winner, 'valB');
    });

    it('should handle risk-adjusted strategy', () => {
      const conflicts = [
        {
          systems: ['riskHigh', 'riskLow'],
          recommendations: [
            { score: 85, recommendation: 'buy', risk: 'high' },
            { score: 75, recommendation: 'sell', risk: 'low' },
          ],
          type: 'buy_sell',
        },
      ];

      hub.config.resolutionStrategy = 'risk-adjusted';
      const resolved = hub.resolveConflicts(conflicts, {});
      assert.ok(resolved.length > 0);
    });
  });

  describe('getSystemStats', () => {
    it('should return statistics for all systems', () => {
      hub.registerSystem('statSys', { evaluate: () => {} });
      hub.querySystems({}, {});
      hub.querySystems({}, {});

      const stats = hub.getSystemStats();
      assert.ok(stats.statSys);
      assert.strictEqual(stats.statSys.callCount, 2);
    });
  });

  describe('resetStats', () => {
    it('should reset call counts', () => {
      hub.registerSystem('resetSys', { evaluate: () => {} });
      hub.querySystems({}, {});
      hub.querySystems({}, {});

      hub.resetStats();
      const stats = hub.getSystemStats();
      assert.strictEqual(stats.resetSys.callCount, 0);
    });
  });

  describe('getSystemNames', () => {
    it('should return array of system names', () => {
      hub.registerSystem('name1', { evaluate: () => {} });
      hub.registerSystem('name2', { evaluate: () => {} });

      const names = hub.getSystemNames();
      assert.ok(names.includes('name1'));
      assert.ok(names.includes('name2'));
    });
  });
});
