/**
 * Progression System - Player level and XP tracking
 * 
 * Manages player levels, experience points, and milestone progression.
 */

export class ProgressionSystem {
  constructor(achievementManager) {
    this.achievementManager = achievementManager;
    
    // Player progression data: Map<playerId, PlayerProgression>
    this.playerProgression = new Map();
    
    // Level configuration
    this.levelConfig = {
      baseXp: 100,           // XP needed for level 1
      xpMultiplier: 1.5,     // Multiplier per level
      maxLevel: 50
    };
    
    // Milestone definitions
    this.milestones = [
      { level: 5, xpBonus: 100, reward: 'unlock_trading' },
      { level: 10, xpBonus: 250, reward: 'unlock_auction' },
      { level: 15, xpBonus: 500, reward: 'unlock_special' },
      { level: 20, xpBonus: 1000, reward: 'unlock_elite' },
      { level: 25, xpBonus: 2000, reward: 'unlock_master' },
      { level: 30, xpBonus: 5000, reward: 'unlock_legend' }
    ];
    
    // Initialize default player if needed
    this._ensureDefaultPlayer();
  }

  /**
   * Ensure default player exists for testing
   */
  _ensureDefaultPlayer() {
    if (this.playerProgression.size === 0) {
      this.playerProgression.set('default', this._createPlayerProgression());
    }
  }

  /**
   * Create new player progression record
   * @returns {Object} Player progression data
   */
  _createPlayerProgression() {
    return {
      level: 1,
      currentXp: 0,
      totalXp: 0,
      milestoneProgress: new Map(),
      recentMilestones: []
    };
  }

  /**
   * Calculate XP needed for a specific level
   * @param {number} level - Target level
   * @returns {number} XP required
   */
  _calculateXpForLevel(level) {
    const { baseXp, xpMultiplier } = this.levelConfig;
    let totalXp = 0;
    
    for (let i = 1; i < level; i++) {
      totalXp += Math.floor(baseXp * Math.pow(xpMultiplier, i - 1));
    }
    
    return totalXp;
  }

  /**
   * Get player's current level
   * @param {string} playerId - Player ID
   * @returns {number} Current level
   */
  getPlayerLevel(playerId) {
    const progression = this.playerProgression.get(playerId);
    return progression ? progression.level : 1;
  }

  /**
   * Get player's current XP
   * @param {string} playerId - Player ID
   * @returns {Object} XP data
   */
  getPlayerXp(playerId) {
    const progression = this.playerProgression.get(playerId);
    
    if (!progression) {
      return { current: 0, total: 0, forNextLevel: this._calculateXpForLevel(2) };
    }
    
    const xpForCurrentLevel = this._calculateXpForLevel(progression.level);
    const xpForNextLevel = this._calculateXpForLevel(progression.level + 1);
    const currentLevelXp = progression.currentXp;
    
    return {
      current: currentLevelXp,
      total: progression.totalXp,
      forNextLevel: xpForNextLevel - xpForCurrentLevel,
      progress: xpForNextLevel > xpForCurrentLevel 
        ? Math.round((currentLevelXp / (xpForNextLevel - xpForCurrentLevel)) * 100)
        : 100
    };
  }

  /**
   * Add experience points to a player
   * @param {string} playerId - Player ID
   * @param {number} amount - XP amount to add
   * @returns {Object} Result with level up info if applicable
   */
  addExperience(playerId, amount) {
    if (!this.playerProgression.has(playerId)) {
      this.playerProgression.set(playerId, this._createPlayerProgression());
    }
    
    const progression = this.playerProgression.get(playerId);
    const result = {
      xpAdded: amount,
      levelUps: 0,
      newLevel: progression.level,
      milestonesAwarded: []
    };
    
    progression.currentXp += amount;
    progression.totalXp += amount;
    
    // Check for level ups
    let leveledUp = true;
    while (leveledUp) {
      const xpForNextLevel = this._calculateXpForLevel(progression.level + 1);
      const xpForCurrentLevel = this._calculateXpForLevel(progression.level);
      const xpNeeded = xpForNextLevel - xpForCurrentLevel;
      
      if (progression.currentXp >= xpNeeded && progression.level < this.levelConfig.maxLevel) {
        progression.currentXp -= xpNeeded;
        progression.level++;
        result.levelUps++;
        result.newLevel = progression.level;
        
        // Check milestone completion
        const milestoneResult = this.checkMilestoneCompletion(playerId);
        if (milestoneResult.awarded.length > 0) {
          result.milestonesAwarded.push(...milestoneResult.awarded);
        }
        
        // Update achievement if linked
        if (this.achievementManager) {
          this.achievementManager.updateProgress(playerId, 'level_5', progression.level);
          this.achievementManager.updateProgress(playerId, 'level_10', progression.level);
        }
      } else {
        leveledUp = false;
      }
    }
    
    return result;
  }

  /**
   * Set player level directly (for testing or special cases)
   * @param {string} playerId - Player ID
   * @param {number} level - Target level
   */
  setPlayerLevel(playerId, level) {
    if (!this.playerProgression.has(playerId)) {
      this.playerProgression.set(playerId, this._createPlayerProgression());
    }
    
    const progression = this.playerProgression.get(playerId);
    const oldLevel = progression.level;
    
    progression.level = Math.min(Math.max(1, level), this.levelConfig.maxLevel);
    progression.currentXp = 0;
    
    // Award milestones between old and new level
    for (const milestone of this.milestones) {
      if (milestone.level > oldLevel && milestone.level <= progression.level) {
        this._awardMilestone(playerId, milestone);
      }
    }
  }

  /**
   * Award XP bonus from milestone
   * @param {string} playerId - Player ID
   * @param {Object} milestone - Milestone data
   */
  _awardMilestone(playerId, milestone) {
    const progression = this.playerProgression.get(playerId);
    
    if (!progression.milestoneProgress.has(milestone.level)) {
      progression.milestoneProgress.set(milestone.level, {
        awarded: false,
        awardedAt: null
      });
    }
    
    const status = progression.milestoneProgress.get(milestone.level);
    
    if (!status.awarded) {
      status.awarded = true;
      status.awardedAt = Date.now();
      progression.recentMilestones.push({
        level: milestone.level,
        xpBonus: milestone.xpBonus,
        reward: milestone.reward,
        awardedAt: status.awardedAt
      });
      
      // Add milestone XP bonus
      progression.currentXp += milestone.xpBonus;
      progression.totalXp += milestone.xpBonus;
    }
  }

  /**
   * Get upcoming milestones for a player
   * @param {string} playerId - Player ID
   * @returns {Array} Upcoming milestone data
   */
  getMilestones(playerId) {
    const progression = this.playerProgression.get(playerId);
    const currentLevel = progression ? progression.level : 1;
    
    return this.milestones
      .filter(m => m.level > currentLevel)
      .map(m => ({
        level: m.level,
        xpBonus: m.xpBonus,
        reward: m.reward,
        distance: m.level - currentLevel
      }));
  }

  /**
   * Get completed milestones for a player
   * @param {string} playerId - Player ID
   * @returns {Array} Completed milestone data
   */
  getCompletedMilestones(playerId) {
    const progression = this.playerProgression.get(playerId);
    
    if (!progression) return [];
    
    return this.milestones
      .filter(m => progression.milestoneProgress.has(m.level))
      .filter(m => progression.milestoneProgress.get(m.level).awarded)
      .map(m => ({
        level: m.level,
        xpBonus: m.xpBonus,
        reward: m.reward,
        awardedAt: progression.milestoneProgress.get(m.level).awardedAt
      }));
  }

  /**
   * Check and award milestone completion
   * @param {string} playerId - Player ID
   * @returns {Object} Milestone check result
   */
  checkMilestoneCompletion(playerId) {
    const progression = this.playerProgression.get(playerId);
    
    if (!progression) {
      return { awarded: [], newMilestones: [] };
    }
    
    const awarded = [];
    const newMilestones = [];
    
    for (const milestone of this.milestones) {
      if (progression.level >= milestone.level) {
        const status = progression.milestoneProgress.get(milestone.level);
        
        if (!status || !status.awarded) {
          this._awardMilestone(playerId, milestone);
          awarded.push({
            level: milestone.level,
            xpBonus: milestone.xpBonus,
            reward: milestone.reward
          });
          newMilestones.push(milestone);
        }
      }
    }
    
    return { awarded, newMilestones };
  }

  /**
   * Get progression summary for a player
   * @param {string} playerId - Player ID
   * @returns {Object} Full progression data
   */
  getProgressionSummary(playerId) {
    const progression = this.playerProgression.get(playerId);
    const level = this.getPlayerLevel(playerId);
    const xp = this.getPlayerXp(playerId);
    
    return {
      playerId,
      level,
      xp: xp.current,
      xpTotal: xp.total,
      xpProgress: xp.progress,
      nextMilestone: this.getMilestones(playerId)[0] || null,
      completedMilestones: this.getCompletedMilestones(playerId).length,
      recentMilestones: progression?.recentMilestones || []
    };
  }

  /**
   * Reset player progression
   * @param {string} playerId - Player ID
   */
  resetPlayer(playerId) {
    this.playerProgression.delete(playerId);
  }

  /**
   * Clear all data
   */
  clear() {
    this.playerProgression.clear();
    this._ensureDefaultPlayer();
  }
}

export default ProgressionSystem;
