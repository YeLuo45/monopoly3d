import { useState, useEffect } from 'react';
import { useWorkshopStore } from '../game/workshopStore';
import { useGameStore } from '../game/store';
import useEditorStore from '../editor/editorStore';
import { StarRating, DifficultySelector, DifficultyBadge, RatingModal } from './WorkshopRating';
import { DIFFICULTY_LEVELS } from '../editor/editorTypes';
import { t } from '../i18n';

const TABS = [
  { key: 'maps', label: t('tab_maps'), icon: '🗺️' },
  { key: 'questions', label: t('tab_questions'), icon: '📝' },
  { key: 'themes', label: t('tab_themes'), icon: '🎨' },
];

const SORT_OPTIONS = [
  { key: 'popular', label: t('sort_popular') },
  { key: 'recent', label: t('sort_recent') },
  { key: 'rating', label: t('sort_rating') },
  { key: 'difficulty', label: t('sort_difficulty') },
];

const FILTER_OPTIONS = [
  { key: 'all', label: t('filter_all') },
  { key: 'downloaded', label: t('filter_downloaded') },
  { key: 'subscribed', label: t('filter_subscribed') },
  { key: 'easy', label: t('filter_easy_star') },
  { key: 'hard', label: t('filter_hard_star') },
];

function MapCard({ map, onDownload, onSubscribe, isSubscribed, isDownloaded, onRate }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    await onDownload(map.id);
    setDownloading(false);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold truncate">{map.name}</h3>
          <span className="text-gray-500 text-xs">by {map.author_name}</span>
        </div>
        <DifficultyBadge difficulty={map.difficulty} size="sm" />
      </div>
      
      <p className="text-gray-400 text-sm line-clamp-2">
        {map.description || t('no_description')}
      </p>
      
      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {(map.tags || []).map(tag => (
          <span key={tag} className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded">
            {tag}
          </span>
        ))}
      </div>
      
      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <StarRating rating={map.rating_avg || 0} readonly size="sm" />
          <span className="text-yellow-400 font-medium">
            {map.rating_avg?.toFixed(1) || '0.0'}
          </span>
          <span className="text-gray-500">({map.rating_count || 0})</span>
        </div>
        <span className="text-gray-400">📥 {map.downloads || 0}</span>
        {map.tile_count && (
          <span className="text-gray-400">🎯 {map.tile_count}格</span>
        )}
      </div>
      
      {/* Actions */}
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
          {isDownloaded ? t('downloaded') : downloading ? t('downloading') : t('download')}
        </button>
        <button
          onClick={() => onSubscribe(map.id)}
          className={`px-3 py-2 rounded-lg transition-colors ${
            isSubscribed ? 'bg-pink-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
        >
          {isSubscribed ? '♥' : '♡'}
        </button>
      </div>
    </div>
  );
}

function PublishModal({ type, onClose, onPublish }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const editorStore = useEditorStore();
  const gameStore = useGameStore();

  const handlePublish = async () => {
    if (!name.trim()) return alert(t('enter_name'));
    setSubmitting(true);

    let result;
    if (type === 'maps') {
      const boardConfig = editorStore.tiles;
      const rulesConfig = editorStore.rules;
      result = await onPublish({
        name: name.trim(),
        description: description.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3),
        difficulty,
        boardConfig,
        rulesConfig,
        tileCount: boardConfig.length,
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
      result = { error: t('publish_not_ready') };
    }

    setSubmitting(false);
    if (result.success) {
      alert(t('publish_success'));
      onClose();
    } else {
      alert(`${t('publish_failed')} ${result.error}`);
    }
  };

  const getPublishTypeLabel = () => {
    if (type === 'maps') return t('publish_type_map');
    if (type === 'questions') return t('publish_type_question');
    return t('publish_type_theme');
  };

  const getNamePlaceholder = () => {
    if (type === 'maps') return t('name_placeholder_map');
    if (type === 'questions') return t('name_placeholder_question');
    return '';
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white">
          {t('publish_title')}{getPublishTypeLabel()}
        </h2>
        
        <div>
          <label className="text-gray-300 text-sm">{t('name_label')}</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={getNamePlaceholder()}
            className="w-full mt-1 bg-gray-700 text-white rounded-lg px-4 py-2"
            maxLength={type === 'maps' ? 20 : 50}
          />
        </div>
        
        {/* Difficulty selector for maps */}
        {type === 'maps' && (
          <div className="bg-gray-700/50 rounded-lg p-3">
            <DifficultySelector value={difficulty} onChange={setDifficulty} />
          </div>
        )}
        
        <div>
          <label className="text-gray-300 text-sm">{t('description_label')}</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('description_placeholder')}
            className="w-full mt-1 bg-gray-700 text-white rounded-lg px-4 py-2 h-20 resize-none"
            maxLength={100}
          />
        </div>
        
        <div>
          <label className="text-gray-300 text-sm">{t('tags_label')}</label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder={t('tags_placeholder')}
            className="w-full mt-1 bg-gray-700 text-white rounded-lg px-4 py-2"
          />
        </div>
        
        <div className="flex gap-3 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handlePublish}
            disabled={submitting || !name.trim()}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? t('publishing') : t('confirm_publish')}
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
    rateMapDifficulty,
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

  const handleDifficultyRate = (itemId, difficulty) => {
    if (rateMapDifficulty) {
      rateMapDifficulty(itemId, difficulty);
    }
  };

  const currentList = activeTab === 'maps' ? maps : activeTab === 'questions' ? questions : themes;

  const filteredList = currentList.filter(item => {
    if (filter === 'downloaded') return downloadedItems[item.id];
    if (filter === 'subscribed') return subscriptions.includes(item.id);
    if (filter === 'easy') return item.difficulty && item.difficulty <= 2;
    if (filter === 'hard') return item.difficulty && item.difficulty >= 4;
    return true;
  });

  // Sort handling
  const sortedList = [...filteredList].sort((a, b) => {
    if (sortBy === 'popular') return (b.downloads || 0) - (a.downloads || 0);
    if (sortBy === 'rating') return (b.rating_avg || 0) - (a.rating_avg || 0);
    if (sortBy === 'difficulty') return (a.difficulty || 3) - (b.difficulty || 3);
    // recent
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  const handlePlayMap = (mapData) => {
    const { board_config, rules_config } = mapData;
    useEditorStore.getState().loadFromConfig(board_config, rules_config);
    setCurrentScreen('setup');
  };

  const getPublishButtonLabel = () => {
    if (activeTab === 'maps') return t('publish_type_map');
    if (activeTab === 'questions') return t('publish_type_question');
    return t('publish_type_theme');
  };

  const getEmptyMessage = () => {
    if (filter !== 'all') return t('no_content_found');
    return t('no_content_try_publish');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={goToMenu} className="text-2xl">←</button>
        <h1 className="text-2xl font-bold">{t('workshop_title')}</h1>
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

      {/* Difficulty Legend */}
      {activeTab === 'maps' && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-800/50 rounded-lg">
          <span className="text-xs text-gray-400 mr-2">{t('difficulty_legend')}</span>
          {Object.entries(DIFFICULTY_LEVELS).map(([level, info]) => (
            <span 
              key={level}
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: info.color + '33', color: info.color }}
            >
              {info.label}
            </span>
          ))}
        </div>
      )}

      {/* Publish Button */}
      <button
        onClick={() => setShowPublish(activeTab)}
        className="w-full mb-4 py-3 bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
      >
        + {t('publish_title')}{getPublishButtonLabel()}
      </button>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-400">{t('loading')}</div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-gray-500 text-sm">{t('ensure_workshop_sql')}</p>
          <button
            onClick={() => handleTabChange(activeTab)}
            className="mt-4 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            {t('retry')}
          </button>
        </div>
      ) : sortedList.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          {getEmptyMessage()}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedList.map(item => (
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
                    {t('start_game')}
                  </button>
                )}
                <button
                  onClick={() => setRatingItem({ ...item, type: activeTab === 'maps' ? 'map' : activeTab === 'questions' ? 'question' : 'theme' })}
                  className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium"
                >
                  {t('rate_map')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Offline notice */}
      {error && (
        <div className="mt-4 p-3 bg-gray-800 rounded-xl text-center text-gray-400 text-sm">
          {t('offline_mode')}
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
            return { error: t('publish_not_ready') };
          }}
        />
      )}

      {ratingItem && (
        <RatingModal
          item={ratingItem}
          itemType={ratingItem.type}
          onClose={() => setRatingItem(null)}
          onRate={rateItem}
          onDifficulty={handleDifficultyRate}
        />
      )}
    </div>
  );
}
