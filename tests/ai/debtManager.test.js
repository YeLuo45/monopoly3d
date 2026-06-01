import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DebtManager } from '../../src/game/ai/mortgage/debtManager.js';

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

describe('DebtManager', () => {
  describe('constructor', () => {
    it('creates manager with defaults', () => {
      const manager = new DebtManager();
      assert.ok(manager);
      assert.strictEqual(manager.maxLeverageRatio, 0.8);
      assert.strictEqual(manager.mortgageInterestRate, 0.1);
    });
  });

  describe('trackDebt', () => {
    it('returns zero debt for player with no mortgages', () => {
      const manager = new DebtManager();
      const result = manager.trackDebt('p1', createGameState());
      assert.strictEqual(result.totalDebt, 0);
      assert.strictEqual(result.mortgageCount, 0);
    });

    it('tracks mortgaged properties', () => {
      const manager = new DebtManager();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1, mortgaged: true }] },
        ],
      });
      const result = manager.trackDebt('p1', gameState);
      assert.strictEqual(result.totalDebt, 30); // 60 * 0.5
      assert.strictEqual(result.mortgageCount, 1);
      assert.strictEqual(result.propertiesMortgaged.length, 1);
    });

    it('returns empty for unknown player', () => {
      const manager = new DebtManager();
      const result = manager.trackDebt('unknown', createGameState());
      assert.strictEqual(result.totalDebt, 0);
    });
  });

  describe('getDebtToValueRatio', () => {
    it('returns 0 for player with no properties', () => {
      const manager = new DebtManager();
      const gameState = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 1500, properties: [] }],
      });
      const ratio = manager.getDebtToValueRatio('p1', gameState);
      assert.strictEqual(ratio, 0);
    });

    it('calculates leverage ratio', () => {
      const manager = new DebtManager();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1, mortgaged: true }] },
        ],
      });
      const ratio = manager.getDebtToValueRatio('p1', gameState);
      assert.ok(ratio >= 0 && ratio <= 1);
    });

    it('returns 0 for unknown player', () => {
      const manager = new DebtManager();
      const ratio = manager.getDebtToValueRatio('unknown', createGameState());
      assert.strictEqual(ratio, 0);
    });
  });

  describe('getOptimalRepaymentOrder', () => {
    it('returns empty array for player with no mortgages', () => {
      const manager = new DebtManager();
      const order = manager.getOptimalRepaymentOrder('p1', createGameState());
      assert.ok(Array.isArray(order));
      assert.strictEqual(order.length, 0);
    });

    it('prioritizes high-rent properties', () => {
      const manager = new DebtManager();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [
            { id: 1, mortgaged: true }, // rent 2
            { id: 3, mortgaged: true }, // rent 35
          ]},
        ],
      });
      const order = manager.getOptimalRepaymentOrder('p1', gameState);
      assert.strictEqual(order.length, 2);
      assert.strictEqual(order[0].propertyId, 3); // Park Place higher priority
    });
  });

  describe('shouldPayOffDebt', () => {
    it('returns false when cannot afford', () => {
      const manager = new DebtManager();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 100, properties: [{ id: 1, mortgaged: true }] },
        ],
        currentPlayerId: 'p1',
      });
      const result = manager.shouldPayOffDebt(1, gameState);
      assert.strictEqual(result.should, false);
    });

    it('returns true when player has excess cash and high-rent property', () => {
      const manager = new DebtManager();
      const gameState = createGameState({
        tiles: [
          { id: 1, type: 'property', name: 'Mediterranean', price: 60, colorGroup: 'brown', rent: 50 },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 1000, properties: [{ id: 1, mortgaged: true }] },
        ],
        currentPlayerId: 'p1',
      });
      const result = manager.shouldPayOffDebt(1, gameState);
      assert.strictEqual(result.should, true);
    });
  });

  describe('getCreditRating', () => {
    it('returns 1.0 for player with no debt and high cash', () => {
      const manager = new DebtManager();
      const gameState = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 5000, properties: [] }],
      });
      const rating = manager.getCreditRating('p1', gameState);
      assert.strictEqual(rating, 1.0);
    });

    it('reduces rating for high debt', () => {
      const manager = new DebtManager();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 500, properties: [{ id: 1, mortgaged: true }] },
        ],
      });
      const rating = manager.getCreditRating('p1', gameState);
      assert.ok(rating < 1.0);
    });

    it('returns 0 for unknown player', () => {
      const manager = new DebtManager();
      const rating = manager.getCreditRating('unknown', createGameState());
      assert.strictEqual(rating, 0);
    });
  });

  describe('getMaxBorrowingCapacity', () => {
    it('calculates available capacity', () => {
      const manager = new DebtManager();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }] },
        ],
      });
      const result = manager.getMaxBorrowingCapacity('p1', gameState);
      assert.ok(result.maxBorrowing > 0);
      assert.ok(result.availableCapacity >= 0);
      assert.strictEqual(typeof result.reason, 'string');
    });

    it('returns zeros for unknown player', () => {
      const manager = new DebtManager();
      const result = manager.getMaxBorrowingCapacity('unknown', createGameState());
      assert.strictEqual(result.maxBorrowing, 0);
      assert.strictEqual(result.availableCapacity, 0);
    });
  });
});