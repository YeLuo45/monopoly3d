import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { PropertyValuation } from '../../src/game/ai/property/propertyValuation.js';

function createMockMemoryLayer() {
  return {
    ingest: () => {},
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
      },
      { id: 4, type: 'chance', name: 'Chance' },
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 1500, properties: [] },
      { id: 'p2', name: 'Player 2', money: 1200, properties: [] },
    ],
    ...overrides,
  };
}

describe('PropertyValuation', () => {
  describe('constructor', () => {
    it('creates valuation with memoryLayer', () => {
      const memory = createMockMemoryLayer();
      const valuation = new PropertyValuation(memory);
      assert.strictEqual(valuation.memoryLayer, memory);
    });

    it('creates valuation without dependencies', () => {
      const valuation = new PropertyValuation();
      assert.ok(valuation);
      assert.ok(valuation.colorMultipliers);
    });

    it('has correct color multipliers', () => {
      const valuation = new PropertyValuation();
      assert.strictEqual(valuation.colorMultipliers.brown, 1.0);
      assert.strictEqual(valuation.colorMultipliers.darkBlue, 1.8);
      assert.strictEqual(valuation.colorMultipliers.railroad, 1.25);
    });
  });

  describe('getFairValue', () => {
    it('returns fair value for property without improvements', () => {
      const valuation = new PropertyValuation();
      const gameState = createGameState();
      const value = valuation.getFairValue(1, gameState);
      assert.ok(value > 0);
      assert.strictEqual(typeof value, 'number');
    });

    it('returns 0 for non-existent property', () => {
      const valuation = new PropertyValuation();
      const gameState = createGameState();
      const value = valuation.getFairValue(999, gameState);
      assert.strictEqual(value, 0);
    });

    it('increases value with houses', () => {
      const valuation = new PropertyValuation();
      const gameState = createGameState({
        tiles: [
          { 
            id: 1, 
            type: 'property', 
            price: 100, 
            colorGroup: 'brown',
            rent: 10,
            rentWith1House: 30,
            houseCost: 50,
            houses: 2,
          },
        ],
      });
      const value = valuation.getFairValue(1, gameState);
      assert.ok(value > 100);
    });
  });

  describe('getStrategicValue', () => {
    it('returns strategic value for player', () => {
      const valuation = new PropertyValuation();
      const gameState = createGameState();
      const strategic = valuation.getStrategicValue(1, 'p1', gameState);
      assert.ok(strategic.total > 0);
      assert.ok(strategic.breakdown);
    });

    it('returns 0 for non-existent player', () => {
      const valuation = new PropertyValuation();
      const gameState = createGameState();
      const strategic = valuation.getStrategicValue(1, 'nonexistent', gameState);
      assert.strictEqual(strategic.total, 0);
    });

    it('includes monopoly bonus when player owns all properties', () => {
      const valuation = new PropertyValuation();
      const gameState = createGameState({
        players: [
          { 
            id: 'p1', 
            name: 'Player 1', 
            money: 1500, 
            properties: [
              { id: 1, colorGroup: 'brown' },
              { id: 2, colorGroup: 'brown' },
            ],
          },
          { id: 'p2', name: 'Player 2', money: 1200, properties: [] },
        ],
      });
      const strategic = valuation.getStrategicValue(1, 'p1', gameState);
      assert.ok(strategic.breakdown.monopolyBonus > 0);
    });
  });

  describe('getROI', () => {
    it('calculates ROI percentage', () => {
      const valuation = new PropertyValuation();
      const gameState = createGameState();
      const roi = valuation.getROI(1, gameState);
      assert.ok(roi >= 0);
      assert.strictEqual(typeof roi, 'number');
    });

    it('returns 0 for non-existent property', () => {
      const valuation = new PropertyValuation();
      const gameState = createGameState();
      const roi = valuation.getROI(999, gameState);
      assert.strictEqual(roi, 0);
    });
  });

  describe('getPaybackPeriod', () => {
    it('calculates payback period in years', () => {
      const valuation = new PropertyValuation();
      const gameState = createGameState();
      const payback = valuation.getPaybackPeriod(1, gameState);
      assert.ok(payback > 0);
      assert.strictEqual(typeof payback, 'number');
    });

    it('returns Infinity for property with no rent', () => {
      const valuation = new PropertyValuation();
      const gameState = createGameState({
        tiles: [
          { id: 1, type: 'property', price: 100, rent: 0 },
        ],
      });
      const payback = valuation.getPaybackPeriod(1, gameState);
      assert.strictEqual(payback, Infinity);
    });
  });
});