/**
 * CloudSaveManager - Cloud save/load management UI
 * 
 * Features:
 * - View sync status
 * - Manual sync controls
 * - Save slot management
 * - Conflict resolution
 */

import { useState, useEffect } from 'react';
import { useCloudSaveStore, STORAGE_KEYS } from './cloudSaveStore';
import { isSupabaseConfigured } from '../../multiplayer/supabaseClient';

export default function CloudSaveManager({ onClose }) {
  const [activeTab, setActiveTab] = useState('sync'); // sync | slots | settings

  const isAuthenticated = useCloudSaveStore(s => s.isAuthenticated);
  const isSyncing = useCloudSaveStore(s => s.isSyncing);
  const lastSyncedAt = useCloudSaveStore(s => s.lastSyncedAt);
  const syncError = useCloudSaveStore(s => s.syncError);
  const saveSlots = useCloudSaveStore(s => s.saveSlots);
  const syncToCloud = useCloudSaveStore(s => s.syncToCloud);
  const loadCloudToLocal = useCloudSaveStore(s => s.loadCloudToLocal);
  const mergeData = useCloudSaveStore(s => s.mergeData);

  const isConfigured = isSupabaseConfigured();

  const handleSync = async () => {
    await syncToCloud();
  };

  const handleLoadCloud = async () => {
    await loadCloudToLocal();
    // Refresh page to apply changes
    window.location.reload();
  };

  const handleMerge = async () => {
    await mergeData();
    window.location.reload();
  };

  if (!isConfigured) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl w-full max-w-md p-6">
          <div className="text-center">
            <div className="text-5xl mb-4">☁️</div>
            <h2 className="text-xl font-bold text-white mb-2">云存档未配置</h2>
            <p className="text-gray-400 mb-4">
              请配置 Supabase 环境变量来启用云存档功能
            </p>
            <div className="text-left bg-gray-800 rounded-lg p-4 mb-4 text-sm">
              <p className="text-gray-300 mb-2">需要添加以下环境变量:</p>
              <code className="text-amber-400 block">VITE_SUPABASE_URL=your-project-url</code>
              <code className="text-amber-400 block">VITE_SUPABASE_ANON_KEY=your-anon-key</code>
            </div>
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

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl w-full max-w-md p-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">🔐</div>
            <h2 className="text-xl font-bold text-white mb-2">登录后使用云存档</h2>
            <p className="text-gray-400">
              登录后可以同步游戏数据到云端，在不同设备间继续游戏
            </p>
          </div>
          <AuthScreen />
          <button
            onClick={onClose}
            className="w-full mt-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">☁️</span>
            <div>
              <h2 className="text-xl font-bold text-white">云存档</h2>
              <p className="text-gray-400 text-sm">
                {lastSyncedAt 
                  ? `上次同步: ${new Date(lastSyncedAt).toLocaleString()}`
                  : '尚未同步'}
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

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex-1 py-3 text-center font-bold transition-colors ${
              activeTab === 'sync' 
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🔄 同步
          </button>
          <button
            onClick={() => setActiveTab('slots')}
            className={`flex-1 py-3 text-center font-bold transition-colors ${
              activeTab === 'slots' 
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📦 存档槽位
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 text-center font-bold transition-colors ${
              activeTab === 'settings' 
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ⚙️ 设置
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'sync' && (
            <SyncTab
              isSyncing={isSyncing}
              lastSyncedAt={lastSyncedAt}
              syncError={syncError}
              onSync={handleSync}
              onLoadCloud={handleLoadCloud}
              onMerge={handleMerge}
            />
          )}
          {activeTab === 'slots' && (
            <SlotsTab saveSlots={saveSlots} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab />
          )}
        </div>
      </div>
    </div>
  );
}

// Sync tab
function SyncTab({ isSyncing, lastSyncedAt, syncError, onSync, onLoadCloud, onMerge }) {
  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-3 h-3 rounded-full ${isSyncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
          <span className="text-white font-bold">
            {isSyncing ? '同步中...' : '已连接'}
          </span>
        </div>
        <p className="text-gray-400 text-sm">
          {lastSyncedAt 
            ? `上次同步: ${new Date(lastSyncedAt).toLocaleString()}`
            : '尚未进行过同步'}
        </p>
        {syncError && (
          <p className="text-red-400 text-sm mt-2">错误: {syncError}</p>
        )}
      </div>

      {/* Sync actions */}
      <div className="space-y-3">
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-600 rounded-lg text-white font-bold flex items-center justify-center gap-2"
        >
          {isSyncing ? '同步中...' : '🔄 同步本地数据到云端'}
        </button>

        <button
          onClick={onLoadCloud}
          disabled={isSyncing}
          className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-600 rounded-lg text-white font-bold flex items-center justify-center gap-2"
        >
          ☁️ 从云端下载数据到本地
        </button>

        <button
          onClick={onMerge}
          disabled={isSyncing}
          className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-gray-600 disabled:to-gray-600 rounded-lg text-white font-bold flex items-center justify-center gap-2"
        >
          🔀 合并云端与本地数据
        </button>
      </div>

      {/* Info */}
      <div className="bg-gray-800/50 rounded-lg p-4 text-sm text-gray-400">
        <p className="font-bold text-white mb-2">同步说明:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><b>同步到云端:</b> 将本地数据备份到云端</li>
          <li><b>下载到本地:</b> 用云端数据覆盖本地数据</li>
          <li><b>合并数据:</b> 智能合并两者，保留最新更改</li>
        </ul>
      </div>
    </div>
  );
}

// Slots tab
function SlotsTab({ saveSlots }) {
  const slotInfo = [
    { key: 'profile', name: '玩家档案', icon: '👤', desc: '等级、XP、金币' },
    { key: 'achievements', name: '成就数据', icon: '🏆', desc: '已解锁成就、进度' },
    { key: 'settings', name: '游戏设置', icon: '⚙️', desc: '音量、语言等' },
    { key: 'inventory', name: '背包物品', icon: '🎒', desc: '道具、皮肤' },
    { key: 'season_pass', name: '赛季通行证', icon: '🏅', desc: '等级、奖励' },
  ];

  return (
    <div className="space-y-3">
      {slotInfo.map(slot => {
        const cloudSlot = saveSlots.find(s => s.key === slot.key);
        const hasCloudData = !!cloudSlot;

        return (
          <div key={slot.key} className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{slot.icon}</span>
              <div className="flex-1">
                <div className="text-white font-bold">{slot.name}</div>
                <div className="text-gray-400 text-sm">{slot.desc}</div>
              </div>
              <div className="text-right">
                {hasCloudData ? (
                  <div>
                    <span className="text-green-400 text-sm">已同步</span>
                    <div className="text-gray-500 text-xs">
                      {new Date(cloudSlot.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">未同步</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Settings tab
function SettingsTab() {
  const [autoSync, setAutoSync] = useState(false);
  const [syncOnWifiOnly, setSyncOnWifiOnly] = useState(true);

  const clearAllCloudSaves = useCloudSaveStore(s => s.clearAllCloudSaves);
  const signOut = useCloudSaveStore(s => s.signOut);

  const handleClearAll = async () => {
    if (window.confirm('确定要删除所有云存档吗？此操作不可恢复！')) {
      await clearAllCloudSaves();
      alert('已清除所有云存档');
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('确定要退出登录吗？')) {
      await signOut();
    }
  };

  return (
    <div className="space-y-6">
      {/* Auto sync setting */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-white font-bold">自动同步</div>
            <div className="text-gray-400 text-sm">退出游戏时自动同步数据</div>
          </div>
          <button
            onClick={() => setAutoSync(!autoSync)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              autoSync ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              autoSync ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-bold">仅Wi-Fi同步</div>
            <div className="text-gray-400 text-sm">节省移动数据</div>
          </div>
          <button
            onClick={() => setSyncOnWifiOnly(!syncOnWifiOnly)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              syncOnWifiOnly ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              syncOnWifiOnly ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-4">
        <h4 className="text-red-400 font-bold mb-3">⚠️ 危险区域</h4>
        
        <button
          onClick={handleClearAll}
          className="w-full py-2 mb-2 bg-red-600/30 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-sm"
        >
          删除所有云存档
        </button>

        <button
          onClick={handleSignOut}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}

// Simple auth screen component
function AuthScreen() {
  const [mode, setMode] = useState('signin'); // signin | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = useCloudSaveStore(s => s.signIn);
  const signUp = useCloudSaveStore(s => s.signUp);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
        }
      } else {
        if (!displayName.trim()) {
          setError('请输入昵称');
          setLoading(false);
          return;
        }
        const result = await signUp(email, password, displayName);
        if (result.error) {
          setError(result.error);
        } else {
          alert('注册成功！请查收验证邮件。');
        }
      }
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex mb-3">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`flex-1 py-2 text-center font-bold rounded-l-lg transition-colors ${
            mode === 'signin' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          登录
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 py-2 text-center font-bold rounded-r-lg transition-colors ${
            mode === 'signup' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          注册
        </button>
      </div>

      {mode === 'signup' && (
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="昵称"
          className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
        />
      )}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="邮箱"
        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
        required
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="密码"
        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
        required
        minLength={6}
      />

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-gray-600 disabled:to-gray-600 rounded-lg text-white font-bold"
      >
        {loading ? '处理中...' : mode === 'signin' ? '登录' : '注册'}
      </button>
    </form>
  );
}