import { create } from 'zustand';
import { BOARD_CONFIG, BOARD_SIZE, STARTING_MONEY, MAX_ROUNDS, QUESTION_TILE_IDS, TILE_TYPES } from './boardConfig';
import { rollDice, getDiceResult } from './dice';
import { AI_DIFFICULTY, AI_PERSONALITY, getDefaultPersonality, getPersonalityNames, chooseAIAction, getAdaptiveDifficulty } from './aiBrain';
import { THEMES } from './themes';
import { eventBus } from './eventBus';
import { GameReplay } from './hooks/gameReplay';
import { RuleEngine } from './hooks/ruleEngine';

// Achievement System Integration
import {
  initAchievementTracking,
  onDiceRolled,
  onPassGo,
  onEscapeJail,
  onPropertyBought,
  onHouseBuilt,
  onRentCollected,
  onQuestionAnswered,
  onTileVisit,
  onGameWin,
  onGameEnd,
  onMultiplayerEvent,
  onEditorEvent,
  getWeatherBonus,
  createAchievementState,
} from '../features/achievement/achievementIntegration';
import { useAchievementStore } from '../features/achievement/achievementStore';

// Game Replay System - Auto-record games
const gameReplay = new GameReplay(eventBus, 1000);

// Rule Engine - Declarative rules for game events
const ruleEngine = new RuleEngine(eventBus, null);

// Rule Engine game rules - fire game_alert events when triggered
function setupGameRules() {
  // Consecutive turns detection - alert when same player takes 3+ consecutive turns
  ruleEngine.addRule({
    event: 'turn_change',
    condition: { playerId: null, threshold: 3 },
    action: (data) => {
      eventBus.publish('game_alert', {
        type: 'consecutive_turns',
        playerId: data.playerId,
        message: `玩家 ${data.playerId} 已连续回合过多！`,
        consecutiveCount: data.consecutiveCount,
      });
    },
    ruleType: 'consecutive_turns',
    priority: 5,
  });

  // Rent overload warning - alert when rent > 50% of player money
  ruleEngine.addRule({
    event: 'rent_paid',
    condition: { playerId: null },
    action: (data) => {
      const rent = data.amount || 0;
      const playerMoney = data.playerMoney || 0;
      if (playerMoney > 0 && rent > playerMoney * 0.5) {
        eventBus.publish('game_alert', {
          type: 'rent_overload',
          playerId: data.playerId,
          message: `租金警告：${rent}超过玩家资产50%！`,
          rent,
          playerMoney,
        });
      }
    },
    ruleType: 'rent_overload',
    priority: 5,
  });

  // Property monopoly alerts - alert when player owns 3+ properties of same color group
  ruleEngine.addRule({
    event: 'property_purchase',
    condition: { playerId: null, threshold: 3 },
    action: (data) => {
      // Check if player has a monopoly (all properties of a color group)
      eventBus.publish('game_alert', {
        type: 'monopoly_progress',
        playerId: data.playerId,
        message: `玩家 ${data.playerId} 房产数量达到 ${data.propertyCount}！`,
        propertyCount: data.propertyCount,
      });
    },
    ruleType: 'property_threshold',
    priority: 5,
  });
}

// Initialize game rules
setupGameRules();

// Auto-start recording on game_start, stop on game_end
eventBus.subscribe('game_start', (event) => {
  const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  gameReplay.startRecording(gameId);
});

eventBus.subscribe('game_end', () => {
  gameReplay.stopRecording();
});

const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
const AI_NAMES = ['小智', '小慧', '小能'];
const PIECE_NAMES = ['小汽车', '小狗狗', '小猫咪', '陀螺', '奥特曼', '皮卡丘', '哆啦A梦'];

function createPlayer(id, name, isAI = false, color = null, personality = null) {
  return {
    id,
    name,
    isAI,
    personality, // AI personality type (aggressive/conservative/balanced)
    color: color || PLAYER_COLORS[id % 4],
    money: STARTING_MONEY,
    position: 0,
    properties: [],
    inJail: false,
    jailTurns: 0,
    isBankrupt: false,
    netWorth: STARTING_MONEY,
  };
}

function getNextPosition(currentPos, diceValue) {
  // Counterclockwise movement: subtract and wrap
  return ((currentPos - diceValue) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
}

function checkBankruptcy(player) {
  if (player.money < 0 && player.properties.length === 0) return true;
  return false;
}

// Categories
const ALL_CATEGORIES = ['math', 'shape', 'time', 'geography', 'science', 'reading', 'life', 'emotion', 'animal'];

/**
 * Get all complete color groups owned by a player
 */
function getColorGroupsOwned(player) {
  const groups = new Set();
  for (const propId of player.properties) {
    const tile = BOARD_CONFIG[propId];
    if (tile && tile.colorGroup) {
      // Check if player owns all tiles in this color group
      const groupTiles = BOARD_CONFIG.filter(t => t.colorGroup === tile.colorGroup);
      const ownsAll = groupTiles.every(t => player.properties.includes(t.id));
      if (ownsAll) {
        groups.add(tile.colorGroup);
      }
    }
  }
  return groups;
}

const initialState = {
  // Screen state
  screen: 'menu', // menu | setup | piece_selection | playing | gameover | profile

  // Game settings
  ageTier: 'kindergarten', // kindergarten | primary1_2 | primary3_4
  humanCount: 2,
  aiCount: 0,
  aiDifficulties: [], // array of AI difficulty levels per AI
  aiPersonalities: [], // array of AI personality types per AI

  // Players
  players: [],
  currentPlayerIndex: 0,

  // Turn state
  currentRound: 1,
  phase: 'roll', // roll | moving | tile_event | question | buy_property | game_over
  diceValues: [1, 1],
  diceRolling: false,
  consecutiveDoubles: 0,

  // Question state
  currentQuestion: null,
  questionAnswered: null, // null | 'correct' | 'incorrect'
  questionTimer: 15,

  // Animation state
  movingPath: [], // array of tile indices for animation
  animationStep: 0,

  // Teacher mode
  teacherMode: false,
  timerEnabled: true,
  // Strategy guide & tips
  showContextualTip: false,
  currentTip: null, // { title, content, tool, timestamp }
  tutorialStep: 0,
  aiThinkingDelayEnabled: true, // AI thinking delay toggle

  // Question bank management
  enabledCategories: ['math', 'shape', 'time', 'geography', 'science', 'reading', 'life', 'emotion', 'animal'], // which categories are enabled for gameplay
  customQuestions: [], // custom questions imported by teacher

// AI delegation (for disconnected players)
  aiDelegations: {},

  // Emotes & Reactions
  activeEmotes: {}, // { playerId: { emote, timestamp, position } }
  playerEmoteHistory: {}, // { playerId: [emote1, emote2, ...] }

  // Piece selection (maps player index -> piece id)
  pieceSelections: {},

  // AI Delegation system for disconnected players
  aiDelegations: {}, // { playerId: { delegatedAt, originalName, delegatedBy } }
  playerStates: {}, // { playerId: { money, properties, position, ... } } for reconnection preservation

  // Dynamic difficulty adjustment
  difficultySettings: {
    enabled: true,
    winRateTarget: 0.5, // Try to keep human win rate around 50%
    adjustmentInterval: 3, // games
  },

  // Theme
  currentTheme: THEMES.CLASSIC,

  // Student ID for persistent profile
  studentId: null,

  // Game statistics tracking
  gameStats: {
    startTime: null,
    endTime: null,
    questionsAnswered: [], // { category, correct, answer, time }
    propertiesBought: [], // { tileId, tileName, price, time }
    rentPaid: 0,
    rentReceived: 0,
    mostVisitedTiles: {}, // tileId -> count
  },

  // Multiplayer state
  isMultiplayer: false,
  isOnlineMultiplayer: false,
  isHost: false,
  peerId: null,
  roomCode: null,
  onlinePlayerIndex: 0,

  // Trade system
  tradeProposal: null, // { from, to, giveProps, receiveProps, giveMoney, receiveMoney }
  activeAuction: null, // { tileId, currentBid, highestBidder, biddingHistory, turnTimeout }
};

export const useGameStore = create((set, get) => ({
  ...initialState,

  // Navigation
  goToMenu: () => set({ ...initialState, currentTheme: get().currentTheme }),

  goToSetup: () => set({ screen: 'setup' }),

  goToEditor: () => set({ screen: 'editor' }),

  goToTeacherPage: () => set({ screen: 'teacher_page' }),

  goToProfile: () => set({ screen: 'profile' }),

  goToWorkshop: () => set({ screen: 'workshop' }),

  // Student ID management
  setStudentId: (id) => {
    set({ studentId: id });
    localStorage.setItem('monopoly3d_student_id', id);
  },

  loadStudentId: () => {
    const saved = localStorage.getItem('monopoly3d_student_id');
    if (saved) set({ studentId: saved });
    return saved;
  },

  // Game statistics tracking
  recordQuestion: (category, correct, answer) => {
    set(s => ({
      gameStats: {
        ...s.gameStats,
        questionsAnswered: [
          ...s.gameStats.questionsAnswered,
          {
            category,
            correct,
            answer,
            timestamp: Date.now(),
          },
        ],
      },
    }));
  },

  recordPropertyPurchase: (tileId, tileName, price) => {
    set(s => ({
      gameStats: {
        ...s.gameStats,
        propertiesBought: [
          ...s.gameStats.propertiesBought,
          { tileId, tileName, price, timestamp: Date.now() },
        ],
      },
    }));
  },

  recordRentPaid: (amount) => {
    set(s => ({
      gameStats: {
        ...s.gameStats,
        rentPaid: s.gameStats.rentPaid + amount,
      },
    }));
  },

  recordRentReceived: (amount) => {
    set(s => ({
      gameStats: {
        ...s.gameStats,
        rentReceived: s.gameStats.rentReceived + amount,
      },
    }));
  },

  recordTileVisit: (tileId) => {
    set(s => ({
      gameStats: {
        ...s.gameStats,
        mostVisitedTiles: {
          ...s.gameStats.mostVisitedTiles,
          [tileId]: (s.gameStats.mostVisitedTiles[tileId] || 0) + 1,
        },
      },
    }));
  },

  // AI Learning: Record AI decision (stored in gameStats, saved with game profile)
  recordDecision: (decisionType, details) => {
    set(s => ({
      gameStats: {
        ...s.gameStats,
        aiDecisions: [
          ...s.gameStats.aiDecisions,
          {
            type: decisionType, // 'buy' | 'pass' | 'build' | 'trade'
            tileId: details.tileId || null,
            tileName: details.tileName || '',
            score: details.score || null,
            action: details.action || null,
            decision: details.decision || null,
            timestamp: Date.now(),
            playerMoney: details.playerMoney || 0,
            playerPosition: details.playerPosition || 0,
          },
        ],
      },
    }));
  },

  // Get AI learning stats from current game session
  getAILearningStats: () => {
    const state = get();
    const aiDecisions = state.gameStats.aiDecisions || [];
    
    const buyDecisions = aiDecisions.filter(d => d.type === 'buy');
    const passDecisions = aiDecisions.filter(d => d.type === 'pass');
    const buildDecisions = aiDecisions.filter(d => d.type === 'build');
    
    return {
      totalDecisions: aiDecisions.length,
      buyDecisions: buyDecisions.length,
      passDecisions: passDecisions.length,
      buildDecisions: buildDecisions.length,
      recentDecisions: aiDecisions.slice(-20).reverse(),
    };
  },

  // Reset AI learning data for current game
  resetAILearning: () => {
    set(s => ({
      gameStats: {
        ...s.gameStats,
        aiDecisions: [],
      },
    }));
    return true;
  },

  startGameStats: () => {
    set(s => ({
      gameStats: {
        startTime: Date.now(),
        endTime: null,
        questionsAnswered: [],
        propertiesBought: [],
        rentPaid: 0,
        rentReceived: 0,
        mostVisitedTiles: {},
        aiDecisions: [], // AI learning decisions
      },
    }));
  },

  finalizeGameStats: () => {
    set(s => ({
      gameStats: {
        ...s.gameStats,
        endTime: Date.now(),
      },
    }));
  },

  // Save game stats to student profile in localStorage
  saveGameStatsToProfile: () => {
    const state = get();
    const studentId = state.studentId || 'anonymous';
    const profilesJson = localStorage.getItem('monopoly3d_student_profiles');
    const profiles = profilesJson ? JSON.parse(profilesJson) : {};

    if (!profiles[studentId]) {
      profiles[studentId] = { name: studentId, games: [] };
    }

    // Calculate final stats
    const duration = state.gameStats.endTime - state.gameStats.startTime;
    const questionsAnswered = state.gameStats.questionsAnswered;
    const totalQuestions = questionsAnswered.length;
    const correctQuestions = questionsAnswered.filter(q => q.correct).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;

    // Calculate accuracy by category
    const categoryStats = {};
    ALL_CATEGORIES.forEach(cat => {
      const catQuestions = questionsAnswered.filter(q => q.category === cat);
      const catCorrect = catQuestions.filter(q => q.correct).length;
      categoryStats[cat] = {
        total: catQuestions.length,
        correct: catCorrect,
        accuracy: catQuestions.length > 0 ? Math.round((catCorrect / catQuestions.length) * 100) : 0,
      };
    });

    // Find weakest and strongest categories
    const categoriesWithData = Object.entries(categoryStats).filter(([_, stats]) => stats.total > 0);
    const weakestCategory = categoriesWithData.length > 0
      ? categoriesWithData.reduce((min, [cat, stats]) => stats.accuracy < min[1].accuracy ? [cat, stats] : min)
      : null;
    const strongestCategory = categoriesWithData.length > 0
      ? categoriesWithData.reduce((max, [cat, stats]) => stats.accuracy > max[1].accuracy ? [cat, stats] : max)
      : null;

    // Calculate rank
    const rankedPlayers = [...state.players].sort((a, b) => {
      const netA = a.money + a.properties.reduce((sum, pid) => sum + 100, 0);
      const netB = b.money + b.properties.reduce((sum, pid) => sum + 100, 0);
      return netB - netA;
    });
    const playerRank = rankedPlayers.findIndex(p => !p.isAI && p.id === state.players[state.currentPlayerIndex]?.id) + 1;

    const gameRecord = {
      date: new Date().toISOString(),
      duration,
      ageTier: state.ageTier,
      totalQuestions,
      correctQuestions,
      accuracy,
      categoryStats,
      weakestCategory: weakestCategory ? { category: weakestCategory[0], ...weakestCategory[1] } : null,
      strongestCategory: strongestCategory ? { category: strongestCategory[0], ...strongestCategory[1] } : null,
      propertiesBought: state.gameStats.propertiesBought,
      rentPaid: state.gameStats.rentPaid,
      rentReceived: state.gameStats.rentReceived,
      mostVisitedTiles: state.gameStats.mostVisitedTiles,
      aiDecisions: state.gameStats.aiDecisions || [],
      rank: playerRank,
      totalPlayers: state.players.length,
    };

    profiles[studentId].games.push(gameRecord);
    profiles[studentId].lastPlayed = new Date().toISOString();
    profiles[studentId].totalGames = (profiles[studentId].totalGames || 0) + 1;

    localStorage.setItem('monopoly3d_student_profiles', JSON.stringify(profiles));
    return gameRecord;
  },

  // Player profile update at game end - records result, updates XP/level, AI battle record, wrong answers
  playerProfile: (gameResult) => {
    const state = get();
    const studentId = state.studentId || 'anonymous';
    const achievementStore = require('../features/achievement/achievementStore').useAchievementStore.getState();
    
    // Calculate game stats
    const questionsAnswered = state.gameStats.questionsAnswered || [];
    const totalQuestions = questionsAnswered.length;
    const correctQuestions = questionsAnswered.filter(q => q.correct).length;
    const wrongQuestions = questionsAnswered.filter(q => !q.correct);
    
    // Determine rank
    const rankedPlayers = [...state.players].sort((a, b) => {
      const netA = a.money + a.properties.reduce((sum, pid) => sum + 100, 0);
      const netB = b.money + b.properties.reduce((sum, pid) => sum + 100, 0);
      return netB - netA;
    });
    const humanPlayers = rankedPlayers.filter(p => !p.isAI);
    const playerRank = humanPlayers.length > 0 ? humanPlayers.findIndex(p => p.id === state.players[0]?.id) + 1 : 1;
    const isWinner = playerRank === 1;
    
    // Calculate XP earned (based on performance)
    const xpEarned = Math.round(
      (correctQuestions * 10) + // 10 XP per correct answer
      (isWinner ? 50 : 0) +     // Bonus for winning
      (state.gameStats.propertiesBought?.length || 0) * 5 // 5 XP per property
    );
    
    // Update achievement store profile stats
    achievementStore.incrementStat('gamesPlayed');
    if (isWinner) {
      achievementStore.incrementStat('wins');
    }
    achievementStore.incrementStat('totalQuestionsAnswered', totalQuestions);
    achievementStore.incrementStat('totalCorrectAnswers', correctQuestions);
    achievementStore.incrementStat('propertiesBought', state.gameStats.propertiesBought?.length || 0);
    
    // Update category stats for wrong answers
    wrongQuestions.forEach(q => {
      achievementStore.updateCategoryStats(q.category, false);
    });
    
    // Update AI battle record
    const aiCount = state.players.filter(p => p.isAI).length;
    if (aiCount > 0) {
      // This is stored in localStorage student_profiles
      const profilesJson = localStorage.getItem('monopoly3d_student_profiles');
      const profiles = profilesJson ? JSON.parse(profilesJson) : {};
      if (!profiles[studentId]) {
        profiles[studentId] = { name: studentId, games: [], aiBattles: { wins: 0, losses: 0 } };
      }
      if (!profiles[studentId].aiBattles) {
        profiles[studentId].aiBattles = { wins: 0, losses: 0 };
      }
      if (isWinner) {
        profiles[studentId].aiBattles.wins++;
      } else {
        profiles[studentId].aiBattles.losses++;
      }
      localStorage.setItem('monopoly3d_student_profiles', JSON.stringify(profiles));
    }
    
    // Record wrong answers for review
    if (wrongQuestions.length > 0) {
      const wrongAnswersJson = localStorage.getItem('monopoly3d_wrong_answers');
      const wrongAnswers = wrongAnswersJson ? JSON.parse(wrongAnswersJson) : {};
      if (!wrongAnswers[studentId]) {
        wrongAnswers[studentId] = [];
      }
      // Add new wrong answers (keep last 50)
      wrongAnswers[studentId] = [
        ...wrongAnswers[studentId],
        ...wrongQuestions.map(q => ({
          ...q,
          timestamp: Date.now(),
          gameDate: new Date().toISOString(),
        }))
      ].slice(-50);
      localStorage.setItem('monopoly3d_wrong_answers', JSON.stringify(wrongAnswers));
    }
    
    // Sync profile stats from game store
    achievementStore.syncProfileStats({
      gamesPlayed: (achievementStore.profileStats.gamesPlayed || 0) + 1,
      wins: isWinner ? (achievementStore.profileStats.wins || 0) + 1 : achievementStore.profileStats.wins || 0,
      totalQuestionsAnswered: (achievementStore.profileStats.totalQuestionsAnswered || 0) + totalQuestions,
      totalCorrectAnswers: (achievementStore.profileStats.totalCorrectAnswers || 0) + correctQuestions,
    });
    
    return { xpEarned, rank: playerRank, isWinner };
  },

  // Multiplayer actions
  hostGame: (peerId, roomCode) => {
    set({
      isMultiplayer: true,
      isHost: true,
      peerId,
      roomCode,
    });
  },

  joinGame: (peerId, roomCode) => {
    set({
      isMultiplayer: true,
      isHost: false,
      peerId,
      roomCode,
    });
  },

  // Online multiplayer actions (Supabase-based)
  startOnlineGame: (roomCode, isHost) => {
    set({
      isMultiplayer: true,
      isOnlineMultiplayer: true,
      isHost,
      roomCode,
    });
  },

  setOnlinePlayerIndex: (index) => {
    set({ onlinePlayerIndex: index });
  },

  endOnlineGame: () => {
    set({
      isMultiplayer: false,
      isOnlineMultiplayer: false,
      isHost: false,
      peerId: null,
      roomCode: null,
      onlinePlayerIndex: 0,
    });
  },

  leaveGame: () => {
    set({
      isMultiplayer: false,
      isOnlineMultiplayer: false,
      isHost: false,
      peerId: null,
      roomCode: null,
    });
  },

  broadcastState: (state) => {
    // This will be connected to multiplayer.js
    if (window.monopolyMultiplayer) {
      window.monopolyMultiplayer.broadcastGameState(state);
    }
  },

  receiveState: (state) => {
    // Apply received state from host
    set(state);
  },

  setAgeTier: (tier) => set({ ageTier: tier }),

  setPlayers: (humanCount, aiCount, aiDifficulties = [], aiPersonalities = []) => {
    // Default difficulties to 'normal' if not provided
    const difficulties = aiDifficulties.length === aiCount
      ? aiDifficulties
      : Array(aiCount).fill(AI_DIFFICULTY.NORMAL);
    // Default personalities to auto-assigned based on index
    const personalities = aiPersonalities.length === aiCount
      ? aiPersonalities
      : Array.from({ length: aiCount }, (_, i) => getDefaultPersonality(i));
    // Transition to piece selection screen
    set({ humanCount, aiCount, aiDifficulties: difficulties, aiPersonalities: personalities, screen: 'piece_selection' });
  },

  setAIDifficulty: (aiIndex, difficulty) => set(s => {
    const newDifficulties = [...s.aiDifficulties];
    newDifficulties[aiIndex] = difficulty;
    return { aiDifficulties: newDifficulties };
  }),

  toggleAiThinkingDelay: () => set(s => ({ aiThinkingDelayEnabled: !s.aiThinkingDelayEnabled })),

  setTheme: (theme) => set({ currentTheme: theme }),

  setPieceSelection: (pieceMap) => {
    const state = get();
    const players = [];
    for (let i = 0; i < state.humanCount; i++) {
      const colorIdx = pieceMap[i] !== undefined ? pieceMap[i] : i;
      players.push(createPlayer(i, `玩家${i + 1}`, false, PLAYER_COLORS[colorIdx % 4]));
    }
    for (let i = 0; i < state.aiCount; i++) {
      const globalIdx = state.humanCount + i;
      const colorIdx = pieceMap[globalIdx] !== undefined ? pieceMap[globalIdx] : globalIdx;
      const personality = state.aiPersonalities[i] || getDefaultPersonality(i);
      const aiNames = getPersonalityNames(personality);
      const aiName = aiNames[i % aiNames.length];
      players.push(createPlayer(globalIdx, aiName, true, PLAYER_COLORS[colorIdx % 4], personality));
    }
    // Start tracking game stats
    get().startGameStats();
    // Initialize achievement tracking for new game
    initAchievementTracking();
    // Publish game start event
    eventBus.publish('game_start', { 
      players: players.map(p => ({ id: p.id, name: p.name, isAI: p.isAI })),
      timestamp: Date.now(),
    });
    set({
      players,
      pieceSelections: pieceMap,
      screen: 'playing',
      phase: 'roll',
      currentPlayerIndex: 0,
      currentRound: 1,
    });
  },
  
  rollDice: () => {
    const state = get();
    if (state.diceRolling || state.phase !== 'roll') return;
    
    set({ diceRolling: true });
    
    // Animate dice for 1.2 seconds with ease-out
    const animInterval = setInterval(() => {
      set({ diceValues: [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1] });
    }, 100);
    
    setTimeout(() => {
      clearInterval(animInterval);
      const [d1, d2] = get().diceValues;
      const isDoubles = d1 === d2;
      const newDoubles = isDoubles ? state.consecutiveDoubles + 1 : 0;
      
      // Track dice for achievement
      onDiceRolled([d1, d2]);
      
      // Publish dice roll event
      eventBus.publish('dice_roll', {
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        dice: [d1, d2],
        total: total,
        isDoubles,
        consecutiveDoubles: newDoubles,
        timestamp: Date.now(),
      });
      
      // Three doubles = go to jail
      if (newDoubles >= 3) {
        const players = [...state.players];
        const currentPlayer = players[state.currentPlayerIndex];
        currentPlayer.position = 10; // Jail position
        currentPlayer.inJail = true;
        currentPlayer.jailTurns = 0;
        // Publish jail enter event
        eventBus.publish('jail_enter', {
          playerId: currentPlayer.id,
          playerName: currentPlayer.name,
          reason: 'three_doubles',
          timestamp: Date.now(),
        });
        set({
          diceRolling: false,
          consecutiveDoubles: 0,
          players,
          phase: 'roll',
          ...advanceToNextPlayer(state),
        });
        return;
      }
      
      const total = d1 + d2;
      const currentPlayer = state.players[state.currentPlayerIndex];
      
      // If in jail and not doubles, stay in jail
      if (currentPlayer.inJail) {
        if (isDoubles) {
          const players = [...state.players];
          players[state.currentPlayerIndex].inJail = false;
          players[state.currentPlayerIndex].jailTurns = 0;
          // Track jail escape achievement
          onEscapeJail();
          // Publish jail exit event (escaped via doubles)
          eventBus.publish('jail_exit', {
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            reason: 'rolled_doubles',
            timestamp: Date.now(),
          });
          const newPos = getNextPosition(currentPlayer.position, total);
          set({
            diceRolling: false,
            consecutiveDoubles: newDoubles,
            players,
            phase: 'moving',
            movingPath: computePath(currentPlayer.position, newPos),
            animationStep: 0,
          });
        } else {
          const players = [...state.players];
          players[state.currentPlayerIndex].jailTurns += 1;
          if (players[state.currentPlayerIndex].jailTurns >= 3) {
            players[state.currentPlayerIndex].inJail = false;
            players[state.currentPlayerIndex].jailTurns = 0;
            // Publish jail exit event (forced after 3 turns)
            eventBus.publish('jail_exit', {
              playerId: currentPlayer.id,
              playerName: currentPlayer.name,
              reason: 'max_turns',
              timestamp: Date.now(),
            });
            const newPos = getNextPosition(currentPlayer.position, total);
            set({
              diceRolling: false,
              consecutiveDoubles: 0,
              players,
              phase: 'moving',
              movingPath: computePath(currentPlayer.position, newPos),
              animationStep: 0,
            });
          } else {
            set({
              diceRolling: false,
              consecutiveDoubles: 0,
              players,
              phase: 'roll',
              ...advanceToNextPlayer(state),
            });
          }
        }
        return;
      }
      
      // Normal movement
      const newPos = getNextPosition(currentPlayer.position, total);
      // Counterclockwise: passing Go occurs when newPos > currentPos (wrapping backward)
      const passedGo = newPos > currentPlayer.position;
      
      if (passedGo) {
        const players = [...state.players];
        players[state.currentPlayerIndex].money += 200;
        players[state.currentPlayerIndex].position = newPos;
        // Track passing Go achievement
        onPassGo();
        set({ players });
      }
      
      set({
        diceRolling: false,
        consecutiveDoubles: newDoubles,
        phase: 'moving',
        movingPath: computePath(currentPlayer.position, newPos),
        animationStep: 0,
      });
    }, 1000);
  },
  
  // Called by animation to advance one step
  advanceStep: () => {
    const state = get();
    if (state.phase !== 'moving') return;
    
    const nextStep = state.animationStep + 1;
    const players = [...state.players];
    const previousPosition = state.players[state.currentPlayerIndex].position;
    players[state.currentPlayerIndex].position = state.movingPath[nextStep - 1];
    
    // Publish player move event
    eventBus.publish('player_move', {
      playerId: state.players[state.currentPlayerIndex].id,
      playerName: state.players[state.currentPlayerIndex].name,
      from: previousPosition,
      to: state.movingPath[nextStep - 1],
      step: nextStep,
      totalSteps: state.movingPath.length,
      timestamp: Date.now(),
    });
    
    if (nextStep >= state.movingPath.length) {
      // Movement complete - handle tile event
      set({ players, animationStep: nextStep, phase: 'tile_event' });
      get().handleTileEvent();
    } else {
      set({ players, animationStep: nextStep });
    }
  },
  
  handleTileEvent: () => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    const tile = BOARD_CONFIG[player.position];
    
    // Record tile visit for achievement
    onTileVisit(tile.id);
    
    // Record tile visit
    get().recordTileVisit(tile.id);
    
    switch (tile.type) {
      case TILE_TYPES.PROPERTY:
        if (tile.owner === null) {
          set({ phase: 'buy_property' });
        } else if (tile.owner !== player.id) {
          // Pay rent
          const owner = state.players[tile.owner];
          const rentAmount = calculateRent(tile, owner);
          if (player.money >= rentAmount) {
            const players = [...state.players];
            players[player.id].money -= rentAmount;
            players[owner.id].money += rentAmount;
            // Record rent transactions
            get().recordRentPaid(rentAmount);
            get().recordRentReceived(rentAmount);
            // Track achievement for rent collection (only for owner)
            if (!owner.isAI) {
              onRentCollected(rentAmount);
            }
            // Publish rent paid event
            eventBus.publish('rent_paid', {
              payerId: player.id,
              payerName: player.name,
              receiverId: owner.id,
              receiverName: owner.name,
              amount: rentAmount,
              tileId: tile.id,
              tileName: tile.name,
              timestamp: Date.now(),
            });
            set({ players, phase: 'roll', ...advanceToNextPlayer(state) });
          } else {
            // Bankruptcy
            const players = [...state.players];
            players[player.id].money -= rentAmount;
            players[player.id].isBankrupt = true;
            // Publish bankruptcy event
            eventBus.publish('bankruptcy', {
              playerId: player.id,
              playerName: player.name,
              reason: 'rent_unaffordable',
              amountOwed: rentAmount,
              tileId: tile.id,
              tileName: tile.name,
              timestamp: Date.now(),
            });
            // Record rent transactions
            get().recordRentPaid(rentAmount);
            get().recordRentReceived(rentAmount);
            // Track achievement for rent collection (only for owner)
            if (!owner.isAI) {
              onRentCollected(rentAmount + player.money);
            }
            // Transfer properties
            tile.owner = owner.id;
            owner.properties.push(tile.id);
            owner.money += rentAmount + player.money;
            players[owner.id].money = owner.money;
            set({ players, phase: 'roll', ...advanceToNextPlayer(state) });
          }
        } else {
          set({ phase: 'roll', ...advanceToNextPlayer(state) });
        }
        break;
        
      case TILE_TYPES.QUESTION:
        get().triggerQuestion();
        break;
        
      case TILE_TYPES.CHANCE:
        // Random chance event
        const chanceOutcome = Math.random();
        const players = [...state.players];
        if (chanceOutcome < 0.4) {
          // Reward
          players[state.currentPlayerIndex].money += 100;
          set({ players, phase: 'roll', ...advanceToNextPlayer(state) });
        } else if (chanceOutcome < 0.7) {
          // Penalty
          players[state.currentPlayerIndex].money -= 50;
          set({ players, phase: 'roll', ...advanceToNextPlayer(state) });
        } else {
          // Question
          get().triggerQuestion();
        }
        break;
        
      case TILE_TYPES.TAX:
        const players2 = [...state.players];
        players2[state.currentPlayerIndex].money -= tile.amount;
        set({ players: players2, phase: 'roll', ...advanceToNextPlayer(state) });
        break;
        
      case TILE_TYPES.GO_TO_JAIL:
        const players3 = [...state.players];
        players3[state.currentPlayerIndex].position = 10;
        players3[state.currentPlayerIndex].inJail = true;
        players3[state.currentPlayerIndex].jailTurns = 0;
        // Publish jail enter event
        eventBus.publish('jail_enter', {
          playerId: player.id,
          playerName: player.name,
          reason: 'go_to_jail_tile',
          timestamp: Date.now(),
        });
        set({ players: players3, phase: 'roll', ...advanceToNextPlayer(state) });
        break;
        
      case 'free_parking':
      case 'jail':
      case 'go':
      default:
        set({ phase: 'roll', ...advanceToNextPlayer(state) });
    }
    
    // Check for game over after each turn
    get().checkGameOver();
  },
  
  triggerQuestion: () => {
    const state = get();
    const questions = get().getQuestionsForTier(state.ageTier);
    const question = questions[Math.floor(Math.random() * questions.length)];
    set({
      phase: 'question',
      currentQuestion: question,
      questionAnswered: null,
      questionTimer: 15,
    });
    
    // Start timer
    if (state.timerEnabled && !state.teacherMode) {
      const timerInterval = setInterval(() => {
        const current = get();
        if (current.phase !== 'question' || current.questionAnswered) {
          clearInterval(timerInterval);
          return;
        }
        const next = current.questionTimer - 1;
        if (next <= 0) {
          clearInterval(timerInterval);
          get().answerQuestion(-1); // Time's up = wrong
        } else {
          set({ questionTimer: next });
        }
      }, 1000);
    }
  },
  
  answerQuestion: (answerIndex) => {
    const state = get();
    if (state.questionAnswered || !state.currentQuestion) return;
    
    const isCorrect = answerIndex === state.currentQuestion.correctIndex;
    const players = [...state.players];
    // Apply weather bonus to reward
    const weatherBonus = getWeatherBonus();
    const baseReward = isCorrect ? 100 : -50;
    const reward = Math.round(baseReward * weatherBonus);
    players[state.currentPlayerIndex].money += reward;
    
    // If went bankrupt from wrong answer
    if (players[state.currentPlayerIndex].money < 0) {
      players[state.currentPlayerIndex].isBankrupt = true;
      // Publish bankruptcy event
      eventBus.publish('bankruptcy', {
        playerId: state.currentPlayerIndex,
        playerName: state.players[state.currentPlayerIndex].name,
        reason: 'wrong_answer',
        amountOwed: Math.abs(reward),
        questionId: state.currentQuestion?.id,
        category: state.currentQuestion?.category,
        timestamp: Date.now(),
      });
    }
    
    // Record question stats
    get().recordQuestion(state.currentQuestion.category, isCorrect, answerIndex);
    
    // Track achievement for question answered
    const answerTime = 15 - state.questionTimer; // Approximate time taken
    onQuestionAnswered(state.currentQuestion.category, isCorrect, answerTime);
    
    // Publish question answered event
    eventBus.publish('question_answered', {
      playerId: state.currentPlayerIndex,
      playerName: state.players[state.currentPlayerIndex].name,
      questionId: state.currentQuestion.id,
      category: state.currentQuestion.category,
      isCorrect,
      answerTime,
      reward,
      timestamp: Date.now(),
    });
    
    set({
      players,
      questionAnswered: isCorrect ? 'correct' : 'incorrect',
    });
    
    // Auto advance after 2 seconds
    setTimeout(() => {
      const currentState = get();
      const previousPlayerIndex = currentState.currentPlayerIndex;
      set({ currentQuestion: null, questionAnswered: null });
      set({ phase: 'roll', ...advanceToNextPlayer(currentState) });
      
      // Publish turn change event
      eventBus.publish('turn_change', {
        fromPlayerId: previousPlayerIndex,
        fromPlayerName: currentState.players[previousPlayerIndex]?.name,
        toPlayerId: get().currentPlayerIndex,
        toPlayerName: get().players[get().currentPlayerIndex]?.name,
        round: get().currentRound,
        timestamp: Date.now(),
      });
      
      get().checkGameOver();
    }, 2000);
  },
  
  buyProperty: () => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    const tile = BOARD_CONFIG[player.position];
    
    if (tile.type !== TILE_TYPES.PROPERTY || tile.owner !== null) return;
    if (player.money < tile.price) return;
    
    // Publish property purchase offer event (before purchase attempt)
    eventBus.publish('property_purchase_offer', {
      playerId: player.id,
      playerName: player.name,
      tileId: tile.id,
      tileName: tile.name,
      price: tile.price,
      timestamp: Date.now(),
    });
    
    const players = [...state.players];
    players[state.currentPlayerIndex].money -= tile.price;
    players[state.currentPlayerIndex].properties.push(tile.id);
    BOARD_CONFIG[tile.id].owner = player.id;
    
    // Record property purchase
    get().recordPropertyPurchase(tile.id, tile.name, tile.price);
    
    // Track achievement
    onPropertyBought(tile.id, tile.price);
    
    // Publish property purchase complete event (after purchase succeeds)
    eventBus.publish('property_purchase_complete', {
      playerId: player.id,
      playerName: player.name,
      tileId: tile.id,
      tileName: tile.name,
      price: tile.price,
      timestamp: Date.now(),
    });
    
    // Publish property purchase event (legacy)
    eventBus.publish('property_purchase', {
      playerId: player.id,
      playerName: player.name,
      tileId: tile.id,
      tileName: tile.name,
      price: tile.price,
      timestamp: Date.now(),
    });
    
    // Publish turn change event
    eventBus.publish('turn_change', {
      fromPlayerId: state.currentPlayerIndex,
      fromPlayerName: player.name,
      toPlayerId: get().currentPlayerIndex,
      toPlayerName: get().players[get().currentPlayerIndex]?.name,
      round: get().currentRound,
      timestamp: Date.now(),
    });
    
    set({ players, phase: 'roll', ...advanceToNextPlayer(state) });
  },
  
  passProperty: () => {
    const state = get();
    const currentPlayer = state.players[state.currentPlayerIndex];
    const tile = BOARD_CONFIG[currentPlayer.position];

    // If it's a property tile and no one owns it, start auction
    if (tile && tile.type === TILE_TYPES.PROPERTY && tile.owner === null) {
      get().startAuction(tile.id);
    } else {
      set({ phase: 'roll', ...advanceToNextPlayer(state) });
    }
  },

  // ==================== TRADE SYSTEM ====================

  /**
   * Propose a trade to another player
   * @param {Object} proposal - { to, giveProps[], receiveProps[], giveMoney, receiveMoney }
   */
  proposeTrade: (proposal) => {
    const state = get();
    const from = state.currentPlayerIndex;
    const fromPlayer = state.players[from];
    set({
      tradeProposal: {
        from,
        to: proposal.to,
        giveProps: proposal.giveProps || [],
        receiveProps: proposal.receiveProps || [],
        giveMoney: proposal.giveMoney || 0,
        receiveMoney: proposal.receiveMoney || 0,
        status: 'pending', // pending | accepted | rejected | counteroffered
      },
      phase: 'trade_proposal',
    });
    
    // Publish trade proposed event
    eventBus.publish('trade_proposed', {
      fromPlayerId: from,
      fromPlayerName: fromPlayer.name,
      toPlayerId: proposal.to,
      toPlayerName: state.players[proposal.to]?.name,
      giveProps: proposal.giveProps || [],
      receiveProps: proposal.receiveProps || [],
      giveMoney: proposal.giveMoney || 0,
      receiveMoney: proposal.receiveMoney || 0,
      timestamp: Date.now(),
    });
  },

  /**
   * AI proposes trade based on personality and game state
   */
  aiProposeTrade: () => {
    const state = get();
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer.isAI) return;

    const personality = currentPlayer.personality;
    const potentialTradePartners = state.players
      .filter((p, i) => i !== state.currentPlayerIndex && !p.isBankrupt);

    if (potentialTradePartners.length === 0) return;

    // Aggressive AI looks for monopoly-completion trades
    if (personality === AI_PERSONALITY.AGGRESSIVE) {
      const myGroups = getColorGroupsOwned(currentPlayer);
      for (const partner of potentialTradePartners) {
        const partnerGroups = getColorGroupsOwned(partner);
        // Look for complementary groups (I have some, they have others from same group)
        for (const myGroup of myGroups) {
          const needed = partner.properties.filter(pId => {
            const tile = BOARD_CONFIG[pId];
            return tile && tile.colorGroup === myGroup && !currentPlayer.properties.includes(pId);
          });
          if (needed.length > 0) {
            // Propose trade: give them money for needed properties
            const totalValue = needed.reduce((sum, pId) => sum + (BOARD_CONFIG[pId]?.price || 0), 0);
            get().proposeTrade({
              to: partner.id,
              giveMoney: Math.floor(totalValue * 0.8),
              receiveProps: needed,
            });
            return;
          }
        }
      }
    }

    // Conservative AI trades for complete monopolies to build
    if (personality === AI_PERSONALITY.CONSERVATIVE) {
      for (const partner of potentialTradePartners) {
        // Look for any property that completes a set
        for (const propId of currentPlayer.properties) {
          const tile = BOARD_CONFIG[propId];
          if (!tile || !tile.colorGroup) continue;
          const groupTiles = BOARD_CONFIG.filter(t => t.colorGroup === tile.colorGroup);
          const ownedByPartner = groupTiles.filter(t => partner.properties.includes(t.id));
          if (ownedByPartner.length > 0) {
            const value = ownedByPartner.reduce((sum, t) => sum + (t.price || 0), 0);
            get().proposeTrade({
              to: partner.id,
              giveMoney: Math.floor(value * 0.9),
              receiveProps: ownedByPartner.map(t => t.id),
            });
            return;
          }
        }
      }
    }
  },

  /**
   * Accept a trade proposal
   */
  acceptTrade: () => {
    const state = get();
    const proposal = state.tradeProposal;
    if (!proposal || proposal.status !== 'pending') return;

    const players = [...state.players];
    const fromPlayer = players[proposal.from];
    const toPlayer = players[proposal.to];

    // Execute property transfers
    for (const propId of proposal.giveProps) {
      fromPlayer.properties = fromPlayer.properties.filter(p => p !== propId);
      toPlayer.properties.push(propId);
      BOARD_CONFIG[propId].owner = proposal.to;
    }
    for (const propId of proposal.receiveProps) {
      toPlayer.properties = toPlayer.properties.filter(p => p !== propId);
      fromPlayer.properties.push(propId);
      BOARD_CONFIG[propId].owner = proposal.from;
    }

    // Execute money transfers
    fromPlayer.money += proposal.giveMoney - proposal.receiveMoney;
    toPlayer.money += proposal.receiveMoney - proposal.giveMoney;

    set({
      players,
      tradeProposal: { ...proposal, status: 'accepted' },
      phase: 'roll',
    });
    
    // Publish trade accepted event
    eventBus.publish('trade_accepted', {
      fromPlayerId: proposal.from,
      fromPlayerName: fromPlayer.name,
      toPlayerId: proposal.to,
      toPlayerName: toPlayer.name,
      giveProps: proposal.giveProps,
      receiveProps: proposal.receiveProps,
      giveMoney: proposal.giveMoney,
      receiveMoney: proposal.receiveMoney,
      timestamp: Date.now(),
    });
    
    setTimeout(() => set({ tradeProposal: null }), 100);
  },

  /**
   * Reject a trade proposal
   */
rejectTrade: () => {
    const state = get();
    if (state.tradeProposal) {
      const proposal = state.tradeProposal;
      const fromPlayer = state.players[proposal.from];
      const toPlayer = state.players[proposal.to];
      
      set({
        tradeProposal: { ...state.tradeProposal, status: 'rejected' },
        phase: 'roll',
      });
      
      // Publish trade rejected event
      eventBus.publish('trade_rejected', {
        fromPlayerId: proposal.from,
        fromPlayerName: fromPlayer?.name,
        toPlayerId: proposal.to,
        toPlayerName: toPlayer?.name,
        timestamp: Date.now(),
      });
    }
    setTimeout(() => set({ tradeProposal: null }), 100);
  },

  // ==================== AI DELEGATION SYSTEM ====================
  // When a human player disconnects, AI takes over their turn
  // On reconnection, human can reclaim their turn with state restored

  /**
   * Delegate a disconnected player's turn to AI
   */
  delegateToAI: (playerId) => {
    const state = get();
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const player = state.players[playerIndex];
    if (player.isAI) return; // Already AI

    // Save player state for later restoration
    const playerState = {
      money: player.money,
      properties: [...player.properties],
      position: player.position,
      inJail: player.inJail,
      jailTurns: player.jailTurns,
      getOutOfJailFree: player.getOutOfJailFree,
      personality: player.personality,
    };

    set(state => ({
      playerStates: {
        ...state.playerStates,
        [playerId]: playerState,
      },
      aiDelegations: {
        ...state.aiDelegations,
        [playerId]: {
          delegatedAt: Date.now(),
          originalName: player.name,
          delegatedBy: 'system',
        },
      },
    }));

    console.log(`[Store] Player ${player.name} delegated to AI at ${new Date().toLocaleTimeString()}`);
  },

  /**
   * Reclaim turn from AI when player reconnects
   */
  reclaimFromAI: (playerId) => {
    const state = get();
    const savedState = state.playerStates[playerId];
    if (!savedState) return;

    const playerIndex = state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    // Restore player state
    set(state => {
      const players = [...state.players];
      players[playerIndex] = {
        ...players[playerIndex],
        ...savedState,
        isAI: false,
      };

      // Remove delegation record
      const aiDelegations = { ...state.aiDelegations };
      delete aiDelegations[playerId];

      // Remove saved state
      const playerStates = { ...state.playerStates };
      delete playerStates[playerId];

      console.log(`[Store] Player ${players[playerIndex].name} reclaimed turn from AI`);

      return { players, aiDelegations, playerStates };
    });
  },

  /**
   * Get the AI difficulty to use for a delegated turn
   * Returns EASY/NORMAL/HARD based on dynamic difficulty settings
   */
  getAIDelegationDifficulty: (playerId) => {
    const state = get();
    const playerState = state.playerStates[playerId];
    if (!playerState) return AI_DIFFICULTY.NORMAL;

    // If player was doing well, use harder AI; if badly, use easier AI
    // This is a simplified heuristic
    const recentAccuracy = playerState.questionAccuracy || 0.5;
    if (recentAccuracy > 0.7) return AI_DIFFICULTY.HARD;
    if (recentAccuracy > 0.4) return AI_DIFFICULTY.NORMAL;
    return AI_DIFFICULTY.EASY;
  },

  /**
   * Check if a player is currently delegated to AI
   */
  isDelegatedToAI: (playerId) => {
    return playerId in get().aiDelegations;
  },

  /**
   * Get time since player was delegated
   */
  getDelegationDuration: (playerId) => {
    const delegation = get().aiDelegations[playerId];
    if (!delegation) return 0;
    return Date.now() - delegation.delegatedAt;
  },

  // ==================== EMOTE SYSTEM ====================

  /**
   * Send an emote for a player
   * @param {string} playerId
   * @param {string} emote - emoji character
   * @param {object} position - { x, y, z } world position
   */
  sendEmote: (playerId, emote, position = null) => {
    set(state => ({
      activeEmotes: {
        ...state.activeEmotes,
        [playerId]: {
          emote,
          timestamp: Date.now(),
          position,
        },
      },
      // Also add to history
      playerEmoteHistory: {
        ...state.playerEmoteHistory,
        [playerId]: [
          ...(state.playerEmoteHistory[playerId] || []),
          { emote, timestamp: Date.now() },
        ].slice(-20), // Keep last 20
      },
    }));

    // Auto-clear after 3 seconds
    setTimeout(() => {
      set(state => {
        const current = state.activeEmotes[playerId];
        if (current && Date.now() - current.timestamp >= 3000) {
          const { [playerId]: _, ...rest } = state.activeEmotes;
          return { activeEmotes: rest };
        }
        return state;
      });
    }, 3000);
  },

  /**
   * Clear a specific player's emote
   */
  clearEmote: (playerId) => {
    set(state => {
      const { [playerId]: _, ...rest } = state.activeEmotes;
      return { activeEmotes: rest };
    });
  },

  /**
   * Clear all emotes
   */
  clearAllEmotes: () => {
    set({ activeEmotes: {} });
  },

  // ==================== AUCTION SYSTEM ====================

  /**
   * Start auction when a property is passed
   */
  startAuction: (tileId) => {
    const state = get();
    const tile = BOARD_CONFIG[tileId];
    const startingBid = Math.floor(tile.price / 2); // Start at 50% of property price
    const currentPlayer = state.players[state.currentPlayerIndex];

    set({
      activeAuction: {
        tileId,
        currentBid: startingBid,
        highestBidder: null,
        biddingHistory: [], // [{ playerId, bid, timestamp }]
        turnTimeout: 15000, // 15 seconds per bid round
        status: 'active', // active | won | cancelled
        currentBidderIndex: state.currentPlayerIndex,
      },
      phase: 'auction',
    });
    
    // Publish auction started event
    eventBus.publish('auction_started', {
      tileId,
      tileName: tile.name,
      startingBid,
      currentBidderId: currentPlayer.id,
      currentBidderName: currentPlayer.name,
      timestamp: Date.now(),
    });
  },

  /**
   * Place a bid in the active auction
   */
  placeBid: (bidAmount) => {
    const state = get();
    const auction = state.activeAuction;
    if (!auction || auction.status !== 'active') return;
    if (bidAmount <= auction.currentBid) return;

    const currentPlayer = state.players[auction.currentBidderIndex];
    if (bidAmount > currentPlayer.money) return; // Can't bid more than you have

    const newHistory = [...auction.biddingHistory, {
      playerId: currentPlayer.id,
      bid: bidAmount,
      timestamp: Date.now(),
    }];

    set({
      activeAuction: {
        ...auction,
        currentBid: bidAmount,
        highestBidder: currentPlayer.id,
        biddingHistory: newHistory,
        currentBidderIndex: (auction.currentBidderIndex + 1) % state.players.length,
      },
    });
    
    // Publish auction bid event
    eventBus.publish('auction_bid', {
      tileId: auction.tileId,
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      bidAmount,
      previousBid: auction.currentBid,
      timestamp: Date.now(),
    });
  },

  /**
   * AI places bid based on personality
   */
  aiPlaceBid: () => {
    const state = get();
    const auction = state.activeAuction;
    if (!auction) return;

    const currentPlayer = state.players[auction.currentBidderIndex];
    if (!currentPlayer.isAI) return;

    const personality = currentPlayer.personality;
    const tile = BOARD_CONFIG[auction.tileId];
    const maxBid = tile.price * (personality === AI_PERSONALITY.AGGRESSIVE ? 1.2 :
                               personality === AI_PERSONALITY.CONSERVATIVE ? 0.9 : 1.0);

    // Calculate how much to bid above current
    const increment = Math.floor(tile.price * 0.1);
    let bidAmount = auction.currentBid + increment;

    // Aggressive AI bids more aggressively
    if (personality === AI_PERSONALITY.AGGRESSIVE) {
      while (bidAmount <= maxBid && Math.random() > 0.3) {
        bidAmount += increment;
      }
    } else if (personality === AI_PERSONALITY.CONSERVATIVE) {
      // Conservative only bids if it completes a monopoly
      const ownedInGroup = currentPlayer.properties.filter(pId => {
        const t = BOARD_CONFIG[pId];
        return t && t.colorGroup === tile.colorGroup;
      }).length;
      if (ownedInGroup === 0) return; // Don't bid if no chance of monopoly
    }

    if (bidAmount <= Math.min(maxBid, currentPlayer.money)) {
      get().placeBid(bidAmount);
    }
  },

  /**
   * Drop out of auction (pass)
   */
  dropOutOfAuction: () => {
    const state = get();
    const auction = state.activeAuction;
    if (!auction) return;

    // Check if only one player left bidding
    const activeBidders = state.players.filter(p => {
      if (p.isBankrupt) return false;
      const hasDroppedOut = auction.biddingHistory.length > 0 &&
        auction.biddingHistory.some(h => h.playerId === p.id);
      return !hasDroppedOut;
    });

    if (activeBidders.length <= 1) {
      // Auction ends
      const tile = BOARD_CONFIG[auction.tileId];
      if (auction.highestBidder !== null) {
        // Winner pays and gets property
        const winner = state.players.find(p => p.id === auction.highestBidder);
        const winnerIndex = state.players.findIndex(p => p.id === auction.highestBidder);
        const players = [...state.players];
        players[winnerIndex].money -= auction.currentBid;
        players[winnerIndex].properties.push(auction.tileId);
        BOARD_CONFIG[auction.tileId].owner = winner.id;
        set({
          players,
          activeAuction: { ...auction, status: 'won', winner: winner.id },
        });
        
        // Publish auction ended event (won)
        eventBus.publish('auction_ended', {
          tileId: auction.tileId,
          tileName: tile?.name,
          status: 'won',
          winnerId: winner.id,
          winnerName: winner.name,
          finalBid: auction.currentBid,
          timestamp: Date.now(),
        });
      } else {
        set({ activeAuction: { ...auction, status: 'cancelled' } });
        
        // Publish auction ended event (cancelled)
        eventBus.publish('auction_ended', {
          tileId: auction.tileId,
          tileName: tile?.name,
          status: 'cancelled',
          winnerId: null,
          winnerName: null,
          finalBid: auction.currentBid,
          timestamp: Date.now(),
        });
      }
      setTimeout(() => set({ activeAuction: null, phase: 'roll' }), 1500);
    }
  },
  
  buildHouse: (tileId) => {
    const state = get();
    const tile = BOARD_CONFIG[tileId];
    const player = state.players[state.currentPlayerIndex];
    
    if (!player.properties.includes(tileId)) return;
    if (tile.houses >= 4) return; // Max 4 houses
    if (player.money < 50) return;
    
    const players = [...state.players];
    players[state.currentPlayerIndex].money -= 50;
    BOARD_CONFIG[tileId].houses += 1;
    
    // Track achievement
    onHouseBuilt();
    
    // Publish house built event
    eventBus.publish('house_built', {
      playerId: player.id,
      playerName: player.name,
      tileId: tileId,
      tileName: tile.name,
      houses: tile.houses + 1,
      cost: 50,
      timestamp: Date.now(),
    });
    
    set({ players });
  },
  
toggleTeacherMode: () => set(s => ({ teacherMode: !s.teacherMode })),

  // ==================== CONTEXTUAL TIPS SYSTEM ====================

  /**
   * Show a contextual tip using StrategyGuide tool
   */
  showTip: (title, content, toolResult = null) => {
    set({
      showContextualTip: true,
      currentTip: {
        title,
        content,
        data: toolResult,
        timestamp: Date.now(),
      },
    });
  },

  /**
   * Hide current tip
   */
  hideTip: () => {
    set({ showContextualTip: false, currentTip: null });
  },

  /**
   * Advance tutorial to next step
   */
  advanceTutorial: () => {
    const state = get();
    const nextStep = state.tutorialStep + 1;
    if (nextStep <= 5) {
      set({ tutorialStep: nextStep });
      return nextStep;
    }
    return null; // Tutorial complete
  },

  /**
   * Reset tutorial
   */
  resetTutorial: () => {
    set({ tutorialStep: 0 });
  },

  /**
   * Auto-evaluate and show tip for current game state
   */
  autoShowTip: () => {
    const state = get();
    if (!state.teacherMode) return;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isAI) return;

    // Import dynamically to avoid circular deps
    import('./strategyGuide.js').then(({ getPurchaseAdvice, analyzeGameState, suggestBuildLocation }) => {
      if (state.phase === 'buy_property') {
        const tile = BOARD_CONFIG[currentPlayer.position];
        if (tile && tile.type === 'property' && !tile.owner) {
          const advice = getPurchaseAdvice(currentPlayer, tile);
          get().showTip(
            `💡 购买建议: ${tile.name}`,
            `${advice.shortTip}\n\n详细分析:\n${advice.reasons.join('\n')}`,
            advice
          );
        }
      } else if (state.phase === 'roll') {
        // Show general strategic tip if player is struggling
        const analysis = analyzeGameState(currentPlayer, state.players, state.currentRound);
        if (analysis.recommendations.length > 0) {
          const topRec = analysis.recommendations[0];
          get().showTip(`📊 局势分析 (第${analysis.playerRank}名)`, topRec.text, analysis);
        }
      }
    });
  },
  toggleTimer: () => set(s => ({ timerEnabled: !s.timerEnabled })),

  // Category management
  toggleCategory: (category) => set(s => {
    const current = s.enabledCategories;
    if (current.includes(category)) {
      // Don't allow disabling all categories
      if (current.length <= 1) return {};
      return { enabledCategories: current.filter(c => c !== category) };
    } else {
      return { enabledCategories: [...current, category] };
    }
  }),

  setEnabledCategories: (categories) => set({ enabledCategories: categories }),

  // Custom question management
  importQuestions: (newQuestions) => set(s => {
    // Deduplicate by question text
    const existingTexts = new Set([
      ...s.customQuestions.map(q => q.question),
      ...kindergartenQuestions.map(q => q.question),
      ...primary1_2Questions.map(q => q.question),
      ...primary3_4Questions.map(q => q.question),
    ]);
    const uniqueNew = newQuestions.filter(q => !existingTexts.has(q.question));
    return { customQuestions: [...s.customQuestions, ...uniqueNew] };
  }),

  exportQuestions: () => {
    const state = get();
    const allQ = [
      ...kindergartenQuestions,
      ...primary1_2Questions,
      ...primary3_4Questions,
      ...state.customQuestions,
    ];
    const blob = new Blob([JSON.stringify(allQ, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monopoly3d-questions.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  downloadQuestionTemplate: () => {
    const template = [
      { id: 'custom-001', tier: 'K', category: 'math', question: '示例题目', options: ['选项A', '选项B', '选项C', '选项D'], correctIndex: 0, imageUrl: null }
    ];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question-template.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  // Get all questions for a tier (built-in + custom), optionally filtered by categories
  getQuestionsForTier: (tier) => {
    const state = get();
    let questions = [];
    if (tier === 'kindergarten') questions = [...kindergartenQuestions];
    else if (tier === 'primary1_2') questions = [...primary1_2Questions];
    else if (tier === 'primary3_4') questions = [...primary3_4Questions];
    
    // Add custom questions for this tier
    const customForTier = state.customQuestions.filter(q => q.tier === tier);
    questions = [...questions, ...customForTier];
    
    // Filter by enabled categories
    if (state.enabledCategories.length > 0) {
      questions = questions.filter(q => state.enabledCategories.includes(q.category));
    }
    return questions;
  },

  checkGameOver: () => {
    const state = get();
    const activePlayers = state.players.filter(p => !p.isBankrupt);
    
    if (activePlayers.length <= 1) {
      // Determine winner and rank
      const winner = activePlayers[0] || null;
      const isHumanPlayer = winner && !winner.isAI;
      const humanPlayer = state.players.find(p => !p.isAI);
      const isRichest = humanPlayer && winner && humanPlayer.id === winner.id;
      const rank = winner ? state.players.filter(p => !p.isBankrupt).findIndex(p => p.id === winner.id) + 1 : state.players.length;
      
      // Track achievements for game end
      if (isHumanPlayer) {
        onGameWin(rank, isRichest);
      }
      onGameEnd(rank);
      
      // Finalize and save game stats
      get().finalizeGameStats();
      get().saveGameStatsToProfile();
      get().playerProfile(); // Update profile: XP/level, AI battle record, wrong answers
      
      // Publish game end event
      eventBus.publish('game_end', {
        winnerId: winner?.id,
        winnerName: winner?.name,
        winnerIsAI: winner?.isAI,
        rank,
        reason: 'bankruptcy',
        players: state.players.map(p => ({
          id: p.id,
          name: p.name,
          isAI: p.isAI,
          netWorth: calculateNetWorth(p),
        })),
        totalRounds: state.currentRound,
        timestamp: Date.now(),
      });
      
      set({ winner, phase: 'game_over', screen: 'gameover' });
      return;
    }
    
    if (state.currentRound > MAX_ROUNDS) {
      // Rank by net worth
      const ranked = [...state.players].sort((a, b) => {
        const netA = calculateNetWorth(a);
        const netB = calculateNetWorth(b);
        return netB - netA;
      });
      const winner = ranked[0];
      const isHumanPlayer = !winner.isAI;
      const humanPlayer = state.players.find(p => !p.isAI);
      const isRichest = humanPlayer && winner && humanPlayer.id === winner.id;
      const rank = humanPlayer ? ranked.findIndex(p => p.id === humanPlayer.id) + 1 : ranked.length;
      
      // Track achievements for game end
      if (isHumanPlayer) {
        onGameWin(rank, isRichest);
      }
      onGameEnd(rank);
      
      // Finalize and save game stats
      get().finalizeGameStats();
      get().saveGameStatsToProfile();
      get().playerProfile(); // Update profile: XP/level, AI battle record, wrong answers
      
      // Publish game end event
      eventBus.publish('game_end', {
        winnerId: winner?.id,
        winnerName: winner?.name,
        winnerIsAI: winner?.isAI,
        rank,
        reason: 'max_rounds',
        players: state.players.map(p => ({
          id: p.id,
          name: p.name,
          isAI: p.isAI,
          netWorth: calculateNetWorth(p),
        })),
        totalRounds: state.currentRound,
        timestamp: Date.now(),
      });
      
      set({ winner, phase: 'game_over', screen: 'gameover' });
    }
  },
  
  getNextPlayer: () => {
    const state = get();
    let next = (state.currentPlayerIndex + 1) % state.players.length;
    // Skip bankrupt players
    let attempts = 0;
    while (state.players[next].isBankrupt && attempts < state.players.length) {
      next = (next + 1) % state.players.length;
      attempts++;
    }
    return state.players[next];
  },
  
  // AI turn - uses aiBrain for strategic decisions
  aiTurn: () => {
    const state = get();
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer.isAI) return;
    
    // Get AI difficulty (resolve adaptive to actual difficulty)
    const aiIndex = currentPlayer.id - state.humanCount;
    const storedDifficulty = state.aiDifficulties[aiIndex] || AI_DIFFICULTY.NORMAL;
    const difficulty = storedDifficulty === AI_DIFFICULTY.ADAPTIVE 
      ? getAdaptiveDifficulty() 
      : storedDifficulty;
    
    // Show thinking state if delay is enabled
    if (state.aiThinkingDelayEnabled) {
      set({ aiThinking: true });
    }
    
    // Calculate delay (0.5-1s if enabled, otherwise instant)
    const delay = state.aiThinkingDelayEnabled ? 500 + Math.random() * 500 : 50;
    
    setTimeout(() => {
      // After dice roll, use aiBrain to decide buy/build/pass
      if (state.phase === 'buy_property') {
        const currentState = get();
        const currentPlayer = currentState.players[currentState.currentPlayerIndex];
        const currentTile = BOARD_CONFIG[currentPlayer.position];
        
        const action = chooseAIAction(get(), currentState.currentPlayerIndex, difficulty, currentPlayer.personality);
        
        // Record AI decision for learning
        get().recordDecision('buy', {
          tileId: currentTile?.id,
          tileName: currentTile?.name,
          score: action.score,
          action: action.action,
          playerMoney: currentPlayer?.money,
          playerPosition: currentPlayer?.position,
        });
        
        set({ aiThinking: false });

        if (action.action === 'buy') {
          get().buyProperty();
        } else {
          get().passProperty();
        }
      } else {
        // AI automatically rolls dice
        set({ aiThinking: false });
        get().rollDice();
      }
    }, delay);
  },
  
  saveGame: () => {
    const state = get();
    const saveData = {
      players: state.players,
      currentPlayerIndex: state.currentPlayerIndex,
      currentRound: state.currentRound,
      phase: state.phase,
      ageTier: state.ageTier,
      humanCount: state.humanCount,
      aiCount: state.aiCount,
      boardConfig: BOARD_CONFIG.map(t => ({ id: t.id, owner: t.owner, houses: t.houses, mortgaged: t.mortgaged })),
    };
    localStorage.setItem('monopoly3d_save', JSON.stringify(saveData));
  },
  
  loadGame: () => {
    const saved = localStorage.getItem('monopoly3d_save');
    if (!saved) return false;
    try {
      const data = JSON.parse(saved);
      // Restore board config
      data.boardConfig.forEach(savedTile => {
        const tile = BOARD_CONFIG[savedTile.id];
        if (tile) {
          tile.owner = savedTile.owner;
          tile.houses = savedTile.houses;
          tile.mortgaged = savedTile.mortgaged;
        }
      });
      set({
        players: data.players,
        currentPlayerIndex: data.currentPlayerIndex,
        currentRound: data.currentRound,
        phase: data.phase,
        ageTier: data.ageTier,
        humanCount: data.humanCount,
        aiCount: data.aiCount,
        screen: 'playing',
      });
      return true;
    } catch (e) {
      return false;
    }
  },
}));

function getNextPlayerIndex(state) {
  let next = (state.currentPlayerIndex + 1) % state.players.length;
  let attempts = 0;
  while (state.players[next].isBankrupt && attempts < state.players.length) {
    next = (next + 1) % state.players.length;
    attempts++;
  }
  return next;
}

// Returns { nextPlayerIndex, roundIncremented }
function computeNextPlayer(state) {
  const wasLastPlayer = state.currentPlayerIndex === state.players.length - 1;
  return {
    nextPlayerIndex: getNextPlayerIndex(state),
    roundIncremented: wasLastPlayer,
  };
}

// Centralized player advancement — use this everywhere to ensure round increments correctly
function advanceToNextPlayer(state) {
  const { nextPlayerIndex, roundIncremented } = computeNextPlayer(state);
  return {
    currentPlayerIndex: nextPlayerIndex,
    currentRound: roundIncremented ? state.currentRound + 1 : state.currentRound,
  };
}

function computePath(from, to) {
  const path = [];
  if (from === to) return [to];
  // Counterclockwise: decrement position, wrap with + BOARD_SIZE
  let pos = ((from - 1) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
  while (pos !== to) {
    path.push(pos);
    pos = ((pos - 1) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
  }
  path.push(to);
  return path;
}

function calculateRent(tile, owner) {
  const baseIndex = Math.min(tile.houses, 4);
  return tile.rent[baseIndex];
}

function calculateNetWorth(player) {
  let worth = player.money;
  player.properties.forEach(propId => {
    const tile = BOARD_CONFIG[propId];
    worth += tile.mortgaged ? 0 : (tile.price + tile.houses * 50);
  });
  return worth;
}

// Question bank - each tier has 80 questions with category and optional imageUrl
const kindergartenQuestions = [
  // Math - 15 questions
  { id: 'k-math-01', tier: 'K', category: 'math', question: '1 + 1 等于多少？', options: ['1', '2', '3', '4'], correctIndex: 1, imageUrl: null },
  { id: 'k-math-02', tier: 'K', category: 'math', question: '3 + 2 等于多少？', options: ['4', '5', '6', '3'], correctIndex: 1, imageUrl: null },
  { id: 'k-math-03', tier: 'K', category: 'math', question: '5 - 1 等于多少？', options: ['3', '4', '5', '6'], correctIndex: 1, imageUrl: null },
  { id: 'k-math-04', tier: 'K', category: 'math', question: '4 - 2 等于多少？', options: ['1', '2', '3', '4'], correctIndex: 1, imageUrl: null },
  { id: 'k-math-05', tier: 'K', category: 'math', question: '7 + 1 等于多少？', options: ['7', '8', '9', '10'], correctIndex: 1, imageUrl: null },
  { id: 'k-math-06', tier: 'K', category: 'math', question: '5 + 4 等于多少？', options: ['8', '9', '10', '11'], correctIndex: 1, imageUrl: null },
  { id: 'k-math-07', tier: 'K', category: 'math', question: '8 - 4 等于多少？', options: ['2', '3', '4', '5'], correctIndex: 2, imageUrl: null },
  { id: 'k-math-08', tier: 'K', category: 'math', question: '6 - 3 等于多少？', options: ['2', '3', '4', '5'], correctIndex: 1, imageUrl: null },
  { id: 'k-math-09', tier: 'K', category: 'math', question: '2 + 3 等于多少？', options: ['4', '5', '6', '7'], correctIndex: 1, imageUrl: null },
  { id: 'k-math-10', tier: 'K', category: 'math', question: '9 + 1 等于多少？', options: ['9', '10', '11', '8'], correctIndex: 1, imageUrl: null },
  { id: 'k-math-11', tier: 'K', category: 'math', question: '10 - 5 等于多少？', options: ['4', '5', '6', '3'], correctIndex: 1, imageUrl: null },
  { id: 'k-math-12', tier: 'K', category: 'math', question: '3 + 6 等于多少？', options: ['8', '9', '10', '7'], correctIndex: 1, imageUrl: null },
  { id: 'k-math-13', tier: 'K', category: 'math', question: '7 - 2 等于多少？', options: ['4', '5', '6', '3'], correctIndex: 1, imageUrl: null },
  { id: 'k-math-14', tier: 'K', category: 'math', question: '4 + 3 等于多少？', options: ['6', '7', '8', '5'], correctIndex: 1, imageUrl: null },
  { id: 'k-math-15', tier: 'K', category: 'math', question: '8 - 3 等于多少？', options: ['4', '5', '6', '3'], correctIndex: 1, imageUrl: null },
  // Shape - 12 questions
  { id: 'k-shape-01', tier: 'K', category: 'shape', question: '哪个是圆的？', options: ['正方形', '三角形', '圆形', '长方形'], correctIndex: 2, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Circle_-_black_simple.svg/200px-Circle_-_black_simple.svg.png' },
  { id: 'k-shape-02', tier: 'K', category: 'shape', question: '哪个形状有3条边？', options: ['圆形', '正方形', '三角形', '长方形'], correctIndex: 2, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Triangle.svg/200px-Triangle.svg.png' },
  { id: 'k-shape-03', tier: 'K', category: 'shape', question: '哪个是正方形？', options: ['圆形', '三角形', '长方形', '正方形'], correctIndex: 3, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Square_-_black_simple.svg/200px-Square_-_black_simple.svg.png' },
  { id: 'k-shape-04', tier: 'K', category: 'shape', question: '哪个形状像星星？', options: ['圆形', '正方形', '星星形', '三角形'], correctIndex: 2, imageUrl: null },
  { id: 'k-shape-05', tier: 'K', category: 'shape', question: '哪个形状没有角？', options: ['正方形', '三角形', '圆形', '长方形'], correctIndex: 2, imageUrl: null },
  { id: 'k-shape-06', tier: 'K', category: 'shape', question: '哪个是长方形？', options: ['正方形', '圆形', '长方形', '三角形'], correctIndex: 2, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Rectangle.svg/200px-Rectangle.svg.png' },
  { id: 'k-shape-07', tier: 'K', category: 'shape', question: '哪个形状像月亮？', options: ['圆形', '三角形', '月亮形', '正方形'], correctIndex: 2, imageUrl: null },
  { id: 'k-shape-08', tier: 'K', category: 'shape', question: '正方形有几条边？', options: ['3', '4', '5', '6'], correctIndex: 1, imageUrl: null },
  { id: 'k-shape-09', tier: 'K', category: 'shape', question: '三角形有几条边？', options: ['2', '3', '4', '5'], correctIndex: 1, imageUrl: null },
  { id: 'k-shape-10', tier: 'K', category: 'shape', question: '哪个形状有4条边？', options: ['圆形', '三角形', '正方形', '星星'], correctIndex: 2, imageUrl: null },
  { id: 'k-shape-11', tier: 'K', category: 'shape', question: '哪个形状像心形？', options: ['圆形', '心形', '正方形', '三角形'], correctIndex: 1, imageUrl: null },
  { id: 'k-shape-12', tier: 'K', category: 'shape', question: '足球是什么形状？', options: ['方形', '圆形', '三角形', '长方形'], correctIndex: 1, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Circle_-_black_simple.svg/200px-Circle_-_black_simple.svg.png' },
  // Animal - 13 questions
  { id: 'k-animal-01', tier: 'K', category: 'animal', question: '哪个动物会飞？', options: ['狗', '猫', '鸟', '鱼'], correctIndex: 2, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Peregrine_Falcon.jpg/200px-Peregrine_Falcon.jpg' },
  { id: 'k-animal-02', tier: 'K', category: 'animal', question: '哪个动物在水中生活？', options: ['兔子', '鱼', '鸟', '猫'], correctIndex: 1, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Atlantic salmon.jpg/200px-Atlantic_salmon.jpg' },
  { id: 'k-animal-03', tier: 'K', category: 'animal', question: '哪个是哺乳动物？', options: ['鱼', '鸟', '狗', '蛇'], correctIndex: 2, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Lion_waiting_in_Namibia.jpg/200px-Lion_waiting_in_Namibia.jpg' },
  { id: 'k-animal-04', tier: 'K', category: 'animal', question: '哪个动物会游泳？', options: ['猫', '狗', '鱼', '鸟'], correctIndex: 2, imageUrl: null },
  { id: 'k-animal-05', tier: 'K', category: 'animal', question: '哪个动物有翅膀？', options: ['狗', '鱼', '鸟', '猫'], correctIndex: 2, imageUrl: null },
  { id: 'k-animal-06', tier: 'K', category: 'animal', question: '哪个动物跑得快？', options: ['乌龟', '兔子', '鱼', '青蛙'], correctIndex: 1, imageUrl: null },
  { id: 'k-animal-07', tier: 'K', category: 'animal', question: '哪个动物爱吃胡萝卜？', options: ['猫', '兔子', '狗', '鱼'], correctIndex: 1, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Oryctolagus_cuniculus_Rabbit.jpg/200px-Oryctolagus_cuniculus_Rabbit.jpg' },
  { id: 'k-animal-08', tier: 'K', category: 'animal', question: '哪个动物会学人说话？', options: ['狗', '鹦鹉', '猫', '鱼'], correctIndex: 1, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Psitacciformes_01.jpg/200px-Psitacciformes_01.jpg' },
  { id: 'k-animal-09', tier: 'K', category: 'animal', question: '哪个动物有条纹？', options: ['熊猫', '老虎', '狗', '兔子'], correctIndex: 1, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Walking_tiger_female.jpg/200px-Walking_tiger_female.jpg' },
  { id: 'k-animal-10', tier: 'K', category: 'animal', question: '哪个动物是国宝？', options: ['老虎', '熊猫', '狮子', '猴子'], correctIndex: 1, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Giant_Panda_with_cub.jpg/200px-Giant_Panda_with_cub.jpg' },
  { id: 'k-animal-11', tier: 'K', category: 'animal', question: '哪个动物咩咩叫？', options: ['牛', '羊', '马', '猪'], correctIndex: 1, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Ovis_orientalis_aries_01.jpg/200px-Ovis_orientalis_aries_01.jpg' },
  { id: 'k-animal-12', tier: 'K', category: 'animal', question: '哪个动物会下蛋？', options: ['狗', '猫', '鸡', '牛'], correctIndex: 2, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Gallus_gallus_domesticus_on_the_forest.jpg/200px-Gallus_gallus_domesticus_on_the_forest.jpg' },
  { id: 'k-animal-13', tier: 'K', category: 'animal', question: '哪个动物有长鼻子？', options: ['狗', '大象', '猫', '兔子'], correctIndex: 1, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/African_Bush_Elephant.jpg/200px-African_Bush_Elephant.jpg' },
  // Emotion - 10 questions
  { id: 'k-emotion-01', tier: 'K', category: 'emotion', question: '开心时我们会怎样？', options: ['哭', '笑', '生气', '害怕'], correctIndex: 1, imageUrl: null },
  { id: 'k-emotion-02', tier: 'K', category: 'emotion', question: '难过时我们会怎样？', options: ['大笑', '大哭', '唱歌', '跳舞'], correctIndex: 1, imageUrl: null },
  { id: 'k-emotion-03', tier: 'K', category: 'emotion', question: '生气时脸会怎样？', options: ['变红', '变蓝', '变绿', '变白'], correctIndex: 0, imageUrl: null },
  { id: 'k-emotion-04', tier: 'K', category: 'emotion', question: '害怕时我们会怎样？', options: ['大笑', '大哭', '尖叫', '唱歌'], correctIndex: 2, imageUrl: null },
  { id: 'k-emotion-05', tier: 'K', category: 'emotion', question: '惊喜时我们会怎样？', options: ['生气', '开心', '难过', '害怕'], correctIndex: 1, imageUrl: null },
  { id: 'k-emotion-06', tier: 'K', category: 'emotion', question: '哪个表情是笑脸？', options: ['😢', '😄', '😠', '😨'], correctIndex: 1, imageUrl: null },
  { id: 'k-emotion-07', tier: 'K', category: 'emotion', question: '哪个表情是哭脸？', options: ['😄', '😢', '😃', '😊'], correctIndex: 1, imageUrl: null },
  { id: 'k-emotion-08', tier: 'K', category: 'emotion', question: '哪个表情是生气？', options: ['😄', '😢', '😠', '😮'], correctIndex: 2, imageUrl: null },
  { id: 'k-emotion-09', tier: 'K', category: 'emotion', question: '哪个表情是惊讶？', options: ['😄', '😢', '😮', '😴'], correctIndex: 2, imageUrl: null },
  { id: 'k-emotion-10', tier: 'K', category: 'emotion', question: '睡觉时是什么表情？', options: ['😄', '😢', '😴', '😮'], correctIndex: 2, imageUrl: null },
  // Life - 10 questions
  { id: 'k-life-01', tier: 'K', category: 'life', question: '哪个是交通工具？', options: ['桌子', '汽车', '椅子', '床'], correctIndex: 1, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/2013-07-19_14_28_39_Fiat_500_in_Engelberg.jpg/200px-2013-07-19_14_28_39_Fiat_500_in_Engelberg.jpg' },
  { id: 'k-life-02', tier: 'K', category: 'life', question: '哪个是冷的？', options: ['太阳', '冰淇淋', '火', '烤箱'], correctIndex: 1, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Chocolate-1.jpg/200px-Chocolate-1.jpg' },
  { id: 'k-life-03', tier: 'K', category: 'life', question: '哪个是热的？', options: ['冰', '火', '水', '石头'], correctIndex: 1, imageUrl: null },
  { id: 'k-life-04', tier: 'K', category: 'life', question: '早上我们吃什么？', options: ['午饭', '早饭', '晚饭', '点心'], correctIndex: 1, imageUrl: null },
  { id: 'k-life-05', tier: 'K', category: 'life', question: '哪个季节很热？', options: ['春天', '夏天', '秋天', '冬天'], correctIndex: 1, imageUrl: null },
  { id: 'k-life-06', tier: 'K', category: 'life', question: '哪个季节会下雪？', options: ['春天', '夏天', '秋天', '冬天'], correctIndex: 3, imageUrl: null },
  { id: 'k-life-07', tier: 'K', category: 'life', question: '我们用什么来写字？', options: ['筷子', '铅笔', '勺子', '叉子'], correctIndex: 1, imageUrl: null },
  { id: 'k-life-08', tier: 'K', category: 'life', question: '我们用什么来看书？', options: ['手机', '电视', '眼睛', '电脑'], correctIndex: 2, imageUrl: null },
  { id: 'k-life-09', tier: 'K', category: 'life', question: '哪个是水果？', options: ['苹果', '土豆', '胡萝卜', '白菜'], correctIndex: 0, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Golden_Delicious.jpg/200px-Golden_Delicious.jpg' },
  { id: 'k-life-10', tier: 'K', category: 'life', question: '哪个是蔬菜？', options: ['苹果', '香蕉', '胡萝卜', '葡萄'], correctIndex: 2, imageUrl: null },
  // Color - 10 questions
  { id: 'k-color-01', tier: 'K', category: 'life', question: '太阳是什么颜色？', options: ['红色', '蓝色', '绿色', '黑色'], correctIndex: 0, imageUrl: null },
  { id: 'k-color-02', tier: 'K', category: 'life', question: '天空是什么颜色？', options: ['红色', '绿色', '蓝色', '黄色'], correctIndex: 2, imageUrl: null },
  { id: 'k-color-03', tier: 'K', category: 'life', question: '哪个是红色？', options: ['苹果', '香蕉', '叶子', '天空'], correctIndex: 0, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Golden_Delicious.jpg/200px-Golden_Delicious.jpg' },
  { id: 'k-color-04', tier: 'K', category: 'life', question: '哪个是黄色的水果？', options: ['苹果', '香蕉', '葡萄', '西瓜'], correctIndex: 1, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Banana.jpg/200px-Banana.jpg' },
  { id: 'k-color-05', tier: 'K', category: 'life', question: '叶子是什么颜色？', options: ['红色', '黄色', '绿色', '蓝色'], correctIndex: 2, imageUrl: null },
  { id: 'k-color-06', tier: 'K', category: 'life', question: '哪个是蓝色的？', options: ['太阳', '大海', '草地', '香蕉'], correctIndex: 1, imageUrl: null },
  { id: 'k-color-07', tier: 'K', category: 'life', question: '哪个是白色的？', options: ['煤炭', '雪', '泥土', '头发'], correctIndex: 1, imageUrl: null },
  { id: 'k-color-08', tier: 'K', category: 'life', question: '哪个是黑色的？', options: ['雪', '煤炭', '白云', '白纸'], correctIndex: 1, imageUrl: null },
  { id: 'k-color-09', tier: 'K', category: 'life', question: '橙子是什么颜色？', options: ['红色', '橙色', '绿色', '紫色'], correctIndex: 1, imageUrl: null },
  { id: 'k-color-10', tier: 'K', category: 'life', question: '哪个是绿色的？', options: ['太阳', '叶子', '天空', '草莓'], correctIndex: 1, imageUrl: null },
  // Time - 10 questions
  { id: 'k-time-01', tier: 'K', category: 'time', question: '早上太阳从哪里升起？', options: ['西边', '南边', '东边', '北边'], correctIndex: 2, imageUrl: null },
  { id: 'k-time-02', tier: 'K', category: 'time', question: '晚上天上有什么？', options: ['太阳', '月亮', '云', '鸟'], correctIndex: 1, imageUrl: null },
  { id: 'k-time-03', tier: 'K', category: 'time', question: '一年有几个季节？', options: ['2', '3', '4', '5'], correctIndex: 2, imageUrl: null },
  { id: 'k-time-04', tier: 'K', category: 'time', question: '哪个季节树叶会变黄？', options: ['春天', '夏天', '秋天', '冬天'], correctIndex: 2, imageUrl: null },
  { id: 'k-time-05', tier: 'K', category: 'time', question: '哪个季节花会开？', options: ['冬天', '秋天', '春天', '所有季节'], correctIndex: 2, imageUrl: null },
  { id: 'k-time-06', tier: 'K', category: 'time', question: '一天有几顿饭？', options: ['2', '3', '4', '5'], correctIndex: 1, imageUrl: null },
  { id: 'k-time-07', tier: 'K', category: 'time', question: '早上我们吃什么？', options: ['午饭', '早饭', '晚饭', '宵夜'], correctIndex: 1, imageUrl: null },
  { id: 'k-time-08', tier: 'K', category: 'time', question: '中午太阳在哪里？', options: ['很低', '很高', '不见', '在月亮上'], correctIndex: 1, imageUrl: null },
  { id: 'k-time-09', tier: 'K', category: 'time', question: '哪个季节会下雪？', options: ['春天', '夏天', '秋天', '冬天'], correctIndex: 3, imageUrl: null },
  { id: 'k-time-10', tier: 'K', category: 'time', question: '哪个季节白天最长？', options: ['春天', '夏天', '秋天', '冬天'], correctIndex: 1, imageUrl: null },
];

const primary1_2Questions = [
  // Math - 20 questions
  { id: 'p12-math-01', tier: 'P1-2', category: 'math', question: '12 + 8 等于多少？', options: ['18', '19', '20', '21'], correctIndex: 2, imageUrl: null },
  { id: 'p12-math-02', tier: 'P1-2', category: 'math', question: '25 - 7 等于多少？', options: ['16', '17', '18', '19'], correctIndex: 2, imageUrl: null },
  { id: 'p12-math-03', tier: 'P1-2', category: 'math', question: '3 × 4 等于多少？', options: ['10', '11', '12', '13'], correctIndex: 2, imageUrl: null },
  { id: 'p12-math-04', tier: 'P1-2', category: 'math', question: '20 ÷ 4 等于多少？', options: ['4', '5', '6', '7'], correctIndex: 1, imageUrl: null },
  { id: 'p12-math-05', tier: 'P1-2', category: 'math', question: '45 + 55 等于多少？', options: ['99', '100', '101', '98'], correctIndex: 1, imageUrl: null },
  { id: 'p12-math-06', tier: 'P1-2', category: 'math', question: '5 × 6 等于多少？', options: ['28', '29', '30', '31'], correctIndex: 2, imageUrl: null },
  { id: 'p12-math-07', tier: 'P1-2', category: 'math', question: '99 - 33 等于多少？', options: ['64', '65', '66', '67'], correctIndex: 2, imageUrl: null },
  { id: 'p12-math-08', tier: 'P1-2', category: 'math', question: '2 × 9 等于多少？', options: ['16', '17', '18', '19'], correctIndex: 2, imageUrl: null },
  { id: 'p12-math-09', tier: 'P1-2', category: 'math', question: '15 + 27 等于多少？', options: ['40', '41', '42', '43'], correctIndex: 2, imageUrl: null },
  { id: 'p12-math-10', tier: 'P1-2', category: 'math', question: '6 × 7 等于多少？', options: ['40', '41', '42', '43'], correctIndex: 2, imageUrl: null },
  { id: 'p12-math-11', tier: 'P1-2', category: 'math', question: '100 - 45 等于多少？', options: ['53', '54', '55', '56'], correctIndex: 2, imageUrl: null },
  { id: 'p12-math-12', tier: 'P1-2', category: 'math', question: '72 ÷ 8 等于多少？', options: ['7', '8', '9', '10'], correctIndex: 2, imageUrl: null },
  { id: 'p12-math-13', tier: 'P1-2', category: 'math', question: '8 × 8 等于多少？', options: ['62', '63', '64', '65'], correctIndex: 2, imageUrl: null },
  { id: 'p12-math-14', tier: 'P1-2', category: 'math', question: '36 + 47 等于多少？', options: ['82', '83', '84', '85'], correctIndex: 1, imageUrl: null },
  { id: 'p12-math-15', tier: 'P1-2', category: 'math', question: '7 × 8 等于多少？', options: ['54', '55', '56', '57'], correctIndex: 2, imageUrl: null },
  { id: 'p12-math-16', tier: 'P1-2', category: 'math', question: '91 - 28 等于多少？', options: ['61', '62', '63', '64'], correctIndex: 2, imageUrl: null },
  { id: 'p12-math-17', tier: 'P1-2', category: 'math', question: '56 ÷ 7 等于多少？', options: ['6', '7', '8', '9'], correctIndex: 2, imageUrl: null },
  { id: 'p12-math-18', tier: 'P1-2', category: 'math', question: '9 × 9 等于多少？', options: ['80', '81', '82', '83'], correctIndex: 1, imageUrl: null },
  { id: 'p12-math-19', tier: 'P1-2', category: 'math', question: '78 + 34 等于多少？', options: ['110', '111', '112', '113'], correctIndex: 2, imageUrl: null },
  { id: 'p12-math-20', tier: 'P1-2', category: 'math', question: '84 ÷ 12 等于多少？', options: ['6', '7', '8', '9'], correctIndex: 2, imageUrl: null },
  // Time - 12 questions
  { id: 'p12-time-01', tier: 'P1-2', category: 'time', question: '一年有多少个月？', options: ['10', '11', '12', '13'], correctIndex: 2, imageUrl: null },
  { id: 'p12-time-02', tier: 'P1-2', category: 'time', question: '一个星期有多少天？', options: ['5', '6', '7', '8'], correctIndex: 2, imageUrl: null },
  { id: 'p12-time-03', tier: 'P1-2', category: 'time', question: '一年有几个季节？', options: ['2', '3', '4', '5'], correctIndex: 2, imageUrl: null },
  { id: 'p12-time-04', tier: 'P1-2', category: 'time', question: '1小时有多少分钟？', options: ['30', '50', '60', '100'], correctIndex: 2, imageUrl: null },
  { id: 'p12-time-05', tier: 'P1-2', category: 'time', question: '今天是星期几？', options: ['星期一', '星期二', '星期三', '星期四'], correctIndex: 0, imageUrl: null },
  { id: 'p12-time-06', tier: 'P1-2', category: 'time', question: '哪个月份有31天？', options: ['四月', '六月', '九月', '一月'], correctIndex: 3, imageUrl: null },
  { id: 'p12-time-07', tier: 'P1-2', category: 'time', question: '2月通常有多少天？', options: ['28', '29', '30', '31'], correctIndex: 1, imageUrl: null },
  { id: 'p12-time-08', tier: 'P1-2', category: 'time', question: '下午3点用24小时制怎么表示？', options: ['13:00', '14:00', '15:00', '16:00'], correctIndex: 2, imageUrl: null },
  { id: 'p12-time-09', tier: 'P1-2', category: 'time', question: '半小时有多少分钟？', options: ['15', '20', '30', '45'], correctIndex: 2, imageUrl: null },
  { id: 'p12-time-10', tier: 'P1-2', category: 'time', question: '哪个季节白天最短？', options: ['春天', '夏天', '秋天', '冬天'], correctIndex: 3, imageUrl: null },
  { id: 'p12-time-11', tier: 'P1-2', category: 'time', question: '1分钟有多少秒？', options: ['30', '60', '90', '100'], correctIndex: 1, imageUrl: null },
  { id: 'p12-time-12', tier: 'P1-2', category: 'time', question: '一年有多少天？', options: ['365', '360', '355', '370'], correctIndex: 0, imageUrl: null },
  // Geography - 12 questions
  { id: 'p12-geo-01', tier: 'P1-2', category: 'geography', question: '中国首都是哪里？', options: ['上海', '北京', '广州', '深圳'], correctIndex: 1, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/24701-nature-natural-beauty.jpg/200px-24701-nature-natural-beauty.jpg' },
  { id: 'p12-geo-02', tier: 'P1-2', category: 'geography', question: '太阳从哪里升起？', options: ['西边', '南边', '东边', '北边'], correctIndex: 2, imageUrl: null },
  { id: 'p12-geo-03', tier: 'P1-2', category: 'geography', question: '地球是什么形状？', options: ['方形', '三角形', '圆形', '星形'], correctIndex: 2, imageUrl: null },
  { id: 'p12-geo-04', tier: 'P1-2', category: 'geography', question: '我们生活在哪个星球上？', options: ['火星', '月球', '地球', '太阳'], correctIndex: 2, imageUrl: null },
  { id: 'p12-geo-05', tier: 'P1-2', category: 'geography', question: '大海是什么颜色？', options: ['绿色', '黄色', '蓝色', '红色'], correctIndex: 2, imageUrl: null },
  { id: 'p12-geo-06', tier: 'P1-2', category: 'geography', question: '山很高吗？', options: ['不高', '很低', '很高', '没有树'], correctIndex: 2, imageUrl: null },
  { id: 'p12-geo-07', tier: 'P1-2', category: 'geography', question: '哪个是大洲？', options: ['中国', '北京', '亚洲', '上海'], correctIndex: 2, imageUrl: null },
  { id: 'p12-geo-08', tier: 'P1-2', category: 'geography', question: '天上的云在哪里？', options: ['地下', '水里', '天上', '山里'], correctIndex: 2, imageUrl: null },
  { id: 'p12-geo-09', tier: 'P1-2', category: 'geography', question: '哪个是中国的河流？', options: ['黄河', '亚马逊河', '尼罗河', '多瑙河'], correctIndex: 0, imageUrl: null },
  { id: 'p12-geo-10', tier: 'P1-2', category: 'geography', question: '世界上最大的海洋是哪个？', options: ['大西洋', '印度洋', '北冰洋', '太平洋'], correctIndex: 3, imageUrl: null },
  { id: 'p12-geo-11', tier: 'P1-2', category: 'geography', question: '北极在哪里？', options: ['很热', '很冷', '很温暖', '不下雪'], correctIndex: 1, imageUrl: null },
  { id: 'p12-geo-12', tier: 'P1-2', category: 'geography', question: '哪个不是天气现象？', options: ['下雨', '下雪', '学习', '刮风'], correctIndex: 2, imageUrl: null },
  // Science - 12 questions
  { id: 'p12-science-01', tier: 'P1-2', category: 'science', question: '哪个是哺乳动物？', options: ['鱼', '鸟', '狗', '蛇'], correctIndex: 2, imageUrl: null },
  { id: 'p12-science-02', tier: 'P1-2', category: 'science', question: '水的化学式是什么？', options: ['O2', 'CO2', 'H2O', 'NaCl'], correctIndex: 2, imageUrl: null },
  { id: 'p12-science-03', tier: 'P1-2', category: 'science', question: '植物需要什么来生长？', options: ['石头', '水', '塑料', '铁'], correctIndex: 1, imageUrl: null },
  { id: 'p12-science-04', tier: 'P1-2', category: 'science', question: '太阳是什么？', options: ['行星', '恒星', '卫星', '石头'], correctIndex: 1, imageUrl: null },
  { id: 'p12-science-05', tier: 'P1-2', category: 'science', question: '人有多少根手指？', options: ['5', '10', '15', '20'], correctIndex: 1, imageUrl: null },
  { id: 'p12-science-06', tier: 'P1-2', category: 'science', question: '哪个是昆虫？', options: ['狗', '鱼', '蝴蝶', '猫'], correctIndex: 2, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Atrophaneura_noor.jpg/200px-Atrophaneura_noor.jpg' },
  { id: 'p12-science-07', tier: 'P1-2', category: 'science', question: '植物的根在哪里？', options: ['天上', '土里', '水里', '云上'], correctIndex: 1, imageUrl: null },
  { id: 'p12-science-08', tier: 'P1-2', category: 'science', question: '月亮会发光吗？', options: ['会', '不会', '有时候', '不知道'], correctIndex: 1, imageUrl: null },
  { id: 'p12-science-09', tier: 'P1-2', category: 'science', question: '哪个是鸟类的特征？', options: ['有鳞片', '有羽毛', '有壳', '有毛发'], correctIndex: 1, imageUrl: null },
  { id: 'p12-science-10', tier: 'P1-2', category: 'science', question: '什么让植物变绿？', options: ['阳光', '泥土', '石头', '水'], correctIndex: 0, imageUrl: null },
  { id: 'p12-science-11', tier: 'P1-2', category: 'science', question: '人的心脏在哪里？', options: ['头上', '肚子上', '胸口', '背上'], correctIndex: 2, imageUrl: null },
  { id: 'p12-science-12', tier: 'P1-2', category: 'science', question: '哪个动物是冷血的？', options: ['狗', '猫', '蛇', '兔子'], correctIndex: 2, imageUrl: null },
  // Reading - 12 questions
  { id: 'p12-reading-01', tier: 'P1-2', category: 'reading', question: '哪个是汉字？', options: ['ABC', '123', '中', '@#'], correctIndex: 2, imageUrl: null },
  { id: 'p12-reading-02', tier: 'P1-2', category: 'reading', question: '一本书有多少页？', options: ['很多', '1页', '10页', '没有'], correctIndex: 0, imageUrl: null },
  { id: 'p12-reading-03', tier: 'P1-2', category: 'reading', question: '图书馆是做什么的地方？', options: ['吃饭', '看书', '睡觉', '运动'], correctIndex: 1, imageUrl: null },
  { id: 'p12-reading-04', tier: 'P1-2', category: 'reading', question: '哪个是标点符号？', options: ['中', '国', '。', '人'], correctIndex: 2, imageUrl: null },
  { id: 'p12-reading-05', tier: 'P1-2', category: 'reading', question: '我们用什么来写字？', options: ['嘴', '脚', '手', '耳朵'], correctIndex: 2, imageUrl: null },
  { id: 'p12-reading-06', tier: 'P1-2', category: 'reading', question: '故事书里有什么？', options: ['数字', '图片和文字', '只有图片', '只有数字'], correctIndex: 1, imageUrl: null },
  { id: 'p12-reading-07', tier: 'P1-2', category: 'reading', question: '哪个字母不是汉字？', options: ['中', '人', 'A', '大'], correctIndex: 2, imageUrl: null },
  { id: 'p12-reading-08', tier: 'P1-2', category: 'reading', question: '老师用什么来教课？', options: ['玩具', '黑板', '床', '冰箱'], correctIndex: 1, imageUrl: null },
  { id: 'p12-reading-09', tier: 'P1-2', category: 'reading', question: '哪个是写字的工具？', options: ['尺子', '橡皮', '铅笔', '卷笔刀'], correctIndex: 2, imageUrl: null },
  { id: 'p12-reading-10', tier: 'P1-2', category: 'reading', question: '我们的国家叫什么？', options: ['中国', '美国', '英国', '法国'], correctIndex: 0, imageUrl: null },
  { id: 'p12-reading-11', tier: 'P1-2', category: 'reading', question: '书是用来看什么的？', options: ['走路', '写字', '阅读', '吃饭'], correctIndex: 2, imageUrl: null },
  { id: 'p12-reading-12', tier: 'P1-2', category: 'reading', question: '哪个不是学习用品？', options: ['铅笔', '橡皮', '书包', '冰激凌'], correctIndex: 3, imageUrl: null },
  // Life - 12 questions
  { id: 'p12-life-01', tier: 'P1-2', category: 'life', question: '我们应该在什么时候睡觉？', options: ['早上', '中午', '晚上', '下午'], correctIndex: 2, imageUrl: null },
  { id: 'p12-life-02', tier: 'P1-2', category: 'life', question: '小学生每天应该睡几个小时？', options: ['4', '6', '8-10', '12'], correctIndex: 2, imageUrl: null },
  { id: 'p12-life-03', tier: 'P1-2', category: 'life', question: '饭前应该做什么？', options: ['吃零食', '洗手', '跑步', '睡觉'], correctIndex: 1, imageUrl: null },
  { id: 'p12-life-04', tier: 'P1-2', category: 'life', question: '每天应该刷几次牙？', options: ['0', '1', '2', '5'], correctIndex: 2, imageUrl: null },
  { id: 'p12-life-05', tier: 'P1-2', category: 'life', question: '运动对我们有什么好处？', options: ['变胖', '变强壮', '生病', '不想吃饭'], correctIndex: 1, imageUrl: null },
  { id: 'p12-life-06', tier: 'P1-2', category: 'life', question: '过马路应该怎么做？', options: ['到处跑', '看红绿灯', '闭眼', '跳着走'], correctIndex: 1, imageUrl: null },
  { id: 'p12-life-07', tier: 'P1-2', category: 'life', question: '陌生人给你糖你应该怎么做？', options: ['接受', '拒绝并走开', '分享', '吃掉'], correctIndex: 1, imageUrl: null },
  { id: 'p12-life-08', tier: 'P1-2', category: 'life', question: '垃圾应该扔在哪里？', options: ['地上', '垃圾桶', '水里', '窗外'], correctIndex: 1, imageUrl: null },
  { id: 'p12-life-09', tier: 'P1-2', category: 'life', question: '上课时应该怎么做？', options: ['睡觉', '讲话', '认真听讲', '吃东西'], correctIndex: 2, imageUrl: null },
  { id: 'p12-life-10', tier: 'P1-2', category: 'life', question: '和同学吵架了应该怎么办？', options: ['打架', '骂人', '沟通解决', '不理人'], correctIndex: 2, imageUrl: null },
  { id: 'p12-life-11', tier: 'P1-2', category: 'life', question: '水应该怎么喝？', options: ['一次喝很多', '少量多次', '不渴不喝', '只喝饮料'], correctIndex: 1, imageUrl: null },
  { id: 'p12-life-12', tier: 'P1-2', category: 'life', question: '保护环境我们可以做什么？', options: ['乱扔垃圾', '节约用水', '浪费纸', '污染空气'], correctIndex: 1, imageUrl: null },
];

const primary3_4Questions = [
  // Math - 20 questions
  { id: 'p34-math-01', tier: 'P3-4', category: 'math', question: '125 × 8 等于多少？', options: ['1000', '1001', '999', '1002'], correctIndex: 0, imageUrl: null },
  { id: 'p34-math-02', tier: 'P3-4', category: 'math', question: '1/2 + 1/4 等于多少？', options: ['2/6', '3/4', '1/2', '1/4'], correctIndex: 1, imageUrl: null },
  { id: 'p34-math-03', tier: 'P3-4', category: 'math', question: '360 ÷ 12 等于多少？', options: ['28', '29', '30', '31'], correctIndex: 2, imageUrl: null },
  { id: 'p34-math-04', tier: 'P3-4', category: 'math', question: '3/5 - 1/5 等于多少？', options: ['1/5', '2/5', '3/5', '4/5'], correctIndex: 1, imageUrl: null },
  { id: 'p34-math-05', tier: 'P3-4', category: 'math', question: '999 × 7 等于多少？', options: ['6993', '6994', '6992', '6995'], correctIndex: 0, imageUrl: null },
  { id: 'p34-math-06', tier: 'P3-4', category: 'math', question: '0.25 + 0.75 等于多少？', options: ['0.99', '1.0', '1.1', '1.01'], correctIndex: 1, imageUrl: null },
  { id: 'p34-math-07', tier: 'P3-4', category: 'math', question: '72 × 15 等于多少？', options: ['1060', '1070', '1080', '1090'], correctIndex: 2, imageUrl: null },
  { id: 'p34-math-08', tier: 'P3-4', category: 'math', question: '9999 ÷ 9 等于多少？', options: ['1110', '1111', '1112', '1109'], correctIndex: 1, imageUrl: null },
  { id: 'p34-math-09', tier: 'P3-4', category: 'math', question: '2/3 × 6 等于多少？', options: ['3', '4', '5', '6'], correctIndex: 1, imageUrl: null },
  { id: 'p34-math-10', tier: 'P3-4', category: 'math', question: '0.5 × 0.4 等于多少？', options: ['0.2', '0.02', '2.0', '0.1'], correctIndex: 0, imageUrl: null },
  { id: 'p34-math-11', tier: 'P3-4', category: 'math', question: '3/4 + 1/4 等于多少？', options: ['1/4', '2/4', '1', '4/8'], correctIndex: 2, imageUrl: null },
  { id: 'p34-math-12', tier: 'P3-4', category: 'math', question: '1000 ÷ 125 等于多少？', options: ['6', '7', '8', '9'], correctIndex: 2, imageUrl: null },
  { id: 'p34-math-13', tier: 'P3-4', category: 'math', question: '0.75 - 0.25 等于多少？', options: ['0.5', '0.4', '0.6', '0.3'], correctIndex: 0, imageUrl: null },
  { id: 'p34-math-14', tier: 'P3-4', category: 'math', question: '456 + 789 等于多少？', options: ['1245', '1244', '1243', '1246'], correctIndex: 0, imageUrl: null },
  { id: 'p34-math-15', tier: 'P3-4', category: 'math', question: '5/8 - 1/8 等于多少？', options: ['4/8', '6/8', '1/8', '7/8'], correctIndex: 0, imageUrl: null },
  { id: 'p34-math-16', tier: 'P3-4', category: 'math', question: '234 × 5 等于多少？', options: ['1170', '1160', '1180', '1150'], correctIndex: 0, imageUrl: null },
  { id: 'p34-math-17', tier: 'P3-4', category: 'math', question: '1 - 3/7 等于多少？', options: ['2/7', '3/7', '4/7', '5/7'], correctIndex: 2, imageUrl: null },
  { id: 'p34-math-18', tier: 'P3-4', category: 'math', question: '567 - 234 等于多少？', options: ['333', '332', '334', '331'], correctIndex: 0, imageUrl: null },
  { id: 'p34-math-19', tier: 'P3-4', category: 'math', question: '0.1 × 0.2 等于多少？', options: ['0.02', '0.2', '0.3', '0.01'], correctIndex: 0, imageUrl: null },
  { id: 'p34-math-20', tier: 'P3-4', category: 'math', question: '4/9 + 2/9 等于多少？', options: ['5/9', '6/9', '7/9', '8/9'], correctIndex: 1, imageUrl: null },
  // Science - 15 questions
  { id: 'p34-science-01', tier: 'P3-4', category: 'science', question: '地球到太阳的距离大约是多少？', options: ['1500公里', '15000公里', '150万公里', '1.5亿公里'], correctIndex: 3, imageUrl: null },
  { id: 'p34-science-02', tier: 'P3-4', category: 'science', question: '光每秒传播约多少公里？', options: ['3万', '30万', '300万', '3000万'], correctIndex: 1, imageUrl: null },
  { id: 'p34-science-03', tier: 'P3-4', category: 'science', question: '植物进行光合作用需要什么？', options: ['氧气', '二氧化碳', '氮气', '氦气'], correctIndex: 1, imageUrl: null },
  { id: 'p34-science-04', tier: 'P3-4', category: 'science', question: '人体最大的器官是什么？', options: ['心脏', '肝脏', '皮肤', '大脑'], correctIndex: 2, imageUrl: null },
  { id: 'p34-science-05', tier: 'P3-4', category: 'science', question: '水的沸点是多少摄氏度？', options: ['90', '100', '110', '120'], correctIndex: 1, imageUrl: null },
  { id: 'p34-science-06', tier: 'P3-4', category: 'science', question: '太阳系有几颗行星？', options: ['7', '8', '9', '10'], correctIndex: 1, imageUrl: null },
  { id: 'p34-science-07', tier: 'P3-4', category: 'science', question: '地球的自转周期是多少小时？', options: ['12', '24', '36', '48'], correctIndex: 1, imageUrl: null },
  { id: 'p34-science-08', tier: 'P3-4', category: 'science', question: '声音在空气中传播还是真空中？', options: ['真空中', '空气中', '都不行', '都行'], correctIndex: 1, imageUrl: null },
  { id: 'p34-science-09', tier: 'P3-4', category: 'science', question: '人体有多少块骨头？', options: ['106', '206', '306', '406'], correctIndex: 1, imageUrl: null },
  { id: 'p34-science-10', tier: 'P3-4', category: 'science', question: '光是什么组成的？', options: ['粒子', '波', '两者都是', '都不是'], correctIndex: 2, imageUrl: null },
  { id: 'p34-science-11', tier: 'P3-4', category: 'science', question: '植物的蒸腾作用通过哪里？', options: ['根', '茎', '叶', '花'], correctIndex: 2, imageUrl: null },
  { id: 'p34-science-12', tier: 'P3-4', category: 'science', question: '冰融化成水是什么变化？', options: ['化学变化', '物理变化', '生物变化', '无变化'], correctIndex: 1, imageUrl: null },
  { id: 'p34-science-13', tier: 'P3-4', category: 'science', question: '月球绕着地球转还是地球绕着月球转？', options: ['地球绕月球', '月球绕地球', '互相绕', '都不绕'], correctIndex: 1, imageUrl: null },
  { id: 'p34-science-14', tier: 'P3-4', category: 'science', question: '大气层的主要成分是什么？', options: ['氧气', '二氧化碳', '氮气', '氢气'], correctIndex: 2, imageUrl: null },
  { id: 'p34-science-15', tier: 'P3-4', category: 'science', question: '哪种物质最轻？', options: ['铁', '水', '空气', '木头'], correctIndex: 2, imageUrl: null },
  // Geography - 12 questions
  { id: 'p34-geo-01', tier: 'P3-4', category: 'geography', question: '中国有多少个省份？', options: ['22', '23', '24', '25'], correctIndex: 1, imageUrl: null },
  { id: 'p34-geo-02', tier: 'P3-4', category: 'geography', question: '世界上最高的山是什么？', options: ['乔戈里峰', '珠穆朗玛峰', '干城章嘉峰', '洛子峰'], correctIndex: 1, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Everest_North_Face_Toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg/200px-Everest_North_Face_Toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg' },
  { id: 'p34-geo-03', tier: 'P3-4', category: 'geography', question: '世界上最长的河是什么？', options: ['亚马逊河', '尼罗河', '长江', '密西西比河'], correctIndex: 1, imageUrl: null },
  { id: 'p34-geo-04', tier: 'P3-4', category: 'geography', question: '七大洲不包括哪个？', options: ['亚洲', '欧洲', '月球', '非洲'], correctIndex: 2, imageUrl: null },
  { id: 'p34-geo-05', tier: 'P3-4', category: 'geography', question: '赤道把地球分为什么两半？', options: ['东西半球', '南北半球', '早晚半球', '阴阳半球'], correctIndex: 1, imageUrl: null },
  { id: 'p34-geo-06', tier: 'P3-4', category: 'geography', question: '日本位于哪个洲？', options: ['亚洲', '欧洲', '非洲', '北美洲'], correctIndex: 0, imageUrl: null },
  { id: 'p34-geo-07', tier: 'P3-4', category: 'geography', question: '世界上最深的地方在哪里？', options: ['大西洋', '北冰洋', '太平洋', '印度洋'], correctIndex: 2, imageUrl: null },
  { id: 'p34-geo-08', tier: 'P3-4', category: 'geography', question: '珠穆朗玛峰位于哪个国家？', options: ['尼泊尔', '中国', '印度', '巴基斯坦'], correctIndex: 1, imageUrl: null },
  { id: 'p34-geo-09', tier: 'P3-4', category: 'geography', question: '黄河流入哪个海？', options: ['黄海', '渤海', '东海', '南海'], correctIndex: 1, imageUrl: null },
  { id: 'p34-geo-10', tier: 'P3-4', category: 'geography', question: '澳大利亚的首都是哪里？', options: ['悉尼', '墨尔本', '堪培拉', '布里斯班'], correctIndex: 2, imageUrl: null },
  { id: 'p34-geo-11', tier: 'P3-4', category: 'geography', question: '世界上最大的沙漠是哪个？', options: ['戈壁沙漠', '撒哈拉沙漠', '阿拉伯沙漠', '克孜勒库姆沙漠'], correctIndex: 1, imageUrl: null },
  { id: 'p34-geo-12', tier: 'P3-4', category: 'geography', question: '南北极圈内的地区叫什么？', options: ['热带', '温带', '寒带', '亚热带'], correctIndex: 2, imageUrl: null },
  // Reading - 12 questions
  { id: 'p34-reading-01', tier: 'P3-4', category: 'reading', question: '《西游记》的作者是谁？', options: ['曹雪芹', '施耐庵', '罗贯中', '吴承恩'], correctIndex: 3, imageUrl: null },
  { id: 'p34-reading-02', tier: 'P3-4', category: 'reading', question: '《静夜思》是谁写的？', options: ['杜甫', '白居易', '李白', '王维'], correctIndex: 2, imageUrl: null },
  { id: 'p34-reading-03', tier: 'P3-4', category: 'reading', question: '"春眠不觉晓"下一句是什么？', options: ['处处闻啼鸟', '夜来风雨声', '花落知多少', '当春乃发生'], correctIndex: 0, imageUrl: null },
  { id: 'p34-reading-04', tier: 'P3-4', category: 'reading', question: '《三国演义》讲述了哪个时期的故事？', options: ['唐朝', '宋朝', '三国时期', '清朝'], correctIndex: 2, imageUrl: null },
  { id: 'p34-reading-05', tier: 'P3-4', category: 'reading', question: '"桃花潭水深千尺"下一句是什么？', options: ['不及汪伦送我情', '疑是地上霜', '举头望明月', '低头思故乡'], correctIndex: 0, imageUrl: null },
  { id: 'p34-reading-06', tier: 'P3-4', category: 'reading', question: '《红楼梦》又叫什么？', options: ['《石头记》', '《西游记》', '《水浒传》', '《三国演义》'], correctIndex: 0, imageUrl: null },
  { id: 'p34-reading-07', tier: 'P3-4', category: 'reading', question: '中国第一部诗歌总集是什么？', options: ['《楚辞》', '《诗经》', '《汉赋》', '《唐诗》'], correctIndex: 1, imageUrl: null },
  { id: 'p34-reading-08', tier: 'P3-4', category: 'reading', question: '鲁迅的原名是什么？', options: ['周树人', '周作人', '周建人', '周树人'], correctIndex: 0, imageUrl: null },
  { id: 'p34-reading-09', tier: 'P3-4', category: 'reading', question: '"床前明月光"的下一句是什么？', options: ['疑是地上霜', '举头望明月', '低头思故乡', '停车坐爱枫林晚'], correctIndex: 0, imageUrl: null },
  { id: 'p34-reading-10', tier: 'P3-4', category: 'reading', question: '《童年》《在人间》《我的大学》是谁的作品？', options: ['高尔基', '奥斯特洛夫斯基', '托尔斯泰', '普希金'], correctIndex: 0, imageUrl: null },
  { id: 'p34-reading-11', tier: 'P3-4', category: 'reading', question: '中国古代四大名著不包括哪个？', options: ['《三国演义》', '《红楼梦》', '《聊斋志异》', '《西游记》'], correctIndex: 2, imageUrl: null },
  { id: 'p34-reading-12', tier: 'P3-4', category: 'reading', question: '"春风又绿江南岸"是谁的诗句？', options: ['杜甫', '白居易', '王安石', '苏轼'], correctIndex: 2, imageUrl: null },
  // Shape - 8 questions
  { id: 'p34-shape-01', tier: 'P3-4', category: 'shape', question: '正方形的周长公式是什么？', options: ['边长×4', '边长×边长', '边长+4', '边长÷4'], correctIndex: 0, imageUrl: null },
  { id: 'p34-shape-02', tier: 'P3-4', category: 'shape', question: '长方形的面积公式是什么？', options: ['边长×4', '长×宽', '对角线×2', '边长+边长'], correctIndex: 1, imageUrl: null },
  { id: 'p34-shape-03', tier: 'P3-4', category: 'shape', question: '三角形的内角和是多少度？', options: ['90度', '180度', '270度', '360度'], correctIndex: 1, imageUrl: null },
  { id: 'p34-shape-04', tier: 'P3-4', category: 'shape', question: '圆周率约等于多少？', options: ['2.14', '3.14', '4.14', '5.14'], correctIndex: 1, imageUrl: null },
  { id: 'p34-shape-05', tier: 'P3-4', category: 'shape', question: '正方形的面积公式是什么？', options: ['边长×4', '边长×边长', '对角线×2', '边长×2'], correctIndex: 1, imageUrl: null },
  { id: 'p34-shape-06', tier: 'P3-4', category: 'shape', question: '平行四边形的对角有什么关系？', options: ['相等', '垂直', '平行', '相交'], correctIndex: 0, imageUrl: null },
  { id: 'p34-shape-07', tier: 'P3-4', category: 'shape', question: '梯形有几组平行边？', options: ['0', '1', '2', '3'], correctIndex: 1, imageUrl: null },
  { id: 'p34-shape-08', tier: 'P3-4', category: 'shape', question: '圆的直径和半径的关系是什么？', options: ['直径=半径', '直径=2×半径', '半径=2×直径', '没关系'], correctIndex: 1, imageUrl: null },
  // Time - 5 questions
  { id: 'p34-time-01', tier: 'P3-4', category: 'time', question: '闰年有多少天？', options: ['364', '365', '366', '367'], correctIndex: 2, imageUrl: null },
  { id: 'p34-time-02', tier: 'P3-4', category: 'time', question: '平年有多少天？', options: ['364', '365', '366', '367'], correctIndex: 1, imageUrl: null },
  { id: 'p34-time-03', tier: 'P3-4', category: 'time', question: '哪个年份是闰年？', options: ['1900', '2000', '2100', '2200'], correctIndex: 1, imageUrl: null },
  { id: 'p34-time-04', tier: 'P3-4', category: 'time', question: '地球绕太阳一圈是一年吗？', options: ['不是', '是', '是半年', '是两年'], correctIndex: 1, imageUrl: null },
  { id: 'p34-time-05', tier: 'P3-4', category: 'time', question: '21世纪从哪一年开始？', options: ['1999', '2000', '2001', '2100'], correctIndex: 2, imageUrl: null },
  // Life - 5 questions
  { id: 'p34-life-01', tier: 'P3-4', category: 'life', question: '如何预防近视？', options: ['在暗处看书', '多看远处', '长时间看手机', '眯眼看东西'], correctIndex: 1, imageUrl: null },
  { id: 'p34-life-02', tier: 'P3-4', category: 'life', question: '正确的刷牙时间是多少分钟？', options: ['不到1分钟', '2-3分钟', '5分钟以上', '不用刷牙'], correctIndex: 1, imageUrl: null },
  { id: 'p34-life-03', tier: 'P3-4', category: 'life', question: '每天应该喝多少水？', options: ['不渴不喝', '100ml', '1500ml左右', '10升'], correctIndex: 2, imageUrl: null },
  { id: 'p34-life-04', tier: 'P3-4', category: 'life', question: '正确的读写姿势眼睛离书本多远？', options: ['10厘米', '30厘米左右', '5厘米', '越近越好'], correctIndex: 1, imageUrl: null },
  { id: 'p34-life-05', tier: 'P3-4', category: 'life', question: '运动前应该做什么？', options: ['大量喝水', '热身', '马上剧烈运动', '吃饭'], correctIndex: 1, imageUrl: null },
  // Emotion - 3 questions
  { id: 'p34-emotion-01', tier: 'P3-4', category: 'emotion', question: '当压力大时应该怎么做？', options: ['发脾气', '找朋友倾诉', '压抑情绪', '逃避问题'], correctIndex: 1, imageUrl: null },
  { id: 'p34-emotion-02', tier: 'P3-4', category: 'emotion', question: '嫉妒别人是什么情绪？', options: ['开心', '难过', '负面情绪', '平静'], correctIndex: 2, imageUrl: null },
  { id: 'p34-emotion-03', tier: 'P3-4', category: 'emotion', question: '培养积极情绪的方法不包括哪个？', options: ['多运动', '保持感恩', '抱怨他人', '充足睡眠'], correctIndex: 2, imageUrl: null },
];

// All questions combined for import/export
const allQuestions = [...kindergartenQuestions, ...primary1_2Questions, ...primary3_4Questions];

function getQuestionsForTier(tier, enabledCategories = null) {
  let questions = [];
  if (tier === 'kindergarten') questions = kindergartenQuestions;
  else if (tier === 'primary1_2') questions = primary1_2Questions;
  else if (tier === 'primary3_4') questions = primary3_4Questions;
  
  if (enabledCategories && enabledCategories.length > 0) {
    questions = questions.filter(q => enabledCategories.includes(q.category));
  }
  return questions;
}
