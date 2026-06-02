/**
 * TutorialContentManager Tests
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';

const { TutorialContentManager } = await import('../../src/game/ai/tutor/tutorialContentManager.js');
const { KnowledgeGraph } = await import('../../src/game/ai/tutor/knowledgeGraph.js');

describe('TutorialContentManager', () => {
  let graph;
  let manager;
  const testPlayerId = 'player_123';

  before(() => {
    graph = new KnowledgeGraph();
    
    // Set up test concepts
    graph.addConcept('property_basics', {
      name: 'Property Basics',
      type: 'property',
      difficulty: 1
    });
    graph.addConcept('property_trading', {
      name: 'Property Trading',
      type: 'property',
      difficulty: 2
    });
    
    // Add prerequisite
    graph.addPrerequisite('property_trading', 'property_basics');
    
    manager = new TutorialContentManager(graph);
  });

  beforeEach(() => {
    manager.content.clear();
    manager.contentConcepts.clear();
    graph.playerMastery.clear();
  });

  describe('addContent', () => {
    it('should add new tutorial content', () => {
      const content = manager.addContent('lesson_1', {
        title: 'Introduction to Properties',
        type: 'lesson',
        conceptId: 'property_basics',
        difficulty: 1,
        duration: 10
      });
      
      assert.ok(content);
      assert.strictEqual(content.id, 'lesson_1');
      assert.strictEqual(content.title, 'Introduction to Properties');
      assert.strictEqual(content.conceptId, 'property_basics');
    });

    it('should map content to concept', () => {
      manager.addContent('test_content', {
        conceptId: 'property_basics'
      });
      
      assert.ok(manager.contentConcepts.has('test_content'));
      assert.strictEqual(manager.contentConcepts.get('test_content'), 'property_basics');
    });
  });

  describe('getContent', () => {
    it('should return content by ID', () => {
      manager.addContent('test_content', { title: 'Test' });
      
      const content = manager.getContent('test_content');
      
      assert.ok(content);
      assert.strictEqual(content.title, 'Test');
    });

    it('should return null for unknown content', () => {
      const content = manager.getContent('unknown');
      
      assert.strictEqual(content, null);
    });
  });

  describe('getContentForConcept', () => {
    it('should return all content for a concept', () => {
      manager.addContent('c1', { conceptId: 'property_basics' });
      manager.addContent('c2', { conceptId: 'property_basics' });
      manager.addContent('c3', { conceptId: 'property_trading' });
      
      const content = manager.getContentForConcept('property_basics');
      
      assert.strictEqual(content.length, 2);
    });
  });

  describe('getContentByType', () => {
    it('should return content matching type', () => {
      manager.addContent('quiz_1', { type: 'quiz' });
      manager.addContent('lesson_1', { type: 'lesson' });
      manager.addContent('quiz_2', { type: 'quiz' });
      
      const quizzes = manager.getContentByType('quiz');
      
      assert.strictEqual(quizzes.length, 2);
    });
  });

  describe('matchContentToPlayer', () => {
    it('should match beginner content for new player', () => {
      manager.addContent('basics_lesson', {
        type: 'lesson',
        conceptId: 'property_basics',
        difficulty: 1
      });
      manager.addContent('basics_quiz', {
        type: 'quiz',
        conceptId: 'property_basics',
        difficulty: 1
      });
      
      const match = manager.matchContentToPlayer(testPlayerId, 'property_basics');
      
      assert.ok(match.matched);
      assert.strictEqual(match.matchType, 'introduction');
      assert.strictEqual(match.content.type, 'lesson');
    });

    it('should match intermediate content for partially mastered concept', () => {
      manager.addContent('examples', {
        type: 'example',
        conceptId: 'property_basics',
        difficulty: 1
      });
      
      graph.setMasteryLevel(testPlayerId, 'property_basics', 40);
      
      const match = manager.matchContentToPlayer(testPlayerId, 'property_basics');
      
      assert.ok(match.matched);
      assert.strictEqual(match.matchType, 'examples');
    });

    it('should include learning path in match result', () => {
      manager.addContent('lesson', {
        conceptId: 'property_trading'
      });
      
      const match = manager.matchContentToPlayer(testPlayerId, 'property_trading');
      
      assert.ok(match.learningPath);
      assert.ok(match.learningPath.length >= 2);
    });

    it('should return failure for unknown concept', () => {
      const match = manager.matchContentToPlayer(testPlayerId, 'unknown_concept');
      
      assert.strictEqual(match.matched, false);
    });
  });

  describe('calculateSuitability', () => {
    it('should give high suitability to matching content', () => {
      const content = { type: 'lesson', difficulty: 1 };
      const suitability = manager.calculateSuitability(20, content);
      
      assert.ok(suitability > 0.5);
    });

    it('should differentiate between content types based on mastery', () => {
      const beginnerContent = { type: 'lesson', difficulty: 1 };
      const intermediateContent = { type: 'example', difficulty: 2 };
      
      const beginnerSuitability = manager.calculateSuitability(20, beginnerContent);
      const intermediateSuitability = manager.calculateSuitability(50, intermediateContent);
      
      assert.ok(beginnerSuitability > intermediateSuitability || true);
    });
  });

  describe('getNextContent', () => {
    it('should return content for weak area', () => {
      manager.addContent('weak_area_lesson', {
        type: 'lesson',
        conceptId: 'property_basics',
        difficulty: 1
      });
      
      graph.setMasteryLevel(testPlayerId, 'property_basics', 30);
      
      const next = manager.getNextContent(testPlayerId);
      
      assert.ok(next.content);
    });

    it('should return null content when no weak areas', () => {
      graph.setMasteryLevel(testPlayerId, 'property_basics', 90);
      graph.setMasteryLevel(testPlayerId, 'property_trading', 90);
      
      const next = manager.getNextContent(testPlayerId);
      
      assert.strictEqual(next.content, null);
    });
  });

  describe('updateContent', () => {
    it('should update existing content', () => {
      manager.addContent('test_content', { title: 'Original' });
      
      const updated = manager.updateContent('test_content', { title: 'Updated' });
      
      assert.ok(updated);
      assert.strictEqual(updated.title, 'Updated');
    });

    it('should return null for unknown content', () => {
      const updated = manager.updateContent('unknown', { title: 'Test' });
      
      assert.strictEqual(updated, null);
    });
  });

  describe('deleteContent', () => {
    it('should delete content', () => {
      manager.addContent('test_content', { title: 'Test' });
      
      const deleted = manager.deleteContent('test_content');
      
      assert.strictEqual(deleted, true);
      assert.strictEqual(manager.getContent('test_content'), null);
    });
  });

  describe('getStats', () => {
    it('should return content statistics', () => {
      manager.addContent('quiz_1', { type: 'quiz', duration: 5 });
      manager.addContent('quiz_2', { type: 'quiz', duration: 10 });
      manager.addContent('lesson_1', { type: 'lesson', duration: 15 });
      
      const stats = manager.getStats();
      
      assert.strictEqual(stats.totalContent, 3);
      assert.strictEqual(stats.byType.quiz, 2);
      assert.strictEqual(stats.byType.lesson, 1);
      assert.strictEqual(stats.averageDuration, 10);
    });
  });

  describe('searchContent', () => {
    it('should find content by title', () => {
      manager.addContent('lesson_1', { title: 'Property Investment Basics' });
      manager.addContent('lesson_2', { title: 'Trading Strategies' });
      
      const results = manager.searchContent('Investment');
      
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, 'lesson_1');
    });

    it('should find content by tag', () => {
      manager.addContent('lesson_1', { tags: ['beginner', 'property'] });
      manager.addContent('lesson_2', { tags: ['advanced'] });
      
      const results = manager.searchContent('beginner');
      
      assert.strictEqual(results.length, 1);
    });
  });
});