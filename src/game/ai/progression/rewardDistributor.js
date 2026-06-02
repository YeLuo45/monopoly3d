/**
 * Reward Distributor - Handles reward distribution and redemption
 * 
 * Manages rewards, pending rewards queue, and redemption process.
 */

export class RewardDistributor {
  constructor(achievementManager, progressionSystem) {
    this.achievementManager = achievementManager;
    this.progressionSystem = progressionSystem;
    
    // Pending rewards: Map<playerId, Array<Reward>>
    this.pendingRewards = new Map();
    
    // Reward history: Map<playerId, Array<Reward>>
    this.rewardHistory = new Map();
    
    // Reward ID counter
    this.rewardIdCounter = 0;
    
    // Reward type definitions
    this.rewardTypes = {
      xp: { type: 'xp', autoRedeem: true },
      achievement: { type: 'achievement', autoRedeem: false },
      milestone: { type: 'milestone', autoRedeem: true },
      unlock: { type: 'unlock', autoRedeem: false },
      bonus: { type: 'bonus', autoRedeem: false }
    };
  }

  /**
   * Generate unique reward ID
   * @returns {string} Unique reward ID
   */
  _generateRewardId() {
    return `reward_${Date.now()}_${++this.rewardIdCounter}`;
  }

  /**
   * Distribute a reward to a player
   * @param {string} playerId - Player ID
   * @param {string} rewardType - Type of reward
   * @param {Object} rewardData - Reward data
   * @returns {Object} Distribution result
   */
  distributeReward(playerId, rewardType, rewardData) {
    const rewardDef = this.rewardTypes[rewardType];
    
    if (!rewardDef) {
      return { success: false, error: 'Invalid reward type' };
    }
    
    // Initialize player data if needed
    if (!this.pendingRewards.has(playerId)) {
      this.pendingRewards.set(playerId, []);
    }
    if (!this.rewardHistory.has(playerId)) {
      this.rewardHistory.set(playerId, []);
    }
    
    const reward = {
      id: this._generateRewardId(),
      type: rewardType,
      data: rewardData,
      createdAt: Date.now(),
      redeemed: false
    };
    
    // Handle auto-redemption
    if (rewardDef.autoRedeem) {
      const redeemResult = this._redeemReward(playerId, reward);
      return {
        success: true,
        autoRedeemed: true,
        reward: reward,
        result: redeemResult
      };
    }
    
    // Add to pending rewards
    this.pendingRewards.get(playerId).push(reward);
    
    return {
      success: true,
      autoRedeemed: false,
      reward: reward
    };
  }

  /**
   * Internal redemption logic
   * @param {string} playerId - Player ID
   * @param {Object} reward - Reward to redeem
   * @returns {Object} Redemption result
   */
  _redeemReward(playerId, reward) {
    reward.redeemed = true;
    reward.redeemedAt = Date.now();
    
    // Add to history
    this.rewardHistory.get(playerId).push(reward);
    
    switch (reward.type) {
      case 'xp':
        return this._applyXpReward(playerId, reward);
      case 'milestone':
        return this._applyMilestoneReward(playerId, reward);
      case 'bonus':
        return this._applyBonusReward(playerId, reward);
      default:
        return { applied: true };
    }
  }

  /**
   * Apply XP reward
   * @param {string} playerId - Player ID
   * @param {Object} reward - Reward data
   * @returns {Object} Application result
   */
  _applyXpReward(playerId, reward) {
    const xpAmount = reward.data.amount || 0;
    const result = this.progressionSystem.addExperience(playerId, xpAmount);
    
    return {
      applied: true,
      type: 'xp',
      amount: xpAmount,
      levelUps: result.levelUps,
      newLevel: result.newLevel
    };
  }

  /**
   * Apply milestone reward
   * @param {string} playerId - Player ID
   * @param {Object} reward - Reward data
   * @returns {Object} Application result
   */
  _applyMilestoneReward(playerId, reward) {
    // Milestone rewards are typically auto-applied through progression system
    const level = reward.data.level || 0;
    const xpBonus = reward.data.xpBonus || 0;
    
    if (this.progressionSystem) {
      this.progressionSystem.setPlayerLevel(playerId, level);
    }
    
    return {
      applied: true,
      type: 'milestone',
      level,
      xpBonus
    };
  }

  /**
   * Apply bonus reward
   * @param {string} playerId - Player ID
   * @param {Object} reward - Reward data
   * @returns {Object} Application result
   */
  _applyBonusReward(playerId, reward) {
    // Bonus rewards can be game-specific (money, items, etc.)
    return {
      applied: true,
      type: 'bonus',
      bonusType: reward.data.bonusType,
      value: reward.data.value
    };
  }

  /**
   * Get pending (unredeemed) rewards for a player
   * @param {string} playerId - Player ID
   * @returns {Array} Pending rewards
   */
  getPendingRewards(playerId) {
    const rewards = this.pendingRewards.get(playerId);
    return rewards ? rewards.filter(r => !r.redeemed) : [];
  }

  /**
   * Get reward history for a player
   * @param {string} playerId - Player ID
   * @param {number} limit - Maximum number of rewards to return
   * @returns {Array} Reward history
   */
  getRewardHistory(playerId, limit = 50) {
    const history = this.rewardHistory.get(playerId) || [];
    return history.slice(-limit);
  }

  /**
   * Redeem a specific pending reward
   * @param {string} playerId - Player ID
   * @param {string} rewardId - Reward ID to redeem
   * @returns {Object} Redemption result
   */
  redeemReward(playerId, rewardId) {
    const pending = this.pendingRewards.get(playerId);
    
    if (!pending) {
      return { success: false, error: 'No pending rewards' };
    }
    
    const rewardIndex = pending.findIndex(r => r.id === rewardId && !r.redeemed);
    
    if (rewardIndex === -1) {
      return { success: false, error: 'Reward not found or already redeemed' };
    }
    
    const reward = pending[rewardIndex];
    const result = this._redeemReward(playerId, reward);
    
    // Remove from pending
    pending.splice(rewardIndex, 1);
    
    return {
      success: true,
      result
    };
  }

  /**
   * Redeem all pending rewards for a player
   * @param {string} playerId - Player ID
   * @returns {Object} Redemption results
   */
  redeemAllRewards(playerId) {
    const pending = this.getPendingRewards(playerId);
    const results = [];
    
    for (const reward of pending) {
      const result = this._redeemReward(playerId, reward);
      results.push({ rewardId: reward.id, result });
    }
    
    // Clear pending
    if (this.pendingRewards.has(playerId)) {
      this.pendingRewards.set(playerId, []);
    }
    
    return {
      success: true,
      count: results.length,
      results
    };
  }

  /**
   * Distribute achievement reward
   * @param {string} playerId - Player ID
   * @param {string} achievementId - Achievement ID
   * @returns {Object} Distribution result
   */
  distributeAchievementReward(playerId, achievementId) {
    if (!this.achievementManager) {
      return { success: false, error: 'Achievement manager not available' };
    }
    
    const unlockResult = this.achievementManager.unlockAchievement(playerId, achievementId);
    
    if (!unlockResult.success) {
      return unlockResult;
    }
    
    // Distribute XP reward if achievement has one
    const achievement = unlockResult.achievement;
    
    if (achievement.xpReward) {
      return this.distributeReward(playerId, 'xp', {
        amount: achievement.xpReward,
        source: 'achievement',
        achievementId
      });
    }
    
    return {
      success: true,
      achievement: unlockResult.achievement
    };
  }

  /**
   * Get reward statistics for a player
   * @param {string} playerId - Player ID
   * @returns {Object} Reward statistics
   */
  getRewardStats(playerId) {
    const history = this.rewardHistory.get(playerId) || [];
    const pending = this.getPendingRewards(playerId);
    
    const stats = {
      totalRedeemed: history.length,
      pending: pending.length,
      byType: {}
    };
    
    for (const reward of history) {
      stats.byType[reward.type] = (stats.byType[reward.type] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Reset player rewards
   * @param {string} playerId - Player ID
   */
  resetPlayer(playerId) {
    this.pendingRewards.delete(playerId);
    this.rewardHistory.delete(playerId);
  }

  /**
   * Clear all data
   */
  clear() {
    this.pendingRewards.clear();
    this.rewardHistory.clear();
    this.rewardIdCounter = 0;
  }
}

export default RewardDistributor;
