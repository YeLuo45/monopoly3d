import useEditorStore from './editorStore';
import { TILE_TYPES, TILE_TYPE_INFO } from './editorTypes';
import { t } from '../i18n';

/**
 * Visual Tile Palette - Quick tile type selector with 8 tile types
 */
export default function TilePalette() {
  const setTileType = useEditorStore((s) => s.setTileType);
  const selectedTileIndex = useEditorStore((s) => s.selectedTileIndex);
  const tiles = useEditorStore((s) => s.tiles);

  const selectedTile = selectedTileIndex !== null ? tiles[selectedTileIndex] : null;
  const currentType = selectedTile?.type;

  const handleTileTypeSelect = (type) => {
    if (selectedTileIndex !== null) {
      setTileType(selectedTileIndex, type);
    }
  };

  return (
    <div className="bg-gray-900/95 rounded-lg p-4 text-white">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        <span>🎨</span> {t('quick_select_tile_type')}
      </h3>
      
      {/* Selected tile indicator */}
      {selectedTileIndex !== null ? (
        <div className="text-xs text-gray-400 mb-3">
          {t('selected_tile')}: {t('tile_number')}{selectedTileIndex + 1} ({currentType && TILE_TYPE_INFO[currentType]?.label || t('unknown')})
        </div>
      ) : (
        <div className="text-xs text-gray-400 mb-3">
          {t('click_tile_first')}
        </div>
      )}

      {/* Tile type grid */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(TILE_TYPE_INFO).map(([type, info]) => {
          const isActive = currentType === type;
          const isDisabled = selectedTileIndex === null;
          
          return (
            <button
              key={type}
              onClick={() => handleTileTypeSelect(type)}
              disabled={isDisabled}
              className={`
                p-3 rounded-lg border-2 transition-all text-left
                ${isActive 
                  ? 'border-white bg-gray-700 scale-105' 
                  : 'border-transparent bg-gray-800 hover:bg-gray-700 hover:border-gray-600'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              style={{ 
                borderColor: isActive ? info.color : 'transparent',
                background: isActive ? `${info.color}22` : undefined
              }}
              title={info.description}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{info.icon}</span>
                <span className={`font-bold text-sm ${isActive ? 'text-white' : 'text-gray-300'}`}>
                  {info.label}
                </span>
              </div>
              <div className="text-xs text-gray-400 line-clamp-1">
                {info.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Type statistics */}
      {selectedTileIndex !== null && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">{t('current_map_type_distribution')}:</div>
          <div className="grid grid-cols-4 gap-1">
            {Object.entries(TILE_TYPE_INFO).map(([type, info]) => {
              const count = tiles.filter(t => t.type === type).length;
              return (
                <div 
                  key={type}
                  className="text-center p-1 rounded bg-gray-800"
                  title={`${info.label}: ${count}个`}
                >
                  <div className="text-lg">{info.icon}</div>
                  <div className="text-xs text-gray-400">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
