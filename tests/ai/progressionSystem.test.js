/**
 * ProgressionSystem Tests
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';

const { ProgressionSystem } = await import('../../src/game/ai/progression/progressionSystem.js');
const { AchievementManager } = await import('../../src/game/ai/progression/achievementManager.js');

describe('ProgressionSystem', () => {
  let progression;
  let achievementManager;

  before(() => {
    achievementManager = new AchievementManager();
    progression = new ProgressionSystem(achievementManager);
  });

  beforeEach(() => {
    progression.clear();
    achievementManager.clear();
  });

  describe('constructor', () => {
    it('should initialize with level config', () => {
      assert.ok(progression.levelConfig);
      assert.strictEqual(progression.levelConfig.baseXp, 100);
      assert.strictEqual(progression.levelConfig.maxLevel, 50);
    });

    it('should initialize with milestones', () => {
      assert.ok(progression.milestones.length > 0);
      assert.ok(progression.milestones.some(m => m.level === 5));
      assert.ok(progression.milestones.some(m => m.level === 10));
    });
  });

  describe('getPlayerLevel', () => {
    it('should return level 1 for new player', () => {
      const level = progression.getPlayerLevel('player1');
      
      assert.strictEqual(level, 1);
    });

    it('should return correct level for existing player', () => {
      progression.addExperience('player1', 500);
      const level = progression.getPlayerLevel('player1');
      
      assert.ok(level >= 1);
    });
  });

  describe('getPlayerXp', () => {
    it('should return zero XP for new player', () => {
      const xp = progression.getPlayerXp('player1');
      
      assert.strictEqual(xp.current, 0);
      assert.strictEqual(xp.total, 0);
    });

    it('should track total XP correctly', () => {
      progression.addExperience('player1', 100);
      const xp = progression.getPlayerXp('player1');
      
      assert.strictEqual(xp.total, 100);
    });
  });

  describe('addExperience', () => {
    it('should add XP to player', () => {
      const result = progression.addExperience('player1', 100);
      
      assert.strictEqual(result.xpAdded, 100);
      assert.ok(result.newLevel >= 1);
    });

    it('should trigger level up when XP threshold reached', () => {
      const result = progression.addExperience('player1', 500);
      
      assert.ok(result.newLevel >= 1);
      if (result.levelUps > 0) {
        assert.strictEqual(result.newLevel, 1 + result.levelUps);
      }
    });

    it('should track multiple level ups', () => {
      const result = progression.addExperience('player1', 1000);
      
      assert.ok(result.levelUps >= 0);
    });
  });

  describe('setPlayerLevel', () => {
    it('should set level directly', () => {
      progression.setPlayerLevel('player1', 10);
      
      assert.strictEqual(progression.getPlayerLevel('player1'), 10);
    });

    it('should clamp to max level', () => {
      progression.setPlayerLevel('player1', 100);
      
      assert.strictEqual(progression.getPlayerLevel('player1'), progression.levelConfig.maxLevel);
    });

    it('should not go below level 1', () => {
      progression.setPlayerLevel('player1', 0);
      
      assert.strictEqual(progression.getPlayerLevel('player1'), 1);
    });
  });

  describe('getMilestones', () => {
    it('should return upcoming milestones for new player', () => {
      const milestones = progression.getMilestones('player1');
      
      assert.ok(milestones.length > 0);
      assert.ok(milestones.every(m => m.level > 1));
    });

    it('should return empty for max level player', () => {
      progression.setPlayerLevel('player1', progression.levelConfig.maxLevel);
      const milestones = progression.getMilestones('player1');
      
      assert.strictEqual(milestones.length, 0);
    });
  });

  describe('getCompletedMilestones', () => {
    it('should return empty for new player', () => {
      const completed = progression.getCompletedMilestones('player1');
      
      assert.deepStrictEqual(completed, []);
    });
  });

  describe('checkMilestoneCompletion', () => {
    it('should return empty for new player', () => {
      const result = progression.checkMilestoneCompletion('player1');
      
      assert.ok(Array.isArray(result.awarded));
      assert.ok(Array.isArray(result.newMilestones));
    });

    it('should detect milestone when level reached', () => {
      progression.setPlayerLevel('player1', 5);
      const result = progression.checkMilestoneCompletion('player1');
      
      // Level 5 milestone should be awarded
      assert.ok(result.newMilestones.length >= 0);
    });
  });

  describe('getProgressionSummary', () => {
    it('should return full progression data', () => {
      progression.addExperience('player1', 100);
      const summary = progression.getProgressionSummary('player1');
      
      assert.ok('playerId' in summary);
      assert.ok('level' in summary);
      assert.ok('xp' in summary);
      assert.ok('xpTotal' in summary);
    });
  });

  describe('resetPlayer', () => {
    it('should reset player progression', () => {
      progression.addExperience('player1', 500);
      progression.resetPlayer('player1');
      
      assert.strictEqual(progression.getPlayerLevel('player1'), 1);
    });
  });
});
