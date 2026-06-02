import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EconomicIndicator } from '../../src/game/ai/econ/economicIndicator.js';

function createGameState(overrides = {}) {
  return {
    turn: 10,
    tiles: [
      { id: 1, type: 'property', name: 'Mediterranean', price: 60, colorGroup: 'brown', rent: 2 },
      { id: 2, type: 'property', name: 'Baltic', price: 60, colorGroup: 'brown', rent: 4 },
      { id: 3, type: 'property', name: 'Park Place', price: 350, colorGroup: 'darkBlue', rent: 35 },
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1, price: 60, rent: 2 }] },
      { id: 'p2', name: 'Player 2', money: 1200, properties: [{ id: 2, price: 60, rent: 4 }] },
    ],
    ...overrides,
  };
}

describe('EconomicIndicator', () => {
  describe('constructor', () => {
    it('creates indicator instance', () => {
      const indicator = new EconomicIndicator();
      assert.ok(indicator);
      assert.ok(Array.isArray(indicator.history));
      assert.strictEqual(indicator.history.length, 0);
    });

    it('has correct thresholds', () => {
      const indicator = new EconomicIndicator();
      assert.strictEqual(indicator.recessionThreshold, 0.3);
      assert.strictEqual(indicator.inflationThreshold, 0.15);
      assert.strictEqual(indicator.bearMarketThreshold, 0.2);
    });
  });

  describe('calculateGDPGrowth', () => {
    it('calculates GDP growth rate', () => {
      const indicator = new EconomicIndicator();
      const gameState = createGameState();
      const growth = indicator.calculateGDPGrowth(gameState);
      
      assert.strictEqual(typeof growth, 'number');
    });

    it('returns default growth for first calculation', () => {
      const indicator = new EconomicIndicator();
      const gameState = createGameState({ turn: 1 });
      const growth = indicator.calculateGDPGrowth(gameState);
      
      assert.strictEqual(typeof growth, 'number');
    });

    it('handles empty players', () => {
      const indicator = new EconomicIndicator();
      const gameState = createGameState({ players: [] });
      const growth = indicator.calculateGDPGrowth(gameState);
      
      assert.strictEqual(growth, 0);
    });
  });

  describe('getInflationPressure', () => {
    it('returns inflation pressure as 0-1 value', () => {
      const indicator = new EconomicIndicator();
      const gameState = createGameState();
      const pressure = indicator.getInflationPressure(gameState);
      
      assert.ok(pressure >= 0 && pressure <= 1);
    });

    it('handles empty players', () => {
      const indicator = new EconomicIndicator();
      const gameState = createGameState({ players: [] });
      const pressure = indicator.getInflationPressure(gameState);
      
      assert.strictEqual(pressure, 0);
    });

    it('increases with game progression', () => {
      const indicator = new EconomicIndicator();
      const earlyGame = createGameState({ turn: 5 });
      const lateGame = createGameState({ turn: 30 });
      
      const earlyPressure = indicator.getInflationPressure(earlyGame);
      const latePressure = indicator.getInflationPressure(lateGame);
      
      assert.ok(latePressure >= earlyPressure);
    });
  });

  describe('getEmploymentRate', () => {
    it('returns employment rate as 0-1 value', () => {
      const indicator = new EconomicIndicator();
      const gameState = createGameState();
      const rate = indicator.getEmploymentRate(gameState);
      
      assert.ok(rate >= 0 && rate <= 1);
    });

    it('handles empty players', () => {
      const indicator = new EconomicIndicator();
      const gameState = createGameState({ players: [] });
      const rate = indicator.getEmploymentRate(gameState);
      
      assert.strictEqual(rate, 0);
    });
  });

  describe('predictRecession', () => {
    it('returns recession risk analysis', () => {
      const indicator = new EconomicIndicator();
      const gameState = createGameState();
      const risk = indicator.predictRecession(0.3, gameState);
      
      assert.ok(risk);
      assert.ok(typeof risk.probability === 'number');
      assert.ok(risk.severity);
      assert.ok(risk.gdpFactor !== undefined);
      assert.ok(risk.inflationFactor !== undefined);
    });

    it('adjusts risk based on GDP', () => {
      const indicator = new EconomicIndicator();
      const gameStateNegative = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 100, properties: [] },
          { id: 'p2', name: 'Player 2', money: 100, properties: [] },
        ],
      });
      const risk = indicator.predictRecession(0.2, gameStateNegative);
      
      assert.ok(risk.probability >= 0.2);
    });

    it('returns valid severity levels', () => {
      const indicator = new EconomicIndicator();
      const gameState = createGameState();
      const risk = indicator.predictRecession(0.5, gameState);
      
      assert.ok(['none', 'mild', 'moderate', 'severe'].includes(risk.severity));
    });
  });

  describe('getEconomicForecast', () => {
    it('returns economic forecast for horizon', () => {
      const indicator = new EconomicIndicator();
      const gameState = createGameState();
      const forecast = indicator.getEconomicForecast(5, gameState);
      
      assert.ok(forecast);
      assert.strictEqual(forecast.horizon, 5);
      assert.ok(forecast.outlook);
      assert.ok(typeof forecast.healthScore === 'number');
    });

    it('includes projections', () => {
      const indicator = new EconomicIndicator();
      const gameState = createGameState();
      const forecast = indicator.getEconomicForecast(10, gameState);
      
      assert.ok(forecast.projections);
      assert.ok(typeof forecast.projections.gdpGrowth === 'number');
      assert.ok(typeof forecast.projections.inflation === 'number');
      assert.ok(typeof forecast.projections.employment === 'number');
    });

    it('returns risks and opportunities', () => {
      const indicator = new EconomicIndicator();
      const gameState = createGameState();
      const forecast = indicator.getEconomicForecast(5, gameState);
      
      assert.ok(Array.isArray(forecast.risks));
      assert.ok(Array.isArray(forecast.opportunities));
    });

    it('returns valid outlook values', () => {
      const indicator = new EconomicIndicator();
      const gameState = createGameState();
      const forecast = indicator.getEconomicForecast(5, gameState);
      
      assert.ok(['bullish', 'stable', 'bearish'].includes(forecast.outlook));
    });
  });
});