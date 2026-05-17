/**
 * Tournament Store - Tournament and championship management
 * 
 * Features:
 * - Create/join tournaments
 * - Bracket management (single/double elimination)
 * - Player registration and seeding
 * - Match progression and results
 * - Tournament standings and rewards
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const TOURNAMENT_TYPES = {
  SINGLE_ELIMINATION: 'single_elimination',
  DOUBLE_ELIMINATION: 'double_elimination',
  ROUND_ROBIN: 'round_robin',
};

const TOURNAMENT_STATUS = {
  LOBBY: 'lobby',           // Waiting for players
  REGISTRATION: 'registration', // Registration open
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const MATCH_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BYE: 'bye',
};

// Generate unique ID
const genId = () => `t_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const genMatchId = () => `m_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Default prize distribution
const DEFAULT_PRIZES = [
  { place: 1, name: '冠军', xp: 500, coins: 1000 },
  { place: 2, name: '亚军', xp: 300, coins: 600 },
  { place: 3, name: '季军', xp: 200, coins: 400 },
  { place: 4, name: '殿军', xp: 100, coins: 200 },
  { place: 5, name: '八强', xp: 50, coins: 100 },
  { place: 6, name: '十六强', xp: 20, coins: 50 },
];

// Calculate bracket size (next power of 2)
function getBracketSize(playerCount) {
  let size = 2;
  while (size < playerCount) {
    size *= 2;
  }
  return size;
}

// Create a single elimination bracket
function createSingleEliminationBracket(players, seeded = false) {
  const bracketSize = getBracketSize(players.length);
  const rounds = [];
  
  // Calculate number of rounds
  const numRounds = Math.log2(bracketSize);
  
  // Create rounds
  for (let r = 1; r <= numRounds; r++) {
    const matchesInRound = bracketSize / Math.pow(2, r);
    const round = {
      roundNumber: r,
      roundName: r === numRounds ? '决赛' : r === numRounds - 1 ? '半决赛' : `第${r}轮`,
      matches: [],
    };
    
    for (let m = 0; m < matchesInRound; m++) {
      const match = {
        id: genMatchId(),
        round: r,
        position: m,
        player1: null,
        player2: null,
        winner: null,
        loser: null,
        score1: 0,
        score2: 0,
        status: MATCH_STATUS.PENDING,
        nextMatchId: r < numRounds ? null : null,
      };
      
      // Assign players for first round
      if (r === 1) {
        const idx1 = seeded ? m * 2 : Math.floor(Math.random() * players.length);
        const idx2 = seeded ? m * 2 + 1 : Math.floor(Math.random() * players.length);
        match.player1 = players[idx1] || null;
        match.player2 = players[idx2] || null;
        if (!match.player1 && !match.player2) {
          match.status = MATCH_STATUS.BYE;
        } else if (!match.player2) {
          match.status = MATCH_STATUS.BYE;
          match.winner = match.player1;
        }
      }
      
      // Link to next match
      if (r < numRounds) {
        const nextMatchPos = Math.floor(m / 2);
        // We'll set nextMatchId after all matches are created
      }
      
      round.matches.push(match);
    }
    rounds.push(round);
  }
  
  // Link matches to next round
  for (let r = 0; r < rounds.length - 1; r++) {
    for (let m = 0; m < rounds[r].matches.length; m++) {
      const nextMatchPos = Math.floor(m / 2);
      rounds[r].matches[m].nextMatchId = rounds[r + 1].matches[nextMatchPos]?.id || null;
    }
  }
  
  return rounds;
}

export const useTournamentStore = create(
  persist(
    (set, get) => ({
      // Current tournament
      currentTournament: null,

      // Tournament history
      tournamentHistory: [],

      // Active tournaments list (for browsing)
      availableTournaments: [],

      // ============ Tournament Creation ============

      /**
       * Create a new tournament
       * @param {object} config - Tournament configuration
       */
      createTournament: (config) => {
        const {
          name,
          type = TOURNAMENT_TYPES.SINGLE_ELIMINATION,
          maxPlayers = 8,
          entryFee = 0,
          prizePool = null,
          isPrivate = false,
          creatorId,
          creatorName,
        } = config;

        const bracketSize = getBracketSize(maxPlayers);
        
        const tournament = {
          id: genId(),
          name,
          type,
          maxPlayers,
          bracketSize,
          currentPlayers: 1,
          status: TOURNAMENT_STATUS.REGISTRATION,
          entryFee,
          prizePool: prizePool || DEFAULT_PRIZES.slice(0, Math.min(6, Math.log2(bracketSize))),
          isPrivate,
          creator: { id: creatorId, name: creatorName },
          registeredPlayers: [{ id: creatorId, name: creatorName, seed: 1, joinedAt: new Date().toISOString() }],
          rounds: [],
          startedAt: null,
          endedAt: null,
          champion: null,
          createdAt: new Date().toISOString(),
        };

        set(state => ({
          currentTournament: tournament,
          availableTournaments: [...state.availableTournaments, tournament],
        }));

        return tournament;
      },

      /**
       * Register a player for tournament
       */
      registerPlayer: (playerId, playerName) => {
        const state = get();
        if (!state.currentTournament) return false;
        if (state.currentTournament.status !== TOURNAMENT_STATUS.REGISTRATION) return false;
        if (state.currentTournament.registeredPlayers.length >= state.currentTournament.maxPlayers) return false;
        if (state.currentTournament.registeredPlayers.find(p => p.id === playerId)) return false;

        const newPlayer = {
          id: playerId,
          name: playerName,
          seed: state.currentTournament.registeredPlayers.length + 1,
          joinedAt: new Date().toISOString(),
        };

        set(state => ({
          currentTournament: {
            ...state.currentTournament,
            registeredPlayers: [...state.currentTournament.registeredPlayers, newPlayer],
            currentPlayers: state.currentTournament.registeredPlayers.length + 1,
          },
        }));

        return true;
      },

      /**
       * Unregister a player
       */
      unregisterPlayer: (playerId) => {
        const state = get();
        if (!state.currentTournament) return false;

        set(state => ({
          currentTournament: {
            ...state.currentTournament,
            registeredPlayers: state.currentTournament.registeredPlayers.filter(p => p.id !== playerId),
            currentPlayers: state.currentTournament.registeredPlayers.length - 1,
          },
        }));

        return true;
      },

      /**
       * Start the tournament (generate bracket)
       */
      startTournament: () => {
        const state = get();
        if (!state.currentTournament) return false;
        if (state.currentTournament.currentPlayers < 2) return false;

        const players = state.currentTournament.registeredPlayers;
        const bracket = createSingleEliminationBracket(players, true);

        set(state => ({
          currentTournament: {
            ...state.currentTournament,
            status: TOURNAMENT_STATUS.IN_PROGRESS,
            rounds: bracket,
            startedAt: new Date().toISOString(),
          },
        }));

        return true;
      },

      // ============ Match Management ============

      /**
       * Get match by ID
       */
      getMatchById: (matchId) => {
        const state = get();
        if (!state.currentTournament) return null;

        for (const round of state.currentTournament.rounds) {
          const match = round.matches.find(m => m.id === matchId);
          if (match) return match;
        }
        return null;
      },

      /**
       * Update match result
       */
      updateMatchResult: (matchId, winnerId, loserId, score1 = 0, score2 = 0) => {
        const state = get();
        if (!state.currentTournament) return false;

        const updatedRounds = state.currentTournament.rounds.map(round => ({
          ...round,
          matches: round.matches.map(match => {
            if (match.id !== matchId) return match;
            return {
              ...match,
              winner: winnerId,
              loser: loserId,
              score1,
              score2,
              status: MATCH_STATUS.COMPLETED,
            };
          }),
        }));

        // Advance winner to next match
        const match = state.currentTournament.rounds.flatMap(r => r.matches).find(m => m.id === matchId);
        if (match?.nextMatchId) {
          const nextRoundIdx = match.round; // 0-indexed round
          const nextMatchPos = Math.floor(match.position / 2);
          
          if (updatedRounds[nextRoundIdx]?.matches[nextMatchPos]) {
            const isPlayer1 = match.position % 2 === 0;
            updatedRounds[nextRoundIdx].matches[nextMatchPos] = {
              ...updatedRounds[nextRoundIdx].matches[nextMatchPos],
              [isPlayer1 ? 'player1' : 'player2']: winnerId,
            };
          }
        }

        set(state => ({
          currentTournament: {
            ...state.currentTournament,
            rounds: updatedRounds,
          },
        }));

        // Check if tournament is complete
        get().checkTournamentComplete();
        return true;
      },

      /**
       * Check if tournament is complete
       */
      checkTournamentComplete: () => {
        const state = get();
        if (!state.currentTournament) return;
        if (state.currentTournament.status !== TOURNAMENT_STATUS.IN_PROGRESS) return;

        // Find final match (last round, last match)
        const lastRound = state.currentTournament.rounds[state.currentTournament.rounds.length - 1];
        if (!lastRound) return;
        
        const finalMatch = lastRound.matches[lastRound.matches.length - 1];
        if (!finalMatch || finalMatch.status !== MATCH_STATUS.COMPLETED) return;

        // Tournament is complete
        const champion = state.currentTournament.registeredPlayers.find(
          p => p.id === finalMatch.winner
        );

        set(state => ({
          currentTournament: {
            ...state.currentTournament,
            status: TOURNAMENT_STATUS.COMPLETED,
            champion: champion || null,
            endedAt: new Date().toISOString(),
          },
        }));

        // Archive to history
        set(state => ({
          tournamentHistory: [
            state.currentTournament,
            ...state.tournamentHistory,
          ].slice(0, 20), // Keep last 20
        }));
      },

      /**
       * Get current match to play
       */
      getCurrentMatch: (playerId) => {
        const state = get();
        if (!state.currentTournament) return null;
        if (state.currentTournament.status !== TOURNAMENT_STATUS.IN_PROGRESS) return null;

        for (const round of state.currentTournament.rounds) {
          for (const match of round.matches) {
            if (match.status === MATCH_STATUS.COMPLETED) continue;
            if (match.status === MATCH_STATUS.BYE) continue;
            if (match.player1?.id === playerId || match.player2?.id === playerId) {
              return match;
            }
          }
        }
        return null;
      },

      /**
       * Get tournament standings
       */
      getStandings: () => {
        const state = get();
        if (!state.currentTournament) return [];

        // Get eliminated players ordered by when they lost
        const eliminated = [];
        
        for (let r = state.currentTournament.rounds.length - 1; r >= 0; r--) {
          const round = state.currentTournament.rounds[r];
          for (const match of round.matches) {
            if (match.loser && !eliminated.find(p => p.id === match.loser)) {
              eliminated.push({
                ...state.currentTournament.registeredPlayers.find(p => p.id === match.loser),
                position: eliminated.length + 1,
                eliminatedAt: `第${r + 1}轮`,
              });
            }
          }
        }

        // Add champion at top
        const champion = state.currentTournament.champion;
        if (champion) {
          eliminated.unshift({
            ...champion,
            position: 1,
            eliminatedAt: '冠军',
          });
        }

        return eliminated;
      },

      // ============ Navigation ============

      /**
       * Leave current tournament
       */
      leaveTournament: () => {
        set({ currentTournament: null });
      },

      /**
       * Cancel tournament (only by creator)
       */
      cancelTournament: () => {
        const state = get();
        if (!state.currentTournament) return false;
        if (state.currentTournament.status !== TOURNAMENT_STATUS.REGISTRATION) return false;

        set(state => ({
          currentTournament: {
            ...state.currentTournament,
            status: TOURNAMENT_STATUS.CANCELLED,
            endedAt: new Date().toISOString(),
          },
        }));

        return true;
      },

      /**
       * Get tournament info for display
       */
      getTournamentInfo: () => {
        const state = get();
        if (!state.currentTournament) return null;

        const t = state.currentTournament;
        const progress = t.rounds.length > 0
          ? (t.rounds.flatMap(r => r.matches).filter(m => m.status === MATCH_STATUS.COMPLETED).length / 
             t.rounds.flatMap(r => r.matches).filter(m => m.status !== MATCH_STATUS.BYE).length) * 100
          : 0;

        return {
          name: t.name,
          type: t.type,
          status: t.status,
          playerCount: t.currentPlayers,
          maxPlayers: t.maxPlayers,
          progress: Math.round(progress),
          rounds: t.rounds.length,
          champion: t.champion,
          prizePool: t.prizePool,
          entryFee: t.entryFee,
          startedAt: t.startedAt,
        };
      },

      /**
       * Get bracket display data
       */
      getBracketData: () => {
        const state = get();
        if (!state.currentTournament || !state.currentTournament.rounds.length) return null;

        return state.currentTournament.rounds.map(round => ({
          roundNumber: round.roundNumber,
          roundName: round.roundName,
          matches: round.matches.map(match => ({
            id: match.id,
            player1: match.player1,
            player2: match.player2,
            winner: match.winner,
            score1: match.score1,
            score2: match.score2,
            status: match.status,
          })),
        }));
      },
    }),
    {
      name: 'monopoly3d-tournament',
    }
  )
);

// Export constants
export { TOURNAMENT_TYPES, TOURNAMENT_STATUS, MATCH_STATUS, DEFAULT_PRIZES };