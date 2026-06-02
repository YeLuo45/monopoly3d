import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DifficultyScaler } from '../../src/game/ai/difficulty/difficultyScaler.js';
import { DynamicDifficultyEngine } from '../../src/game/ai/difficulty/dynamicDifficultyEngine.js';

describe('DifficultyScaler', () => {
  let engine;
  let scaler;

  beforeEach(() => {
    engine = new DynamicDifficultyEngine();
    scaler = new DifficultyScaler(engine);
  });

  describe('constructor', () => {
    it('creates instance with difficulty engine', () => {
      assert.ok(scaler.difficultyEngine);
      assert.strictEqual(scaler.difficultyEngine, engine);
    });

    it('has difficulty parameters for all levels', () => {
      const levels = scaler.getDifficultyLevels();
      assert.ok(levels.includes('very_easy'));
      assert.ok(levels.includes('easy'));
      assert.ok(levels.includes('normal'));
      assert.ok(levels.includes('hard'));
      assert.ok(levels.includes('very_hard'));
    });
  });

  describe('getDifficultyParams', () => {
    it('returns params for valid difficulty', () => {
      const params = scaler.getDifficultyParams('easy');
      
      assert.ok(params.aiErrorRate !== undefined);
      assert.ok(params.rentMultiplier !== undefined);
      assert.ok(params.moneyBonus !== undefined);
    });

    it('returns normal params for invalid difficulty', () => {
      const params = scaler.getDifficultyParams('invalid');
      const normalParams = scaler.getDifficultyParams('normal');
      
      assert.deepStrictEqual(params, normalParams);
    });
  });

  describe('getScaledValue', () => {
    it('scales rent correctly for easy difficulty', () => {
      const scaled = scaler.getScaledValue(100, 'easy', 'rent');
      assert.strictEqual(scaled, 70); // 100 * 0.7
    });

    it('scales rent correctly for hard difficulty', () => {
      const scaled = scaler.getScaledValue(100, 'hard', 'rent');
      assert.strictEqual(scaled, 120); // 100 * 1.2
    });

    it('scales cost reduction correctly', () => {
      const scaled = scaler.getScaledValue(100, 'easy', 'cost_reduction');
      assert.strictEqual(scaled, 90); // 100 * (1 - 0.1)
    });

    it('scales cost increase for hard correctly', () => {
      const scaled = scaler.getScaledValue(100, 'hard', 'cost_reduction');
      assert.ok(Math.abs(scaled - 110) < 0.01); // 100 * (1 - (-0.1)) = 110
    });

    it('adds money bonus for easy', () => {
      const scaled = scaler.getScaledValue(100, 'easy', 'money');
      assert.strictEqual(scaled, 350); // 100 + 250
    });

    it('subtracts money for hard', () => {
      const scaled = scaler.getScaledValue(100, 'hard', 'money');
      assert.strictEqual(scaled, 0); // 100 + (-100)
    });
  });

  describe('getScaledProbability', () => {
    it('scales chance bonus for very_easy', () => {
      const prob = scaler.getScaledProbability(0.5, 'very_easy', 'chance');
      assert.strictEqual(prob, 0.65); // 0.5 + 0.15
    });

    it('caps probability at 1', () => {
      const prob = scaler.getScaledProbability(0.9, 'very_easy', 'chance');
      assert.strictEqual(prob, 1);
    });

    it('returns jail escape rate for difficulty', () => {
      const rate = scaler.getScaledProbability(0, 'very_easy', 'jail_escape');
      assert.strictEqual(rate, 0.8);
    });

    it('returns ai error rate for difficulty', () => {
      const rate = scaler.getScaledProbability(0, 'easy', 'ai_error');
      assert.strictEqual(rate, 0.25);
    });
  });

  describe('getScaledRent', () => {
    it('returns scaled rent for player', () => {
      engine.playerDifficulties.set('player1', {
        difficulty: 'easy',
        lastAdjustment: 0,
        adjustmentHistory: [],
      });
      
      const rent = scaler.getScaledRent(100, 'player1');
      assert.strictEqual(rent, 70);
    });
  });

  describe('getScaledPrice', () => {
    it('returns scaled price for player', () => {
      engine.playerDifficulties.set('player1', {
        difficulty: 'easy',
        lastAdjustment: 0,
        adjustmentHistory: [],
      });
      
      const price = scaler.getScaledPrice(200, 'player1');
      assert.strictEqual(price, 180); // 200 * (1 - 0.1)
    });
  });

  describe('getScaledStartingMoney', () => {
    it('adds bonus for very_easy', () => {
      const money = scaler.getScaledStartingMoney(1500, 'very_easy');
      assert.strictEqual(money, 2000); // 1500 + 500
    });

    it('subtracts for very_hard', () => {
      const money = scaler.getScaledStartingMoney(1500, 'very_hard');
      assert.strictEqual(money, 1250); // 1500 - 250
    });
  });

  describe('hasBankruptcyProtection', () => {
    it('returns true for very_easy', () => {
      assert.strictEqual(scaler.hasBankruptcyProtection('very_easy'), true);
    });

    it('returns false for easy', () => {
      assert.strictEqual(scaler.hasBankruptcyProtection('easy'), false);
    });

    it('returns false for normal', () => {
      assert.strictEqual(scaler.hasBankruptcyProtection('normal'), false);
    });
  });

  describe('getAIErrorRate', () => {
    it('returns correct error rates per difficulty', () => {
      assert.strictEqual(scaler.getAIErrorRate('very_easy'), 0.35);
      assert.strictEqual(scaler.getAIErrorRate('easy'), 0.25);
      assert.strictEqual(scaler.getAIErrorRate('normal'), 0.15);
      assert.strictEqual(scaler.getAIErrorRate('hard'), 0.08);
      assert.strictEqual(scaler.getAIErrorRate('very_hard'), 0.03);
    });
  });

  describe('getPassGoBonus', () => {
    it('calculates pass-go bonus correctly', () => {
      const bonus = scaler.getPassGoBonus('very_easy');
      assert.strictEqual(bonus, 450); // 200 + 250
    });

    it('returns less than base for hard', () => {
      const bonus = scaler.getPassGoBonus('hard');
      assert.strictEqual(bonus, 150); // 200 - 50
    });
  });
});