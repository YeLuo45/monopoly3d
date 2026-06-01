import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { LearningCoach, LESSON_IDS } from '../../src/game/ai/coach/learningCoach.js';

function createMockMemoryLayer() {
  return {
    ingest: () => {},
  };
}

function createMockStrategyAdvisor() {
  return {
    suggestNextMove: () => ({ primary: { action: 'buy_property' } }),
    suggestPropertyPurchase: () => ({ shouldBuy: true, confidence: 0.8 }),
  };
}

function createCoach() {
  return new LearningCoach(createMockMemoryLayer(), createMockStrategyAdvisor());
}

function createGameState(overrides = {}) {
  return {
    turn: 5,
    tiles: [
      { id: 1, type: 'property', name: 'Mediterranean', price: 60, colorGroup: 'brown' },
      { id: 2, type: 'property', name: 'Baltic', price: 60, colorGroup: 'brown' },
      { id: 3, type: 'chance', name: 'Chance' },
    ],
    players: [
      { id: 'p1', name: 'Player 1', money: 1500, properties: [] },
      { id: 'p2', name: 'Player 2', money: 1200, properties: [] },
    ],
    ...overrides,
  };
}

describe('LearningCoach', () => {
  describe('constructor', () => {
    it('creates coach with memoryLayer and strategyAdvisor', () => {
      const memory = createMockMemoryLayer();
      const advisor = createMockStrategyAdvisor();
      const coach = new LearningCoach(memory, advisor);
      assert.strictEqual(coach.memoryLayer, memory);
      assert.strictEqual(coach.strategyAdvisor, advisor);
    });

    it('creates coach without dependencies', () => {
      const coach = new LearningCoach();
      assert.ok(coach);
      assert.deepStrictEqual(coach.coachingSessions, {});
    });
  });

  describe('startCoachSession', () => {
    it('starts a new coaching session', () => {
      const coach = createCoach();
      const session = coach.startCoachSession('player1');
      assert.ok(session);
      assert.ok(session.startTime);
      assert.strictEqual(session.stats.sessionsStarted, 1);
    });

    it('increments sessionsStarted for existing player', () => {
      const coach = createCoach();
      coach.startCoachSession('player1');
      const session = coach.startCoachSession('player1');
      assert.strictEqual(session.stats.sessionsStarted, 2);
    });
  });

  describe('endCoachSession', () => {
    it('ends an active session and returns summary', () => {
      const coach = createCoach();
      coach.startCoachSession('player1');
      const summary = coach.endCoachSession('player1');
      assert.ok(summary);
      assert.ok(summary.duration >= 0);
      assert.strictEqual(summary.lessonsCompleted, 0);
    });

    it('returns error for non-existent session', () => {
      const coach = createCoach();
      const result = coach.endCoachSession('nonexistent');
      assert.strictEqual(result.success, false);
    });
  });

  describe('getTip', () => {
    it('returns a tip with priority and category', () => {
      const coach = createCoach();
      const tip = coach.getTip('player1', createGameState());
      assert.ok(tip);
      assert.ok(tip.tip);
      assert.ok(tip.priority);
      assert.ok(tip.category);
    });

    it('tip has valid priority value', () => {
      const coach = createCoach();
      const tip = coach.getTip('player1', createGameState());
      assert.ok(['high', 'medium', 'low'].includes(tip.priority));
    });

    it('tip has valid category value', () => {
      const coach = createCoach();
      const tip = coach.getTip('player1', createGameState());
      assert.ok(['property', 'rent', 'trade', 'money', 'position'].includes(tip.category));
    });
  });

  describe('getTips', () => {
    it('returns requested number of tips', () => {
      const coach = createCoach();
      const tips = coach.getTips('player1', 3);
      assert.strictEqual(tips.length, 3);
    });

    it('returns default of 3 tips when count not specified', () => {
      const coach = createCoach();
      const tips = coach.getTips('player1');
      assert.strictEqual(tips.length, 3);
    });

    it('tips have required fields', () => {
      const coach = createCoach();
      const tips = coach.getTips('player1', 2);
      tips.forEach(tip => {
        assert.ok(tip.tip);
        assert.ok(tip.priority);
        assert.ok(tip.category);
      });
    });
  });

  describe('getLessonProgress', () => {
    it('returns organized lesson structure', () => {
      const coach = createCoach();
      coach.startCoachSession('player1');
      const progress = coach.getLessonProgress('player1');
      assert.ok(progress);
      assert.ok(Array.isArray(progress.completed));
      assert.ok(Array.isArray(progress.inProgress));
      assert.ok(Array.isArray(progress.locked));
    });

    it('returns all lessons categorized', () => {
      const coach = createCoach();
      coach.startCoachSession('player1');
      const progress = coach.getLessonProgress('player1');
      const total = progress.completed.length + progress.inProgress.length + progress.locked.length;
      assert.strictEqual(total, 5); // 5 predefined lessons
    });
  });

  describe('completeLesson', () => {
    it('marks lesson as complete', () => {
      const coach = createCoach();
      coach.startCoachSession('player1');
      const result = coach.completeLesson('player1', LESSON_IDS.RENT_BASICS);
      assert.strictEqual(result.success, true);
      assert.ok(result.lesson);
    });

    it('returns error for invalid lesson ID', () => {
      const coach = createCoach();
      const result = coach.completeLesson('player1', 'invalid_lesson');
      assert.strictEqual(result.success, false);
    });

    it('completed lessons appear in completed array', () => {
      const coach = createCoach();
      coach.startCoachSession('player1');
      coach.completeLesson('player1', LESSON_IDS.RENT_BASICS);
      const progress = coach.getLessonProgress('player1');
      assert.strictEqual(progress.completed.length, 1);
      assert.strictEqual(progress.completed[0].id, LESSON_IDS.RENT_BASICS);
    });
  });

  describe('getAllLessons', () => {
    it('returns all 5 predefined lessons', () => {
      const coach = createCoach();
      const lessons = coach.getAllLessons();
      assert.strictEqual(lessons.length, 5);
    });

    it('all lesson IDs are valid', () => {
      const coach = createCoach();
      const lessons = coach.getAllLessons();
      lessons.forEach(lesson => {
        assert.ok(lesson.id);
        assert.ok(lesson.title);
        assert.ok(lesson.description);
      });
    });
  });

  describe('LESSON_IDS export', () => {
    it('exports all required lesson IDs', () => {
      assert.strictEqual(LESSON_IDS.RENT_BASICS, 'rent_basics');
      assert.strictEqual(LESSON_IDS.MONOPOLY_STRATEGY, 'monopoly_strategy');
      assert.strictEqual(LESSON_IDS.TRADE_NEGOTIATION, 'trade_negotiation');
      assert.strictEqual(LESSON_IDS.RISK_MANAGEMENT, 'risk_management');
      assert.strictEqual(LESSON_IDS.ENDGAME_TACTICS, 'endgame_tactics');
    });
  });
});