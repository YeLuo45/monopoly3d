/**
 * Adaptive Learning Engine
 * 
 * Provides personalized learning experiences by tracking player progress
 * and adapting difficulty based on performance.
 */

export class AdaptiveLearningEngine {
  constructor() {
    // Player profiles: { playerId -> LearningProfile }
    this.profiles = new Map();
    
    // Difficulty thresholds
    this.difficultyLevels = {
      BEGINNER: 1,
      ELEMENTARY: 2,
      INTERMEDIATE: 3,
      ADVANCED: 4,
      EXPERT: 5
    };
    
    // Performance history for adaptation
    this.performanceHistory = new Map();
    
    // Content recommendations cache
    this.recommendationCache = new Map();
  }

  /**
   * Learning profile structure for a player
   */
  createProfile(playerId) {
    if (this.profiles.has(playerId)) {
      return this.profiles.get(playerId);
    }
    
    const profile = {
      playerId,
      currentDifficulty: this.difficultyLevels.BEGINNER,
      completedLessons: [],
      quizScores: [],
      strengths: [],
      weaknesses: [],
      learningStyle: 'visual', // visual, auditory, kinesthetic
      progressRate: 0, // lessons per session
      lastActive: Date.now(),
      totalTimeSpent: 0,
      sessionCount: 0,
      masteredConcepts: [],
      activeConcepts: [],
      recommendedTopics: []
    };
    
    this.profiles.set(playerId, profile);
    return profile;
  }

  /**
   * Get player learning profile
   */
  getProfile(playerId) {
    if (!this.profiles.has(playerId)) {
      return this.createProfile(playerId);
    }
    return this.profiles.get(playerId);
  }

  /**
   * Get current difficulty level for a player
   */
  getDifficultyLevel(playerId) {
    const profile = this.getProfile(playerId);
    return profile.currentDifficulty;
  }

  /**
   * Adapt difficulty based on player performance
   * @param {string} playerId - Player identifier
   * @param {object} performance - Performance metrics { score, timeSpent, correctAnswers, totalQuestions }
   */
  adaptDifficulty(playerId, performance) {
    const profile = this.getProfile(playerId);
    
    // Store performance in history
    const history = this.performanceHistory.get(playerId) || [];
    history.push({
      ...performance,
      timestamp: Date.now(),
      difficulty: profile.currentDifficulty
    });
    this.performanceHistory.set(playerId, history);
    
    // Calculate average recent performance
    const recentCount = Math.min(5, history.length);
    const recentHistory = history.slice(-recentCount);
    const avgScore = recentHistory.reduce((sum, h) => sum + h.score, 0) / recentCount;
    
    // Adapt difficulty based on performance
    let newDifficulty = profile.currentDifficulty;
    
    if (avgScore >= 90 && recentCount >= 3) {
      // Excellent performance - increase difficulty
      newDifficulty = Math.min(profile.currentDifficulty + 1, this.difficultyLevels.EXPERT);
    } else if (avgScore >= 75 && recentCount >= 2) {
      // Good performance - maintain or slight increase
      newDifficulty = profile.currentDifficulty;
    } else if (avgScore < 50 && recentCount >= 2) {
      // Poor performance - decrease difficulty
      newDifficulty = Math.max(profile.currentDifficulty - 1, this.difficultyLevels.BEGINNER);
    }
    
    profile.currentDifficulty = newDifficulty;
    profile.lastActive = Date.now();
    
    // Update strengths and weaknesses based on performance
    this.updatePlayerStrengthsWeaknesses(playerId, performance);
    
    return {
      previousDifficulty: profile.currentDifficulty,
      newDifficulty: newDifficulty,
      reason: this.getAdaptationReason(avgScore, recentCount)
    };
  }

  /**
   * Get human-readable adaptation reason
   */
  getAdaptationReason(avgScore, sampleSize) {
    if (avgScore >= 90 && sampleSize >= 3) {
      return 'Excellent progress - advancing to higher difficulty';
    } else if (avgScore >= 75) {
      return 'Good progress - maintaining current difficulty';
    } else if (avgScore < 50 && sampleSize >= 2) {
      return 'Needs improvement - reducing difficulty for better understanding';
    }
    return 'Insufficient data for adaptation';
  }

  /**
   * Update player strengths and weaknesses based on performance
   */
  updatePlayerStrengthsWeaknesses(playerId, performance) {
    const profile = this.getProfile(playerId);
    
    // Assuming performance includes topic info
    const topic = performance.topic || 'general';
    const score = performance.score;
    
    if (score >= 80) {
      if (!profile.strengths.includes(topic)) {
        profile.strengths.push(topic);
        profile.weaknesses = profile.weaknesses.filter(w => w !== topic);
      }
    } else if (score < 50) {
      if (!profile.weaknesses.includes(topic)) {
        profile.weaknesses.push(topic);
        profile.strengths = profile.strengths.filter(s => s !== topic);
      }
    }
  }

  /**
   * Recommend learning content for a player
   * @param {string} playerId - Player identifier
   * @param {string} topic - Topic to learn about
   */
  recommendContent(playerId, topic) {
    const profile = this.getProfile(playerId);
    
    // Check if player has already mastered this topic
    if (profile.masteredConcepts.includes(topic)) {
      return {
        recommendations: [],
        message: 'You have already mastered this topic!',
        nextChallenge: this.getNextUnmasteredTopic(playerId)
      };
    }
    
    // Generate recommendations based on difficulty and player profile
    const difficultyName = this.getDifficultyName(profile.currentDifficulty);
    
    const recommendations = [
      {
        contentId: `${topic}_${difficultyName}_basics`,
        type: 'lesson',
        difficulty: profile.currentDifficulty,
        estimatedTime: 10,
        relevance: this.calculateRelevance(playerId, topic)
      },
      {
        contentId: `${topic}_${difficultyName}_examples`,
        type: 'examples',
        difficulty: profile.currentDifficulty,
        estimatedTime: 15,
        relevance: this.calculateRelevance(playerId, topic)
      },
      {
        contentId: `${topic}_quiz_${difficultyName}`,
        type: 'quiz',
        difficulty: profile.currentDifficulty,
        estimatedTime: 5,
        relevance: this.calculateRelevance(playerId, topic)
      }
    ];
    
    // Sort by relevance
    recommendations.sort((a, b) => b.relevance - a.relevance);
    
    return {
      recommendations,
      playerLevel: difficultyName,
      message: `Recommended content for learning ${topic}`
    };
  }

  /**
   * Calculate content relevance for player
   */
  calculateRelevance(playerId, topic) {
    const profile = this.getProfile(playerId);
    
    // Higher relevance for weak areas
    if (profile.weaknesses.includes(topic)) {
      return 0.9;
    }
    
    // Medium relevance for active learning topics
    if (profile.activeConcepts.includes(topic)) {
      return 0.7;
    }
    
    // Lower relevance for already mastered topics
    if (profile.masteredConcepts.includes(topic)) {
      return 0.1;
    }
    
    return 0.5;
  }

  /**
   * Get next unmastered topic for continued learning
   */
  getNextUnmasteredTopic(playerId) {
    const profile = this.getProfile(playerId);
    const allTopics = ['property_management', 'trading', 'investment', 'auction_strategy', 'financial_planning'];
    
    for (const topic of allTopics) {
      if (!profile.masteredConcepts.includes(topic)) {
        return topic;
      }
    }
    
    return null;
  }

  /**
   * Get next lesson for a player based on their progress
   */
  getNextLesson(playerId) {
    const profile = this.getProfile(playerId);
    
    // Find next topic to learn based on weak areas
    const nextTopic = profile.weaknesses.length > 0 
      ? profile.weaknesses[0] 
      : this.getNextUnmasteredTopic(playerId);
    
    if (!nextTopic) {
      return {
        contentId: null,
        message: 'Congratulations! You have completed all available lessons.',
        type: 'completion'
      };
    }
    
    // Generate appropriate lesson based on difficulty
    const difficultyName = this.getDifficultyName(profile.currentDifficulty);
    
    return {
      contentId: `${nextTopic}_${difficultyName}_lesson`,
      topic: nextTopic,
      difficulty: profile.currentDifficulty,
      difficultyName: difficultyName,
      type: 'lesson',
      estimatedTime: 10 + (profile.currentDifficulty * 5),
      objective: this.getLessonObjective(nextTopic, profile.currentDifficulty)
    };
  }

  /**
   * Get difficulty name from level
   */
  getDifficultyName(level) {
    const names = Object.keys(this.difficultyLevels);
    for (const name of names) {
      if (this.difficultyLevels[name] === level) {
        return name;
      }
    }
    return 'BEGINNER';
  }

  /**
   * Get lesson objective based on topic and difficulty
   */
  getLessonObjective(topic, difficulty) {
    const objectives = {
      property_management: {
        1: 'Learn basic property buying',
        2: 'Understand rent collection',
        3: 'Master property trading basics',
        4: 'Optimize property portfolio',
        5: 'Advanced negotiation strategies'
      },
      trading: {
        1: 'Learn trade basics',
        2: 'Understand fair value',
        3: 'Master trade timing',
        4: 'Complex multi-party trades',
        5: 'Strategic trade exploitation'
      },
      investment: {
        1: 'Basic investment concepts',
        2: 'Portfolio building',
        3: 'Risk assessment',
        4: 'Investment optimization',
        5: 'Market manipulation strategies'
      }
    };
    
    return objectives[topic]?.[difficulty] || `Learn ${topic} at level ${difficulty}`;
  }

  /**
   * Mark a concept as mastered for a player
   */
  markConceptMastered(playerId, conceptId) {
    const profile = this.getProfile(playerId);
    
    if (!profile.masteredConcepts.includes(conceptId)) {
      profile.masteredConcepts.push(conceptId);
    }
    
    // Remove from active if present
    profile.activeConcepts = profile.activeConcepts.filter(c => c !== conceptId);
    
    return profile.masteredConcepts;
  }

  /**
   * Record lesson completion
   */
  recordLessonCompletion(playerId, lessonId, score) {
    const profile = this.getProfile(playerId);
    
    profile.completedLessons.push({
      lessonId,
      score,
      completedAt: Date.now()
    });
    
    profile.sessionCount++;
    profile.lastActive = Date.now();
    
    // Update progress rate
    const recentLessons = profile.completedLessons.slice(-10);
    profile.progressRate = recentLessons.length / 10;
    
    return profile;
  }

  /**
   * Get learning statistics for a player
   */
  getLearningStats(playerId) {
    const profile = this.getProfile(playerId);
    const performanceHistory = this.performanceHistory.get(playerId) || [];
    
    return {
      playerId,
      currentDifficulty: profile.currentDifficulty,
      difficultyName: this.getDifficultyName(profile.currentDifficulty),
      totalLessons: profile.completedLessons.length,
      masteredConcepts: profile.masteredConcepts.length,
      averageScore: profile.quizScores.length > 0 
        ? profile.quizScores.reduce((a, b) => a + b, 0) / profile.quizScores.length 
        : 0,
      strengths: profile.strengths,
      weaknesses: profile.weaknesses,
      totalTimeSpent: profile.totalTimeSpent,
      sessionCount: profile.sessionCount,
      recentPerformance: performanceHistory.slice(-5)
    };
  }

  /**
   * Reset player progress
   */
  resetProgress(playerId) {
    const profile = this.getProfile(playerId);
    
    profile.currentDifficulty = this.difficultyLevels.BEGINNER;
    profile.completedLessons = [];
    profile.quizScores = [];
    profile.masteredConcepts = [];
    profile.activeConcepts = [];
    profile.sessionCount = 0;
    profile.totalTimeSpent = 0;
    
    this.performanceHistory.delete(playerId);
    this.recommendationCache.delete(playerId);
    
    return profile;
  }
}