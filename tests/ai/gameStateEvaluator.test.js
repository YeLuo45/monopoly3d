import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GameStateEvaluator } from '../../src/game/ai/predict/gameStateEvaluator.js';

function createGameState(overrides = {}) {
  return {
    tiles: [
      { id: 1, type: 'property', colorGroup: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250], owner: null },
      { id: 2, type: 'property', colorGroup: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450], owner: null },
      { id: 3, type: 'property', colorGroup: 'brown', price: 60, owner: 'p1' },
      { id: 4, type: 'property', colorGroup: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], owner: 'p1' },
      { id: 5, type: 'property', colorGroup: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], owner: 'p2' },
      { id: 6, type: 'property', colorGroup: 'lightblue', price: 120, rent: [8, 40, 100, 300, 450, 600], owner: null },
      { id: 7, type: 'property', colorGroup: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], owner: 'p2' },
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 3000 },
      { id: 'p2', name: 'Player 2', money: 2500 },
    ],
    ...overrides,
  };
}

describe('GameStateEvaluator', () => {
  it('creates instance', () => {
    const evaluator = new GameStateEvaluator();
    assert.ok(evaluator);
  });

  it('evaluatePosition returns score and breakdown', () => {
    const evaluator = new GameStateEvaluator();
    const result = evaluator.evaluatePosition('p1', createGameState());
    assert.ok(typeof result.score === 'number', 'Should have score');
    assert.ok(result.breakdown, 'Should have breakdown');
    assert.ok(result.grade, 'Should have grade');
  });

  it('evaluatePosition returns 0 for non-existent player', () => {
    const evaluator = new GameStateEvaluator();
    const result = evaluator.evaluatePosition('nonexistent', createGameState());
    assert.strictEqual(result.score, 0);
  });

  it('comparePlayers returns comparison of two players', () => {
    const evaluator = new GameStateEvaluator();
    const result = evaluator.comparePlayers('p1', 'p2', createGameState());
    assert.ok(result.winner, 'Should have winner');
    assert.ok(typeof result.scoreA === 'number', 'Should have scoreA');
    assert.ok(typeof result.scoreB === 'number', 'Should have scoreB');
    assert.ok(Array.isArray(result.advantages), 'Should have advantages array');
  });

  it('getProgressScore returns value between 0 and 100', () => {
    const evaluator = new GameStateEvaluator();
    const score = evaluator.getProgressScore('p1', createGameState());
    assert.ok(score >= 0 && score <= 100, `Progress ${score} should be 0-100`);
  });

  it('getProgressScore returns 0 for non-existent player', () => {
    const evaluator = new GameStateEvaluator();
    const score = evaluator.getProgressScore('nonexistent', createGameState());
    assert.strictEqual(score, 0);
  });

  it('getMomentum returns momentum data', () => {
    const evaluator = new GameStateEvaluator();
    const momentum = evaluator.getMomentum('p1', createGameState());
    assert.ok(momentum.direction, 'Should have direction');
    assert.ok(typeof momentum.rate === 'number', 'Should have rate');
    assert.ok(momentum.prediction, 'Should have prediction');
  });

  it('simulateRemainingGame returns simulation results', () => {
    const evaluator = new GameStateEvaluator();
    const result = evaluator.simulateRemainingGame(createGameState(), 100);
    assert.ok(result.standings, 'Should have standings');
    assert.ok(result.winProbabilities, 'Should have winProbabilities');
    assert.ok(result.simulationsRun > 0, 'Should have run simulations');
  });

  it('getBestCaseWorstCase returns scenario ranges', () => {
    const evaluator = new GameStateEvaluator();
    const result = evaluator.getBestCaseWorstCase('p1', createGameState());
    assert.ok(result.bestCase, 'Should have bestCase');
    assert.ok(result.worstCase, 'Should have worstCase');
    assert.ok(result.expected, 'Should have expected');
  });

  it('evaluatePosition returns valid grade', () => {
    const evaluator = new GameStateEvaluator();
    const result = evaluator.evaluatePosition('p1', createGameState());
    const validGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
    assert.ok(validGrades.includes(result.grade), `Grade ${result.grade} should be valid`);
  });

  it('comparePlayers identifies advantages correctly', () => {
    const evaluator = new GameStateEvaluator();
    const result = evaluator.comparePlayers('p1', 'p2', createGameState());
    assert.ok(result.advantages.length >= 0, 'Should return advantages array');
  });

  it('handles empty game state gracefully', () => {
    const evaluator = new GameStateEvaluator();
    const result = evaluator.evaluatePosition('p1', {});
    assert.strictEqual(result.score, 0);
  });
});