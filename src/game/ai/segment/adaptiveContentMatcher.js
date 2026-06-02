/**
 * Adaptive Content Matcher
 * 
 * Matches and ranks content for players based on their segment and preferences.
 * Provides intelligent content recommendations.
 */

/**
 * Content scoring weights
 */
const MATCH_WEIGHTS = {
  SEGMENT_MATCH: 0.4,
  PREFERENCE_MATCH: 0.35,
  RECENCY: 0.15,
  POPULARITY: 0.1
};

/**
 * Content item metadata
 */
class ContentItem {
  constructor(id, type, metadata = {}) {
    this.id = id;
    this.type = type;
    this.metadata = metadata;
    this.tags = metadata.tags || [];
    this.difficulty = metadata.difficulty || 0.5;
    this.complexity = metadata.complexity || 0.5;
    this.risk = metadata.risk || 0.5;
    this.interactionLevel = metadata.interactionLevel || 0.5;
    this.timestamp = metadata.timestamp || Date.now();
    this.popularity = metadata.popularity || 0.5;
    this.segment = metadata.segment || null;
    this.title = metadata.title || id;
  }
}

/**
 * Adaptive Content Matcher
 */
class AdaptiveContentMatcher {
  /**
   * @param {PlayerSegmentor} segmentor - Player segmentor instance
   * @param {PersonalizationEngine} personalizationEngine - Personalization engine instance
   */
  constructor(segmentor, personalizationEngine) {
    this.segmentor = segmentor;
    this.personalizationEngine = personalizationEngine;
    this.matchHistory = new Map();
    this.contentPool = new Map();
  }

  /**
   * Match content to a player - returns best match
   * @param {string} playerId - Player identifier
   * @param {Array} contentList - List of content items
   * @returns {Object|null} Best matched content item
   */
  matchContentToPlayer(playerId, contentList) {
    if (!contentList || contentList.length === 0) return null;

    const segment = this.segmentor.segmentPlayer(playerId);
    const preferences = this.personalizationEngine.getPreferences(playerId);
    const scored = this.scoreAllContent(playerId, contentList, segment, preferences);
    
    const best = scored.sort((a, b) => b.totalScore - a.totalScore)[0];
    
    this.recordMatch(playerId, best?.item?.id);
    
    return best?.item || null;
  }

  /**
   * Rank content for a player - returns ranked list
   * @param {string} playerId - Player identifier
   * @param {Array} contentList - List of content items
   * @returns {Array} Ranked content items with scores
   */
  rankContentForPlayer(playerId, contentList) {
    if (!contentList || contentList.length === 0) return [];

    const segment = this.segmentor.segmentPlayer(playerId);
    const preferences = this.personalizationEngine.getPreferences(playerId);
    
    return this.scoreAllContent(playerId, contentList, segment, preferences)
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Score all content items for a player
   * @param {string} playerId - Player identifier
   * @param {Array} contentList - List of content items
   * @param {string} segment - Player segment
   * @param {Object} preferences - Player preferences
   * @returns {Array} Scored content items
   */
  scoreAllContent(playerId, contentList, segment, preferences) {
    return contentList.map(item => {
      const scores = this.calculateContentScores(item, playerId, segment, preferences);
      return {
        item,
        ...scores,
        totalScore: this.calculateTotalScore(scores)
      };
    });
  }

  /**
   * Calculate individual scores for content
   * @param {Object} item - Content item
   * @param {string} playerId - Player identifier
   * @param {string} segment - Player segment
   * @param {Object} preferences - Player preferences
   * @returns {Object} Individual scores
   */
  calculateContentScores(item, playerId, segment, preferences) {
    return {
      segmentScore: this.scoreSegmentMatch(item, segment),
      preferenceScore: this.scorePreferenceMatch(item, preferences),
      recencyScore: this.scoreRecency(item),
      popularityScore: this.scorePopularity(item)
    };
  }

  /**
   * Score based on segment match
   * @param {Object} item - Content item
   * @param {string} segment - Player segment
   * @returns {number} Segment match score (0-1)
   */
  scoreSegmentMatch(item, segment) {
    // Direct segment match
    if (item.segment === segment) return 1.0;
    if (item.segment) return 0.3;
    
    // Infer segment from content attributes
    const inferredSegment = this.inferSegmentFromContent(item);
    if (inferredSegment === segment) return 0.7;
    
    return 0.4;
  }

  /**
   * Infer segment from content attributes
   * @param {Object} item - Content item
   * @returns {string} Inferred segment
   */
  inferSegmentFromContent(item) {
    if (item.complexity > 0.7 && item.risk > 0.5) return 'strategic';
    if (item.interactionLevel > 0.7) return 'social';
    if (item.difficulty > 0.7) return 'competitive';
    if (item.complexity < 0.4 && item.risk < 0.4) return 'casual';
    return 'strategic';
  }

  /**
   * Score based on preference match
   * @param {Object} item - Content item
   * @param {Object} preferences - Player preferences
   * @returns {number} Preference match score (0-1)
   */
  scorePreferenceMatch(item, preferences) {
    let score = 0.5;
    let factors = 0;

    if (item.difficulty !== undefined) {
      score += 1 - Math.abs(item.difficulty - preferences.difficulty);
      factors++;
    }
    if (item.complexity !== undefined) {
      score += 1 - Math.abs(item.complexity - preferences.complexity);
      factors++;
    }
    if (item.risk !== undefined) {
      score += 1 - Math.abs(item.risk - preferences.riskLevel);
      factors++;
    }
    if (item.interactionLevel !== undefined) {
      score += 1 - Math.abs(item.interactionLevel - preferences.socialLevel);
      factors++;
    }

    return factors > 0 ? score / (factors + 1) : 0.5;
  }

  /**
   * Score based on recency
   * @param {Object} item - Content item
   * @returns {number} Recency score (0-1)
   */
  scoreRecency(item) {
    const age = Date.now() - (item.timestamp || 0);
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    return Math.max(0, 1 - age / maxAge);
  }

  /**
   * Score based on popularity
   * @param {Object} item - Content item
   * @returns {number} Popularity score (0-1)
   */
  scorePopularity(item) {
    return item.popularity || 0.5;
  }

  /**
   * Calculate total weighted score
   * @param {Object} scores - Individual scores
   * @returns {number} Total score (0-1)
   */
  calculateTotalScore(scores) {
    return (
      scores.segmentScore * MATCH_WEIGHTS.SEGMENT_MATCH +
      scores.preferenceScore * MATCH_WEIGHTS.PREFERENCE_MATCH +
      scores.recencyScore * MATCH_WEIGHTS.RECENCY +
      scores.popularityScore * MATCH_WEIGHTS.POPULARITY
    );
  }

  /**
   * Record a match for history tracking
   * @param {string} playerId - Player identifier
   * @param {string} contentId - Matched content ID
   */
  recordMatch(playerId, contentId) {
    if (!contentId) return;
    
    if (!this.matchHistory.has(playerId)) {
      this.matchHistory.set(playerId, []);
    }
    
    const history = this.matchHistory.get(playerId);
    history.push({ contentId, timestamp: Date.now() });
    
    // Limit history size
    if (history.length > 50) {
      history.shift();
    }
  }

  /**
   * Get match history for a player
   * @param {string} playerId - Player identifier
   * @returns {Array} Match history
   */
  getMatchHistory(playerId) {
    return this.matchHistory.get(playerId) || [];
  }

  /**
   * Get content from pool by ID
   * @param {string} contentId - Content identifier
   * @returns {Object|null} Content item
   */
  getContentFromPool(contentId) {
    return this.contentPool.get(contentId) || null;
  }

  /**
   * Add content to pool
   * @param {Object} content - Content item
   */
  addToContentPool(content) {
    if (content.id) {
      this.contentPool.set(content.id, content);
    }
  }

  /**
   * Clear match history for a player
   * @param {string} playerId - Player identifier
   */
  clearMatchHistory(playerId) {
    this.matchHistory.delete(playerId);
  }

  /**
   * Clear all match histories
   */
  clearAllMatchHistory() {
    this.matchHistory.clear();
  }
}

export { 
  AdaptiveContentMatcher, 
  ContentItem, 
  MATCH_WEIGHTS 
};