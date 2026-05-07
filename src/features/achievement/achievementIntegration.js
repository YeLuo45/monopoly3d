// Achievement System Integration with Game Store
// This module bridges the game events with the achievement system

import { useAchievementStore } from './achievementStore';
import { WEATHER_TYPES } from './achievementTypes';

// Track dice rolling for lucky dice achievements
let lastDiceValues = [0, 0];
let consecutiveSameDice = 0;

// Initialize achievement system for a new game
export function initAchievementTracking() {
  const achievementStore = useAchievementStore.getState();
  
  // Reset game progress tracking
  achievementStore.resetGameProgress();
  
  // Check time-based achievements
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 8) {
    achievementStore.triggerEvent('playedEarlyBird');
  }
  if (hour >= 0 && hour < 4) {
    achievementStore.triggerEvent('playedNightOwl');
  }
  
  // Check seasonal achievements (simplified - just check month)
  const month = new Date().getMonth();
  if (month === 0) { // January - Chinese New Year period
    achievementStore.triggerEvent('playedDuringNewYear');
  }
  
  // Initialize weather
  achievementStore.randomizeWeather();
}

// Called when a player rolls dice
export function onDiceRolled(values) {
  const achievementStore = useAchievementStore.getState();
  
  // Check for lucky dice (3 consecutive same values)
  if (values[0] === values[1] && lastDiceValues[0] === lastDiceValues[1] && values[0] === lastDiceValues[0]) {
    consecutiveSameDice++;
    if (consecutiveSameDice >= 2) { // 3 total including this one
      achievementStore.updateProgress({ luckyDiceStreak: 3 });
    }
  } else if (values[0] === values[1]) {
    consecutiveSameDice = 1;
  } else {
    consecutiveSameDice = 0;
  }
  
  lastDiceValues = [...values];
}

// Called when player passes Go
export function onPassGo() {
  const achievementStore = useAchievementStore.getState();
  achievementStore.triggerEvent('passedGo');
  achievementStore.incrementStat('moneyEarned', 200);
}

// Called when player escapes jail
export function onEscapeJail() {
  const achievementStore = useAchievementStore.getState();
  achievementStore.triggerEvent('escapedJail');
}

// Called when player buys a property
export function onPropertyBought(tileId, price) {
  const achievementStore = useAchievementStore.getState();
  achievementStore.incrementStat('propertiesBought');
  
  // Track max properties
  const newCount = (achievementStore.profileStats.propertiesBought || 0) + 1;
  if (newCount > (achievementStore.profileStats.maxProperties || 0)) {
    achievementStore.incrementStat('maxProperties', newCount - achievementStore.profileStats.maxProperties);
  }
  
  // Update achievement progress
  achievementStore.updateProgress({ propertiesBought: newCount });
}

// Called when player builds a house
export function onHouseBuilt() {
  const achievementStore = useAchievementStore.getState();
  achievementStore.incrementStat('housesBuilt');
}

// Called when player collects rent
export function onRentCollected(amount) {
  const achievementStore = useAchievementStore.getState();
  achievementStore.incrementStat('rentCollected', amount);
  
  // Track max rent
  const newTotal = (achievementStore.profileStats.rentCollected || 0) + amount;
  if (amount > (achievementStore.profileStats.maxRentCollected || 0)) {
    achievementStore.updateProgress({ maxRentCollectedThisGame: amount });
  }
}

// Called when player answers a question
export function onQuestionAnswered(category, correct, answerTime) {
  const achievementStore = useAchievementStore.getState();
  
  // Update category stats
  achievementStore.updateCategoryStats(category, correct);
  achievementStore.incrementStat('totalQuestionsAnswered');
  if (correct) {
    achievementStore.incrementStat('totalCorrectAnswers');
    achievementStore.recordCorrectAnswer(category);
  } else {
    achievementStore.recordWrongAnswer();
  }
  
  // Check for fast answer (< 10 seconds)
  if (correct && answerTime < 10) {
    achievementStore.triggerEvent('fastAnswer');
  }
  
  // Update money earned (correct +100, wrong -50, but we track positive)
  if (correct) {
    achievementStore.incrementStat('moneyEarned', 100);
  }
}

// Called when player visits a tile
export function onTileVisit(tileId) {
  const achievementStore = useAchievementStore.getState();
  const uniqueTiles = achievementStore.profileStats.uniqueTilesVisited || new Set();
  if (!uniqueTiles.has(tileId)) {
    uniqueTiles.add(tileId);
    achievementStore.syncProfileStats({ uniqueTilesVisited: uniqueTiles });
  }
}

// Called when player wins the game
export function onGameWin(rank, isRichest) {
  const achievementStore = useAchievementStore.getState();
  
  achievementStore.incrementStat('wins');
  achievementStore.incrementStat('gamesPlayed');
  
  if (isRichest) {
    achievementStore.triggerEvent('achievedPerfection');
  }
  
  // Check top 3 streak
  if (rank <= 3) {
    const currentStreak = achievementStore.currentProgress.topThreeStreak || 0;
    achievementStore.updateProgress({ topThreeStreak: currentStreak + 1 });
  }
}

// Called when game ends (any reason)
export function onGameEnd(playerRank) {
  const achievementStore = useAchievementStore.getState();
  
  // Increment games played
  achievementStore.incrementStat('gamesPlayed');
  
  // Final achievement check with complete game state
  const state = createAchievementState();
  achievementStore.checkAchievements(state);
}

// Called for multiplayer events
export function onMultiplayerEvent(eventType, data) {
  const achievementStore = useAchievementStore.getState();
  
  switch (eventType) {
    case 'host_room':
      achievementStore.incrementStat('roomsHosted');
      break;
    case 'join_room':
      achievementStore.incrementStat('multiplayerGames');
      break;
    case 'defeat_player':
      achievementStore.triggerEvent('defeatedAnotherPlayer');
      break;
    case 'friendly_match':
      achievementStore.incrementStat('friendlyMatches');
      break;
  }
}

// Called for editor events
export function onEditorEvent(eventType) {
  const achievementStore = useAchievementStore.getState();
  
  if (eventType === 'use_editor') {
    achievementStore.incrementStat('editorUses');
  } else if (eventType === 'play_custom_map') {
    achievementStore.triggerEvent('playedCustomMap');
  }
}

// Create a state object for achievement evaluation
export function createAchievementState() {
  const gameStore = window.__GAME_STORE__?.getState?.() || {};
  const achievementStore = useAchievementStore.getState();
  
  return {
    profile: {
      ...achievementStore.profileStats,
      gamesPlayed: achievementStore.profileStats.gamesPlayed || 0,
      wins: achievementStore.profileStats.wins || 0,
      totalQuestionsAnswered: achievementStore.profileStats.totalQuestionsAnswered || 0,
      propertiesBought: achievementStore.profileStats.propertiesBought || 0,
      maxProperties: achievementStore.profileStats.maxProperties || 0,
      maxMoneyEarned: achievementStore.profileStats.maxMoneyEarned || 0,
      maxRentCollected: achievementStore.profileStats.maxRentCollected || 0,
      rentCollected: achievementStore.profileStats.rentCollected || 0,
      housesBuilt: achievementStore.profileStats.housesBuilt || 0,
      multiplayerGames: achievementStore.profileStats.multiplayerGames || 0,
      roomsHosted: achievementStore.profileStats.roomsHosted || 0,
      editorUses: achievementStore.profileStats.editorUses || 0,
      uniqueTilesVisited: achievementStore.profileStats.uniqueTilesVisited?.size || 0,
      categoriesPlayed: Array.from(achievementStore.profileStats.categoriesPlayed || []),
      categoryStats: achievementStore.profileStats.categoryStats || {},
    },
    achievementProgress: {
      ...achievementStore.currentProgress,
      ...achievementStore.oneTimeTriggers,
      unlockedCount: Object.keys(achievementStore.unlockedAchievements).length,
    },
    justWonAsRicher: achievementStore.currentProgress.achievedPerfection,
  };
}

// Weather-specific bonus calculation
export function getWeatherBonus() {
  const achievementStore = useAchievementStore.getState();
  return achievementStore.getWeatherMultiplier();
}
