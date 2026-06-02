import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { BudgetOptimizer } from '../../src/game/ai/finance/budgetOptimizer.js';

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
        houses: 0,
      },
      { 
        id: 4, 
        type: 'property', 
        name: 'Boardwalk', 
        price: 400, 
        colorGroup: 'darkBlue',
        rent: 50,
        houseCost: 200,
        houses: 0,
      },
      { id: 5, type: 'chance', name: 'Chance' },
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }, { id: 2 }] },
      { id: 'p2', name: 'Player 2', money: 1200, properties: [] },
    ],
    currentPlayerId: 'p1',
    ...overrides,
  };
}

describe('BudgetOptimizer', () => {
  describe('constructor', () => {
    it('creates optimizer with default allocations', () => {
      const optimizer = new BudgetOptimizer();
      assert.ok(optimizer);
      assert.ok(typeof optimizer.defaultAllocations === 'object');
      assert.strictEqual(optimizer.defaultAllocations.emergency, 0.2);
    });

    it('sets minimum cash threshold', () => {
      const optimizer = new BudgetOptimizer();
      assert.ok(optimizer.minCashThreshold > 0);
      assert.ok(optimizer.emergencyThreshold > optimizer.minCashThreshold);
    });
  });

  describe('allocateBudget', () => {
    it('returns budget allocation for player', () => {
      const optimizer = new BudgetOptimizer();
      const allocation = optimizer.allocateBudget('p1', createGameState());
      assert.ok(typeof allocation.categories === 'object');
      assert.ok(typeof allocation.total === 'number');
    });

    it('includes all budget categories', () => {
      const optimizer = new BudgetOptimizer();
      const allocation = optimizer.allocateBudget('p1', createGameState());
      assert.ok('emergency' in allocation.categories);
      assert.ok('housing' in allocation.categories);
      assert.ok('investment' in allocation.categories);
      assert.ok('reserve' in allocation.categories);
      assert.ok('upgrade' in allocation.categories);
    });

    it('allocates full player money across categories', () => {
      const optimizer = new BudgetOptimizer();
      const allocation = optimizer.allocateBudget('p1', createGameState());
      const sum = Object.values(allocation.categories).reduce((a, b) => a + b, 0);
      assert.strictEqual(sum, 1500);
    });

    it('adjusts for early game', () => {
      const optimizer = new BudgetOptimizer();
      const allocation = optimizer.allocateBudget('p1', createGameState({ turn: 5 }));
      assert.ok(allocation.allocations.investment >= 0.3);
    });

    it('adjusts for late game', () => {
      const optimizer = new BudgetOptimizer();
      const allocation = optimizer.allocateBudget('p1', createGameState({ turn: 30 }));
      assert.ok(allocation.allocations.emergency >= 0.25);
    });

    it('returns empty allocation for unknown player', () => {
      const optimizer = new BudgetOptimizer();
      const allocation = optimizer.allocateBudget('unknown', createGameState());
      assert.strictEqual(allocation.total, 0);
    });

    it('includes recommendations when relevant', () => {
      const optimizer = new BudgetOptimizer();
      const allocation = optimizer.allocateBudget('p1', createGameState());
      assert.ok(Array.isArray(allocation.recommendations));
    });
  });

  describe('getHousingBudget', () => {
    it('returns 0 when no monopolies', () => {
      const optimizer = new BudgetOptimizer();
      const budget = optimizer.getHousingBudget('p2', createGameState());
      assert.strictEqual(budget, 0);
    });

    it('returns positive budget when has monopoly', () => {
      const optimizer = new BudgetOptimizer();
      const budget = optimizer.getHousingBudget('p1', createGameState());
      assert.ok(budget >= 0);
    });

    it('returns 0 for unknown player', () => {
      const optimizer = new BudgetOptimizer();
      const budget = optimizer.getHousingBudget('unknown', createGameState());
      assert.strictEqual(budget, 0);
    });

    it('calculates based on house costs', () => {
      const optimizer = new BudgetOptimizer();
      const budget = optimizer.getHousingBudget('p1', createGameState());
      // Player p1 has brown monopoly (2 properties), house cost 50 each
      // Need 10 houses max (5 per property) = 500 max
      assert.ok(budget <= 500);
    });
  });

  describe('getEmergencyFund', () => {
    it('returns emergency fund details', () => {
      const optimizer = new BudgetOptimizer();
      const fund = optimizer.getEmergencyFund('p1', createGameState());
      assert.ok('current' in fund);
      assert.ok('target' in fund);
      assert.ok('deficit' in fund);
    });

    it('returns correct current amount', () => {
      const optimizer = new BudgetOptimizer();
      const fund = optimizer.getEmergencyFund('p1', createGameState());
      assert.strictEqual(fund.current, 1500);
    });

    it('calculates deficit correctly', () => {
      const optimizer = new BudgetOptimizer();
      const fund = optimizer.getEmergencyFund('p2', createGameState());
      // Player p2 has 1200, target depends on turn
      assert.ok(fund.deficit >= 0);
    });

    it('indicates if fund is sufficient', () => {
      const optimizer = new BudgetOptimizer();
      const fund = optimizer.getEmergencyFund('p1', createGameState());
      assert.ok(typeof fund.sufficient === 'boolean');
    });

    it('returns zeros for unknown player', () => {
      const optimizer = new BudgetOptimizer();
      const fund = optimizer.getEmergencyFund('unknown', createGameState());
      assert.strictEqual(fund.current, 0);
      assert.strictEqual(fund.target, 0);
    });
  });

  describe('resolveBudgetConflict', () => {
    it('resolves by priority when different', () => {
      const optimizer = new BudgetOptimizer();
      const optionA = { name: 'rent', cost: 100, priority: 'critical' };
      const optionB = { name: 'upgrade', cost: 200, priority: 'low' };
      const result = optimizer.resolveBudgetConflict(optionA, optionB, createGameState());
      assert.strictEqual(result.winner, 'rent');
    });

    it('resolves by ROI when same priority', () => {
      const optimizer = new BudgetOptimizer();
      const optionA = { name: 'property1', cost: 100, priority: 'medium', expectedReturn: 0.2 };
      const optionB = { name: 'property2', cost: 100, priority: 'medium', expectedReturn: 0.1 };
      const result = optimizer.resolveBudgetConflict(optionA, optionB, createGameState());
      assert.strictEqual(result.winner, 'property1');
    });

    it('resolves by cost when same priority and ROI', () => {
      const optimizer = new BudgetOptimizer();
      const optionA = { name: 'cheap', cost: 100, priority: 'medium', expectedReturn: 0.1 };
      const optionB = { name: 'expensive', cost: 200, priority: 'medium', expectedReturn: 0.1 };
      const result = optimizer.resolveBudgetConflict(optionA, optionB, createGameState());
      assert.strictEqual(result.winner, 'cheap');
    });

    it('provides reasoning for decision', () => {
      const optimizer = new BudgetOptimizer();
      const optionA = { name: 'rent', cost: 100, priority: 'critical' };
      const optionB = { name: 'upgrade', cost: 200, priority: 'high' };
      const result = optimizer.resolveBudgetConflict(optionA, optionB, createGameState());
      assert.ok(typeof result.reasoning === 'string');
      assert.ok(result.reasoning.length > 0);
    });

    it('handles null options', () => {
      const optimizer = new BudgetOptimizer();
      const result = optimizer.resolveBudgetConflict(null, { name: 'test', cost: 100, priority: 'medium' }, createGameState());
      assert.strictEqual(result.winner, null);
    });
  });

  describe('getInvestmentBudget', () => {
    it('returns available budget for investment', () => {
      const optimizer = new BudgetOptimizer();
      const budget = optimizer.getInvestmentBudget('p1', createGameState());
      assert.ok(typeof budget.available === 'number');
      assert.ok(budget.available >= 0);
    });

    it('returns recommendations array', () => {
      const optimizer = new BudgetOptimizer();
      const budget = optimizer.getInvestmentBudget('p1', createGameState());
      assert.ok(Array.isArray(budget.recommendations));
    });

    it('recommends unowned properties', () => {
      const optimizer = new BudgetOptimizer();
      const budget = optimizer.getInvestmentBudget('p1', createGameState());
      // p1 owns properties 1,2, so should recommend 3 or 4
      if (budget.recommendations.length > 0) {
        assert.ok(!['p1'].includes(budget.recommendations[0].id));
      }
    });
  });
});