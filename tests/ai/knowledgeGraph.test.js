/**
 * KnowledgeGraph Tests
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';

const { KnowledgeGraph } = await import('../../src/game/ai/tutor/knowledgeGraph.js');

describe('KnowledgeGraph', () => {
  let graph;

  before(() => {
    graph = new KnowledgeGraph();
  });

  beforeEach(() => {
    graph.concepts.clear();
    graph.prerequisites.clear();
    graph.dependents.clear();
    graph.playerMastery.clear();
  });

  describe('addConcept', () => {
    it('should add a new concept', () => {
      const concept = graph.addConcept('property_basics', {
        name: 'Property Basics',
        type: KnowledgeGraph.ConceptTypes.PROPERTY,
        description: 'Basic property concepts',
        difficulty: 1
      });
      
      assert.ok(concept);
      assert.strictEqual(concept.id, 'property_basics');
      assert.strictEqual(concept.name, 'Property Basics');
      assert.strictEqual(concept.difficulty, 1);
    });

    it('should create empty prerequisite list', () => {
      graph.addConcept('test_concept');
      
      assert.ok(graph.prerequisites.has('test_concept'));
      assert.deepStrictEqual(graph.prerequisites.get('test_concept'), []);
    });
  });

  describe('getConcept', () => {
    it('should return concept details', () => {
      graph.addConcept('test_concept', { name: 'Test', difficulty: 2 });
      const concept = graph.getConcept('test_concept');
      
      assert.ok(concept);
      assert.strictEqual(concept.name, 'Test');
      assert.strictEqual(concept.difficulty, 2);
    });

    it('should return null for unknown concept', () => {
      const concept = graph.getConcept('unknown');
      
      assert.strictEqual(concept, null);
    });
  });

  describe('addPrerequisite', () => {
    it('should add prerequisite relationship', () => {
      graph.addConcept('advanced_trading');
      graph.addConcept('trading_basics');
      
      const prereqs = graph.addPrerequisite('advanced_trading', 'trading_basics');
      
      assert.ok(prereqs.includes('trading_basics'));
      assert.ok(graph.dependents.get('trading_basics').includes('advanced_trading'));
    });

    it('should throw error for unknown concept', () => {
      graph.addConcept('existing');
      
      assert.throws(() => {
        graph.addPrerequisite('unknown', 'existing');
      });
    });
  });

  describe('getPrerequisites', () => {
    it('should return all prerequisites', () => {
      graph.addConcept('level3');
      graph.addConcept('level2');
      graph.addConcept('level1');
      
      graph.addPrerequisite('level3', 'level2');
      graph.addPrerequisite('level3', 'level1');
      
      const prereqs = graph.getPrerequisites('level3');
      
      assert.strictEqual(prereqs.length, 2);
    });
  });

  describe('getLearningPath', () => {
    it('should return concepts in learning order', () => {
      graph.addConcept('level3');
      graph.addConcept('level2');
      graph.addConcept('level1');
      
      graph.addPrerequisite('level3', 'level2');
      graph.addPrerequisite('level2', 'level1');
      
      const path = graph.getLearningPath('level3');
      
      assert.strictEqual(path.length, 3);
      assert.strictEqual(path[0].id, 'level1');
      assert.strictEqual(path[path.length - 1].id, 'level3');
    });

    it('should return null for unknown concept', () => {
      const path = graph.getLearningPath('unknown');
      
      assert.strictEqual(path, null);
    });

    it('should handle complex multi-path dependencies', () => {
      graph.addConcept('master');
      graph.addConcept('prereq_a');
      graph.addConcept('prereq_b');
      graph.addConcept('base');
      
      graph.addPrerequisite('prereq_a', 'base');
      graph.addPrerequisite('prereq_b', 'base');
      graph.addPrerequisite('master', 'prereq_a');
      graph.addPrerequisite('master', 'prereq_b');
      
      const path = graph.getLearningPath('master');
      
      assert.ok(path.length >= 4);
    });
  });

  describe('setMasteryLevel', () => {
    it('should set mastery level for player', () => {
      graph.addConcept('test_concept');
      
      const mastery = graph.setMasteryLevel('player1', 'test_concept', 75);
      
      assert.strictEqual(mastery.level, 75);
    });

    it('should clamp mastery between 0 and 100', () => {
      graph.addConcept('test_concept');
      
      graph.setMasteryLevel('player1', 'test_concept', 150);
      let mastery = graph.getMasteryLevel('player1', 'test_concept');
      assert.strictEqual(mastery, 100);
      
      graph.setMasteryLevel('player1', 'test_concept', -20);
      mastery = graph.getMasteryLevel('player1', 'test_concept');
      assert.strictEqual(mastery, 0);
    });
  });

  describe('getMasteryLevel', () => {
    it('should return current mastery level', () => {
      graph.addConcept('test_concept');
      graph.setMasteryLevel('player1', 'test_concept', 60);
      
      const level = graph.getMasteryLevel('player1', 'test_concept');
      
      assert.strictEqual(level, 60);
    });

    it('should return 0 for unknown player or concept', () => {
      const level = graph.getMasteryLevel('unknown_player', 'unknown_concept');
      
      assert.strictEqual(level, 0);
    });
  });

  describe('getWeakAreas', () => {
    it('should return concepts with low mastery', () => {
      graph.addConcept('weak_concept', { difficulty: 2 });
      graph.addConcept('strong_concept', { difficulty: 1 });
      
      graph.setMasteryLevel('player1', 'weak_concept', 30);
      graph.setMasteryLevel('player1', 'strong_concept', 90);
      
      const weakAreas = graph.getWeakAreas('player1');
      
      assert.ok(weakAreas.some(wa => wa.concept.id === 'weak_concept'));
      assert.ok(!weakAreas.some(wa => wa.concept.id === 'strong_concept'));
    });
  });

  describe('getReadyConcepts', () => {
    it('should return concepts with prerequisites met', () => {
      graph.addConcept('advanced');
      graph.addConcept('basics');
      
      graph.addPrerequisite('advanced', 'basics');
      graph.setMasteryLevel('player1', 'basics', 80);
      
      const ready = graph.getReadyConcepts('player1');
      
      assert.ok(ready.some(c => c.id === 'advanced'));
    });

    it('should exclude concepts with unmet prerequisites', () => {
      graph.addConcept('advanced');
      graph.addConcept('basics');
      
      graph.addPrerequisite('advanced', 'basics');
      // Don't set mastery for basics
      
      const ready = graph.getReadyConcepts('player1');
      
      assert.ok(!ready.some(c => c.id === 'advanced'));
    });
  });

  describe('getStats', () => {
    it('should return graph statistics', () => {
      graph.addConcept('c1', { type: 'property' });
      graph.addConcept('c2', { type: 'property' });
      graph.addConcept('c3', { type: 'trading' });
      
      graph.addPrerequisite('c2', 'c1');
      
      const stats = graph.getStats();
      
      assert.strictEqual(stats.totalConcepts, 3);
      assert.strictEqual(stats.totalPrerequisites, 1);
      assert.strictEqual(stats.conceptTypes.property, 2);
      assert.strictEqual(stats.conceptTypes.trading, 1);
    });
  });
});