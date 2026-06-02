/**
 * Personalization Engine
 * 
 * Personalizes game experience based on player segments and preferences.
 * Learns player preferences over time and provides personalized content.
 */

const CONTENT_TYPES = {
  TUTORIAL: 'tutorial',
  CHALLENGE: 'challenge',
  EVENT: 'event',
  REWARD: 'reward',
  PROPERTY: 'property',
  TRADE: 'trade'
};

const PREFERENCE_TYPES = {
  DIFFICULTY: 'difficulty',
  PACING: 'pacing',
  COMPLEXITY: 'complexity',
  RISK_LEVEL: 'riskLevel',
  SOCIAL_LEVEL: 'socialLevel',
  COMPETITION_LEVEL: 'competitionLevel'
};

const DEFAULT_PREFERENCES = {
  [PREFERENCE_TYPES.DIFFICULTY]: 0.5,
  [PREFERENCE_TYPES.PACING]: 0.5,
  [PREFERENCE_TYPES.COMPLEXITY]: 0.5,
  [PREFERENCE_TYPES.RISK_LEVEL]: 0.5,
  [PREFERENCE_TYPES.SOCIAL_LEVEL]: 0.5,
  [PREFERENCE_TYPES.COMPETITION_LEVEL]: 0.5
};

const SEGMENT_PREFERENCE_BASE = {
  casual: {
    [PREFERENCE_TYPES.DIFFICULTY]: 0.3,
    [PREFERENCE_TYPES.PACING]: 0.7,
    [PREFERENCE_TYPES.COMPLEXITY]: 0.3,
    [PREFERENCE_TYPES.RISK_LEVEL]: 0.2,
    [PREFERENCE_TYPES.SOCIAL_LEVEL]: 0.6,
    [PREFERENCE_TYPES.COMPETITION_LEVEL]: 0.3
  },
  strategic: {
    [PREFERENCE_TYPES.DIFFICULTY]: 0.6,
    [PREFERENCE_TYPES.PACING]: 0.5,
    [PREFERENCE_TYPES.COMPLEXITY]: 0.7,
    [PREFERENCE_TYPES.RISK_LEVEL]: 0.5,
    [PREFERENCE_TYPES.SOCIAL_LEVEL]: 0.4,
    [PREFERENCE_TYPES.COMPETITION_LEVEL]: 0.5
  },
  competitive: {
    [PREFERENCE_TYPES.DIFFICULTY]: 0.8,
    [PREFERENCE_TYPES.PACING]: 0.4,
    [PREFERENCE_TYPES.COMPLEXITY]: 0.6,
    [PREFERENCE_TYPES.RISK_LEVEL]: 0.7,
    [PREFERENCE_TYPES.SOCIAL_LEVEL]: 0.3,
    [PREFERENCE_TYPES.COMPETITION_LEVEL]: 0.9
  },
  social: {
    [PREFERENCE_TYPES.DIFFICULTY]: 0.4,
    [PREFERENCE_TYPES.PACING]: 0.6,
    [PREFERENCE_TYPES.COMPLEXITY]: 0.4,
    [PREFERENCE_TYPES.RISK_LEVEL]: 0.4,
    [PREFERENCE_TYPES.SOCIAL_LEVEL]: 0.8,
    [PREFERENCE_TYPES.COMPETITION_LEVEL]: 0.4
  }
};

/**
 * Personalization Engine - Personalizes game experience
 */
class PersonalizationEngine {
  /**
   * @param {PlayerSegmentor} segmentor - Player segmentor instance
   */
  constructor(segmentor) {
    this.segmentor = segmentor;
    this.playerPreferences = new Map();
    this.learningHistory = new Map();
    this.contentLibrary = this.initializeContentLibrary();
  }

  /**
   * Initialize content library with sample content
   */
  initializeContentLibrary() {
    return {
      tutorial: [
        { id: 'tut_basic', title: 'Basic Rules', complexity: 0.2, segment: 'casual' },
        { id: 'tut_advanced', title: 'Advanced Strategies', complexity: 0.7, segment: 'strategic' },
        { id: 'tut_competitive', title: 'Winning Tips', complexity: 0.6, segment: 'competitive' },
        { id: 'tut_social', title: 'Trading Guide', complexity: 0.4, segment: 'social' }
      ],
      challenge: [
        { id: 'ch_easy', title: 'Easy Challenge', difficulty: 0.3, segment: 'casual' },
        { id: 'ch_medium', title: 'Medium Challenge', difficulty: 0.5, segment: 'strategic' },
        { id: 'ch_hard', title: 'Hard Challenge', difficulty: 0.8, segment: 'competitive' },
        { id: 'ch_social', title: 'Group Challenge', difficulty: 0.4, segment: 'social' }
      ],
      event: [
        { id: 'evt_relaxed', title: 'Community Event', intensity: 0.3, segment: 'casual' },
        { id: 'evt_normal', title: 'Standard Event', intensity: 0.5, segment: 'strategic' },
        { id: 'evt_intense', title: 'High Stakes Event', intensity: 0.8, segment: 'competitive' },
        { id: 'evt_party', title: 'Social Gathering', intensity: 0.5, segment: 'social' }
      ],
      reward: [
        { id: 'rew_small', title: 'Small Bonus', value: 0.2, frequency: 'high', segment: 'casual' },
        { id: 'rew_strategic', title: 'Strategic Bonus', value: 0.5, frequency: 'medium', segment: 'strategic' },
        { id: 'rew_jackpot', title: 'Jackpot', value: 0.9, frequency: 'low', segment: 'competitive' },
        { id: 'rew_social', title: 'Friend Bonus', value: 0.4, frequency: 'high', segment: 'social' }
      ],
      property: [
        { id: 'prop_safe', title: 'Safe Property', risk: 0.2, segment: 'casual' },
        { id: 'prop_balanced', title: 'Balanced Property', risk: 0.5, segment: 'strategic' },
        { id: 'prop_risky', title: 'High Risk Property', risk: 0.8, segment: 'competitive' },
        { id: 'prop_social', title: 'Popular Property', risk: 0.4, segment: 'social' }
      ],
      trade: [
        { id: 'tr_simple', title: 'Simple Trade', complexity: 0.2, segment: 'casual' },
        { id: 'tr_multi', title: 'Multi-party Trade', complexity: 0.6, segment: 'strategic' },
        { id: 'tr_competitive', title: 'Competitive Offer', complexity: 0.5, segment: 'competitive' },
        { id: 'tr_social', title: 'Fair Trade', complexity: 0.3, segment: 'social' }
      ]
    };
  }

  /**
   * Get personalized content for a player
   * @param {string} playerId - Player identifier
   * @param {string} contentType - Type of content
   * @returns {Object|null} Personalized content item or null
   */
  getPersonalizedContent(playerId, contentType) {
    const segment = this.segmentor.segmentPlayer(playerId);
    const preferences = this.getPreferences(playerId);
    const contentList = this.contentLibrary[contentType] || [];
    
    if (contentList.length === 0) return null;

    // Filter by segment first
    const segmentContent = contentList.filter(c => c.segment === segment);
    const fallbackContent = contentList;

    // Score and rank by preference match
    const scored = (segmentContent.length > 0 ? segmentContent : fallbackContent)
      .map(item => ({
        item,
        score: this.scoreContentMatch(item, contentType, preferences)
      }))
      .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].item : null;
  }

  /**
   * Get recommended difficulty for a player
   * @param {string} playerId - Player identifier
   * @returns {number} Difficulty level (0-1)
   */
  getRecommendedDifficulty(playerId) {
    const segment = this.segmentor.segmentPlayer(playerId);
    const preferences = this.getPreferences(playerId);
    const baseDifficulty = SEGMENT_PREFERENCE_BASE[segment]?.[PREFERENCE_TYPES.DIFFICULTY] || 0.5;
    
    // Adjust based on player preference learning
    const learnedAdjustment = this.getLearnedAdjustment(playerId, PREFERENCE_TYPES.DIFFICULTY);
    
    return Math.max(0, Math.min(1, baseDifficulty + learnedAdjustment));
  }

  /**
   * Learn a preference for a player
   * @param {string} playerId - Player identifier
   * @param {string} preferenceType - Type of preference
   * @param {number} value - Preference value (0-1)
   */
  learnPreference(playerId, preferenceType, value) {
    if (!this.playerPreferences.has(playerId)) {
      this.playerPreferences.set(playerId, { ...DEFAULT_PREFERENCES });
    }

    const prefs = this.playerPreferences.get(playerId);
    const oldValue = prefs[preferenceType] || 0.5;
    
    // Smooth learning with weighted average
    prefs[preferenceType] = oldValue * 0.7 + value * 0.3;

    // Track learning history
    if (!this.learningHistory.has(playerId)) {
      this.learningHistory.set(playerId, []);
    }
    this.learningHistory.get(playerId).push({
      preferenceType,
      oldValue,
      newValue: prefs[preferenceType],
      timestamp: Date.now()
    });

    // Limit history size
    const history = this.learningHistory.get(playerId);
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get all preferences for a player
   * @param {string} playerId - Player identifier
   * @returns {Object} Player preferences
   */
  getPreferences(playerId) {
    if (!this.playerPreferences.has(playerId)) {
      // Initialize with segment base preferences
      const segment = this.segmentor.segmentPlayer(playerId);
      this.playerPreferences.set(playerId, { 
        ...DEFAULT_PREFERENCES,
        ...SEGMENT_PREFERENCE_BASE[segment]
      });
    }
    return this.playerPreferences.get(playerId);
  }

  /**
   * Score how well content matches player preferences
   * @param {Object} item - Content item
   * @param {string} contentType - Content type
   * @param {Object} preferences - Player preferences
   * @returns {number} Match score (0-1)
   */
  scoreContentMatch(item, contentType, preferences) {
    let score = 0.5; // Base score

    switch (contentType) {
      case CONTENT_TYPES.TUTORIAL:
        score = 1 - Math.abs(item.complexity - preferences[PREFERENCE_TYPES.COMPLEXITY]);
        break;
      case CONTENT_TYPES.CHALLENGE:
        score = 1 - Math.abs(item.difficulty - preferences[PREFERENCE_TYPES.DIFFICULTY]);
        break;
      case CONTENT_TYPES.EVENT:
        score = 1 - Math.abs(item.intensity - preferences[PREFERENCE_TYPES.PACING]);
        break;
      case CONTENT_TYPES.REWARD:
        score = item.value * 0.5 + (1 - item.frequency === 'high' ? 0.5 : 
                                      item.frequency === 'medium' ? 0.3 : 0.2);
        break;
      case CONTENT_TYPES.PROPERTY:
        score = 1 - Math.abs(item.risk - preferences[PREFERENCE_TYPES.RISK_LEVEL]);
        break;
      case CONTENT_TYPES.TRADE:
        score = 1 - Math.abs(item.complexity - preferences[PREFERENCE_TYPES.COMPLEXITY]);
        break;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get learned adjustment for a preference
   * @param {string} playerId - Player identifier
   * @param {string} preferenceType - Preference type
   * @returns {number} Adjustment value
   */
  getLearnedAdjustment(playerId, preferenceType) {
    const history = this.learningHistory.get(playerId) || [];
    const relevantHistory = history.filter(h => h.preferenceType === preferenceType);
    
    if (relevantHistory.length === 0) return 0;

    // Calculate trend from recent history
    const recent = relevantHistory.slice(-10);
    const avgChange = recent.reduce((sum, h) => sum + (h.newValue - h.oldValue), 0) / recent.length;
    
    return avgChange * 0.2; // Dampen the adjustment
  }

  /**
   * Get content for a specific segment
   * @param {string} segment - Player segment
   * @param {string} contentType - Content type
   * @returns {Array} Content items for segment
   */
  getContentForSegment(segment, contentType) {
    const content = this.contentLibrary[contentType] || [];
    return content.filter(c => c.segment === segment);
  }

  /**
   * Clear preferences for a player
   * @param {string} playerId - Player identifier
   */
  clearPreferences(playerId) {
    this.playerPreferences.delete(playerId);
    this.learningHistory.delete(playerId);
  }
}

export { 
  PersonalizationEngine, 
  CONTENT_TYPES, 
  PREFERENCE_TYPES, 
  DEFAULT_PREFERENCES,
  SEGMENT_PREFERENCE_BASE 
};