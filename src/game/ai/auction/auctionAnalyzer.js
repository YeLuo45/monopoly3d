/**
 * AuctionAnalyzer - Post-auction analysis for learning
 */

export class AuctionAnalyzer {
  constructor(memoryLayer) {
    this.memory = memoryLayer;
    this.auctionHistory = [];
    this.playerStats = new Map();
  }

  analyzeAuctionResult(auction, gameState) {
    if (!auction || !auction.propertyId) return;

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

    analysis.overpaid = auction.winningBid > (auction.marketValue || 0);
    analysis.savings = (auction.marketValue || 0) - auction.winningBid;
    analysis.dealQuality = auction.winningBid / (auction.marketValue || 1);

    this.auctionHistory.push(analysis);
    this._updateWinnerStats(auction);

    if (auction.competitors) {
      for (const competitorId of auction.competitors) {
        if (competitorId !== auction.winner) {
          this._updateLoserStats(competitorId);
        }
      }
    }

    if (this.memory?.l2?.storeDecision) {
      this.memory.l2.storeDecision({ type: 'auction_analysis', data: analysis, timestamp: analysis.timestamp });
    }

    return analysis;
  }

  determinePhase(gameState) {
    if (!gameState?.turnCount) return 'early';
    if (gameState.turnCount < 5) return 'early';
    if (gameState.turnCount < 15) return 'mid';
    return 'late';
  }

  _updateWinnerStats(auction) {
    const playerId = auction.winner;
    if (!playerId) return;
    const stats = this.playerStats.get(playerId) || { wins: 0, losses: 0, totalSpent: 0 };
    stats.wins++;
    stats.totalSpent += auction.winningBid;
    this.playerStats.set(playerId, stats);
  }

  _updateLoserStats(playerId) {
    if (!playerId) return;
    const stats = this.playerStats.get(playerId) || { wins: 0, losses: 0, totalSpent: 0 };
    stats.losses++;
    this.playerStats.set(playerId, stats);
  }

  getAuctionStats(playerId) {
    const playerAuctions = this.auctionHistory.filter(a =>
      a.winner === playerId || (a.competitors && a.competitors.includes(playerId))
    );

    if (playerAuctions.length === 0) {
      return { won: 0, lost: 0, totalAuctions: 0, winRate: 0, avgSavings: 0, biggestWin: 0, biggestLoss: 0 };
    }

    const won = playerAuctions.filter(a => a.winner === playerId);
    const lost = playerAuctions.filter(a => a.winner !== playerId);
    const savings = won.filter(a => a.savings > 0).map(a => a.savings);
    const losses = won.filter(a => a.savings < 0).map(a => -a.savings);

    return {
      won: won.length,
      lost: lost.length,
      totalAuctions: playerAuctions.length,
      winRate: playerAuctions.length > 0 ? won.length / playerAuctions.length : 0,
      avgSavings: savings.length > 0 ? savings.reduce((a, b) => a + b, 0) / savings.length : 0,
      biggestWin: savings.length > 0 ? Math.max(...savings) : 0,
      biggestLoss: losses.length > 0 ? Math.max(...losses) : 0,
    };
  }

  getOverbiddingTendency(playerId) {
    const playerAuctions = this.auctionHistory.filter(a =>
      a.winner === playerId || (a.competitors && a.competitors.includes(playerId))
    );
    if (playerAuctions.length < 2) return 0.5;
    const overpaidCount = playerAuctions.filter(a => a.winner === playerId && a.overpaid).length;
    return overpaidCount / playerAuctions.length;
  }

  getBargainHuntingSkill(playerId) {
    const playerAuctions = this.auctionHistory.filter(a =>
      a.winner === playerId || (a.competitors && a.competitors.includes(playerId))
    );

    const won = playerAuctions.filter(a => a.winner === playerId);
    if (won.length === 0) return 0;
    if (playerAuctions.length < 2) return 0.5;

    const goodDeals = won.filter(a => a.savings > 0);
    return goodDeals.length / won.length;
  }

  getRecentPatterns(playerId, recentCount = 10) {
    const playerAuctions = this.auctionHistory
      .filter(a => a.winner === playerId || (a.competitors && a.competitors.includes(playerId)))
      .slice(-recentCount);

    if (playerAuctions.length === 0) return { pattern: 'insufficient_data' };

    const qualities = playerAuctions.map(a => a.dealQuality);
    const half = Math.floor(qualities.length / 2);
    const recentHalf = qualities.slice(-half);
    const olderHalf = qualities.slice(0, half);

    const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / (recentHalf.length || 1);
    const olderAvg = olderHalf.reduce((a, b) => a + b, 0) / (olderHalf.length || 1);

    let trend = 'stable';
    if (recentAvg < olderAvg * 0.9) trend = 'declining';
    else if (recentAvg > olderAvg * 1.1) trend = 'improving';

    const avgDealQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;

    return {
      avgDealQuality,
      trend,
      auctionsAnalyzed: playerAuctions.length,
      overpayRate: playerAuctions.filter(a => a.overpaid).length / playerAuctions.length,
    };
  }

  getHeadToHead(playerId, opponentId) {
    const matchups = this.auctionHistory.filter(a =>
      (a.winner === playerId || (a.competitors && a.competitors.includes(playerId))) &&
      (a.winner === opponentId || (a.competitors && a.competitors.includes(opponentId)))
    );
    const myWins = matchups.filter(a => a.winner === playerId).length;
    const oppWins = matchups.filter(a => a.winner === opponentId).length;
    return { totalMatchups: matchups.length, wins: myWins, losses: oppWins };
  }

  clearHistory() {
    this.auctionHistory = [];
    this.playerStats.clear();
  }
}