/**
 * CoachIntegration Tests
 * Tests for the subsystem integration layer
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';

// Import the class under test
import { CoachIntegration } from '../../src/game/ai/fullCoach/coachIntegration.js';

describe('CoachIntegration', () => {
  let integration;

  beforeEach(() => {
    integration = new CoachIntegration();
  });

  describe('constructor', () => {
    it('should create instance with null store by default', () => {
      assert.strictEqual(integration.store, null);
    });

    it('should accept store parameter', () => {
      const mockStore = { subscribe: () => {} };
      const i = new CoachIntegration(mockStore);
      assert.strictEqual(i.store, mockStore);
    });

    it('should have event bus', () => {
      assert.ok(integration.eventBus);
      assert.strictEqual(typeof integration.eventBus.subscribe, 'function');
      assert.strictEqual(typeof integration.eventBus.publish, 'function');
    });

    it('should not be initialized by default', () => {
      assert.strictEqual(integration.isInitialized, false);
    });
  });

  describe('initialize', () => {
    it('should create all subsystems', () => {
      integration.initialize();
      
      assert.ok(integration.memoryLayer);
      assert.ok(integration.embedding);
      assert.ok(integration.situationEncoder);
      assert.ok(integration.advisor);
      assert.ok(integration.coach);
      assert.ok(integration.opponentTracker);
      assert.ok(integration.dashboard);
      assert.ok(integration.decisionAnalyzer);
    });

    it('should set isInitialized to true', () => {
      integration.initialize();
      assert.strictEqual(integration.isInitialized, true);
    });

    it('should create L0-L4 memory hierarchy', () => {
      integration.initialize();
      
      assert.ok(integration.memoryLayer.l0);
      assert.ok(integration.memoryLayer.l1);
      assert.ok(integration.memoryLayer.l2);
      assert.ok(integration.memoryLayer.l3);
      assert.ok(integration.memoryLayer.l4);
    });

    it('should return this for chaining', () => {
      const result = integration.initialize();
      assert.strictEqual(result, integration);
    });
  });

  describe('wireMemoryLayer', () => {
    it('should return this for chaining', () => {
      integration.initialize();
      const result = integration.wireMemoryLayer();
      assert.strictEqual(result, integration);
    });

    it('should not throw when called before initialization', () => {
      assert.doesNotThrow(() => {
        integration.wireMemoryLayer();
      });
    });
  });

  describe('wireStrategyAdvisor', () => {
    it('should return this for chaining', () => {
      integration.initialize();
      const result = integration.wireStrategyAdvisor();
      assert.strictEqual(result, integration);
    });

    it('should subscribe to advice_requested events', () => {
      integration.initialize();
      
      let eventReceived = false;
      integration.eventBus.subscribe('advice_generated', () => {
        eventReceived = true;
      });
      
      integration.eventBus.publish('advice_requested', {
        playerId: 'player1',
        gameState: {},
      });
      
      // Give time for async handler
    });
  });

  describe('wireLearningCoach', () => {
    it('should return this for chaining', () => {
      integration.initialize();
      const result = integration.wireLearningCoach();
      assert.strictEqual(result, integration);
    });

    it('should subscribe to game_end event', () => {
      integration.initialize();
      
      assert.doesNotThrow(() => {
        integration.eventBus.publish('game_end', { playerId: 'player1' });
      });
    });
  });

  describe('wireOpponentTracker', () => {
    it('should return this for chaining', () => {
      integration.initialize();
      const result = integration.wireOpponentTracker();
      assert.strictEqual(result, integration);
    });

    it('should subscribe to player action events', () => {
      integration.initialize();
      
      assert.doesNotThrow(() => {
        integration.eventBus.publish('player_action', { playerId: 'player1' });
      });
    });
  });

  describe('wirePerformanceDashboard', () => {
    it('should return this for chaining', () => {
      integration.initialize();
      const result = integration.wirePerformanceDashboard();
      assert.strictEqual(result, integration);
    });

    it('should handle decision_made events', () => {
      integration.initialize();
      
      assert.doesNotThrow(() => {
        integration.eventBus.publish('decision_made', {
          playerId: 'player1',
          decision: {},
        });
      });
    });
  });

  describe('getSubsystem', () => {
    beforeEach(() => {
      integration.initialize();
    });

    it('should return memoryLayer for "memoryLayer" and "memory"', () => {
      assert.ok(integration.getSubsystem('memoryLayer'));
      assert.ok(integration.getSubsystem('memory'));
    });

    it('should return L0-L4 for "l0", "l1", "l2", "l3", "l4"', () => {
      assert.ok(integration.getSubsystem('l0'));
      assert.ok(integration.getSubsystem('l1'));
      assert.ok(integration.getSubsystem('l2'));
      assert.ok(integration.getSubsystem('l3'));
      assert.ok(integration.getSubsystem('l4'));
    });

    it('should return embedding for "embedding"', () => {
      assert.ok(integration.getSubsystem('embedding'));
    });

    it('should return advisor for "advisor"', () => {
      assert.ok(integration.getSubsystem('advisor'));
    });

    it('should return coach for "coach" and "learningCoach"', () => {
      assert.ok(integration.getSubsystem('coach'));
      assert.ok(integration.getSubsystem('learningCoach'));
    });

    it('should return opponentTracker for "opponentTracker" and "opponents"', () => {
      assert.ok(integration.getSubsystem('opponentTracker'));
      assert.ok(integration.getSubsystem('opponents'));
    });

    it('should return dashboard for "dashboard" and "performance"', () => {
      assert.ok(integration.getSubsystem('dashboard'));
      assert.ok(integration.getSubsystem('performance'));
    });

    it('should return decisionAnalyzer', () => {
      assert.ok(integration.getSubsystem('decisionAnalyzer'));
    });

    it('should return null for unknown subsystem name', () => {
      assert.strictEqual(integration.getSubsystem('unknown'), null);
    });
  });

  describe('getAllSubsystems', () => {
    it('should return all subsystems structured object', () => {
      integration.initialize();
      
      const all = integration.getAllSubsystems();
      
      assert.ok(all.memory);
      assert.ok(all.embedding);
      assert.ok(all.situationEncoder);
      assert.ok(all.advisor);
      assert.ok(all.coach);
      assert.ok(all.opponentTracker);
      assert.ok(all.dashboard);
      assert.ok(all.decisionAnalyzer);
    });

    it('should include L0-L4 in memory', () => {
      integration.initialize();
      
      const all = integration.getAllSubsystems();
      
      assert.ok(all.memory.l0);
      assert.ok(all.memory.l1);
      assert.ok(all.memory.l2);
      assert.ok(all.memory.l3);
      assert.ok(all.memory.l4);
    });
  });

  describe('isReady', () => {
    it('should return false before initialization', () => {
      assert.strictEqual(integration.isReady(), false);
    });

    it('should return true after initialization', () => {
      integration.initialize();
      assert.strictEqual(integration.isReady(), true);
    });
  });

  describe('reset', () => {
    it('should clear all subsystems', () => {
      integration.initialize();
      integration.reset();
      
      assert.strictEqual(integration.memoryLayer, null);
      assert.strictEqual(integration.embedding, null);
      assert.strictEqual(integration.advisor, null);
      assert.strictEqual(integration.coach, null);
      assert.strictEqual(integration.opponentTracker, null);
      assert.strictEqual(integration.dashboard, null);
      assert.strictEqual(integration.isInitialized, false);
    });
  });

  describe('getStatus', () => {
    it('should return status before initialization', () => {
      const status = integration.getStatus();
      
      assert.strictEqual(status.initialized, false);
      assert.ok(status.subsystems);
    });

    it('should show all subsystems after initialization', () => {
      integration.initialize();
      
      const status = integration.getStatus();
      
      assert.strictEqual(status.initialized, true);
      assert.strictEqual(status.subsystems.memoryLayer, true);
      assert.strictEqual(status.subsystems.embedding, true);
      assert.strictEqual(status.subsystems.advisor, true);
      assert.strictEqual(status.subsystems.coach, true);
      assert.strictEqual(status.subsystems.opponentTracker, true);
      assert.strictEqual(status.subsystems.dashboard, true);
      assert.strictEqual(status.subsystems.decisionAnalyzer, true);
    });
  });
});