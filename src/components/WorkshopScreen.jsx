import { useState, useEffect } from 'react';
import { useWorkshopStore } from '../game/workshopStore';
import { useGameStore } from '../game/store';
import useEditorStore from '../editor/editorStore';

const TABS = [
  { key: 'maps', label: '🗺️ 地图', icon: '🗺️' },
  { key: 'questions', label: '📝 题库', icon: '📝' },
  { key: 'themes', label: '🎨 主题', icon: '🎨' },
];

const SORT_OPTIONS = [
  { key: 'popular', label: '🔥 热门' },
  { key: 'recent', label: '⏰ 最新' },
  { key: 'rating', label: '⭐ 评分' },
];

const FILTER_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'downloaded', label: '已下载' },
  { key: 'subscribed', label: '已收藏' },
];

function StarRating({ rating, onRate, readonly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          className={`text-lg ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
          onClick={() => !readonly && onRate && onRate(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          {star <= (hover || rating) ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}

function MapCard({ map, onDownload, onSubscribe, isSubscribed, isDownloaded }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    await onDownload(map.id);
    setDownloading(false);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold truncate flex-1">{map.name}</h3>
        <span className="text-gray-400 text-sm">by {map.author_name}</span>
      </div>
      <p className="text-gray-400 text-sm line-clamp-2">{map.description || '暂无描述'}</p>
      <div className="flex flex-wrap gap-1">
        {(map.tags || []).map(tag => (
          <span key={tag} className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">{tag}</span>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-yellow-400">⭐ {map.rating_avg?.toFixed(1) || '0.0'} ({map.rating_count || 0})</span>
        <span className="text-gray-400">📥 {map.downloads || 0}</span>
      </div>
      <div className="flex gap-2 mt-auto pt-2">
        <button
          onClick={handleDownload}
          disabled={downloading || isDownloaded}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            isDownloaded
              ? 'bg-green-600 text-white cursor-default'
              : downloading
              ? 'bg-gray-600 text-gray-400'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {isDownloaded ? '✓ 已下载' : downloading ? '下载中...' : '▼ 下载'}
        </button>
        <button
          onClick={() => onSubscribe(map.id)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            isSubscribed ? 'bg-pink-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
        >
          {isSubscribed ? '♥ 已收藏' : '♡ 收藏'}
        </button>
      </div>
    </div>
  );
}

function PublishModal({ type, onClose, onPublish }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const editorStore = useEditorStore();
  const gameStore = useGameStore();

  const handlePublish = async () => {
    if (!name.trim()) return alert('请输入名称');
    setSubmitting(true);

    let result;
    if (type === 'maps') {
      const boardConfig = editorStore.tiles;
      const rulesConfig = editorStore.rules;
      result = await onPublish({
        name: name.trim(),
        description: description.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3),
        boardConfig,
        rulesConfig,
      });
    } else if (type === 'questions') {
      const questions = gameStore.customQuestions.length > 0 ? gameStore.customQuestions : [];
      const categories = gameStore.enabledCategories || [];
      result = await onPublish({
        title: name.trim(),
        categories,
        questions,
      });
      if (result.success) {
        result = await onPublish({ ...result.data, title: name.trim(), name: name.trim() });
      }
    } else {
      result = { error: '主题发布暂未实现' };
    }

    setSubmitting(false);
    if (result.success) {
      alert('发布成功！');
      onClose();
    } else {
      alert(`发布失败: ${result.error}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white">
          发布{type === 'maps' ? '地图' : type === 'questions' ? '题库' : '主题'}
        </h2>
        <div>
          <label className="text-gray-300 text-sm">名称 *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={type === 'maps' ? '我的地图' : '题库标题'}
            className="w-full mt-1 bg-gray-700 text-white rounded-lg px-4 py-2"
            maxLength={type === 'maps' ? 20 : 50}
          />
        </div>
        <div>
          <label className="text-gray-300 text-sm">简介</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="简单描述这个作品..."
            className="w-full mt-1 bg-gray-700 text-white rounded-lg px-4 py-2 h-20 resize-none"
            maxLength={100}
          />
        </div>
        <div>
          <label className="text-gray-300 text-sm">标签（用逗号分隔，最多3个）</label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="教学, 娱乐, 挑战"
            className="w-full mt-1 bg-gray-700 text-white rounded-lg px-4 py-2"
          />
        </div>
        <div className="flex gap-3 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            取消
          </button>
          <button
            onClick={handlePublish}
            disabled={submitting || !name.trim()}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? '发布中...' : '确认发布'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RatingModal({ item, itemType, onClose, onRate }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return alert('请选择评分');
    setSubmitting(true);
    const result = await onRate({ itemId: item.id, itemType, rating, comment });
    setSubmitting(false);
    if (result.success) {
      alert('评分成功！');
      onClose();
    } else {
      alert(`评分失败: ${result.error}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
        <h2 className="text-lg font-bold text-white">评分「{item.name || item.title}」</h2>
        <div className="flex justify-center py-2">
          <StarRating rating={rating} onRate={setRating} />
        </div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="写下你的评论（选填，最多200字）..."
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 h-24 resize-none"
          maxLength={200}
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-700 text-white rounded-lg">取消</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !rating}
            className="flex-1 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 disabled:opacity-50 font-medium"
          >
            {submitting ? '提交中...' : '提交评分'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkshopScreen() {
  const {
    activeTab, setActiveTab,
    sortBy, setSortBy,
    filter, setFilter,
    maps, questions, themes,
    isLoading, error,
    subscriptions, downloadedItems,
    fetchMaps, fetchQuestions, fetchThemes,
    downloadMap, downloadQuestions, downloadTheme,
    subscribe, unsubscribe,
    rateItem,
  } = useWorkshopStore();

  const { goToMenu, setCurrentScreen } = useGameStore();
  const [showPublish, setShowPublish] = useState(false);
  const [ratingItem, setRatingItem] = useState(null);

  useEffect(() => {
    fetchMaps();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'maps') fetchMaps();
    else if (tab === 'questions') fetchQuestions();
    else fetchThemes();
  };

  const handleDownload = async (type) => async (itemId) => {
    if (type === 'maps') {
      const result = await downloadMap(itemId);
      if (result.success) {
        const { board_config, rules_config } = result.data;
        useEditorStore.getState().loadFromConfig(board_config, rules_config);
      }
    } else if (type === 'questions') {
      await downloadQuestions(itemId);
    }
  };

  const handleSubscribe = (itemId) => {
    if (subscriptions.includes(itemId)) {
      unsubscribe(itemId);
    } else {
      subscribe(itemId);
    }
  };

  const currentList = activeTab === 'maps' ? maps : activeTab === 'questions' ? questions : themes;

  const filteredList = currentList.filter(item => {
    if (filter === 'downloaded') return downloadedItems[item.id];
    if (filter === 'subscribed') return subscriptions.includes(item.id);
    return true;
  });

  const handlePlayMap = (mapData) => {
    const { board_config, rules_config } = mapData;
    useEditorStore.getState().loadFromConfig(board_config, rules_config);
    setCurrentScreen('setup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={goToMenu} className="text-2xl">←</button>
        <h1 className="text-2xl font-bold">🎨 创意工坊</h1>
        <div />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sort & Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                sortBy === opt.key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                filter === opt.key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Publish Button */}
      <button
        onClick={() => setShowPublish(activeTab)}
        className="w-full mb-4 py-3 bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
      >
        + 发布{activeTab === 'maps' ? '地图' : activeTab === 'questions' ? '题库' : '主题'}
      </button>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-gray-500 text-sm">请确保已在 Supabase 中执行 workshop.sql</p>
          <button
            onClick={() => handleTabChange(activeTab)}
            className="mt-4 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            重试
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          {filter !== 'all' ? '没有找到符合条件的内容' : '暂无内容，试试发布第一个作品吧！'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map(item => (
            <div key={item.id} className="flex flex-col gap-2">
              <MapCard
                map={item}
                onDownload={handleDownload(activeTab === 'maps' ? 'maps' : activeTab === 'questions' ? 'questions' : 'themes')}
                onSubscribe={handleSubscribe}
                isSubscribed={subscriptions.includes(item.id)}
                isDownloaded={!!downloadedItems[item.id]}
              />
              <div className="flex gap-2">
                {downloadedItems[item.id] && activeTab === 'maps' && (
                  <button
                    onClick={() => handlePlayMap(item)}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium"
                  >
                    🎮 开始游戏
                  </button>
                )}
                <button
                  onClick={() => setRatingItem({ ...item, type: activeTab === 'maps' ? 'map' : activeTab === 'questions' ? 'question' : 'theme' })}
                  className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium"
                >
                  ⭐ 评分
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Offline notice */}
      {error && (
        <div className="mt-4 p-3 bg-gray-800 rounded-xl text-center text-gray-400 text-sm">
          📴 离线模式 — 显示已下载的内容
        </div>
      )}

      {/* Modals */}
      {showPublish && (
        <PublishModal
          type={showPublish}
          onClose={() => setShowPublish(false)}
          onPublish={async (data) => {
            if (showPublish === 'maps') return useWorkshopStore.getState().publishMap(data);
            if (showPublish === 'questions') return useWorkshopStore.getState().publishQuestions(data);
            return { error: '暂未实现' };
          }}
        />
      )}

      {ratingItem && (
        <RatingModal
          item={ratingItem}
          itemType={ratingItem.type}
          onClose={() => setRatingItem(null)}
          onRate={rateItem}
        />
      )}
    </div>
  );
}
