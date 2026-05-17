import { useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import useEditorStore from './editorStore';
import { BOARD_SIZES } from './editorTypes';
import EditorBoard from './EditorBoard';
import PropertiesPanel from './PropertiesPanel';
import { BOARD_THEMES } from '../game/themes';
import { useGameStore } from '../game/store';
import { t } from '../i18n';

function Toolbar({ onSave, onLoad, onExport, onImport }) {
  const boardSize = useEditorStore((s) => s.boardSize);
  const setBoardSize = useEditorStore((s) => s.setBoardSize);
  const loadTemplate = useEditorStore((s) => s.loadTemplate);
  const templates = useEditorStore((s) => s.templates);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const history = useEditorStore((s) => s.history);
  const historyIndex = useEditorStore((s) => s.historyIndex);
  const isPreviewMode = useEditorStore((s) => s.isPreviewMode);
  const togglePreview = useEditorStore((s) => s.togglePreview);
  const showGrid = useEditorStore((s) => s.showGrid);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);

  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onImport(event.target?.result);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-800/95 rounded-lg">
      {/* Board Size Selector */}
      <div className="flex items-center gap-2 border-r border-gray-600 pr-3">
        <span className="text-sm text-gray-300">{t('board')}:</span>
        <select
          value={boardSize}
          onChange={(e) => setBoardSize(parseInt(e.target.value))}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
        >
          {Object.entries(BOARD_SIZES).map(([size, config]) => (
            <option key={size} value={size}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Templates */}
      <div className="flex items-center gap-2 border-r border-gray-600 pr-3">
        <span className="text-sm text-gray-300">{t('templates')}:</span>
        <select
          onChange={(e) => e.target.value && loadTemplate(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          value=""
        >
          <option value="">{t('select_template')}</option>
          {Object.entries(templates).map(([key, template]) => (
            <option key={key} value={key}>{template.name}</option>
          ))}
        </select>
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r border-gray-600 pr-3">
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          className="p-2 rounded hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          title={t('undo')}
        >
          ↩️
        </button>
        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="p-2 rounded hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          title={t('redo')}
        >
          ↪️
        </button>
      </div>

// View Options
      <div className="flex items-center gap-2 border-r border-gray-600 pr-3">
        <button
          onClick={togglePreview}
          className={`px-3 py-1 rounded text-sm ${isPreviewMode ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          {isPreviewMode ? t('edit_mode') : t('preview_mode')}
        </button>
        <button
          onClick={toggleGrid}
          className={`px-3 py-1 rounded text-sm ${showGrid ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          {t('grid')}
        </button>
      </div>

      {/* Board Theme Selector */}
      <div className="flex items-center gap-2 border-r border-gray-600 pr-3">
        <span className="text-sm text-gray-300">🎨:</span>
        <select
          value={useEditorStore.getState().boardTheme}
          onChange={(e) => useEditorStore.getState().setBoardTheme(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
        >
          <option value="classic">经典</option>
          <option value="modern">现代</option>
          <option value="pastel">马卡龙</option>
          <option value="neon">霓虹</option>
          <option value="forest">森林</option>
          <option value="sunset">夕阳</option>
        </select>
      </div>

      {/* File Operations */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          className="px-3 py-1 rounded text-sm bg-green-600 hover:bg-green-700"
        >
          {t('save')}
        </button>
        <button
          onClick={onLoad}
          className="px-3 py-1 rounded text-sm bg-blue-600 hover:bg-blue-700"
        >
          {t('load')}
        </button>
        <button
          onClick={handleImportClick}
          className="px-3 py-1 rounded text-sm bg-purple-600 hover:bg-purple-700"
        >
          {t('import')}
        </button>
        <button
          onClick={onExport}
          className="px-3 py-1 rounded text-sm bg-orange-600 hover:bg-orange-700"
        >
          {t('export')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}

function RulesPanel() {
  const rules = useEditorStore((s) => s.rules);
  const updateRules = useEditorStore((s) => s.updateRules);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gray-900/95 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 text-left text-white font-medium flex justify-between items-center hover:bg-gray-800"
      >
        <span>⚙️ {t('game_rules_config')}</span>
        <span>{isOpen ? '▼' : '▶'}</span>
      </button>
      
      {isOpen && (
        <div className="p-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">{t('starting_money')}</label>
            <input
              type="number"
              value={rules.startingMoney}
              onChange={(e) => updateRules({ startingMoney: parseInt(e.target.value) || 0 })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">{t('passing_go_bonus')}</label>
            <input
              type="number"
              value={rules.passingGoBonus}
              onChange={(e) => updateRules({ passingGoBonus: parseInt(e.target.value) || 0 })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">{t('house_cost')}</label>
            <input
              type="number"
              value={rules.houseCost}
              onChange={(e) => updateRules({ houseCost: parseInt(e.target.value) || 0 })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">{t('hotel_cost')}</label>
            <input
              type="number"
              value={rules.hotelCost}
              onChange={(e) => updateRules({ hotelCost: parseInt(e.target.value) || 0 })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">{t('max_rounds')}</label>
            <input
              type="number"
              value={rules.maxRounds}
              onChange={(e) => updateRules({ maxRounds: parseInt(e.target.value) || 0 })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">{t('question_timer_seconds')}</label>
            <input
              type="number"
              value={rules.questionTimer}
              onChange={(e) => updateRules({ questionTimer: parseInt(e.target.value) || 0 })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ApplyToGameButton() {
  const loadTilesForGame = useEditorStore((s) => s.loadTilesForGame);
  const setScreen = useGameStore((s) => s.screen);
  
  const handleApply = () => {
    const { tiles, rules } = loadTilesForGame();
    // Store in localStorage for game to load
    localStorage.setItem('monopoly3d_editor_tiles', JSON.stringify(tiles));
    localStorage.setItem('monopoly3d_editor_rules', JSON.stringify(rules));
    alert(t('map_saved_for_game'));
    setScreen('menu');
  };
  
  return (
    <button
      onClick={handleApply}
      className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg px-4 py-3 font-bold transition-all"
    >
      🚀 {t('apply_to_game')}
    </button>
  );
}

export default function EditorPage() {
  const tiles = useEditorStore((s) => s.tiles);
  const exportTiles = useEditorStore((s) => s.exportTiles);
  const importTiles = useEditorStore((s) => s.importTiles);
  const isPreviewMode = useEditorStore((s) => s.isPreviewMode);
  const boardSize = useEditorStore((s) => s.boardSize);

  const handleSave = useCallback(() => {
    const data = exportTiles();
    localStorage.setItem('monopoly3d_editor_save', data);
    alert(t('editor_data_saved'));
  }, [exportTiles]);

  const handleLoad = useCallback(() => {
    const saved = localStorage.getItem('monopoly3d_editor_save');
    if (saved) {
      if (importTiles(saved)) {
        alert(t('data_loaded_success'));
      } else {
        alert(t('data_load_failed'));
      }
    } else {
      alert(t('no_saved_data'));
    }
  }, [importTiles]);

  const handleExport = useCallback(() => {
    const data = exportTiles();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monopoly3d_map_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportTiles]);

  const handleImport = useCallback((jsonData) => {
    if (importTiles(jsonData)) {
      alert(t('map_import_success'));
    } else {
      alert(t('map_import_failed'));
    }
  }, [importTiles]);

  return (
    <div className="w-full h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
      {/* Header Toolbar */}
      <div className="p-3 bg-gray-900/80 border-b border-gray-700">
        <Toolbar
          onSave={handleSave}
          onLoad={handleLoad}
          onExport={handleExport}
          onImport={handleImport}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Canvas */}
        <div className="flex-1 relative">
          <Canvas shadows camera={{ position: [20, 20, 20], fov: 50 }}>
            <ambientLight intensity={1.2} color="#fff8f0" />
            <directionalLight
              position={[15, 20, 15]}
              intensity={1.8}
              color="#fff5e0"
              castShadow
              shadow-mapSize={[2048, 2048]}
            />
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={15}
              maxDistance={50}
            />
            <EditorBoard />
          </Canvas>

          {/* Overlay info */}
          <div className="absolute top-4 left-4 bg-gray-900/80 rounded-lg p-3 text-white">
            <div className="text-sm font-medium">
              📐 {BOARD_SIZES[boardSize]?.label || `${boardSize}${t('tiles')}`}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {t('current_map')}: {tiles.length} {t('tiles_count')} | {t('click_tile_to_edit')}
            </div>
          </div>

          {/* Mode indicator */}
          {isPreviewMode && (
            <div className="absolute top-4 right-4 bg-yellow-500/80 rounded-lg px-4 py-2 text-white font-bold">
              👁 {t('preview_mode_view_only')}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 p-3 flex flex-col gap-3 overflow-y-auto bg-gray-900/30">
          <PropertiesPanel />
          <RulesPanel />
          <ApplyToGameButton />
        </div>
      </div>
    </div>
  );
}
