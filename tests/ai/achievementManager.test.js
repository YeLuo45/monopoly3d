/**
 * AchievementManager Tests
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';

const { AchievementManager } = await import('../../src/game/ai/progression/achievementManager.js');

describe('AchievementManager', () => {
  let manager;

  before(() => {
    manager = new AchievementManager();
  });

  beforeEach(() => {
    manager.clear();
  });

  describe('constructor', () => {
    it('should initialize with default achievements', () => {
      const achievements = manager.getAllAchievements();
      
      assert.ok(achievements.length > 0);
      assert.ok(achievements.some(a => a.id === 'first_property'));
      assert.ok(achievements.some(a => a.id === 'first_win'));
    });

    it('should have empty player data initially', () => {
      const stats = manager.getPlayerStats('player1');
      const achievements = manager.getAllAchievements();
      
      assert.strictEqual(stats.total, achievements.length);
      assert.strictEqual(stats.unlocked, 0);
    });
  });

  describe('unlockAchievement', () => {
    it('should unlock a valid achievement', () => {
      const result = manager.unlockAchievement('player1', 'first_property');
      
      assert.strictEqual(result.success, true);
      assert.ok(result.achievement);
      assert.strictEqual(result.achievement.id, 'first_property');
    });

    it('should return false for unknown achievement', () => {
      const result = manager.unlockAchievement('player1', 'unknown_achievement');
      
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('should return already unlocked status', () => {
      manager.unlockAchievement('player1', 'first_property');
      const result = manager.unlockAchievement('player1', 'first_property');
      
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.alreadyUnlocked, true);
    });

    it('should track multiple players independently', () => {
      manager.unlockAchievement('player1', 'first_property');
      manager.unlockAchievement('player2', 'first_win');
      
      assert.strictEqual(manager.hasAchievement('player1', 'first_property'), true);
      assert.strictEqual(manager.hasAchievement('player1', 'first_win'), false);
      assert.strictEqual(manager.hasAchievement('player2', 'first_property'), false);
      assert.strictEqual(manager.hasAchievement('player2', 'first_win'), true);
    });
  });

  describe('hasAchievement', () => {
    it('should return false for locked achievement', () => {
      assert.strictEqual(manager.hasAchievement('player1', 'first_property'), false);
    });

    it('should return true for unlocked achievement', () => {
      manager.unlockAchievement('player1', 'first_property');
      
      assert.strictEqual(manager.hasAchievement('player1', 'first_property'), true);
    });

    it('should return false for unknown player', () => {
      assert.strictEqual(manager.hasAchievement('unknown_player', 'first_property'), false);
    });
  });

  describe('getPlayerAchievements', () => {
    it('should return all achievements with status', () => {
      manager.unlockAchievement('player1', 'first_property');
      const achievements = manager.getPlayerAchievements('player1');
      
      assert.ok(achievements.length > 0);
      
      const firstProperty = achievements.find(a => a.id === 'first_property');
      assert.ok(firstProperty);
      assert.strictEqual(firstProperty.unlocked, true);
    });

    it('should include progress data', () => {
      const achievements = manager.getPlayerAchievements('player1');
      
      for (const achievement of achievements) {
        assert.ok('progress' in achievement);
        assert.ok('current' in achievement.progress);
        assert.ok('target' in achievement.progress);
        assert.ok('percentage' in achievement.progress);
      }
    });
  });

  describe('getProgress', () => {
    it('should return zero progress for unknown achievement', () => {
      const progress = manager.getProgress('player1', 'first_property');
      
      assert.strictEqual(progress.current, 0);
      assert.strictEqual(progress.completed, false);
    });

    it('should return updated progress after updateProgress', () => {
      manager.updateProgress('player1', 'first_property', 1);
      const progress = manager.getProgress('player1', 'first_property');
      
      assert.strictEqual(progress.current, 1);
      assert.strictEqual(progress.completed, true);
    });
  });

  describe('updateProgress', () => {
    it('should update progress correctly', () => {
      const result = manager.updateProgress('player1', 'property_mogul', 5);
      
      assert.strictEqual(result, true);
      assert.strictEqual(manager.getProgress('player1', 'property_mogul').current, 5);
    });

    it('should auto-unlock when threshold reached', () => {
      manager.updateProgress('player1', 'first_property', 1);
      
      assert.strictEqual(manager.hasAchievement('player1', 'first_property'), true);
    });

    it('should return false for unknown achievement', () => {
      const result = manager.updateProgress('player1', 'unknown', 5);
      
      assert.strictEqual(result, false);
    });
  });

  describe('incrementProgress', () => {
    it('should increment progress by amount', () => {
      manager.updateProgress('player1', 'property_mogul', 2);
      manager.incrementProgress('player1', 'property_mogul', 3);
      
      assert.strictEqual(manager.getProgress('player1', 'property_mogul').current, 5);
    });
  });

  describe('getPlayerStats', () => {
    it('should return correct statistics', () => {
      manager.unlockAchievement('player1', 'first_property');
      manager.unlockAchievement('player1', 'first_win');
      
      const stats = manager.getPlayerStats('player1');
      
      assert.ok(stats.total > 0);
      assert.strictEqual(stats.unlocked, 2);
      assert.ok(stats.totalXp > 0);
    });
  });

  describe('resetPlayer', () => {
    it('should reset all player data', () => {
      manager.unlockAchievement('player1', 'first_property');
      manager.resetPlayer('player1');
      
      assert.strictEqual(manager.hasAchievement('player1', 'first_property'), false);
    });
  });
});
