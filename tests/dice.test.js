import { describe, it } from 'node:test';
import assert from 'node:assert';

// Test dice utilities
const { rollDice, getDiceResult, isDoubles } = await import('../src/game/dice.js');

describe('dice utilities', () => {
  it('rollDice should return array of 2 numbers', () => {
    const result = rollDice();
    assert.strictEqual(Array.isArray(result), true);
    assert.strictEqual(result.length, 2);
  });

  it('rollDice values should be between 1 and 6', () => {
    for (let i = 0; i < 100; i++) {
      const [d1, d2] = rollDice();
      assert.ok(d1 >= 1 && d1 <= 6, `${d1} should be 1-6`);
      assert.ok(d2 >= 1 && d2 <= 6, `${d2} should be 1-6`);
    }
  });

  it('getDiceResult should sum two dice', () => {
    assert.strictEqual(getDiceResult([1, 1]), 2);
    assert.strictEqual(getDiceResult([3, 4]), 7);
    assert.strictEqual(getDiceResult([6, 6]), 12);
    assert.strictEqual(getDiceResult([1, 6]), 7);
  });

  it('isDoubles should return true for matching dice', () => {
    assert.strictEqual(isDoubles([1, 1]), true);
    assert.strictEqual(isDoubles([6, 6]), true);
    assert.strictEqual(isDoubles([3, 3]), true);
  });

  it('isDoubles should return false for non-matching dice', () => {
    assert.strictEqual(isDoubles([1, 2]), false);
    assert.strictEqual(isDoubles([3, 4]), false);
    assert.strictEqual(isDoubles([5, 6]), false);
  });

  it('dice values should be integers', () => {
    for (let i = 0; i < 50; i++) {
      const [d1, d2] = rollDice();
      assert.strictEqual(Number.isInteger(d1), true);
      assert.strictEqual(Number.isInteger(d2), true);
    }
  });
});
