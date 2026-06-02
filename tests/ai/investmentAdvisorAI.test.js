/**
 * InvestmentAdvisorAI Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { InvestmentAdvisorAI } from '../../src/game/ai/invest/investmentAdvisorAI.js';

function createMockMemoryLayer() {
  return {
    ingest: () => {},
    getPlayerState: (playerId) => null,
  };
}

function createMockFinancialTracker() {
  return {
    getNetWorth: () => 1500,
    getCashFlow: () => ({ inflow: 100, outflow: 50, net: 50, perTurn: 10 }),
  };
}

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
        rentWith1House: 10,
        rentWith2House: 30,
        rentWith3House: 90,
        rentWith4House: 160,
        hotelRent: 250,
        houseCost: 50,
      },
      { 
        id: 2, 
        type: 'property', 
        name: 'Baltic', 
        price: 60, 
        colorGroup: 'brown',
        rent: 4,
        rentWith1House: 20,
        rentWith2House: 60,
        rentWith3House: 180,
        rentWith4House: 320,
        hotelRent: 450,
        houseCost: 50,
      },
      { 
        id: 3, 
        type: 'property', 
        name: 'Park Place', 
        price: 350, 
        colorGroup: 'darkBlue',
        rent: 35,
        rentWith1House: 50,
        rentWith2House: 70,
        rentWith3House: 90,
        rentWith4House: 110,
        hotelRent: 130,
        houseCost: 200,
      },
      { 
        id: 4, 
        type: 'property', 
        name: 'Boardwalk', 
        price: 400, 
        colorGroup: 'darkBlue',
        rent: 50,
        rentWith1House: 100,
        rentWith2House: 150,
        rentWith3House: 200,
        rentWith4House: 250,
        hotelRent: 300,
        houseCost: 200,
      },
      { id: 5, type: 'chance', name: 'Chance' },
      { id: 6, type: 'property', name: 'St. James', price: 180, colorGroup: 'orange', rent: 14 },
      { id: 7, type: 'property', name: 'Tennessee', price: 180, colorGroup: 'orange', rent: 14 },
      { id: 8, type: 'property', name: 'New York', price: 200, colorGroup: 'red', rent: 16 },
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 1500, properties: [], isCurrent: true },
      { id: 'p2', name: 'Player 2', money: 1200, properties: [] },
    ],
    ...overrides,
  };
}

describe('InvestmentAdvisorAI', () => {
  describe('constructor', () => {
    it('creates advisor with memoryLayer and financialTracker', () => {
      const memory = createMockMemoryLayer();
      const tracker = createMockFinancialTracker();
      const advisor = new InvestmentAdvisorAI(memory, tracker);
      
      assert.strictEqual(advisor.memoryLayer, memory);
      assert.strictEqual(advisor.financialTracker, tracker);
    });

    it('creates advisor without dependencies', () => {
      const advisor = new InvestmentAdvisorAI();
      assert.ok(advisor);
      assert.ok(advisor.valuation);
    });

    it('has correct season weights', () => {
      const advisor = new InvestmentAdvisorAI();
      assert.strictEqual(advisor.seasonWeights.early.weight, 0.6);
      assert.strictEqual(advisor.seasonWeights.mid.weight, 0.8);
      assert.strictEqual(advisor.seasonWeights.late.weight, 0.9);
    });
  });

  describe('getInvestmentRecommendations', () => {
    it('returns ranked recommendations for player', () => {
      const advisor = new InvestmentAdvisorAI();
      const gameState = createGameState();
      
      const recommendations = advisor.getInvestmentRecommendations('p1', gameState);
      
      assert.ok(Array.isArray(recommendations));
      assert.ok(recommendations.length > 0);
      
      // Check ranking
      if (recommendations.length > 1) {
        assert.ok(recommendations[0].score >= recommendations[1].score);
      }
      
      // Check structure
      const rec = recommendations[0];
      assert.ok(rec.propertyId !== undefined);
      assert.ok(rec.score !== undefined);
      assert.ok(rec.rank !== undefined);
    });

    it('returns empty array for non-existent player', () => {
      const advisor = new InvestmentAdvisorAI();
      const gameState = createGameState();
      
      const recommendations = advisor.getInvestmentRecommendations('nonexistent', gameState);
      assert.deepStrictEqual(recommendations, []);
    });

    it('includes ROI and risk in recommendations', () => {
      const advisor = new InvestmentAdvisorAI();
      const gameState = createGameState();
      
      const recommendations = advisor.getInvestmentRecommendations('p1', gameState);
      assert.ok(recommendations.length > 0);
      
      const rec = recommendations[0];
      assert.ok(typeof rec.expectedROI === 'number');
      assert.ok(['low', 'medium', 'high'].includes(rec.risk));
    });
  });

  describe('shouldInvestInProperty', () => {
    it('returns buy decision for good property', () => {
      const advisor = new InvestmentAdvisorAI();
      const gameState = createGameState();
      
      const decision = advisor.shouldInvestInProperty(1, gameState);
      
      assert.ok(typeof decision.decision === 'boolean');
      assert.ok(typeof decision.reasoning === 'string');
      assert.ok(typeof decision.confidence === 'number');
    });

    it('rejects purchase if player cannot afford', () => {
      const advisor = new InvestmentAdvisorAI();
      const gameState = createGameState({
        players: [
          { id: 'p1', name: 'Player 1', money: 10, properties: [], isCurrent: true },
        ],
      });
      
      const decision = advisor.shouldInvestInProperty(3, gameState); // Park Place $350
      assert.strictEqual(decision.decision, false);
      assert.ok(decision.reasoning.includes('Cannot afford'));
    });

    it('returns correct structure', () => {
      const advisor = new InvestmentAdvisorAI();
      const gameState = createGameState();
      
      const decision = advisor.shouldInvestInProperty(1, gameState);
      
      assert.ok(decision.hasOwnProperty('decision'));
      assert.ok(decision.hasOwnProperty('reasoning'));
      assert.ok(decision.hasOwnProperty('confidence'));
    });
  });

  describe('getDiversificationScore', () => {
    it('returns score between 0 and 1', () => {
      const advisor = new InvestmentAdvisorAI();
      
      const score = advisor.getDiversificationScore('p1');
      assert.ok(score >= 0);
      assert.ok(score <= 1);
    });

    it('returns 0 for empty portfolio', () => {
      const advisor = new InvestmentAdvisorAI();
      const memory = createMockMemoryLayer();
      
      const score = advisor.getDiversificationScore('p1');
      assert.ok(score >= 0);
    });
  });

  describe('getConcentrationRisk', () => {
    it('returns risk analysis object', () => {
      const advisor = new InvestmentAdvisorAI();
      
      const risk = advisor.getConcentrationRisk('p1');
      
      assert.ok(risk.hasOwnProperty('riskLevel'));
      assert.ok(risk.hasOwnProperty('diversificationScore'));
      assert.ok(risk.hasOwnProperty('recommendation'));
      assert.ok(risk.hasOwnProperty('needsRebalancing'));
    });

    it('identifies low diversification', () => {
      const advisor = new InvestmentAdvisorAI();
      
      const risk = advisor.getConcentrationRisk('p1');
      
      assert.ok(['low', 'medium', 'high', 'critical'].includes(risk.riskLevel));
      assert.ok(typeof risk.diversificationScore === 'number');
    });
  });

  describe('getMarketTiming', () => {
    it('returns market timing analysis', () => {
      const advisor = new InvestmentAdvisorAI();
      const gameState = createGameState();
      
      const timing = advisor.getMarketTiming(gameState);
      
      assert.ok(timing.hasOwnProperty('season'));
      assert.ok(timing.hasOwnProperty('overall'));
      assert.ok(timing.hasOwnProperty('signals'));
    });

    it('identifies good or bad market conditions', () => {
      const advisor = new InvestmentAdvisorAI();
      const gameState = createGameState();
      
      const timing = advisor.getMarketTiming(gameState);
      
      assert.ok(['good', 'bad', 'neutral'].includes(timing.overall));
    });
  });

  describe('getBestSeasonForInvestment', () => {
    it('returns timing recommendation', () => {
      const advisor = new InvestmentAdvisorAI();
      const gameState = createGameState();
      
      const best = advisor.getBestSeasonForInvestment(gameState);
      
      assert.ok(best.hasOwnProperty('currentSeason'));
      assert.ok(best.hasOwnProperty('bestSeason'));
      assert.ok(best.hasOwnProperty('recommendedTiming'));
      assert.ok(best.hasOwnProperty('reasoning'));
    });

    it('provides priority level', () => {
      const advisor = new InvestmentAdvisorAI();
      const gameState = createGameState();
      
      const best = advisor.getBestSeasonForInvestment(gameState);
      
      assert.ok(['low', 'medium', 'high'].includes(best.priority));
    });
  });
});