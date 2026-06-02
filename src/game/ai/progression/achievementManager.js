/**
 * Achievement Manager - Handles player achievements and progress tracking
 * 
 * Manages unlocking, querying, and progress calculation for player achievements.
 */

export class AchievementManager {
  constructor() {
    // Player achievements: Map<playerId, Set<achievementId>>
    this.playerAchievements = new Map();
    
    // Achievement definitions: Map<achievementId, AchievementDefinition>
    this.achievementDefinitions = new Map();
    
    // Achievement progress: Map<playerId, Map<achievementId, ProgressData>>
    this.achievementProgress = new Map();
    
    // Initialize default achievements
    this._initializeDefaultAchievements();
  }

  /**
   * Initialize default achievement definitions
   */
  _initializeDefaultAchievements() {
    const defaults = [
      {
        id: 'first_property',
        name: 'First Property',
        description: 'Purchase your first property',
        category: 'property',
        criteria: { type: 'property_count', threshold: 1 },
        xpReward: 50
      },
      {
        id: 'property_mogul',
        name: 'Property Mogul',
        description: 'Own 10 properties',
        category: 'property',
        criteria: { type: 'property_count', threshold: 10 },
        xpReward: 200
      },
      {
        id: 'first_win',
        name: 'Victory!',
        description: 'Win your first game',
        category: 'gameplay',
        criteria: { type: 'wins', threshold: 1 },
        xpReward: 100
      },
      {
        id: 'streak_master',
        name: 'Streak Master',
        description: 'Win 5 games in a row',
        category: 'gameplay',
        criteria: { type: 'win_streak', threshold: 5 },
        xpReward: 300
      },
      {
        id: 'money_maker',
        name: 'Money Maker',
        description: 'Accumulate $5000 in cash',
        category: 'economic',
        criteria: { type: 'cash_amount', threshold: 5000 },
        xpReward: 150
      },
      {
        id: 'trade_master',
        name: 'Trade Master',
        description: 'Complete 20 successful trades',
        category: 'trading',
        criteria: { type: 'trade_count', threshold: 20 },
        xpReward: 175
      },
      {
        id: 'bankrupt_escape',
        name: 'Survivor',
        description: 'Escape bankruptcy twice',
        category: 'gameplay',
        criteria: { type: 'bankrupt_escapes', threshold: 2 },
        xpReward: 100
      },
      {
        id: 'rent_collector',
        name: 'Rent Collector',
        description: 'Collect $1000 in rent in a single game',
        category: 'economic',
        criteria: { type: 'rent_collected', threshold: 1000 },
        xpReward: 125
      },
      {
        id: 'house_breaker',
        name: 'House Breaker',
        description: 'Build 10 houses in a single game',
        category: 'property',
        criteria: { type: 'houses_built', threshold: 10 },
        xpReward: 150
      },
      {
        id: 'hotel_magnate',
        name: 'Hotel Magnate',
        description: 'Build 5 hotels in a single game',
        category: 'property',
        criteria: { type: 'hotels_built', threshold: 5 },
        xpReward: 175
      },
      {
        id: 'level_5',
        name: 'Rising Star',
        description: 'Reach level 5',
        category: 'progression',
        criteria: { type: 'player_level', threshold: 5 },
        xpReward: 100
      },
      {
        id: 'level_10',
        name: 'Expert',
        description: 'Reach level 10',
        category: 'progression',
        criteria: { type: 'player_level', threshold: 10 },
        xpReward: 250
      }
    ];

    for (const achievement of defaults) {
      this.achievementDefinitions.set(achievement.id, {
        ...achievement,
        unlocked: false,
        unlockedAt: null
      });
    }
  }

  /**
   * Register a custom achievement definition
   * @param {Object} achievement - Achievement definition
   */
  registerAchievement(achievement) {
    if (!achievement.id) {
      throw new Error('Achievement must have an id');
    }
    this.achievementDefinitions.set(achievement.id, {
      ...achievement,
      unlocked: false,
      unlockedAt: null
    });
  }

  /**
   * Unlock an achievement for a player
   * @param {string} playerId - Player ID
   * @param {string} achievementId - Achievement ID
   * @returns {Object} Result with success flag and achievement data
   */
  unlockAchievement(playerId, achievementId) {
    const achievement = this.achievementDefinitions.get(achievementId);
    
    if (!achievement) {
      return { success: false, error: 'Achievement not found' };
    }

    // Initialize player data if needed
    if (!this.playerAchievements.has(playerId)) {
      this.playerAchievements.set(playerId, new Set());
    }
    if (!this.achievementProgress.has(playerId)) {
      this.achievementProgress.set(playerId, new Map());
    }

    // Check if already unlocked
    if (this.playerAchievements.get(playerId).has(achievementId)) {
      return { success: false, alreadyUnlocked: true };
    }

    // Unlock the achievement
    this.playerAchievements.get(playerId).add(achievementId);
    
    const unlockedAchievement = {
      ...achievement,
      unlocked: true,
      unlockedAt: Date.now()
    };
    this.achievementDefinitions.set(achievementId, unlockedAchievement);

    // Only initialize progress if not already set
    if (!this.achievementProgress.get(playerId).has(achievementId)) {
      this.achievementProgress.get(playerId).set(achievementId, {
        current: 0,
        target: achievement.criteria?.threshold || 1,
        completed: true,
        completedAt: Date.now()
      });
    } else {
      // Update existing progress to marked as completed
      const existingProgress = this.achievementProgress.get(playerId).get(achievementId);
      existingProgress.completed = true;
      existingProgress.completedAt = Date.now();
    }

    return {
      success: true,
      achievement: unlockedAchievement
    };
  }

  /**
   * Check if a player has a specific achievement
   * @param {string} playerId - Player ID
   * @param {string} achievementId - Achievement ID
   * @returns {boolean} True if achievement is unlocked
   */
  hasAchievement(playerId, achievementId) {
    const playerAchs = this.playerAchievements.get(playerId);
    return playerAchs ? playerAchs.has(achievementId) : false;
  }

  /**
   * Get all achievements for a player
   * @param {string} playerId - Player ID
   * @returns {Array} Array of achievement objects with status
   */
  getPlayerAchievements(playerId) {
    const playerAchs = this.playerAchievements.get(playerId) || new Set();
    const achievements = [];

    for (const [id, def] of this.achievementDefinitions) {
      const isUnlocked = playerAchs.has(id);
      const progress = this.getProgress(playerId, id);

      achievements.push({
        ...def,
        unlocked: isUnlocked,
        progress: progress
      });
    }

    return achievements;
  }

  /**
   * Get achievements by category
   * @param {string} playerId - Player ID
   * @param {string} category - Category to filter by
   * @returns {Array} Filtered achievements
   */
  getAchievementsByCategory(playerId, category) {
    return this.getPlayerAchievements(playerId)
      .filter(a => a.category === category);
  }

  /**
   * Get progress towards an achievement
   * @param {string} playerId - Player ID
   * @param {string} achievementId - Achievement ID
   * @returns {Object} Progress data
   */
  getProgress(playerId, achievementId) {
    const achievement = this.achievementDefinitions.get(achievementId);
    const playerProgress = this.achievementProgress.get(playerId);
    
    if (!achievement) {
      return { current: 0, target: 0, percentage: 0, completed: false };
    }

    const progress = playerProgress?.get(achievementId);
    const target = achievement.criteria?.threshold || 1;

    if (progress) {
      const percentage = Math.min(100, Math.round((progress.current / target) * 100));
      return {
        current: progress.current,
        target: target,
        percentage: percentage,
        completed: progress.completed
      };
    }

    return {
      current: 0,
      target: target,
      percentage: 0,
      completed: false
    };
  }

  /**
   * Update progress for an achievement
   * @param {string} playerId - Player ID
   * @param {string} achievementId - Achievement ID
   * @param {number} value - Current value
   */
  updateProgress(playerId, achievementId, value) {
    const achievement = this.achievementDefinitions.get(achievementId);
    
    if (!achievement) {
      return false;
    }

    if (!this.achievementProgress.has(playerId)) {
      this.achievementProgress.set(playerId, new Map());
    }

    const target = achievement.criteria?.threshold || 1;
    const completed = value >= target;

    this.achievementProgress.get(playerId).set(achievementId, {
      current: value,
      target: target,
      completed: completed,
      updatedAt: Date.now()
    });

    // Auto-unlock if completed
    if (completed && !this.hasAchievement(playerId, achievementId)) {
      this.unlockAchievement(playerId, achievementId);
    }

    return true;
  }

  /**
   * Increment progress for an achievement
   * @param {string} playerId - Player ID
   * @param {string} achievementId - Achievement ID
   * @param {number} amount - Amount to increment
   */
  incrementProgress(playerId, achievementId, amount = 1) {
    const progress = this.getProgress(playerId, achievementId);
    return this.updateProgress(playerId, achievementId, progress.current + amount);
  }

  /**
   * Get achievement stats for a player
   * @param {string} playerId - Player ID
   * @returns {Object} Achievement statistics
   */
  getPlayerStats(playerId) {
    const achievements = this.getPlayerAchievements(playerId);
    const unlocked = achievements.filter(a => a.unlocked);
    const categories = {};

    for (const a of achievements) {
      if (!categories[a.category]) {
        categories[a.category] = { total: 0, unlocked: 0 };
      }
      categories[a.category].total++;
      if (a.unlocked) categories[a.category].unlocked++;
    }

    return {
      total: achievements.length,
      unlocked: unlocked.length,
      locked: achievements.length - unlocked.length,
      totalXp: unlocked.reduce((sum, a) => sum + (a.xpReward || 0), 0),
      categories
    };
  }

  /**
   * Get all available achievement definitions
   * @returns {Array} All achievement definitions
   */
  getAllAchievements() {
    return Array.from(this.achievementDefinitions.values());
  }

  /**
   * Reset player data
   * @param {string} playerId - Player ID
   */
  resetPlayer(playerId) {
    this.playerAchievements.delete(playerId);
    this.achievementProgress.delete(playerId);
    
    // Reset achievement unlocked status
    for (const [id, def] of this.achievementDefinitions) {
      this.achievementDefinitions.set(id, {
        ...def,
        unlocked: false,
        unlockedAt: null
      });
    }
  }

  /**
   * Clear all data
   */
  clear() {
    this.playerAchievements.clear();
    this.achievementProgress.clear();
    this._initializeDefaultAchievements();
  }
}

export default AchievementManager;
