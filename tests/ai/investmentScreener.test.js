/**
 * InvestmentScreener Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { InvestmentScreener } from '../../src/game/ai/invest/investmentScreener.js';

function createGameState(overrides = {}) {
  return {
    turn: 5,
    tiles: [
      { 
        id: 1, 
        type: 'property', 
        name: 'Mediterranean', 
        price: 60, 
        colorGroup: 'brown',
        rent: 2,
        houseCost: 50,
      },
      { 
        id: 2, 
        type: 'property', 
        name: 'Baltic', 
        price: 60, 
        colorGroup: 'brown',
        rent: 4,
        houseCost: 50,
      },
      { 
        id: 3, 
        type: 'property', 
        name: 'Park Place', 
        price: 350, 
        colorGroup: 'darkBlue',
        rent: 35,
        houseCost: 200,
      },
      { 
        id: 4, 
        type: 'property', 
        name: 'Boardwalk', 
        price: 400, 
        colorGroup: 'darkBlue',
        rent: 50,
        houseCost: 200,
      },
      { id: 5, type: 'chance', name: 'Chance' },
      { id: 6, type: 'property', name: 'St. James', price: 180, colorGroup: 'orange', rent: 14, houseCost: 100 },
      { id: 7, type: 'property', name: 'Tennessee', price: 180, colorGroup: 'orange', rent: 14, houseCost: 100 },
      { id: 8, type: 'property', name: 'New York', price: 200, colorGroup: 'red', rent: 16, houseCost: 100 },
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 1500, properties: [], isCurrent: true },
      { id: 'p2', name: 'Player 2', money: 1200, properties: [] },
    ],
    ...overrides,
  };
}

describe('InvestmentScreener', () => {
  describe('constructor', () => {
    it('creates screener', () => {
      const screener = new InvestmentScreener();
      assert.ok(screener);
      assert.ok(screener.valuation);
    });

    it('has correct default thresholds', () => {
      const screener = new InvestmentScreener();
      assert.strictEqual(screener.defaultThresholds.minROI, 5);
      assert.strictEqual(screener.defaultThresholds.maxRisk, 'medium');
    });

    it('has color risk factors', () => {
      const screener = new InvestmentScreener();
      assert.strictEqual(screener.colorRiskFactors.brown.risk, 'low');
      assert.strictEqual(screener.colorRiskFactors.darkBlue.risk, 'high');
    });
  });

  describe('passesMinimumCriteria', () => {
    it('returns boolean for valid property', () => {
      const screener = new InvestmentScreener();
      const gameState = createGameState();
      
      const passes = screener.passesMinimumCriteria(1, gameState);
      assert.strictEqual(typeof passes, 'boolean');
    });

    it('returns false for non-existent property', () => {
      const screener = new InvestmentScreener();
      const gameState = createGameState();
      
      const passes = screener.passesMinimumCriteria(999, gameState);
      assert.strictEqual(passes, false);
    });

    it('returns false for owned properties', () => {
      const screener = new InvestmentScreener();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }] },
        ],
      });
      
      const passes = screener.passesMinimumCriteria(1, gameState);
      assert.strictEqual(passes, false);
    });
  });

  describe('scoreProperty', () => {
    it('returns score between 0 and 100', () => {
      const screener = new InvestmentScreener();
      const gameState = createGameState();
      
      const score = screener.scoreProperty(1, 'p1', gameState);
      assert.ok(score >= 0);
      assert.ok(score <= 100);
    });

    it('returns 0 for non-existent property', () => {
      const screener = new InvestmentScreener();
      const gameState = createGameState();
      
      const score = screener.scoreProperty(999, 'p1', gameState);
      assert.strictEqual(score, 0);
    });

    it('returns positive score for valid property', () => {
      const screener = new InvestmentScreener();
      const gameState = createGameState();
      
      const score = screener.scoreProperty(1, 'p1', gameState);
      assert.ok(score > 0);
    });
  });

  describe('filterByROI', () => {
    it('returns filtered array of properties', () => {
      const screener = new InvestmentScreener();
      const gameState = createGameState();
      
      const filtered = screener.filterByROI(5, gameState);
      assert.ok(Array.isArray(filtered));
    });

    it('includes property details', () => {
      const screener = new InvestmentScreener();
      const gameState = createGameState();
      
      const filtered = screener.filterByROI(0, gameState);
      
      if (filtered.length > 0) {
        assert.ok(filtered[0].hasOwnProperty('propertyId'));
        assert.ok(filtered[0].hasOwnProperty('propertyName'));
        assert.ok(filtered[0].hasOwnProperty('roi'));
      }
    });

    it('sorts by ROI descending', () => {
      const screener = new InvestmentScreener();
      const gameState = createGameState();
      
      const filtered = screener.filterByROI(0, gameState);
      
      if (filtered.length > 1) {
        for (let i = 1; i < filtered.length; i++) {
          assert.ok(filtered[i-1].roi >= filtered[i].roi);
        }
      }
    });
  });

  describe('filterByRisk', () => {
    it('returns filtered array of properties', () => {
      const screener = new InvestmentScreener();
      const gameState = createGameState();
      
      const filtered = screener.filterByRisk('high', gameState);
      assert.ok(Array.isArray(filtered));
    });

    it('returns all properties for high max risk', () => {
      const screener = new InvestmentScreener();
      const gameState = createGameState();
      
      const filtered = screener.filterByRisk('high', gameState);
      assert.ok(filtered.length > 0);
    });

    it('includes risk level in results', () => {
      const screener = new InvestmentScreener();
      const gameState = createGameState();
      
      const filtered = screener.filterByRisk('medium', gameState);
      
      if (filtered.length > 0) {
        assert.ok(filtered[0].hasOwnProperty('risk'));
        assert.ok(['low', 'medium', 'high'].includes(filtered[0].risk));
      }
    });
  });

  describe('filterByLocation', () => {
    it('returns sorted array by location', () => {
      const screener = new InvestmentScreener();
      const gameState = createGameState();
      
      const filtered = screener.filterByLocation(gameState);
      assert.ok(Array.isArray(filtered));
    });

    it('includes location score', () => {
      const screener = new InvestmentScreener();
      const gameState = createGameState();
      
      const filtered = screener.filterByLocation(gameState);
      
      if (filtered.length > 0) {
        assert.ok(filtered[0].hasOwnProperty('locationScore'));
        assert.ok(typeof filtered[0].locationScore === 'number');
      }
    });

    it('sorts by location score descending', () => {
      const screener = new InvestmentScreener();
      const gameState = createGameState();
      
      const filtered = screener.filterByLocation(gameState);
      
      if (filtered.length > 1) {
        assert.ok(filtered[0].locationScore >= filtered[1].locationScore);
      }
    });
  });
});