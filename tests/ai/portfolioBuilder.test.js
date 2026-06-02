/**
 * PortfolioBuilder Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { PortfolioBuilder } from '../../src/game/ai/invest/portfolioBuilder.js';

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
      },
      { 
        id: 2, 
        type: 'property', 
        name: 'Baltic', 
        price: 60, 
        colorGroup: 'brown',
        rent: 4,
      },
      { 
        id: 3, 
        type: 'property', 
        name: 'Park Place', 
        price: 350, 
        colorGroup: 'darkBlue',
        rent: 35,
      },
      { 
        id: 4, 
        type: 'property', 
        name: 'Boardwalk', 
        price: 400, 
        colorGroup: 'darkBlue',
        rent: 50,
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

describe('PortfolioBuilder', () => {
  describe('constructor', () => {
    it('creates portfolio builder', () => {
      const builder = new PortfolioBuilder();
      assert.ok(builder);
      assert.ok(builder.valuation);
    });

    it('has correct target allocation', () => {
      const builder = new PortfolioBuilder();
      assert.strictEqual(builder.targetAllocation.brown, 0.05);
      assert.strictEqual(builder.targetAllocation.darkBlue, 0.10);
      assert.strictEqual(builder.targetAllocation.railroad, 0.05);
    });

    it('has correct concentration threshold', () => {
      const builder = new PortfolioBuilder();
      assert.strictEqual(builder.maxConcentration, 0.4);
    });
  });

  describe('buildOptimalPortfolio', () => {
    it('returns portfolio analysis for player', () => {
      const builder = new PortfolioBuilder();
      const gameState = createGameState();
      
      const portfolio = builder.buildOptimalPortfolio('p1', gameState);
      
      assert.ok(portfolio.hasOwnProperty('currentCount'));
      assert.ok(portfolio.hasOwnProperty('idealCount'));
      assert.ok(portfolio.hasOwnProperty('score'));
      assert.ok(portfolio.hasOwnProperty('recommendations'));
    });

    it('returns empty portfolio for non-existent player', () => {
      const builder = new PortfolioBuilder();
      const gameState = createGameState();
      
      const portfolio = builder.buildOptimalPortfolio('nonexistent', gameState);
      assert.deepStrictEqual(portfolio.portfolio, []);
      assert.strictEqual(portfolio.score, 0);
    });

    it('identifies missing groups', () => {
      const builder = new PortfolioBuilder();
      const gameState = createGameState();
      
      const portfolio = builder.buildOptimalPortfolio('p1', gameState);
      assert.ok(Array.isArray(portfolio.gaps?.missing));
    });

    it('calculates portfolio score', () => {
      const builder = new PortfolioBuilder();
      const gameState = createGameState();
      
      const portfolio = builder.buildOptimalPortfolio('p1', gameState);
      assert.ok(typeof portfolio.score === 'number');
      assert.ok(portfolio.score >= 0);
      assert.ok(portfolio.score <= 100);
    });
  });

  describe('suggestPropertyAddition', () => {
    it('suggests next best property', () => {
      const builder = new PortfolioBuilder();
      const gameState = createGameState();
      
      const suggestion = builder.suggestPropertyAddition([], gameState);
      
      assert.ok(suggestion.hasOwnProperty('suggestion'));
      assert.ok(suggestion.hasOwnProperty('reasoning'));
      assert.ok(suggestion.hasOwnProperty('score'));
    });

    it('returns alternatives', () => {
      const builder = new PortfolioBuilder();
      const gameState = createGameState();
      
      const suggestion = builder.suggestPropertyAddition([], gameState);
      
      assert.ok(Array.isArray(suggestion.alternatives));
    });

    it('handles no available properties', () => {
      const builder = new PortfolioBuilder();
      const gameState = createGameState({
        tiles: [
          { id: 1, type: 'property', name: 'Mediterranean', price: 60, colorGroup: 'brown' },
        ],
        players: [
          { id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1 }] },
        ],
      });
      
      const suggestion = builder.suggestPropertyAddition([{ id: 1 }], gameState);
      assert.strictEqual(suggestion.suggestion, null);
    });
  });

  describe('needsRebalancing', () => {
    it('returns boolean', () => {
      const builder = new PortfolioBuilder();
      const gameState = createGameState();
      
      const needsRebalancing = builder.needsRebalancing('p1', gameState);
      assert.strictEqual(typeof needsRebalancing, 'boolean');
    });

    it('returns true for highly concentrated portfolios', () => {
      const builder = new PortfolioBuilder();
      const gameState = createGameState({
        players: [
          { 
            id: 'p1', 
            name: 'Player 1', 
            money: 1500, 
            properties: [
              { id: 1, colorGroup: 'brown' },
              { id: 2, colorGroup: 'brown' },
              { id: 3, colorGroup: 'brown' },
            ], 
          },
        ],
      });
      
      const needsRebalancing = builder.needsRebalancing('p1', gameState);
      assert.strictEqual(needsRebalancing, true);
    });
  });

  describe('getRebalancingActions', () => {
    it('returns array of actions', () => {
      const builder = new PortfolioBuilder();
      const gameState = createGameState();
      
      const actions = builder.getRebalancingActions('p1', gameState);
      assert.ok(Array.isArray(actions));
    });

    it('returns empty array for non-existent player', () => {
      const builder = new PortfolioBuilder();
      const gameState = createGameState();
      
      const actions = builder.getRebalancingActions('nonexistent', gameState);
      assert.deepStrictEqual(actions, []);
    });

    it('includes action types', () => {
      const builder = new PortfolioBuilder();
      const gameState = createGameState({
        turn: 25,
        players: [
          { 
            id: 'p1', 
            name: 'Player 1', 
            money: 1500, 
            properties: [
              { id: 1, colorGroup: 'brown' },
              { id: 2, colorGroup: 'brown' },
            ], 
          },
        ],
      });
      
      const actions = builder.getRebalancingActions('p1', gameState);
      
      if (actions.length > 0) {
        assert.ok(actions[0].hasOwnProperty('type'));
        assert.ok(actions[0].hasOwnProperty('reason'));
        assert.ok(actions[0].hasOwnProperty('priority'));
      }
    });
  });
});