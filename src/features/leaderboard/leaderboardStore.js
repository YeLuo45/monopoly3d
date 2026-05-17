/**
 * Leaderboard Store - Global rankings and player statistics
 * 
 * Features:
 * - Multiple ranking categories (wins, games played, achievements, wealth)
 * - Weekly/All-time/Seasonal filters
 * - Real-time position updates
 * - Player stats with rank history
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../../multiplayer/supabaseClient';
import { useAchievementStore } from '../achievement/achievementStore';

export const LEADERBOARD_CATEGORIES = {
  WINS: 'wins',           // Total game wins
  GAMES_PLAYED: 'games',  // Total games played
  WIN_RATE: 'winrate',    // Win percentage
  ACHIEVEMENTS: 'achievements', // Achievement points
  WEALTH: 'wealth',       // Total in-game wealth accumulated
  STREAK: 'streak',       // Current winning streak
};

export const TIME_PERIODS = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ALL_TIME: 'all_time',
  SEASONAL: 'seasonal',
};

export const useLeaderboardStore = create(
  persist(
    (set, get) => ({
      // Leaderboard data
      entries: [],
      userRank: null,
      isLoading: false,
      error: null,
      
      // Filters
      category: LEADERBOARD_CATEGORIES.WINS,
      period: TIME_PERIODS.ALL_TIME,
      
      // User stats
      personalStats: null,
      rankHistory: [],
      
      /**
       * Fetch leaderboard entries from Supabase
       */
      fetchLeaderboard: async (category = null, period = null) => {
        const cat = category || get().category;
        const per = period || get().period;
        
        if (!isSupabaseConfigured()) {
          // Generate mock data when Supabase not configured
          const mockData = generateMockLeaderboard(cat, per);
          set({ entries: mockData, isLoading: false });
          return;
        }
        
        set({ isLoading: true, error: null });
        
        try {
          const columnMap = {
            [LEADERBOARD_CATEGORIES.WINS]: 'wins',
            [LEADERBOARD_CATEGORIES.GAMES_PLAYED]: 'games_played',
            [LEADERBOARD_CATEGORIES.WIN_RATE]: 'win_rate',
            [LEADERBOARD_CATEGORIES.ACHIEVEMENTS]: 'achievement_points',
            [LEADERBOARD_CATEGORIES.WEALTH]: 'total_wealth',
            [LEADERBOARD_CATEGORIES.STREAK]: 'current_streak',
          };
          
          const column = columnMap[cat] || 'wins';
          let query = supabase
            .from('leaderboard')
            .select('*')
            .order(column, { ascending: false })
            .limit(100);
          
          // Apply period filter
          if (per === TIME_PERIODS.WEEKLY) {
            query = query.gte('updated_at', getWeekAgo());
          } else if (per === TIME_PERIODS.MONTHLY) {
            query = query.gte('updated_at', getMonthAgo());
          }
          
          const { data, error } = await query;
          
          if (error) throw error;
          
          // Add rank numbers
          const rankedData = (data || []).map((entry, index) => ({
            ...entry,
            rank: index + 1,
          }));
          
          set({ entries: rankedData, isLoading: false });
        } catch (err) {
          console.error('[LeaderboardStore] Fetch error:', err);
          set({ error: err.message, isLoading: false });
        }
      },
      
      /**
       * Get current user's rank
       */
      fetchUserRank: async () => {
        const profile = useAchievementStore.getState().profile;
        if (!profile?.playerId || !isSupabaseConfigured()) return;
        
        try {
          const { data, error } = await supabase
            .from('leaderboard')
            .select('*')
            .eq('player_id', profile.playerId)
            .single();
          
          if (!error && data) {
            set({ userRank: data });
          }
        } catch (err) {
          console.error('[LeaderboardStore] User rank fetch error:', err);
        }
      },
      
      /**
       * Update player stats after a game
       */
      updatePlayerStats: async (stats) => {
        const profile = useAchievementStore.getState().profile;
        if (!profile?.playerId) return;
        
        if (!isSupabaseConfigured()) {
          // Store locally when Supabase not configured
          set(state => ({
            personalStats: { ...state.personalStats, ...stats },
          }));
          return;
        }
        
        try {
          const updates = {
            player_id: profile.playerId,
            player_name: profile.name || 'Anonymous',
            games_played: stats.gamesPlayed || 0,
            wins: stats.wins || 0,
            win_rate: stats.winRate || 0,
            achievement_points: profile.totalEarnedPoints || 0,
            total_wealth: stats.totalWealth || 0,
            current_streak: stats.streak || 0,
            last_game_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const { error } = await supabase
            .from('leaderboard')
            .upsert(updates, { onConflict: 'player_id' });
          
          if (error) throw error;
          
          // Refresh data
          get().fetchLeaderboard();
          get().fetchUserRank();
        } catch (err) {
          console.error('[LeaderboardStore] Update error:', err);
        }
      },
      
      /**
       * Set category filter
       */
      setCategory: (category) => {
        set({ category });
        get().fetchLeaderboard(category, null);
      },
      
      /**
       * Set period filter
       */
      setPeriod: (period) => {
        set({ period });
        get().fetchLeaderboard(null, period);
      },
      
      /**
       * Clear error
       */
      clearError: () => set({ error: null }),
    }),
    {
      name: 'monopoly3d_leaderboard',
      partialize: (state) => ({
        category: state.category,
        period: state.period,
        rankHistory: state.rankHistory,
      }),
    }
  )
);

/**
 * Generate mock leaderboard data for demo purposes
 */
function generateMockLeaderboard(category, period) {
  const mockPlayers = [
    { id: 'p1', name: '大富翁', avatar: '👑' },
    { id: 'p2', name: '地产之王', avatar: '🏰' },
    { id: 'p3', name: '投资高手', avatar: '💎' },
    { id: 'p4', name: '幸运星', avatar: '⭐' },
    { id: 'p5', name: '银行家', avatar: '🏦' },
    { id: 'p6', name: '谈判专家', avatar: '🤝' },
    { id: 'p7', name: '建筑大师', avatar: '🏗️' },
    { id: 'p8', name: '股市传奇', avatar: '📈' },
    { id: 'p9', name: '拆迁户', avatar: '🏠' },
    { id: 'p10', name: '新手玩家', avatar: '🎮' },
  ];
  
  const getValue = (player, idx) => {
    const base = 1000 - idx * 50;
    const variance = Math.random() * 100;
    switch (category) {
      case LEADERBOARD_CATEGORIES.WINS:
        return Math.floor(base / 10) + Math.floor(variance / 20);
      case LEADERBOARD_CATEGORIES.GAMES_PLAYED:
        return Math.floor(base / 5) + Math.floor(variance / 10);
      case LEADERBOARD_CATEGORIES.WIN_RATE:
        return Math.min(100, 40 + (1000 - idx * 30) / 20 + variance / 5);
      case LEADERBOARD_CATEGORIES.ACHIEVEMENTS:
        return Math.floor(base * 1.5) + Math.floor(variance);
      case LEADERBOARD_CATEGORIES.WEALTH:
        return Math.floor(base * 10000) + Math.floor(variance * 100);
      case LEADERBOARD_CATEGORIES.STREAK:
        return Math.floor(base / 100) + Math.floor(variance / 20);
      default:
        return base;
    }
  };
  
  return mockPlayers.map((player, idx) => ({
    player_id: player.id,
    player_name: player.name,
    avatar: player.avatar,
    rank: idx + 1,
    wins: category === LEADERBOARD_CATEGORIES.WINS ? getValue(player, idx) : Math.floor(Math.random() * 100),
    games_played: category === LEADERBOARD_CATEGORIES.GAMES_PLAYED ? getValue(player, idx) : Math.floor(Math.random() * 200),
    win_rate: category === LEADERBOARD_CATEGORIES.WIN_RATE ? getValue(player, idx) : Math.random() * 100,
    achievement_points: category === LEADERBOARD_CATEGORIES.ACHIEVEMENTS ? getValue(player, idx) : Math.floor(Math.random() * 5000),
    total_wealth: category === LEADERBOARD_CATEGORIES.WEALTH ? getValue(player, idx) : Math.floor(Math.random() * 1000000),
    current_streak: category === LEADERBOARD_CATEGORIES.STREAK ? getValue(player, idx) : Math.floor(Math.random() * 20),
  }));
}

function getWeekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

function getMonthAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString();
}

export default useLeaderboardStore;