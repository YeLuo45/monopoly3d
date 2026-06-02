import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DifficultyScaler } from '../../src/game/ai/difficulty/difficultyScaler.js';

function createMockEngine() {
  return {
    getDifficulty: (playerId) => 1.0,
  };
}

describe('DifficultyScaler', () => {
  describe('constructor', () => {
    it('creates scaler with engine', () => {
      const scaler = new DifficultyScaler(createMockEngine());
      assert.ok(scaler);
    });
  });

  describe('getScaledValue', () => {
    it('scales value by difficulty', () => {
      const scaler = new DifficultyScaler(createMockEngine());
      const scaled = scaler.getScaledValue(100, 1.5);
      assert.strictEqual(scaled, 150);
    });

    it('returns base value at difficulty 1.0', () => {
      const scaler = new DifficultyScaler(createMockEngine());
      const scaled = scaler.getScaledValue(100, 1.0);
      assert.strictEqual(scaled, 100);
    });
  });

  describe('getScaledProbability', () => {
    it('scales probability by difficulty', () => {
      const scaler = new DifficultyScaler(createMockEngine());
      const scaled = scaler.getScaledProbability(0.5, 1.5);
      assert.strictEqual(scaled, 0.75);
    });

    it('returns base probability at difficulty 1.0', () => {
      const scaler = new DifficultyScaler(createMockEngine());
      const scaled = scaler.getScaledProbability(0.5, 1.0);
      assert.strictEqual(scaled, 0.5);
    });
  });

  describe('getDifficultyParams', () => {
    it('returns params for difficulty level', () => {
      const scaler = new DifficultyScaler(createMockEngine());
      const params = scaler.getDifficultyParams(1.5);
      assert.ok(params);
      assert.ok(params.scalingFactor !== undefined);
    });
  });
});