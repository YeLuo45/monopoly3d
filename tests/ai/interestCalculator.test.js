/**
 * Interest Calculator Tests
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';

import { InterestCalculator } from '../../src/game/ai/bank/interestCalculator.js';

describe('InterestCalculator', () => {
  let calculator;

  before(() => {
    calculator = new InterestCalculator();
  });

  // Simple Interest Tests
  describe('calculateSimpleInterest', () => {
    it('should calculate simple interest correctly', () => {
      const result = calculator.calculateSimpleInterest(1000, 0.05, 2);
      assert.strictEqual(result, 100); // $100 interest
    });

    it('should return 0 for 0 principal', () => {
      const result = calculator.calculateSimpleInterest(0, 0.05, 2);
      assert.strictEqual(result, 0);
    });

    it('should return 0 for 0 rate', () => {
      const result = calculator.calculateSimpleInterest(1000, 0, 2);
      assert.strictEqual(result, 0);
    });

    it('should handle fractional years', () => {
      const result = calculator.calculateSimpleInterest(1000, 0.06, 0.5);
      assert.strictEqual(result, 30); // $30 for half a year
    });

    it('should throw error for negative inputs', () => {
      assert.throws(() => {
        calculator.calculateSimpleInterest(-1000, 0.05, 2);
      }, /non-negative/);
    });
  });

  // Compound Interest Tests
  describe('calculateCompoundInterest', () => {
    it('should calculate compound interest with monthly compounding', () => {
      const result = calculator.calculateCompoundInterest(1000, 0.05, 1, 12);
      assert.ok(result > 1050 && result < 1052); // ~5.12% APY
    });

    it('should return principal for 0 rate', () => {
      const result = calculator.calculateCompoundInterest(1000, 0, 5, 12);
      assert.strictEqual(result, 1000);
    });

    it('should compound annually vs monthly differ correctly', () => {
      const annual = calculator.calculateCompoundInterest(1000, 0.05, 1, 1);
      const monthly = calculator.calculateCompoundInterest(1000, 0.05, 1, 12);
      assert.ok(monthly > annual); // More compounding = more growth
    });

    it('should throw error for invalid inputs', () => {
      assert.throws(() => {
        calculator.calculateCompoundInterest(-1000, 0.05, 1, 12);
      }, /Invalid/);
    });
  });

  // Effective Rate Tests
  describe('calculateEffectiveRate', () => {
    it('should calculate effective rate from nominal', () => {
      const effective = calculator.calculateEffectiveRate(0.05, 12);
      assert.ok(effective > 0.051 && effective < 0.052); // ~5.12%
    });

    it('should return 0 for 0 nominal rate', () => {
      const effective = calculator.calculateEffectiveRate(0, 12);
      assert.strictEqual(effective, 0);
    });

    it('should handle annual compounding', () => {
      const effective = calculator.calculateEffectiveRate(0.06, 1);
      assert.ok(Math.abs(effective - 0.06) < 0.0001); // Approximately equal
    });
  });

  // Loan Comparison Tests
  describe('compareLoanOffers', () => {
    it('should identify the better loan offer', () => {
      const loanA = { principal: 10000, rate: 0.06, term: 60 };
      const loanB = { principal: 10000, rate: 0.05, term: 60 };
      const result = calculator.compareLoanOffers(loanA, loanB);
      assert.strictEqual(result.better, 'B');
      assert.ok(result.savingsB > 0);
    });

    it('should handle equal offers', () => {
      const loanA = { principal: 10000, rate: 0.05, term: 60 };
      const loanB = { principal: 10000, rate: 0.05, term: 60 };
      const result = calculator.compareLoanOffers(loanA, loanB);
      assert.strictEqual(result.better, 'equal');
    });

    it('should work with different terms', () => {
      const loanA = { principal: 5000, rate: 0.04, term: 36 };
      const loanB = { principal: 5000, rate: 0.05, term: 24 };
      const result = calculator.compareLoanOffers(loanA, loanB);
      assert.ok(['A', 'B'].includes(result.better));
    });
  });

  // True Cost Tests
  describe('calculateTrueCost', () => {
    it('should calculate total interest correctly', () => {
      const loan = {
        principal: 10000,
        rate: 0.06,
        term: 60,
        paymentsMade: 0
      };
      const result = calculator.calculateTrueCost(loan);
      assert.ok(result.totalInterest > 0);
      assert.ok(result.totalPaid > loan.principal);
    });

    it('should calculate remaining interest proportionally', () => {
      const loan = {
        principal: 10000,
        rate: 0.06,
        term: 60,
        paymentsMade: 30
      };
      const result = calculator.calculateTrueCost(loan);
      assert.ok(result.remainingInterest < result.totalInterest);
      assert.ok(result.remainingInterest > 0);
    });
  });

  // Monthly Payment Tests
  describe('calculateMonthlyPayment', () => {
    it('should calculate correct monthly payment', () => {
      const payment = calculator.calculateMonthlyPayment(10000, 0.06, 60);
      assert.ok(payment > 190 && payment < 200); // ~$193
    });

    it('should handle 0% interest', () => {
      const payment = calculator.calculateMonthlyPayment(1200, 0, 12);
      assert.strictEqual(payment, 100); // Simple division
    });
  });

  // Total Loan Cost Tests
  describe('calculateTotalLoanCost', () => {
    it('should calculate total cost including interest', () => {
      const total = calculator.calculateTotalLoanCost(10000, 0.05, 60);
      assert.ok(total > 10000);
      // Should be approximately $11,600 for 5% over 5 years
      assert.ok(total < 12000);
    });

    it('should return principal for 0% interest', () => {
      const total = calculator.calculateTotalLoanCost(10000, 0, 60);
      assert.strictEqual(total, 10000);
    });
  });
});