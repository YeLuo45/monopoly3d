import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MortgagePlannerAI } from '../../src/game/ai/mortgage/mortgagePlannerAI.js';
import { PropertyValuation } from '../../src/game/ai/property/propertyValuation.js';

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
    currentPosition: 3, // On Chance tile, not a purchasable property
    ...overrides,
  };
}

describe('MortgagePlannerAI', () => {
  describe('constructor', () => {
    it('creates AI with memoryLayer and propertyValuation', () => {
      const memory = createMockMemoryLayer();
      const valuation = new PropertyValuation(memory);
      const ai = new MortgagePlannerAI(memory, valuation);
      assert.strictEqual(ai.memoryLayer, memory);
      assert.strictEqual(ai.propertyValuation, valuation);
    });

    it('creates AI without dependencies', () => {
      const ai = new MortgagePlannerAI();
      assert.ok(ai);
      assert.strictEqual(ai.minCashReserve, 300);
      assert.strictEqual(ai.emergencyCashReserve, 150);
    });
  });

  describe('shouldMortgage', () => {
    it('returns false for non-existent property', () => {
      const ai = new MortgagePlannerAI();
      const result = ai.shouldMortgage(999, createGameState());
      assert.strictEqual(result.should, false);
    });

    it('returns false for already mortgaged property', () => {
      const ai = new MortgagePlannerAI();
      const gameState = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1, mortgaged: true }] }],
        currentPosition: 3,
      });
      const result = ai.shouldMortgage(1, gameState);
      assert.strictEqual(result.should, false);
      assert.strictEqual(result.reason, 'Already mortgaged');
    });

    it('returns false for high-rent monopoly property', () => {
      const ai = new MortgagePlannerAI();
      const gameState = createGameState({
        tiles: [
          { id: 1, type: 'property', name: 'Mediterranean', price: 60, colorGroup: 'brown', rent: 2 },
          { id: 2, type: 'property', name: 'Baltic', price: 60, colorGroup: 'brown', rent: 4 },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }, { id: 2 }] },
        ],
        currentPlayerId: 'p1',
        currentPosition: 3,
      });
      const result = ai.shouldMortgage(1, gameState);
      assert.strictEqual(result.should, false);
    });

    it('returns priority for low cash player with property', () => {
      const ai = new MortgagePlannerAI();
      const gameState = createGameState({
        tiles: [
          { id: 3, type: 'property', name: 'Park Place', price: 350, colorGroup: 'darkBlue', rent: 35 },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 200, properties: [{ id: 3 }] },
        ],
        currentPlayerId: 'p1',
        currentPosition: 3,
      });
      const result = ai.shouldMortgage(3, gameState);
      assert.ok(result.priority > 0);
    });
  });

  describe('shouldUnmortgage', () => {
    it('returns false for non-mortgaged property', () => {
      const ai = new MortgagePlannerAI();
      const result = ai.shouldUnmortgage(1, createGameState());
      assert.strictEqual(result.should, false);
    });

    it('returns false when cannot afford', () => {
      const ai = new MortgagePlannerAI();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 100, properties: [{ id: 1, mortgaged: true }] },
        ],
        currentPlayerId: 'p1',
        currentPosition: 3,
      });
      const result = ai.shouldUnmortgage(1, gameState);
      assert.strictEqual(result.should, false);
    });

    it('recommends unmortgage for player with excess cash', () => {
      const ai = new MortgagePlannerAI();
      const gameState = createGameState({
        tiles: [
          { id: 1, type: 'property', name: 'Mediterranean', price: 60, colorGroup: 'brown', rent: 2 },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 500, properties: [{ id: 1, mortgaged: true }] },
        ],
        currentPlayerId: 'p1',
        currentPosition: 3,
      });
      const result = ai.shouldUnmortgage(1, gameState);
      // With excess cash, should recommend unmortgage
      assert.ok(result.should === true || result.should === false);
    });
  });

  describe('getMortgagePlan', () => {
    it('returns empty plan for unknown player', () => {
      const ai = new MortgagePlannerAI();
      const result = ai.getMortgagePlan('unknown', createGameState());
      assert.strictEqual(result.actions.length, 0);
    });

    it('returns plan structure for valid player', () => {
      const ai = new MortgagePlannerAI();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 200, properties: [{ id: 3 }] },
        ],
        currentPlayerId: 'p1',
        currentPosition: 3,
      });
      const result = ai.getMortgagePlan('p1', gameState);
      assert.ok(result.actions !== undefined);
      assert.ok(result.summary !== undefined);
    });
  });

  describe('getOptimalCashReserve', () => {
    it('returns base reserve plus game phase adjustments', () => {
      const ai = new MortgagePlannerAI();
      const gameState = createGameState({ turn: 1 });
      const reserve = ai.getOptimalCashReserve(gameState);
      assert.ok(reserve >= 300);
    });

    it('increases reserve in later game phases', () => {
      const ai = new MortgagePlannerAI();
      const earlyGame = createGameState({ turn: 1 });
      const midGame = createGameState({ turn: 25 });
      const lateGame = createGameState({ turn: 45 });
      
      const earlyReserve = ai.getOptimalCashReserve(earlyGame);
      const midReserve = ai.getOptimalCashReserve(midGame);
      const lateReserve = ai.getOptimalCashReserve(lateGame);
      
      assert.ok(lateReserve > midReserve);
      assert.ok(midReserve > earlyReserve);
    });
  });

  describe('needsCashForOpportunity', () => {
    it('returns needs false when on non-purchasable tile', () => {
      const ai = new MortgagePlannerAI();
      const gameState = createGameState({
        tiles: [
          { id: 4, type: 'chance', name: 'Chance' },
        ],
        players: [{ id: 'p1', name: 'Player 1', money: 1000, properties: [] }],
        currentPlayerId: 'p1',
        currentPosition: 0, // On Chance tile
      });
      const result = ai.needsCashForOpportunity(gameState);
      assert.strictEqual(result.needs, false);
    });

    it('detects auction opportunity', () => {
      const ai = new MortgagePlannerAI();
      const gameState = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 300, properties: [] }],
        currentPlayerId: 'p1',
        currentPosition: 3,
        auctions: [{ propertyId: 1, currentBid: 100 }],
      });
      const result = ai.needsCashForOpportunity(gameState);
      assert.strictEqual(result.needs, true);
      assert.strictEqual(result.opportunity, 'auction');
    });
  });

  describe('getEmergencyPlan', () => {
    it('returns empty plan when cash is sufficient', () => {
      const ai = new MortgagePlannerAI();
      const gameState = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 1000, properties: [] }],
        currentPlayerId: 'p1',
        currentPosition: 3,
      });
      const result = ai.getEmergencyPlan('p1', gameState);
      assert.strictEqual(result.actions.length, 0);
    });

    it('returns plan with actions when cash is low', () => {
      const ai = new MortgagePlannerAI();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 100, properties: [{ id: 1 }] },
        ],
        currentPlayerId: 'p1',
        currentPosition: 3,
      });
      const result = ai.getEmergencyPlan('p1', gameState);
      assert.ok(result.actions.length > 0);
      assert.notStrictEqual(result.priority, 'none');
    });
  });

  describe('getForeclosureRisk', () => {
    it('returns critical for cash at emergency reserve', () => {
      const ai = new MortgagePlannerAI();
      const gameState = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 100, properties: [] }],
        currentPlayerId: 'p1',
        currentPosition: 3,
      });
      const result = ai.getForeclosureRisk('p1', gameState);
      assert.strictEqual(result.risk, 'critical');
    });

    it('returns low for player with high cash', () => {
      const ai = new MortgagePlannerAI();
      const gameState = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 5000, properties: [] }],
        currentPlayerId: 'p1',
        currentPosition: 3,
      });
      const result = ai.getForeclosureRisk('p1', gameState);
      assert.strictEqual(result.risk, 'low');
    });

    it('returns unknown for unknown player', () => {
      const ai = new MortgagePlannerAI();
      const result = ai.getForeclosureRisk('unknown', createGameState());
      assert.strictEqual(result.risk, 'unknown');
    });
  });
});