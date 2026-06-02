/**
 * PersonalizationEngine Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import { 
  PersonalizationEngine, 
  CONTENT_TYPES,
  PREFERENCE_TYPES
} from '../../src/game/ai/segment/personalizationEngine.js';

import { PlayerSegmentor, PlayerMetrics } from '../../src/game/ai/segment/playerSegmentor.js';

describe('PersonalizationEngine', () => {
  let personalizationEngine;
  let segmentor;

  beforeEach(() => {
    segmentor = new PlayerSegmentor({
      trackEvent: () => {},
      getPlayerMetrics: (playerId) => new PlayerMetrics(playerId)
    });
    personalizationEngine = new PersonalizationEngine(segmentor);
  });

  it('should create PersonalizationEngine instance', () => {
    assert.ok(personalizationEngine instanceof PersonalizationEngine);
    assert.ok(personalizationEngine.segmentor);
  });

  it('should get personalized content', () => {
    const content = personalizationEngine.getPersonalizedContent('player1', CONTENT_TYPES.TUTORIAL);
    assert.ok(content);
    assert.ok(content.id);
  });

  it('should learn preferences', () => {
    personalizationEngine.learnPreference('player1', PREFERENCE_TYPES.DIFFICULTY, 0.8);
    const prefs = personalizationEngine.getPreferences('player1');
    // Weighted average: oldValue * 0.7 + newValue * 0.3 = 0.5 * 0.7 + 0.8 * 0.3 = 0.59
    assert.ok(Math.abs(prefs[PREFERENCE_TYPES.DIFFICULTY] - 0.59) < 0.01);
  });

  it('should get preferences with segment base', () => {
    const prefs = personalizationEngine.getPreferences('player1');
    assert.ok(prefs);
    assert.ok(prefs[PREFERENCE_TYPES.DIFFICULTY] !== undefined);
  });

  it('should get recommended difficulty', () => {
    const difficulty = personalizationEngine.getRecommendedDifficulty('player1');
    assert.ok(typeof difficulty === 'number');
    assert.ok(difficulty >= 0 && difficulty <= 1);
  });

  it('should return null for unknown content type', () => {
    const content = personalizationEngine.getPersonalizedContent('player1', 'unknown');
    assert.strictEqual(content, null);
  });

  it('should get content for segment', () => {
    const content = personalizationEngine.getContentForSegment('casual', CONTENT_TYPES.CHALLENGE);
    assert.ok(Array.isArray(content));
  });

  it('should clear preferences', () => {
    personalizationEngine.learnPreference('player1', PREFERENCE_TYPES.DIFFICULTY, 0.9);
    personalizationEngine.clearPreferences('player1');
    const prefs = personalizationEngine.getPreferences('player1');
    assert.ok(prefs[PREFERENCE_TYPES.DIFFICULTY] !== 0.9);
  });
});