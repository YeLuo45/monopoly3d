import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RewardDistributor } from '../../src/game/ai/progression/rewardDistributor.js';

function createMockAchievementManager() {
  return {
    unlockAchievement: () => true,
    getPlayerAchievements: () => [],
  };
}

function createMockProgressionSystem() {
  return {
    getPlayerLevel: () => 1,
    addExperience: () => {},
  };
}

describe('RewardDistributor', () => {
  describe('constructor', () => {
    it('creates reward distributor', () => {
      const dist = new RewardDistributor(createMockAchievementManager(), createMockProgressionSystem());
      assert.ok(dist);
    });
  });

  describe('distributeReward', () => {
    it('distributes reward to player', () => {
      const dist = new RewardDistributor(createMockAchievementManager(), createMockProgressionSystem());
      const result = dist.distributeReward('player1', 'coins', { amount: 100 });
      assert.strictEqual(result, true);
    });
  });

  describe('getPendingRewards', () => {
    it('returns pending rewards for player', () => {
      const dist = new RewardDistributor(createMockAchievementManager(), createMockProgressionSystem());
      dist.distributeReward('player1', 'coins', { amount: 100 });
      const rewards = dist.getPendingRewards('player1');
      assert.ok(Array.isArray(rewards));
    });

    it('returns empty for unknown player', () => {
      const dist = new RewardDistributor(createMockAchievementManager(), createMockProgressionSystem());
      const rewards = dist.getPendingRewards('unknown');
      assert.deepStrictEqual(rewards, []);
    });
  });

  describe('redeemReward', () => {
    it('redeems reward for player', () => {
      const dist = new RewardDistributor(createMockAchievementManager(), createMockProgressionSystem());
      dist.distributeReward('player1', 'coins', { amount: 100 });
      const result = dist.redeemReward('player1', 'r1');
      assert.strictEqual(result, true);
    });

    it('returns false for unknown reward', () => {
      const dist = new RewardDistributor(createMockAchievementManager(), createMockProgressionSystem());
      const result = dist.redeemReward('player1', 'unknown');
      assert.strictEqual(result, false);
    });
  });
});