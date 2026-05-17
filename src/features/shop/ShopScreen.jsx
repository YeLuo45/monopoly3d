/**
 * ShopScreen - In-game shop for purchasing skins and cosmetics
 * 
 * Features:
 * - Category tabs (Tokens, Themes, Effects, Frames)
 * - Item cards with rarity badges
 * - Purchase/Equip flow
 * - Daily sale items
 * - Inventory management
 */

import { useState, useEffect } from 'react';
import {
  ITEM_TYPES,
  ITEM_RARITIES,
  getItemsByType,
  getItemById,
  getAllItems,
  loadInventory,
  saveInventory,
  purchaseItem,
  equipItem,
  addCoins,
  getItemsOnSale,
} from './itemRegistry';
import { useSkin } from './SkinProvider';

const CATEGORY_TABS = [
  { id: ITEM_TYPES.TOKEN_SKIN, label: '🚗 棋子皮肤', icon: '🎮' },
  { id: ITEM_TYPES.BOARD_THEME, label: '🎨 棋盘主题', icon: '🖼️' },
  { id: ITEM_TYPES.PARTICLE_EFFECT, label: '✨ 粒子特效', icon: '🌟' },
  { id: ITEM_TYPES.PROFILE_FRAME, label: '🖼️ 头像框', icon: '📎' },
];

export default function ShopScreen({ onClose }) {
  const skin = useSkin();
  const [activeCategory, setActiveCategory] = useState(ITEM_TYPES.TOKEN_SKIN);
  const [inventory, setInventory] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loaded = loadInventory();
    setInventory(loaded);
    setSaleItems(getItemsOnSale());
    setIsLoading(false);
  }, []);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2500);
  };

  const handlePurchase = (item) => {
    const result = purchaseItem(item.id, inventory);
    if (result.success) {
      setInventory(result.inventory);
      showNotification(`购买成功！-${item.price}金币`, 'success');
    } else {
      showNotification(result.error, 'error');
    }
  };

  const handleEquip = (item) => {
    const result = equipItem(item.id, inventory);
    if (result.success) {
      setInventory(result.inventory);
      showNotification(`已装备 ${item.name}`, 'success');
    } else {
      showNotification(result.error, 'error');
    }
  };

  const handleAddCoins = () => {
    const result = addCoins(500, inventory);
    if (result.success) {
      setInventory(result.inventory);
      showNotification('+500 金币 (测试奖励)', 'success');
    }
  };

  const isOwned = (itemId) => inventory?.ownedItems?.includes(itemId) || false;
  const isEquipped = (itemId) => {
    if (!inventory) return false;
    return inventory.equippedItems?.[getItemById(itemId)?.type] === itemId;
  };

  const categoryItems = getItemsByType(activeCategory);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">🎪 游戏商城</h2>
            {inventory && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 rounded-full">
                <span className="text-yellow-400">🪙</span>
                <span className="text-yellow-400 font-bold">{inventory.coins}</span>
                <button
                  onClick={handleAddCoins}
                  className="text-xs px-2 py-0.5 bg-yellow-500/30 hover:bg-yellow-500/50 rounded transition-colors"
                >
                  +500
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Daily Sale Banner */}
        {saleItems.length > 0 && (
          <div className="px-4 py-3 bg-gradient-to-r from-orange-900/50 to-red-900/50 border-b border-orange-500/20">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-pulse">🔥</span>
              <div>
                <p className="text-orange-400 font-bold">今日特价</p>
                <div className="flex gap-3 mt-1">
                  {saleItems.map(item => (
                    <div key={item.id} className="flex items-center gap-1 text-sm">
                      <span>{item.preview}</span>
                      <span className="text-white">{item.name}</span>
                      <span className="text-yellow-400">-{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="px-4 py-2 border-b border-gray-800 flex gap-2 overflow-x-auto">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                activeCategory === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categoryItems.map(item => (
              <div
                key={item.id}
                className={`relative bg-gray-800/50 rounded-xl p-4 border transition-all ${
                  isEquipped(item.id)
                    ? 'border-green-500 shadow-lg shadow-green-500/20'
                    : isOwned(item.id)
                    ? 'border-gray-600 hover:border-gray-500'
                    : 'border-gray-700 hover:border-purple-500/50'
                }`}
              >
                {/* Rarity Badge */}
                <div
                  className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold"
                  style={{ 
                    backgroundColor: `${item.rarity.color}30`,
                    color: item.rarity.color,
                  }}
                >
                  {item.rarity.label}
                </div>

                {/* Preview */}
                <div className="text-4xl text-center my-4">
                  {item.preview}
                </div>

                {/* Info */}
                <div className="text-center">
                  <h3 className="text-white font-bold">{item.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                </div>

                {/* Price or Status */}
                <div className="mt-4 flex flex-col gap-2">
                  {isEquipped(item.id) ? (
                    <div className="text-center text-green-400 text-sm font-bold">
                      ✓ 已装备
                    </div>
                  ) : isOwned(item.id) ? (
                    <button
                      onClick={() => handleEquip(item)}
                      className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm text-white transition-colors"
                    >
                      装备
                    </button>
                  ) : (
                    <>
                      <div className="text-center">
                        <span className="text-yellow-400 font-bold">{item.price}</span>
                        <span className="text-gray-400 text-sm"> 金币</span>
                      </div>
                      <button
                        onClick={() => handlePurchase(item)}
                        disabled={inventory?.coins < item.price}
                        className={`w-full py-2 rounded-lg text-sm text-white transition-colors ${
                          inventory?.coins >= item.price
                            ? 'bg-purple-600 hover:bg-purple-500'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {inventory?.coins >= item.price ? '购买' : '金币不足'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer - Owned indicator */}
        <div className="p-4 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500">
            已拥有 {inventory?.ownedItems?.length || 0} 件物品
          </p>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-xl z-50 animate-pulse ${
          notification.type === 'success' ? 'bg-green-600 text-white' :
          notification.type === 'error' ? 'bg-red-600 text-white' :
          'bg-gray-700 text-white'
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}