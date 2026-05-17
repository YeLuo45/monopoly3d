/**
 * AI Watch Store - Spectator mode for observing AI decision-making
 * 
 * Features:
 * - Record AI decisions during gameplay
 * - Visualize AI thinking process
 * - Show decision confidence and reasoning
 * - Timeline of AI actions
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AI_PERSONALITY, AI_DIFFICULTY } from '../../game/aiBrain.js';

// Decision types for categorization
export const DECISION_TYPES = {
  PROPERTY_PURCHASE: 'property_purchase',
  BUILD_HOUSE: 'build_house',
  TRADE_OFFER: 'trade_offer',
  AUCTION_BID: 'auction_bid',
  JAIL_DECISION: 'jail_decision',
  MORTGAGE: 'mortgage',
  UNMORTGAGE: 'unmortgage',
};

// Decision phase during turn
export const DECISION_PHASES = {
  ROLL: 'roll',
  MOVING: 'moving',
  LANDED: 'landed',
  PURCHASE: 'purchase',
  BUILDING: 'building',
  TRADING: 'trading',
  AUCTION: 'auction',
  JAIL: 'jail',
  END_TURN: 'end_turn',
};

const initialAIWatchState = {
  // Is spectator mode active
  isWatchMode: false,
  isPaused: false,

  // Current game being watched
  watchedGameId: null,
  watchedPlayerIds: [], // AI players being watched

  // Decision history for current session
  currentSessionDecisions: [],

  // All recorded decisions (persisted for review)
  decisionArchive: [],

  // Current active decision being made
  activeDecision: null, // { playerId, type, phase, startTime, reasoning }

  // AI players' current state snapshot
  aiPlayerSnapshots: {}, // { playerId: { money, properties, personality, difficulty } }

  // Speed settings for playback
  playbackSpeed: 1, // 1x, 2x, 4x, 0.5x
  autoScroll: true,

  // Filtering
  showOnlyDecisions: true, // Only show AI decisions vs all events
  selectedDecisionTypes: Object.values(DECISION_TYPES),
  selectedPlayerId: null, // Filter to specific AI player

  // Statistics
  stats: {
    totalDecisions: 0,
    decisionsByType: {},
    decisionsByPlayer: {},
    averageDecisionTime: 0,
  },
};

export const useAIWatchStore = create(
  persist(
    (set, get) => ({
      ...initialAIWatchState,

      /**
       * Enable watch mode for a game
       */
      startWatching: (gameId, playerIds) => {
        set({
          isWatchMode: true,
          isPaused: false,
          watchedGameId: gameId,
          watchedPlayerIds: playerIds,
          currentSessionDecisions: [],
          activeDecision: null,
        });
      },

      /**
       * Disable watch mode
       */
      stopWatching: () => {
        const { currentSessionDecisions } = get();
        set(state => ({
          isWatchMode: false,
          watchedGameId: null,
          watchedPlayerIds: [],
          activeDecision: null,
          decisionArchive: [
            ...state.decisionArchive,
            ...currentSessionDecisions,
          ].slice(-500), // Keep last 500 decisions
        }));
      },

      /**
       * Pause/resume watching
       */
      togglePause: () => {
        set(state => ({ isPaused: !state.isPaused }));
      },

      /**
       * Start recording a new decision
       */
      startDecision: (playerId, type, phase, reasoning = {}) => {
        set({
          activeDecision: {
            playerId,
            type,
            phase,
            startTime: Date.now(),
            reasoning,
            options: [], // Possible choices considered
            selectedOption: null,
            score: null,
          },
        });
      },

      /**
       * Add an option the AI is considering
       */
      addOption: (option, score, reason) => {
        const { activeDecision } = get();
        if (!activeDecision) return;

        set({
          activeDecision: {
            ...activeDecision,
            options: [
              ...activeDecision.options,
              { option, score, reason, timestamp: Date.now() },
            ],
          },
        });
      },

      /**
       * Record the final decision made
       */
      finalizeDecision: (selectedOption, score, metadata = {}) => {
        const { activeDecision, currentSessionDecisions, stats } = get();
        if (!activeDecision) return;

        const decisionTime = Date.now() - activeDecision.startTime;
        const decision = {
          ...activeDecision,
          selectedOption,
          score,
          decisionTime,
          timestamp: Date.now(),
          metadata,
        };

        // Update stats
        const newStats = { ...stats };
        newStats.totalDecisions++;
        newStats.decisionsByType[decision.type] = (newStats.decisionsByType[decision.type] || 0) + 1;
        newStats.decisionsByPlayer[decision.playerId] = (newStats.decisionsByPlayer[decision.playerId] || 0) + 1;

        const totalTime = newStats.averageDecisionTime * (newStats.totalDecisions - 1) + decisionTime;
        newStats.averageDecisionTime = totalTime / newStats.totalDecisions;

        set({
          activeDecision: null,
          currentSessionDecisions: [...currentSessionDecisions, decision].slice(-100),
          stats: newStats,
        });
      },

      /**
       * Cancel current decision without recording
       */
      cancelDecision: () => {
        set({ activeDecision: null });
      },

      /**
       * Update AI player snapshot
       */
      updateAISnapshot: (playerId, snapshot) => {
        set(state => ({
          aiPlayerSnapshots: {
            ...state.aiPlayerSnapshots,
            [playerId]: {
              ...snapshot,
              lastUpdated: Date.now(),
            },
          },
        }));
      },

      /**
       * Get personality label
       */
      getPersonalityLabel: (personality) => {
        const labels = {
          [AI_PERSONALITY.AGGRESSIVE]: '激进型',
          [AI_PERSONALITY.CONSERVATIVE]: '保守型',
          [AI_PERSONALITY.BALANCED]: '均衡型',
        };
        return labels[personality] || '未知';
      },

      /**
       * Get difficulty label
       */
      getDifficultyLabel: (difficulty) => {
        const labels = {
          [AI_DIFFICULTY.EASY]: '简单',
          [AI_DIFFICULTY.NORMAL]: '普通',
          [AI_DIFFICULTY.HARD]: '困难',
          [AI_DIFFICULTY.ADAPTIVE]: '自适应',
        };
        return labels[difficulty] || '未知';
      },

      /**
       * Set playback speed
       */
      setPlaybackSpeed: (speed) => {
        set({ playbackSpeed: speed });
      },

      /**
       * Set decision type filter
       */
      setDecisionTypeFilter: (types) => {
        set({ selectedDecisionTypes: types });
      },

      /**
       * Set player filter
       */
      setPlayerFilter: (playerId) => {
        set({ selectedPlayerId: playerId });
      },

      /**
       * Get filtered decisions
       */
      getFilteredDecisions: () => {
        const { currentSessionDecisions, selectedDecisionTypes, selectedPlayerId, showOnlyDecisions } = get();

        return currentSessionDecisions.filter(d => {
          if (showOnlyDecisions && !d.selectedOption) return false;
          if (selectedDecisionTypes.length > 0 && !selectedDecisionTypes.includes(d.type)) return false;
          if (selectedPlayerId && d.playerId !== selectedPlayerId) return false;
          return true;
        });
      },

      /**
       * Get decision summary for a specific AI player
       */
      getPlayerDecisionSummary: (playerId) => {
        const { currentSessionDecisions } = get();
        const playerDecisions = currentSessionDecisions.filter(d => d.playerId === playerId);

        const byType = {};
        playerDecisions.forEach(d => {
          byType[d.type] = byType[d.type] || [];
          byType[d.type].push(d);
        });

        const totalTime = playerDecisions.reduce((sum, d) => sum + (d.decisionTime || 0), 0);

        return {
          totalDecisions: playerDecisions.length,
          byType,
          averageDecisionTime: playerDecisions.length > 0 ? totalTime / playerDecisions.length : 0,
          totalTime,
        };
      },

      /**
       * Export decisions as JSON for analysis
       */
      exportDecisions: () => {
        const { currentSessionDecisions, stats } = get();
        return JSON.stringify({
          timestamp: new Date().toISOString(),
          decisions: currentSessionDecisions,
          stats,
        }, null, 2);
      },

      /**
       * Clear decision history
       */
      clearHistory: () => {
        set({
          currentSessionDecisions: [],
          decisionArchive: [],
          stats: {
            totalDecisions: 0,
            decisionsByType: {},
            decisionsByPlayer: {},
            averageDecisionTime: 0,
          },
        });
      },
    }),
    {
      name: 'monopoly3d-ai-watch',
      partialize: (state) => ({
        decisionArchive: state.decisionArchive,
        showOnlyDecisions: state.showOnlyDecisions,
        playbackSpeed: state.playbackSpeed,
      }),
    }
  )
);