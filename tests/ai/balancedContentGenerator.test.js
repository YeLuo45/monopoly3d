import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BalancedContentGenerator } from '../../src/game/ai/procgen/balancedContentGenerator.js';

function createMockMetrics() {
  return {
    averageRent: 50,
    averageSalePrice: 200,
    averageIncome: 100,
    averagePropertyValue: 180,
  };
}

describe('BalancedContentGenerator', () => {
  describe('constructor', () => {
    it('creates generator with game metrics', () => {
      const gen = new BalancedContentGenerator(createMockMetrics());
      assert.ok(gen);
    });

    it('creates generator without metrics', () => {
      const gen = new BalancedContentGenerator();
      assert.ok(gen);
    });
  });

  describe('generateBalancedProperty', () => {
    it.skip('generates property within balance range', () => {
      const gen = new BalancedContentGenerator(createMockMetrics());
      const property = gen.generateBalancedProperty();
      assert.ok(property);
      assert.ok(property.name);
      assert.ok(property.price > 0);
    });

    it.skip('generates property with rent values', () => {
      const gen = new BalancedContentGenerator(createMockMetrics());
      const property = gen.generateBalancedProperty();
      assert.ok(property.rentWith1House !== undefined);
    });
  });

  describe('checkBalance', () => {
    it.skip('returns balanced for normal content', () => {
      const gen = new BalancedContentGenerator(createMockMetrics());
      const content = { price: 200, rent: [10, 20, 30] };
      const result = gen.checkBalance(content);
      assert.ok(result !== undefined);
    });

    it.skip('returns balanced for very cheap content', () => {
      const gen = new BalancedContentGenerator(createMockMetrics());
      const content = { price: 10, rent: [1, 2, 3] };
      const result = gen.checkBalance(content);
      assert.strictEqual(result, true);
    });

    it.skip('returns balanced for expensive content', () => {
      const gen = new BalancedContentGenerator(createMockMetrics());
      const content = { price: 1000, rent: [100, 200, 300] };
      const result = gen.checkBalance(content);
      assert.strictEqual(result, true);
    });
  });

  describe('adjustContent', () => {
    it('adjusts content to target balance', () => {
      const gen = new BalancedContentGenerator(createMockMetrics());
      const content = { price: 500, rent: [25, 50, 75] };
      const adjusted = gen.adjustContent(content, 0.8);
      assert.ok(adjusted);
      assert.strictEqual(typeof adjusted.price, 'number');
    });

    it('keeps content structure intact', () => {
      const gen = new BalancedContentGenerator(createMockMetrics());
      const content = { price: 200, rent: [10, 20, 30], color: 'blue' };
      const adjusted = gen.adjustContent(content, 0.5);
      assert.strictEqual(adjusted.color, 'blue');
    });
  });
});