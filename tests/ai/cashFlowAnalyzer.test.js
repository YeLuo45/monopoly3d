import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { CashFlowAnalyzer } from '../../src/game/ai/mortgage/cashFlowAnalyzer.js';

function createMockMemoryLayer() {
  return {
    ingest: () => {},
    getPlayerModel: () => null,
  };
}

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
        rentWith1House: 10,
        rentWith2House: 30,
        rentWith3House: 90,
        rentWith4House: 160,
        hotelRent: 250,
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
        rentWith1House: 20,
        rentWith2House: 60,
        rentWith3House: 180,
        rentWith4House: 320,
        hotelRent: 450,
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
        rentWith1House: 50,
        rentWith2House: 70,
        rentWith3House: 90,
        rentWith4House: 110,
        hotelRent: 130,
        houseCost: 200,
        houses: 0,
      },
      { id: 4, type: 'chance', name: 'Chance' },
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }, { id: 2 }] },
      { id: 'p2', name: 'Player 2', money: 1200, properties: [] },
    ],
    currentPlayerId: 'p1',
    ...overrides,
  };
}

describe('CashFlowAnalyzer', () => {
  describe('constructor', () => {
    it('creates analyzer with memoryLayer', () => {
      const memory = createMockMemoryLayer();
      const analyzer = new CashFlowAnalyzer(memory);
      assert.strictEqual(analyzer.memoryLayer, memory);
    });

    it('creates analyzer without dependencies', () => {
      const analyzer = new CashFlowAnalyzer();
      assert.ok(analyzer);
      assert.strictEqual(typeof analyzer.expenseRates, 'object');
    });
  });

  describe('analyzeCashFlow', () => {
    it('returns zero for unknown player', () => {
      const analyzer = new CashFlowAnalyzer();
      const result = analyzer.analyzeCashFlow('unknown', createGameState());
      assert.strictEqual(result.inflow, 0);
      assert.strictEqual(result.outflow, 0);
      assert.strictEqual(result.net, 0);
    });

    it('calculates cash flow for player with properties', () => {
      const analyzer = new CashFlowAnalyzer();
      const gameState = createGameState();
      const result = analyzer.analyzeCashFlow('p1', gameState);
      assert.ok(result.inflow >= 0);
      assert.ok(result.outflow >= 0);
      assert.strictEqual(typeof result.net, 'number');
    });

    it('net is inflow minus outflow', () => {
      const analyzer = new CashFlowAnalyzer();
      const gameState = createGameState();
      const result = analyzer.analyzeCashFlow('p1', gameState);
      assert.strictEqual(result.net, result.inflow - result.outflow);
    });
  });

  describe('projectCashFlow', () => {
    it('projects cash for specified turns', () => {
      const analyzer = new CashFlowAnalyzer();
      const gameState = createGameState({ turn: 5 });
      const result = analyzer.projectCashFlow('p1', 10, gameState);
      assert.strictEqual(result.turns, 10);
      assert.strictEqual(typeof result.projectedCash, 'number');
    });

    it('returns unknown for invalid player', () => {
      const analyzer = new CashFlowAnalyzer();
      const result = analyzer.projectCashFlow('unknown', 5, createGameState());
      assert.strictEqual(result.risk, 'unknown');
    });

    it('calculates net per turn', () => {
      const analyzer = new CashFlowAnalyzer();
      const gameState = createGameState();
      const result = analyzer.projectCashFlow('p1', 5, gameState);
      assert.strictEqual(result.netPerTurn, result.inflow - result.outflow);
    });
  });

  describe('getCashShortfallRisk', () => {
    it('returns critical risk for very low cash', () => {
      const analyzer = new CashFlowAnalyzer();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 100, properties: [] },
        ],
      });
      const result = analyzer.getCashShortfallRisk('p1', gameState);
      assert.strictEqual(result.risk, 'critical');
      assert.ok(result.severity >= 0.5);
    });

    it('returns low risk for high cash', () => {
      const analyzer = new CashFlowAnalyzer();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 5000, properties: [] },
        ],
      });
      const result = analyzer.getCashShortfallRisk('p1', gameState);
      assert.strictEqual(result.risk, 'low');
    });

    it('returns unknown for unknown player', () => {
      const analyzer = new CashFlowAnalyzer();
      const result = analyzer.getCashShortfallRisk('unknown', createGameState());
      assert.strictEqual(result.risk, 'unknown');
    });
  });

  describe('estimateRentIncome', () => {
    it('estimates rent for properties', () => {
      const analyzer = new CashFlowAnalyzer();
      const gameState = createGameState();
      const rent = analyzer.estimateRentIncome('p1', gameState);
      assert.ok(typeof rent === 'number');
      assert.ok(rent >= 0);
    });

    it('returns 0 for player with no properties', () => {
      const analyzer = new CashFlowAnalyzer();
      const gameState = createGameState();
      const rent = analyzer.estimateRentIncome('p2', gameState);
      assert.strictEqual(rent, 0);
    });

    it('returns 0 for mortgaged properties', () => {
      const analyzer = new CashFlowAnalyzer();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1, mortgaged: true }] },
        ],
      });
      const rent = analyzer.estimateRentIncome('p1', gameState);
      assert.strictEqual(rent, 0);
    });
  });

  describe('getOutstandingRent', () => {
    it('returns 0 (pending implementation)', () => {
      const analyzer = new CashFlowAnalyzer();
      const result = analyzer.getOutstandingRent('p1', createGameState());
      assert.strictEqual(result, 0);
    });
  });
});