/**
 * LearningCoach - AI-powered learning coach that mentors players
 * 
 * Provides coaching sessions, tips generation, and lesson tracking
 * to help players improve their Monopoly strategy.
 */

export const LESSON_IDS = {
  RENT_BASICS: 'rent_basics',
  MONOPOLY_STRATEGY: 'monopoly_strategy',
  TRADE_NEGOTIATION: 'trade_negotiation',
  RISK_MANAGEMENT: 'risk_management',
  ENDGAME_TACTICS: 'endgame_tactics',
};

// Predefined lesson definitions
const LESSONS = {
  [LESSON_IDS.RENT_BASICS]: {
    id: LESSON_IDS.RENT_BASICS,
    title: 'Rent Basics',
    description: 'Understand how rent is calculated and when to pay more',
    tips: [
      'Rent increases with houses and hotels',
      'Landing on a monopoly without houses is cheaper',
      'Always check the rent chart before buying properties',
    ],
  },
  [LESSON_IDS.MONOPOLY_STRATEGY]: {
    id: LESSON_IDS.MONOPOLY_STRATEGY,
    title: 'Monopoly Strategy',
    description: 'Complete color groups to maximize property value',
    tips: [
      'Focus on one color group at a time',
      'Having a monopoly doubles rent on unmortgaged properties',
      'Build houses evenly across your monopolies',
    ],
  },
  [LESSON_IDS.TRADE_NEGOTIATION]: {
    id: LESSON_IDS.TRADE_NEGOTIATION,
    title: 'Trade Negotiation',
    description: 'Learn fair trade principles and how to negotiate',
    tips: [
      'Always trade to complete a color group',
      'Value properties based on rent potential, not purchase price',
      'Don\'t trade away properties that complete your opponent\'s monopolies',
    ],
  },
  [LESSON_IDS.RISK_MANAGEMENT]: {
    id: LESSON_IDS.RISK_MANAGEMENT,
    title: 'Risk Management',
    description: 'When to play it safe and when to take risks',
    tips: [
      'Keep enough cash for rent - aim for 10x the highest rent you might pay',
      'Mortgaging properties can save you from bankruptcy',
      'Don\'t overbuild - houses on low-rent properties waste money',
    ],
  },
  [LESSON_IDS.ENDGAME_TACTICS]: {
    id: LESSON_IDS.ENDGAME_TACTICS,
    title: 'Endgame Tactics',
    description: 'Late-game strategy to secure victory',
    tips: [
      'In late game, focus on maximizing rent income',
      'Trade strategically to break opponent monopolies',
      'Position yourself to land on opponents\' properties',
    ],
  },
};

// Tip templates by category
const TIP_TEMPLATES = {
  property: [
    'Consider buying properties with high rent potential',
    'Color groups with 3 properties are easier to complete',
    'Don\'t buy properties you can\'t afford to develop',
  ],
  rent: [
    'When you have a monopoly, consider building houses',
    'Rent on railroads scales with how many you own',
    'Utilities have variable rent based on dice rolls',
  ],
  trade: [
    'Only trade if it helps complete a color group',
    'High-value properties are better than cash for trading',
    'Watch what properties other players are collecting',
  ],
  money: [
    'Keep some cash reserve for unexpected expenses',
    'Mortgaging property can provide quick cash',
    'Consider the opportunity cost before buying',
  ],
  position: [
    'Some board positions are more valuable than others',
    'Track where other players are likely to land',
    'Position matters more in late game',
  ],
};

export class LearningCoach {
  /**
   * @param {object} memoryLayer - AI memory layer for tracking player progress
   * @param {object} strategyAdvisor - Strategy advisor for generating tips
   */
  constructor(memoryLayer, strategyAdvisor) {
    this.memoryLayer = memoryLayer;
    this.strategyAdvisor = strategyAdvisor;
    
    // Coaching state per player
    this.coachingSessions = {};  // playerId -> { startTime, lessonProgress, stats }
    this.tipHistory = {};       // playerId -> [{ tip, timestamp, viewed }]
  }

  /**
   * Start a new coaching session for a player
   * @param {string} playerId - Player ID
   */
  startCoachSession(playerId) {
    if (!this.coachingSessions[playerId]) {
      this.coachingSessions[playerId] = {
        startTime: Date.now(),
        lessonProgress: this._initializeLessonProgress(),
        stats: {
          tipsGiven: 0,
          lessonsCompleted: 0,
          sessionsStarted: 0,
        },
      };
    }
    this.coachingSessions[playerId].stats.sessionsStarted++;
    return this.coachingSessions[playerId];
  }

  /**
   * End coaching session and record results
   * @param {string} playerId - Player ID
   * @returns {object} Session summary
   */
  endCoachSession(playerId) {
    const session = this.coachingSessions[playerId];
    if (!session) {
      return { success: false, message: 'No active session' };
    }

    const duration = Date.now() - session.startTime;
    const summary = {
      duration,
      tipsGiven: session.stats.tipsGiven,
      lessonsCompleted: session.stats.lessonsCompleted,
      lessonProgress: this.getLessonProgress(playerId),
    };

    // Record session to memory
    if (this.memoryLayer) {
      this.memoryLayer.ingest('coach_session_ended', {
        playerId,
        duration,
        ...summary,
      });
    }

    return summary;
  }

  /**
   * Get a single tip for a player based on game state
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Tip with priority and category
   */
  getTip(playerId, gameState) {
    const category = this._analyzeGameState(gameState, playerId);
    const tip = this._generateTip(playerId, gameState, category);
    
    // Record tip in history
    if (!this.tipHistory[playerId]) {
      this.tipHistory[playerId] = [];
    }
    this.tipHistory[playerId].push({
      ...tip,
      timestamp: Date.now(),
      viewed: false,
    });
    
    // Update stats
    if (this.coachingSessions[playerId]) {
      this.coachingSessions[playerId].stats.tipsGiven++;
    }

    return tip;
  }

  /**
   * Get multiple tips for a player
   * @param {string} playerId - Player ID
   * @param {number} count - Number of tips to return
   * @returns {Array<object>} Array of tips
   */
  getTips(playerId, count = 3) {
    const tips = [];
    const categories = ['property', 'rent', 'trade', 'money', 'position'];
    const gameState = this._getCurrentGameState(playerId);

    for (let i = 0; i < count; i++) {
      const category = categories[i % categories.length];
      const tip = this._generateTip(playerId, gameState, category);
      tips.push(tip);
    }

    return tips;
  }

  /**
   * Get lesson progress for a player
   * @param {string} playerId - Player ID
   * @returns {object} Lesson progress with completed, inProgress, locked
   */
  getLessonProgress(playerId) {
    const session = this.coachingSessions[playerId];
    const lessonProgress = session?.lessonProgress || this._initializeLessonProgress();

    const completed = [];
    const inProgress = [];
    const locked = [];

    Object.values(LESSONS).forEach(lesson => {
      const progress = lessonProgress[lesson.id];
      if (progress?.completed) {
        completed.push(lesson);
      } else if (progress?.started) {
        inProgress.push({ ...lesson, progress: progress.steps });
      } else {
        locked.push(lesson);
      }
    });

    return { completed, inProgress, locked };
  }

  /**
   * Mark a lesson as complete for a player
   * @param {string} playerId - Player ID
   * @param {string} lessonId - Lesson ID
   */
  completeLesson(playerId, lessonId) {
    if (!LESSONS[lessonId]) {
      return { success: false, message: 'Invalid lesson ID' };
    }

    if (!this.coachingSessions[playerId]) {
      this.startCoachSession(playerId);
    }

    const session = this.coachingSessions[playerId];
    if (!session.lessonProgress[lessonId]) {
      session.lessonProgress[lessonId] = { started: true, steps: 0 };
    }
    session.lessonProgress[lessonId].completed = true;
    session.lessonProgress[lessonId].completedAt = Date.now();
    session.stats.lessonsCompleted++;

    // Record completion in memory
    if (this.memoryLayer) {
      this.memoryLayer.ingest('lesson_completed', {
        playerId,
        lessonId,
        timestamp: Date.now(),
      });
    }

    return { success: true, lesson: LESSONS[lessonId] };
  }

  /**
   * Get all available lessons
   * @returns {Array<object>} All lessons
   */
  getAllLessons() {
    return Object.values(LESSONS);
  }

  // --- Private helpers ---

  _initializeLessonProgress() {
    const progress = {};
    Object.keys(LESSONS).forEach(id => {
      progress[id] = { started: false, steps: 0 };
    });
    return progress;
  }

  _analyzeGameState(gameState, playerId) {
    if (!gameState) return 'property';
    
    const turn = gameState.turn || 1;
    const player = gameState.players?.find(p => p.id === playerId);
    const money = player?.money || 0;
    const propertyCount = player?.properties?.length || 0;

    // Determine primary concern based on game state
    if (turn <= 5) {
      return propertyCount < 2 ? 'property' : 'money';
    } else if (turn <= 15) {
      return 'trade';
    } else {
      return 'position';
    }
  }

  _generateTip(playerId, gameState, category) {
    // Check tip history to avoid repetition
    const recentTips = this.tipHistory[playerId]?.slice(-5) || [];
    const templates = TIP_TEMPLATES[category] || TIP_TEMPLATES.property;
    
    // Find a tip not recently used
    let selectedTip = templates[0];
    for (const template of templates) {
      if (!recentTips.some(t => t.tip === template)) {
        selectedTip = template;
        break;
      }
    }

    // Customize based on game state
    let priority = 'medium';
    if (gameState?.turn <= 5) {
      priority = 'high';
    } else if (gameState?.turn > 15) {
      priority = 'low';
    }

    return {
      tip: selectedTip,
      priority,
      category,
    };
  }

  _getCurrentGameState(playerId) {
    // Could retrieve from memory layer if needed
    return null;
  }
}

export default LearningCoach;