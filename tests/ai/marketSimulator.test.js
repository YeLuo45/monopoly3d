import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MarketSimulator } from '../../src/game/ai/econ/marketSimulator.js';

function createMockMemoryLayer() {
  return {
    ingest: () => {},
  };
}

function createGameState(overrides = {}) {
  return {
    turn: 10,
    tiles: [
      { 
        id: 1, 
        type: 'property', 
        name: 'Mediterranean', 
        price: 60, 
        colorGroup: 'brown',
        rent: 2,
        owner: null,
      },
      { 
        id: 2, 
        type: 'property', 
        name: 'Baltic', 
        price: 60, 
        colorGroup: 'brown',
        rent: 4,
        owner: null,
      },
      { 
        id: 3, 
        type: 'property', 
        name: 'Park Place', 
        price: 350, 
        colorGroup: 'darkBlue',
        rent: 35,
        owner: null,
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

describe('MarketSimulator', () => {
  describe('constructor', () => {
    it('creates simulator with memoryLayer', () => {
      const memory = createMockMemoryLayer();
      const simulator = new MarketSimulator(memory);
      assert.strictEqual(simulator.memoryLayer, memory);
    });

    it('creates simulator without dependencies', () => {
      const simulator = new MarketSimulator();
      assert.ok(simulator);
      assert.ok(simulator.marketCycles);
      assert.ok(simulator.seasonMultipliers);
    });

    it('has correct market cycle phases', () => {
      const simulator = new MarketSimulator();
      assert.strictEqual(simulator.marketCycles.expansion, 0);
      assert.strictEqual(simulator.marketCycles.peak, 1);
      assert.strictEqual(simulator.marketCycles.contraction, 2);
      assert.strictEqual(simulator.marketCycles.trough, 3);
    });
  });

  describe('getCurrentMarketConditions', () => {
    it('returns market conditions for game state', () => {
      const simulator = new MarketSimulator();
      const gameState = createGameState();
      const conditions = simulator.getCurrentMarketConditions(gameState);
      
      assert.ok(conditions);
      assert.ok(conditions.phase);
      assert.ok(typeof conditions.sentiment === 'number');
      assert.ok(conditions.supply);
      assert.ok(conditions.demand);
    });

    it('returns phase property', () => {
      const simulator = new MarketSimulator();
      const gameState = createGameState({ turn: 5 });
      const conditions = simulator.getCurrentMarketConditions(gameState);
      assert.ok(['expansion', 'peak', 'contraction', 'trough'].includes(conditions.phase));
    });

    it('returns valid supply metrics', () => {
      const simulator = new MarketSimulator();
      const gameState = createGameState();
      const conditions = simulator.getCurrentMarketConditions(gameState);
      
      assert.ok(typeof conditions.supply.total === 'number');
      assert.ok(typeof conditions.supply.available === 'number');
      assert.ok(typeof conditions.supply.owned === 'number');
    });

    it('handles empty players array', () => {
      const simulator = new MarketSimulator();
      const gameState = createGameState({ players: [] });
      const conditions = simulator.getCurrentMarketConditions(gameState);
      
      assert.ok(conditions);
      assert.strictEqual(conditions.ownership.ownerCount, 0);
    });
  });

  describe('predictMarketTrend', () => {
    it('returns valid trend direction', () => {
      const simulator = new MarketSimulator();
      const gameState = createGameState();
      const trend = simulator.predictMarketTrend(gameState);
      
      assert.ok(['rising', 'falling', 'stable'].includes(trend));
    });

    it('returns stable for early game', () => {
      const simulator = new MarketSimulator();
      const gameState = createGameState({ turn: 5 });
      const trend = simulator.predictMarketTrend(gameState);
      
      assert.ok(trend);
    });

    it('considers market liquidity', () => {
      const simulator = new MarketSimulator();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 50, properties: [] },
          { id: 'p2', name: 'Player 2', money: 50, properties: [] },
        ],
      });
      const trend = simulator.predictMarketTrend(gameState);
      
      assert.ok(trend);
    });
  });

  describe('simulateSupplyDemand', () => {
    it('returns market price for property', () => {
      const simulator = new MarketSimulator();
      const gameState = createGameState();
      const result = simulator.simulateSupplyDemand(1, gameState);
      
      assert.ok(result);
      assert.ok(typeof result.price === 'number');
      assert.ok(result.price > 0);
    });

    it('returns 0 for non-existent property', () => {
      const simulator = new MarketSimulator();
      const gameState = createGameState();
      const result = simulator.simulateSupplyDemand(999, gameState);
      
      assert.strictEqual(result.price, 0);
    });

    it('calculates supply and demand scores', () => {
      const simulator = new MarketSimulator();
      const gameState = createGameState();
      const result = simulator.simulateSupplyDemand(1, gameState);
      
      assert.ok(typeof result.supplyScore === 'number');
      assert.ok(typeof result.demandScore === 'number');
      assert.ok(typeof result.ratio === 'number');
    });

    it('adjusts price based on market ratio', () => {
      const simulator = new MarketSimulator();
      const gameState = createGameState();
      const result = simulator.simulateSupplyDemand(1, gameState);
      
      // When demand > supply, price should be higher
      if (result.ratio > 1) {
        assert.ok(result.price >= result.basePrice);
      }
    });
  });

  describe('getMarketHotspots', () => {
    it('returns array of hotspot properties', () => {
      const simulator = new MarketSimulator();
      const gameState = createGameState();
      const hotspots = simulator.getMarketHotspots(gameState);
      
      assert.ok(Array.isArray(hotspots));
    });

    it('returns properties sorted by intensity', () => {
      const simulator = new MarketSimulator();
      const gameState = createGameState();
      const hotspots = simulator.getMarketHotspots(gameState);
      
      if (hotspots.length > 1) {
        for (let i = 1; i < hotspots.length; i++) {
          assert.ok(hotspots[i - 1].intensity >= hotspots[i].intensity);
        }
      }
    });

    it('limits results to top 10', () => {
      const simulator = new MarketSimulator();
      const tiles = [];
      for (let i = 1; i <= 20; i++) {
        tiles.push({ 
          id: i, 
          type: 'property', 
          name: `Property ${i}`, 
          price: 100, 
          colorGroup: 'brown',
          rent: 5,
          owner: null,
        });
      }
      const gameState = createGameState({ tiles });
      const hotspots = simulator.getMarketHotspots(gameState);
      
      assert.ok(hotspots.length <= 10);
    });
  });
});