/**
 * Tests for AuctionStrategy
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AuctionStrategy } from '../../src/game/ai/auction/auctionStrategy.js';

function createGameState(overrides = {}) {
  return {
    turn: 5,
    currentPlayerIndex: 0,
    players: [
      { id: 'p1', name: 'Player 1', money: 1500, properties: [] },
      { id: 'p2', name: 'Player 2', money: 1200, properties: [] },
    ],
    ...overrides,
  };
}

describe('AuctionStrategy', () => {
  describe('constructor', () => {
    it('initializes with default strategies', () => {
      const strategy = new AuctionStrategy();
      assert.ok(strategy.strategies);
      assert.ok(strategy.strategies.size > 0);
    });

    it('has all pre-built strategies', () => {
      const strategy = new AuctionStrategy();
      assert.ok(strategy.strategies.has('conservative'));
      assert.ok(strategy.strategies.has('aggressive'));
      assert.ok(strategy.strategies.has('opportunistic'));
    });
  });

  describe('getConservativeBidder', () => {
    it('returns strategy with low bid ratio', () => {
      const strategy = new AuctionStrategy();
      const result = strategy.getConservativeBidder();
      
      assert.strictEqual(result.name, 'conservative');
      assert.ok(result.bidRatio <= 0.75);
    });

    it('strategy has phase modification function', () => {
      const strategy = new AuctionStrategy();
      const result = strategy.getConservativeBidder();
      
      assert.ok(typeof result.modifyForPhase === 'function');
      const earlyMod = result.modifyForPhase('early');
      assert.ok(earlyMod.bidRatio > result.bidRatio);
    });
  });

  describe('getAggressiveBidder', () => {
    it('returns strategy with high bid ratio', () => {
      const strategy = new AuctionStrategy();
      const result = strategy.getAggressiveBidder();
      
      assert.strictEqual(result.name, 'aggressive');
      assert.ok(result.bidRatio >= 0.9);
    });

    it('allows high overpay in early phase', () => {
      const strategy = new AuctionStrategy();
      const result = strategy.getAggressiveBidder();
      
      const earlyMod = result.modifyForPhase('early');
      assert.ok(earlyMod.maxOverpay >= 0.4);
    });
  });

  describe('getOpportunisticBidder', () => {
    it('returns strategy with threshold', () => {
      const strategy = new AuctionStrategy();
      const result = strategy.getOpportunisticBidder();
      
      assert.strictEqual(result.name, 'opportunistic');
      assert.ok(result.threshold >= 0.5);
    });
  });

  describe('selectStrategy', () => {
    it('returns aggressive for high-value early game property', () => {
      const strategy = new AuctionStrategy();
      const gs = createGameState({ turn: 3 });
      const result = strategy.selectStrategy(gs, 250);
      
      assert.strictEqual(result.name, 'aggressive');
    });

    it('returns conservative when low on money', () => {
      const strategy = new AuctionStrategy();
      const gs = createGameState({
        players: [{ id: 'p1', money: 100, properties: [] }]
      });
      const result = strategy.selectStrategy(gs, 100);
      
      assert.strictEqual(result.name, 'conservative');
    });

    it('returns opportunistic for late game monopoly chance', () => {
      const strategy = new AuctionStrategy();
      const gs = createGameState({
        turn: 20,
        players: [{ id: 'p1', money: 1500, properties: [{ id: 4, colorGroup: 'lightblue' }, { id: 5, colorGroup: 'lightblue' }] }]
      });
      const result = strategy.selectStrategy(gs, 100);
      
      assert.strictEqual(result.name, 'opportunistic');
    });
  });

  describe('modifyForOpponent', () => {
    it('increases bid ratio against conservative opponents', () => {
      const strategy = new AuctionStrategy();
      const base = strategy.getConservativeBidder();
      const modified = strategy.modifyForOpponent(base, { conservatism: 0.8 });
      
      assert.ok(modified.bidRatio >= base.bidRatio);
    });

    it('adjusts strategy against aggressive opponents', () => {
      const strategy = new AuctionStrategy();
      const base = strategy.getConservativeBidder();
      const modified = strategy.modifyForOpponent(base, { aggressiveness: 0.9 });
      
      assert.ok(typeof modified.bidRatio === 'number');
    });

    it('returns base strategy for null opponent', () => {
      const strategy = new AuctionStrategy();
      const base = strategy.getConservativeBidder();
      const modified = strategy.modifyForOpponent(base, null);
      
      assert.deepStrictEqual(modified, base);
    });
  });

  describe('getStrategyNames', () => {
    it('returns array of strategy names', () => {
      const strategy = new AuctionStrategy();
      const names = strategy.getStrategyNames();
      
      assert.ok(Array.isArray(names));
      assert.ok(names.includes('conservative'));
      assert.ok(names.includes('aggressive'));
    });
  });

  describe('assessCompetitivePressure', () => {
    it('returns higher pressure with more players', () => {
      const strategy = new AuctionStrategy();
      
      const lowPressure = strategy.assessCompetitivePressure({
        players: [{ id: 'p1' }, { id: 'p2' }]
      });
      
      const highPressure = strategy.assessCompetitivePressure({
        players: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }, { id: 'p5' }]
      });
      
      assert.ok(highPressure > lowPressure);
    });
  });
});