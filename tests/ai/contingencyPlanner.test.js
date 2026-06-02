import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ContingencyPlanner } from '../../src/game/ai/risk/contingencyPlanner.js';

function createGameState(overrides = {}) {
  return {
    players: [
      { id: 'p1', name: 'Player 1', money: 2000 },
      { id: 'p2', name: 'Player 2', money: 3000 },
      { id: 'p3', name: 'Player 3', money: 1500 },
    ],
    tiles: [
      { id: 1, owner: 'p1', price: 100, rent: [10, 30, 90], houses: 0, mortgagePayment: 5 },
      { id: 2, owner: 'p1', price: 120, rent: [12, 36, 108], houses: 1, mortgagePayment: 6 },
      { id: 4, owner: 'p2', price: 140, rent: [14, 42, 126], houses: 0, mortgagePayment: 7 },
    ],
    ...overrides,
  };
}

describe('ContingencyPlanner', () => {
  it('creates valid contingency plan', () => {
    const planner = new ContingencyPlanner();
    const plan = planner.createContingencyPlan('p1', createGameState());
    assert.ok(plan.valid, 'Plan should be valid');
    assert.ok(plan.phase, 'Should have phase');
    assert.ok(plan.emergencyFundTarget > 0, 'Should have emergency fund target');
  });

  it('returns invalid for unknown player', () => {
    const planner = new ContingencyPlanner();
    const plan = planner.createContingencyPlan('p99', createGameState());
    assert.strictEqual(plan.valid, false);
  });

  it('calculates emergency fund target', () => {
    const planner = new ContingencyPlanner();
    const target = planner.getEmergencyFundTarget('p1', createGameState());
    assert.ok(target > 0, 'Target should be positive');
    assert.ok(target >= 500, 'Minimum emergency fund');
  });

  it('recovery plan identifies sellable properties', () => {
    const planner = new ContingencyPlanner();
    const recovery = planner.getRecoveryPlan('p1', createGameState());
    assert.ok(recovery.valid, 'Recovery plan should be valid');
    assert.ok(recovery.strategy, 'Should have strategy');
    assert.ok(typeof recovery.sellValue === 'number', 'Should have sell value');
  });

  it('recovery plan returns impossible for no properties', () => {
    const planner = new ContingencyPlanner();
    const gs = createGameState({
      tiles: [],
      players: [{ id: 'p1', name: 'P1', money: 500 }],
    });
    const recovery = planner.getRecoveryPlan('p1', gs);
    assert.strictEqual(recovery.strategy, 'sell_all');
    assert.strictEqual(recovery.recoveryTime, 'impossible');
  });

  it('turnaround strategy returns aggressive for high cash', () => {
    const planner = new ContingencyPlanner();
    const strategy = planner.getTurnaroundStrategy('p1', createGameState({ players: [{ id: 'p1', money: 5000 }] }));
    assert.strictEqual(strategy.strategy, 'aggressive_expansion');
  });

  it('turnaround strategy returns survival for low cash', () => {
    const planner = new ContingencyPlanner();
    const strategy = planner.getTurnaroundStrategy('p1', createGameState({ players: [{ id: 'p1', money: 200 }] }));
    assert.strictEqual(strategy.strategy, 'survival_mode');
  });

  it('worst case analysis returns scenario', () => {
    const planner = new ContingencyPlanner();
    const worst = planner.worstCaseAnalysis('p1', createGameState());
    assert.ok(worst.scenario, 'Should have scenario');
    assert.ok(typeof worst.probability === 'number', 'Should have probability');
    assert.ok(worst.maxRentLoss >= 0, 'Max loss should be non-negative');
    assert.ok(worst.survivalChance, 'Should have survival chance');
  });

  it('survival probability is between 0 and 1', () => {
    const planner = new ContingencyPlanner();
    const prob = planner.getSurvivalProbability('p1', createGameState());
    assert.ok(prob >= 0 && prob <= 1, 'Probability should be 0-1');
  });

  it('survival probability is higher with more cash', () => {
    const planner = new ContingencyPlanner();
    const lowCash = planner.getSurvivalProbability('p1', createGameState({ players: [{ id: 'p1', money: 100 }] }));
    const highCash = planner.getSurvivalProbability('p1', createGameState({ players: [{ id: 'p1', money: 5000 }] }));
    assert.ok(highCash > lowCash, 'More cash = higher survival probability');
  });

  it('handles missing player gracefully', () => {
    const planner = new ContingencyPlanner();
    const prob = planner.getSurvivalProbability('p99', createGameState());
    assert.strictEqual(prob, 0);
  });

  it('handles empty gameState gracefully', () => {
    const planner = new ContingencyPlanner();
    const plan = planner.createContingencyPlan('p1', {});
    assert.strictEqual(plan.valid, false);
  });
});
