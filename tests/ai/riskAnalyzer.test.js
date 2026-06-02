import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RiskAnalyzer } from '../../src/game/ai/risk/riskAnalyzer.js';

function createGameState(overrides = {}) {
  return {
    tiles: [
      { id: 1, type: 'property', colorGroup: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250], owner: null, baseRent: 2 },
      { id: 2, type: 'property', colorGroup: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450], owner: null, baseRent: 4 },
      { id: 4, type: 'property', colorGroup: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], owner: 'p1', baseRent: 6 },
      { id: 5, type: 'property', colorGroup: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], owner: 'p2', baseRent: 6 },
      { id: 6, type: 'property', colorGroup: 'lightblue', price: 120, rent: [8, 40, 100, 300, 450, 600], owner: null, baseRent: 8 },
      { id: 7, type: 'property', colorGroup: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], owner: 'p1', baseRent: 10 },
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 3000 },
      { id: 'p2', name: 'Player 2', money: 2500 },
    ],
    ...overrides,
  };
}

describe('RiskAnalyzer', () => {
  it('identifies rent exposure risk', () => {
    const analyzer = new RiskAnalyzer(null, null);
    const risks = analyzer.identifyRisks('p1', createGameState());
    const rentRisks = risks.filter(r => r.type === 'rent_exposure');
    assert.ok(rentRisks.length > 0, 'Should identify rent exposure');
  });

  it('returns empty risks for player with no properties', () => {
    const analyzer = new RiskAnalyzer(null, null);
    const gs = createGameState({
      players: [{ id: 'p3', name: 'Player 3', money: 2000 }],
    });
    const risks = analyzer.identifyRisks('p3', gs);
    assert.strictEqual(risks.length, 0);
  });

  it('identifies monopoly race risk', () => {
    const analyzer = new RiskAnalyzer(null, null);
    const risks = analyzer.identifyRisks('p1', createGameState());
    const monoRisks = risks.filter(r => r.type === 'monopoly_race');
    assert.ok(monoRisks.length > 0, 'Should identify monopoly race risk');
  });

  it('getMostDangerousOpponents returns sorted list', () => {
    const analyzer = new RiskAnalyzer(null, null);
    const dangers = analyzer.getMostDangerousOpponents('p1', createGameState());
    assert.ok(dangers.length > 0, 'Should return at least one opponent');
    if (dangers.length > 1) {
      assert.ok(dangers[0].score >= dangers[1].score, 'Should be sorted by score');
    }
  });

  it('getMostDangerousOpponents returns empty for no opponents', () => {
    const analyzer = new RiskAnalyzer(null, null);
    const gs = createGameState({ players: [{ id: 'p1', name: 'P1', money: 1000 }] });
    const dangers = analyzer.getMostDangerousOpponents('p1', gs);
    assert.strictEqual(dangers.length, 0);
  });

  it('getRiskMitigationPlan returns plan with actions', () => {
    const analyzer = new RiskAnalyzer(null, null);
    const plan = analyzer.getRiskMitigationPlan('p1', createGameState());
    assert.ok(plan.actions, 'Should have actions array');
    assert.ok(Array.isArray(plan.actions), 'Actions should be array');
  });

  it('shouldTradeForRiskReduction returns decision', () => {
    const analyzer = new RiskAnalyzer(null, null);
    const decision = analyzer.shouldTradeForRiskReduction(4, createGameState());
    assert.ok(typeof decision.should === 'boolean', 'Should have boolean decision');
    assert.ok(decision.reason, 'Should have reason');
  });

  it('getLandingProbability returns value between 0 and 1', () => {
    const analyzer = new RiskAnalyzer(null, null);
    const prob = analyzer.getLandingProbability(1, createGameState());
    assert.ok(prob >= 0 && prob <= 1, 'Probability should be 0-1');
  });

  it('getExpectedLoss returns 0 for own property', () => {
    const analyzer = new RiskAnalyzer(null, null);
    const loss = analyzer.getExpectedLoss('p1', 4, createGameState());
    assert.strictEqual(loss, 0, 'No loss for own property');
  });

  it('getExpectedLoss returns positive for opponent property', () => {
    const analyzer = new RiskAnalyzer(null, null);
    const loss = analyzer.getExpectedLoss('p1', 5, createGameState());
    assert.ok(loss > 0, 'Should have expected loss');
  });

  it('returns default values for empty gameState', () => {
    const analyzer = new RiskAnalyzer(null, null);
    const risks = analyzer.identifyRisks('p1', {});
    const prob = analyzer.getLandingProbability(1, {});
    assert.strictEqual(risks.length, 0);
    assert.strictEqual(prob, 0.05); // default board size 40
  });

  it('handles missing opponentModel gracefully', () => {
    const analyzer = new RiskAnalyzer(null, null);
    const plan = analyzer.getRiskMitigationPlan('p1', createGameState());
    assert.ok(plan, 'Should return plan');
  });
});
