import { create } from 'zustand';
import { generateBoardConfig, DEFAULT_RULE_CONFIG, TILE_TYPES } from './editorTypes';

const PRESET_TEMPLATES = {
  classic_36: {
    name: '经典36格',
    description: '标准大富翁棋盘，36格四面围圈',
    size: 36,
    config: null, // Will use default
  },
  compact_24: {
    name: '紧凑24格',
    description: '简化版棋盘，适合快速游戏',
    size: 24,
    config: null,
  },
  mini_16: {
    name: '迷你16格',
    description: '入门级小棋盘，适合教学',
    size: 16,
    config: null,
  },
  large_48: {
    name: '大型48格',
    description: '扩展版棋盘，更多房产选择',
    size: 48,
    config: null,
  },
};

const useEditorStore = create((set, get) => ({
  // Board size
  boardSize: 36,
  
  // Current tiles configuration
  tiles: generateBoardConfig(36),
  
  // Selected tile index
  selectedTileIndex: null,
  
  // UI State
  isPreviewMode: false,
  showGrid: true,
  
  // Rule configuration
  rules: { ...DEFAULT_RULE_CONFIG },
  
  // Preset templates
  templates: PRESET_TEMPLATES,
  
  // Undo/Redo history
  history: [],
  historyIndex: -1,
  
  // Set board size and regenerate tiles
  setBoardSize: (size) => {
    const tiles = generateBoardConfig(size);
    set({ 
      boardSize: size, 
      tiles,
      selectedTileIndex: null,
      history: [],
      historyIndex: -1,
    });
  },
  
  // Load a preset template
  loadTemplate: (templateKey) => {
    const template = PRESET_TEMPLATES[templateKey];
    if (!template) return;
    
    const tiles = template.config || generateBoardConfig(template.size);
    set({ 
      boardSize: template.size,
      tiles,
      selectedTileIndex: null,
      history: [],
      historyIndex: -1,
    });
  },
  
  // Save current state to history
  saveToHistory: () => {
    const { tiles, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(tiles)));
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    set({ 
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },
  
  // Undo
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({
        tiles: JSON.parse(JSON.stringify(history[historyIndex - 1])),
        historyIndex: historyIndex - 1,
      });
    }
  },
  
  // Redo
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({
        tiles: JSON.parse(JSON.stringify(history[historyIndex + 1])),
        historyIndex: historyIndex + 1,
      });
    }
  },
  
  // Select a tile
  selectTile: (index) => {
    set({ selectedTileIndex: index });
  },
  
  // Update a tile
  updateTile: (index, updates) => {
    get().saveToHistory();
    set((state) => {
      const newTiles = [...state.tiles];
      newTiles[index] = { ...newTiles[index], ...updates };
      return { tiles: newTiles };
    });
  },
  
  // Set tile type
  setTileType: (index, type) => {
    get().saveToHistory();
    set((state) => {
      const newTiles = [...state.tiles];
      const oldTile = newTiles[index];
      let newTile;
      
      switch (type) {
        case TILE_TYPES.PROPERTY:
          newTile = {
            ...oldTile,
            type: TILE_TYPES.PROPERTY,
            name: oldTile.name || `房产 ${index + 1}`,
            price: oldTile.price || 100,
            rent: oldTile.rent || [10, 20, 30, 40, 50],
            color: oldTile.color || '#94A3B8',
            group: oldTile.group || null,
            houses: 0,
            mortgaged: false,
            owner: null,
          };
          break;
        case TILE_TYPES.CHANCE:
          newTile = { id: index, name: '机会', type: TILE_TYPES.CHANCE };
          break;
        case TILE_TYPES.QUESTION:
          newTile = { id: index, name: '问题', type: TILE_TYPES.QUESTION };
          break;
        case TILE_TYPES.TAX:
          newTile = { id: index, name: '税务', type: TILE_TYPES.TAX, amount: oldTile.amount || 100 };
          break;
        case TILE_TYPES.GO:
          newTile = { id: index, name: '起点 GO', type: TILE_TYPES.GO, subtype: 'GO' };
          break;
        case TILE_TYPES.JAIL:
          newTile = { id: index, name: '监狱', type: TILE_TYPES.JAIL, subtype: 'JAIL' };
          break;
        case TILE_TYPES.FREE_PARKING:
          newTile = { id: index, name: '休息站', type: TILE_TYPES.FREE_PARKING, subtype: 'FREE_PARKING' };
          break;
        case TILE_TYPES.GO_TO_JAIL:
          newTile = { id: index, name: '前往监狱', type: TILE_TYPES.GO_TO_JAIL, subtype: 'GO_TO_JAIL' };
          break;
        default:
          newTile = { ...oldTile, type };
      }
      
      newTiles[index] = newTile;
      return { tiles: newTiles };
    });
  },
  
  // Delete a tile (reset to default property)
  resetTile: (index) => {
    get().saveToHistory();
    set((state) => {
      const newTiles = [...state.tiles];
      newTiles[index] = {
        id: index,
        name: `房产 ${index + 1}`,
        type: TILE_TYPES.PROPERTY,
        price: 100 + index * 10,
        rent: [10 + index, 20 + index * 2, 30 + index * 3, 40 + index * 4, 50 + index * 5],
        color: '#94A3B8',
        group: null,
        owner: null,
        houses: 0,
        mortgaged: false,
      };
      return { tiles: newTiles };
    });
  },
  
  // Toggle preview mode
  togglePreview: () => set((state) => ({ isPreviewMode: !state.isPreviewMode })),
  
  // Toggle grid
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  
  // Update rules
  updateRules: (updates) => {
    set((state) => ({
      rules: { ...state.rules, ...updates },
    }));
  },
  
  // Import tiles from JSON
  importTiles: (jsonData) => {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      if (Array.isArray(data.tiles)) {
        get().saveToHistory();
        set({
          tiles: data.tiles,
          boardSize: data.tiles.length,
          selectedTileIndex: null,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import:', e);
      return false;
    }
  },
  
  // Export tiles to JSON
  exportTiles: () => {
    const { tiles, rules, boardSize } = get();
    return JSON.stringify({
      version: '1.0',
      boardSize,
      rules,
      tiles,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  },
  
  // Load tiles from file (for game integration)
  loadTilesForGame: () => {
    const { tiles, rules } = get();
    return { tiles, rules };
  },
}));

export default useEditorStore;
