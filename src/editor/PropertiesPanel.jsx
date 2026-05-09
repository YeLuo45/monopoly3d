import { useState, useEffect } from 'react';
import useEditorStore from './editorStore';
import { TILE_TYPES, COLOR_GROUPS, TILE_TYPE_INFO } from './editorTypes';
import TilePalette from './TilePalette';
import { t } from '../i18n';

export default function PropertiesPanel() {
  const tiles = useEditorStore((s) => s.tiles);
  const selectedTileIndex = useEditorStore((s) => s.selectedTileIndex);
  const updateTile = useEditorStore((s) => s.updateTile);
  const setTileType = useEditorStore((s) => s.setTileType);
  const resetTile = useEditorStore((s) => s.resetTile);

  const selectedTile = selectedTileIndex !== null ? tiles[selectedTileIndex] : null;
  const [activeTab, setActiveTab] = useState('properties');

  if (selectedTileIndex === null) {
    return (
      <div className="w-80 bg-gray-900/95 rounded-lg p-4 text-white h-full overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">{t('properties_panel')}</h2>
        <p className="text-gray-400 text-sm mb-4">{t('click_tile_to_edit')}</p>
        
        {/* Tile Type Palette - always visible */}
        <TilePalette />
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-900/95 rounded-lg p-4 text-white h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: selectedTile?.type ? TILE_TYPE_INFO[selectedTile.type]?.color : '#6B7280' }}
          />
          {t('tile_number')}{selectedTileIndex + 1}
        </h2>
        <span className="text-xs text-gray-400">
          {TILE_TYPE_INFO[selectedTile?.type]?.icon} {TILE_TYPE_INFO[selectedTile?.type]?.label}
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'properties' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          {t('name')}
        </button>
        <button
          onClick={() => setActiveTab('palette')}
          className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'palette' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          {t('type')}
        </button>
      </div>

      {/* Properties Tab */}
      {activeTab === 'properties' && (
        <>
          {/* Name Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('name')}</label>
            <input
              type="text"
              value={selectedTile.name || ''}
              onChange={(e) => updateTile(selectedTileIndex, { name: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              placeholder={t('enter_tile_name')}
            />
          </div>

          {/* Property-specific fields */}
          {selectedTile.type === TILE_TYPES.PROPERTY && (
            <>
              {/* Price */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  💵 {t('price')}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 font-bold text-lg">$</span>
                  <input
                    type="number"
                    value={selectedTile.price || 0}
                    onChange={(e) => updateTile(selectedTileIndex, { price: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Color */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">🎨 {t('color')}</label>
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {Object.entries(COLOR_GROUPS).map(([name, color]) => (
                    <button
                      key={name}
                      onClick={() => updateTile(selectedTileIndex, { color })}
                      className={`w-8 h-8 rounded border-2 transition-transform hover:scale-110 ${
                        selectedTile.color === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      title={name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedTile.color || '#94A3B8'}
                    onChange={(e) => updateTile(selectedTileIndex, { color: e.target.value })}
                    className="w-12 h-8 rounded cursor-pointer bg-gray-800"
                  />
                  <input
                    type="text"
                    value={selectedTile.color || '#94A3B8'}
                    onChange={(e) => updateTile(selectedTileIndex, { color: e.target.value })}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs font-mono"
                    placeholder="#hex"
                  />
                </div>
              </div>

              {/* Color Group */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">📦 {t('color_group')}</label>
                <select
                  value={selectedTile.group || ''}
                  onChange={(e) => updateTile(selectedTileIndex, { group: e.target.value || null })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                >
                  <option value="">{t('no_group')}</option>
                  {Object.keys(COLOR_GROUPS).map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>

              {/* Rent */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">🏠 {t('rent')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 0, label: t('rent_base') },
                    { key: 1, label: t('rent_1house') },
                    { key: 2, label: t('rent_2house') },
                    { key: 3, label: t('rent_3house') },
                    { key: 4, label: t('rent_4house') },
                    { key: 5, label: t('rent_hotel') },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">{label}</span>
                      <input
                        type="number"
                        value={selectedTile.rent?.[key] || 0}
                        onChange={(e) => {
                          const newRent = [...(selectedTile.rent || [0, 0, 0, 0, 0, 0])];
                          newRent[key] = parseInt(e.target.value) || 0;
                          updateTile(selectedTileIndex, { rent: newRent });
                        }}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Tax-specific fields */}
          {selectedTile.type === TILE_TYPES.TAX && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">💰 {t('tax_amount')}</label>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-bold text-lg">$</span>
                <input
                  type="number"
                  value={selectedTile.amount || 0}
                  onChange={(e) => updateTile(selectedTileIndex, { amount: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* Read-only type indicator for special tiles */}
          {(selectedTile.type === TILE_TYPES.GO || 
            selectedTile.type === TILE_TYPES.JAIL || 
            selectedTile.type === TILE_TYPES.FREE_PARKING || 
            selectedTile.type === TILE_TYPES.GO_TO_JAIL ||
            selectedTile.type === TILE_TYPES.CHANCE ||
            selectedTile.type === TILE_TYPES.QUESTION) && (
            <div className="mb-4 p-3 bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-400">
                {TILE_TYPE_INFO[selectedTile.type]?.description}
              </div>
            </div>
          )}

          {/* Tile Type Change */}
          <div className="mb-4 pt-3 border-t border-gray-700">
            <label className="block text-sm font-medium text-gray-300 mb-2">🔄 {t('change_type')}</label>
            <select
              value={selectedTile.type}
              onChange={(e) => setTileType(selectedTileIndex, e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            >
              {Object.entries(TILE_TYPE_INFO).map(([type, info]) => (
                <option key={type} value={type}>{info.icon} {info.label}</option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => resetTile(selectedTileIndex)}
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2 text-sm font-medium transition-colors mt-2"
          >
            🔄 {t('reset_tile')}
          </button>
        </>
      )}

      {/* Palette Tab */}
      {activeTab === 'palette' && (
        <TilePalette />
      )}
    </div>
  );
}
