/**
 * EconomicDashboardData Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

import { EconomicDashboardData } from '../../src/game/ai/economicDashboardData.js';

describe('EconomicDashboardData', () => {
  let dashboard;
  let mockGameState;

  before(() => {
    dashboard = new EconomicDashboardData();
    mockGameState = {
      players: [
        {
          id: 'player1',
          money: 5000,
          properties: [
            { id: 'prop1', name: 'Mediterranean', price: 60, rent: 30, colorGroup: 'brown', houses: 0 },
            { id: 'prop2', name: 'Baltic', price: 60, rent: 30, colorGroup: 'brown', houses: 0 },
          ],
          debt: 0,
          monthlyIncome: 200,
        },
        { id: 'player2', money: 3000, properties: [], debt: 500 },
      ],
      turn: 10,
      tiles: [],
    };
  });

  after(() => {
    dashboard = null;
  });

  describe('constructor', () => {
    it('should initialize with default weights', () => {
      const d = new EconomicDashboardData();
      assert.ok(d.healthWeights);
      assert.strictEqual(d.healthWeights.liquidity, 0.25);
    });

    it('should initialize with risk thresholds', () => {
      assert.ok(dashboard.riskThresholds);
      assert.ok(dashboard.riskThresholds.cashReserve);
    });
  });

  describe('getDashboardData', () => {
    it('should return complete dashboard data', () => {
      const data = dashboard.getDashboardData('player1', mockGameState);
      assert.ok(data);
      assert.strictEqual(data.playerId, 'player1');
      assert.ok(data.timestamp);
      assert.ok(data.financialHealth);
      assert.ok(data.investmentScore);
      assert.ok(data.riskScore);
    });

    it('should include financial health score', () => {
      const data = dashboard.getDashboardData('player1', mockGameState);
      assert.ok(typeof data.financialHealth.score === 'number');
      assert.ok(typeof data.financialHealth.grade === 'string');
      assert.ok(data.financialHealth.factors);
    });

    it('should include investment score', () => {
      const data = dashboard.getDashboardData('player1', mockGameState);
      assert.ok(typeof data.investmentScore.score === 'number');
      assert.ok(typeof data.investmentScore.quality === 'string');
    });

    it('should include risk score', () => {
      const data = dashboard.getDashboardData('player1', mockGameState);
      assert.ok(typeof data.riskScore.score === 'number');
      assert.ok(typeof data.riskScore.level === 'string');
    });

    it('should include alerts and recommendations', () => {
      const data = dashboard.getDashboardData('player1', mockGameState);
      assert.ok(Array.isArray(data.alerts));
      assert.ok(Array.isArray(data.recommendations));
    });

    it('should include portfolio summary', () => {
      const data = dashboard.getDashboardData('player1', mockGameState);
      assert.ok(data.portfolio);
      assert.strictEqual(data.portfolio.totalProperties, 2);
    });

    it('should return empty dashboard for unknown player', () => {
      const d = new EconomicDashboardData();
      const data = d.getDashboardData('unknown', mockGameState);
      assert.strictEqual(data.financialHealth.score, 0);
      assert.strictEqual(data.investmentScore.score, 0);
    });

    it('should cache results', () => {
      const data1 = dashboard.getDashboardData('player1', mockGameState);
      const data2 = dashboard.getDashboardData('player1', mockGameState);
      assert.strictEqual(data1, data2);
    });
  });

  describe('getFinancialHealthScore', () => {
    it('should return score between 0-100', () => {
      const result = dashboard.getFinancialHealthScore('player1', mockGameState);
      assert.ok(result.score >= 0 && result.score <= 100);
    });

    it('should return valid grade', () => {
      const result = dashboard.getFinancialHealthScore('player1', mockGameState);
      assert.ok(['A', 'B', 'C', 'D', 'F'].includes(result.grade));
    });

    it('should include factor breakdown', () => {
      const result = dashboard.getFinancialHealthScore('player1', mockGameState);
      assert.ok(result.factors);
      assert.ok(result.factors.liquidity);
      assert.ok(result.factors.profitability);
    });

    it('should return 0 score for unknown player', () => {
      const result = dashboard.getFinancialHealthScore('unknown', mockGameState);
      assert.strictEqual(result.score, 0);
      assert.strictEqual(result.grade, 'F');
    });
  });

  describe('getInvestmentScore', () => {
    it('should return score between 0-100', () => {
      const result = dashboard.getInvestmentScore('player1', mockGameState);
      assert.ok(result.score >= 0 && result.score <= 100);
    });

    it('should return valid quality rating', () => {
      const result = dashboard.getInvestmentScore('player1', mockGameState);
      assert.ok(['excellent', 'good', 'fair', 'poor'].includes(result.quality));
    });

    it('should include property count', () => {
      const result = dashboard.getInvestmentScore('player1', mockGameState);
      assert.strictEqual(result.propertyCount, 2);
    });

    it('should calculate monopoly count for complete color groups', () => {
      const result = dashboard.getInvestmentScore('player1', mockGameState);
      assert.strictEqual(result.monopolyCount, 1); // Brown monopoly (2 properties)
    });
  });

  describe('getRiskScore', () => {
    it('should return score between 0-100', () => {
      const result = dashboard.getRiskScore('player1', mockGameState);
      assert.ok(result.score >= 0 && result.score <= 100);
    });

    it('should return valid risk level', () => {
      const result = dashboard.getRiskScore('player1', mockGameState);
      assert.ok(['low', 'medium', 'high', 'critical'].includes(result.level));
    });

    it('should include risk factors', () => {
      const result = dashboard.getRiskScore('player1', mockGameState);
      assert.ok(Array.isArray(result.factors));
    });

    it('should detect low cash risk', () => {
      const poorState = {
        players: [{ id: 'poor', money: 50, properties: [] }],
        turn: 5,
      };
      const result = dashboard.getRiskScore('poor', poorState);
      assert.ok(result.level === 'critical' || result.level === 'high');
    });
  });

  describe('getAlerts', () => {
    it('should return array of alerts', () => {
      const alerts = dashboard.getAlerts('player1', mockGameState);
      assert.ok(Array.isArray(alerts));
    });

    it('should include critical cash warning', () => {
      const criticalState = {
        players: [{ id: 'critical', money: 50, properties: [] }],
        turn: 5,
      };
      const alerts = dashboard.getAlerts('critical', criticalState);
      const cashAlert = alerts.find(a => a.category === 'liquidity');
      assert.ok(cashAlert);
      assert.strictEqual(cashAlert.type, 'critical');
    });

    it('should include high debt warning', () => {
      const debtState = {
        players: [{ id: 'debt', money: 1000, properties: [], debt: 5000 }],
        turn: 5,
      };
      const alerts = dashboard.getAlerts('debt', debtState);
      const debtAlert = alerts.find(a => a.category === 'debt');
      assert.ok(debtAlert);
    });

    it('should return empty array for unknown player', () => {
      const alerts = dashboard.getAlerts('unknown', mockGameState);
      assert.strictEqual(alerts.length, 0);
    });
  });

  describe('getRecommendations', () => {
    it('should return array of recommendations', () => {
      const recs = dashboard.getRecommendations('player1', mockGameState);
      assert.ok(Array.isArray(recs));
    });

    it('should include priority ordering', () => {
      const recs = dashboard.getRecommendations('player1', mockGameState);
      if (recs.length > 1) {
        assert.ok(recs[0].priority <= recs[1].priority);
      }
    });

    it('should include action details', () => {
      const recs = dashboard.getRecommendations('player1', mockGameState);
      if (recs.length > 0) {
        assert.ok(typeof recs[0].action === 'string');
        assert.ok(typeof recs[0].title === 'string');
        assert.ok(typeof recs[0].reasoning === 'string');
      }
    });

    it('should recommend selling when cash is low', () => {
      const lowCashState = {
        players: [{ id: 'low', money: 200, properties: [{ id: 'p1' }] }],
        turn: 5,
      };
      const recs = dashboard.getRecommendations('low', lowCashState);
      const sellRec = recs.find(r => r.action === 'sell_property');
      assert.ok(sellRec);
    });
  });

  describe('portfolio analysis', () => {
    it('should calculate total property value', () => {
      const data = dashboard.getDashboardData('player1', mockGameState);
      assert.strictEqual(data.portfolio.totalValue, 120); // 60 + 60
    });

    it('should count total houses', () => {
      const data = dashboard.getDashboardData('player1', mockGameState);
      assert.strictEqual(data.portfolio.totalHouses, 0);
    });

    it('should count monopolies', () => {
      const data = dashboard.getDashboardData('player1', mockGameState);
      assert.strictEqual(data.portfolio.monopolies, 1);
    });
  });

  describe('cash flow analysis', () => {
    it('should include income and expenses', () => {
      const data = dashboard.getDashboardData('player1', mockGameState);
      assert.ok(typeof data.cashFlow.income === 'number');
      assert.ok(typeof data.cashFlow.expenses === 'number');
      assert.ok(typeof data.cashFlow.net === 'number');
    });

    it('should calculate net cash flow', () => {
      const data = dashboard.getDashboardData('player1', mockGameState);
      assert.strictEqual(data.cashFlow.income, 200);
    });
  });

  describe('debt analysis', () => {
    it('should include debt details', () => {
      const data = dashboard.getDashboardData('player1', mockGameState);
      assert.ok(typeof data.debt.total === 'number');
      assert.ok(typeof data.debt.interestRate === 'number');
    });

    it('should handle player with debt', () => {
      const d = new EconomicDashboardData();
      const player2State = {
        players: [
          { id: 'player2', money: 3000, properties: [], debt: 500, loanPayments: 12, avgInterestRate: 0.08 },
        ],
        turn: 5,
      };
      const data = d.getDashboardData('player2', player2State);
      assert.strictEqual(data.debt.total, 500);
    });
  });
});
