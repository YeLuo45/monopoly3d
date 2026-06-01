import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { RentOptimizer } from '../../src/game/ai/property/rentOptimizer.js';

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
      },
      { id: 3, type: 'chance', name: 'Chance' },
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }] },
      { id: 'p2', name: 'Player 2', money: 1200, properties: [] },
    ],
    ...overrides,
  };
}

describe('RentOptimizer', () => {
  describe('constructor', () => {
    it('creates optimizer with default settings', () => {
      const optimizer = new RentOptimizer();
      assert.ok(optimizer);
      assert.strictEqual(optimizer.maxHouses, 4);
      assert.strictEqual(optimizer.minHouseROI, 0.15);
      assert.strictEqual(optimizer.minHotelROI, 0.20);
    });
  });

  describe('calculateOptimalRent', () => {
    it('calculates optimal rent for property', () => {
      const optimizer = new RentOptimizer();
      const gameState = createGameState();
      const rent = optimizer.calculateOptimalRent(1, gameState);
      assert.ok(rent.baseRent > 0);
      assert.ok(rent.optimalRent > 0);
    });

    it('returns zeros for non-owned property', () => {
      const optimizer = new RentOptimizer();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [] },
        ],
      });
      const rent = optimizer.calculateOptimalRent(1, gameState);
      assert.strictEqual(rent.baseRent, 0);
    });

    it('increases rent with more houses', () => {
      const optimizer = new RentOptimizer();
      const gameState = createGameState({
        tiles: [
          { 
            id: 1, 
            type: 'property', 
            price: 60, 
            colorGroup: 'brown',
            rent: 2,
            rentWith1House: 10,
            rentWith2House: 30,
            houseCost: 50,
            houses: 2,
          },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }] },
        ],
      });
      const rent = optimizer.calculateOptimalRent(1, gameState);
      assert.strictEqual(rent.houses, 2);
      assert.ok(rent.baseRent >= 30);
    });
  });

  describe('getHouseThreshold', () => {
    it('recommends building when conditions are good', () => {
      const optimizer = new RentOptimizer();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }, { id: 2 }] },
        ],
      });
      const threshold = optimizer.getHouseThreshold(1, gameState);
      assert.ok('shouldBuild' in threshold);
      assert.ok('reason' in threshold);
    });

    it('returns false when max houses reached', () => {
      const optimizer = new RentOptimizer();
      const gameState = createGameState({
        tiles: [
          { id: 1, type: 'property', price: 60, houses: 4, houseCost: 50 },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }] },
        ],
      });
      const threshold = optimizer.getHouseThreshold(1, gameState);
      assert.strictEqual(threshold.shouldBuild, false);
      assert.ok(threshold.reason.includes('Max'));
    });

    it('returns false when insufficient funds', () => {
      const optimizer = new RentOptimizer();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 100, properties: [{ id: 1 }] },
        ],
      });
      const threshold = optimizer.getHouseThreshold(1, gameState);
      assert.strictEqual(threshold.shouldBuild, false);
      assert.ok(threshold.reason.includes('Insufficient'));
    });
  });

  describe('getHotelThreshold', () => {
    it('returns false when not enough houses', () => {
      const optimizer = new RentOptimizer();
      const gameState = createGameState({
        tiles: [
          { id: 1, type: 'property', price: 60, houses: 2, houseCost: 50 },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }] },
        ],
      });
      const threshold = optimizer.getHotelThreshold(1, gameState);
      assert.strictEqual(threshold.shouldBuild, false);
      assert.ok(threshold.reason.includes('Need'));
    });

    it('returns false when already has hotel', () => {
      const optimizer = new RentOptimizer();
      const gameState = createGameState({
        tiles: [
          { id: 1, type: 'property', price: 60, houses: 4, hotel: true, houseCost: 50 },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }] },
        ],
      });
      const threshold = optimizer.getHotelThreshold(1, gameState);
      assert.strictEqual(threshold.shouldBuild, false);
      assert.ok(threshold.reason.includes('hotel'));
    });
  });

  describe('analyzeRentEnhancement', () => {
    it('returns ROI analysis for property', () => {
      const optimizer = new RentOptimizer();
      const gameState = createGameState();
      const analysis = optimizer.analyzeRentEnhancement(1, gameState);
      assert.ok(analysis);
      assert.ok('current' in analysis);
      assert.ok('house' in analysis);
      assert.ok('hotel' in analysis);
    });

    it('returns null for non-owned property', () => {
      const optimizer = new RentOptimizer();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [] },
        ],
      });
      const analysis = optimizer.analyzeRentEnhancement(1, gameState);
      assert.strictEqual(analysis, null);
    });

    it('calculates house and hotel ROI', () => {
      const optimizer = new RentOptimizer();
      const gameState = createGameState({
        tiles: [
          { 
            id: 1, 
            type: 'property', 
            price: 100, 
            rent: 10,
            rentWith1House: 30,
            rentWith2House: 90,
            rentWith3House: 160,
            rentWith4House: 250,
            hotelRent: 350,
            houseCost: 50,
            houses: 0,
          },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }] },
        ],
      });
      const analysis = optimizer.analyzeRentEnhancement(1, gameState);
      assert.ok(analysis.house.roi >= 0);
      assert.ok(analysis.hotel.roi >= 0);
    });
  });
});