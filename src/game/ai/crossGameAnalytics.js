/**
 * CrossGameAnalytics - Aggregate analytics across multiple game sessions
 * 
 * Depends on AIMemoryLayer for cross-game memory (L4) data.
 * Provides session tracking, aggregate stats, player rankings,
 * tile popularity, and export capabilities.
 */

import { AIMemoryLayer } from './memoryLayer.js';

export const ANALYTICS_VERSION = '1.0.0';

export class CrossGameAnalytics {
  /**
   * @param {AIMemoryLayer} memoryLayer - AIMemoryLayer instance for data source
   */
  constructor(memoryLayer) {
    if (!memoryLayer || !(memoryLayer instanceof AIMemoryLayer)) {
      throw new Error('CrossGameAnalytics requires a valid AIMemoryLayer instance');
    }
    
    this.memoryLayer = memoryLayer;
    this.currentSession = null;
    this.sessions = [];
    
    // Session tracking
    this._sessionIdCounter = 0;
  }

  /**
   * Start a new analytics session
   * @param {string} gameId - Optional game ID to associate with session
   * @returns {object} Session info {sessionId, gameId, startTime}
   */
  startSession(gameId) {
    if (this.currentSession) {
      this.endSession(); // Auto-end previous session
    }
    
    this._sessionIdCounter++;
    this.currentSession = {
      sessionId: `session_${this._sessionIdCounter}`,
      gameId: gameId || `game_${Date.now()}`,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      eventCount: 0,
    };
    
    return this.currentSession;
  }

  /**
   * End the current analytics session
   * @returns {object} Finalized session object
   */
  endSession() {
    if (!this.currentSession) {
      return null;
    }
    
    this.currentSession.endTime = Date.now();
    this.currentSession.duration = 
      this.currentSession.endTime - this.currentSession.startTime;
    
    const endedSession = { ...this.currentSession };
    this.sessions.push(endedSession);
    this.currentSession = null;
    
    return endedSession;
  }

  /**
   * Get current active session
   * @returns {object|null} Current session or null
   */
  getCurrentSession() {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * List all completed sessions
   * @returns {Array} Array of session objects [{gameId, startTime, endTime, duration}, ...]
   */
  listSessions() {
    return this.sessions.map(s => ({
      sessionId: s.sessionId,
      gameId: s.gameId,
      startTime: s.startTime,
      endTime: s.endTime,
      duration: s.duration,
      eventCount: s.eventCount,
    }));
  }

  /**
   * Get overall statistics across all games
   * @returns {object} {totalGames, avgDuration, avgPlayers, ...}
   */
  getOverallStats() {
    const l4 = this.memoryLayer.l4_crossGame;
    const recentGames = l4.recentGames || [];
    const aggStats = l4.aggregateStats || {};
    
    // Calculate duration stats
    const durations = recentGames
      .filter(g => g.duration)
      .map(g => g.duration);
    
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
    
    // Count players from player profiles
    const playerProfiles = l4.playerProfiles || {};
    const totalPlayers = Object.keys(playerProfiles).length;
    
    // Calculate question stats
    const totalQuestions = aggStats.totalQuestionsAnswered || 0;
    const totalPropertiesBought = aggStats.totalPropertiesBought || 0;
    const totalRentPaid = aggStats.totalRentPaid || 0;
    
    // Get total game count
    const totalGames = recentGames.length || aggStats.totalGames || 0;
    
    return {
      totalGames,
      avgDuration: Math.round(avgDuration),
      avgDurationFormatted: this._formatDuration(avgDuration),
      totalPlayers,
      avgPlayersPerGame: totalGames > 0 
        ? Math.round((totalPlayers / totalGames) * 10) / 10 
        : 0,
      totalQuestions,
      totalPropertiesBought,
      totalRentPaid,
      avgDiceRoll: aggStats.avgDiceRoll 
        ? Math.round(aggStats.avgDiceRoll * 10) / 10 
        : 0,
      games: recentGames.slice(-20).reverse(), // Last 20 games, newest first
    };
  }

  /**
   * Get player rankings sorted by specified metric
   * @param {string} metric - 'properties' | 'rentPaid' | 'wins' | 'questions'
   * @returns {Array} Sorted player rankings [{playerId, value, rank}, ...]
   */
  getPlayerRankings(metric = 'properties') {
    const l4 = this.memoryLayer.l4_crossGame;
    const playerProfiles = l4.playerProfiles || {};
    
    const rankings = Object.entries(playerProfiles).map(([playerId, profile]) => {
      let value = 0;
      
      switch (metric) {
        case 'properties':
          value = profile.propertiesOwned || 0;
          break;
        case 'rentPaid':
          value = profile.totalRentPaid || 0;
          break;
        case 'wins':
          value = profile.gamesWon || 0;
          break;
        case 'questions':
          value = profile.questionsAnswered || 0;
          break;
        case 'netWorth':
          value = profile.netWorth || 0;
          break;
        default:
          value = 0;
      }
      
      return { playerId, value, profile };
    });
    
    // Sort descending by value
    rankings.sort((a, b) => b.value - a.value);
    
    // Add rank
    return rankings.map((r, idx) => ({
      ...r,
      rank: idx + 1,
    }));
  }

  /**
   * Get tile popularity statistics
   * @returns {Array} [{tileId, visitCount, purchaseCount}, ...]
   */
  getTilePopularity() {
    const l4 = this.memoryLayer.l4_crossGame;
    const playerProfiles = l4.playerProfiles || {};
    
    // Aggregate tile visits and purchases from all player profiles
    const tileStats = {};
    
    Object.values(playerProfiles).forEach(profile => {
      // Tile visits from profile
      if (profile.tileVisits) {
        Object.entries(profile.tileVisits).forEach(([tileId, count]) => {
          if (!tileStats[tileId]) {
            tileStats[tileId] = { tileId, visitCount: 0, purchaseCount: 0 };
          }
          tileStats[tileId].visitCount += count;
        });
      }
      
      // Properties purchased
      if (profile.propertiesOwned) {
        // This is a count, not detailed - we need to track actual purchases
        // For now, use a proxy based on properties
      }
    });
    
    // Also check L1 processed data for more accurate tile stats
    const l1 = this.memoryLayer.l1_processed;
    Object.values(l1).forEach(gameStats => {
      if (gameStats.tilesVisited) {
        gameStats.tilesVisited.forEach(tileId => {
          if (!tileStats[tileId]) {
            tileStats[tileId] = { tileId, visitCount: 0, purchaseCount: 0 };
          }
          tileStats[tileId].visitCount += 1;
        });
      }
    });
    
    // Convert to array and sort by visit count
    return Object.values(tileStats)
      .sort((a, b) => b.visitCount - a.visitCount);
  }

  /**
   * Get property heatmap data (color-coded property frequency)
   * @returns {object} {tiles: [{tileId, frequency, color}], maxFrequency}
   */
  getPropertyHeatmap() {
    const popularity = this.getTilePopularity();
    
    if (popularity.length === 0) {
      return { tiles: [], maxFrequency: 0 };
    }
    
    const maxFrequency = Math.max(...popularity.map(t => t.visitCount));
    
    const tiles = popularity.map(tile => ({
      tileId: tile.tileId,
      visitCount: tile.visitCount,
      frequency: maxFrequency > 0 ? tile.visitCount / maxFrequency : 0,
      // Color gradient: green (high) -> yellow -> red (low)
      color: this._getHeatmapColor(
        maxFrequency > 0 ? tile.visitCount / maxFrequency : 0
      ),
    }));
    
    return { tiles, maxFrequency };
  }

  /**
   * Export analytics in specified format
   * @param {string} format - 'json' or 'csv'
   * @returns {string} Formatted analytics data
   */
  exportAnalytics(format = 'json') {
    const stats = this.getOverallStats();
    const rankings = this.getPlayerRankings('properties');
    const tilePopularity = this.getTilePopularity();
    const sessions = this.listSessions();
    
    const exportData = {
      version: ANALYTICS_VERSION,
      exportedAt: Date.now(),
      stats,
      rankings,
      tilePopularity,
      sessions,
    };
    
    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    }
    
    if (format === 'csv') {
      return this._exportCSV(exportData);
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Generate human-readable summary report
   * @returns {string} Formatted report string
   */
  generateReport() {
    const stats = this.getOverallStats();
    const rankings = this.getPlayerRankings('properties');
    const popularity = this.getTilePopularity().slice(0, 5);
    const sessions = this.sessions;
    
    const lines = [
      '='.repeat(50),
      ' MONOPOLY3D CROSS-GAME ANALYTICS REPORT',
      '='.repeat(50),
      '',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      '- OVERALL STATISTICS -',
      `Total Games: ${stats.totalGames}`,
      `Average Duration: ${stats.avgDurationFormatted}`,
      `Total Players: ${stats.totalPlayers}`,
      `Average Players/Game: ${stats.avgPlayersPerGame}`,
      `Total Questions: ${stats.totalQuestions}`,
      `Total Properties Bought: ${stats.totalPropertiesBought}`,
      `Total Rent Paid: $${stats.totalRentPaid}`,
      `Average Dice Roll: ${stats.avgDiceRoll}`,
      '',
      '- TOP PLAYERS (by properties) -',
    ];
    
    rankings.slice(0, 5).forEach(p => {
      lines.push(`  ${p.rank}. ${p.playerId}: ${p.value} properties`);
    });
    
    lines.push('');
    lines.push('- MOST VISITED TILES -');
    
    popularity.forEach((tile, idx) => {
      lines.push(`  ${idx + 1}. Tile ${tile.tileId}: ${tile.visitCount} visits`);
    });
    
    lines.push('');
    lines.push('- RECENT SESSIONS -');
    
    sessions.slice(-5).reverse().forEach(s => {
      const date = new Date(s.startTime).toLocaleDateString();
      const duration = s.duration ? this._formatDuration(s.duration) : 'N/A';
      lines.push(`  ${date}: ${s.gameId} (${duration})`);
    });
    
    lines.push('');
    lines.push('='.repeat(50));
    
    return lines.join('\n');
  }

  /**
   * Internal: Format milliseconds to human-readable duration
   * @private
   */
  _formatDuration(ms) {
    if (!ms || ms <= 0) return '0s';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Internal: Get heatmap color for frequency value
   * @private
   * @param {number} frequency - Normalized frequency (0-1)
   * @returns {string} Hex color string
   */
  _getHeatmapColor(frequency) {
    // Green (#00FF00) -> Yellow (#FFFF00) -> Red (#FF0000)
    if (frequency >= 0.7) {
      // Green range
      const t = (frequency - 0.7) / 0.3;
      return this._lerpColor('#FFFF00', '#00FF00', t);
    }
    if (frequency >= 0.3) {
      // Yellow range
      const t = (frequency - 0.3) / 0.4;
      return this._lerpColor('#FF0000', '#FFFF00', t);
    }
    // Red range
    const t = frequency / 0.3;
    return this._lerpColor('#800000', '#FF0000', t);
  }

  /**
   * Internal: Linear interpolation between two colors
   * @private
   */
  _lerpColor(color1, color2, t) {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Internal: Export data as CSV format
   * @private
   */
  _exportCSV(data) {
    const lines = [];
    
    // Stats section
    lines.push('STATISTICS');
    lines.push('Metric,Value');
    lines.push(`Total Games,${data.stats.totalGames}`);
    lines.push(`Average Duration (ms),${data.stats.avgDuration}`);
    lines.push(`Total Players,${data.stats.totalPlayers}`);
    lines.push(`Total Questions,${data.stats.totalQuestions}`);
    lines.push(`Total Properties Bought,${data.stats.totalPropertiesBought}`);
    lines.push(`Total Rent Paid,${data.stats.totalRentPaid}`);
    lines.push('');
    
    // Rankings section
    lines.push('PLAYER RANKINGS');
    lines.push('Rank,Player ID,Value');
    data.rankings.forEach(p => {
      lines.push(`${p.rank},${p.playerId},${p.value}`);
    });
    lines.push('');
    
    // Tile popularity section
    lines.push('TILE POPULARITY');
    lines.push('Tile ID,Visit Count,Purchase Count');
    data.tilePopularity.forEach(t => {
      lines.push(`${t.tileId},${t.visitCount},${t.purchaseCount}`);
    });
    lines.push('');
    
    // Sessions section
    lines.push('SESSIONS');
    lines.push('Session ID,Game ID,Start Time,End Time,Duration (ms)');
    data.sessions.forEach(s => {
      lines.push(`${s.sessionId},${s.gameId},${s.startTime},${s.endTime || ''},${s.duration || ''}`);
    });
    
    return lines.join('\n');
  }
}

export default CrossGameAnalytics;