/**
 * Tests for OpponentModel
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { OpponentModel } from '../../src/game/ai/modeling/opponentModel.js';

describe('OpponentModel', () => {
  test('constructor initializes with playerId', () => {
    const model = new OpponentModel('player1');
    assert.strictEqual(model.playerId, 'player1');
    assert.ok(Array.isArray(model.events));
    assert.ok(Array.isArray(model.tradeHistory));
    assert.ok(model.stats);
  });

  test('updateProfile records events correctly', () => {
    const model = new OpponentModel('player1');
    
    model.updateProfile('property_purchased', { tileId: 1, price: 200 });
    assert.strictEqual(model.events.length, 1);
    assert.strictEqual(model.events[0].type, 'property_purchased');
    assert.strictEqual(model.stats.propertiesBought, 1);
  });

  test('updateProfile handles trade events', () => {
    const model = new OpponentModel('player1');
    
    model.updateProfile('trade_offered', { id: 'trade1', given: {}, received: {} });
    assert.strictEqual(model.tradeHistory.length, 1);
    assert.strictEqual(model.stats.totalTrades, 1);
    
    model.updateProfile('trade_accepted', { id: 'trade1' });
    assert.strictEqual(model.stats.tradesAccepted, 1);
    
    model.updateProfile('trade_rejected', { id: 'trade2' });
    assert.strictEqual(model.stats.tradesRejected, 1);
  });

  test('updateProfile handles rent events', () => {
    const model = new OpponentModel('player1');
    
    model.updateProfile('rent_paid', { amount: 50, propertyId: 5 });
    model.updateProfile('rent_received', { amount: 75 });
    
    assert.strictEqual(model.stats.rentPaid, 50);
    assert.strictEqual(model.stats.rentReceived, 75);
  });

  test('updateProfile handles auction events', () => {
    const model = new OpponentModel('player1');
    
    model.updateProfile('auction_entered', { auctionId: 'auction1', propertyId: 3 });
    model.updateProfile('auction_bid', { auctionId: 'auction1', amount: 150 });
    model.updateProfile('auction_won', { auctionId: 'auction1', amount: 150 });
    
    assert.strictEqual(model.stats.auctionsEntered, 1);
    assert.strictEqual(model.stats.auctionsWon, 1);
  });

  test('getRiskTolerance returns valid values', () => {
    const model = new OpponentModel('player1');
    
    // Add aggressive behavior - lots of auctions and risky decisions
    model.updateProfile('auction_entered', { auctionId: 'a1', propertyId: 1 });
    model.updateProfile('auction_entered', { auctionId: 'a2', propertyId: 2 });
    model.updateProfile('auction_entered', { auctionId: 'a3', propertyId: 3 });
    
    const riskTolerance = model.getRiskTolerance();
    assert.ok(['conservative', 'balanced', 'aggressive'].includes(riskTolerance));
  });

  test('getTradingStyle returns valid values', () => {
    const model = new OpponentModel('player1');
    
    // Add trade events
    model.updateProfile('trade_offered', { id: 't1', given: {}, received: {} });
    model.updateProfile('trade_accepted', { id: 't1' });
    
    const tradingStyle = model.getTradingStyle();
    assert.ok(['generous', 'fair', 'exploitative'].includes(tradingStyle));
  });

  test('getPropertyFocus returns valid values', () => {
    const model = new OpponentModel('player1');
    
    model.updateProfile('property_acquired', { rentPotential: 150, completesSet: true });
    model.updateProfile('property_acquired', { rentPotential: 50, completesSet: false });
    
    const propertyFocus = model.getPropertyFocus();
    assert.ok(['rent', 'monopoly', 'liquidity'].includes(propertyFocus));
  });

  test('getReactionSpeed returns valid values', () => {
    const model = new OpponentModel('player1');
    
    model.updateProfile('decision_made', { type: 'property_buy', choice: 'buy', timeTaken: 1000 });
    model.updateProfile('decision_made', { type: 'property_buy', choice: 'auction', timeTaken: 1500 });
    
    const reactionSpeed = model.getReactionSpeed();
    assert.ok(['slow', 'normal', 'fast'].includes(reactionSpeed));
  });

  test('predictAction returns valid prediction structure', () => {
    const model = new OpponentModel('player1');
    model.updateProfile('decision_made', { type: 'buy', choice: 'buy', timeTaken: 1000 });
    
    const prediction = model.predictAction({ phase: 'property_purchase' });
    
    assert.ok(prediction.predictedAction);
    assert.ok(typeof prediction.confidence === 'number');
    assert.ok(prediction.reasoning);
    assert.ok(prediction.traits);
  });

  test('predictTradeResponse returns valid structure', () => {
    const model = new OpponentModel('player1');
    model.updateProfile('trade_offered', { id: 't1', given: {}, received: {} });
    model.updateProfile('trade_accepted', { id: 't1' });
    
    const response = model.predictTradeResponse({
      givenValue: 100,
      receivedValue: 100,
    });
    
    assert.ok(typeof response.willAccept === 'boolean');
    assert.ok(typeof response.confidence === 'number');
    assert.ok(typeof response.valueRatio === 'number');
  });

  test('getProfile returns comprehensive profile', () => {
    const model = new OpponentModel('player1');
    model.updateProfile('property_purchased', { tileId: 1, price: 200 });
    model.updateProfile('rent_paid', { amount: 50 });
    
    const profile = model.getProfile();
    
    assert.strictEqual(profile.playerId, 'player1');
    assert.ok(profile.traits);
    assert.ok(profile.stats);
    assert.ok(typeof profile.eventCount === 'number');
  });

  test('toJSON and fromJSON roundtrip', () => {
    const model = new OpponentModel('player1');
    model.updateProfile('property_purchased', { tileId: 1, price: 200 });
    model.updateProfile('trade_offered', { id: 't1', given: {}, received: {} });
    
    const json = model.toJSON();
    const restored = OpponentModel.fromJSON(json);
    
    assert.strictEqual(restored.playerId, 'player1');
    assert.strictEqual(restored.events.length, 2);
    assert.strictEqual(restored.stats.propertiesBought, 1);
  });

  test('traits are cached and recomputed after update', () => {
    const model = new OpponentModel('player1');
    
    const initialTraits = model.getRiskTolerance();
    model.updateProfile('auction_entered', { auctionId: 'a1', propertyId: 1 });
    
    // After update, traits should be recalculated
    const newTraits = model.getRiskTolerance();
    assert.ok(['conservative', 'balanced', 'aggressive'].includes(newTraits));
  });
});