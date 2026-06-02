/**
 * Tax Planning AI Tests
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';

import { TaxPlanningAI } from '../../src/game/ai/tax/taxPlanningAI.js';

describe('TaxPlanningAI', () => {
  let ai;

  before(() => {
    ai = new TaxPlanningAI();
  });

  // Tax Optimization Plan Tests
  describe('getTaxOptimizationPlan', () => {
    it('should generate comprehensive optimization plan', () => {
      const gameState = {
        turn: 10,
        players: [{
          id: 'player1',
          cash: 50000,
          properties: ['prop1', 'prop2'],
          rentCollected: 5000
        }],
        properties: [
          { id: 'prop1', purchasePrice: 20000, rent: 1000, ownerId: 'player1' },
          { id: 'prop2', purchasePrice: 15000, rent: 800, ownerId: 'player1' }
        ]
      };
      const plan = ai.getTaxOptimizationPlan('player1', gameState);
      assert.strictEqual(plan.playerId, 'player1');
      assert.ok('strategies' in plan);
      assert.ok('recommendations' in plan);
      assert.ok('expectedSavings' in plan);
    });

    it('should include tax burden analysis', () => {
      const gameState = {
        turn: 5,
        players: [{
          id: 'player1',
          properties: ['prop1'],
          rentCollected: 10000
        }],
        properties: [
          { id: 'prop1', purchasePrice: 25000, rent: 1500, ownerId: 'player1' }
        ]
      };
      const plan = ai.getTaxOptimizationPlan('player1', gameState);
      assert.ok('currentTaxBurden' in plan);
      assert.ok('propertyTax' in plan.currentTaxBurden);
      assert.ok('incomeTax' in plan.currentTaxBurden);
    });

    it('should throw error for missing player', () => {
      assert.throws(() => {
        ai.getTaxOptimizationPlan('nonexistent', { turn: 1, players: [] });
      }, /Player not found/);
    });
  });

  // Prepay Tax Decision Tests
  describe('shouldPrepayTax', () => {
    it('should recommend prepayment when beneficial', () => {
      const gameState = {
        properties: [{
          id: 'prop1',
          purchasePrice: 100000,
          ownerId: 'player1'
        }],
        players: [{
          id: 'player1',
          cash: 20000
        }]
      };
      const decision = ai.shouldPrepayTax('prop1', gameState);
      assert.ok('shouldPrepay' in decision);
      assert.ok('discount' in decision);
      assert.ok('reason' in decision);
    });

    it('should not prepay tax exempt property', () => {
      const gameState = {
        properties: [{
          id: 'prop2',
          purchasePrice: 100000,
          taxExempt: true,
          ownerId: 'player1'
        }],
        players: [{ id: 'player1', cash: 20000 }]
      };
      const decision = ai.shouldPrepayTax('prop2', gameState);
      assert.strictEqual(decision.shouldPrepay, false);
      assert.strictEqual(decision.reason, 'Property is tax exempt');
    });

    it('should not prepay when cash insufficient', () => {
      const gameState = {
        properties: [{
          id: 'prop3',
          purchasePrice: 100000,
          ownerId: 'player1'
        }],
        players: [{
          id: 'player1',
          cash: 100 // Insufficient
        }]
      };
      const decision = ai.shouldPrepayTax('prop3', gameState);
      assert.strictEqual(decision.shouldPrepay, false);
    });

    it('should throw error for missing property', () => {
      assert.throws(() => {
        ai.shouldPrepayTax('nonexistent', {});
      }, /Property not found/);
    });
  });

  // Tax Impact Estimation Tests
  describe('estimateTaxImpact', () => {
    it('should calculate total tax impact', () => {
      const gameState = {
        turn: 10,
        players: [{
          id: 'player1',
          properties: ['prop1'],
          rentCollected: 12000,
          propertiesSold: [{ salePrice: 30000, purchasePrice: 25000 }]
        }],
        properties: [{
          id: 'prop1',
          purchasePrice: 50000,
          ownerId: 'player1'
        }]
      };
      const impact = ai.estimateTaxImpact('player1', gameState);
      assert.ok('propertyTax' in impact);
      assert.ok('incomeTax' in impact);
      assert.ok('capitalGains' in impact);
      assert.ok('total' in impact);
    });

    it('should include effective rate', () => {
      const gameState = {
        turn: 5,
        players: [{
          id: 'player1',
          rentCollected: 20000
        }],
        properties: []
      };
      const impact = ai.estimateTaxImpact('player1', gameState);
      assert.ok('effectiveRate' in impact);
      assert.ok(impact.effectiveRate >= 0);
    });

    it('should throw error for missing player', () => {
      assert.throws(() => {
        ai.estimateTaxImpact('nonexistent', { players: [] });
      }, /Player not found/);
    });
  });

  // Post-Tax ROI Tests
  describe('getPostTaxROI', () => {
    it('should calculate gross and net ROI', () => {
      const gameState = {
        properties: [{
          id: 'prop1',
          purchasePrice: 20000,
          rent: 2000,
          ownerId: 'player1'
        }],
        players: [{ id: 'player1' }]
      };
      const roi = ai.getPostTaxROI('prop1', gameState);
      assert.ok('grossROI' in roi);
      assert.ok('netROI' in roi);
      assert.ok('taxImpact' in roi);
      assert.strictEqual(roi.propertyId, 'prop1');
    });

    it('should include recommendation', () => {
      const gameState = {
        properties: [{
          id: 'prop2',
          purchasePrice: 10000,
          rent: 1500,
          ownerId: 'player1'
        }],
        players: [{ id: 'player1' }]
      };
      const roi = ai.getPostTaxROI('prop2', gameState);
      assert.ok('recommendation' in roi);
      assert.ok(['HOLD', 'CONSIDER_SELLING', 'STRONG_BUY'].includes(roi.recommendation));
    });

    it('should throw error for missing property', () => {
      assert.throws(() => {
        ai.getPostTaxROI('nonexistent', { players: [] });
      }, /Property not found/);
    });
  });

  // Asset Protection Tests
  describe('getAssetProtectionStrategies', () => {
    it('should return protection strategies with priority', () => {
      const strategies = ai.getAssetProtectionStrategies('player1');
      assert.ok(strategies.length > 0);
      assert.ok(strategies.every(s => 'name' in s && 'priority' in s));
    });

    it('should sort strategies by priority', () => {
      const strategies = ai.getAssetProtectionStrategies('player1');
      for (let i = 1; i < strategies.length; i++) {
        assert.ok(strategies[i - 1].priority >= strategies[i].priority);
      }
    });

    it('should throw error for missing player ID', () => {
      assert.throws(() => {
        ai.getAssetProtectionStrategies(null);
      }, /Player ID is required/);
    });
  });

  // Structuring Suggestion Tests
  describe('suggestStructuring', () => {
    it('should suggest individual for small portfolio', () => {
      const gameState = {
        players: [{
          id: 'player1',
          properties: ['prop1'],
          cash: 5000
        }],
        properties: [
          { id: 'prop1', value: 5000, ownerId: 'player1' }
        ]
      };
      const suggestion = ai.suggestStructuring('player1', gameState);
      assert.strictEqual(suggestion.suggestedType, 'INDIVIDUAL');
    });

    it('should suggest corporation for many properties', () => {
      const gameState = {
        players: [{
          id: 'player1',
          properties: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
          cash: 100000
        }],
        properties: [
          { id: 'p1', value: 10000, ownerId: 'player1' },
          { id: 'p2', value: 10000, ownerId: 'player1' },
          { id: 'p3', value: 10000, ownerId: 'player1' },
          { id: 'p4', value: 10000, ownerId: 'player1' },
          { id: 'p5', value: 10000, ownerId: 'player1' },
          { id: 'p6', value: 10000, ownerId: 'player1' }
        ]
      };
      const suggestion = ai.suggestStructuring('player1', gameState);
      assert.strictEqual(suggestion.suggestedType, 'CORPORATION');
    });

    it('should include benefits and rationale', () => {
      const gameState = {
        players: [{ id: 'player1', properties: [], cash: 100000 }],
        properties: []
      };
      const suggestion = ai.suggestStructuring('player1', gameState);
      assert.ok('benefits' in suggestion);
      assert.ok('rationale' in suggestion);
      assert.ok('estimatedSavings' in suggestion);
    });

    it('should throw error for missing player', () => {
      assert.throws(() => {
        ai.suggestStructuring('nonexistent', { players: [] });
      }, /Player not found/);
    });
  });

  // Edge Cases
  describe('edge cases', () => {
    it('should handle null memory layer', () => {
      const aiWithNullMemory = new TaxPlanningAI(null);
      const gameState = {
        turn: 1,
        players: [{ id: 'player1' }],
        properties: []
      };
      const plan = aiWithNullMemory.getTaxOptimizationPlan('player1', gameState);
      assert.ok(plan);
    });

    it('should handle property with no rent', () => {
      const gameState = {
        properties: [{
          id: 'prop1',
          purchasePrice: 10000,
          rent: 0,
          ownerId: 'player1'
        }],
        players: [{ id: 'player1' }]
      };
      const roi = ai.getPostTaxROI('prop1', gameState);
      assert.strictEqual(roi.grossROI, 0);
    });
  });
});