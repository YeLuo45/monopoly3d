/**
 * CollectionsManager - Organize and manage downloaded content
 * 
 * Features:
 * - Create custom collections (folders)
 * - Add/remove items to collections
 * - Rename/delete collections
 * - Quick access to downloaded content
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const DEFAULT_COLLECTIONS = [
  { id: 'favorites', name: '⭐ 收藏夹', icon: '⭐', items: [], createdAt: Date.now() },
  { id: 'recent', name: '🕐 最近下载', icon: '🕐', items: [], createdAt: Date.now() },
];

export const useCollectionsStore = create(
  persist(
    (set, get) => ({
      // Collections list
      collections: DEFAULT_COLLECTIONS,
      
      // Active collection
      activeCollectionId: null,
      
      // ============ Setters ============
      
      setActiveCollection: (id) => set({ activeCollectionId: id }),
      
      // ============ Collection CRUD ============
      
      /**
       * Create new collection
       */
      createCollection: (name, icon = '📁') => {
        const newCollection = {
          id: generateId(),
          name,
          icon,
          items: [],
          createdAt: Date.now(),
        };
        
        set(state => ({
          collections: [...state.collections, newCollection],
        }));
        
        return newCollection;
      },
      
      /**
       * Rename collection
       */
      renameCollection: (collectionId, newName) => {
        set(state => ({
          collections: state.collections.map(c =>
            c.id === collectionId ? { ...c, name: newName } : c
          ),
        }));
      },
      
      /**
       * Delete collection (except default ones)
       */
      deleteCollection: (collectionId) => {
        // Prevent deleting default collections
        if (['favorites', 'recent'].includes(collectionId)) {
          return { error: 'Cannot delete default collections' };
        }
        
        set(state => ({
          collections: state.collections.filter(c => c.id !== collectionId),
          activeCollectionId: state.activeCollectionId === collectionId ? null : state.activeCollectionId,
        }));
        
        return { success: true };
      },
      
      /**
       * Add item to collection
       */
      addToCollection: (collectionId, item) => {
        set(state => ({
          collections: state.collections.map(c => {
            if (c.id !== collectionId) return c;
            
            // Check if item already exists
            if (c.items.some(i => i.id === item.id)) {
              return c; // Already in collection
            }
            
            return {
              ...c,
              items: [...c.items, { ...item, addedAt: Date.now() }],
            };
          }),
        }));
      },
      
      /**
       * Remove item from collection
       */
      removeFromCollection: (collectionId, itemId) => {
        set(state => ({
          collections: state.collections.map(c =>
            c.id === collectionId
              ? { ...c, items: c.items.filter(i => i.id !== itemId) }
              : c
          ),
        }));
      },
      
      /**
       * Toggle favorite (add/remove from favorites)
       */
      toggleFavorite: (item) => {
        const favorites = get().collections.find(c => c.id === 'favorites');
        if (!favorites) return;
        
        const isFavorited = favorites.items.some(i => i.id === item.id);
        
        if (isFavorited) {
          get().removeFromCollection('favorites', item.id);
        } else {
          get().addToCollection('favorites', item);
        }
      },
      
      /**
       * Check if item is favorited
       */
      isFavorited: (itemId) => {
        const favorites = get().collections.find(c => c.id === 'favorites');
        return favorites?.items.some(i => i.id === itemId) || false;
      },
      
      /**
       * Add to recent downloads
       */
      addToRecent: (item) => {
        // Remove if already exists
        set(state => ({
          collections: state.collections.map(c => {
            if (c.id !== 'recent') return c;
            
            const filteredItems = c.items.filter(i => i.id !== item.id);
            
            // Add to front, keep max 20
            return {
              ...c,
              items: [{ ...item, addedAt: Date.now() }, ...filteredItems].slice(0, 20),
            };
          }),
        }));
      },
      
      // ============ Queries ============
      
      /**
       * Get collection by ID
       */
      getCollection: (collectionId) => {
        return get().collections.find(c => c.id === collectionId) || null;
      },
      
      /**
       * Get all items in collection
       */
      getCollectionItems: (collectionId) => {
        const collection = get().collections.find(c => c.id === collectionId);
        return collection?.items || [];
      },
      
      /**
       * Get favorites count
       */
      getFavoritesCount: () => {
        const favorites = get().collections.find(c => c.id === 'favorites');
        return favorites?.items.length || 0;
      },
      
      /**
       * Get total items count
       */
      getTotalItemsCount: () => {
        const { collections } = get();
        // Exclude 'recent' from count
        return collections
          .filter(c => c.id !== 'recent')
          .reduce((sum, c) => sum + c.items.length, 0);
      },
      
      /**
       * Search items across collections
       */
      searchItems: (query) => {
        const { collections } = get();
        const results = [];
        
        collections.forEach(collection => {
          if (collection.id === 'recent') return; // Skip recent for search
          
          collection.items.forEach(item => {
            const searchText = `${item.name || ''} ${item.description || ''}`.toLowerCase();
            if (searchText.includes(query.toLowerCase())) {
              results.push({ ...item, collectionId: collection.id, collectionName: collection.name });
            }
          });
        });
        
        return results;
      },
      
      /**
       * Clear recent downloads
       */
      clearRecent: () => {
        set(state => ({
          collections: state.collections.map(c =>
            c.id === 'recent' ? { ...c, items: [] } : c
          ),
        }));
      },
    }),
    {
      name: 'monopoly3d-collections',
    }
  )
);

export default useCollectionsStore;