/**
 * Adaptive Learning Engine Tests
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';

// Dynamic import for ES modules
const { AdaptiveLearningEngine } = await import('../../src/game/ai/tutor/adaptiveLearningEngine.js');

describe('AdaptiveLearningEngine', () => {
  let engine;
  const testPlayerId = 'player_123';

  before(() => {
    engine = new AdaptiveLearningEngine();
  });

  beforeEach(() => {
    // Reset for each test
    engine.profiles.clear();
    engine.performanceHistory.clear();
    engine.recommendationCache.clear();
  });

  describe('createProfile', () => {
    it('should create a new learning profile for player', () => {
      const profile = engine.createProfile(testPlayerId);
      
      assert.ok(profile);
      assert.strictEqual(profile.playerId, testPlayerId);
      assert.strictEqual(profile.currentDifficulty, 1);
      assert.deepStrictEqual(profile.completedLessons, []);
      assert.deepStrictEqual(profile.strengths, []);
      assert.deepStrictEqual(profile.weaknesses, []);
      assert.strictEqual(profile.learningStyle, 'visual');
      assert.strictEqual(profile.sessionCount, 0);
    });

    it('should return existing profile if player already exists', () => {
      const profile1 = engine.createProfile(testPlayerId);
      const profile2 = engine.createProfile(testPlayerId);
      
      assert.strictEqual(profile1, profile2);
    });
  });

  describe('getProfile', () => {
    it('should return existing profile for known player', () => {
      engine.createProfile(testPlayerId);
      const profile = engine.getProfile(testPlayerId);
      
      assert.ok(profile);
      assert.strictEqual(profile.playerId, testPlayerId);
    });

    it('should create profile for unknown player', () => {
      const profile = engine.getProfile('unknown_player');
      
      assert.ok(profile);
      assert.strictEqual(profile.playerId, 'unknown_player');
    });
  });

  describe('getDifficultyLevel', () => {
    it('should return current difficulty level', () => {
      engine.createProfile(testPlayerId);
      const level = engine.getDifficultyLevel(testPlayerId);
      
      assert.strictEqual(level, 1);
    });

    it('should initialize at BEGINNER level', () => {
      const profile = engine.createProfile(testPlayerId);
      
      assert.strictEqual(profile.currentDifficulty, engine.difficultyLevels.BEGINNER);
    });
  });

  describe('adaptDifficulty', () => {
    it('should increase difficulty with excellent performance', () => {
      const profile = engine.createProfile(testPlayerId);
      
      // Need 3+ performances with high scores
      engine.adaptDifficulty(testPlayerId, { score: 95, correctAnswers: 19, totalQuestions: 20 });
      engine.adaptDifficulty(testPlayerId, { score: 90, correctAnswers: 18, totalQuestions: 20 });
      const result = engine.adaptDifficulty(testPlayerId, { score: 95, correctAnswers: 19, totalQuestions: 20 });
      
      assert.strictEqual(result.newDifficulty, 2);
    });

    it('should maintain difficulty with good performance', () => {
      const profile = engine.createProfile(testPlayerId);
      profile.currentDifficulty = 2;
      
      const result = engine.adaptDifficulty(testPlayerId, {
        score: 80,
        timeSpent: 300,
        correctAnswers: 16,
        totalQuestions: 20
      });
      
      assert.strictEqual(result.newDifficulty, 2);
    });

    it('should decrease difficulty with poor performance', () => {
      const profile = engine.createProfile(testPlayerId);
      profile.currentDifficulty = 3;
      
      // Need 2+ performances with low scores
      engine.adaptDifficulty(testPlayerId, { score: 40, correctAnswers: 8, totalQuestions: 20 });
      const result = engine.adaptDifficulty(testPlayerId, { score: 40, correctAnswers: 8, totalQuestions: 20 });
      
      assert.strictEqual(result.newDifficulty, 2);
    });

    it('should not go below BEGINNER level', () => {
      const profile = engine.createProfile(testPlayerId);
      
      engine.adaptDifficulty(testPlayerId, { score: 30, correctAnswers: 6, totalQuestions: 20 });
      const level = engine.getDifficultyLevel(testPlayerId);
      
      assert.ok(level >= 1);
    });

    it('should not go above EXPERT level', () => {
      const profile = engine.createProfile(testPlayerId);
      profile.currentDifficulty = 5;
      
      engine.adaptDifficulty(testPlayerId, { score: 95, correctAnswers: 19, totalQuestions: 20 });
      const level = engine.getDifficultyLevel(testPlayerId);
      
      assert.ok(level <= 5);
    });
  });

  describe('recommendContent', () => {
    it('should recommend content for a topic', () => {
      engine.createProfile(testPlayerId);
      
      const result = engine.recommendContent(testPlayerId, 'trading');
      
      assert.ok(result.recommendations);
      assert.ok(result.recommendations.length > 0);
      assert.strictEqual(result.playerLevel, 'BEGINNER');
    });

    it('should return empty recommendations for mastered topic', () => {
      const profile = engine.createProfile(testPlayerId);
      profile.masteredConcepts.push('trading');
      
      const result = engine.recommendContent(testPlayerId, 'trading');
      
      assert.strictEqual(result.recommendations.length, 0);
      assert.ok(result.message.includes('mastered'));
    });

    it('should give higher relevance to weak areas', () => {
      const profile = engine.createProfile(testPlayerId);
      profile.weaknesses.push('investment');
      
      const result = engine.recommendContent(testPlayerId, 'investment');
      
      assert.ok(result.recommendations.length > 0);
      assert.strictEqual(result.recommendations[0].relevance, 0.9);
    });
  });

  describe('getNextLesson', () => {
    it('should return next lesson based on weak areas', () => {
      const profile = engine.createProfile(testPlayerId);
      profile.weaknesses.push('property_management');
      
      const lesson = engine.getNextLesson(testPlayerId);
      
      assert.ok(lesson);
      assert.strictEqual(lesson.topic, 'property_management');
      assert.ok(lesson.contentId.includes('property_management'));
    });

    it('should indicate completion when all topics mastered', () => {
      const profile = engine.createProfile(testPlayerId);
      profile.masteredConcepts = ['property_management', 'trading', 'investment', 'auction_strategy', 'financial_planning'];
      
      const lesson = engine.getNextLesson(testPlayerId);
      
      assert.strictEqual(lesson.type, 'completion');
    });
  });

  describe('markConceptMastered', () => {
    it('should add concept to mastered list', () => {
      const profile = engine.createProfile(testPlayerId);
      
      const result = engine.markConceptMastered(testPlayerId, 'trading');
      
      assert.ok(result.includes('trading'));
    });

    it('should remove from active concepts when mastered', () => {
      const profile = engine.createProfile(testPlayerId);
      profile.activeConcepts.push('trading');
      
      engine.markConceptMastered(testPlayerId, 'trading');
      
      assert.ok(!profile.activeConcepts.includes('trading'));
    });
  });

  describe('getLearningStats', () => {
    it('should return complete learning statistics', () => {
      const profile = engine.createProfile(testPlayerId);
      profile.completedLessons.push({ lessonId: 'lesson1', score: 85 });
      profile.quizScores.push(90);
      profile.strengths.push('trading');
      profile.weaknesses.push('investment');
      
      const stats = engine.getLearningStats(testPlayerId);
      
      assert.ok(stats);
      assert.strictEqual(stats.playerId, testPlayerId);
      assert.strictEqual(stats.totalLessons, 1);
      assert.strictEqual(stats.averageScore, 90);
      assert.deepStrictEqual(stats.strengths, ['trading']);
      assert.deepStrictEqual(stats.weaknesses, ['investment']);
    });
  });

  describe('resetProgress', () => {
    it('should reset all player progress', () => {
      const profile = engine.createProfile(testPlayerId);
      profile.currentDifficulty = 3;
      profile.completedLessons.push({ lessonId: 'lesson1', score: 85 });
      profile.masteredConcepts.push('trading');
      
      engine.resetProgress(testPlayerId);
      
      assert.strictEqual(profile.currentDifficulty, 1);
      assert.deepStrictEqual(profile.completedLessons, []);
      assert.deepStrictEqual(profile.masteredConcepts, []);
    });
  });
});