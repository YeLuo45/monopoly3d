import { useState, useEffect } from 'react';
import useEditorStore from './editorStore';
import { TILE_TYPES, COLOR_GROUPS } from './editorTypes';

export default function PropertiesPanel() {
  const tiles = useEditorStore((s) => s.tiles);
  const selectedTileIndex = useEditorStore((s) => s.selectedTileIndex);
  const updateTile = useEditorStore((s) => s.updateTile);
  const setTileType = useEditorStore((s) => s.setTileType);
  const resetTile = useEditorStore((s) => s.resetTile);

  const selectedTile = selectedTileIndex !== null ? tiles[selectedTileIndex] : null;

  if (selectedTileIndex === null) {
    return (
      <div className="w-80 bg-gray-900/95 rounded-lg p-4 text-white h-full overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">属性面板</h2>
        <p className="text-gray-400 text-sm">点击棋盘上的格子以编辑其属性</p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-900/95 rounded-lg p-4 text-white h-full overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">
        格子 #{selectedTileIndex + 1} 属性
      </h2>

      {/* Tile Type Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">类型</label>
        <select
          value={selectedTile.type}
          onChange={(e) => setTileType(selectedTileIndex, e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
        >
          <option value={TILE_TYPES.PROPERTY}>房产</option>
          <option value={TILE_TYPES.CHANCE}>机会</option>
          <option value={TILE_TYPES.QUESTION}>问题</option>
          <option value={TILE_TYPES.TAX}>税务</option>
          <option value={TILE_TYPES.GO}>起点</option>
          <option value={TILE_TYPES.JAIL}>监狱</option>
          <option value={TILE_TYPES.FREE_PARKING}>休息站</option>
          <option value={TILE_TYPES.GO_TO_JAIL}>前往监狱</option>
        </select>
      </div>

      {/* Common Properties */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">名称</label>
        <input
          type="text"
          value={selectedTile.name || ''}
          onChange={(e) => updateTile(selectedTileIndex, { name: e.target.value })}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
        />
      </div>

      {/* Property-specific fields */}
      {selectedTile.type === TILE_TYPES.PROPERTY && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">价格</label>
            <input
              type="number"
              value={selectedTile.price || 0}
              onChange={(e) => updateTile(selectedTileIndex, { price: parseInt(e.target.value) || 0 })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">颜色</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(COLOR_GROUPS).map(([name, color]) => (
                <button
                  key={name}
                  onClick={() => updateTile(selectedTileIndex, { color })}
                  className={`w-10 h-10 rounded border-2 ${
                    selectedTile.color === color ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  title={name}
                />
              ))}
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">自定义颜色</label>
              <input
                type="color"
                value={selectedTile.color || '#94A3B8'}
                onChange={(e) => updateTile(selectedTileIndex, { color: e.target.value })}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">颜色组</label>
            <select
              value={selectedTile.group || ''}
              onChange={(e) => updateTile(selectedTileIndex, { group: e.target.value || null })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="">无组</option>
              {Object.keys(COLOR_GROUPS).map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">租金 (基础/一房/二房/三房/四房/酒店)</label>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <input
                  key={i}
                  type="number"
                  value={selectedTile.rent?.[i] || 0}
                  onChange={(e) => {
                    const newRent = [...(selectedTile.rent || [0, 0, 0, 0, 0, 0])];
                    newRent[i] = parseInt(e.target.value) || 0;
                    updateTile(selectedTileIndex, { rent: newRent });
                  }}
                  placeholder={`${i === 0 ? '基础' : `${i}房`}`}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-full"
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Tax-specific fields */}
      {selectedTile.type === TILE_TYPES.TAX && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">税额</label>
          <input
            type="number"
            value={selectedTile.amount || 0}
            onChange={(e) => updateTile(selectedTileIndex, { amount: parseInt(e.target.value) || 0 })}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
          />
        </div>
      )}

      {/* Reset Button */}
      <div className="mt-6">
        <button
          onClick={() => resetTile(selectedTileIndex)}
          className="w-full bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2 text-sm font-medium transition-colors"
        >
          重置此格子
        </button>
      </div>
    </div>
  );
}
