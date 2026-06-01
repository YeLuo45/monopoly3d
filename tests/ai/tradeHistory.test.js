/**
 * Tests for TradeHistory
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { TradeHistory } from '../../src/game/ai/trading/tradeHistory.js';

describe('TradeHistory', () => {
  let history;
  let mockMemoryLayer;

  beforeEach(() => {
    mockMemoryLayer = {
      currentGameId: 'game_123',
    };
    history = new TradeHistory(mockMemoryLayer);
  });

  test('constructor initializes empty', () => {
    assert.strictEqual(history.trades.length, 0);
    assert.strictEqual(history.nextTradeId, 1);
  });

  test('recordTrade adds trade with ID', () => {
    const trade = {
      players: ['player1', 'player2'],
      offered: { properties: ['prop1'], money: 100 },
      requested: { properties: ['prop2'], money: 0 },
      fairness: 0.8,
    };
    
    const recorded = history.recordTrade(trade);
    
    assert.ok(recorded.id);
    assert.ok(recorded.timestamp);
    assert.strictEqual(recorded.gameId, 'game_123');
  });

  test('recordTrade increments ID', () => {
    const trade1 = { players: ['p1', 'p2'], offered: {}, requested: {} };
    const trade2 = { players: ['p3', 'p4'], offered: {}, requested: {} };
    
    const recorded1 = history.recordTrade(trade1);
    const recorded2 = history.recordTrade(trade2);
    
    // IDs should be different
    assert.notStrictEqual(recorded1.id, recorded2.id);
  });

  test('getTradeHistory returns player trades', () => {
    history.recordTrade({
      players: ['player1', 'player2'],
      offered: { properties: ['prop1'], money: 0 },
      requested: { properties: ['prop2'], money: 0 },
    });
    history.recordTrade({
      players: ['player3', 'player4'],
      offered: { properties: ['prop3'], money: 0 },
      requested: { properties: ['prop4'], money: 0 },
    });
    
    const player1Trades = history.getTradeHistory('player1');
    
    assert.ok(Array.isArray(player1Trades));
    assert.strictEqual(player1Trades.length, 1);
  });

  test('getTradeHistory respects limit', () => {
    for (let i = 0; i < 25; i++) {
      history.recordTrade({
        players: ['player1', `player${i + 2}`],
        offered: { properties: [], money: 0 },
        requested: { properties: [], money: 0 },
      });
    }
    
    const recentTrades = history.getTradeHistory('player1', 5);
    
    assert.strictEqual(recentTrades.length, 5);
  });

  test('getPartnerHistory returns trades between two players', () => {
    history.recordTrade({
      players: ['player1', 'player2'],
      offered: { properties: ['prop1'], money: 0 },
      requested: { properties: ['prop2'], money: 0 },
    });
    history.recordTrade({
      players: ['player1', 'player3'],
      offered: { properties: ['prop3'], money: 0 },
      requested: { properties: ['prop4'], money: 0 },
    });
    
    const p1p2Trades = history.getPartnerHistory('player1', 'player2');
    
    assert.ok(Array.isArray(p1p2Trades));
    assert.strictEqual(p1p2Trades.length, 1);
  });

  test('getTradePatterns returns pattern object', () => {
    history.recordTrade({
      players: ['player1', 'player2'],
      offered: { properties: ['boardwalk'], money: 0 },
      requested: { properties: ['mediterranean_ave'], money: 0 },
      fairness: 0.7,
    });
    
    const patterns = history.getTradePatterns('player1');
    
    assert.ok(typeof patterns.avgFairness === 'number');
    assert.ok(Array.isArray(patterns.commonPartners));
    assert.ok(Array.isArray(patterns.favoredProperties));
    assert.ok(typeof patterns.tradeCount === 'number');
  });

  test('getTradePatterns handles no trades', () => {
    const patterns = history.getTradePatterns('unknown_player');
    
    assert.strictEqual(patterns.tradeCount, 0);
    assert.strictEqual(patterns.avgFairness, 0.5);
  });

  test('getWinRateFromTrades returns correlation data', () => {
    history.recordTrade({
      players: ['player1', 'player2'],
      offered: { properties: ['prop1'], money: 0 },
      requested: { properties: ['prop2'], money: 0 },
      fairness: 0.8,
    });
    
    const winRate = history.getWinRateFromTrades('player1');
    
    assert.ok(typeof winRate.winRateWithTrades === 'number');
    assert.ok(typeof winRate.tradeWinCorrelation === 'number');
    assert.ok(typeof winRate.totalTrades === 'number');
  });

  test('getPropertyTradeHistory returns trades involving property', () => {
    history.recordTrade({
      players: ['player1', 'player2'],
      offered: { properties: ['boardwalk'], money: 0 },
      requested: { properties: ['prop2'], money: 0 },
    });
    history.recordTrade({
      players: ['player3', 'player4'],
      offered: { properties: ['prop3'], money: 0 },
      requested: { properties: ['boardwalk'], money: 0 },
    });
    
    const boardwalkTrades = history.getPropertyTradeHistory('boardwalk');
    
    assert.strictEqual(boardwalkTrades.length, 2);
  });

  test('getStatistics returns trade statistics', () => {
    history.recordTrade({
      players: ['player1', 'player2'],
      offered: { properties: ['prop1'], money: 0 },
      requested: { properties: ['prop2'], money: 0 },
    });
    
    const stats = history.getStatistics();
    
    assert.ok(typeof stats.totalTrades === 'number');
    assert.ok(typeof stats.avgFairness === 'number');
  });

  test('clear removes all trades', () => {
    history.recordTrade({
      players: ['player1', 'player2'],
      offered: {},
      requested: {},
    });
    
    history.clear();
    
    assert.strictEqual(history.trades.length, 0);
  });

  test('exportHistory returns JSON string', () => {
    history.recordTrade({
      players: ['player1', 'player2'],
      offered: {},
      requested: {},
    });
    
    const json = history.exportHistory();
    
    assert.ok(typeof json === 'string');
    const parsed = JSON.parse(json);
    assert.ok(Array.isArray(parsed.trades));
  });

  test('importHistory restores history', () => {
    history.recordTrade({
      players: ['player1', 'player2'],
      offered: { properties: ['prop1'], money: 100 },
      requested: { properties: ['prop2'], money: 0 },
      fairness: 0.9,
    });
    
    const exported = history.exportHistory();
    
    const newHistory = new TradeHistory({});
    const success = newHistory.importHistory(exported);
    
    assert.strictEqual(success, true);
    assert.ok(newHistory.trades.length > 0);
  });
});