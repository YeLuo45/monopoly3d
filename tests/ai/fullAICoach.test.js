/**
 * FullAICoach Tests
 * Tests for the complete AI coaching system
 */

import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';

// Import the class under test
import { FullAICoach } from '../../src/game/ai/fullCoach/fullAICoach.js';

describe('FullAICoach', () => {
  let coach;
  let mockGameState;

  before(() => {
    // Setup mock game state
    mockGameState = {
      gameId: 'test_game_001',
      turn: 3,
      currentRound: 3,
      currentPlayer: 'player1',
      players: [
        { id: 'player1', name: 'Player 1', money: 1500, position: 10, properties: [] },
        { id: 'player2', name: 'Player 2', money: 1200, position: 15, properties: [] },
        { id: 'player3', name: 'Player 3', money: 1800, position: 20, properties: [] },
        { id: 'player4', name: 'Player 4', money: 1000, position: 5, properties: [] },
      ],
      properties: [],
    };
  });

  beforeEach(() => {
    coach = new FullAICoach(mockGameState, 'player1');
  });

  describe('constructor', () => {
    it('should create instance with default values', () => {
      const c = new FullAICoach();
      assert.strictEqual(c.playerId, 'player1');
      assert.strictEqual(c.isInitialized, false);
      assert.strictEqual(c.coachingActive, false);
    });

    it('should accept custom playerId', () => {
      const c = new FullAICoach({}, 'player2');
      assert.strictEqual(c.playerId, 'player2');
    });

    it('should have config with expected properties', () => {
      const c = new FullAICoach();
      assert.ok(c.config);
      assert.strictEqual(typeof c.config.enableRealTimeFeedback, 'boolean');
      assert.strictEqual(typeof c.config.adviceRefreshRate, 'number');
      assert.strictEqual(typeof c.config.maxAdviceHistory, 'number');
    });
  });

  describe('initialize', () => {
    it('should initialize all subsystems', () => {
      coach.initialize(mockGameState, 'player1');
      
      assert.strictEqual(coach.isInitialized, true);
      assert.strictEqual(coach.coachingActive, true);
      assert.ok(coach.memoryLayer);
      assert.ok(coach.embedding);
      assert.ok(coach.situationEncoder);
      assert.ok(coach.advisor);
      assert.ok(coach.coach);
      assert.ok(coach.opponentTracker);
      assert.ok(coach.dashboard);
    });

    it('should set playerId and gameId from gameState', () => {
      coach.initialize(mockGameState, 'player1');
      
      assert.strictEqual(coach.playerId, 'player1');
      assert.strictEqual(coach.gameId, 'test_game_001');
    });

    it('should wire event bus to subsystems', () => {
      coach.initialize(mockGameState, 'player1');
      
      assert.ok(coach.eventBus);
      assert.strictEqual(typeof coach.eventBus.subscribe, 'function');
      assert.strictEqual(typeof coach.eventBus.publish, 'function');
    });

    it('should return this for chaining', () => {
      const result = coach.initialize(mockGameState, 'player1');
      assert.strictEqual(result, coach);
    });

    it('should create L0-L4 memory hierarchy', () => {
      coach.initialize(mockGameState, 'player1');
      
      assert.ok(coach.memoryLayer.l0);
      assert.ok(coach.memoryLayer.l1);
      assert.ok(coach.memoryLayer.l2);
      assert.ok(coach.memoryLayer.l3);
      assert.ok(coach.memoryLayer.l4);
    });
  });

  describe('getCoachingAdvice', () => {
    it('should return empty advice when not initialized', () => {
      const advice = coach.getCoachingAdvice();
      
      assert.ok(advice);
      assert.strictEqual(advice.primaryAdvice, 'Coach not initialized');
      assert.strictEqual(advice.confidence, 0);
    });

    it('should return advice structure with all required fields', () => {
      coach.initialize(mockGameState, 'player1');
      const advice = coach.getCoachingAdvice();
      
      assert.ok(advice.primaryAdvice);
      assert.ok(typeof advice.reasoning === 'string');
      assert.ok(typeof advice.confidence === 'number');
      assert.ok(Array.isArray(advice.relatedLessons));
      assert.ok(advice.phase);
      assert.ok(typeof advice.timestamp === 'number');
    });

    it('should include opponent analysis in advice', () => {
      coach.initialize(mockGameState, 'player1');
      const advice = coach.getCoachingAdvice();
      
      assert.ok(advice.opponentAnalysis);
      assert.ok(typeof advice.opponentAnalysis.opponentCount === 'number');
    });

    it('should cache advice in history', () => {
      coach.initialize(mockGameState, 'player1');
      
      coach.getCoachingAdvice();
      coach.getCoachingAdvice();
      
      assert.ok(coach.adviceHistory.length > 0);
    });

    it('should limit advice history to max configured', () => {
      coach.initialize(mockGameState, 'player1');
      coach.config.maxAdviceHistory = 5;
      
      for (let i = 0; i < 10; i++) {
        mockGameState.turn = i;
        coach.getCoachingAdvice(mockGameState);
      }
      
      assert.ok(coach.adviceHistory.length <= 5);
    });

    it('should accept gameState parameter', () => {
      coach.initialize(mockGameState, 'player1');
      
      const newState = { ...mockGameState, turn: 10 };
      const advice = coach.getCoachingAdvice(newState);
      
      assert.ok(advice);
    });

    it('should use cached gameState if not provided', () => {
      coach.initialize(mockGameState, 'player1');
      const advice1 = coach.getCoachingAdvice();
      
      mockGameState.turn = 20;
      const advice2 = coach.getCoachingAdvice();
      
      assert.notStrictEqual(advice1.phase, advice2.phase);
    });
  });

  describe('getRealtimeFeedback', () => {
    it('should return empty feedback when not initialized', () => {
      const feedback = coach.getRealtimeFeedback({ type: 'buy_property' }, mockGameState);
      
      assert.strictEqual(feedback.feedback, '');
      assert.strictEqual(feedback.score, 0);
    });

    it('should evaluate buy_property action', () => {
      coach.initialize(mockGameState, 'player1');
      
      const feedback = coach.getRealtimeFeedback(
        { type: 'buy_property', tileId: 'property_1' },
        mockGameState
      );
      
      assert.ok(typeof feedback.feedback === 'string');
      assert.ok(typeof feedback.score === 'number');
      assert.ok(Array.isArray(feedback.suggestions));
    });

    it('should evaluate build_house action', () => {
      coach.initialize(mockGameState, 'player1');
      
      const feedback = coach.getRealtimeFeedback(
        { type: 'build_house', tileId: 'property_1' },
        mockGameState
      );
      
      assert.ok(feedback.feedback);
      assert.ok(feedback.score > 0);
    });

    it('should evaluate trade action', () => {
      coach.initialize(mockGameState, 'player1');
      
      const feedback = coach.getRealtimeFeedback(
        { type: 'trade', targetId: 'player2' },
        mockGameState
      );
      
      assert.ok(feedback.feedback);
    });

    it('should evaluate mortgage action', () => {
      coach.initialize(mockGameState, 'player1');
      
      const feedback = coach.getRealtimeFeedback(
        { type: 'mortgage', tileId: 'property_1' },
        mockGameState
      );
      
      assert.ok(feedback.feedback);
    });

    it('should evaluate pay_rent action', () => {
      coach.initialize(mockGameState, 'player1');
      
      const feedback = coach.getRealtimeFeedback(
        { type: 'pay_rent', tileId: 'property_1' },
        mockGameState
      );
      
      assert.ok(feedback.feedback);
    });

    it('should handle unknown action types', () => {
      coach.initialize(mockGameState, 'player1');
      
      const feedback = coach.getRealtimeFeedback(
        { type: 'unknown_action' },
        mockGameState
      );
      
      assert.ok(feedback.feedback);
    });
  });

  describe('lifecycle methods', () => {
    it('should call onGameStart correctly', () => {
      coach.initialize(mockGameState, 'player1');
      coach.onGameStart(mockGameState);
      
      assert.ok(coach.isInitialized);
    });

    it('should call onGameEnd correctly', () => {
      coach.initialize(mockGameState, 'player1');
      
      const result = { winner: 'player1', placement: 1 };
      coach.onGameEnd(mockGameState, result);
      
      assert.ok(coach.eventBus);
    });

    it('should call onTurnEnd correctly', () => {
      coach.initialize(mockGameState, 'player1');
      
      const newState = { ...mockGameState, turn: 4 };
      coach.onTurnEnd(newState);
      
      assert.ok(coach.eventBus);
    });
  });

  describe('public getters', () => {
    it('should return memoryLayer', () => {
      coach.initialize(mockGameState, 'player1');
      
      const mem = coach.getMemoryLayer();
      assert.ok(mem);
    });

    it('should return advisor', () => {
      coach.initialize(mockGameState, 'player1');
      
      const adv = coach.getAdvisor();
      assert.ok(adv);
    });

    it('should return coach', () => {
      coach.initialize(mockGameState, 'player1');
      
      const c = coach.getCoach();
      assert.ok(c);
    });

    it('should return opponentTracker', () => {
      coach.initialize(mockGameState, 'player1');
      
      const ot = coach.getOpponentTracker();
      assert.ok(ot);
    });

    it('should return dashboard', () => {
      coach.initialize(mockGameState, 'player1');
      
      const dash = coach.getDashboard();
      assert.ok(dash);
    });

    it('should return isReady() true when initialized', () => {
      coach.initialize(mockGameState, 'player1');
      
      assert.strictEqual(coach.isReady(), true);
    });

    it('should return isReady() false when not initialized', () => {
      assert.strictEqual(coach.isReady(), false);
    });
  });

  describe('game phase detection', () => {
    it('should detect early phase', () => {
      coach.initialize(mockGameState, 'player1');
      
      const state = { ...mockGameState, turn: 3 };
      const advice = coach.getCoachingAdvice(state);
      
      assert.strictEqual(advice.phase, 'early');
    });

    it('should detect mid phase', () => {
      coach.initialize(mockGameState, 'player1');
      
      const state = { ...mockGameState, turn: 10 };
      const advice = coach.getCoachingAdvice(state);
      
      assert.strictEqual(advice.phase, 'mid');
    });

    it('should detect late phase', () => {
      coach.initialize(mockGameState, 'player1');
      
      const state = { ...mockGameState, turn: 20 };
      const advice = coach.getCoachingAdvice(state);
      
      assert.strictEqual(advice.phase, 'late');
    });
  });
});