/**
 * Tax Calculator Tests
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';

import { TaxCalculator } from '../../src/game/ai/tax/taxCalculator.js';

describe('TaxCalculator', () => {
  let calculator;

  before(() => {
    calculator = new TaxCalculator();
  });

  // Property Tax Tests
  describe('calculatePropertyTax', () => {
    it('should calculate property tax correctly', () => {
      const gameState = {
        properties: [{
          id: 'prop1',
          purchasePrice: 10000,
          currentValue: 12000,
          ownerId: 'player1'
        }]
      };
      const tax = calculator.calculatePropertyTax('prop1', gameState);
      assert.ok(tax > 0);
      assert.ok(tax < 200); // Between 0 and 200 at 1.5%
    });

    it('should apply improvement multiplier', () => {
      const gameState = {
        properties: [{
          id: 'prop2',
          purchasePrice: 10000,
          improvementLevel: 2,
          ownerId: 'player1'
        }]
      };
      const tax = calculator.calculatePropertyTax('prop2', gameState);
      assert.ok(tax > 150); // Higher due to improvement bonus
    });

    it('should return 0 for exempt properties', () => {
      const gameState = {
        properties: [{
          id: 'prop3',
          purchasePrice: 10000,
          taxExempt: true,
          ownerId: 'player1'
        }]
      };
      const tax = calculator.calculatePropertyTax('prop3', gameState);
      assert.strictEqual(tax, 0);
    });

    it('should throw error for missing property', () => {
      assert.throws(() => {
        calculator.calculatePropertyTax('nonexistent', {});
      }, /Property not found/);
    });
  });

  // Capital Gains Tests
  describe('calculateCapitalGains', () => {
    it('should calculate capital gains tax correctly', () => {
      const tax = calculator.calculateCapitalGains('player1', 15000, 10000);
      assert.strictEqual(tax, 750); // 15% of $5000 gain
    });

    it('should return 0 for losses', () => {
      const tax = calculator.calculateCapitalGains('player1', 8000, 10000);
      assert.strictEqual(tax, 0);
    });

    it('should return 0 for break-even', () => {
      const tax = calculator.calculateCapitalGains('player1', 10000, 10000);
      assert.strictEqual(tax, 0);
    });

    it('should throw error for negative prices', () => {
      assert.throws(() => {
        calculator.calculateCapitalGains('player1', -1000, 10000);
      }, /cannot be negative/);
    });
  });

  // Income Tax Tests
  describe('calculateIncomeTax', () => {
    it('should calculate income tax with standard deduction', () => {
      const gameState = {
        players: [{
          id: 'player1',
          rentCollected: 10000,
          baseIncome: 5000
        }]
      };
      const tax = calculator.calculateIncomeTax('player1', gameState);
      // (15000 - 2000) * 0.15 = 1950
      assert.strictEqual(tax, 1950);
    });

    it('should handle zero income', () => {
      const gameState = {
        players: [{ id: 'player1' }]
      };
      const tax = calculator.calculateIncomeTax('player1', gameState);
      assert.strictEqual(tax, 0);
    });

    it('should throw error for missing player', () => {
      assert.throws(() => {
        calculator.calculateIncomeTax('nonexistent', { players: [] });
      }, /Player not found/);
    });
  });

  // Tax Deductions Tests
  describe('applyTaxDeductions', () => {
    it('should apply property deduction', () => {
      const result = calculator.applyTaxDeductions(1000, [
        { type: 'property', amount: 5000 }
      ]);
      assert.strictEqual(result, 0); // Fully deducted
    });

    it('should cap charitable deduction', () => {
      const result = calculator.applyTaxDeductions(1000, [
        { type: 'charitable', amount: 2000 }
      ]);
      assert.strictEqual(result, 0); // Capped at $1000
    });

    it('should handle multiple deductions', () => {
      const result = calculator.applyTaxDeductions(5000, [
        { type: 'property', amount: 3000 },
        { type: 'charitable', amount: 500 }
      ]);
      assert.strictEqual(result, 1500);
    });

    it('should not return negative', () => {
      const result = calculator.applyTaxDeductions(1000, [
        { type: 'property', amount: 5000 }
      ]);
      assert.strictEqual(result, 0);
    });
  });

  // Tax Bracket Tests
  describe('getTaxBracket', () => {
    it('should return lowest bracket for low income', () => {
      const gameState = {
        players: [{
          id: 'player1',
          rentCollected: 3000
        }]
      };
      const bracket = calculator.getTaxBracket('player1', gameState);
      assert.strictEqual(bracket.rate, 0.10);
    });

    it('should return middle bracket for medium income', () => {
      const gameState = {
        players: [{
          id: 'player1',
          rentCollected: 30000
        }]
      };
      const bracket = calculator.getTaxBracket('player1', gameState);
      assert.strictEqual(bracket.rate, 0.20);
    });

    it('should return highest bracket for high income', () => {
      const gameState = {
        players: [{
          id: 'player1',
          rentCollected: 150000
        }]
      };
      const bracket = calculator.getTaxBracket('player1', gameState);
      assert.strictEqual(bracket.rate, 0.30);
    });
  });

  // Edge Cases
  describe('edge cases', () => {
    it('should handle missing game state parameters', () => {
      assert.throws(() => {
        calculator.calculatePropertyTax('prop1', null);
      }, /required/);
    });

    it('should handle invalid deduction types', () => {
      const result = calculator.applyTaxDeductions(1000, [
        { type: 'unknown', amount: 500 }
      ]);
      assert.strictEqual(result, 500);
    });
  });
});