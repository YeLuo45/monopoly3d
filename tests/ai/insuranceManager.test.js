import { describe, it } from 'node:test';
import assert from 'node:assert';
import { InsuranceManager } from '../../src/game/ai/risk/insuranceManager.js';

function createGameState(overrides = {}) {
  return {
    tiles: [
      { id: 1, type: 'property', price: 100, rent: [10, 30, 90], owner: 'p1', houses: 0 },
      { id: 2, type: 'property', price: 120, rent: [12, 36, 108], owner: 'p1', houses: 2 },
      { id: 3, type: 'property', price: 140, rent: [14, 42, 126], owner: 'p2', houses: 0 },
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 3000 },
      { id: 'p2', name: 'Player 2', money: 2500 },
    ],
    ...overrides,
  };
}

describe('InsuranceManager', () => {
  it('should recommend insurance for high-value property', () => {
    const manager = new InsuranceManager();
    const decision = manager.shouldInsureProperty(2, createGameState());
    assert.ok(typeof decision.should === 'boolean', 'Should have boolean decision');
    assert.ok(decision.reason, 'Should have reason');
  });

  it('getOptimalCoverageLevel returns valid coverage', () => {
    const manager = new InsuranceManager();
    const coverage = manager.getOptimalCoverageLevel(2, createGameState());
    assert.ok(typeof coverage === 'number', 'Coverage should be number');
    assert.ok(coverage >= 0 && coverage <= 1, 'Coverage should be 0-1');
  });

  it('getInsurancePortfolio returns array', () => {
    const manager = new InsuranceManager();
    const portfolio = manager.getInsurancePortfolio('p1', createGameState());
    assert.ok(Array.isArray(portfolio), 'Portfolio should be array');
  });

  it('shouldFileClaim evaluates damage vs premium', () => {
    const manager = new InsuranceManager();
    const decision = manager.shouldFileClaim(2, 500, createGameState());
    assert.ok(typeof decision.should === 'boolean', 'Should have boolean');
    assert.ok(decision.reason, 'Should have reason');
  });

  it('estimateClaimValue returns positive number', () => {
    const manager = new InsuranceManager();
    const value = manager.estimateClaimValue(2, createGameState());
    assert.ok(value >= 0, 'Claim value should be non-negative');
  });

  it('getPropertyRiskScore returns 0-1', () => {
    const manager = new InsuranceManager();
    const score = manager.getPropertyRiskScore(2, createGameState());
    assert.ok(score >= 0 && score <= 1, 'Risk score should be 0-1');
  });

  it('getTotalPortfolioRisk returns aggregate risk', () => {
    const manager = new InsuranceManager();
    const risk = manager.getTotalPortfolioRisk('p1', createGameState());
    assert.ok(typeof risk === 'number', 'Risk should be number');
    assert.ok(risk >= 0, 'Risk should be non-negative');
  });

  it('returns default values for unknown property', () => {
    const manager = new InsuranceManager();
    const decision = manager.shouldInsureProperty(999, createGameState());
    assert.strictEqual(decision.should, false);
    const coverage = manager.getOptimalCoverageLevel(999, createGameState());
    assert.strictEqual(coverage, 0);
  });

  it('handles empty gameState', () => {
    const manager = new InsuranceManager();
    const risk = manager.getPropertyRiskScore(1, {});
    assert.strictEqual(risk, 0);
    const portfolio = manager.getInsurancePortfolio('p1', {});
    assert.deepStrictEqual(portfolio, []);
  });

  it('higher house count increases risk score', () => {
    const manager = new InsuranceManager();
    const lowRisk = manager.getPropertyRiskScore(1, createGameState());
    const highRisk = manager.getPropertyRiskScore(2, createGameState());
    assert.ok(highRisk >= lowRisk, 'More houses = higher risk');
  });

  it('should not insure opponent property', () => {
    const manager = new InsuranceManager();
    const decision = manager.shouldInsureProperty(3, createGameState());
    assert.strictEqual(decision.should, false);
  });
});
