/**
 * Tests for GameStateAdaptor
 * 
 * Tests the game state adaptation based on player profile.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// Import the classes
const { AdaptiveGamingFacade } = await import('../../src/game/ai/adaptive/adaptiveGamingFacade.js');
const { GameStateAdaptor } = await import('../../src/game/ai/adaptive/gameStateAdaptor.js');

describe('GameStateAdaptor', () => {
  let facade;
  let adaptor;

  beforeEach(() => {
    facade = new AdaptiveGamingFacade();
    adaptor = new GameStateAdaptor(facade);
  });

  describe('constructor', () => {
    it('should create an instance without errors', () => {
      assert.ok(adaptor);
      assert.ok(adaptor.facade);
    });

    it('should throw error without facade', () => {
      assert.throws(() => new GameStateAdaptor(), /adaptiveFacade is required/);
    });
  });

  describe('adaptGameState', () => {
    it('should adapt game state for player', () => {
      facade.initialize('player1');
      const gameState = {
        settings: { startingMoney: 1500 },
        players: [{ id: 'player1', money: 1500 }],
        properties: []
      };
      
      const adapted = adaptor.adaptGameState('player1', gameState);
      
      assert.ok(adapted._adapted);
      assert.strictEqual(adapted._adaptedFor, 'player1');
      assert.ok(adapted._adaptedAt);
    });

    it('should throw error for missing playerId', () => {
      assert.throws(() => adaptor.adaptGameState(null, {}), /playerId and gameState are required/);
    });

    it('should throw error for missing gameState', () => {
      assert.throws(() => adaptor.adaptGameState('player1'), /playerId and gameState are required/);
    });
  });

  describe('getAdaptedParameters', () => {
    it('should return adapted parameters for player', () => {
      facade.initialize('player1');
      const params = adaptor.getAdaptedParameters('player1');
      
      assert.ok(params);
      assert.ok('rentMultiplier' in params);
      assert.ok('startingMoney' in params);
      assert.ok('turnTimeout' in params);
    });

    it('should return default parameters for unknown player', () => {
      const params = adaptor.getAdaptedParameters('unknown');
      
      assert.ok(params);
      assert.strictEqual(params.rentMultiplier, 1.0);
    });

    it('should cache parameters', () => {
      facade.initialize('player1');
      const params1 = adaptor.getAdaptedParameters('player1');
      const params2 = adaptor.getAdaptedParameters('player1');
      
      assert.deepStrictEqual(params1, params2);
    });
  });

  describe('getAdaptedDifficulty', () => {
    it('should return difficulty for player', () => {
      facade.initialize('player1');
      const difficulty = adaptor.getAdaptedDifficulty('player1');
      
      assert.ok(difficulty);
      assert.ok(['very_easy', 'easy', 'normal', 'hard', 'very_hard'].includes(difficulty));
    });

    it('should return normal for unknown player', () => {
      const difficulty = adaptor.getAdaptedDifficulty('unknown');
      assert.strictEqual(difficulty, 'normal');
    });
  });

  describe('clearCache', () => {
    it('should clear cache for specific player', () => {
      facade.initialize('player1');
      adaptor.getAdaptedParameters('player1');
      adaptor.clearCache('player1');
      
      // Should not throw - cache was cleared
      const params = adaptor.getAdaptedParameters('player1');
      assert.ok(params);
    });

    it('should clear all cache when called without playerId', () => {
      facade.initialize('player1');
      adaptor.getAdaptedParameters('player1');
      adaptor.clearCache();
      
      const params = adaptor.getAdaptedParameters('player1');
      assert.ok(params);
    });
  });

  describe('getAdaptationSummary', () => {
    it('should return adaptation summary', () => {
      facade.initialize('player1');
      const summary = adaptor.getAdaptationSummary('player1');
      
      assert.ok(summary);
      assert.strictEqual(summary.playerId, 'player1');
      assert.ok('difficulty' in summary);
      assert.ok('segment' in summary);
      assert.ok('parameters' in summary);
    });
  });

  describe('segment modifiers', () => {
    it('should apply casual segment modifiers', () => {
      facade.initialize('player1');
      const params = adaptor.getAdaptedParameters('player1');
      
      // Casual segment should have higher starting money
      assert.ok(params.startingMoney >= 1500);
    });

    it('should apply strategic segment modifiers', () => {
      facade.initialize('player1');
      // Manually set segment to strategic
      facade.playerStates.get('player1').adaptationState.segment = 'strategic';
      const params = adaptor.getAdaptedParameters('player1');
      
      assert.ok(params);
      assert.strictEqual(params.startingMoney, 1500);
    });
  });

  describe('difficulty scaling', () => {
    it('should scale parameters based on difficulty', () => {
      facade.initialize('player1');
      // Set to very_easy difficulty - scale is 0.7, so startingMoney should be less
      facade.playerStates.get('player1').adaptationState.currentDifficulty = 'very_easy';
      
      const params = adaptor.getAdaptedParameters('player1');
      
      // very_easy has scale 0.7, so strategic startingMoney 1500 * 0.7 = 1050
      assert.ok(params.startingMoney < 1500);
    });
  });
});