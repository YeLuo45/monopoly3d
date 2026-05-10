import { useState, useEffect } from 'react';
import { useGameStore } from '../game/store';
import { useMultiplayerStore } from '../multiplayer/multiplayerStore';
import { AchievementPanel, useAchievementStore } from '../features/achievement';
import { OnlineLobby } from '../multiplayer';
import { LOCALES, getLocale, setLocale, getLocaleName, t } from '../i18n';

function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener('localechange', handler);
    return () => window.removeEventListener('localechange', handler);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl text-xl font-bold shadow-lg hover:scale-105 transition-all w-full text-left flex items-center justify-between"
      >
        <span>🌐 {getLocaleName(getLocale())}</span>
        <span className="text-sm">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-gray-800 rounded-xl overflow-hidden shadow-xl z-50 border border-gray-600">
          {Object.entries(LOCALES).map(([code, { nativeName }]) => (
            <button
              key={code}
              onClick={() => { setLocale(code); setOpen(false); }}
              className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors ${getLocale() === code ? 'bg-gray-700 text-yellow-400' : 'text-white'}`}
            >
              {nativeName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MenuScreen() {
  const goToProfile = useGameStore(s => s.goToProfile);
  const goToSetup = useGameStore(s => s.goToSetup);
  const goToEditor = useGameStore(s => s.goToEditor);
  const goToTeacherPage = useGameStore(s => s.goToTeacherPage);
  const loadGame = useGameStore(s => s.loadGame);
  const setStudentId = useGameStore(s => s.setStudentId);
  const loadStudentId = useGameStore(s => s.loadStudentId);
  const studentId = useGameStore(s => s.studentId);
  const achievementStore = useAchievementStore(s => s.profileStats);

  const [showStudentIdPrompt, setShowStudentIdPrompt] = useState(false);
  const [showAchievementPanel, setShowAchievementPanel] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [showOnlineMultiplayer, setShowOnlineMultiplayer] = useState(false);
  const [showLANMultiplayerMenu, setShowLANMultiplayerMenu] = useState(false);
  const [multiplayerMode, setMultiplayerMode] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  const [showReplayList, setShowReplayList] = useState(false);
  const [activeTab, setActiveTab] = useState('game');
  const [replayList, setReplayList] = useState([]);
  const [isLoadingReplays, setIsLoadingReplays] = useState(false);

  useEffect(() => {
    const savedId = loadStudentId();
    if (!savedId) {
      setShowStudentIdPrompt(true);
    }
  }, []);

  const handleResume = () => {
    const success = loadGame();
    if (!success) alert(t('no_save_found'));
  };

  const handleSaveStudentId = () => {
    if (studentName.trim()) {
      setStudentId(studentName.trim());
      setShowStudentIdPrompt(false);
    }
  };

  const handleSkipStudentId = () => {
    setShowStudentIdPrompt(false);
  };

  const handleCreateRoom = async () => {
    if (!window.monopolyMultiplayer) {
      setConnectionError(t('multiplayer_not_loaded'));
      return;
    }
    setIsConnecting(true);
    setConnectionError('');
    try {
      const code = await window.monopolyMultiplayer.createRoom();
      setRoomCode(code);
      setMultiplayerMode('host');
      setIsConnecting(false);
    } catch (err) {
      setConnectionError(t('create_room_failed') + err.message);
      setIsConnecting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      setConnectionError(t('enter_room_code'));
      return;
    }
    if (!window.monopolyMultiplayer) {
      setConnectionError(t('multiplayer_not_loaded'));
      return;
    }
    setIsConnecting(true);
    setConnectionError('');
    try {
      await window.monopolyMultiplayer.joinRoom(joinCode.trim().toUpperCase());
      setRoomCode(joinCode.trim().toUpperCase());
      setMultiplayerMode('join');
      setIsConnecting(false);
    } catch (err) {
      setConnectionError(t('join_room_failed') + err.message);
      setIsConnecting(false);
    }
  };

  const handleCancelMultiplayer = () => {
    if (window.monopolyMultiplayer) {
      window.monopolyMultiplayer.disconnect();
    }
    setMultiplayerMode(null);
    setRoomCode('');
    setJoinCode('');
    setConnectionError('');
    setShowLANMultiplayerMenu(false);
  };

  const handleOnlineMultiplayerBack = () => {
    setShowOnlineMultiplayer(false);
  };

  const handleOnlineGameStart = () => {
    const store = useGameStore.getState();
    store.setPlayers(1, 0, []);
    setShowOnlineMultiplayer(false);
  };

  const handleLoadReplay = async (replay) => {
    try {
      const { loadReplay, initialize } = useMultiplayerStore.getState();
      await initialize();
      await loadReplay(replay.id);
      const store = useGameStore.getState();
      store.setPlayers(1, 0, []);
      setShowReplayList(false);
      alert(`${t('replay_loaded')}${replay.room_code}\n${t('duration')}: ${Math.round(replay.duration / 1000)}${t('events_count')}\n${t('events_count')}: ${replay.event_count}`);
    } catch (err) {
      console.error('Load replay failed:', err);
      alert(t('load_replay_failed') + err.message);
    }
  };

  const handleShowReplayList = async () => {
    setShowReplayList(true);
    setIsLoadingReplays(true);
    try {
      const { getReplayList, initialize } = useMultiplayerStore.getState();
      await initialize();
      const replays = await getReplayList();
      setReplayList(replays);
    } catch (err) {
      console.error('Get replay list failed:', err);
      setReplayList([]);
    }
    setIsLoadingReplays(false);
  };

  const handleCloseReplayList = () => {
    setShowReplayList(false);
    setReplayList([]);
  };

  const handleStartMultiplayerGame = () => {
    const store = useGameStore.getState();
    store.setPlayers(1, 0, []);
    setShowMultiplayerMenu(false);
  };

  const savedGame = typeof window !== 'undefined' && localStorage.getItem('monopoly3d_save');

  // Student ID Prompt Modal
  if (showStudentIdPrompt) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-8 max-w-md w-full mx-4 border border-purple-500/30">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">👤</div>
            <h2 className="text-2xl font-bold mb-2">{t('welcome_title')}</h2>
            <p className="text-purple-300">{t('welcome_subtitle')}</p>
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder={t('name_placeholder')}
              className="w-full px-4 py-3 bg-black/30 border border-purple-500/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
              maxLength={20}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveStudentId()}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSkipStudentId}
              className="flex-1 px-4 py-3 bg-gray-600/50 hover:bg-gray-500 rounded-xl font-bold"
            >
              {t('set_later')}
            </button>
            <button
              onClick={handleSaveStudentId}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold hover:scale-105 transition-all"
              disabled={!studentName.trim()}
            >
              {t('start_game')}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            {t('game_records_note')}
          </p>
        </div>
      </div>
    );
  }

  // Online Multiplayer Lobby
  if (showOnlineMultiplayer) {
    return (
      <OnlineLobby
        onBack={handleOnlineMultiplayerBack}
        onGameStart={handleOnlineGameStart}
      />
    );
  }

  // LAN Multiplayer Menu Modal
  if (showLANMultiplayerMenu) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-8 max-w-md w-full mx-4 border border-purple-500/30">
          <div className="flex items-center justify-between mb-6">
            <div className="text-center flex-1">
              <div className="text-4xl mb-2">📡</div>
              <h2 className="text-xl font-bold">{t('lan_multiplayer')}</h2>
            </div>
            <button
              onClick={handleCancelMultiplayer}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          {!multiplayerMode && (
            <div className="space-y-4">
              <p className="text-purple-300 text-sm text-center mb-4">
                {t('lan_multiplayer_desc')}
              </p>

              <button
                onClick={handleCreateRoom}
                disabled={isConnecting}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold text-lg hover:scale-105 transition-all disabled:opacity-50"
              >
                {isConnecting ? t('creating') : `🏠 ${t('create_room')}`}
              </button>

              <div className="text-center text-gray-400 my-2">{t('or')}</div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder={t('room_code_placeholder')}
                  className="flex-1 px-4 py-3 bg-black/30 border border-purple-500/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 uppercase"
                  maxLength={6}
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={isConnecting || !joinCode.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50"
                >
                  {t('join')}
                </button>
              </div>

              {connectionError && (
                <div className="text-red-400 text-sm text-center bg-red-900/30 rounded-lg p-2">
                  {connectionError}
                </div>
              )}
            </div>
          )}

          {multiplayerMode === 'host' && (
            <div className="text-center">
              <div className="text-green-400 text-sm mb-2">✅ {t('room_created')}</div>
              <div className="bg-black/30 rounded-xl p-4 mb-4">
                <div className="text-xs text-gray-400 mb-1">{t('room_code')}</div>
                <div className="text-4xl font-bold tracking-widest text-yellow-400">
                  {roomCode}
                </div>
              </div>
              <p className="text-purple-300 text-sm mb-4">
                {t('share_code')}
              </p>
              <div className="text-gray-400 text-xs mb-4">
                {t('players_connected')}: 1/{6}
              </div>
              <button
                onClick={handleStartMultiplayerGame}
                className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold"
              >
                {t('start_game')}
              </button>
            </div>
          )}

          {multiplayerMode === 'join' && (
            <div className="text-center">
              <div className="text-green-400 text-sm mb-2">✅ {t('connected')}</div>
              <div className="bg-black/30 rounded-xl p-4 mb-4">
                <div className="text-xs text-gray-400 mb-1">{t('room_code')}</div>
                <div className="text-2xl font-bold tracking-widest text-yellow-400">
                  {roomCode}
                </div>
              </div>
              <p className="text-purple-300 text-sm mb-4">
                {t('waiting_host')}
              </p>
              <button
                onClick={handleCancelMultiplayer}
                className="w-full px-6 py-3 bg-gray-600 rounded-xl font-bold"
              >
                {t('exit')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏦</span>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              {t('app_title')}
            </h1>
            <p className="text-xs text-purple-300">Educational Edition</p>
          </div>
        </div>
        {studentId && (
          <div className="text-sm text-purple-400 bg-purple-900/30 px-3 py-1 rounded-full">
            👋 {studentId}
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 px-6 shrink-0 border-b border-white/10">
        {[
          { key: 'game',    icon: '🎮', label: t('tab_game')    || '游戏' },
          { key: 'social', icon: '🌐', label: t('tab_social')  || '社交' },
          { key: 'tools',  icon: '🛠️', label: t('tab_tools')   || '工具' },
          { key: 'account',icon: '👤', label: t('tab_account')  || '账户' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-pink-500 text-pink-400 bg-pink-500/10'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto">

          {/* 🎮 游戏 */}
          {activeTab === 'game' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={goToSetup}
                className="flex items-center gap-4 px-6 py-5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl text-left hover:scale-[1.02] transition-all shadow-lg hover:shadow-purple-500/30"
              >
                <span className="text-3xl">🎮</span>
                <div>
                  <div className="text-lg font-bold">{t('new_game')}</div>
                  <div className="text-xs text-pink-200 opacity-70">{t('new_game_desc') || '开始全新游戏'}</div>
                </div>
              </button>

              {savedGame && (
                <button
                  onClick={handleResume}
                  className="flex items-center gap-4 px-6 py-5 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl text-left hover:scale-[1.02] transition-all shadow-lg hover:shadow-blue-500/30"
                >
                  <span className="text-3xl">📁</span>
                  <div>
                    <div className="text-lg font-bold">{t('continue_game')}</div>
                    <div className="text-xs text-blue-200 opacity-70">{t('continue_game_desc') || '继续上次游戏'}</div>
                  </div>
                </button>
              )}

              <button
                onClick={() => alert(t('rules_text'))}
                className="flex items-center gap-4 px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-left hover:scale-[1.02] transition-all hover:bg-white/10"
              >
                <span className="text-3xl">📖</span>
                <div>
                  <div className="text-lg font-bold">{t('game_rules')}</div>
                  <div className="text-xs text-gray-400 opacity-70">{t('game_rules_desc') || '了解游戏规则'}</div>
                </div>
              </button>

              <button
                onClick={goToEditor}
                className="flex items-center gap-4 px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-left hover:scale-[1.02] transition-all hover:bg-white/10"
              >
                <span className="text-3xl">🗺️</span>
                <div>
                  <div className="text-lg font-bold">{t('map_editor')}</div>
                  <div className="text-xs text-gray-400 opacity-70">{t('map_editor_desc') || '创建自定义地图'}</div>
                </div>
              </button>
            </div>
          )}

          {/* 🌐 社交 */}
          {activeTab === 'social' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setShowOnlineMultiplayer(true)}
                className="flex items-center gap-4 px-6 py-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl text-left hover:scale-[1.02] transition-all shadow-lg hover:shadow-green-500/30"
              >
                <span className="text-3xl">🌐</span>
                <div>
                  <div className="text-lg font-bold">{t('online_battle')}</div>
                  <div className="text-xs text-green-200 opacity-70">{t('online_battle_desc') || '与全球玩家对战'}</div>
                </div>
              </button>

              <button
                onClick={() => setShowLANMultiplayerMenu(true)}
                className="flex items-center gap-4 px-6 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl text-left hover:scale-[1.02] transition-all shadow-lg hover:shadow-cyan-500/30"
              >
                <span className="text-3xl">📡</span>
                <div>
                  <div className="text-lg font-bold">{t('lan_multiplayer')}</div>
                  <div className="text-xs text-cyan-200 opacity-70">{t('lan_multiplayer_desc') || '本地局域网联机'}</div>
                </div>
              </button>

              <button
                onClick={handleShowReplayList}
                className="flex items-center gap-4 px-6 py-5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl text-left hover:scale-[1.02] transition-all shadow-lg hover:shadow-purple-500/30"
              >
                <span className="text-3xl">📹</span>
                <div>
                  <div className="text-lg font-bold">{t('view_replays')}</div>
                  <div className="text-xs text-purple-200 opacity-70">{t('view_replays_desc') || '观看历史回放'}</div>
                </div>
              </button>
            </div>
          )}

          {/* 🛠️ 工具 */}
          {activeTab === 'tools' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={goToTeacherPage}
                className="flex items-center gap-4 px-6 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl text-left hover:scale-[1.02] transition-all shadow-lg hover:shadow-purple-500/30"
              >
                <span className="text-3xl">🎓</span>
                <div>
                  <div className="text-lg font-bold">{t('teacher')}</div>
                  <div className="text-xs text-purple-200 opacity-70">{t('teacher_desc') || '教师端管理'}</div>
                </div>
              </button>

              <button
                onClick={useGameStore.getState().goToWorkshop}
                className="flex items-center gap-4 px-6 py-5 bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl text-left hover:scale-[1.02] transition-all shadow-lg hover:shadow-pink-500/30"
              >
                <span className="text-3xl">🎨</span>
                <div>
                  <div className="text-lg font-bold">{t('creative_workshop')}</div>
                  <div className="text-xs text-pink-200 opacity-70">{t('workshop_desc') || '浏览创意工坊'}</div>
                </div>
              </button>
            </div>
          )}

          {/* 👤 账户 */}
          {activeTab === 'account' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={goToProfile}
                className="flex items-center gap-4 px-6 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-left hover:scale-[1.02] transition-all shadow-lg hover:shadow-indigo-500/30"
              >
                <span className="text-3xl">👤</span>
                <div>
                  <div className="text-lg font-bold">{t('profile')}</div>
                  <div className="text-xs text-indigo-200 opacity-70">{t('profile_desc') || '查看玩家档案'}</div>
                </div>
              </button>

              <button
                onClick={() => setShowAchievementPanel(true)}
                className="flex items-center gap-4 px-6 py-5 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-2xl text-left hover:scale-[1.02] transition-all shadow-lg hover:shadow-yellow-500/30"
              >
                <span className="text-3xl">🏆</span>
                <div>
                  <div className="text-lg font-bold">{t('achievements')}</div>
                  <div className="text-xs text-yellow-200 opacity-70">{t('achievements_desc') || '成就与荣誉'}</div>
                </div>
              </button>

              <div className="sm:col-span-2">
                <LanguageSelector />
              </div>

              <button
                onClick={() => {
                  if (confirm(t('confirm_switch_account'))) {
                    localStorage.removeItem('monopoly3d_student_id');
                    setStudentId(null);
                    setShowStudentIdPrompt(true);
                  }
                }}
                className="flex items-center gap-4 px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-left hover:scale-[1.02] transition-all hover:bg-white/10"
              >
                <span className="text-3xl">🔄</span>
                <div>
                  <div className="text-lg font-bold">{t('switch_account')}</div>
                  <div className="text-xs text-gray-400 opacity-70">{t('switch_account_desc') || '切换账号'}</div>
                </div>
              </button>

              <button
                onClick={() => alert(t('about_text'))}
                className="flex items-center gap-4 px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-left hover:scale-[1.02] transition-all hover:bg-white/10"
              >
                <span className="text-3xl">ℹ️</span>
                <div>
                  <div className="text-lg font-bold">{t('about_game')}</div>
                  <div className="text-xs text-gray-400 opacity-70">{t('about_game_desc') || '关于游戏'}</div>
                </div>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Achievement Panel Modal */}
      {showAchievementPanel && (
        <AchievementPanel onClose={() => setShowAchievementPanel(false)} />
      )}

      {/* Replay List Modal */}
      {showReplayList && (
        <div className="flex flex-col items-center justify-center h-screen text-white">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-8 max-w-2xl w-full mx-4 border border-purple-500/30 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-center flex-1">
                <div className="text-4xl mb-2">📹</div>
                <h2 className="text-xl font-bold">{t('game_replay')}</h2>
              </div>
              <button
                onClick={handleCloseReplayList}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Replay List */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingReplays ? (
                <div className="text-center text-gray-400 py-8">
                  {t('loading')}
                </div>
              ) : replayList.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-4xl mb-2">📭</div>
                  <p>{t('no_replays')}</p>
                  <p className="text-sm mt-1">{t('replay_hint')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {replayList.map((replay) => (
                    <div
                      key={replay.id}
                      className="bg-black/30 rounded-xl p-4 border border-purple-500/30 hover:border-purple-400/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-400 font-bold tracking-wider">
                              {replay.room_code}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(replay.recorded_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {t('duration')} {Math.round(replay.duration / 1000)}{t('events_count')} · {replay.event_count} {t('events_count')}
                          </div>
                        </div>
                        <button
                          onClick={() => handleLoadReplay(replay)}
                          className="text-xs px-3 py-1 bg-purple-500/50 hover:bg-purple-500 rounded-lg"
                        >
                          ▶️ {t('play')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
