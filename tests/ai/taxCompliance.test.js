/**
 * Tax Compliance Tests
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';

import { TaxCompliance } from '../../src/game/ai/tax/taxCompliance.js';

describe('TaxCompliance', () => {
  let compliance;

  before(() => {
    compliance = new TaxCompliance();
  });

  // Compliance Check Tests
  describe('isCompliant', () => {
    it('should return compliant when all requirements met', () => {
      const gameState = {
        players: [{
          id: 'player1',
          taxFiled: true,
          reportedIncome: 10000,
          actualIncome: 10000,
          lastTaxPaymentTurn: 10,
          turn: 12
        }],
        turn: 12
      };
      const result = compliance.isCompliant('player1', gameState);
      assert.strictEqual(result.isCompliant, true);
      assert.deepStrictEqual(result.issues, []);
    });

    it('should detect tax filing issues', () => {
      const gameState = {
        players: [{
          id: 'player1',
          taxFiled: false,
          turn: 15
        }],
        turn: 15
      };
      const result = compliance.isCompliant('player1', gameState);
      assert.strictEqual(result.isCompliant, false);
      assert.ok(result.issues.length > 0);
    });

    it('should detect underreporting', () => {
      const gameState = {
        players: [{
          id: 'player1',
          taxFiled: true,
          reportedIncome: 5000,
          actualIncome: 15000,
          turn: 20
        }],
        turn: 20
      };
      const result = compliance.isCompliant('player1', gameState);
      assert.strictEqual(result.isCompliant, false);
      assert.ok(result.issues.some(i => i.includes('underreporting')));
    });

    it('should detect overdue taxes', () => {
      const gameState = {
        players: [{
          id: 'player1',
          unpaidTaxes: 1000,
          lastTaxPaymentTurn: 5,
          turn: 15
        }],
        turn: 15
      };
      const result = compliance.isCompliant('player1', gameState);
      assert.strictEqual(result.isCompliant, false);
      assert.ok(result.issues.some(i => i.includes('overdue')));
    });

    it('should handle missing player gracefully', () => {
      const result = compliance.isCompliant('nonexistent', { players: [] });
      assert.strictEqual(result.isCompliant, false);
      assert.ok(result.issues.some(i => i.includes('not found')));
    });
  });

  // Violation Risks Tests
  describe('getViolationRisks', () => {
    it('should detect unreported transactions', () => {
      const gameState = {
        players: [{
          id: 'player1',
          highValueTransactions: [
            { amount: 50000, reported: false }
          ]
        }]
      };
      const result = compliance.getViolationRisks('player1', gameState);
      assert.strictEqual(result.riskLevel, 'HIGH');
      assert.ok(result.risks.some(r => r.type === 'UNREPORTED_TRANSACTION'));
    });

    it('should detect undocumented transfers', () => {
      const gameState = {
        players: [{
          id: 'player1',
          propertyTransfers: [
            { documented: false },
            { documented: true }
          ]
        }]
      };
      const result = compliance.getViolationRisks('player1', gameState);
      assert.ok(result.risks.some(r => r.type === 'UNDOCUMENTED_TRANSFER'));
    });

    it('should detect cash intensive activity', () => {
      const gameState = {
        players: [{
          id: 'player1',
          cashTransactions: Array(15).fill({})
        }]
      };
      const result = compliance.getViolationRisks('player1', gameState);
      assert.ok(result.risks.some(r => r.type === 'CASH_INTENSIVE'));
    });

    it('should return recommendations', () => {
      const gameState = {
        players: [{
          id: 'player1',
          highValueTransactions: [
            { amount: 50000, reported: false }
          ]
        }]
      };
      const result = compliance.getViolationRisks('player1', gameState);
      assert.ok(result.recommendations.length > 0);
    });
  });

  // Tax Report Tests
  describe('generateTaxReport', () => {
    it('should generate comprehensive tax report', () => {
      const gameState = {
        turn: 20,
        players: [{
          id: 'player1',
          rentCollected: 10000,
          propertiesSoldValue: 5000,
          dividends: 1000,
          taxPaid: 3000,
          turn: 20
        }]
      };
      const report = compliance.generateTaxReport('player1', gameState);
      assert.strictEqual(report.turn, 20);
      assert.ok(report.income.total > 0);
      assert.ok(report.taxDue > 0);
      assert.ok('outstanding' in report);
    });

    it('should calculate correct outstanding balance', () => {
      const gameState = {
        turn: 15,
        players: [{
          id: 'player1',
          rentCollected: 20000,
          taxPaid: 2000,
          turn: 15
        }]
      };
      const report = compliance.generateTaxReport('player1', gameState);
      assert.ok(report.outstanding >= 0);
      assert.strictEqual(report.status, report.outstanding > 0 ? 'UNPAID' : 'PAID');
    });

    it('should throw error for missing player', () => {
      assert.throws(() => {
        compliance.generateTaxReport('nonexistent', { turn: 1, players: [] });
      }, /Player not found/);
    });
  });

  // Deadline Reminders Tests
  describe('getDeadlineReminders', () => {
    it('should return quarterly and annual deadlines', () => {
      const gameState = { turn: 5 };
      const reminders = compliance.getDeadlineReminders(gameState);
      assert.ok(reminders.length >= 2);
      assert.ok(reminders.some(r => r.type === 'QUARTERLY_TAX'));
      assert.ok(reminders.some(r => r.type === 'ANNUAL_TAX'));
    });

    it('should calculate correct urgency', () => {
      const gameState = { turn: 38 };
      const reminders = compliance.getDeadlineReminders(gameState);
      const annualReminder = reminders.find(r => r.type === 'ANNUAL_TAX');
      assert.strictEqual(annualReminder.urgency, 'HIGH');
    });

    it('should include property tax deadlines when close', () => {
      const gameState = {
        turn: 8,
        propertyTaxDueDates: {
          'prop1': 10,
          'prop2': 15
        }
      };
      const reminders = compliance.getDeadlineReminders(gameState);
      const propReminder = reminders.find(r => r.type === 'PROPERTY_TAX');
      assert.ok(propReminder);
      assert.strictEqual(propReminder.propertyId, 'prop1');
    });
  });

  // Edge Cases
  describe('edge cases', () => {
    it('should handle zero income player', () => {
      const gameState = {
        players: [{ id: 'player1' }],
        turn: 1
      };
      const report = compliance.generateTaxReport('player1', gameState);
      assert.strictEqual(report.income.total, 0);
    });

    it('should handle missing game state', () => {
      assert.throws(() => {
        compliance.getDeadlineReminders(null);
      }, /Game state is required/);
    });
  });
});