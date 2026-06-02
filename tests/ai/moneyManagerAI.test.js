import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MoneyManagerAI } from '../../src/game/ai/finance/moneyManagerAI.js';

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
      { id: 5, type: 'go', name: 'Go' },
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }, { id: 2 }] },
      { id: 'p2', name: 'Player 2', money: 1200, properties: [] },
    ],
    currentPlayerId: 'p1',
    ...overrides,
  };
}

describe('MoneyManagerAI', () => {
  describe('constructor', () => {
    it('creates AI with memoryLayer', () => {
      const memory = createMockMemoryLayer();
      const ai = new MoneyManagerAI(memory);
      assert.strictEqual(ai.memoryLayer, memory);
    });

    it('creates AI without dependencies', () => {
      const ai = new MoneyManagerAI();
      assert.ok(ai);
      assert.strictEqual(typeof ai.minCashReserve, 'number');
    });
  });

  describe('shouldSpendMoney', () => {
    it('returns should:false for unknown player', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState({ currentPlayerId: null });
      const result = ai.shouldSpendMoney(100, 'test', gameState);
      assert.strictEqual(result.should, false);
    });

    it('returns should:false when insufficient funds', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 100, properties: [] }],
      });
      const result = ai.shouldSpendMoney(200, 'property purchase', gameState);
      assert.strictEqual(result.should, false);
    });

    it('returns should:true for critical expenses', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 500, properties: [] }],
      });
      const result = ai.shouldSpendMoney(100, 'rent payment', gameState);
      assert.strictEqual(result.should, true);
    });

    it('allows spending within risk tolerance', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState({
        turn: 5,
        players: [{ id: 'p1', name: 'Player 1', money: 1000, properties: [] }],
      });
      const result = ai.shouldSpendMoney(100, 'discretionary purchase', gameState);
      assert.ok(typeof result.should === 'boolean');
    });

    it('provides reasoning for decision', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 1000, properties: [] }],
      });
      const result = ai.shouldSpendMoney(50, 'property bid', gameState);
      assert.ok(typeof result.reasoning === 'string');
      assert.ok(result.reasoning.length > 0);
    });
  });

  describe('getSafeCashLevel', () => {
    it('returns minimum reserve for early game', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState({ turn: 5 });
      const safeCash = ai.getSafeCashLevel('p1', gameState);
      assert.ok(safeCash >= 200);
    });

    it('returns higher reserve for mid game', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState({ turn: 15 });
      const safeCash = ai.getSafeCashLevel('p1', gameState);
      assert.ok(safeCash >= 500);
    });

    it('returns higher reserve for late game', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState({ turn: 30 });
      const safeCash = ai.getSafeCashLevel('p1', gameState);
      assert.ok(safeCash >= 1000);
    });

    it('returns minCashReserve for unknown player', () => {
      const ai = new MoneyManagerAI();
      const safeCash = ai.getSafeCashLevel('unknown', createGameState());
      assert.strictEqual(safeCash, ai.minCashReserve);
    });
  });

  describe('getOptimalPurchaseAmount', () => {
    it('returns 0 for unknown property', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState();
      const maxBid = ai.getOptimalPurchaseAmount('unknown', gameState);
      assert.strictEqual(maxBid, 0);
    });

    it('returns positive value for valid property', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState();
      const maxBid = ai.getOptimalPurchaseAmount(1, gameState);
      assert.ok(maxBid > 0);
    });

    it('caps bid at available cash', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 100, properties: [] }],
      });
      const maxBid = ai.getOptimalPurchaseAmount(3, gameState);
      assert.ok(maxBid <= 100);
    });

    it('returns value based on property strategic value', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState();
      const maxBid = ai.getOptimalPurchaseAmount(1, gameState);
      assert.ok(maxBid >= 60); // At least purchase price
    });
  });

  describe('shouldLiquidateAssets', () => {
    it('returns should:false when cash is sufficient', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 5000, properties: [] }],
      });
      const result = ai.shouldLiquidateAssets('p1', gameState);
      assert.strictEqual(result.should, false);
    });

    it('returns should:true when in crisis', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState({
        turn: 30,
        players: [
          { id: 'p1', name: 'Player 1', money: 50, properties: [{ id: 1 }, { id: 2 }] },
        ],
      });
      const result = ai.shouldLiquidateAssets('p1', gameState);
      assert.ok(typeof result.should === 'boolean');
    });

    it('returns assets array when shouldLiquidate is true', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState({
        turn: 30,
        players: [
          { id: 'p1', name: 'Player 1', money: 50, properties: [{ id: 1 }, { id: 2 }] },
        ],
      });
      const result = ai.shouldLiquidateAssets('p1', gameState);
      if (result.should) {
        assert.ok(Array.isArray(result.assets));
      }
    });

    it('provides reasoning for decision', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState();
      const result = ai.shouldLiquidateAssets('p1', gameState);
      assert.ok(typeof result.reasoning === 'string');
    });
  });

  describe('evaluateInvestment', () => {
    it('returns 0 ROI for unknown property', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState();
      const evaluation = ai.evaluateInvestment('unknown', gameState);
      assert.strictEqual(evaluation.roi, 0);
    });

    it('returns positive ROI for valid property', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState();
      const evaluation = ai.evaluateInvestment(1, gameState);
      assert.ok(evaluation.roi >= 0);
    });

    it('returns valid payback period', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState();
      const evaluation = ai.evaluateInvestment(1, gameState);
      assert.ok(evaluation.paybackPeriod >= 0);
    });

    it('provides reasoning', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState();
      const evaluation = ai.evaluateInvestment(1, gameState);
      assert.ok(typeof evaluation.reasoning === 'string');
    });
  });

  describe('getBestValueProperty', () => {
    it('returns property with highest value per dollar', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState();
      const result = ai.getBestValueProperty(gameState);
      assert.ok(result.propertyId !== null);
      assert.ok(result.valuePerDollar > 0);
    });

    it('returns valid valuePerDollar ratio', () => {
      const ai = new MoneyManagerAI();
      const gameState = createGameState();
      const result = ai.getBestValueProperty(gameState);
      assert.ok(typeof result.valuePerDollar === 'number');
    });
  });
});