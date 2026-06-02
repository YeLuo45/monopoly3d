/**
 * PerformanceTracker - Tracks and analyzes player performance over time
 * 
 * Maintains historical game data, calculates statistics, and identifies
 * trends in player performance across multiple games.
 */

export class PerformanceTracker {
  constructor() {
    // Historical game results
    this.gameHistory = [];
    
    // Player statistics
    this.playerStats = new Map();
    
    // Max games to keep in history
    this.MAX_HISTORY = 100;
  }

  /**
   * Record a completed game's result
   * @param {string} gameId - Unique game identifier
   * @param {array} standings - Array of {playerId, rank, score} sorted by rank
   */
  recordGameResult(gameId, standings) {
    if (!gameId || !standings || standings.length === 0) return;
    
    const gameRecord = {
      gameId,
      timestamp: Date.now(),
      standings: standings.map(s => ({
        playerId: s.playerId,
        rank: s.rank || 0,
        score: s.score || 0,
        money: s.money || 0,
        properties: s.properties || 0,
        monopolies: s.monopolies || 0,
      })),
    };
    
    // Add to history
    this.gameHistory.push(gameRecord);
    
    // Trim history if needed
    if (this.gameHistory.length > this.MAX_HISTORY) {
      this.gameHistory = this.gameHistory.slice(-this.MAX_HISTORY);
    }
    
    // Update player statistics
    for (const standing of gameRecord.standings) {
      this._updatePlayerStats(standing.playerId, standing.rank, gameRecord);
    }
  }

  /**
   * Get comprehensive stats for a player
   * @param {string} playerId - Player ID
   * @returns {object} Player statistics
   */
  getPlayerStats(playerId) {
    const stats = this.playerStats.get(playerId);
    if (!stats) {
      return {
        playerId,
        gamesPlayed: 0,
        gamesWon: 0,
        totalRank: 0,
        averageRank: 0,
        winRate: 0,
        bestRank: 0,
        worstRank: 0,
        recentForm: [],
        trend: 'insufficient_data',
      };
    }
    
    return {
      playerId,
      gamesPlayed: stats.gamesPlayed,
      gamesWon: stats.gamesWon,
      totalRank: stats.totalRank,
      averageRank: stats.gamesPlayed > 0 ? stats.totalRank / stats.gamesPlayed : 0,
      winRate: stats.gamesPlayed > 0 ? stats.gamesWon / stats.gamesPlayed : 0,
      bestRank: stats.bestRank,
      worstRank: stats.worstRank,
      recentForm: stats.recentForm.slice(-10),
      topFinishes: stats.topFinishes,
      monopolyWinRate: this._calculateMonopolyWinRate(playerId),
    };
  }

  /**
   * Get average finishing rank for a player
   * @param {string} playerId - Player ID
   * @returns {number} Average rank (lower is better)
   */
  getAverageFinish(playerId) {
    const stats = this.getPlayerStats(playerId);
    return Math.round(stats.averageRank * 10) / 10;
  }

  /**
   * Calculate win rate for a player
   * @param {string} playerId - Player ID
   * @returns {number} Win rate between 0 and 1
   */
  getWinRate(playerId) {
    const stats = this.getPlayerStats(playerId);
    return Math.round(stats.winRate * 100) / 100;
  }

  /**
   * Get performance trend over recent games
   * @param {string} playerId - Player ID
   * @param {number} gameCount - Number of recent games to analyze
   * @returns {object} {direction, change, trend}
   */
  getPerformanceTrend(playerId, gameCount = 10) {
    const stats = this.playerStats.get(playerId);
    if (!stats || stats.gamesPlayed < 2) {
      return {
        direction: 'insufficient_data',
        change: 0,
        trend: 'no_trend',
        gamesAnalyzed: stats?.gamesPlayed || 0,
      };
    }
    
    const recentGames = this.gameHistory
      .filter(g => g.standings.some(s => s.playerId === playerId))
      .slice(-gameCount);
    
    if (recentGames.length < 2) {
      return {
        direction: 'insufficient_data',
        change: 0,
        trend: 'no_trend',
        gamesAnalyzed: recentGames.length,
      };
    }
    
    // Calculate trend from ranks
    const ranks = recentGames.map(game => {
      const standing = game.standings.find(s => s.playerId === playerId);
      return standing?.rank || 0;
    });
    
    // Simple linear regression for trend
    const n = ranks.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = ranks.reduce((a, b) => a + b, 0);
    const sumXY = ranks.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Determine direction
    let direction = 'stable';
    let trend = 'holding';
    
    if (slope < -0.1) {
      direction = 'improving';
      trend = 'gaining';
    } else if (slope > 0.1) {
      direction = 'declining';
      trend = 'losing';
    }
    
    // Calculate change
    const firstHalf = ranks.slice(0, Math.floor(n / 2));
    const secondHalf = ranks.slice(Math.floor(n / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const change = avgFirst - avgSecond; // Positive means improving (lower rank)
    
    return {
      direction,
      change: Math.round(change * 10) / 10,
      trend,
      gamesAnalyzed: recentGames.length,
      slope: Math.round(slope * 100) / 100,
      recentRanks: ranks.slice(-5),
    };
  }

  /**
   * Get head-to-head record between two players
   * @param {string} playerA - First player ID
   * @param {string} playerB - Second player ID
   * @returns {object} Head-to-head stats
   */
  getHeadToHead(playerA, playerB) {
    const games = this.gameHistory.filter(game =>
      game.standings.some(s => s.playerId === playerA) &&
      game.standings.some(s => s.playerId === playerB)
    );
    
    if (games.length === 0) {
      return {
        gamesPlayed: 0,
        playerAWins: 0,
        playerBWins: 0,
        averageRankA: 0,
        averageRankB: 0,
      };
    }
    
    let playerAWins = 0;
    let playerBWins = 0;
    let totalRankA = 0;
    let totalRankB = 0;
    
    for (const game of games) {
      const standingA = game.standings.find(s => s.playerId === playerA);
      const standingB = game.standings.find(s => s.playerId === playerB);
      
      if (standingA && standingB) {
        if (standingA.rank < standingB.rank) {
          playerAWins++;
        } else if (standingB.rank < standingA.rank) {
          playerBWins++;
        }
        totalRankA += standingA.rank;
        totalRankB += standingB.rank;
      }
    }
    
    return {
      gamesPlayed: games.length,
      playerAWins,
      playerBWins,
      ties: games.length - playerAWins - playerBWins,
      averageRankA: Math.round((totalRankA / games.length) * 10) / 10,
      averageRankB: Math.round((totalRankB / games.length) * 10) / 10,
      winRateA: Math.round((playerAWins / games.length) * 100),
      winRateB: Math.round((playerBWins / games.length) * 100),
    };
  }

  /**
   * Get leaderboard rankings based on all-time performance
   * @param {number} limit - Number of top players to return
   * @returns {array} Array of {playerId, score, rank}
   */
  getLeaderboard(limit = 10) {
    const scores = [];
    
    for (const [playerId, stats] of this.playerStats) {
      // Calculate overall score (win rate * 100 - avg rank penalty)
      const winRateScore = stats.gamesWon / Math.max(1, stats.gamesPlayed) * 50;
      const rankScore = (stats.gamesPlayed > 0 ? 
        (2 - stats.totalRank / stats.gamesPlayed) : 0) * 50;
      
      scores.push({
        playerId,
        score: Math.round((winRateScore + rankScore) * 10) / 10,
        gamesPlayed: stats.gamesPlayed,
        winRate: Math.round((stats.gamesWon / Math.max(1, stats.gamesPlayed)) * 100),
        averageRank: Math.round((stats.totalRank / Math.max(1, stats.gamesPlayed)) * 10) / 10,
      });
    }
    
    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    
    // Assign ranks
    return scores.slice(0, limit).map((s, index) => ({
      ...s,
      rank: index + 1,
    }));
  }

  /**
   * Get recent games for a player
   * @param {string} playerId - Player ID
   * @param {number} count - Number of recent games
   * @returns {array} Recent game results
   */
  getRecentGames(playerId, count = 5) {
    return this.gameHistory
      .filter(game => game.standings.some(s => s.playerId === playerId))
      .slice(-count)
      .map(game => {
        const standing = game.standings.find(s => s.playerId === playerId);
        return {
          gameId: game.gameId,
          timestamp: game.timestamp,
          rank: standing?.rank || 0,
          score: standing?.score || 0,
          money: standing?.money || 0,
          properties: standing?.properties || 0,
          monopolies: standing?.monopolies || 0,
        };
      });
  }

  /**
   * Clear all historical data
   */
  clearHistory() {
    this.gameHistory = [];
    this.playerStats.clear();
  }

  // Private helper methods

  _updatePlayerStats(playerId, rank, gameRecord) {
    if (!this.playerStats.has(playerId)) {
      this.playerStats.set(playerId, {
        gamesPlayed: 0,
        gamesWon: 0,
        totalRank: 0,
        bestRank: Infinity,
        worstRank: 0,
        recentForm: [],
        topFinishes: 0,
        lastGameTimestamp: 0,
      });
    }
    
    const stats = this.playerStats.get(playerId);
    
    stats.gamesPlayed++;
    stats.totalRank += rank;
    stats.bestRank = Math.min(stats.bestRank, rank);
    stats.worstRank = Math.max(stats.worstRank, rank);
    stats.lastGameTimestamp = gameRecord.timestamp;
    
    if (rank === 1) {
      stats.gamesWon++;
    }
    
    // Track recent form (ranks of last 10 games)
    stats.recentForm.push(rank);
    if (stats.recentForm.length > 10) {
      stats.recentForm.shift();
    }
    
    // Track top 3 finishes
    if (rank <= 3) {
      stats.topFinishes++;
    }
  }

  _calculateMonopolyWinRate(playerId) {
    // Calculate win rate when player has monopolies
    const gamesWithMonopolies = this.gameHistory.filter(game => {
      const standing = game.standings.find(s => s.playerId === playerId);
      return standing && standing.monopolies > 0;
    });
    
    if (gamesWithMonopolies.length === 0) return 0;
    
    const wins = gamesWithMonopolies.filter(game => {
      const standing = game.standings.find(s => s.playerId === playerId);
      return standing && standing.rank === 1;
    }).length;
    
    return Math.round((wins / gamesWithMonopolies.length) * 100) / 100;
  }
}