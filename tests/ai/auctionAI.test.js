/**
 * Tests for AuctionAI
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AuctionAI } from '../../src/game/ai/auction/auctionAI.js';

function createMockMemoryLayer() {
  return {
    l0: { events: [] },
    l1: { getRecent: () => [] },
    l2: { getDecisions: () => [] },
  };
}

function createMockOpponentModel() {
  return {
    getProfile: (id) => ({
      id,
      aggressiveness: 0.5,
      overbidTendency: 0.3,
      style: 'balanced',
    }),
  };
}

function createGameState(overrides = {}) {
  return {
    turn: 5,
    currentPlayerIndex: 0,
    players: [
      { id: 'p1', name: 'Player 1', money: 1500, properties: [] },
      { id: 'p2', name: 'Player 2', money: 1200, properties: [] },
      { id: 'p3', name: 'Player 3', money: 1000, properties: [] },
    ],
    tiles: [
      { id: 1, type: 'property', name: 'Mediterranean', price: 60, rent: [2, 10, 30, 90, 160, 250], colorGroup: 'brown' },
      { id: 2, type: 'property', name: 'Baltic', price: 60, rent: [4, 20, 60, 180, 320, 450], colorGroup: 'brown' },
      { id: 3, type: 'chance', name: 'Chance' },
      { id: 4, type: 'property', name: 'Oriental', price: 100, rent: [6, 30, 90, 270, 400, 550], colorGroup: 'lightblue' },
      { id: 5, type: 'property', name: 'Vermont', price: 100, rent: [6, 30, 90, 270, 400, 550], colorGroup: 'lightblue' },
      { id: 6, type: 'property', name: 'Connecticut', price: 120, rent: [8, 40, 100, 300, 450, 600], colorGroup: 'lightblue' },
    ],
    properties: [
      { id: 1, name: 'Mediterranean', price: 60, rent: [2, 10, 30, 90, 160, 250], colorGroup: 'brown', owner: null },
      { id: 2, name: 'Baltic', price: 60, rent: [4, 20, 60, 180, 320, 450], colorGroup: 'brown', owner: null },
      { id: 4, name: 'Oriental', price: 100, rent: [6, 30, 90, 270, 400, 550], colorGroup: 'lightblue', owner: 'p1' },
      { id: 5, name: 'Vermont', price: 100, rent: [6, 30, 90, 270, 400, 550], colorGroup: 'lightblue', owner: null },
      { id: 6, name: 'Connecticut', price: 120, rent: [8, 40, 100, 300, 450, 600], colorGroup: 'lightblue', owner: null },
    ],
    ...overrides,
  };
}

describe('AuctionAI', () => {
  describe('constructor', () => {
    it('creates instance with memory and opponent model', () => {
      const ai = new AuctionAI(createMockMemoryLayer(), createMockOpponentModel());
      assert.ok(ai.memory);
      assert.ok(ai.opponentModel);
      assert.ok(Array.isArray(ai.bidHistory));
    });

    it('creates instance without dependencies', () => {
      const ai = new AuctionAI();
      assert.ok(ai.bidHistory);
    });
  });

  describe('calculateOptimalBid', () => {
    it('returns bid object with required fields', () => {
      const ai = new AuctionAI();
      const result = ai.calculateOptimalBid(1, createGameState());
      
      assert.ok(typeof result.bid === 'number');
      assert.ok(typeof result.confidence === 'number');
      assert.ok(typeof result.reasoning === 'string');
    });

    it('calculates bid based on property value', () => {
      const ai = new AuctionAI();
      const result = ai.calculateOptimalBid(1, createGameState());
      
      // Should be a positive number
      assert.ok(result.bid > 0);
      // Should be reasonable relative to property price (60)
      assert.ok(result.bid <= 120); // Max 2x price
    });

    it('stores bid in history', () => {
      const ai = new AuctionAI();
      const initialLength = ai.bidHistory.length;
      
      ai.calculateOptimalBid(1, createGameState());
      
      assert.strictEqual(ai.bidHistory.length, initialLength + 1);
      assert.strictEqual(ai.bidHistory[ai.bidHistory.length - 1].propertyId, 1);
    });

    it('confidence is between 0 and 1', () => {
      const ai = new AuctionAI();
      const result = ai.calculateOptimalBid(1, createGameState());
      
      assert.ok(result.confidence >= 0);
      assert.ok(result.confidence <= 1);
    });
  });

  describe('shouldParticipate', () => {
    it('returns true for high-value properties', () => {
      const ai = new AuctionAI();
      const result = ai.shouldParticipate(4, createGameState()); // Oriental at 100
      
      assert.strictEqual(result, true);
    });

    it('returns false for very low value properties', () => {
      const ai = new AuctionAI();
      const gs = createGameState({
        tiles: [{ id: 99, type: 'property', name: 'Fake', price: 10 }]
      });
      const result = ai.shouldParticipate(99, gs);
      
      assert.strictEqual(result, false);
    });

    it('returns false when player cannot afford', () => {
      const ai = new AuctionAI();
      const gs = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 20, properties: [] }]
      });
      const result = ai.shouldParticipate(1, gs);
      
      assert.strictEqual(result, false);
    });

    it('returns true for monopoly potential properties', () => {
      const ai = new AuctionAI();
      // Player owns Oriental, Vermont available - 2/3 of lightblue
      const gs = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 4, colorGroup: 'lightblue' }] }],
        properties: [
          { id: 4, colorGroup: 'lightblue', owner: 'p1' },
          { id: 5, colorGroup: 'lightblue', owner: null },
          { id: 6, colorGroup: 'lightblue', owner: null },
        ]
      });
      const result = ai.shouldParticipate(5, gs);
      
      assert.strictEqual(result, true);
    });
  });

  describe('adjustBidFromOpponents', () => {
    it('increases bid for aggressive opponents', () => {
      const ai = new AuctionAI(createMockMemoryLayer(), {
        getProfile: () => ({ aggressiveness: 0.9 })
      });
      
      const opponents = [{ id: 'p2' }];
      const adjusted = ai.adjustBidFromOpponents(100, opponents, 1, createGameState());
      
      assert.ok(adjusted > 100);
    });

    it('caps bid at max affordable', () => {
      const ai = new AuctionAI();
      const gs = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 100, properties: [] }]
      });
      
      const adjusted = ai.adjustBidFromOpponents(50, [{ id: 'p2' }], 1, gs);
      
      assert.ok(adjusted <= gs.players[0].money * 0.85);
    });
  });

  describe('assessPropertyValue', () => {
    it('returns property price as base', () => {
      const ai = new AuctionAI();
      const value = ai.assessPropertyValue(1, createGameState());
      
      assert.ok(value >= 60); // Base price
    });

    it('returns default for unknown property', () => {
      const ai = new AuctionAI();
      const value = ai.assessPropertyValue(999, createGameState());
      
      assert.strictEqual(value, 50);
    });

    it('increases value for monopoly potential', () => {
      const ai = new AuctionAI();
      // p1 already owns 2 brown properties (id 1 and 2), so id 2 would complete monopoly
      const gsWithMonopoly = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1, colorGroup: 'brown' }, { id: 2, colorGroup: 'brown' }] }]
      });
      // id 1 would NOT complete monopoly (only 1 of 3 brown properties)
      const gsNoMonopoly = createGameState();

      // Property 1 (brown) should be worth more when it completes a monopoly
      const valueComplete = ai.assessPropertyValue(1, gsWithMonopoly);
      const valueNoComplete = ai.assessPropertyValue(1, gsNoMonopoly);

      assert.ok(valueComplete > valueNoComplete, `Expected ${valueComplete} > ${valueNoComplete}`);
    });
  });

  describe('calculateWinProbability', () => {
    it('returns value between 0 and 1', () => {
      const ai = new AuctionAI();
      const prob = ai.calculateWinProbability(1, createGameState());
      
      assert.ok(prob >= 0.1);
      assert.ok(prob <= 0.9);
    });

    it('higher wealth increases win probability', () => {
      const ai = new AuctionAI();
      
      const richGs = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 5000, properties: [] }]
      });
      
      const poorGs = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 100, properties: [] }]
      });
      
      const richProb = ai.calculateWinProbability(1, richGs);
      const poorProb = ai.calculateWinProbability(1, poorGs);
      
      assert.ok(richProb > poorProb);
    });
  });

  describe('adjustForPhase', () => {
    it('returns early for turn <= 5', () => {
      const ai = new AuctionAI();
      assert.strictEqual(ai.adjustForPhase({ turn: 1 }), 'early');
      assert.strictEqual(ai.adjustForPhase({ turn: 5 }), 'early');
    });

    it('returns mid for turn 6-15', () => {
      const ai = new AuctionAI();
      assert.strictEqual(ai.adjustForPhase({ turn: 6 }), 'mid');
      assert.strictEqual(ai.adjustForPhase({ turn: 15 }), 'mid');
    });

    it('returns late for turn > 15', () => {
      const ai = new AuctionAI();
      assert.strictEqual(ai.adjustForPhase({ turn: 16 }), 'late');
      assert.strictEqual(ai.adjustForPhase({ turn: 30 }), 'late');
    });
  });

  describe('getMonopolyPotential', () => {
    it('returns 1.0 when player owns all of color group', () => {
      const ai = new AuctionAI();
      // 2 brown properties exist, player owns both
      const gs = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1, colorGroup: 'brown' }, { id: 2, colorGroup: 'brown' }] }],
        properties: [
          { id: 1, colorGroup: 'brown', owner: 'p1' },
          { id: 2, colorGroup: 'brown', owner: 'p1' },
        ]
      });
      
      const potential = ai.getMonopolyPotential(1, gs);
      assert.strictEqual(potential, 1.0);
    });

    it('returns 0 for ungrouped properties', () => {
      const ai = new AuctionAI();
      const gs = createGameState({
        properties: [{ id: 3, type: 'chance' }]
      });
      
      const potential = ai.getMonopolyPotential(3, gs);
      assert.strictEqual(potential, 0);
    });

    it('returns high potential when one away from monopoly', () => {
      const ai = new AuctionAI();
      const gs = createGameState({
        players: [{ id: 'p1', name: 'Player 1', money: 1500, properties: [{ id: 1, colorGroup: 'brown' }] }],
        properties: [
          { id: 1, colorGroup: 'brown', owner: 'p1' },
          { id: 2, colorGroup: 'brown', owner: null },
        ]
      });
      
      const potential = ai.getMonopolyPotential(2, gs);
      assert.ok(potential >= 0.9);
    });
  });
});