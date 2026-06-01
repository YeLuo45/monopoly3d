/**
 * CoachUI - Plain data factory for coach UI components
 * 
 * Creates UI-friendly data structures from LearningCoach and game state
 * for rendering coach tips, lessons, and encouragement messages.
 */

/**
 * Create coach UI data for a player
 * @param {object} coach - LearningCoach instance
 * @param {string} playerId - Player ID
 * @param {object} gameState - Current game state
 * @returns {object} UI data structure
 */
export function createCoachData(coach, playerId, gameState) {
  if (!coach || !playerId) {
    return _getDefaultCoachData();
  }

  // Get tips
  const tips = coach.getTips(playerId, 3);

  // Get lesson progress
  const lessonProgress = coach.getLessonProgress(playerId);

  // Generate encouragement
  const encouragement = _generateEncouragement(coach, playerId, gameState);

  // Calculate next milestone
  const nextMilestone = _calculateNextMilestone(coach, playerId, lessonProgress);

  // Format lessons for UI
  const lessons = _formatLessonsForUI(lessonProgress);

  return {
    tips: tips.map(tip => ({
      text: tip.tip,
      priority: tip.priority,
      category: tip.category,
    })),
    lessons,
    encouragement,
    nextMilestone,
    sessionActive: !!coach.coachingSessions[playerId],
  };
}

/**
 * Create a single coach tip for display
 * @param {object} coach - LearningCoach instance
 * @param {string} playerId - Player ID
 * @param {object} gameState - Current game state
 * @returns {object} Formatted tip
 */
export function createTipData(coach, playerId, gameState) {
  if (!coach || !playerId) {
    return { text: 'Keep learning!', priority: 'medium', category: 'general' };
  }

  const tip = coach.getTip(playerId, gameState);
  return {
    text: tip.tip,
    priority: tip.priority,
    category: tip.category,
  };
}

/**
 * Create lesson card data for UI
 * @param {object} coach - LearningCoach instance
 * @param {string} playerId - Player ID
 * @param {string} lessonId - Lesson ID
 * @returns {object} Lesson card data
 */
export function createLessonCardData(coach, playerId, lessonId) {
  const allLessons = coach.getAllLessons();
  const lesson = allLessons.find(l => l.id === lessonId);
  const progress = coach.getLessonProgress(playerId);

  if (!lesson) {
    return null;
  }

  const status = _getLessonStatus(lesson.id, progress);
  const progressSteps = progress.inProgress.find(l => l.id === lessonId)?.progress || 0;

  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    status,
    tips: lesson.tips,
    progressSteps,
    totalSteps: lesson.tips?.length || 3,
  };
}

/**
 * Get encouragement message based on player performance
 * @param {object} coach - LearningCoach instance
 * @param {string} playerId - Player ID
 * @param {object} gameState - Current game state
 * @returns {string} Encouragement message
 */
export function getEncouragement(coach, playerId, gameState) {
  return _generateEncouragement(coach, playerId, gameState);
}

// --- Private helpers ---

function _getDefaultCoachData() {
  return {
    tips: [
      { text: 'Welcome to the game!', priority: 'high', category: 'welcome' },
    ],
    lessons: {
      completed: [],
      inProgress: [],
      locked: [],
    },
    encouragement: 'Good luck!',
    nextMilestone: {
      type: 'first_lesson',
      description: 'Complete your first lesson',
      target: 1,
      current: 0,
    },
    sessionActive: false,
  };
}

function _generateEncouragement(coach, playerId, gameState) {
  const messages = {
    early: {
      positive: [
        'Great start! Keep acquiring properties.',
        'You\'re building a strong foundation!',
        'Excellent property selections so far.',
      ],
      neutral: [
        'Focus on completing color groups.',
        'Remember to save some cash for rent.',
        'Track which properties other players need.',
      ],
      needsHelp: [
        'Consider buying more properties early.',
        'Look for opportunities to complete monopolies.',
        'Ask the coach for tips anytime!',
      ],
    },
    mid: {
      positive: [
        'You\'re doing great! Keep the momentum.',
        'Smart trading strategy!',
        'Your property portfolio is growing well.',
      ],
      neutral: [
        'Time to think about building houses.',
        'Consider trading for properties you need.',
        'Watch your cash flow carefully.',
      ],
      needsHelp: [
        'Focus on completing one color group.',
        'Don\'t be afraid to make strategic trades.',
        'Keep enough money for unexpected expenses.',
      ],
    },
    late: {
      positive: [
        'Excellent endgame positioning!',
        'You\'re in a strong position for victory.',
        'Great strategic thinking throughout!',
      ],
      neutral: [
        'Make every move count in late game.',
        'Position yourself to land on weak opponents.',
        'Protect your monopolies.',
      ],
      needsHelp: [
        'Focus on maximizing rent income.',
        'Trade strategically to break opponent monopolies.',
        'Stay in the game - anything can happen!',
      ],
    },
  };

  // Determine game phase and player status
  const turn = gameState?.turn || 1;
  const phase = turn <= 5 ? 'early' : turn <= 15 ? 'mid' : 'late';
  
  // Simple heuristics - in real implementation, would use actual player data
  const session = coach?.coachingSessions?.[playerId];
  const lessonsCompleted = session?.stats?.lessonsCompleted || 0;
  const tipsGiven = session?.stats?.tipsGiven || 0;

  let category;
  if (lessonsCompleted >= 3 && tipsGiven >= 5) {
    category = 'positive';
  } else if (lessonsCompleted >= 1 || tipsGiven >= 2) {
    category = 'neutral';
  } else {
    category = 'needsHelp';
  }

  const phaseMessages = messages[phase][category];
  return phaseMessages[Math.floor(Math.random() * phaseMessages.length)];
}

function _calculateNextMilestone(coach, playerId, lessonProgress) {
  const allLessons = coach?.getAllLessons?.() || [];
  
  // Find next incomplete lesson
  const nextLesson = allLessons.find(l => {
    return !lessonProgress.completed.some(c => c.id === l.id);
  });

  if (!nextLesson) {
    return {
      type: 'all_complete',
      description: 'All lessons completed!',
      target: allLessons.length,
      current: allLessons.length,
    };
  }

  // Count how many lessons completed
  const completedCount = lessonProgress.completed?.length || 0;

  return {
    type: 'complete_lesson',
    lessonId: nextLesson.id,
    description: `Complete "${nextLesson.title}"`,
    target: completedCount + 1,
    current: completedCount,
    totalLessons: allLessons.length,
  };
}

function _formatLessonsForUI(lessonProgress) {
  return {
    completed: (lessonProgress.completed || []).map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      status: 'completed',
    })),
    inProgress: (lessonProgress.inProgress || []).map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      status: 'in_progress',
      progress: lesson.progress || 0,
    })),
    locked: (lessonProgress.locked || []).map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      status: 'locked',
    })),
  };
}

function _getLessonStatus(lessonId, lessonProgress) {
  if (lessonProgress.completed?.some(l => l.id === lessonId)) {
    return 'completed';
  }
  if (lessonProgress.inProgress?.some(l => l.id === lessonId)) {
    return 'in_progress';
  }
  if (lessonProgress.locked?.some(l => l.id === lessonId)) {
    return 'locked';
  }
  return 'available';
}

export default {
  createCoachData,
  createTipData,
  createLessonCardData,
  getEncouragement,
};