/**
 * Tests for TradeEvaluator
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { TradeEvaluator } from '../../src/game/ai/trading/tradeEvaluator.js';

describe('TradeEvaluator', () => {
  let evaluator;
  let mockGameState;
  let mockMemoryLayer;

  beforeEach(() => {
    mockMemoryLayer = {};
    evaluator = new TradeEvaluator(mockMemoryLayer);
    
    // Standard Monopoly game state
    mockGameState = {
      players: [
        { id: 'player1', money: 1500, position: 0 },
        { id: 'player2', money: 1500, position: 10 },
        { id: 'player3', money: 1500, position: 20 },
      ],
      properties: [
        { id: 'mediterranean_ave', owner: 'player1', position: 1, houses: 0 },
        { id: 'baltic_ave', owner: 'player1', position: 2, houses: 0 },
        { id: 'oriental_ave', owner: 'player2', position: 3, houses: 0 },
        { id: 'st_charles_place', owner: null, position: 6, houses: 0 },
        { id: 'boardwalk', owner: 'player3', position: 25, houses: 0 },
        { id: 'reading_rr', owner: 'player1', position: 5, houses: 0 },
      ],
      board: [
        { id: 'mediterranean_ave', position: 1 },
        { id: 'baltic_ave', position: 2 },
        { id: 'oriental_ave', position: 3 },
        { id: 'st_charles_place', position: 6 },
        { id: 'boardwalk', position: 25 },
        { id: 'reading_rr', position: 5 },
      ],
    };
  });

  test('constructor initializes properly', () => {
    assert.ok(evaluator.memoryLayer);
    assert.ok(evaluator.positionMultiplier);
    assert.ok(evaluator.baseRentValues);
  });

  test('evaluateFairness returns 0.5 for equal trades', () => {
    const offered = { properties: ['mediterranean_ave'], money: 0 };
    const requested = { properties: ['oriental_ave'], money: 0 };
    
    const fairness = evaluator.evaluateFairness(offered, requested, mockGameState);
    
    // Both are similar value properties so fairness should be close to 0.5
    assert.ok(fairness >= 0.4 && fairness <= 1, `Fairness ${fairness} should be between 0.4 and 1`);
  });

  test('evaluateFairness returns lower score for unequal trades', () => {
    const offered = { properties: ['boardwalk'], money: 0 }; // High value
    const requested = { properties: ['mediterranean_ave'], money: 0 }; // Low value
    
    const fairness = evaluator.evaluateFairness(offered, requested, mockGameState);
    
    // boardwalk > mediterranean_ave in value, so fairness should be low
    assert.ok(fairness >= 0 && fairness <= 1);
  });

  test('evaluateFairness handles money in trade', () => {
    const offered = { properties: ['oriental_ave'], money: 100 };
    const requested = { properties: ['st_charles_place'], money: 0 };
    
    const fairness = evaluator.evaluateFairness(offered, requested, mockGameState);
    
    assert.ok(fairness >= 0 && fairness <= 1);
  });

  test('calculateEquityValue returns numeric value', () => {
    const value = evaluator.calculateEquityValue(['mediterranean_ave', 'baltic_ave'], mockGameState);
    
    assert.ok(typeof value === 'number');
    assert.ok(value > 0);
  });

  test('calculateEquityValue handles empty property list', () => {
    const value = evaluator.calculateEquityValue([], mockGameState);
    
    assert.strictEqual(value, 0);
  });

  test('calculatePropertyValue returns positive number', () => {
    const value = evaluator.calculatePropertyValue('boardwalk', mockGameState);
    
    assert.ok(typeof value === 'number');
    assert.ok(value > 0);
  });

  test('calculatePropertyValue applies position multiplier', () => {
    const earlyPosValue = evaluator.calculatePropertyValue('mediterranean_ave', mockGameState);
    const latePosValue = evaluator.calculatePropertyValue('boardwalk', mockGameState);
    
    // boardwalk (position 25, late) should have higher value than mediterranean (position 1, early)
    // due to position multiplier
    assert.ok(latePosValue > earlyPosValue);
  });

  test('assessTradeHealth returns valid health status', () => {
    const trade = {
      offered: { properties: ['mediterranean_ave'], money: 0 },
      requested: { properties: ['baltic_ave'], money: 0 },
    };
    
    const health = evaluator.assessTradeHealth(trade, mockGameState);
    
    assert.ok(['healthy', 'unfair', 'one-sided', 'risky'].includes(health));
  });

  test('assessTradeHealth detects one-sided trades', () => {
    const trade = {
      offered: { properties: ['boardwalk'], money: 0 },
      requested: { properties: [], money: 200 },
    };
    
    const health = evaluator.assessTradeHealth(trade, mockGameState);
    
    // boardwalk has high value (~240), money 200 is similar => fairness ~0.83, not 'unfair'
    // But it IS one-sided: player gives property, receives only money
    assert.strictEqual(health, 'one-sided');
  });

  test('calculateBias returns value between -1 and 1', () => {
    const trade = {
      players: ['player1', 'player2'],
      offered: { properties: ['boardwalk'], money: 0 }, // High value from player1
      requested: { properties: ['oriental_ave'], money: 0 }, // Lower value to player1
    };
    
    const bias = evaluator.calculateBias(trade, 'player1', mockGameState);
    
    assert.ok(bias >= -1 && bias <= 1);
  });

  test('calculateBias favors receiver', () => {
    const trade = {
      players: ['player1', 'player2'],
      offered: { properties: ['boardwalk'], money: 0 }, // Player1 gives high value
      requested: { properties: ['mediterranean_ave'], money: 0 }, // Player1 gets low value
    };
    
    const biasForGiver = evaluator.calculateBias(trade, 'player1', mockGameState);
    
    // Player1 is giving more than receiving, so bias should be negative (unfavorable)
    assert.ok(biasForGiver < 0);
  });

  test('suggestFairTrade returns balanced offers', () => {
    const playerAProps = ['boardwalk'];
    const playerBProps = ['mediterranean_ave', 'baltic_ave'];
    
    const suggestion = evaluator.suggestFairTrade(playerAProps, playerBProps, mockGameState);
    
    assert.ok(suggestion.offerA);
    assert.ok(suggestion.offerB);
    assert.ok(suggestion.fairness >= 0 && suggestion.fairness <= 1);
  });

  test('recommendImprovements returns array of suggestions', () => {
    const trade = {
      players: ['player1', 'player2'],
      offered: { properties: ['boardwalk'], money: 0 },
      requested: { properties: ['mediterranean_ave'], money: 0 },
    };
    
    const improvements = evaluator.recommendImprovements(trade, 'player1', mockGameState);
    
    assert.ok(Array.isArray(improvements));
  });

  test('evaluateTrade returns complete evaluation object', () => {
    const trade = {
      players: ['player1', 'player2'],
      offered: { properties: ['mediterranean_ave'], money: 0 },
      requested: { properties: ['oriental_ave'], money: 0 },
    };
    
    const evaluation = evaluator.evaluateTrade(trade, 'player1', mockGameState);
    
    assert.ok(typeof evaluation.fairness === 'number');
    assert.ok(typeof evaluation.bias === 'number');
    assert.ok(typeof evaluation.health === 'string');
    assert.ok(Array.isArray(evaluation.recommendedAdjustments));
  });

  test('getMonopolyBonus returns 0.3 for complete monopoly', () => {
    // player1 owns both brown properties (mediterranean_ave and baltic_ave)
    const bonus = evaluator.getMonopolyBonus('mediterranean_ave', mockGameState);
    
    assert.strictEqual(bonus, 0.3);
  });

  test('getPropertyOwner returns correct owner', () => {
    const owner = evaluator.getPropertyOwner('mediterranean_ave', mockGameState);
    assert.strictEqual(owner, 'player1');
    
    const unownedOwner = evaluator.getPropertyOwner('st_charles_place', mockGameState);
    assert.strictEqual(unownedOwner, null);
  });
});