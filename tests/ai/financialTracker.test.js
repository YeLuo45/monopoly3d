import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { FinancialTracker } from '../../src/game/ai/finance/financialTracker.js';

function createGameState(overrides = {}) {
  return {
    turn: 5,
    tiles: [
      { 
        id: 1, 
        type: 'property', 
        name: 'Mediterranean', 
        price: 60, 
        colorGroup: 'brown',
        rent: 2,
        houseCost: 50,
        houses: 0,
      },
      { 
        id: 2, 
        type: 'property', 
        name: 'Baltic', 
        price: 60, 
        colorGroup: 'brown',
        rent: 4,
        houseCost: 50,
        houses: 0,
      },
      { 
        id: 3, 
        type: 'property', 
        name: 'Park Place', 
        price: 350, 
        colorGroup: 'darkBlue',
        rent: 35,
        houseCost: 200,
        houses: 2,
      },
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }, { id: 2 }] },
      { id: 'p2', name: 'Player 2', money: 1200, properties: [] },
    ],
    currentPlayerId: 'p1',
    ...overrides,
  };
}

describe('FinancialTracker', () => {
  describe('constructor', () => {
    it('creates tracker with empty transactions', () => {
      const tracker = new FinancialTracker();
      assert.ok(tracker);
      assert.ok(tracker.transactions instanceof Map);
      assert.strictEqual(tracker.transactions.size, 0);
    });
  });

  describe('recordTransaction', () => {
    it('records transaction for player', () => {
      const tracker = new FinancialTracker();
      tracker.recordTransaction('p1', {
        amount: 100,
        type: 'income',
        reason: 'rent',
        turn: 1,
      });
      
      const history = tracker.getTransactionHistory('p1', 10);
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].amount, 100);
    });

    it('generates unique transaction ID', () => {
      const tracker = new FinancialTracker();
      tracker.recordTransaction('p1', {
        amount: 50,
        type: 'expense',
        reason: 'tax',
        turn: 1,
      });
      
      const history = tracker.getTransactionHistory('p1', 10);
      assert.ok(history[0].id.startsWith('tx_'));
    });

    it('includes timestamp in transaction', () => {
      const tracker = new FinancialTracker();
      tracker.recordTransaction('p1', {
        amount: 200,
        type: 'income',
        reason: 'go',
        turn: 2,
      });
      
      const history = tracker.getTransactionHistory('p1', 10);
      assert.ok(history[0].timestamp > 0);
    });

    it('tracks multiple transactions per player', () => {
      const tracker = new FinancialTracker();
      tracker.recordTransaction('p1', { amount: 100, type: 'income', turn: 1 });
      tracker.recordTransaction('p1', { amount: 50, type: 'expense', turn: 2 });
      tracker.recordTransaction('p1', { amount: 200, type: 'income', turn: 3 });
      
      const history = tracker.getTransactionHistory('p1', 10);
      assert.strictEqual(history.length, 3);
    });
  });

  describe('getTransactionHistory', () => {
    it('returns empty array for unknown player', () => {
      const tracker = new FinancialTracker();
      const history = tracker.getTransactionHistory('unknown', 10);
      assert.strictEqual(history.length, 0);
    });

    it('limits history to requested count', () => {
      const tracker = new FinancialTracker();
      for (let i = 1; i <= 20; i++) {
        tracker.recordTransaction('p1', { amount: i, type: 'income', turn: i });
      }
      
      const history = tracker.getTransactionHistory('p1', 5);
      assert.strictEqual(history.length, 5);
    });

    it('returns most recent transactions', () => {
      const tracker = new FinancialTracker();
      for (let i = 1; i <= 15; i++) {
        tracker.recordTransaction('p1', { amount: i, type: 'income', turn: i });
      }
      
      const history = tracker.getTransactionHistory('p1', 10);
      // Should have turns 6-15 (most recent 10)
      assert.ok(history[0].turn >= 6);
    });
  });

  describe('getNetWorth', () => {
    it('returns 0 for unknown player', () => {
      const tracker = new FinancialTracker();
      const netWorth = tracker.getNetWorth('unknown', createGameState());
      assert.strictEqual(netWorth, 0);
    });

    it('includes player cash', () => {
      const tracker = new FinancialTracker();
      const gameState = createGameState();
      const netWorth = tracker.getNetWorth('p1', gameState);
      assert.ok(netWorth >= 1500);
    });

    it('includes property values', () => {
      const tracker = new FinancialTracker();
      const gameState = createGameState();
      const netWorth = tracker.getNetWorth('p1', gameState);
      // Should include property prices (60 + 60 = 120)
      assert.ok(netWorth >= 1620); // 1500 cash + 120 properties
    });

    it('deducts mortgage debt', () => {
      const tracker = new FinancialTracker();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1, mortgaged: true }] },
        ],
      });
      const netWorth = tracker.getNetWorth('p1', gameState);
      // Should deduct 60 * 0.5 = 30 for mortgage
      assert.ok(netWorth < 1500);
    });
  });

  describe('getCashFlow', () => {
    it('calculates cash flow from transactions', () => {
      const tracker = new FinancialTracker();
      tracker.recordTransaction('p1', { amount: 100, type: 'income', turn: 1 });
      tracker.recordTransaction('p1', { amount: 30, type: 'expense', turn: 1 });
      
      const cashFlow = tracker.getCashFlow('p1', createGameState());
      assert.strictEqual(cashFlow.inflow, 100);
      assert.strictEqual(cashFlow.outflow, 30);
      assert.strictEqual(cashFlow.net, 70);
    });

    it('returns zero for unknown player', () => {
      const tracker = new FinancialTracker();
      const cashFlow = tracker.getCashFlow('unknown', createGameState());
      assert.strictEqual(cashFlow.inflow, 0);
      assert.strictEqual(cashFlow.outflow, 0);
    });
  });

  describe('predictInsolvency', () => {
    it('returns critical for zero cash', () => {
      const tracker = new FinancialTracker();
      const gameState = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 0, properties: [] }],
      });
      const prediction = tracker.predictInsolvency('p1', gameState);
      assert.strictEqual(prediction.risk, 'critical');
      assert.strictEqual(prediction.turnsToInsolvency, 0);
    });

    it('returns low risk for positive cash flow', () => {
      const tracker = new FinancialTracker();
      tracker.recordTransaction('p1', { amount: 100, type: 'income', turn: 1 });
      tracker.recordTransaction('p1', { amount: 50, type: 'income', turn: 2 });
      
      const gameState = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 1000, properties: [] }],
      });
      const prediction = tracker.predictInsolvency('p1', gameState);
      assert.strictEqual(prediction.risk, 'low');
    });

    it('returns unknown for unknown player', () => {
      const tracker = new FinancialTracker();
      const prediction = tracker.predictInsolvency('unknown', createGameState());
      assert.strictEqual(prediction.risk, 'unknown');
    });

    it('returns valid severity', () => {
      const tracker = new FinancialTracker();
      const gameState = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 100, properties: [] }],
      });
      const prediction = tracker.predictInsolvency('p1', gameState);
      assert.ok(prediction.severity >= 0);
      assert.ok(prediction.severity <= 1);
    });
  });

  describe('canAfford', () => {
    it('returns true when player can afford amount', () => {
      const tracker = new FinancialTracker();
      const result = tracker.canAfford('p1', 1000, createGameState());
      assert.strictEqual(result, true);
    });

    it('returns false when player cannot afford amount', () => {
      const tracker = new FinancialTracker();
      const result = tracker.canAfford('p1', 2000, createGameState());
      assert.strictEqual(result, false);
    });

    it('returns false for unknown player', () => {
      const tracker = new FinancialTracker();
      const result = tracker.canAfford('unknown', 100, createGameState());
      assert.strictEqual(result, false);
    });
  });

  describe('getWealthRank', () => {
    it('returns rank based on net worth', () => {
      const tracker = new FinancialTracker();
      const gameState = createGameState();
      const rank = tracker.getWealthRank('p1', gameState);
      assert.ok(rank >= 1);
    });

    it('returns higher rank for richer player', () => {
      const tracker = new FinancialTracker();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 5000, properties: [] },
          { id: 'p2', name: 'Player 2', money: 100, properties: [] },
        ],
      });
      const rank1 = tracker.getWealthRank('p1', gameState);
      const rank2 = tracker.getWealthRank('p2', gameState);
      assert.ok(rank1 < rank2);
    });
  });
});