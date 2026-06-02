/**
 * Tests for AdaptiveGamingFacade
 * 
 * Tests the unified facade integrating all adaptive systems.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// Import the facade
const { AdaptiveGamingFacade } = await import('../../src/game/ai/adaptive/adaptiveGamingFacade.js');

describe('AdaptiveGamingFacade', () => {
  let facade;

  beforeEach(() => {
    facade = new AdaptiveGamingFacade();
  });

  describe('constructor', () => {
    it('should create an instance without errors', () => {
      assert.ok(facade);
      assert.ok(facade.learningEngine);
      assert.ok(facade.segmentor);
      assert.ok(facade.difficultyEngine);
      assert.ok(facade.achievementManager);
      assert.ok(facade.cloudSaveManager);
    });

    it('should initialize empty player states', () => {
      assert.ok(facade.playerStates instanceof Map);
      assert.strictEqual(facade.playerStates.size, 0);
    });
  });

  describe('initialize', () => {
    it('should initialize a new player', () => {
      const result = facade.initialize('player1');
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.playerId, 'player1');
      assert.ok(result.systems);
      assert.strictEqual(facade.initializedPlayers.has('player1'), true);
    });

    it('should return already initialized for existing player', () => {
      facade.initialize('player1');
      const result = facade.initialize('player1');
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.alreadyInitialized, true);
    });

    it('should throw error for missing playerId', () => {
      assert.throws(() => facade.initialize(), /playerId is required/);
    });
  });

  describe('getRecommendation', () => {
    it('should get recommendation for initialized player', () => {
      facade.initialize('player1');
      const rec = facade.getRecommendation('player1', { phase: 'early' });
      
      assert.ok(rec);
      assert.strictEqual(rec.playerId, 'player1');
      assert.ok(rec.segment);
      assert.ok(rec.suggestions);
      assert.ok(rec.timestamp);
    });

    it('should auto-initialize uninitialized player', () => {
      const rec = facade.getRecommendation('player2', { phase: 'mid' });
      
      assert.ok(rec);
      assert.strictEqual(rec.playerId, 'player2');
      assert.ok(facade.initializedPlayers.has('player2'));
    });

    it('should include difficulty in recommendation', () => {
      facade.initialize('player1');
      const rec = facade.getRecommendation('player1');
      
      assert.ok(rec.difficulty);
      assert.ok(rec.suggestions.difficulty);
    });
  });

  describe('getLearningEngine', () => {
    it('should return the learning engine instance', () => {
      const engine = facade.getLearningEngine();
      assert.ok(engine);
      assert.strictEqual(typeof engine.createProfile, 'function');
    });
  });

  describe('getSegmentor', () => {
    it('should return the segmentor instance', () => {
      const segmentor = facade.getSegmentor();
      assert.ok(segmentor);
      assert.strictEqual(typeof segmentor.segmentPlayer, 'function');
    });
  });

  describe('getDifficultyEngine', () => {
    it('should return the difficulty engine instance', () => {
      const engine = facade.getDifficultyEngine();
      assert.ok(engine);
      assert.strictEqual(typeof engine.getDifficulty, 'function');
    });
  });

  describe('getAchievementManager', () => {
    it('should return the achievement manager instance', () => {
      const manager = facade.getAchievementManager();
      assert.ok(manager);
    });
  });

  describe('getCloudSaveManager', () => {
    it('should return the cloud save manager instance', () => {
      const manager = facade.getCloudSaveManager();
      assert.ok(manager);
      assert.strictEqual(typeof manager.saveGame, 'function');
    });
  });

  describe('updatePlayerMetrics', () => {
    it('should update player metrics', () => {
      facade.initialize('player1');
      const metrics = { wins: 1, totalGames: 2 };
      const updated = facade.updatePlayerMetrics('player1', metrics);
      
      assert.ok(updated);
      assert.strictEqual(updated.wins, 1);
      assert.strictEqual(updated.totalGames, 2);
    });
  });

  describe('getSystemStatus', () => {
    it('should return system status', () => {
      const status = facade.getSystemStatus();
      
      assert.ok(status);
      assert.ok('initialized' in status);
      assert.ok('activePlayers' in status);
    });
  });

  describe('resetPlayer', () => {
    it('should reset player state', () => {
      facade.initialize('player1');
      const result = facade.resetPlayer('player1');
      
      assert.strictEqual(result, true);
      assert.strictEqual(facade.initializedPlayers.has('player1'), false);
    });

    it('should return false for non-existent player', () => {
      const result = facade.resetPlayer('nonexistent');
      assert.strictEqual(result, false);
    });
  });
});