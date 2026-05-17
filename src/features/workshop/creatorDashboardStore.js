/**
 * Creator Dashboard Store - Manage submitted content and analytics
 * 
 * Features:
 * - View all submitted content (maps, questions, themes)
 * - Analytics: views, downloads, ratings
 * - Edit/update content
 * - Delete unpublished content
 * - Revenue tracking (future)
 */

import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../../multiplayer/supabaseClient';

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useCreatorDashboardStore = create((set, get) => ({
  // User's submitted content
  submittedMaps: [],
  submittedQuestions: [],
  submittedThemes: [],
  
  // Overall stats
  totalViews: 0,
  totalDownloads: 0,
  totalRatings: 0,
  averageRating: 0,
  
  // Loading state
  isLoading: false,
  error: null,
  
  // Selected content for editing
  editingItem: null,
  
  // Tab state
  activeTab: 'maps', // maps | questions | themes
  
  // ============ Setters ============
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  setEditingItem: (item) => set({ editingItem: item }),
  setError: (error) => set({ error }),
  
  // ============ Fetch submitted content ============
  
  fetchMySubmissions: async () => {
    const userId = localStorage.getItem('monopoly3d_player_id');
    if (!userId) {
      set({ error: 'User not logged in' });
      return;
    }
    
    if (!isSupabaseConfigured()) {
      set({ error: 'Supabase not configured' });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Fetch maps
      const { data: maps, error: mapsErr } = await supabase
        .from('workshop_maps')
        .select('*')
        .eq('author_id', userId)
        .order('created_at', { ascending: false });
      
      if (mapsErr) throw mapsErr;
      
      // Fetch questions
      const { data: questions, error: questionsErr } = await supabase
        .from('workshop_questions')
        .select('*')
        .eq('author_id', userId)
        .order('created_at', { ascending: false });
      
      if (questionsErr) throw questionsErr;
      
      // Fetch themes
      const { data: themes, error: themesErr } = await supabase
        .from('workshop_themes')
        .select('*')
        .eq('author_id', userId)
        .order('created_at', { ascending: false });
      
      if (themesErr) throw themesErr;
      
      // Calculate stats
      const allItems = [...(maps || []), ...(questions || []), ...(themes || [])];
      const totalViews = allItems.reduce((sum, item) => sum + (item.view_count || 0), 0);
      const totalDownloads = allItems.reduce((sum, item) => sum + (item.downloads || 0), 0);
      const totalRatings = allItems.reduce((sum, item) => sum + (item.rating_count || 0), 0);
      const allRatings = allItems.filter(item => item.rating_avg > 0);
      const averageRating = allRatings.length > 0
        ? allRatings.reduce((sum, item) => sum + item.rating_avg, 0) / allRatings.length
        : 0;
      
      set({
        submittedMaps: maps || [],
        submittedQuestions: questions || [],
        submittedThemes: themes || [],
        totalViews,
        totalDownloads,
        totalRatings,
        averageRating,
        isLoading: false,
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  // ============ Update content ============
  
  updateMap: async (mapId, updates) => {
    if (!isSupabaseConfigured()) return { error: 'Not configured' };
    
    try {
      const { error } = await supabase
        .from('workshop_maps')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', mapId);
      
      if (error) throw error;
      
      // Update local state
      set(state => ({
        submittedMaps: state.submittedMaps.map(m => 
          m.id === mapId ? { ...m, ...updates } : m
        ),
        editingItem: null,
      }));
      
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  },
  
  updateQuestion: async (questionId, updates) => {
    if (!isSupabaseConfigured()) return { error: 'Not configured' };
    
    try {
      const { error } = await supabase
        .from('workshop_questions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', questionId);
      
      if (error) throw error;
      
      set(state => ({
        submittedQuestions: state.submittedQuestions.map(q => 
          q.id === questionId ? { ...q, ...updates } : q
        ),
        editingItem: null,
      }));
      
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  },
  
  updateTheme: async (themeId, updates) => {
    if (!isSupabaseConfigured()) return { error: 'Not configured' };
    
    try {
      const { error } = await supabase
        .from('workshop_themes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', themeId);
      
      if (error) throw error;
      
      set(state => ({
        submittedThemes: state.submittedThemes.map(t => 
          t.id === themeId ? { ...t, ...updates } : t
        ),
        editingItem: null,
      }));
      
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  },
  
  // ============ Delete content ============
  
  deleteMap: async (mapId) => {
    if (!isSupabaseConfigured()) return { error: 'Not configured' };
    
    try {
      const { error } = await supabase
        .from('workshop_maps')
        .delete()
        .eq('id', mapId);
      
      if (error) throw error;
      
      set(state => ({
        submittedMaps: state.submittedMaps.filter(m => m.id !== mapId),
      }));
      
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  },
  
  deleteQuestion: async (questionId) => {
    if (!isSupabaseConfigured()) return { error: 'Not configured' };
    
    try {
      const { error } = await supabase
        .from('workshop_questions')
        .delete()
        .eq('id', questionId);
      
      if (error) throw error;
      
      set(state => ({
        submittedQuestions: state.submittedQuestions.filter(q => q.id !== questionId),
      }));
      
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  },
  
  deleteTheme: async (themeId) => {
    if (!isSupabaseConfigured()) return { error: 'Not configured' };
    
    try {
      const { error } = await supabase
        .from('workshop_themes')
        .delete()
        .eq('id', themeId);
      
      if (error) throw error;
      
      set(state => ({
        submittedThemes: state.submittedThemes.filter(t => t.id !== themeId),
      }));
      
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  },
  
  // ============ Stats by item ============
  
  getItemStats: (item) => {
    return {
      views: item.view_count || 0,
      downloads: item.downloads || 0,
      ratings: item.rating_count || 0,
      rating: item.rating_avg || 0,
      subscribers: item.subscriber_count || 0,
    };
  },
  
  // ============ Revenue (future) ============
  
  getEstimatedRevenue: () => {
    // Placeholder for future monetization
    const totalDownloads = get().totalDownloads;
    const baseRate = 0.01; // $0.01 per download
    return totalDownloads * baseRate;
  },
}));

export default useCreatorDashboardStore;