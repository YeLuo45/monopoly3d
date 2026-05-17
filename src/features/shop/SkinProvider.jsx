/**
 * Skin Context Provider
 * 
 * Wraps the app and provides skin/theme context to all components.
 * Reads equipped items from inventory and applies them to rendering.
 */

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  SkinContext,
  loadInventory,
  saveInventory,
  getItemById,
  ITEM_TYPES,
  BOARD_THEMES,
} from './itemRegistry';

export function SkinProvider({ children }) {
  const [inventory, setInventory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load inventory on mount
  useEffect(() => {
    const loaded = loadInventory();
    setInventory(loaded);
    setIsLoading(false);
  }, []);

  // Refresh inventory from localStorage (in case other tabs changed it)
  useEffect(() => {
    const onStorageChange = (e) => {
      if (e.key === 'monopoly3d_inventory') {
        const loaded = loadInventory();
        setInventory(loaded);
      }
    };
    return () => window.removeEventListener('storage', onStorageChange);
  }, []);

  const value = useMemo(() => ({
    inventory,
    setInventory,
    isLoading,
    
    // Helper to get current equipped item
    getEquipped: (type) => {
      if (!inventory) return null;
      const equippedId = inventory.equippedItems?.[type];
      return equippedId ? getItemById(equippedId) : null;
    },
    
    // Helper to check if owns item
    ownsItem: (itemId) => {
      return inventory?.ownedItems?.includes(itemId) || false;
    },
    
    // Helper to get board theme colors
    getBoardTheme: () => {
      if (!inventory) return BOARD_THEMES.classic_green;
      const equippedId = inventory.equippedItems?.[ITEM_TYPES.BOARD_THEME];
      return equippedId ? getItemById(equippedId) : BOARD_THEMES.classic_green;
    },
    
    // Helper to get token skin
    getTokenSkin: (pieceId) => {
      if (!inventory) return null;
      const equippedId = inventory.equippedItems?.[ITEM_TYPES.TOKEN_SKIN];
      return equippedId ? getItemById(equippedId) : null;
    },
  }), [inventory, isLoading]);

  return (
    <SkinContext.Provider value={value}>
      {children}
    </SkinContext.Provider>
  );
}

// Hook to use skin context
export function useSkin() {
  const ctx = useContext(SkinContext);
  if (!ctx) {
    // Return default values if not wrapped (for components used outside SkinProvider)
    return {
      inventory: null,
      setInventory: () => {},
      isLoading: false,
      getEquipped: () => null,
      ownsItem: () => false,
      getBoardTheme: () => BOARD_THEMES.classic_green,
      getTokenSkin: () => null,
    };
  }
  return ctx;
}