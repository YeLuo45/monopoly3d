/**
 * CreatorDashboard - Manage submitted content and view analytics
 * 
 * Features:
 * - View all submitted maps, questions, themes
 * - Edit content details
 * - Delete unpublished content
 * - View download/rating statistics
 */

import { useState, useEffect } from 'react';
import { useCreatorDashboardStore } from './creatorDashboardStore';
import { isSupabaseConfigured } from '../../multiplayer/supabaseClient';
import { t } from '../../i18n';

export default function CreatorDashboard({ onClose }) {
  const [editingItem, setEditingItem] = useState(null);

  const activeTab = useCreatorDashboardStore(s => s.activeTab);
  const setActiveTab = useCreatorDashboardStore(s => s.setActiveTab);
  const submittedMaps = useCreatorDashboardStore(s => s.submittedMaps);
  const submittedQuestions = useCreatorDashboardStore(s => s.submittedQuestions);
  const submittedThemes = useCreatorDashboardStore(s => s.submittedThemes);
  const totalViews = useCreatorDashboardStore(s => s.totalViews);
  const totalDownloads = useCreatorDashboardStore(s => s.totalDownloads);
  const totalRatings = useCreatorDashboardStore(s => s.totalRatings);
  const averageRating = useCreatorDashboardStore(s => s.averageRating);
  const isLoading = useCreatorDashboardStore(s => s.isLoading);
  const fetchMySubmissions = useCreatorDashboardStore(s => s.fetchMySubmissions);
  const deleteMap = useCreatorDashboardStore(s => s.deleteMap);
  const deleteQuestion = useCreatorDashboardStore(s => s.deleteQuestion);
  const deleteTheme = useCreatorDashboardStore(s => s.deleteTheme);

  useEffect(() => {
    fetchMySubmissions();
  }, []);

  if (!isSupabaseConfigured()) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl w-full max-w-2xl p-6">
          <div className="text-center">
            <div className="text-5xl mb-4">🏪</div>
            <h2 className="text-xl font-bold text-white mb-2">创作者工坊未配置</h2>
            <p className="text-gray-400 mb-4">
              请配置 Supabase 环境变量来启用创作者工坊功能
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalSubmissions = submittedMaps.length + submittedQuestions.length + submittedThemes.length;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏪</span>
            <div>
              <h2 className="text-xl font-bold text-white">创作者工坊</h2>
              <p className="text-gray-400 text-sm">
                {totalSubmissions} 个作品 | {totalDownloads} 次下载
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"
          >
            关闭
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-800 border-b border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{totalSubmissions}</div>
            <div className="text-gray-400 text-xs">作品</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{totalViews}</div>
            <div className="text-gray-400 text-xs">浏览</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{totalDownloads}</div>
            <div className="text-gray-400 text-xs">下载</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{averageRating.toFixed(1)}</div>
            <div className="text-gray-400 text-xs">平均评分</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('maps')}
            className={`flex-1 py-3 text-center font-bold transition-colors ${
              activeTab === 'maps' 
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🗺️ 棋盘 ({submittedMaps.length})
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`flex-1 py-3 text-center font-bold transition-colors ${
              activeTab === 'questions' 
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📝 题目 ({submittedQuestions.length})
          </button>
          <button
            onClick={() => setActiveTab('themes')}
            className={`flex-1 py-3 text-center font-bold transition-colors ${
              activeTab === 'themes' 
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🎨 主题 ({submittedThemes.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-4xl animate-spin">⏳</div>
              <p className="text-gray-400 mt-4">加载中...</p>
            </div>
          ) : (
            <>
              {activeTab === 'maps' && (
                <MapsList
                  maps={submittedMaps}
                  onDelete={(id) => deleteMap(id)}
                  onEdit={(map) => setEditingItem({ type: 'map', data: map })}
                />
              )}
              {activeTab === 'questions' && (
                <QuestionsList
                  questions={submittedQuestions}
                  onDelete={(id) => deleteQuestion(id)}
                  onEdit={(q) => setEditingItem({ type: 'question', data: q })}
                />
              )}
              {activeTab === 'themes' && (
                <ThemesList
                  themes={submittedThemes}
                  onDelete={(id) => deleteTheme(id)}
                  onEdit={(theme) => setEditingItem({ type: 'theme', data: theme })}
                />
              )}
            </>
          )}
        </div>

        {/* Edit Modal */}
        {editingItem && (
          <EditModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={(updates) => {
              // Handle save
              setEditingItem(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Maps list
function MapsList({ maps, onDelete, onEdit }) {
  if (maps.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🗺️</div>
        <h3 className="text-xl font-bold text-white mb-2">还没有提交棋盘</h3>
        <p className="text-gray-400">在编辑器中创建棋盘后可以提交到这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {maps.map(map => (
        <div key={map.id} className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🗺️</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold truncate">{map.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  map.is_published ? 'bg-green-600/30 text-green-400' : 'bg-gray-600/30 text-gray-400'
                }`}>
                  {map.is_published ? '已发布' : '草稿'}
                </span>
              </div>
              <p className="text-gray-400 text-sm truncate">{map.description}</p>
              <div className="flex items-center gap-4 text-sm mt-2">
                <span className="text-gray-400">👁️ {map.view_count || 0}</span>
                <span className="text-gray-400">📥 {map.downloads || 0}</span>
                <span className="text-gray-400">⭐ {map.rating_avg?.toFixed(1) || '0.0'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(map)}
                className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-sm"
              >
                编辑
              </button>
              <button
                onClick={() => onDelete(map.id)}
                className="px-3 py-1 bg-red-600/30 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-sm"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Questions list
function QuestionsList({ questions, onDelete, onEdit }) {
  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">📝</div>
        <h3 className="text-xl font-bold text-white mb-2">还没有提交题目</h3>
        <p className="text-gray-400">创建题目后可以提交到这里供其他玩家使用</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map(q => (
        <div key={q.id} className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">📝</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold truncate">{q.question_text?.substring(0, 50)}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  q.is_published ? 'bg-green-600/30 text-green-400' : 'bg-gray-600/30 text-gray-400'
                }`}>
                  {q.is_published ? '已发布' : '草稿'}
                </span>
              </div>
              <p className="text-gray-400 text-sm truncate">
                {q.difficulty && `难度: ${q.difficulty}`} {q.category && `| 分类: ${q.category}`}
              </p>
              <div className="flex items-center gap-4 text-sm mt-2">
                <span className="text-gray-400">👁️ {q.view_count || 0}</span>
                <span className="text-gray-400">📥 {q.downloads || 0}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(q)}
                className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-sm"
              >
                编辑
              </button>
              <button
                onClick={() => onDelete(q.id)}
                className="px-3 py-1 bg-red-600/30 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-sm"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Themes list
function ThemesList({ themes, onDelete, onEdit }) {
  if (themes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🎨</div>
        <h3 className="text-xl font-bold text-white mb-2">还没有提交主题</h3>
        <p className="text-gray-400">创建主题后可以提交到这里供其他玩家使用</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {themes.map(theme => (
        <div key={theme.id} className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🎨</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold truncate">{theme.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  theme.is_published ? 'bg-green-600/30 text-green-400' : 'bg-gray-600/30 text-gray-400'
                }`}>
                  {theme.is_published ? '已发布' : '草稿'}
                </span>
              </div>
              <p className="text-gray-400 text-sm truncate">{theme.description}</p>
              <div className="flex items-center gap-4 text-sm mt-2">
                <span className="text-gray-400">👁️ {theme.view_count || 0}</span>
                <span className="text-gray-400">📥 {theme.downloads || 0}</span>
                <span className="text-gray-400">⭐ {theme.rating_avg?.toFixed(1) || '0.0'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(theme)}
                className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-sm"
              >
                编辑
              </button>
              <button
                onClick={() => onDelete(theme.id)}
                className="px-3 py-1 bg-red-600/30 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-sm"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Edit modal
function EditModal({ item, onClose, onSave }) {
  const [name, setName] = useState(item.data?.name || item.data?.question_text?.substring(0, 50) || '');
  const [description, setDescription] = useState(item.data?.description || '');
  const [isPublished, setIsPublished] = useState(item.data?.is_published || false);

  const handleSave = () => {
    onSave({
      name: name,
      description: description,
      is_published: isPublished,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-white mb-4">编辑内容</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-400">发布状态</span>
            <button
              onClick={() => setIsPublished(!isPublished)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isPublished ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                isPublished ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-bold"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}