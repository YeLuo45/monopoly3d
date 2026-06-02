/**
 * LeaderboardManager - Leaderboard and Ranking System
 * 
 * Manages player rankings, scores, and leaderboards for
 * competitive multiplayer features in Monopoly3D.
 */

export class LeaderboardManager {
  constructor() {
    this.scores = new Map();         // playerId -> score data
    this.rankings = new Map();        // category -> sorted array of {playerId, score}
    this.timeRanges = ['all', 'daily', 'weekly', 'monthly'];
    this.categories = ['wins', 'money', 'properties', 'trades'];
    this.DEFAULT_CATEGORY = 'wins';
    this.DEFAULT_TIME_RANGE = 'all';
  }

  /**
   * Get current timestamp bucket for time-based leaderboards
   * @param {string} timeRange - Time range (daily, weekly, monthly)
   * @returns {string} Bucket identifier
   */
  getTimeBucket(timeRange) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    switch (timeRange) {
      case 'daily':
        return `${year}-${month}-${day}`;
      case 'weekly':
        const weekNum = this.getWeekNumber(now);
        return `${year}-W${weekNum}`;
      case 'monthly':
        return `${year}-${month}`;
      case 'all':
      default:
        return 'all';
    }
  }

  /**
   * Get ISO week number
   * @param {Date} date - Date object
   * @returns {number} Week number
   */
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * Initialize player score data if not exists
   * @param {string} playerId - Player ID
   * @param {string} category - Category
   * @param {string} timeRange - Time range
   */
  initPlayerScore(playerId, category, timeRange) {
    if (!this.scores.has(playerId)) {
      this.scores.set(playerId, {
        wins: { all: 0, daily: {}, weekly: {}, monthly: {} },
        money: { all: 0, daily: {}, weekly: {}, monthly: {} },
        properties: { all: 0, daily: {}, weekly: {}, monthly: {} },
        trades: { all: 0, daily: {}, weekly: {}, monthly: {} }
      });
    }
  }

  /**
   * Update player score in a category
   * @param {string} playerId - Player ID
   * @param {number} score - Score to add (can be negative)
   * @param {Object} options - Optional parameters
   * @returns {Object} Updated score info
   */
  updateScore(playerId, score, options = {}) {
    const category = options.category || this.DEFAULT_CATEGORY;
    const timeRange = options.timeRange || this.DEFAULT_TIME_RANGE;

    if (!this.categories.includes(category)) {
      return { success: false, error: 'Invalid category' };
    }

    if (!this.timeRanges.includes(timeRange)) {
      return { success: false, error: 'Invalid time range' };
    }

    this.initPlayerScore(playerId, category, timeRange);
    const playerScore = this.scores.get(playerId)[category];

    // Update "all" time
    playerScore.all += score;

    // Update time-specific bucket
    if (timeRange !== 'all') {
      const bucket = this.getTimeBucket(timeRange);
      if (!playerScore[timeRange][bucket]) {
        playerScore[timeRange][bucket] = 0;
      }
      playerScore[timeRange][bucket] += score;
    }

    // Invalidate ranking cache for this category
    this.rankings.delete(`${category}_${timeRange}`);

    return {
      success: true,
      playerId,
      category,
      timeRange,
      totalScore: playerScore.all,
      timeScore: timeRange === 'all' ? playerScore.all : (playerScore[timeRange][this.getTimeBucket(timeRange)] || 0)
    };
  }

  /**
   * Get player's rank in a category
   * @param {string} playerId - Player ID
   * @param {Object} options - Optional parameters
   * @returns {Object} Rank information
   */
  getRank(playerId, options = {}) {
    const category = options.category || this.DEFAULT_CATEGORY;
    const timeRange = options.timeRange || this.DEFAULT_TIME_RANGE;

    if (!this.scores.has(playerId)) {
      return { rank: -1, playerId, category, timeRange };
    }

    const leaderboard = this.getLeaderboard(category, timeRange);
    const entry = leaderboard.find(e => e.playerId === playerId);

    if (!entry) {
      return { rank: -1, playerId, category, timeRange };
    }

    return {
      rank: entry.rank,
      playerId,
      score: entry.score,
      category,
      timeRange
    };
  }

  /**
   * Get top N players in a category
   * @param {number} count - Number of players to return
   * @param {Object} options - Optional parameters
   * @returns {Array} Top players array
   */
  getTopPlayers(count, options = {}) {
    const category = options.category || this.DEFAULT_CATEGORY;
    const timeRange = options.timeRange || this.DEFAULT_TIME_RANGE;
    const offset = options.offset || 0;

    const leaderboard = this.getLeaderboard(category, timeRange);
    return leaderboard.slice(offset, offset + count);
  }

  /**
   * Get full leaderboard for a category and time range
   * @param {string} category - Category
   * @param {string} timeRange - Time range
   * @returns {Array} Sorted leaderboard array
   */
  getLeaderboard(category, timeRange) {
    const cacheKey = `${category}_${timeRange}`;

    // Return cached if exists
    if (this.rankings.has(cacheKey)) {
      return this.rankings.get(cacheKey);
    }

    const leaderboard = [];

    for (const [playerId, scores] of this.scores) {
      let score;
      
      if (timeRange === 'all') {
        score = scores[category].all;
      } else {
        const bucket = this.getTimeBucket(timeRange);
        score = scores[category][timeRange]?.[bucket] || 0;
      }

      if (score > 0) {
        leaderboard.push({ playerId, score });
      }
    }

    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);

    // Add rank
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    this.rankings.set(cacheKey, leaderboard);
    return leaderboard;
  }

  /**
   * Get player's score in a category
   * @param {string} playerId - Player ID
   * @param {Object} options - Optional parameters
   * @returns {number} Player's score
   */
  getPlayerScore(playerId, options = {}) {
    const category = options.category || this.DEFAULT_CATEGORY;
    const timeRange = options.timeRange || this.DEFAULT_TIME_RANGE;

    if (!this.scores.has(playerId)) {
      return 0;
    }

    const playerScore = this.scores.get(playerId)[category];

    if (timeRange === 'all') {
      return playerScore.all;
    }

    const bucket = this.getTimeBucket(timeRange);
    return playerScore[timeRange]?.[bucket] || 0;
  }

  /**
   * Reset scores for a time range (cleanup)
   * @param {string} timeRange - Time range to reset
   */
  resetTimeRange(timeRange) {
    if (timeRange === 'all') return; // Don't reset all time

    for (const [, scores] of this.scores) {
      for (const category of this.categories) {
        scores[category][timeRange] = {};
      }
    }

    // Clear ranking cache
    for (const key of this.rankings.keys()) {
      if (key.endsWith(`_${timeRange}`)) {
        this.rankings.delete(key);
      }
    }
  }

  /**
   * Get all categories
   * @returns {Array} List of categories
   */
  getCategories() {
    return [...this.categories];
  }

  /**
   * Get all time ranges
   * @returns {Array} List of time ranges
   */
  getTimeRanges() {
    return [...this.timeRanges];
  }

  /**
   * Get total player count in leaderboard
   * @param {Object} options - Optional parameters
   * @returns {number} Player count
   */
  getPlayerCount(options = {}) {
    const category = options.category || this.DEFAULT_CATEGORY;
    const timeRange = options.timeRange || this.DEFAULT_TIME_RANGE;

    return this.getLeaderboard(category, timeRange).length;
  }

  /**
   * Clear all leaderboard data
   */
  clearAll() {
    this.scores.clear();
    this.rankings.clear();
  }
}

export default LeaderboardManager;
