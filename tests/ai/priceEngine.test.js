import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { PriceEngine } from '../../src/game/ai/econ/priceEngine.js';

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
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 1500, properties: [] },
      { id: 'p2', name: 'Player 2', money: 1200, properties: [] },
    ],
    ...overrides,
  };
}

describe('PriceEngine', () => {
  describe('constructor', () => {
    it('creates price engine instance', () => {
      const engine = new PriceEngine();
      assert.ok(engine);
      assert.ok(engine.priceHistory instanceof Map);
      assert.strictEqual(engine.priceHistory.size, 0);
    });

    it('has correct phase adjustments', () => {
      const engine = new PriceEngine();
      assert.strictEqual(engine.phaseAdjustments.early, 0.9);
      assert.strictEqual(engine.phaseAdjustments.mid, 1.0);
      assert.strictEqual(engine.phaseAdjustments.late, 1.15);
      assert.strictEqual(engine.phaseAdjustments.end, 1.25);
    });

    it('has correct season adjustments', () => {
      const engine = new PriceEngine();
      assert.strictEqual(engine.seasonAdjustments.q1, 0.95);
      assert.strictEqual(engine.seasonAdjustments.q2, 1.0);
      assert.strictEqual(engine.seasonAdjustments.q3, 1.05);
      assert.strictEqual(engine.seasonAdjustments.q4, 1.1);
      assert.strictEqual(engine.seasonAdjustments.wrap, 1.15);
    });
  });

  describe('getDynamicPrice', () => {
    it('returns dynamic price for property', () => {
      const engine = new PriceEngine();
      const gameState = createGameState();
      const result = engine.getDynamicPrice(1, gameState);
      
      assert.ok(result);
      assert.ok(typeof result.basePrice === 'number');
      assert.ok(typeof result.adjustedPrice === 'number');
      assert.ok(result.adjustedPrice > 0);
    });

    it('returns 0 for non-existent property', () => {
      const engine = new PriceEngine();
      const gameState = createGameState();
      const result = engine.getDynamicPrice(999, gameState);
      
      assert.strictEqual(result.price, 0);
      assert.strictEqual(result.adjustedPrice, 0);
    });

    it('includes breakdown of adjustments', () => {
      const engine = new PriceEngine();
      const gameState = createGameState();
      const result = engine.getDynamicPrice(1, gameState);
      
      assert.ok(result.breakdown);
      assert.ok(result.breakdown.base);
      assert.ok(result.breakdown.phase);
      assert.ok(result.breakdown.season);
      assert.ok(result.breakdown.market);
      assert.ok(result.breakdown.demand);
      assert.ok(result.breakdown.scarcity);
    });

    it('adjusts price based on game phase', () => {
      const engine = new PriceEngine();
      const earlyGame = createGameState({ turn: 5 });
      const lateGame = createGameState({ turn: 45 });
      
      const earlyPrice = engine.getDynamicPrice(1, earlyGame);
      const latePrice = engine.getDynamicPrice(1, lateGame);
      
      // Late game prices should be higher
      assert.ok(latePrice.adjustedPrice >= earlyPrice.adjustedPrice);
    });

    it('returns confidence score', () => {
      const engine = new PriceEngine();
      const gameState = createGameState();
      const result = engine.getDynamicPrice(1, gameState);
      
      assert.ok(typeof result.confidence === 'number');
      assert.ok(result.confidence >= 0.5 && result.confidence <= 1);
    });
  });

  describe('getPriceTrend', () => {
    it('returns price trend analysis', () => {
      const engine = new PriceEngine();
      const gameState = createGameState();
      const trend = engine.getPriceTrend(1, gameState);
      
      assert.ok(trend);
      assert.ok(trend.direction);
      assert.ok(typeof trend.momentum === 'number');
    });

    it('returns stable for insufficient history', () => {
      const engine = new PriceEngine();
      const gameState = createGameState();
      const trend = engine.getPriceTrend(1, gameState);
      
      assert.strictEqual(trend.direction, 'stable');
      assert.strictEqual(trend.momentum, 0);
    });

    it('calculates momentum from history', () => {
      const engine = new PriceEngine();
      const gameState = createGameState({ turn: 1 });
      
      // Record some prices
      for (let i = 0; i < 5; i++) {
        engine.getDynamicPrice(1, { ...gameState, turn: i + 1 });
      }
      
      const trend = engine.getPriceTrend(1, gameState);
      assert.ok(typeof trend.momentum === 'number');
    });

    it('includes projection', () => {
      const engine = new PriceEngine();
      const gameState = createGameState();
      const trend = engine.getPriceTrend(1, gameState);
      
      assert.ok(typeof trend.projection === 'number');
    });
  });

  describe('adjustForMarketConditions', () => {
    it('adjusts base price for market conditions', () => {
      const engine = new PriceEngine();
      const gameState = createGameState();
      const result = engine.adjustForMarketConditions(100, gameState);
      
      assert.ok(result);
      assert.strictEqual(result.basePrice, 100);
      assert.ok(typeof result.adjustedPrice === 'number');
    });

    it('returns market phase and trend', () => {
      const engine = new PriceEngine();
      const gameState = createGameState();
      const result = engine.adjustForMarketConditions(100, gameState);
      
      assert.ok(result.marketPhase);
      assert.ok(result.marketTrend);
    });

    it('returns multipliers', () => {
      const engine = new PriceEngine();
      const gameState = createGameState();
      const result = engine.adjustForMarketConditions(100, gameState);
      
      assert.ok(typeof result.marketMultiplier === 'number');
      assert.ok(typeof result.trendMultiplier === 'number');
    });
  });

  describe('getSeasonalAdjustment', () => {
    it('returns seasonal adjustment details', () => {
      const engine = new PriceEngine();
      const gameState = createGameState();
      const result = engine.getSeasonalAdjustment(1, gameState);
      
      assert.ok(result);
      assert.ok(typeof result.adjustment === 'number');
      assert.ok(result.season);
      assert.ok(result.explanation);
    });

    it('returns adjustments for different seasons', () => {
      const engine = new PriceEngine();
      
      const q1Game = createGameState({ turn: 6 });
      const q3Game = createGameState({ turn: 30 });
      
      const q1Result = engine.getSeasonalAdjustment(1, q1Game);
      const q3Result = engine.getSeasonalAdjustment(1, q3Game);
      
      assert.ok(q1Result.adjustment !== q3Result.adjustment);
    });

    it('returns 1.0 for non-existent property', () => {
      const engine = new PriceEngine();
      const gameState = createGameState();
      const result = engine.getSeasonalAdjustment(999, gameState);
      
      assert.strictEqual(result.adjustment, 1.0);
      assert.strictEqual(result.season, 'unknown');
    });

    it('varies by color group', () => {
      const engine = new PriceEngine();
      const gameState = createGameState();
      
      const brownResult = engine.getSeasonalAdjustment(1, gameState);
      const darkBlueResult = engine.getSeasonalAdjustment(3, gameState);
      
      // Different color groups may have different seasonal patterns
      assert.ok(brownResult.colorGroup !== darkBlueResult.colorGroup);
    });
  });
});