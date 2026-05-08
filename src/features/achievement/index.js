// Achievement System - Main Export
export { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_DIFFICULTY, ACHIEVEMENT_STATUS, WEATHER_TYPES, WEATHER_MULTIPLIERS, TASK_CHAPTERS } from './achievementTypes';
export { ACHIEVEMENTS, getAchievementById, getAchievementsByCategory, getAchievementsByDifficulty, getTotalPossiblePoints, WEATHER_ACHIEVEMENTS } from './achievementData';
export { useAchievementStore, useWeather, useWeatherMultiplier, useUnlockedCount, useTotalPoints, useCompletionPercentage, useNextPopup } from './achievementStore';

// Daily Challenge System
export { useDailyChallengeStore, useDailyChallenges, useChallengeProgress, useAvailableRewards, processGameEventForChallenges } from './dailyChallengeStore';
export { DAILY_CHALLENGE_TEMPLATES, getDailyChallenges, getTodayString, getTimeUntilMidnight, CHALLENGE_TYPES, CHALLENGE_DIFFICULTY } from './dailyChallenges';

// UI Components
export { default as AchievementPopup } from './AchievementPopup';
export { default as TaskProgress } from './TaskProgress';
export { default as WeatherIndicator } from './WeatherIndicator';
export { default as Leaderboard } from './Leaderboard';
export { default as AchievementPanel } from './AchievementPanel';
export { default as DailyChallengeScreen } from './DailyChallengeScreen';
export { default as LeaderboardPanel } from './LeaderboardPanel';
