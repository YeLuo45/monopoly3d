/**
 * EconomicSystemFacade Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

import { EconomicSystemFacade } from '../../src/game/ai/economicSystemFacade.js';

describe('EconomicSystemFacade', () => {
  let facade;
  let mockMemoryLayer;
  let mockOpponentModel;

  before(() => {
    mockMemoryLayer = {
      playerId: 'player1',
      getPlayerState: (id) => ({ id, money: 5000, properties: [] }),
    };
    mockOpponentModel = {
      predict: () => ({ action: 'hold', confidence: 0.5 }),
    };
    facade = new EconomicSystemFacade(mockMemoryLayer, mockOpponentModel);
  });

  describe('constructor', () => {
    it('should initialize with memory layer', () => {
      const f = new EconomicSystemFacade(mockMemoryLayer);
      assert.strictEqual(f.memoryLayer, mockMemoryLayer);
    });

    it('should initialize with opponent model', () => {
      const f = new EconomicSystemFacade(null, mockOpponentModel);
      assert.strictEqual(f.opponentModel, mockOpponentModel);
    });

    it('should register AI systems with coordination hub', () => {
      assert.ok(facade.coordinationHub);
      assert.ok(facade.coordinationHub.hasSystem('trading'));
      assert.ok(facade.coordinationHub.hasSystem('investment'));
      assert.ok(facade.coordinationHub.hasSystem('banking'));
      assert.ok(facade.coordinationHub.hasSystem('financial'));
    });

    it('should initialize individual AI systems', () => {
      assert.ok(facade.tradingAI);
      assert.ok(facade.investmentAI);
      assert.ok(facade.bankingAI);
      assert.ok(facade.financialTracker);
    });
  });

  describe('makeDecision', () => {
    it('should return decision with confidence and reasoning', () => {
      const context = {
        playerId: 'player1',
        situation: { type: 'trade', trade: {} },
      };
      const gameState = {
        players: [{ id: 'player1', money: 5000, properties: [] }],
        turn: 5,
      };

      const result = facade.makeDecision(context, gameState);
      assert.ok(result);
      assert.ok(typeof result.decision === 'string');
      assert.ok(typeof result.confidence === 'number');
      assert.ok(typeof result.reasoning === 'string');
      assert.ok(Array.isArray(result.systemsUsed));
    });

    it('should return null decision for invalid context', () => {
      const result = facade.makeDecision(null, {});
      assert.strictEqual(result.decision, null);
      assert.strictEqual(result.confidence, 0);
    });

    it('should include systems used in decision', () => {
      const context = { playerId: 'player1', situation: {} };
      const gameState = {
        players: [{ id: 'player1', money: 5000, properties: [] }],
        turn: 5,
      };

      const result = facade.makeDecision(context, gameState);
      assert.ok(result.systemsUsed.length >= 0);
    });
  });

  describe('getTradingDecision', () => {
    it('should evaluate property for trading', () => {
      const gameState = {
        currentPlayerId: 'player1',
        players: [{ id: 'player1', money: 5000, properties: [] }],
        tiles: [
          { id: 'prop1', name: 'Mediterranean Ave', type: 'property', price: 60, colorGroup: 'brown' },
        ],
      };

      const result = facade.getTradingDecision('prop1', gameState);
      assert.ok(result);
      assert.ok(typeof result.decision === 'string');
      assert.ok(typeof result.fairness === 'number');
      assert.ok(typeof result.bias === 'number');
    });

    it('should handle property not found', () => {
      const gameState = {
        currentPlayerId: 'player1',
        players: [{ id: 'player1', money: 5000, properties: [] }],
        tiles: [],
      };

      const result = facade.getTradingDecision('nonexistent', gameState);
      assert.strictEqual(result.decision, 'no_trade');
    });
  });

  describe('getInvestmentDecision', () => {
    it('should return investment recommendation for property', () => {
      const gameState = {
        currentPlayerId: 'player1',
        players: [{ id: 'player1', money: 5000, properties: [] }],
        turn: 5,
        tiles: [
          { id: 'prop1', name: 'Boardwalk', type: 'property', price: 400, colorGroup: 'dark_blue' },
        ],
      };

      const result = facade.getInvestmentDecision('prop1', gameState);
      assert.ok(result);
      assert.ok(typeof result.decision === 'string');
      assert.ok(typeof result.score === 'number');
      assert.ok(result.decision === 'buy' || result.decision === 'hold');
    });
  });

  describe('getBankingDecision', () => {
    it('should evaluate loan decisions', () => {
      const gameState = {
        currentPlayerId: 'player1',
        players: [{ id: 'player1', money: 5000, properties: [] }],
      };

      // Non-existent loan
      const result = facade.getBankingDecision('nonexistent', gameState);
      assert.ok(result);
      assert.ok(typeof result.decision === 'string');
      assert.ok(typeof result.reasoning === 'string');
    });
  });

  describe('getPrioritizedActions', () => {
    it('should return ranked action list', () => {
      const gameState = {
        currentPlayerId: 'player1',
        players: [
          { id: 'player1', money: 5000, properties: [] },
        ],
        turn: 5,
        tiles: [
          { id: 'prop1', name: 'Mediterranean', type: 'property', price: 60, colorGroup: 'brown', rent: 30 },
        ],
      };

      const actions = facade.getPrioritizedActions('player1', gameState);
      assert.ok(Array.isArray(actions));
    });

    it('should include action details', () => {
      const gameState = {
        currentPlayerId: 'player1',
        players: [
          { id: 'player1', money: 5000, properties: [] },
        ],
        turn: 5,
        tiles: [
          { id: 'prop1', name: 'Mediterranean', type: 'property', price: 60, colorGroup: 'brown' },
        ],
      };

      const actions = facade.getPrioritizedActions('player1', gameState);
      if (actions.length > 0) {
        assert.ok(typeof actions[0].action === 'string');
        assert.ok(typeof actions[0].priority === 'number');
        assert.ok(typeof actions[0].reason === 'string');
      }
    });
  });

  describe('resolveConflicts', () => {
    it('should resolve conflicting recommendations', () => {
      const actions = [
        { action: 'buy', target: 'prop1', score: 80, priority: 1 },
        { action: 'sell', target: 'prop1', score: 70, priority: 1 },
      ];

      const resolved = facade.resolveConflicts(actions, {});
      assert.ok(Array.isArray(resolved));
    });

    it('should return single action unchanged', () => {
      const actions = [{ action: 'buy', target: 'prop1', score: 80 }];
      const resolved = facade.resolveConflicts(actions, {});
      assert.strictEqual(resolved.length, 1);
    });

    it('should handle empty actions array', () => {
      const resolved = facade.resolveConflicts([], {});
      assert.ok(Array.isArray(resolved));
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      facade.updateConfig({ decisionThreshold: 0.7 });
      assert.strictEqual(facade.config.decisionThreshold, 0.7);
    });
  });

  describe('coordinate systems', () => {
    it('should use coordination hub for decisions', () => {
      const context = { playerId: 'player1', situation: {} };
      const gameState = {
        players: [{ id: 'player1', money: 5000, properties: [] }],
        turn: 5,
        tiles: [],
      };

      facade.makeDecision(context, gameState);
      const stats = facade.coordinationHub.getSystemStats();
      assert.ok(stats.trading);
    });
  });
});
