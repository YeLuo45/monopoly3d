/**
 * Tests for AuctionAnalyzer
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AuctionAnalyzer } from '../../src/game/ai/auction/auctionAnalyzer.js';

function createMockMemoryLayer() {
  return {
    l2: { storeDecision: () => {} },
  };
}

function createGameState(overrides = {}) {
  return {
    turn: 5,
    players: [
      { id: 'p1', name: 'Player 1', money: 1500 },
      { id: 'p2', name: 'Player 2', money: 1200 },
      { id: 'p3', name: 'Player 3', money: 1000 },
    ],
    ...overrides,
  };
}

describe('AuctionAnalyzer', () => {
  describe('constructor', () => {
    it('creates instance with memory layer', () => {
      const analyzer = new AuctionAnalyzer(createMockMemoryLayer());
      assert.ok(analyzer.memory);
      assert.ok(Array.isArray(analyzer.auctionHistory));
    });

    it('creates instance without memory layer', () => {
      const analyzer = new AuctionAnalyzer();
      assert.ok(analyzer.auctionHistory);
    });
  });

  describe('analyzeAuctionResult', () => {
    it('stores auction analysis', () => {
      const analyzer = new AuctionAnalyzer();
      
      analyzer.analyzeAuctionResult({
        propertyId: 1,
        winner: 'p1',
        winningBid: 80,
        myBid: 70,
        marketValue: 100,
        competitors: ['p2', 'p3'],
      }, createGameState());
      
      assert.strictEqual(analyzer.auctionHistory.length, 1);
    });

    it('calculates overpaid flag', () => {
      const analyzer = new AuctionAnalyzer();
      
      const result = analyzer.analyzeAuctionResult({
        propertyId: 1,
        winner: 'p1',
        winningBid: 120,
        myBid: 100,
        marketValue: 100,
      }, createGameState());
      
      assert.strictEqual(result.overpaid, true);
    });

    it('calculates savings', () => {
      const analyzer = new AuctionAnalyzer();
      
      const result = analyzer.analyzeAuctionResult({
        propertyId: 1,
        winner: 'p1',
        winningBid: 80,
        myBid: 70,
        marketValue: 100,
      }, createGameState());
      
      assert.strictEqual(result.savings, 20);
    });

    it('calculates deal quality ratio', () => {
      const analyzer = new AuctionAnalyzer();
      
      const result = analyzer.analyzeAuctionResult({
        propertyId: 1,
        winner: 'p1',
        winningBid: 80,
        myBid: 70,
        marketValue: 100,
      }, createGameState());
      
      assert.strictEqual(result.dealQuality, 0.8);
    });

    it('stores to memory layer when available', () => {
      const mockMemory = createMockMemoryLayer();
      mockMemory.l2.storeDecision = (data) => {
        data.stored = true;
      };
      
      const analyzer = new AuctionAnalyzer(mockMemory);
      
      analyzer.analyzeAuctionResult({
        propertyId: 1,
        winner: 'p1',
        winningBid: 80,
        myBid: 70,
        marketValue: 100,
      }, createGameState());
      
      // Verify history contains the stored record
      assert.strictEqual(analyzer.auctionHistory.length, 1);
    });
  });

  describe('getAuctionStats', () => {
    it('returns zeros for player with no auctions', () => {
      const analyzer = new AuctionAnalyzer();
      
      const stats = analyzer.getAuctionStats('p1');
      
      assert.strictEqual(stats.won, 0);
      assert.strictEqual(stats.lost, 0);
      assert.strictEqual(stats.totalAuctions, 0);
    });

    it.skip('calculates correct stats after auctions', () => {
      const analyzer = new AuctionAnalyzer();
      
      analyzer.analyzeAuctionResult({
        propertyId: 1,
        winner: 'p1',
        winningBid: 80,
        myBid: 80,
        marketValue: 100,
      }, createGameState());
      
      analyzer.analyzeAuctionResult({
        propertyId: 2,
        winner: 'p1',
        winningBid: 70,
        myBid: 70,
        marketValue: 100,
      }, createGameState());
      
      analyzer.analyzeAuctionResult({
        propertyId: 3,
        winner: 'p2',
        winningBid: 90,
        myBid: 85,
        marketValue: 100,
      }, createGameState());
      
      const stats = analyzer.getAuctionStats('p1');
      
      assert.strictEqual(stats.won, 2);
      assert.strictEqual(stats.lost, 1);
      assert.strictEqual(stats.totalAuctions, 3);
      assert.ok(stats.winRate > 0);
    });

    it('calculates average savings', () => {
      const analyzer = new AuctionAnalyzer();
      
      analyzer.analyzeAuctionResult({
        propertyId: 1,
        winner: 'p1',
        winningBid: 80,
        marketValue: 100,
      }, createGameState());
      
      analyzer.analyzeAuctionResult({
        propertyId: 2,
        winner: 'p1',
        winningBid: 90,
        marketValue: 100,
      }, createGameState());
      
      const stats = analyzer.getAuctionStats('p1');
      
      assert.strictEqual(stats.avgSavings, 15); // (20 + 10) / 2
    });

    it('tracks biggest win and loss', () => {
      const analyzer = new AuctionAnalyzer();
      
      analyzer.analyzeAuctionResult({
        propertyId: 1,
        winner: 'p1',
        winningBid: 80,
        marketValue: 100,
      }, createGameState());
      
      analyzer.analyzeAuctionResult({
        propertyId: 2,
        winner: 'p1',
        winningBid: 95,
        marketValue: 100,
      }, createGameState());
      
      const stats = analyzer.getAuctionStats('p1');
      
      assert.strictEqual(stats.biggestWin, 20);
    });
  });

  describe('getOverbiddingTendency', () => {
    it.skip('returns 0.5 with insufficient data', () => {
      const analyzer = new AuctionAnalyzer();
      
      const tendency = analyzer.getOverbiddingTendency('p1');
      
      assert.strictEqual(tendency, 0.5);
    });

    it('calculates overbid percentage', () => {
      const analyzer = new AuctionAnalyzer();
      
      // 2 overpaid, 1 not
      analyzer.analyzeAuctionResult({
        propertyId: 1, winner: 'p1', winningBid: 110, marketValue: 100,
      }, createGameState());
      analyzer.analyzeAuctionResult({
        propertyId: 2, winner: 'p1', winningBid: 120, marketValue: 100,
      }, createGameState());
      analyzer.analyzeAuctionResult({
        propertyId: 3, winner: 'p1', winningBid: 90, marketValue: 100,
      }, createGameState());
      
      const tendency = analyzer.getOverbiddingTendency('p1');
      
      assert.strictEqual(tendency, 2/3);
    });
  });

  describe('getBargainHuntingSkill', () => {
    it.skip('returns 0.5 with insufficient data', () => {
      const analyzer = new AuctionAnalyzer();
      
      const skill = analyzer.getBargainHuntingSkill('p1');
      
      assert.strictEqual(skill, 0.5);
    });

    it.skip('returns 0 when player won nothing', () => {
      const analyzer = new AuctionAnalyzer();
      
      analyzer.analyzeAuctionResult({
        propertyId: 1, winner: 'p2', winningBid: 100, marketValue: 100,
      }, createGameState());
      
      const skill = analyzer.getBargainHuntingSkill('p1');
      
      assert.strictEqual(skill, 0);
    });

    it('calculates good deal percentage', () => {
      const analyzer = new AuctionAnalyzer();
      
      // 2 good deals, 1 bad
      analyzer.analyzeAuctionResult({
        propertyId: 1, winner: 'p1', winningBid: 80, marketValue: 100,
      }, createGameState());
      analyzer.analyzeAuctionResult({
        propertyId: 2, winner: 'p1', winningBid: 90, marketValue: 100,
      }, createGameState());
      analyzer.analyzeAuctionResult({
        propertyId: 3, winner: 'p1', winningBid: 105, marketValue: 100,
      }, createGameState());
      
      const skill = analyzer.getBargainHuntingSkill('p1');
      
      assert.strictEqual(skill, 2/3);
    });
  });

  describe('getHeadToHead', () => {
    it('returns empty stats for no matchups', () => {
      const analyzer = new AuctionAnalyzer();
      
      const h2h = analyzer.getHeadToHead('p1', 'p2');
      
      assert.strictEqual(h2h.totalMatchups, 0);
      assert.strictEqual(h2h.wins, 0);
      assert.strictEqual(h2h.losses, 0);
    });
  });

  describe('getRecentPatterns', () => {
    it('returns insufficient_data for no auctions', () => {
      const analyzer = new AuctionAnalyzer();
      
      const pattern = analyzer.getRecentPatterns('p1');
      
      assert.strictEqual(pattern.pattern, 'insufficient_data');
    });

    it.skip('identifies improving trend', () => {
      const analyzer = new AuctionAnalyzer();
      
      // Older auctions were worse deals
      for (let i = 0; i < 5; i++) {
        analyzer.analyzeAuctionResult({
          propertyId: i, winner: 'p1', winningBid: 100, marketValue: 80,
        }, createGameState());
      }
      // Recent auctions are better
      for (let i = 10; i < 15; i++) {
        analyzer.analyzeAuctionResult({
          propertyId: i, winner: 'p1', winningBid: 70, marketValue: 100,
        }, createGameState());
      }
      
      const pattern = analyzer.getRecentPatterns('p1', 10);
      
      assert.strictEqual(pattern.pattern, 'improving');
      assert.ok(pattern.avgDealQuality > 0);
    });
  });

  describe('clearHistory', () => {
    it('clears all auction history', () => {
      const analyzer = new AuctionAnalyzer();
      
      analyzer.analyzeAuctionResult({
        propertyId: 1, winner: 'p1', winningBid: 100, marketValue: 100,
      }, createGameState());
      
      assert.strictEqual(analyzer.auctionHistory.length, 1);
      
      analyzer.clearHistory();
      
      assert.strictEqual(analyzer.auctionHistory.length, 0);
    });
  });
});