/**
 * AuctionAnalyzer - Post-auction analysis for learning
 * 
 * Analyzes auction outcomes and extracts patterns for improvement.
 */

export class AuctionAnalyzer {
  /**
   * @param {object} memoryLayer - AI memory layer for storing analysis
   */
  constructor(memoryLayer) {
    this.memory = memoryLayer;
    this.auctionHistory = [];
    this.playerStats = new Map();
  }

  /**
   * Analyze an auction result and learn from it
   * @param {object} auction - Auction result data
   * @param {object} gameState - Game state after auction
   */
  analyzeAuctionResult(auction, gameState) {
    if (!auction || !auction.propertyId) return;

    // Store in history
    const analysis = {
      propertyId: auction.propertyId,
      winner: auction.winner,
      winningBid: auction.winningBid,
      myBid: auction.myBid,
      marketValue: auction.marketValue || auction.winningBid,
      timestamp: Date.now(),
      gamePhase: this.determinePhase(gameState),
      competitors: auction.competitors || [],
    };

    // Calculate metrics
    analysis.overpaid = auction.winningBid > (auction.marketValue || 0);
    analysis.savings = (auction.marketValue || 0) - auction.winningBid;
    analysis.dealQuality = auction.winningBid / (auction.marketValue || 1);

    // Store result
    this.auctionHistory.push(analysis);

    // Update player stats for the winner
    this.updatePlayerStats(auction);

    // Update stats for other participants (they lost)
    if (auction.competitors) {
      for (const competitorId of auction.competitors) {
        if (competitorId !== auction.winner) {
          this.updateLossStats(competitorId);
        }
      }
    }

    // Store in memory layer if available
    if (this.memory?.l2?.storeDecision) {
      this.memory.l2.storeDecision({
        type: 'auction_analysis',
        data: analysis,
        timestamp: analysis.timestamp,
      });
    }

    return analysis;
  }

  /**
   * Get auction statistics for a player
   * @param {string} playerId - Player ID
   * @returns {object} Stats object
   */
  getAuctionStats(playerId) {
    // Calculate from ALL history for this player (not just my auctions)
    const playerAuctions = this.auctionHistory.filter(a =>
      a.winner === playerId || (a.competitors && a.competitors.includes(playerId))
    );

    if (playerAuctions.length === 0) {
      return {
        won: 0, lost: 0, avgSavings: 0, biggestWin: 0, biggestLoss: 0, totalAuctions: 0,
      };
    }

    const won = playerAuctions.filter(a => a.winner === playerId);
    const lost = playerAuctions.filter(a => a.winner !== playerId);
    const savings = won.map(a => a.savings).filter(s => s > 0);
    const losses = won.map(a => a.overpaid ? a.winningBid - a.marketValue : 0).filter(l => l > 0);

    return {
      won: won.length,
      lost: lost.length,
      avgSavings: savings.length > 0
        ? savings.reduce((a, b) => a + b, 0) / savings.length
        : 0,
      biggestWin: savings.length > 0 ? Math.max(...savings) : 0,
      biggestLoss: losses.length > 0 ? Math.max(...losses) : 0,
      totalAuctions: playerAuctions.length,
      winRate: playerAuctions.length > 0 ? won.length / playerAuctions.length : 0,
    };
  }

  /**
   * Calculate how often a player overpays
   * @param {string} playerId - Player ID
   * @returns {number} 0-1 tendency score
   */
  getOverbiddingTendency(playerId) {
    const playerAuctions = this.auctionHistory.filter(a =>
      a.winner === playerId || (a.competitors && a.competitors.includes(playerId))
    );

    if (playerAuctions.length < 2) {
      return 0.5;
    }

    const overpaidCount = playerAuctions.filter(a =>
      a.winner === playerId && a.overpaid
    ).length;

    return overpaidCount / playerAuctions.length;
  }

  /**
   * Calculate how often a player gets good deals
   * @param {string} playerId - Player ID
   * @returns {number} 0-1 skill score
   */
  getBargainHuntingSkill(playerId) {
    const playerAuctions = this.auctionHistory.filter(a =>
      a.winner === playerId || (a.competitors && a.competitors.includes(playerId))
    );

    if (playerAuctions.length < 2) {
      return 0.5;
    }

    const won = playerAuctions.filter(a => a.winner === playerId);

    if (won.length === 0) {
      return 0;
    }

    const goodDeals = won.filter(a => a.savings > 0);

    return goodDeals.length / won.length;
  }

  /**
   * Get detailed performance against specific opponents
   * @param {string} playerId - My player ID
   * @param {string} opponentId - Opponent player ID
   * @returns {object} Head-to-head stats
   */
  getHeadToHead(playerId, opponentId) {
    const matchups = this.auctionHistory.filter(a => 
      a.competitors?.includes(opponentId) && a.myBid !== undefined
    );

    const won = matchups.filter(a => a.winner === playerId);
    const lost = matchups.filter(a => a.winner === opponentId);

    return {
      totalMatchups: matchups.length,
      wins: won.length,
      losses: lost.length,
      winRate: matchups.length > 0 ? won.length / matchups.length : 0,
      avgBidWhenWon: won.length > 0 
        ? won.reduce((sum, a) => sum + a.myBid, 0) / won.length 
        : 0,
      avgBidWhenLost: lost.length > 0 
        ? lost.reduce((sum, a) => sum + a.myBid, 0) / lost.length 
        : 0,
    };
  }

  /**
   * Analyze auction patterns over time
   * @param {string} playerId - Player ID
   * @param {number} recentCount - Number of recent auctions to analyze
   * @returns {object} Pattern analysis
   */
  getRecentPatterns(playerId, recentCount = 10) {
    const playerAuctions = this.auctionHistory
      .filter(a => a.winner === playerId || (a.competitors && a.competitors.includes(playerId)))
      .slice(-recentCount);

    if (playerAuctions.length === 0) {
      return { pattern: 'insufficient_data' };
    }

    const qualities = playerAuctions.map(a => a.dealQuality);

    const half = Math.floor(qualities.length / 2);
    const recentHalf = qualities.slice(-half);
    const olderHalf = qualities.slice(0, half);

    const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / (recentHalf.length || 1);
    const olderAvg = olderHalf.reduce((a, b) => a + b, 0) / (olderHalf.length || 1);

    let trend = 'stable';
    if (recentAvg < olderAvg * 0.9) {
      trend = 'declining';
    } else if (recentAvg > olderAvg * 1.1) {
      trend = 'improving';
    }

    const avgDealQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;

    return {
      avgDealQuality,
      trend,
      auctionsAnalyzed: playerAuctions.length,
      overpayRate: playerAuctions.filter(a => a.overpaid).length / playerAuctions.length,
    };
  }

  /**
   * Update internal player statistics
   * @param {object} auction - Auction data
   */
  updatePlayerStats(auction) {
    const playerId = auction.winner;
    
    if (!this.playerStats.has(playerId)) {
      this.playerStats.set(playerId, {
        won: 0,
        lost: 0,
        totalSpent: 0,
        totalValue: 0,
      });
    }

    const stats = this.playerStats.get(playerId);
    stats.won++;
    stats.totalSpent += auction.winningBid;
    stats.totalValue += auction.marketValue || auction.winningBid;
  }

  /**
   * Update loss statistics for a player who didn't win
   * @param {string} playerId - Player ID who lost
   */
  updateLossStats(playerId) {
    if (!this.playerStats.has(playerId)) {
      this.playerStats.set(playerId, {
        won: 0,
        lost: 0,
        totalSpent: 0,
        totalValue: 0,
      });
    }
    
    const stats = this.playerStats.get(playerId);
    stats.lost++;
  }

  /**
   * Determine game phase from game state
   * @param {object} gameState - Game state
   * @returns {string} Phase
   */
  determinePhase(gameState) {
    const turn = gameState?.turn || 1;
    if (turn <= 5) return 'early';
    if (turn <= 15) return 'mid';
    return 'late';
  }

  /**
   * Get full auction history
   * @returns {Array} Auction history
   */
  getHistory() {
    return [...this.auctionHistory];
  }

  /**
   * Clear history (for testing)
   */
  clearHistory() {
    this.auctionHistory = [];
    this.playerStats.clear();
  }
}