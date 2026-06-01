/**
 * TradeHistory - Track all trades for learning and analysis
 * 
 * Maintains a record of all trades made in games, enabling:
 * - Historical trade lookup by player or partner
 * - Trade pattern analysis
 * - Win rate correlation analysis
 */

export class TradeHistory {
  /**
   * @param {object} memoryLayer - AIMemoryLayer instance
   */
  constructor(memoryLayer) {
    this.memoryLayer = memoryLayer;
    this.trades = [];
    this.nextTradeId = 1;
  }

  /**
   * Record a trade in history
   * @param {object} trade - Trade object to record
   * @returns {object} Trade with added ID and timestamp
   */
  recordTrade(trade) {
    const recordedTrade = {
      id: `trade_${this.nextTradeId++}`,
      players: trade.players || [],
      offered: trade.offered || { properties: [], money: 0 },
      requested: trade.requested || { properties: [], money: 0 },
      fairness: trade.fairness ?? 0.5,
      timestamp: trade.timestamp || Date.now(),
      gameId: trade.gameId || this.memoryLayer?.currentGameId || 'unknown',
    };
    
    this.trades.push(recordedTrade);
    
    // Limit history size to prevent memory issues
    if (this.trades.length > 500) {
      this.trades = this.trades.slice(-500);
    }
    
    return recordedTrade;
  }

  /**
   * Get recent trade history for a player
   * @param {string} playerId - Player ID
   * @param {number} limit - Max trades to return (default 20)
   * @returns {Array} Array of trade objects
   */
  getTradeHistory(playerId, limit = 20) {
    const playerTrades = this.trades.filter(
      t => t.players && t.players.includes(playerId)
    );
    
    // Sort by timestamp descending (most recent first)
    const sorted = playerTrades.sort((a, b) => b.timestamp - a.timestamp);
    
    return sorted.slice(0, limit);
  }

  /**
   * Get trade history with a specific partner
   * @param {string} playerId - First player ID
   * @param {string} partnerId - Second player ID
   * @returns {Array} Array of trades between the two players
   */
  getPartnerHistory(playerId, partnerId) {
    return this.trades.filter(
      t => t.players && t.players.includes(playerId) && t.players.includes(partnerId)
    );
  }

  /**
   * Get trade patterns for a player
   * @param {string} playerId - Player ID
   * @returns {object} {avgFairness, commonPartners, favoredProperties, tradeCount}
   */
  getTradePatterns(playerId) {
    const playerTrades = this.getTradeHistory(playerId, 100);
    
    if (playerTrades.length === 0) {
      return {
        avgFairness: 0.5,
        commonPartners: [],
        favoredProperties: [],
        tradeCount: 0,
      };
    }
    
    // Calculate average fairness
    const totalFairness = playerTrades.reduce((sum, t) => sum + (t.fairness || 0.5), 0);
    const avgFairness = totalFairness / playerTrades.length;
    
    // Find common partners
    const partnerCounts = {};
    for (const trade of playerTrades) {
      for (const p of trade.players) {
        if (p !== playerId) {
          partnerCounts[p] = (partnerCounts[p] || 0) + 1;
        }
      }
    }
    
    const commonPartners = Object.entries(partnerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([partnerId]) => partnerId);
    
    // Find favored properties (most commonly traded)
    const propertyCounts = {};
    for (const trade of playerTrades) {
      const offeredProps = trade.offered?.properties || [];
      const requestedProps = trade.requested?.properties || [];
      
      for (const prop of offeredProps) {
        propertyCounts[prop] = (propertyCounts[prop] || 0) + 1;
      }
      for (const prop of requestedProps) {
        propertyCounts[prop] = (propertyCounts[prop] || 0) + 1;
      }
    }
    
    const favoredProperties = Object.entries(propertyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([propId]) => propId);
    
    return {
      avgFairness,
      commonPartners,
      favoredProperties,
      tradeCount: playerTrades.length,
    };
  }

  /**
   * Get correlation between trades and wins for a player
   * @param {string} playerId - Player ID
   * @returns {object} {winRateWithTrades, winRateWithoutTrades, tradeWinCorrelation}
   */
  getWinRateFromTrades(playerId) {
    const playerTrades = this.getTradeHistory(playerId, 100);
    
    if (playerTrades.length === 0) {
      return {
        winRateWithTrades: 0,
        winRateWithoutTrades: 0,
        tradeWinCorrelation: 0,
      };
    }
    
    // For this simplified analysis, we consider trades where fairness >= 0.6 as "good" trades
    const goodTrades = playerTrades.filter(t => (t.fairness || 0.5) >= 0.6);
    
    // In a real implementation, we'd cross-reference with game outcomes
    // For now, return a simplified metric
    const avgFairness = playerTrades.reduce((sum, t) => sum + (t.fairness || 0.5), 0) / playerTrades.length;
    
    // Trade win correlation: higher fairness trades correlate with winning
    // This is a simplified heuristic
    const tradeWinCorrelation = (avgFairness - 0.5) * 2; // Scale to -1 to 1
    
    return {
      winRateWithTrades: avgFairness,
      winRateWithoutTrades: 0.5, // Placeholder
      tradeWinCorrelation,
      totalTrades: playerTrades.length,
      goodTrades: goodTrades.length,
    };
  }

  /**
   * Get all trades involving a specific property
   * @param {string} propertyId - Property ID
   * @returns {Array} Array of trades involving this property
   */
  getPropertyTradeHistory(propertyId) {
    return this.trades.filter(
      t => (t.offered?.properties?.includes(propertyId)) || 
           (t.requested?.properties?.includes(propertyId))
    );
  }

  /**
   * Get trade statistics for analysis
   * @returns {object} Trade statistics
   */
  getStatistics() {
    if (this.trades.length === 0) {
      return {
        totalTrades: 0,
        avgFairness: 0.5,
        mostTradedProperty: null,
        mostActiveTrader: null,
      };
    }
    
    const totalTrades = this.trades.length;
    const avgFairness = this.trades.reduce((sum, t) => sum + (t.fairness || 0.5), 0) / totalTrades;
    
    // Most traded property
    const propertyCounts = {};
    for (const trade of this.trades) {
      for (const prop of (trade.offered?.properties || [])) {
        propertyCounts[prop] = (propertyCounts[prop] || 0) + 1;
      }
      for (const prop of (trade.requested?.properties || [])) {
        propertyCounts[prop] = (propertyCounts[prop] || 0) + 1;
      }
    }
    
    let mostTradedProperty = null;
    let maxCount = 0;
    for (const [prop, count] of Object.entries(propertyCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostTradedProperty = prop;
      }
    }
    
    // Most active trader
    const playerTradeCounts = {};
    for (const trade of this.trades) {
      for (const playerId of (trade.players || [])) {
        playerTradeCounts[playerId] = (playerTradeCounts[playerId] || 0) + 1;
      }
    }
    
    let mostActiveTrader = null;
    maxCount = 0;
    for (const [playerId, count] of Object.entries(playerTradeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostActiveTrader = playerId;
      }
    }
    
    return {
      totalTrades,
      avgFairness,
      mostTradedProperty,
      mostActiveTrader,
      tradesByPlayer: playerTradeCounts,
    };
  }

  /**
   * Clear all trade history
   */
  clear() {
    this.trades = [];
    this.nextTradeId = 1;
  }

  /**
   * Export trade history as JSON
   * @returns {string} JSON string of trade history
   */
  exportHistory() {
    return JSON.stringify({
      trades: this.trades,
      nextTradeId: this.nextTradeId,
    });
  }

  /**
   * Import trade history from JSON
   * @param {string} jsonStr - JSON string from exportHistory
   * @returns {boolean} Success
   */
  importHistory(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.trades && Array.isArray(data.trades)) {
        this.trades = data.trades;
        this.nextTradeId = data.nextTradeId || this.trades.length + 1;
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}