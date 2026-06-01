import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { AdaptiveDifficulty, DIFFICULTY_LEVELS } from '../../src/game/ai/coach/adaptiveDifficulty.js';

function createMockMemoryLayer() {
  return {
    ingest: () => {},
  };
}

function createAdaptiveDifficulty() {
  return new AdaptiveDifficulty(createMockMemoryLayer());
}

function createGameResult(overrides = {}) {
  return {
    won: false,
    moneyRank: 3,
    survivalTurns: 20,
    ...overrides,
  };
}

describe('AdaptiveDifficulty', () => {
  describe('constructor', () => {
    it('creates instance with memoryLayer', () => {
      const memory = createMockMemoryLayer();
      const ad = new AdaptiveDifficulty(memory);
      assert.strictEqual(ad.memoryLayer, memory);
    });

    it('creates instance without dependencies', () => {
      const ad = new AdaptiveDifficulty();
      assert.ok(ad);
      assert.deepStrictEqual(ad.playerDifficulty, {});
    });
  });

  describe('getDifficultyLevel', () => {
    it('returns MEDIUM as default for new player', () => {
      const ad = createAdaptiveDifficulty();
      const level = ad.getDifficultyLevel('player1');
      assert.strictEqual(level, DIFFICULTY_LEVELS.MEDIUM);
    });

    it('returns set difficulty level', () => {
      const ad = createAdaptiveDifficulty();
      ad.setDifficultyLevel('player1', DIFFICULTY_LEVELS.HARD);
      const level = ad.getDifficultyLevel('player1');
      assert.strictEqual(level, DIFFICULTY_LEVELS.HARD);
    });
  });

  describe('setDifficultyLevel', () => {
    it('sets valid difficulty level', () => {
      const ad = createAdaptiveDifficulty();
      ad.setDifficultyLevel('player1', DIFFICULTY_LEVELS.EASY);
      assert.strictEqual(ad.getDifficultyLevel('player1'), DIFFICULTY_LEVELS.EASY);
    });

    it('throws error for invalid level', () => {
      const ad = createAdaptiveDifficulty();
      assert.throws(() => {
        ad.setDifficultyLevel('player1', 'invalid');
      }, /Invalid difficulty level/);
    });

    it('records adjustment', () => {
      const ad = createAdaptiveDifficulty();
      ad.setDifficultyLevel('player1', DIFFICULTY_LEVELS.EXPERT);
      const state = ad.playerDifficulty['player1'];
      assert.ok(state.lastAdjustment);
      assert.strictEqual(state.lastAdjustment.type, 'manual');
    });
  });

  describe('trackGameResult', () => {
    it('tracks win result', () => {
      const ad = createAdaptiveDifficulty();
      const score = ad.trackGameResult('player1', createGameResult({ won: true }));
      assert.ok(typeof score === 'number');
    });

    it('tracks loss result', () => {
      const ad = createAdaptiveDifficulty();
      const score = ad.trackGameResult('player1', createGameResult({ won: false }));
      assert.ok(typeof score === 'number');
    });

    it('calculates higher score for winning', () => {
      const ad = createAdaptiveDifficulty();
      const winScore = ad.trackGameResult('player1', createGameResult({ won: true, survivalTurns: 30 }));
      const loseScore = ad.trackGameResult('player2', createGameResult({ won: false, survivalTurns: 10 }));
      assert.ok(winScore > loseScore);
    });

    it('accumulates game results', () => {
      const ad = createAdaptiveDifficulty();
      ad.trackGameResult('player1', createGameResult());
      ad.trackGameResult('player1', createGameResult({ won: true }));
      assert.strictEqual(ad.gameResults['player1'].length, 2);
    });
  });

  describe('getPerformanceScore', () => {
    it('returns 50 for new player', () => {
      const ad = createAdaptiveDifficulty();
      const score = ad.getPerformanceScore('player1');
      assert.strictEqual(score, 50);
    });

    it('returns calculated score for existing player', () => {
      const ad = createAdaptiveDifficulty();
      ad.trackGameResult('player1', createGameResult({ won: true, survivalTurns: 30 }));
      const score = ad.getPerformanceScore('player1');
      assert.ok(score > 50);
    });
  });

  describe('shouldIncreaseDifficulty', () => {
    it('returns false for new player', () => {
      const ad = createAdaptiveDifficulty();
      const should = ad.shouldIncreaseDifficulty('player1');
      assert.strictEqual(should, false);
    });

    it('returns false when at expert level', () => {
      const ad = createAdaptiveDifficulty();
      ad.setDifficultyLevel('player1', DIFFICULTY_LEVELS.EXPERT);
      // Add good results
      for (let i = 0; i < 3; i++) {
        ad.trackGameResult('player1', createGameResult({ won: true, survivalTurns: 30 }));
      }
      const should = ad.shouldIncreaseDifficulty('player1');
      assert.strictEqual(should, false);
    });

    it('returns false with insufficient games', () => {
      const ad = createAdaptiveDifficulty();
      ad.trackGameResult('player1', createGameResult({ won: true }));
      ad.trackGameResult('player1', createGameResult({ won: true }));
      const should = ad.shouldIncreaseDifficulty('player1');
      assert.strictEqual(should, false);
    });
  });

  describe('shouldDecreaseDifficulty', () => {
    it('returns false for new player', () => {
      const ad = createAdaptiveDifficulty();
      const should = ad.shouldDecreaseDifficulty('player1');
      assert.strictEqual(should, false);
    });

    it('returns false when at easy level', () => {
      const ad = createAdaptiveDifficulty();
      ad.setDifficultyLevel('player1', DIFFICULTY_LEVELS.EASY);
      for (let i = 0; i < 3; i++) {
        ad.trackGameResult('player1', createGameResult({ won: false, survivalTurns: 5 }));
      }
      const should = ad.shouldDecreaseDifficulty('player1');
      assert.strictEqual(should, false);
    });
  });

  describe('autoAdjust', () => {
    it('does not adjust when performance is normal', () => {
      const ad = createAdaptiveDifficulty();
      ad.setDifficultyLevel('player1', DIFFICULTY_LEVELS.MEDIUM);
      const result = ad.autoAdjust('player1');
      assert.strictEqual(result.adjusted, false);
    });

    it('increases difficulty when player is winning too much', () => {
      const ad = createAdaptiveDifficulty();
      ad.setDifficultyLevel('player1', DIFFICULTY_LEVELS.EASY);
      for (let i = 0; i < 5; i++) {
        ad.trackGameResult('player1', createGameResult({ won: true, survivalTurns: 30, score: 90 }));
      }
      const result = ad.autoAdjust('player1');
      if (result.adjusted) {
        assert.strictEqual(result.newLevel, DIFFICULTY_LEVELS.MEDIUM);
      }
    });
  });

  describe('getBehaviorModifier', () => {
    it('returns modifiers for easy level', () => {
      const ad = createAdaptiveDifficulty();
      ad.setDifficultyLevel('player1', DIFFICULTY_LEVELS.EASY);
      const mod = ad.getBehaviorModifier('player1');
      assert.ok(typeof mod.riskTolerance === 'number');
      assert.ok(typeof mod.decisionSpeed === 'number');
      assert.ok(typeof mod.tradeBias === 'number');
    });

    it('returns different modifiers for different levels', () => {
      const ad = createAdaptiveDifficulty();
      ad.setDifficultyLevel('player1', DIFFICULTY_LEVELS.EASY);
      ad.setDifficultyLevel('player2', DIFFICULTY_LEVELS.EXPERT);
      const easyMod = ad.getBehaviorModifier('player1');
      const expertMod = ad.getBehaviorModifier('player2');
      assert.ok(easyMod.riskTolerance < expertMod.riskTolerance);
    });
  });

  describe('DIFFICULTY_LEVELS export', () => {
    it('exports all required levels', () => {
      assert.strictEqual(DIFFICULTY_LEVELS.EASY, 'easy');
      assert.strictEqual(DIFFICULTY_LEVELS.MEDIUM, 'medium');
      assert.strictEqual(DIFFICULTY_LEVELS.HARD, 'hard');
      assert.strictEqual(DIFFICULTY_LEVELS.EXPERT, 'expert');
    });
  });
});