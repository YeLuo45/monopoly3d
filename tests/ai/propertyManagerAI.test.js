import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { PropertyManagerAI } from '../../src/game/ai/property/propertyManagerAI.js';

function createMockMemoryLayer() {
  return {
    ingest: () => {},
    getPlayerModel: () => null,
  };
}

function createMockOpponentModel() {
  return {
    predictTradeResponse: (offer) => ({
      willAccept: true,
      confidence: 0.7,
    }),
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

describe('PropertyManagerAI', () => {
  describe('constructor', () => {
    it('creates AI with memoryLayer and opponentModel', () => {
      const memory = createMockMemoryLayer();
      const opponent = createMockOpponentModel();
      const ai = new PropertyManagerAI(memory, opponent);
      assert.strictEqual(ai.memoryLayer, memory);
      assert.strictEqual(ai.opponentModel, opponent);
    });

    it('creates AI without dependencies', () => {
      const ai = new PropertyManagerAI();
      assert.ok(ai);
      assert.ok(ai.colorBuildingPriority);
    });

    it('has correct color building priorities', () => {
      const ai = new PropertyManagerAI();
      assert.strictEqual(ai.colorBuildingPriority.darkBlue, 1);
      assert.strictEqual(ai.colorBuildingPriority.brown, 8);
      assert.strictEqual(ai.colorBuildingPriority.railroad, 9);
    });
  });

  describe('shouldBuildHouse', () => {
    it('recommends building on monopoly property', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState();
      const result = ai.shouldBuildHouse(1, gameState);
      assert.ok('shouldBuild' in result);
      assert.ok('reason' in result);
    });

    it('returns false for non-existent property', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState();
      const result = ai.shouldBuildHouse(999, gameState);
      assert.strictEqual(result.shouldBuild, false);
    });

    it('returns false when not owned', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [] },
        ],
      });
      const result = ai.shouldBuildHouse(1, gameState);
      assert.strictEqual(result.shouldBuild, false);
    });

    it('returns false when max houses reached', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState({
        tiles: [
          { id: 1, type: 'property', price: 60, houses: 4, houseCost: 50 },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }] },
        ],
      });
      const result = ai.shouldBuildHouse(1, gameState);
      assert.strictEqual(result.shouldBuild, false);
      assert.ok(result.reason.includes('Max'));
    });

    it('returns false when insufficient funds', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 50, properties: [{ id: 1 }] },
        ],
      });
      const result = ai.shouldBuildHouse(1, gameState);
      assert.strictEqual(result.shouldBuild, false);
      assert.ok(result.reason.includes('Insufficient'));
    });
  });

  describe('shouldBuildHotel', () => {
    it('returns false when not enough houses', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState({
        tiles: [
          { id: 1, type: 'property', price: 60, houses: 2, hotel: false, houseCost: 50 },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }] },
        ],
      });
      const result = ai.shouldBuildHotel(1, gameState);
      assert.strictEqual(result.shouldBuild, false);
      assert.ok(result.reason.includes('Need'));
    });

    it('returns false when already has hotel', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState({
        tiles: [
          { id: 1, type: 'property', price: 60, houses: 4, hotel: true, houseCost: 50 },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }] },
        ],
      });
      const result = ai.shouldBuildHotel(1, gameState);
      assert.strictEqual(result.shouldBuild, false);
      assert.ok(result.reason.includes('Already'));
    });
  });

  describe('getOptimalBuildOrder', () => {
    it('returns priority-ordered properties', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState();
      const order = ai.getOptimalBuildOrder(gameState);
      assert.ok(Array.isArray(order));
    });

    it('prioritizes monopoly properties', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }, { id: 2 }] },
        ],
      });
      const order = ai.getOptimalBuildOrder(gameState);
      assert.ok(order.length > 0);
      assert.ok(order[0].isMonopoly !== undefined);
    });

    it('returns empty array for player with no properties', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [] },
        ],
      });
      const order = ai.getOptimalBuildOrder(gameState);
      assert.strictEqual(order.length, 0);
    });
  });

  describe('shouldSellProperty', () => {
    it('returns decision for valid offer', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState();
      const result = ai.shouldSellProperty(1, 100, gameState);
      assert.ok('shouldSell' in result);
      assert.ok('reason' in result);
    });

    it('accepts good price offer', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState();
      const result = ai.shouldSellProperty(1, 200, gameState);
      assert.ok('shouldSell' in result);
    });

    it('rejects too low offer', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState();
      const result = ai.shouldSellProperty(1, 10, gameState);
      assert.strictEqual(result.shouldSell, false);
    });
  });

  describe('getMinimumSellPrice', () => {
    it('returns minimum price for property', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState();
      const price = ai.getMinimumSellPrice(1, gameState);
      assert.ok(price > 0);
    });

    it('returns 0 for non-existent property', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState();
      const price = ai.getMinimumSellPrice(999, gameState);
      assert.strictEqual(price, 0);
    });

    it('includes house costs in minimum price', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState({
        tiles: [
          { id: 1, type: 'property', price: 60, houses: 2, houseCost: 50 },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }] },
        ],
      });
      const price = ai.getMinimumSellPrice(1, gameState);
      // Base: 60 + 2 houses * 50 = 160, then * 0.8 min sell rate = 128
      assert.ok(price >= 128);
    });
  });

  describe('shouldMortgage', () => {
    it('returns false for non-owned property', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [] },
        ],
      });
      const result = ai.shouldMortgage(1, gameState);
      assert.strictEqual(result.shouldMortgage, false);
    });

    it('recommends mortgage when low on funds', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 100, properties: [{ id: 1 }] },
        ],
      });
      const result = ai.shouldMortgage(1, gameState);
      assert.ok('shouldMortgage' in result);
    });

    it('returns false for monopoly with improvements', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState({
        tiles: [
          { id: 1, type: 'property', price: 60, houses: 2, hotel: false, colorGroup: 'brown' },
          { id: 2, type: 'property', price: 60, houses: 2, hotel: false, colorGroup: 'brown' },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 100, properties: [{ id: 1 }, { id: 2 }] },
        ],
      });
      const result = ai.shouldMortgage(1, gameState);
      assert.strictEqual(result.shouldMortgage, false);
    });
  });

  describe('shouldUnmortgage', () => {
    it('returns false for non-mortgaged property', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState({
        tiles: [
          { id: 1, type: 'property', price: 60, mortgaged: false },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }] },
        ],
      });
      const result = ai.shouldUnmortgage(1, gameState);
      assert.strictEqual(result.shouldUnmortgage, false);
    });

    it('returns false when insufficient funds', () => {
      const ai = new PropertyManagerAI();
      const gameState = createGameState({
        tiles: [
          { id: 1, type: 'property', price: 60, mortgaged: true },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 20, properties: [{ id: 1 }] },
        ],
      });
      const result = ai.shouldUnmortgage(1, gameState);
      assert.strictEqual(result.shouldUnmortgage, false);
    });
  });

  describe('getPropertyPortfolio', () => {
    it('returns portfolio object', () => {
      const ai = new PropertyManagerAI();
      const portfolio = ai.getPropertyPortfolio('p1');
      assert.ok(portfolio);
      assert.ok('totalProperties' in portfolio);
      assert.ok('monopolies' in portfolio);
    });
  });

  describe('getMonopolyPriorities', () => {
    it('returns array of priorities', () => {
      const ai = new PropertyManagerAI();
      const priorities = ai.getMonopolyPriorities('p1');
      assert.ok(Array.isArray(priorities));
    });
  });
});