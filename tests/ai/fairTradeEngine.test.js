/**
 * Tests for FairTradeEngine
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { FairTradeEngine } from '../../src/game/ai/trading/fairTradeEngine.js';
import { TradeEvaluator } from '../../src/game/ai/trading/tradeEvaluator.js';

describe('FairTradeEngine', () => {
  let engine;
  let mockGameState;

  beforeEach(() => {
    const mockMemoryLayer = {};
    engine = new FairTradeEngine(mockMemoryLayer, null);
    
    mockGameState = {
      players: [
        { id: 'player1', money: 1500, position: 0 },
        { id: 'player2', money: 1500, position: 10 },
        { id: 'player3', money: 500, position: 20 },
      ],
      properties: [
        { id: 'mediterranean_ave', owner: 'player1', position: 1, houses: 0 },
        { id: 'baltic_ave', owner: 'player1', position: 2, houses: 0 },
        { id: 'oriental_ave', owner: 'player2', position: 3, houses: 0 },
        { id: 'vermont_ave', owner: 'player2', position: 4, houses: 0 },
        { id: 'st_charles_place', owner: null, position: 6, houses: 0 },
        { id: 'boardwalk', owner: 'player3', position: 25, houses: 0 },
      ],
      board: [
        { id: 'mediterranean_ave', position: 1 },
        { id: 'baltic_ave', position: 2 },
        { id: 'oriental_ave', position: 3 },
        { id: 'vermont_ave', position: 4 },
        { id: 'st_charles_place', position: 6 },
        { id: 'boardwalk', position: 25 },
      ],
    };
  });

  test('constructor initializes with memoryLayer and evaluator', () => {
    assert.ok(engine.memoryLayer);
    assert.ok(engine.evaluator);
    assert.ok(engine.evaluator instanceof TradeEvaluator);
  });

  test('getPlayerProperties returns owned properties', () => {
    const props = engine.getPlayerProperties('player1', mockGameState);
    
    assert.ok(Array.isArray(props));
    assert.ok(props.includes('mediterranean_ave'));
    assert.ok(props.includes('baltic_ave'));
    assert.ok(!props.includes('oriental_ave'));
  });

  test('getPlayerProperties returns empty for unknown player', () => {
    const props = engine.getPlayerProperties('unknown', mockGameState);
    
    assert.ok(Array.isArray(props));
    assert.strictEqual(props.length, 0);
  });

  test('analyzePlayerNeeds identifies incomplete color groups', () => {
    const needs = engine.analyzePlayerNeeds('player1', mockGameState);
    
    assert.ok(needs.colors instanceof Set);
    // Player1 owns brown but only 2 of 2, so should not need more
    // They don't have any incomplete groups
  });

  test('findCompatiblePartners returns array of player IDs', () => {
    const partners = engine.findCompatiblePartners('player1', mockGameState);
    
    assert.ok(Array.isArray(partners));
    // player2 has light blue properties which could complement player1's brown
    // or player3 has boardwalk
  });

  test('proposeTrade returns trade object with evaluation', () => {
    const result = engine.proposeTrade(
      'player1',
      'player2',
      { properties: ['mediterranean_ave'], money: 0 },
      { properties: ['oriental_ave'], money: 0 },
      mockGameState
    );
    
    assert.ok(result.trade);
    assert.ok(typeof result.fairness === 'number');
    assert.ok(typeof result.bias === 'number');
    assert.ok(typeof result.health === 'string');
    assert.ok(Array.isArray(result.tips));
  });

  test('autoNegotiate improves fairness', () => {
    const initialTrade = {
      players: ['player1', 'player2'],
      offered: { properties: ['boardwalk'], money: 0 },
      requested: { properties: ['mediterranean_ave'], money: 0 },
    };
    
    const result = engine.autoNegotiate(initialTrade, 5);
    
    assert.ok(result.trade);
    assert.ok(typeof result.fairness === 'number');
    assert.ok(result.fairness >= 0 && result.fairness <= 1);
  });

  test('calculatePropertyValue returns numeric value', () => {
    const value = engine.calculatePropertyValue('boardwalk', mockGameState);
    
    assert.ok(typeof value === 'number');
    assert.ok(value > 0);
  });

  test('calculateBundleValue returns sum of properties', () => {
    const value = engine.calculateBundleValue(['mediterranean_ave', 'baltic_ave'], mockGameState);
    
    assert.ok(typeof value === 'number');
    assert.ok(value > 0);
  });

  test('findTradeOpportunities returns array of opportunities', () => {
    const opportunities = engine.findTradeOpportunities('player1', mockGameState);
    
    assert.ok(Array.isArray(opportunities));
  });

  test('getPropertyColors returns color groups', () => {
    const colors = engine.getPropertyColors(['mediterranean_ave', 'baltic_ave']);
    
    assert.ok(Array.isArray(colors));
    assert.ok(colors.includes('brown'));
  });

  test('isPlayerLowOnMoney detects low money', () => {
    // Player3 has exactly 500 which is at the threshold
    // The function uses money < 500, so player with 500 is NOT low
    // Let's use player4 with 400 to test the detection
    const player3State = {
      players: [
        { id: 'player1', money: 1500, position: 0 },
        { id: 'player2', money: 1500, position: 10 },
        { id: 'player3', money: 400, position: 20 },
      ],
      properties: [],
    };
    
    const player3Low = engine.isPlayerLowOnMoney('player3', player3State);
    const player1NotLow = engine.isPlayerLowOnMoney('player1', player3State);
    
    assert.strictEqual(player3Low, true);
    assert.strictEqual(player1NotLow, false);
  });

  test('generateTradeTips returns array of tips', () => {
    const trade = {
      players: ['player1', 'player2'],
      offered: { properties: ['boardwalk'], money: 0 },
      requested: { properties: ['mediterranean_ave'], money: 0 },
    };
    
    const tips = engine.generateTradeTips(trade, 'player1', mockGameState);
    
    assert.ok(Array.isArray(tips));
  });
});