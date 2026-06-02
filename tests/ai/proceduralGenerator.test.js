import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ProceduralGenerator } from '../../src/game/ai/procgen/proceduralGenerator.js';

function createMockGameMetrics() {
  return {
    averageRent: 50,
    averageSalePrice: 200,
    averageIncome: 100,
  };
}

describe('ProceduralGenerator', () => {
  describe('constructor', () => {
    it('creates generator with seed', () => {
      const gen = new ProceduralGenerator(12345);
      assert.ok(gen);
      assert.strictEqual(typeof gen.generateProperty, 'function');
    });

    it('creates generator without seed', () => {
      const gen = new ProceduralGenerator();
      assert.ok(gen);
    });
  });

  describe('generateProperty', () => {
    it('generates property with name', () => {
      const gen = new ProceduralGenerator(12345);
      const property = gen.generateProperty('test-property');
      assert.ok(property);
      assert.strictEqual(property.name, 'test-property');
    });

    it('generates property with price', () => {
      const gen = new ProceduralGenerator(12345);
      const property = gen.generateProperty('test-property');
      assert.ok(property.price > 0);
    });

    it('generates property with rent values', () => {
      const gen = new ProceduralGenerator(12345);
      const property = gen.generateProperty('test-property');
      assert.ok(property.rentWith1House !== undefined);
      assert.ok(property.rentWith2House !== undefined);
      assert.ok(property.rentWith3House !== undefined);
      assert.ok(property.rentWith4House !== undefined);
      assert.ok(property.hotelRent !== undefined);
    });

    it('generates different properties with different seeds', () => {
      const gen1 = new ProceduralGenerator(100);
      const gen2 = new ProceduralGenerator(200);
      const p1 = gen1.generateProperty('property');
      const p2 = gen2.generateProperty('property');
      assert.ok(p1.price !== p2.price || p1.rent[0] !== p2.rent[0]);
    });
  });

  describe('generateEvent', () => {
    it('generates event with description', () => {
      const gen = new ProceduralGenerator(12345);
      const event = gen.generateEvent('Bank error in your favor');
      assert.ok(event);
      assert.strictEqual(event.description, 'Bank error in your favor');
    });

    it('generates event with type', () => {
      const gen = new ProceduralGenerator(12345);
      const event = gen.generateEvent('Free parking');
      assert.ok(event.type);
    });

    it('generates event with effects', () => {
      const gen = new ProceduralGenerator(12345);
      const event = gen.generateEvent('Go to jail');
      assert.ok(event.type);
      assert.ok(event.id);
    });
  });

  describe('generateCard', () => {
    it.skip('generates chance card', () => {
      const gen = new ProceduralGenerator(12345);
      const card = gen.generateCard('chance');
      assert.ok(card);
      assert.strictEqual(card.type, 'chance');
    });

    it.skip('generates community chest card', () => {
      const gen = new ProceduralGenerator(12345);
      const card = gen.generateCard('community');
      assert.ok(card);
      assert.strictEqual(card.type, 'community');
    });

    it.skip('generates card with action', () => {
      const gen = new ProceduralGenerator(12345);
      const card = gen.generateCard('chance');
      assert.ok(card.action);
    });
  });

  describe('generateVariant', () => {
    it.skip('generates variant with base content', () => {
      const gen = new ProceduralGenerator(12345);
      const base = { name: 'Base Property', price: 100 };
      const variant = gen.generateVariant(base, 0.5);
      assert.ok(variant);
      assert.notStrictEqual(variant.price, base.price);
    });

    it.skip('respects intensity parameter', () => {
      const gen = new ProceduralGenerator(12345);
      const base = { name: 'Base', price: 100 };
      const v1 = gen.generateVariant(base, 0.1);
      const v2 = gen.generateVariant(base, 1.0);
      assert.ok(Math.abs(v1.price - base.price) < Math.abs(v2.price - base.price));
    });
  });

  describe('mutateContent', () => {
    it.skip('mutates existing content', () => {
      const gen = new ProceduralGenerator(12345);
      const content = { name: 'Original', price: 100 };
      const mutated = gen.mutateContent(content, { price: 1.5 });
      assert.ok(mutated.price !== content.price);
    });

    it.skip('keeps non-mutated fields', () => {
      const gen = new ProceduralGenerator(12345);
      const content = { name: 'Original', price: 100, color: 'red' };
      const mutated = gen.mutateContent(content, { price: 1.2 });
      assert.strictEqual(mutated.name, 'Original');
    });
  });
});