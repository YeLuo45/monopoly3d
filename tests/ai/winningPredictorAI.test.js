import { describe, it } from 'node:test';
import assert from 'node:assert';
import { WinningPredictorAI } from '../../src/game/ai/predict/winningPredictorAI.js';

function createGameState(overrides = {}) {
  return {
    tiles: [
      { id: 1, type: 'property', colorGroup: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250], owner: null, baseRent: 2 },
      { id: 2, type: 'property', colorGroup: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450], owner: null, baseRent: 4 },
      { id: 3, type: 'property', colorGroup: 'brown', price: 60, owner: null },
      { id: 4, type: 'property', colorGroup: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], owner: 'p1', baseRent: 6 },
      { id: 5, type: 'property', colorGroup: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], owner: 'p1', baseRent: 6 },
      { id: 6, type: 'property', colorGroup: 'lightblue', price: 120, rent: [8, 40, 100, 300, 450, 600], owner: 'p2', baseRent: 8 },
      { id: 7, type: 'property', colorGroup: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], owner: 'p1', baseRent: 10 },
      { id: 8, type: 'property', colorGroup: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], owner: 'p2', baseRent: 10 },
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 3000 },
      { id: 'p2', name: 'Player 2', money: 2500 },
      { id: 'p3', name: 'Player 3', money: 2000 },
    ],
    ...overrides,
  };
}

describe('WinningPredictorAI', () => {
  it('creates instance with memoryLayer and opponentModel', () => {
    const predictor = new WinningPredictorAI({}, {});
    assert.ok(predictor);
    assert.ok(predictor.memory);
    assert.ok(predictor.opponentModel);
  });

  it('predictWinner returns winner and confidence', () => {
    const predictor = new WinningPredictorAI(null, null);
    const result = predictor.predictWinner(createGameState());
    assert.ok(result.winner, 'Should have a winner');
    assert.ok(typeof result.confidence === 'number', 'Should have confidence');
    assert.ok(result.winProbs, 'Should have win probabilities');
  });

  it('predictWinner returns null for empty game', () => {
    const predictor = new WinningPredictorAI(null, null);
    const result = predictor.predictWinner({ players: [] });
    assert.strictEqual(result.winner, null);
    assert.strictEqual(result.confidence, 0);
  });

  it('predictFinalStandings returns all player ranks', () => {
    const predictor = new WinningPredictorAI(null, null);
    const standings = predictor.predictFinalStandings(createGameState());
    assert.strictEqual(standings.length, 3);
    standings.forEach(s => {
      assert.ok(s.playerId, 'Should have playerId');
      assert.ok(s.rank, 'Should have rank');
      assert.ok(typeof s.probability === 'number', 'Should have probability');
    });
  });

  it('getWinProbability returns value between 0 and 1', () => {
    const predictor = new WinningPredictorAI(null, null);
    const prob = predictor.getWinProbability('p1', createGameState());
    assert.ok(prob >= 0 && prob <= 1, `Probability ${prob} should be between 0 and 1`);
  });

  it('getWinProbability returns 0 for non-existent player', () => {
    const predictor = new WinningPredictorAI(null, null);
    const prob = predictor.getWinProbability('nonexistent', createGameState());
    assert.strictEqual(prob, 0);
  });

  it('getLeadingPlayer returns player with highest score', () => {
    const predictor = new WinningPredictorAI(null, null);
    const leading = predictor.getLeadingPlayer(createGameState());
    assert.ok(leading);
    assert.ok(leading.playerId, 'Should have playerId');
    assert.ok(typeof leading.score === 'number', 'Should have score');
  });

  it('getKeyWinningFactors returns array of factors', () => {
    const predictor = new WinningPredictorAI(null, null);
    const factors = predictor.getKeyWinningFactors('p1', createGameState());
    assert.ok(Array.isArray(factors));
    assert.ok(factors.length > 0, 'Should have at least one factor');
    factors.forEach(f => {
      assert.ok(f.factor, 'Should have factor name');
      assert.ok(typeof f.importance === 'number', 'Should have importance');
    });
  });

  it('getKeyWinningFactors returns empty for non-existent player', () => {
    const predictor = new WinningPredictorAI(null, null);
    const factors = predictor.getKeyWinningFactors('nonexistent', createGameState());
    assert.strictEqual(factors.length, 0);
  });

  it('getRiskFactors returns array of risks', () => {
    const predictor = new WinningPredictorAI(null, null);
    const risks = predictor.getRiskFactors('p1', createGameState());
    assert.ok(Array.isArray(risks));
  });

  it('getRiskFactors identifies low cash risk', () => {
    const predictor = new WinningPredictorAI(null, null);
    const gs = createGameState({
      players: [
        { id: 'p1', name: 'Player 1', money: 100 },
        { id: 'p2', name: 'Player 2', money: 3000 },
      ],
    });
    const risks = predictor.getRiskFactors('p1', gs);
    const lowCashRisk = risks.find(r => r.risk === 'low_cash');
    assert.ok(lowCashRisk, 'Should identify low cash risk');
  });

  it('predictFinalStandings sorts by rank', () => {
    const predictor = new WinningPredictorAI(null, null);
    const standings = predictor.predictFinalStandings(createGameState());
    for (let i = 1; i < standings.length; i++) {
      assert.ok(standings[i].rank === i + 1, 'Should be sorted by rank');
    }
  });
});