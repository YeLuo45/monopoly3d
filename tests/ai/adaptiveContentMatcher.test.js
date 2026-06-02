/**
 * AdaptiveContentMatcher Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import { 
  AdaptiveContentMatcher, 
  ContentItem 
} from '../../src/game/ai/segment/adaptiveContentMatcher.js';

import { PlayerSegmentor, PlayerMetrics } from '../../src/game/ai/segment/playerSegmentor.js';
import { PersonalizationEngine } from '../../src/game/ai/segment/personalizationEngine.js';

describe('AdaptiveContentMatcher', () => {
  let matcher;
  let segmentor;
  let personalizationEngine;

  beforeEach(() => {
    segmentor = new PlayerSegmentor({
      trackEvent: () => {},
      getPlayerMetrics: (playerId) => new PlayerMetrics(playerId)
    });
    personalizationEngine = new PersonalizationEngine(segmentor);
    matcher = new AdaptiveContentMatcher(segmentor, personalizationEngine);
  });

  it('should create AdaptiveContentMatcher instance', () => {
    assert.ok(matcher instanceof AdaptiveContentMatcher);
    assert.ok(matcher.segmentor);
    assert.ok(matcher.personalizationEngine);
  });

  it('should match content to player', () => {
    const contentList = [
      { id: 'item1', type: 'tutorial', metadata: { segment: 'casual', complexity: 0.3 } },
      { id: 'item2', type: 'tutorial', metadata: { segment: 'strategic', complexity: 0.7 } },
      { id: 'item3', type: 'tutorial', metadata: { segment: 'competitive', complexity: 0.6 } }
    ];
    
    const matched = matcher.matchContentToPlayer('player1', contentList);
    assert.ok(matched);
    assert.ok(matched.id);
  });

  it('should rank content for player', () => {
    const contentList = [
      { id: 'item1', type: 'challenge', metadata: { difficulty: 0.3 } },
      { id: 'item2', type: 'challenge', metadata: { difficulty: 0.7 } },
      { id: 'item3', type: 'challenge', metadata: { difficulty: 0.5 } }
    ];
    
    const ranked = matcher.rankContentForPlayer('player1', contentList);
    assert.ok(Array.isArray(ranked));
    assert.strictEqual(ranked.length, 3);
    assert.ok(ranked[0].totalScore !== undefined);
  });

  it('should handle empty content list', () => {
    const matched = matcher.matchContentToPlayer('player1', []);
    assert.strictEqual(matched, null);
    
    const ranked = matcher.rankContentForPlayer('player1', []);
    assert.ok(Array.isArray(ranked));
    assert.strictEqual(ranked.length, 0);
  });

  it('should record match history', () => {
    const contentList = [
      { id: 'item1', type: 'event', metadata: { segment: 'casual' } }
    ];
    
    matcher.matchContentToPlayer('player1', contentList);
    const history = matcher.getMatchHistory('player1');
    assert.ok(Array.isArray(history));
  });

  it('should add content to pool', () => {
    const content = new ContentItem('test1', 'tutorial', { segment: 'casual' });
    matcher.addToContentPool(content);
    const retrieved = matcher.getContentFromPool('test1');
    assert.ok(retrieved);
    assert.strictEqual(retrieved.id, 'test1');
  });

  it('should clear match history', () => {
    matcher.clearMatchHistory('player1');
    const history = matcher.getMatchHistory('player1');
    assert.ok(Array.isArray(history));
    assert.strictEqual(history.length, 0);
  });

  it('should use ContentItem class correctly', () => {
    const item = new ContentItem('test1', 'tutorial', { 
      segment: 'casual', 
      difficulty: 0.5 
    });
    
    assert.strictEqual(item.id, 'test1');
    assert.strictEqual(item.type, 'tutorial');
    assert.strictEqual(item.segment, 'casual');
    assert.strictEqual(item.difficulty, 0.5);
  });
});