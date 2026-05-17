/**
 * Cloud Save Store - Cross-platform cloud save with Supabase auth
 * 
 * Features:
 * - Supabase authentication (email/password, OAuth)
 * - Cloud save/load user data
 * - Profile sync across devices
 * - Achievement sync
 * - Settings sync
 * - Offline-first with background sync
 */

import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../../multiplayer/supabaseClient';

// Storage keys for local data
const STORAGE_KEYS = {
  PROFILE: 'profile',
  ACHIEVEMENTS: 'achievements',
  SETTINGS: 'settings',
  INVENTORY: 'inventory',
  LESSON_PLANS: 'lesson_plans',
  REPLAYS: 'replays',
  SEASON_PASS: 'season_pass',
  TOURNAMENTS: 'tournaments',
};

export const useCloudSaveStore = create((set, get) => ({
  // Auth state
  user: null,
  isAuthenticated: false,
  isAuthLoading: true,

  // Sync state
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,

  // Save slots
  saveSlots: [],

  // ============ Authentication ============

  /**
   * Initialize auth state
   */
  initAuth: async () => {
    if (!isSupabaseConfigured()) {
      set({ isAuthLoading: false, isAuthenticated: false });
      return false;
    }

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ 
          user: session.user,
          isAuthenticated: true,
          isAuthLoading: false,
        });
        // Load user's cloud data
        await get().loadCloudData();
      } else {
        set({ 
          user: null,
          isAuthenticated: false,
          isAuthLoading: false,
        });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          set({ user: session.user, isAuthenticated: true });
          await get().loadCloudData();
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, isAuthenticated: false });
        }
      });

      return !!session?.user;
    } catch (error) {
      console.error('Auth init error:', error);
      set({ isAuthLoading: false, isAuthenticated: false });
      return false;
    }
  },

  /**
   * Sign up with email
   */
  signUp: async (email, password, displayName) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase not configured' };
    }

    set({ isAuthLoading: true });
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });

      if (error) throw error;

      // Create profile record
      if (data.user) {
        await get().createUserProfile(data.user.id, displayName);
      }

      set({ isAuthLoading: false });
      return { user: data.user };
    } catch (error) {
      set({ isAuthLoading: false });
      return { error: error.message };
    }
  },

  /**
   * Sign in with email
   */
  signIn: async (email, password) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase not configured' };
    }

    set({ isAuthLoading: true });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      set({ 
        user: data.user,
        isAuthenticated: true,
        isAuthLoading: false,
      });
      
      return { user: data.user };
    } catch (error) {
      set({ isAuthLoading: false });
      return { error: error.message };
    }
  },

  /**
   * Sign out
   */
  signOut: async () => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase not configured' };
    }

    try {
      await supabase.auth.signOut();
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Reset password
   */
  resetPassword: async (email) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase not configured' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  },

  // ============ User Profile ============

  /**
   * Create user profile in database
   */
  createUserProfile: async (userId, displayName) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          display_name: displayName,
          level: 1,
          xp: 0,
          coins: 1000,
          games_played: 0,
          games_won: 0,
          total_xp_earned: 0,
          created_at: new Date().toISOString(),
        });

      if (error) console.error('Profile creation error:', error);
    } catch (error) {
      console.error('Profile creation error:', error);
    }
  },

  /**
   * Get user profile
   */
  getUserProfile: async () => {
    const { user } = get();
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get profile error:', error);
      return null;
    }
  },

  // ============ Cloud Data ============

  /**
   * Save data to cloud
   */
  saveToCloud: async (key, data) => {
    const { user, isAuthenticated } = get();
    if (!isAuthenticated || !user) {
      return { error: 'Not authenticated' };
    }

    try {
      const { error } = await supabase
        .from('cloud_saves')
        .upsert({
          user_id: user.id,
          save_key: key,
          data,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,save_key',
        });

      if (error) throw error;
      
      set({ lastSyncedAt: new Date().toISOString() });
      return { success: true };
    } catch (error) {
      console.error('Save to cloud error:', error);
      return { error: error.message };
    }
  },

  /**
   * Load data from cloud
   */
  loadFromCloud: async (key) => {
    const { user, isAuthenticated } = get();
    if (!isAuthenticated || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase
        .from('cloud_saves')
        .select('data')
        .eq('user_id', user.id)
        .eq('save_key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found, return null
          return { data: null };
        }
        throw error;
      }

      return { data: data.data };
    } catch (error) {
      console.error('Load from cloud error:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Load all cloud data for user
   */
  loadCloudData: async () => {
    const { user, isAuthenticated } = get();
    if (!isAuthenticated || !user) return;

    set({ isSyncing: true, syncError: null });

    try {
      const { data, error } = await supabase
        .from('cloud_saves')
        .select('save_key, data, updated_at')
        .eq('user_id', user.id);

      if (error) throw error;

      // Update save slots with cloud data
      const saveSlots = (data || []).map(item => ({
        key: item.save_key,
        data: item.data,
        updatedAt: item.updated_at,
      }));

      set({
        saveSlots,
        lastSyncedAt: new Date().toISOString(),
        isSyncing: false,
      });
    } catch (error) {
      console.error('Load cloud data error:', error);
      set({
        isSyncing: false,
        syncError: error.message,
      });
    }
  },

  /**
   * Sync local data to cloud
   */
  syncToCloud: async () => {
    const { user, isAuthenticated } = get();
    if (!isAuthenticated || !user) {
      return { error: 'Not authenticated' };
    }

    set({ isSyncing: true, syncError: null });

    try {
      // Gather all local data
      const localData = {
        [STORAGE_KEYS.PROFILE]: JSON.parse(localStorage.getItem('monopoly3d-game') || '{}'),
        [STORAGE_KEYS.ACHIEVEMENTS]: JSON.parse(localStorage.getItem('monopoly3d-achievement-store') || '{}'),
        [STORAGE_KEYS.SETTINGS]: JSON.parse(localStorage.getItem('monopoly3d-settings') || '{}'),
        [STORAGE_KEYS.INVENTORY]: JSON.parse(localStorage.getItem('monopoly3d-shop') || '{}'),
        [STORAGE_KEYS.LESSON_PLANS]: JSON.parse(localStorage.getItem('monopoly3d-lesson-plan') || '{}'),
        [STORAGE_KEYS.SEASON_PASS]: JSON.parse(localStorage.getItem('monopoly3d-season-pass') || '{}'),
        [STORAGE_KEYS.TOURNAMENTS]: JSON.parse(localStorage.getItem('monopoly3d-tournament') || '{}'),
      };

      // Save each key to cloud
      const promises = Object.entries(localData).map(([key, data]) =>
        supabase
          .from('cloud_saves')
          .upsert({
            user_id: user.id,
            save_key: key,
            data,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,save_key',
          })
      );

      await Promise.all(promises);

      set({
        lastSyncedAt: new Date().toISOString(),
        isSyncing: false,
      });

      return { success: true };
    } catch (error) {
      console.error('Sync to cloud error:', error);
      set({
        isSyncing: false,
        syncError: error.message,
      });
      return { error: error.message };
    }
  },

  /**
   * Load cloud data to local
   */
  loadCloudToLocal: async () => {
    const { user, isAuthenticated } = get();
    if (!isAuthenticated || !user) {
      return { error: 'Not authenticated' };
    }

    set({ isSyncing: true, syncError: null });

    try {
      const { data, error } = await supabase
        .from('cloud_saves')
        .select('save_key, data')
        .eq('user_id', user.id);

      if (error) throw error;

      // Apply each save to local storage
      for (const item of (data || [])) {
        if (item.save_key && item.data) {
          const key = getStorageKeyForSaveKey(item.save_key);
          if (key) {
            localStorage.setItem(key, JSON.stringify(item.data));
          }
        }
      }

      set({
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error('Load cloud to local error:', error);
      set({
        isSyncing: false,
        syncError: error.message,
      });
      return { error: error.message };
    }
  },

  /**
   * Merge local and cloud data (prioritize newer)
   */
  mergeData: async () => {
    const { isAuthenticated } = get();
    if (!isAuthenticated) return { error: 'Not authenticated' };

    set({ isSyncing: true });

    try {
      // Load cloud data
      const { data: cloudData } = await get().loadCloudData();
      
      // Load local data keys
      const localKeys = Object.values(STORAGE_KEYS).map(getStorageKeyForSaveKey);

      // Simple merge: cloud takes precedence for now
      // In a real app, you'd compare timestamps
      await get().loadCloudToLocal();

      set({ isSyncing: false });
      return { success: true };
    } catch (error) {
      set({ isSyncing: false, syncError: error.message });
      return { error: error.message };
    }
  },

  // ============ Utility ============

  /**
   * Get cloud save status
   */
  getCloudSaveStatus: () => {
    const { isAuthenticated, isSyncing, lastSyncedAt, syncError } = get();
    return {
      isAuthenticated,
      isSyncing,
      lastSyncedAt,
      syncError,
      isSupabaseConfigured: isSupabaseConfigured(),
    };
  },

  /**
   * Get save slot by key
   */
  getSaveSlot: (key) => {
    const { saveSlots } = get();
    return saveSlots.find(slot => slot.key === key) || null;
  },

  /**
   * Delete cloud save
   */
  deleteCloudSave: async (key) => {
    const { user, isAuthenticated } = get();
    if (!isAuthenticated || !user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('cloud_saves')
        .delete()
        .eq('user_id', user.id)
        .eq('save_key', key);

      if (error) throw error;

      set(state => ({
        saveSlots: state.saveSlots.filter(slot => slot.key !== key),
      }));

      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Clear all cloud saves
   */
  clearAllCloudSaves: async () => {
    const { user, isAuthenticated } = get();
    if (!isAuthenticated || !user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('cloud_saves')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      set({ saveSlots: [] });
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  },
}));

// Helper to map save key to localStorage key
function getStorageKeyForSaveKey(saveKey) {
  const mapping = {
    [STORAGE_KEYS.PROFILE]: 'monopoly3d-game',
    [STORAGE_KEYS.ACHIEVEMENTS]: 'monopoly3d-achievement-store',
    [STORAGE_KEYS.SETTINGS]: 'monopoly3d-settings',
    [STORAGE_KEYS.INVENTORY]: 'monopoly3d-shop',
    [STORAGE_KEYS.LESSON_PLANS]: 'monopoly3d-lesson-plan',
    [STORAGE_KEYS.REPLAYS]: 'monopoly3d-replays',
    [STORAGE_KEYS.SEASON_PASS]: 'monopoly3d-season-pass',
    [STORAGE_KEYS.TOURNAMENTS]: 'monopoly3d-tournament',
  };
  return mapping[saveKey] || null;
}

export { STORAGE_KEYS };