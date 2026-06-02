import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AchievementManager } from '../../src/game/ai/progression/achievementManager.js';

describe('AchievementManager', () => {
  describe('constructor', () => {
    it('creates achievement manager', () => {
      const mgr = new AchievementManager();
      assert.ok(mgr);
    });
  });

  describe('unlockAchievement', () => {
    it('unlocks achievement for player', () => {
      const mgr = new AchievementManager();
      const result = mgr.unlockAchievement('player1', 'first_win');
      assert.strictEqual(result, true);
    });
  });

  describe('hasAchievement', () => {
    it('returns true for unlocked achievement', () => {
      const mgr = new AchievementManager();
      mgr.unlockAchievement('player1', 'first_win');
      const result = mgr.hasAchievement('player1', 'first_win');
      assert.strictEqual(result, true);
    });

    it('returns false for locked achievement', () => {
      const mgr = new AchievementManager();
      const result = mgr.hasAchievement('player1', 'first_win');
      assert.strictEqual(result, false);
    });
  });

  describe('getPlayerAchievements', () => {
    it('returns achievements for player', () => {
      const mgr = new AchievementManager();
      mgr.unlockAchievement('player1', 'first_win');
      mgr.unlockAchievement('player1', 'first_property');
      const achievements = mgr.getPlayerAchievements('player1');
      assert.ok(Array.isArray(achievements));
      assert.strictEqual(achievements.length, 2);
    });

    it('returns empty for unknown player', () => {
      const mgr = new AchievementManager();
      const achievements = mgr.getPlayerAchievements('unknown');
      assert.deepStrictEqual(achievements, []);
    });
  });

  describe('getProgress', () => {
    it('returns progress for achievement', () => {
      const mgr = new AchievementManager();
      const progress = mgr.getProgress('player1', 'first_win');
      assert.ok(typeof progress === 'number');
    });

    it('returns 0 for locked achievement', () => {
      const mgr = new AchievementManager();
      const progress = mgr.getProgress('player1', 'locked');
      assert.strictEqual(progress, 0);
    });
  });
});