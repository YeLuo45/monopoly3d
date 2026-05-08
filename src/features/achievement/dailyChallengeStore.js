import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  getDailyChallenges, 
  getTodayString, 
  getTimeUntilMidnight,
  CHALLENGE_TYPES,
  CHALLENGE_DIFFICULTY,
} from './dailyChallenges';

// Initial state
const initialDailyChallengeState = {
  // Daily challenges for current day
  dailyChallenges: [],
  
  // Challenge progress: { challengeId: { progress, completed, completedAt } }
  challengeProgress: {},
  
  // Last refresh date (to check if we need new daily challenges)
  lastRefreshDate: null,
  
  // Loading state
  isLoading: false,
  
  // Error state
  error: null,
  
  // Available points to claim
  availableRewardPoints: 0,
};

// Get fresh daily challenges
function fetchDailyChallenges(dateString) {
  const challenges = getDailyChallenges(new Date(dateString));
  return challenges.map(c => ({
    ...c,
    progress: 0,
    completed: false,
    completedAt: null,
  }));
}

export const useDailyChallengeStore = create(
  persist(
    (set, get) => ({
      ...initialDailyChallengeState,

      // ==================== INITIALIZATION ====================

      // Initialize daily challenges for today
      initializeDailyChallenges: () => {
        const today = getTodayString();
        const { lastRefreshDate, dailyChallenges } = get();
        
        // Check if we already have today's challenges
        if (lastRefreshDate === today && dailyChallenges.length > 0) {
          return dailyChallenges;
        }
        
        // Get new challenges for today
        const newChallenges = fetchDailyChallenges(today);
        
        set({
          dailyChallenges: newChallenges,
          lastRefreshDate: today,
        });
        
        return newChallenges;
      },

      // Check and refresh challenges if needed (call on app start)
      checkAndRefreshChallenges: () => {
        const today = getTodayString();
        const { lastRefreshDate } = get();
        
        if (lastRefreshDate !== today) {
          // Day changed, get new challenges but preserve progress of completed ones
          const newChallenges = fetchDailyChallenges(today);
          const { challengeProgress } = get();
          
          // Update progress - check if any challenges were completed yesterday
          // For new day, we start fresh
          set({
            dailyChallenges: newChallenges,
            lastRefreshDate: today,
            challengeProgress: {}, // Reset progress for new day
            availableRewardPoints: 0,
          });
        }
        
        return get().dailyChallenges;
      },

      // ==================== PROGRESS TRACKING ====================

      // Update challenge progress based on game events
      updateChallengeProgress: (eventType, value) => {
        const state = get();
        const { dailyChallenges, challengeProgress } = state;
        
        // Find challenges that match this event type
        const matchingChallenges = dailyChallenges.filter(c => 
          !c.completed && c.type === eventType
        );
        
        if (matchingChallenges.length === 0) return;
        
        set(s => {
          const newProgress = { ...s.challengeProgress };
          let newChallenges = [...s.dailyChallenges];
          let newAvailablePoints = s.availableRewardPoints;
          
          matchingChallenges.forEach(challenge => {
            const currentProgress = newProgress[challenge.id]?.progress || 0;
            const newProgressValue = currentProgress + (value || 1);
            
            newProgress[challenge.id] = {
              progress: newProgressValue,
              completed: newProgressValue >= challenge.target,
              completedAt: newProgressValue >= challenge.target ? Date.now() : null,
            };
            
            // Check if just completed
            if (newProgressValue >= challenge.target && !s.challengeProgress[challenge.id]?.completed) {
              newAvailablePoints += challenge.reward;
              
              // Update challenge in array
              const challengeIndex = newChallenges.findIndex(c => c.id === challenge.id);
              if (challengeIndex >= 0) {
                newChallenges[challengeIndex] = {
                  ...newChallenges[challengeIndex],
                  progress: newProgressValue,
                  completed: true,
                  completedAt: Date.now(),
                };
              }
            }
          });
          
          return {
            challengeProgress: newProgress,
            dailyChallenges: newChallenges,
            availableRewardPoints: newAvailablePoints,
          };
        });
      },

      // ==================== CHALLENGE COMPLETION ====================

      // Get challenge completion status
      getChallengeStatus: (challengeId) => {
        const { challengeProgress } = get();
        return challengeProgress[challengeId] || { progress: 0, completed: false };
      },

      // Check if all challenges are completed
      areAllChallengesCompleted: () => {
        const { dailyChallenges } = get();
        return dailyChallenges.every(c => c.completed);
      },

      // Get completion percentage
      getCompletionPercentage: () => {
        const { dailyChallenges } = get();
        if (dailyChallenges.length === 0) return 0;
        const completed = dailyChallenges.filter(c => c.completed).length;
        return Math.round((completed / dailyChallenges.length) * 100);
      },

      // ==================== REWARDS ====================

      // Claim available rewards
      claimRewards: () => {
        const { availableRewardPoints } = get();
        if (availableRewardPoints <= 0) return 0;
        
        const reward = availableRewardPoints;
        set({ availableRewardPoints: 0 });
        
        return reward;
      },

      // Get total available rewards
      getTotalAvailableRewards: () => {
        return get().availableRewardPoints;
      },

      // ==================== STATS ====================

      // Get current stats for a specific challenge type
      getStats: () => {
        const state = get();
        return {
          totalChallenges: state.dailyChallenges.length,
          completedChallenges: state.dailyChallenges.filter(c => c.completed).length,
          totalRewards: state.availableRewardPoints,
          lastRefreshDate: state.lastRefreshDate,
        };
      },

      // Get challenges by difficulty
      getChallengesByDifficulty: (difficulty) => {
        const { dailyChallenges } = get();
        return dailyChallenges.filter(c => c.difficulty === difficulty);
      },

      // Get time until next refresh (in ms)
      getTimeUntilRefresh: () => {
        return getTimeUntilMidnight();
      },

      // ==================== RESET ====================

      // Reset for testing
      resetDailyChallenges: () => {
        const today = getTodayString();
        set({
          ...initialDailyChallengeState,
          lastRefreshDate: today,
          dailyChallenges: fetchDailyChallenges(today),
        });
      },
    }),
    {
      name: 'monopoly3d_daily_challenges',
      partialize: (state) => ({
        challengeProgress: state.challengeProgress,
        lastRefreshDate: state.lastRefreshDate,
        availableRewardPoints: state.availableRewardPoints,
      }),
    }
  )
);

// ==================== EVENT INTEGRATION ====================
// Helper to process game events and update challenge progress

export function processGameEventForChallenges(eventType, value) {
  const store = useDailyChallengeStore.getState();
  
  switch (eventType) {
    case 'correct_answer':
      store.updateChallengeProgress(CHALLENGE_TYPES.ANSWER_CORRECT, 1);
      break;
      
    case 'wrong_answer':
      // Wrong answer doesn't count toward progress
      break;
      
    case 'property_bought':
      store.updateChallengeProgress(CHALLENGE_TYPES.PROPERTY_BUY, 1);
      break;
      
    case 'rent_collected':
      store.updateChallengeProgress(CHALLENGE_TYPES.RENT_COLLECT, value);
      break;
      
    case 'correct_streak':
      // This updates the streak count
      store.updateChallengeProgress(CHALLENGE_TYPES.CORRECT_STREAK, 1);
      break;
      
    case 'game_won':
      store.updateChallengeProgress(CHALLENGE_TYPES.WIN_GAME, 1);
      break;
      
    case 'passed_go':
      store.updateChallengeProgress(CHALLENGE_TYPES.PASS_GO, 1);
      break;
      
    case 'escaped_jail':
      store.updateChallengeProgress(CHALLENGE_TYPES.ESCAPE_JAIL, 1);
      break;
      
    case 'avoided_bankruptcy':
      store.updateChallengeProgress(CHALLENGE_TYPES.AVOID_BANKRUPTCY, 1);
      break;
      
    default:
      break;
  }
}

// Selector hooks for performance
export const useDailyChallenges = () => useDailyChallengeStore(s => s.dailyChallenges);
export const useChallengeProgress = (challengeId) => useDailyChallengeStore(s => s.challengeProgress[challengeId]);
export const useAvailableRewards = () => useDailyChallengeStore(s => s.availableRewardPoints);
export const useCompletionPercentage = () => useDailyChallengeStore(s => s.getCompletionPercentage());