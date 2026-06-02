/**
 * RewardDistributor Tests
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';

const { RewardDistributor } = await import('../../src/game/ai/progression/rewardDistributor.js');
const { AchievementManager } = await import('../../src/game/ai/progression/achievementManager.js');
const { ProgressionSystem } = await import('../../src/game/ai/progression/progressionSystem.js');

describe('RewardDistributor', () => {
  let distributor;
  let achievementManager;
  let progressionSystem;

  before(() => {
    achievementManager = new AchievementManager();
    progressionSystem = new ProgressionSystem(achievementManager);
    distributor = new RewardDistributor(achievementManager, progressionSystem);
  });

  beforeEach(() => {
    distributor.clear();
    progressionSystem.clear();
    achievementManager.clear();
  });

  describe('constructor', () => {
    it('should initialize with reward types', () => {
      assert.ok(distributor.rewardTypes);
      assert.ok('xp' in distributor.rewardTypes);
      assert.ok('achievement' in distributor.rewardTypes);
      assert.ok('milestone' in distributor.rewardTypes);
    });

    it('should initialize with empty player data', () => {
      assert.strictEqual(distributor.pendingRewards.size, 0);
      assert.strictEqual(distributor.rewardHistory.size, 0);
    });
  });

  describe('distributeReward', () => {
    it('should distribute XP reward', () => {
      const result = distributor.distributeReward('player1', 'xp', { amount: 100 });
      
      assert.strictEqual(result.success, true);
      assert.ok(result.autoRedeemed);
      assert.ok(result.result);
    });

    it('should distribute non-auto-redeem reward to pending', () => {
      const result = distributor.distributeReward('player1', 'achievement', {
        achievementId: 'first_property'
      });
      
      assert.strictEqual(result.success, true);
      assert.ok(!result.autoRedeemed);
      assert.ok(result.reward);
    });

    it('should return error for invalid reward type', () => {
      const result = distributor.distributeReward('player1', 'invalid_type', {});
      
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('getPendingRewards', () => {
    it('should return empty array for new player', () => {
      const pending = distributor.getPendingRewards('player1');
      
      assert.deepStrictEqual(pending, []);
    });

    it('should return pending rewards', () => {
      distributor.distributeReward('player1', 'achievement', {
        achievementId: 'first_property'
      });
      const pending = distributor.getPendingRewards('player1');
      
      assert.ok(pending.length > 0);
    });
  });

  describe('getRewardHistory', () => {
    it('should return empty array for new player', () => {
      const history = distributor.getRewardHistory('player1');
      
      assert.deepStrictEqual(history, []);
    });

    it('should include redeemed rewards', () => {
      distributor.distributeReward('player1', 'xp', { amount: 50 });
      const history = distributor.getRewardHistory('player1');
      
      assert.ok(history.length > 0);
    });
  });

  describe('redeemReward', () => {
    it('should redeem a pending reward', () => {
      distributor.distributeReward('player1', 'achievement', {
        achievementId: 'first_property'
      });
      const pending = distributor.getPendingRewards('player1');
      const rewardId = pending[0].id;
      
      const result = distributor.redeemReward('player1', rewardId);
      
      assert.strictEqual(result.success, true);
    });

    it('should return error for non-existent reward', () => {
      const result = distributor.redeemReward('player1', 'fake_reward_id');
      
      assert.strictEqual(result.success, false);
    });

    it('should remove redeemed reward from pending', () => {
      distributor.distributeReward('player1', 'achievement', {
        achievementId: 'first_property'
      });
      const pending = distributor.getPendingRewards('player1');
      const rewardId = pending[0].id;
      
      distributor.redeemReward('player1', rewardId);
      const afterPending = distributor.getPendingRewards('player1');
      
      assert.strictEqual(afterPending.length, 0);
    });
  });

  describe('redeemAllRewards', () => {
    it('should redeem all pending rewards', () => {
      distributor.distributeReward('player1', 'achievement', {
        achievementId: 'first_property'
      });
      distributor.distributeReward('player1', 'achievement', {
        achievementId: 'first_win'
      });
      
      const result = distributor.redeemAllRewards('player1');
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.count, 2);
    });

    it('should leave no pending rewards after redeemAll', () => {
      distributor.distributeReward('player1', 'achievement', {
        achievementId: 'first_property'
      });
      
      distributor.redeemAllRewards('player1');
      const pending = distributor.getPendingRewards('player1');
      
      assert.strictEqual(pending.length, 0);
    });
  });

  describe('distributeAchievementReward', () => {
    it('should unlock achievement and distribute XP', () => {
      const result = distributor.distributeAchievementReward('player1', 'first_property');
      
      assert.strictEqual(result.success, true);
      assert.ok(achievementManager.hasAchievement('player1', 'first_property'));
    });
  });

  describe('getRewardStats', () => {
    it('should return reward statistics', () => {
      distributor.distributeReward('player1', 'xp', { amount: 50 });
      distributor.distributeReward('player1', 'xp', { amount: 100 });
      
      const stats = distributor.getRewardStats('player1');
      
      assert.ok('totalRedeemed' in stats);
      assert.ok('pending' in stats);
      assert.ok('byType' in stats);
    });
  });

  describe('resetPlayer', () => {
    it('should reset player rewards', () => {
      distributor.distributeReward('player1', 'xp', { amount: 50 });
      distributor.resetPlayer('player1');
      
      const pending = distributor.getPendingRewards('player1');
      const history = distributor.getRewardHistory('player1');
      
      assert.strictEqual(pending.length, 0);
      assert.strictEqual(history.length, 0);
    });
  });
});
