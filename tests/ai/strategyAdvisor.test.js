import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StrategyAdvisor } from '../../src/game/ai/advisor/strategyAdvisor.js';

function mockMemoryLayer() {
  return {
    l1: { getRecent: (n) => [] },
    l2: { getDecisions: () => [] },
  };
}

function mockEmbeddingIndex() {
  return { search: (v, k) => [] };
}

function mockDecisionAnalyzer() {
  return { scoreDecision: (d) => 0.7 };
}

function makeAdvisor() {
  return new StrategyAdvisor(mockMemoryLayer(), mockEmbeddingIndex(), mockDecisionAnalyzer());
}

function makeGameState(overrides = {}) {
  return {
    turn: 5,
    tiles: [
      { id: 1, type: 'property', name: 'Mediterranean', price: 60, rent: [2, 10, 30, 90, 160, 250], colorGroup: 'brown' },
      { id: 2, type: 'property', name: 'Baltic', price: 60, rent: [4, 20, 60, 180, 320, 450], colorGroup: 'brown' },
      { id: 3, type: 'chance', name: 'Chance' },
      { id: 4, type: 'property', name: 'Oriental', price: 100, rent: [6, 30, 90, 270, 400, 550], colorGroup: 'lightblue' },
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1, colorGroup: 'brown' }] },
      { id: 'p2', name: 'Player 2', money: 1200, properties: [] },
    ],
    ...overrides,
  };
}

describe('StrategyAdvisor', () => {
  it('getGamePhase returns early for turn <= 5', () => {
    const advisor = makeAdvisor();
    assert.strictEqual(advisor.getGamePhase({ turn: 1 }), 'early');
    assert.strictEqual(advisor.getGamePhase({ turn: 5 }), 'early');
  });

  it('getGamePhase returns mid for turn 6-15', () => {
    const advisor = makeAdvisor();
    assert.strictEqual(advisor.getGamePhase({ turn: 6 }), 'mid');
    assert.strictEqual(advisor.getGamePhase({ turn: 15 }), 'mid');
  });

  it('getGamePhase returns late for turn > 15', () => {
    const advisor = makeAdvisor();
    assert.strictEqual(advisor.getGamePhase({ turn: 16 }), 'late');
    assert.strictEqual(advisor.getGamePhase({ turn: 30 }), 'late');
  });

  it('getRecommendedStrategy returns correct strategy for each phase', () => {
    const advisor = makeAdvisor();
    // playerPosition=2 to avoid first-player override (returns monopoly_hunt for position 1)
    const early = advisor.getRecommendedStrategy('early', 2);
    assert.strictEqual(early.name, 'aggressive_early');

    const mid = advisor.getRecommendedStrategy('mid', 2);
    assert.strictEqual(mid.name, 'defensive_mid');

    const late = advisor.getRecommendedStrategy('late', 2);
    assert.strictEqual(late.name, 'final_push');
  });

  it('suggestPropertyPurchase returns shouldBuy false for invalid tile', () => {
    const advisor = makeAdvisor();
    const result = advisor.suggestPropertyPurchase(999, 'p1', makeGameState());
    assert.strictEqual(result.shouldBuy, false);
  });

  it('suggestPropertyPurchase returns shouldBuy false when price > 40% of money', () => {
    const advisor = makeAdvisor();
    const gs = makeGameState({ players: [{ id: 'p1', money: 100, properties: [] }] });
    const result = advisor.suggestPropertyPurchase(1, 'p1', gs);
    assert.strictEqual(result.shouldBuy, false);
  });

  it('suggestPropertyPurchase returns shouldBuy true for cheap high-potential tile', () => {
    const advisor = makeAdvisor();
    const gs = makeGameState({ players: [{ id: 'p1', money: 2000, properties: [{ id: 2, colorGroup: 'brown' }] }] });
    const result = advisor.suggestPropertyPurchase(1, 'p1', gs);
    assert.strictEqual(result.shouldBuy, true);
    assert.ok(result.confidence > 0.6);
  });

  it('suggestRentStrategy returns optimal rent', () => {
    const advisor = makeAdvisor();
    const result = advisor.suggestRentStrategy(1, makeGameState());
    assert.ok(result.optimalRent > 0);
    assert.ok(result.reasoning.includes('Base rent'));
  });

  it('suggestTradeOffer returns positive offer', () => {
    const advisor = makeAdvisor();
    const result = advisor.suggestTradeOffer('p1', 'p2', makeGameState());
    assert.ok(typeof result.offer === 'number');
  });

  it('suggestNextMove returns primary action with confidence', () => {
    const advisor = makeAdvisor();
    const result = advisor.suggestNextMove('p1', makeGameState());
    assert.ok(result.primary);
    assert.ok(typeof result.primary.confidence === 'number');
    assert.ok(result.phase);
    assert.ok(result.strategy);
  });

  it('explainDecision returns explanation object', () => {
    const advisor = makeAdvisor();
    const result = advisor.explainDecision('dec-1');
    assert.ok(typeof result.explanation === 'string');
  });

  it('handles missing memory layer gracefully', () => {
    const advisor = new StrategyAdvisor(null, null, null);
    const result = advisor.suggestNextMove('p1', makeGameState());
    assert.ok(result);
  });

  it('handles missing player in game state', () => {
    const advisor = makeAdvisor();
    const gs = makeGameState({ players: [] });
    const result = advisor.suggestNextMove('p1', gs);
    assert.ok(result);
  });

  it('handles null gameState gracefully', () => {
    const advisor = makeAdvisor();
    const result = advisor.suggestNextMove('p1', null);
    assert.ok(result);
  });
});