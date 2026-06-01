/**
 * ReplayLeaderboard - Leaderboard based on replay analytics
 * 
 * Provides rankings and achievements derived from replay data analysis:
 * - Fastest games ranking
 * - Player score rankings
 * - Tile popularity rankings
 * - Achievement badges from replay analysis
 */

import { CrossGameAnalytics } from './crossGameAnalytics.js';

export const LEADERBOARD_VERSION = '1.0.0';

// Achievement definitions
export const ACHIEVEMENTS = {
  speed_demon: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Finished game in less than 20 turns',
    icon: '⚡',
  },
  landlord: {
    id: 'landlord',
    name: 'Landlord',
    description: 'Owned all properties of one color group',
    icon: '🏠',
  },
  jackpot: {
    id: 'jackpot',
    name: 'Jackpot',
    description: 'Collected over 5000 rent in a single game',
    icon: '💰',
  },
  comeback_kid: {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Won after being bankrupt once',
    icon: '🌟',
  },
  quiz_whiz: {
    id: 'quiz_whiz',
    name: 'Quiz Whiz',
    description: 'Answered 10 or more questions correctly',
    icon: '🧠',
  },
};

export class ReplayLeaderboard {
  /**
   * @param {CrossSessionReplay} crossSessionReplay - CrossSessionReplay instance
   * @param {CrossGameAnalytics} crossGameAnalytics - CrossGameAnalytics instance
   */
  constructor(crossSessionReplay, crossGameAnalytics) {
    this.crossSessionReplay = crossSessionReplay;
    this.crossGameAnalytics = crossGameAnalytics;
    
    // Local cache for leaderboard data
    this._cache = {
      gameDurationRanking: null,
      playerScoreRanking: {},
      tilePopularityRanking: null,
      playerAchievements: {},
    };
    this._cacheExpiry = 5000; // 5 seconds cache
    this._lastCacheUpdate = 0;
  }

  /**
   * Check if cache needs refresh
   * @private
   */
  _isCacheValid() {
    return Date.now() - this._lastCacheUpdate < this._cacheExpiry;
  }

  /**
   * Update cache timestamp
   * @private
   */
  _updateCache() {
    this._lastCacheUpdate = Date.now();
  }

  /**
   * Get game duration ranking (fastest games)
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Array of {replayId, gameId, duration, turns, timestamp}
   */
  getGameDurationRanking(limit = 10) {
    if (this._cache.gameDurationRanking && this._isCacheValid()) {
      return this._cache.gameDurationRanking.slice(0, limit);
    }
    
    const replays = this.crossSessionReplay.listReplays();
    
    // Build ranking data from replays
    const rankingData = replays
      .filter(r => r.duration > 0)
      .map(replay => {
        const metadata = this.crossSessionReplay.getMetadata(replay.replayId);
        return {
          replayId: replay.replayId,
          gameId: replay.gameId,
          duration: replay.duration,
          turns: metadata?.turnCount || 0,
          playerCount: replay.playerCount || metadata?.playerCount || 0,
          timestamp: replay.timestamp,
        };
      })
      .sort((a, b) => a.duration - b.duration); // Fastest first
    
    this._cache.gameDurationRanking = rankingData;
    this._updateCache();
    
    return rankingData.slice(0, limit);
  }

  /**
   * Get player score ranking for a specific player
   * @param {string} playerId - Player ID
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Array of {replayId, score, rank, timestamp}
   */
  getPlayerScoreRanking(playerId, limit = 10) {
    if (this._cache.playerScoreRanking[playerId] && this._isCacheValid()) {
      return this._cache.playerScoreRanking[playerId].slice(0, limit);
    }
    
    const replays = this.crossSessionReplay.listReplays();
    
    // Calculate scores for the player across all replays
    const playerScores = replays.map(replay => {
      const replayData = this.crossSessionReplay.loadReplay(replay.replayId);
      let score = 0;
      let rank = 0;
      
      if (replayData && replayData.events) {
        // Calculate score from events
        score = this._calculatePlayerScore(replayData.events, playerId);
        
        // Get rank from metadata if available
        const metadata = replayData.metadata || {};
        if (metadata.players && Array.isArray(metadata.players)) {
          const playerIndex = metadata.players.findIndex(p => p.id === playerId);
          if (playerIndex !== -1) {
            rank = playerIndex + 1;
          }
        }
      }
      
      return {
        replayId: replay.replayId,
        gameId: replay.gameId,
        score,
        rank,
        timestamp: replay.timestamp,
      };
    });
    
    // Sort by score descending
    playerScores.sort((a, b) => b.score - a.score);
    
    this._cache.playerScoreRanking[playerId] = playerScores;
    this._updateCache();
    
    return playerScores.slice(0, limit);
  }

  /**
   * Internal: Calculate player score from events
   * @private
   */
  _calculatePlayerScore(events, playerId) {
    let score = 0;
    
    for (const event of events) {
      const { type, data } = event;
      
      // Score for correct question answers
      if (type === 'question_answered' && data.playerId === playerId && data.correct) {
        score += 100;
      }
      
      // Score for property purchases
      if (type === 'property_purchase' && data.playerId === playerId) {
        score += 50;
      }
      
      // Score for rent collected
      if (type === 'rent_paid' && data.payerId === playerId) {
        score += data.amount * 0.1; // 10% of rent paid as score
      }
      
      // Score for winning
      if (type === 'game_end' && data.winner === playerId) {
        score += 1000;
      }
    }
    
    return Math.round(score);
  }

  /**
   * Get tile popularity ranking
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Array of {tileId, visitCount, rentCollected}
   */
  getTilePopularityRanking(limit = 10) {
    if (this._cache.tilePopularityRanking && this._isCacheValid()) {
      return this._cache.tilePopularityRanking.slice(0, limit);
    }
    
    const replays = this.crossSessionReplay.listReplays();
    const tileStats = {};
    
    // Aggregate tile statistics from all replays
    for (const replay of replays) {
      const replayData = this.crossSessionReplay.loadReplay(replay.replayId);
      
      if (replayData && replayData.events) {
        for (const event of replayData.events) {
          const { type, data } = event;
          
          if (type === 'tile_visit' && data.tileId !== undefined) {
            if (!tileStats[data.tileId]) {
              tileStats[data.tileId] = { tileId: data.tileId, visitCount: 0, rentCollected: 0 };
            }
            tileStats[data.tileId].visitCount++;
          }
          
          if (type === 'rent_paid' && data.tileId !== undefined) {
            if (!tileStats[data.tileId]) {
              tileStats[data.tileId] = { tileId: data.tileId, visitCount: 0, rentCollected: 0 };
            }
            tileStats[data.tileId].rentCollected += data.amount || 0;
          }
        }
      }
    }
    
    // Sort by visit count descending
    const rankingData = Object.values(tileStats)
      .sort((a, b) => b.visitCount - a.visitCount);
    
    this._cache.tilePopularityRanking = rankingData;
    this._updateCache();
    
    return rankingData.slice(0, limit);
  }

  /**
   * Get achievements earned by a player
   * @param {string} playerId - Player ID
   * @returns {Array} Array of earned achievement objects
   */
  getPlayerAchievements(playerId) {
    if (this._cache.playerAchievements[playerId] && this._isCacheValid()) {
      return this._cache.playerAchievements[playerId];
    }
    
    const replays = this.crossSessionReplay.listReplays();
    const earnedAchievements = new Map();
    
    // Analyze each replay for achievements
    for (const replay of replays) {
      const replayData = this.crossSessionReplay.loadReplay(replay.replayId);
      
      if (!replayData || !replayData.events) continue;
      
      const events = replayData.events;
      const metadata = replayData.metadata || {};
      
      // Track player-specific stats
      let playerTurns = 0;
      let playerCorrectQuestions = 0;
      let totalRentCollected = 0;
      let wasBankrupt = false;
      let ownsAllInGroup = false;
      
      // Check if player won
      const isWinner = metadata.winner === playerId;
      
      // Analyze events for this player
      for (const event of events) {
        const { type, data } = event;
        
        if (data.playerId === playerId) {
          if (type === 'turn_change') playerTurns++;
          if (type === 'question_answered' && data.correct) playerCorrectQuestions++;
          if (type === 'rent_paid' && data.payerId === playerId) {
            totalRentCollected += data.amount || 0;
          }
          if (type === 'player_bankrupt' && data.playerId === playerId) {
            wasBankrupt = true;
          }
        }
        
        // Check for landlord achievement (owned all properties of a color group)
        if (type === 'property_purchase') {
          // This would need color group data from board config
          // For now, just track count
        }
      }
      
      // Determine achievements earned in this replay
      const replayAchievements = [];
      
      // Speed demon: < 20 turns
      if (playerTurns > 0 && playerTurns < 20 && isWinner) {
        replayAchievements.push('speed_demon');
      }
      
      // Jackpot: > 5000 rent in single game
      if (totalRentCollected > 5000) {
        replayAchievements.push('jackpot');
      }
      
      // Comeback kid: won after being bankrupt
      if (isWinner && wasBankrupt) {
        replayAchievements.push('comeback_kid');
      }
      
      // Quiz whiz: 10+ correct answers
      if (playerCorrectQuestions >= 10) {
        replayAchievements.push('quiz_whiz');
      }
      
      // Add achievements with timestamp
      for (const achId of replayAchievements) {
        if (!earnedAchievements.has(achId)) {
          earnedAchievements.set(achId, {
            ...ACHIEVEMENTS[achId],
            earnedAt: replay.timestamp,
            replayId: replay.replayId,
          });
        }
      }
    }
    
    const result = Array.from(earnedAchievements.values());
    
    this._cache.playerAchievements[playerId] = result;
    this._updateCache();
    
    return result;
  }

  /**
   * Export leaderboard data
   * @param {string} format - 'json' or 'csv'
   * @returns {string} Formatted leaderboard data
   */
  exportLeaderboard(format = 'json') {
    const durationRanking = this.getGameDurationRanking(20);
    const tileRanking = this.getTilePopularityRanking(20);
    
    const exportData = {
      version: LEADERBOARD_VERSION,
      exportedAt: Date.now(),
      gameDurationRanking: durationRanking,
      tilePopularityRanking: tileRanking,
    };
    
    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    }
    
    if (format === 'csv') {
      const lines = [
        'LEADERBOARD EXPORT',
        `Generated: ${new Date().toISOString()}`,
        '',
        'FASTEST GAMES',
        'Rank,ReplayID,GameID,Duration(ms),Turns,Players,Timestamp',
      ];
      
      durationRanking.forEach((entry, idx) => {
        lines.push(`${idx + 1},${entry.replayId},${entry.gameId},${entry.duration},${entry.turns},${entry.playerCount},${entry.timestamp}`);
      });
      
      lines.push('');
      lines.push('TILE POPULARITY');
      lines.push('TileID,VisitCount,RentCollected');
      
      tileRanking.forEach(entry => {
        lines.push(`${entry.tileId},${entry.visitCount},${entry.rentCollected}`);
      });
      
      return lines.join('\n');
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Clear internal cache
   */
  clearCache() {
    this._cache = {
      gameDurationRanking: null,
      playerScoreRanking: {},
      tilePopularityRanking: null,
      playerAchievements: {},
    };
    this._lastCacheUpdate = 0;
  }
}

export default ReplayLeaderboard;