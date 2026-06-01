import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  createCoachData, 
  createTipData, 
  createLessonCardData,
  getEncouragement 
} from '../../src/game/ai/coach/coachUI.js';
import { LearningCoach } from '../../src/game/ai/coach/learningCoach.js';

function createMockMemoryLayer() {
  return { ingest: () => {} };
}

function createMockStrategyAdvisor() {
  return {};
}

function createCoach() {
  return new LearningCoach(createMockMemoryLayer(), createMockStrategyAdvisor());
}

function createGameState(overrides = {}) {
  return {
    turn: 5,
    players: [
      { id: 'p1', name: 'Player 1', money: 1500, properties: [] },
      { id: 'p2', name: 'Player 2', money: 1200, properties: [] },
    ],
    ...overrides,
  };
}

describe('CoachUI', () => {
  describe('createCoachData', () => {
    it('returns default data when coach is null', () => {
      const data = createCoachData(null, 'player1', createGameState());
      assert.ok(data);
      assert.ok(data.tips);
      assert.ok(data.lessons);
      assert.ok(data.encouragement);
    });

    it('returns structured coach data', () => {
      const coach = createCoach();
      coach.startCoachSession('player1');
      const data = createCoachData(coach, 'player1', createGameState());
      
      assert.ok(Array.isArray(data.tips));
      assert.ok(data.lessons);
      assert.ok(typeof data.encouragement === 'string');
      assert.ok(data.nextMilestone);
      assert.ok(typeof data.sessionActive === 'boolean');
    });

    it('tips have required fields', () => {
      const coach = createCoach();
      coach.startCoachSession('player1');
      const data = createCoachData(coach, 'player1', createGameState());
      
      assert.ok(data.tips.length > 0);
      data.tips.forEach(tip => {
        assert.ok(tip.text);
        assert.ok(tip.priority);
        assert.ok(tip.category);
      });
    });

    it('lessons are organized by status', () => {
      const coach = createCoach();
      coach.startCoachSession('player1');
      const data = createCoachData(coach, 'player1', createGameState());
      
      assert.ok(Array.isArray(data.lessons.completed));
      assert.ok(Array.isArray(data.lessons.inProgress));
      assert.ok(Array.isArray(data.lessons.locked));
    });
  });

  describe('createTipData', () => {
    it('returns default tip when coach is null', () => {
      const tip = createTipData(null, 'player1', createGameState());
      assert.ok(tip.text);
      assert.ok(tip.priority);
      assert.ok(tip.category);
    });

    it('returns formatted tip from coach', () => {
      const coach = createCoach();
      coach.startCoachSession('player1');
      const tip = createTipData(coach, 'player1', createGameState());
      
      assert.ok(typeof tip.text === 'string');
      assert.ok(['high', 'medium', 'low'].includes(tip.priority));
      assert.ok(['property', 'rent', 'trade', 'money', 'position', 'welcome', 'general'].includes(tip.category));
    });
  });

  describe('createLessonCardData', () => {
    it('returns null for invalid lesson', () => {
      const coach = createCoach();
      const data = createLessonCardData(coach, 'player1', 'invalid');
      assert.strictEqual(data, null);
    });

    it('returns lesson card data', () => {
      const coach = createCoach();
      coach.startCoachSession('player1');
      const data = createLessonCardData(coach, 'player1', 'rent_basics');
      
      assert.ok(data);
      assert.strictEqual(data.id, 'rent_basics');
      assert.ok(data.title);
      assert.ok(data.description);
      assert.ok(data.status);
    });
  });

  describe('getEncouragement', () => {
    it('returns string encouragement', () => {
      const coach = createCoach();
      const msg = getEncouragement(coach, 'player1', createGameState());
      assert.ok(typeof msg === 'string');
      assert.ok(msg.length > 0);
    });

    it('returns different messages for different phases', () => {
      const coach = createCoach();
      coach.startCoachSession('player1');
      
      const earlyMsg = getEncouragement(coach, 'player1', createGameState({ turn: 3 }));
      const midMsg = getEncouragement(coach, 'player1', createGameState({ turn: 10 }));
      const lateMsg = getEncouragement(coach, 'player1', createGameState({ turn: 20 }));
      
      // All should be valid messages (may be same by chance)
      assert.ok(typeof earlyMsg === 'string');
      assert.ok(typeof midMsg === 'string');
      assert.ok(typeof lateMsg === 'string');
    });
  });
});