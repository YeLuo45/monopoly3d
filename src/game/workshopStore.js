/**
 * Creative Workshop Store
 * Maps/Questions/Themes sharing platform with Supabase backend
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../multiplayer/supabaseClient';

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const initialState = {
  // Workshop browse state
  maps: [],
  questions: [],
  themes: [],
  isLoading: false,
  error: null,

  // Active tab
  activeTab: 'maps', // 'maps' | 'questions' | 'themes'

  // Sort & filter
  sortBy: 'popular', // 'popular' | 'recent' | 'rating'
  filter: 'all',     // 'all' | 'downloaded' | 'subscribed'

  // User subscriptions & downloads
  subscriptions: [],   // subscribed item IDs
  downloadedItems: {}, // { [itemId]: itemData }

  // Cache
  lastFetched: null,
  cacheTTL: 5 * 60 * 1000, // 5 minutes

  // Current user (reuse from playerProfile if available)
  userId: localStorage.getItem('monopoly3d_player_id') || `anon_${generateId()}`,
  userName: localStorage.getItem('monopoly3d_player_name') || '匿名玩家',
};

export const useWorkshopStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // ==================== SETTERS ====================
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setFilter: (filter) => set({ filter: filter }),
      setError: (error) => set({ error }),

      // ==================== FETCH ====================
      fetchMaps: async () => {
        if (!isSupabaseConfigured()) {
          set({ error: 'Supabase 未配置' });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          let query = supabase
            .from('workshop_maps')
            .select('*')
            .order(get().sortBy === 'popular' ? 'downloads' : get().sortBy === 'rating' ? 'rating_avg' : 'created_at',
                   { ascending: false });

          const { data, error } = await query;
          if (error) throw error;
          set({ maps: data || [], isLoading: false, lastFetched: Date.now() });
        } catch (e) {
          set({ error: e.message, isLoading: false });
        }
      },

      fetchQuestions: async () => {
        if (!isSupabaseConfigured()) {
          set({ error: 'Supabase 未配置' });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('workshop_questions')
            .select('*')
            .order(get().sortBy === 'popular' ? 'downloads' : get().sortBy === 'rating' ? 'rating_avg' : 'created_at',
                   { ascending: false });
          if (error) throw error;
          set({ questions: data || [], isLoading: false, lastFetched: Date.now() });
        } catch (e) {
          set({ error: e.message, isLoading: false });
        }
      },

      fetchThemes: async () => {
        if (!isSupabaseConfigured()) {
          set({ error: 'Supabase 未配置' });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('workshop_themes')
            .select('*')
            .order(get().sortBy === 'popular' ? 'downloads' : get().sortBy === 'rating' ? 'rating_avg' : 'created_at',
                   { ascending: false });
          if (error) throw error;
          set({ themes: data || [], isLoading: false, lastFetched: Date.now() });
        } catch (e) {
          set({ error: e.message, isLoading: false });
        }
      },

      fetchAll: async () => {
        await Promise.all([get().fetchMaps(), get().fetchQuestions(), get().fetchThemes()]);
      },

      // ==================== PUBLISH ====================
      publishMap: async ({ name, description, tags, difficulty, boardConfig, rulesConfig, tileCount }) => {
        if (!isSupabaseConfigured()) return { error: 'Supabase 未配置' };
        const { userId, userName } = get();
        try {
          const { data, error } = await supabase
            .from('workshop_maps')
            .insert({
              author_id: userId,
              author_name: userName,
              name,
              description: description || '',
              tags: tags || [],
              difficulty: difficulty || 3,
              board_config: boardConfig,
              rules_config: rulesConfig || {},
              tile_count: tileCount || boardConfig?.length || 0,
            })
            .select()
            .single();
          if (error) throw error;
          set(s => ({ maps: [data, ...s.maps] }));
          return { success: true, data };
        } catch (e) {
          return { error: e.message };
        }
      },

      publishQuestions: async ({ title, categories, questions }) => {
        if (!isSupabaseConfigured()) return { error: 'Supabase 未配置' };
        const { userId, userName } = get();
        try {
          const { data, error } = await supabase
            .from('workshop_questions')
            .insert({
              author_id: userId,
              author_name: userName,
              title,
              categories: categories || [],
              questions,
            })
            .select()
            .single();
          if (error) throw error;
          set(s => ({ questions: [data, ...s.questions] }));
          return { success: true, data };
        } catch (e) {
          return { error: e.message };
        }
      },

      publishTheme: async ({ name, themeConfig }) => {
        if (!isSupabaseConfigured()) return { error: 'Supabase 未配置' };
        const { userId, userName } = get();
        try {
          const { data, error } = await supabase
            .from('workshop_themes')
            .insert({
              author_id: userId,
              author_name: userName,
              name,
              theme_config: themeConfig,
            })
            .select()
            .single();
          if (error) throw error;
          set(s => ({ themes: [data, ...s.themes] }));
          return { success: true, data };
        } catch (e) {
          return { error: e.message };
        }
      },

      // ==================== DOWNLOAD ====================
      downloadMap: async (mapId) => {
        if (!isSupabaseConfigured()) return { error: 'Supabase 未配置' };
        try {
          // Check cache first
          const { downloadedItems } = get();
          if (downloadedItems[mapId]) {
            return { success: true, data: downloadedItems[mapId] };
          }

          const { data, error } = await supabase
            .from('workshop_maps')
            .select('*')
            .eq('id', mapId)
            .single();
          if (error) throw error;

          // Increment download count
          await supabase.rpc('increment_map_downloads', { map_id: mapId }).catch(() => {});

          // Cache locally
          set(s => ({
            downloadedItems: { ...s.downloadedItems, [mapId]: data },
          }));

          return { success: true, data };
        } catch (e) {
          return { error: e.message };
        }
      },

      downloadQuestions: async (qId) => {
        if (!isSupabaseConfigured()) return { error: 'Supabase 未配置' };
        try {
          const { downloadedItems } = get();
          if (downloadedItems[qId]) {
            return { success: true, data: downloadedItems[qId] };
          }

          const { data, error } = await supabase
            .from('workshop_questions')
            .select('*')
            .eq('id', qId)
            .single();
          if (error) throw error;

          await supabase.rpc('increment_question_downloads', { q_id: qId }).catch(() => {});

          set(s => ({
            downloadedItems: { ...s.downloadedItems, [qId]: data },
          }));

          return { success: true, data };
        } catch (e) {
          return { error: e.message };
        }
      },

      downloadTheme: async (tId) => {
        if (!isSupabaseConfigured()) return { error: 'Supabase 未配置' };
        try {
          const { downloadedItems } = get();
          if (downloadedItems[tId]) {
            return { success: true, data: downloadedItems[tId] };
          }

          const { data, error } = await supabase
            .from('workshop_themes')
            .select('*')
            .eq('id', tId)
            .single();
          if (error) throw error;

          await supabase.rpc('increment_theme_downloads', { t_id: tId }).catch(() => {});

          set(s => ({
            downloadedItems: { ...s.downloadedItems, [tId]: data },
          }));

          return { success: true, data };
        } catch (e) {
          return { error: e.message };
        }
      },

      // ==================== SUBSCRIPTIONS ====================
      subscribe: (itemId) => {
        const { subscriptions } = get();
        if (!subscriptions.includes(itemId)) {
          set({ subscriptions: [...subscriptions, itemId] });
        }
      },

      unsubscribe: (itemId) => {
        set(s => ({
          subscriptions: s.subscriptions.filter(id => id !== itemId),
        }));
      },

      isSubscribed: (itemId) => get().subscriptions.includes(itemId),

      // ==================== RATING ====================
      rateItem: async ({ itemId, itemType, rating, comment }) => {
        if (!isSupabaseConfigured()) return { error: 'Supabase 未配置' };
        const { userId } = get();
        try {
          const { data, error } = await supabase
            .from('workshop_ratings')
            .upsert({
              item_id: itemId,
              item_type: itemType,
              user_id: userId,
              rating,
              comment: comment || '',
            })
            .select()
            .single();
          if (error) throw error;
          
          // Update the item's average rating in the store
          const { data: avgData } = await supabase
            .from('workshop_ratings')
            .select('rating')
            .eq('item_id', itemId);
          
          if (avgData && avgData.length > 0) {
            const avgRating = avgData.reduce((sum, r) => sum + r.rating, 0) / avgData.length;
            const ratingCount = avgData.length;
            
            // Update in maps/questions/themes
            if (itemType === 'map') {
              set(s => ({ maps: s.maps.map(m => m.id === itemId ? { ...m, rating_avg: avgRating, rating_count: ratingCount } : m) }));
            } else if (itemType === 'question') {
              set(s => ({ questions: s.questions.map(q => q.id === itemId ? { ...q, rating_avg: avgRating, rating_count: ratingCount } : q) }));
            }
          }
          
          return { success: true, data };
        } catch (e) {
          return { error: e.message };
        }
      },

      // Rate difficulty for maps
      rateMapDifficulty: async (mapId, difficulty) => {
        if (!isSupabaseConfigured()) return { error: 'Supabase 未配置' };
        try {
          const { data, error } = await supabase
            .from('workshop_maps')
            .update({ difficulty })
            .eq('id', mapId)
            .select()
            .single();
          if (error) throw error;
          
          // Update local store
          set(s => ({ maps: s.maps.map(m => m.id === mapId ? { ...m, difficulty } : m) }));
          
          return { success: true, data };
        } catch (e) {
          return { error: e.message };
        }
      },

      getItemRatings: async (itemId) => {
        if (!isSupabaseConfigured()) return [];
        try {
          const { data, error } = await supabase
            .from('workshop_ratings')
            .select('*')
            .eq('item_id', itemId);
          if (error) throw error;
          return data || [];
        } catch (e) {
          return [];
        }
      },

      getUserRating: async (itemId) => {
        if (!isSupabaseConfigured()) return null;
        const { userId } = get();
        try {
          const { data, error } = await supabase
            .from('workshop_ratings')
            .select('*')
            .eq('item_id', itemId)
            .eq('user_id', userId)
            .single();
          if (error) return null;
          return data;
        } catch (e) {
          return null;
        }
      },

      // ==================== EXPORT/IMPORT ====================
      exportMapToJSON: (mapData) => {
        const json = JSON.stringify(mapData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${mapData.name || 'map'}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },

      importMapFromJSON: (jsonString) => {
        try {
          return { success: true, data: JSON.parse(jsonString) };
        } catch (e) {
          return { error: '无效的 JSON 格式' };
        }
      },

      // ==================== CACHE ====================
      clearCache: () => {
        set({ maps: [], questions: [], themes: [], lastFetched: null });
      },

      clearDownloads: () => {
        set({ downloadedItems: {} });
      },
    }),
    {
      name: 'monopoly3d_workshop',
      partialize: (state) => ({
        subscriptions: state.subscriptions,
        downloadedItems: state.downloadedItems,
        userId: state.userId,
        userName: state.userName,
      }),
    }
  )
);

export const useWorkshopActiveTab = () => useWorkshopStore(s => s.activeTab);
export const useWorkshopSort = () => useWorkshopStore(s => s.sortBy);
