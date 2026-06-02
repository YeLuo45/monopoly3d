/**
 * Loan Manager Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

import { LoanManager } from '../../src/game/ai/bank/loanManager.js';

describe('LoanManager', () => {
  let loanManager;

  before(() => {
    loanManager = new LoanManager();
  });

  after(() => {
    loanManager.clearAll();
  });

  // Loan Tracking Tests
  describe('trackLoan', () => {
    it('should create and track a new loan', () => {
      const loan = loanManager.trackLoan('player1', {
        principal: 5000,
        rate: 0.06,
        term: 36
      });

      assert.ok(loan.id);
      assert.strictEqual(loan.principal, 5000);
      assert.strictEqual(loan.status, 'active');
      assert.strictEqual(loan.paymentsMade, 0);
    });

    it('should generate unique loan IDs', () => {
      const loan1 = loanManager.trackLoan('player1', {
        principal: 1000,
        rate: 0.05,
        term: 12
      });
      const loan2 = loanManager.trackLoan('player1', {
        principal: 2000,
        rate: 0.04,
        term: 24
      });

      assert.notStrictEqual(loan1.id, loan2.id);
    });

    it('should set correct monthly payment', () => {
      const loan = loanManager.trackLoan('player1', {
        principal: 1200,
        rate: 0,
        term: 12
      });
      assert.strictEqual(loan.monthlyPayment, 100); // 1200/12
    });
  });

  // Active Loans Tests
  describe('getActiveLoans', () => {
    it('should return only active loans', () => {
      loanManager.clearPlayerLoans('player2');
      const loan1 = loanManager.trackLoan('player2', {
        principal: 1000,
        rate: 0.05,
        term: 12
      });
      const loan2 = loanManager.trackLoan('player2', {
        principal: 2000,
        rate: 0.04,
        term: 24
      });

      const activeLoans = loanManager.getActiveLoans('player2');
      assert.strictEqual(activeLoans.length, 2);
    });

    it('should return empty array for player with no loans', () => {
      const loans = loanManager.getActiveLoans('nonexistent');
      assert.strictEqual(loans.length, 0);
    });
  });

  // Total Debt Tests
  describe('getTotalDebt', () => {
    it('should sum all active loan balances', () => {
      loanManager.clearPlayerLoans('player3');
      loanManager.trackLoan('player3', { principal: 1000, rate: 0.05, term: 12 });
      loanManager.trackLoan('player3', { principal: 2000, rate: 0.04, term: 24 });

      const totalDebt = loanManager.getTotalDebt('player3');
      assert.strictEqual(totalDebt, 3000);
    });

    it('should return 0 for player with no debt', () => {
      const totalDebt = loanManager.getTotalDebt('nonexistent');
      assert.strictEqual(totalDebt, 0);
    });
  });

  // Payment Calculation Tests
  describe('calculatePayment', () => {
    it('should calculate correct monthly payment', () => {
      const payment = loanManager.calculatePayment(10000, 0.06, 60);
      assert.ok(payment > 190 && payment < 200);
    });

    it('should handle 0% interest', () => {
      const payment = loanManager.calculatePayment(1200, 0, 12);
      assert.strictEqual(payment, 100);
    });
  });

  // Amortization Schedule Tests
  describe('generateAmortizationSchedule', () => {
    it('should generate complete schedule', () => {
      const loan = loanManager.trackLoan('player4', {
        principal: 1200,
        rate: 0,
        term: 12
      });

      const schedule = loanManager.generateAmortizationSchedule(loan.id);
      assert.strictEqual(schedule.length, 12);
    });

    it('should have decreasing balance', () => {
      const loan = loanManager.trackLoan('player5', {
        principal: 10000,
        rate: 0.06,
        term: 60
      });

      const schedule = loanManager.generateAmortizationSchedule(loan.id);
      for (let i = 1; i < schedule.length; i++) {
        assert.ok(schedule[i].balance < schedule[i - 1].balance);
      }
    });

    it('should throw for non-existent loan', () => {
      assert.throws(() => {
        loanManager.generateAmortizationSchedule('nonexistent');
      }, /not found/);
    });
  });

  // Refinancing Tests
  describe('shouldRefinance', () => {
    it('should recommend refinancing for significant rate drop', () => {
      const loan = loanManager.trackLoan('player6', {
        principal: 10000,
        rate: 0.08,
        term: 60
      });

      const result = loanManager.shouldRefinance(loan.id, 0.04);
      assert.strictEqual(result.shouldRefinance, true);
      assert.ok(result.savings > 0);
    });

    it('should not recommend refinancing for slight rate increase', () => {
      const loan = loanManager.trackLoan('player7', {
        principal: 10000,
        rate: 0.05,
        term: 60
      });

      const result = loanManager.shouldRefinance(loan.id, 0.06);
      assert.strictEqual(result.shouldRefinance, false);
    });

    it('should not recommend for non-existent loan', () => {
      const result = loanManager.shouldRefinance('nonexistent', 0.04);
      assert.strictEqual(result.shouldRefinance, false);
    });
  });

  // Debt Summary Tests
  describe('getDebtSummary', () => {
    it('should return comprehensive debt summary', () => {
      loanManager.clearPlayerLoans('player8');
      loanManager.trackLoan('player8', { principal: 5000, rate: 0.05, term: 36 });
      loanManager.trackLoan('player8', { principal: 3000, rate: 0.06, term: 24 });

      const summary = loanManager.getDebtSummary('player8');
      assert.strictEqual(summary.playerId, 'player8');
      assert.strictEqual(summary.activeLoanCount, 2);
      assert.strictEqual(summary.totalDebt, 8000);
      assert.ok(summary.totalMonthlyPayments > 0);
    });
  });

  // Clear Operations Tests
  describe('clearPlayerLoans', () => {
    it('should remove all loans for a player', () => {
      loanManager.clearPlayerLoans('player9');
      loanManager.trackLoan('player9', { principal: 1000, rate: 0.05, term: 12 });
      assert.strictEqual(loanManager.getActiveLoans('player9').length, 1);

      loanManager.clearPlayerLoans('player9');
      assert.strictEqual(loanManager.getActiveLoans('player9').length, 0);
    });
  });
});