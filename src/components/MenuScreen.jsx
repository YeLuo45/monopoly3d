import { useState, useEffect } from 'react';
import { useGameStore } from '../game/store';
import { AchievementPanel, useAchievementStore } from '../features/achievement';

export default function MenuScreen() {
  const goToSetup = useGameStore(s => s.goToSetup);
  const goToEditor = useGameStore(s => s.goToEditor);
  const loadGame = useGameStore(s => s.loadGame);
  const setStudentId = useGameStore(s => s.setStudentId);
  const loadStudentId = useGameStore(s => s.loadStudentId);
  const studentId = useGameStore(s => s.studentId);
  const achievementStore = useAchievementStore(s => s.profileStats);
  
  const [showStudentIdPrompt, setShowStudentIdPrompt] = useState(false);
  const [showAchievementPanel, setShowAchievementPanel] = useState(false); // eslint-disable-line no-unused-vars
  const [studentName, setStudentName] = useState('');
  const [showMultiplayerMenu, setShowMultiplayerMenu] = useState(false);
  const [multiplayerMode, setMultiplayerMode] = useState(null); // null | 'host' | 'join'
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  
  // Check for existing student ID on mount
  useEffect(() => {
    const savedId = loadStudentId();
    if (!savedId) {
      setShowStudentIdPrompt(true);
    }
  }, []);
  
  const handleResume = () => {
    const success = loadGame();
    if (!success) alert('没有找到存档！');
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
      setConnectionError('多人游戏模块未加载，请刷新页面重试');
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
      setConnectionError('创建房间失败: ' + err.message);
      setIsConnecting(false);
    }
  };
  
  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      setConnectionError('请输入房间码');
      return;
    }
    if (!window.monopolyMultiplayer) {
      setConnectionError('多人游戏模块未加载，请刷新页面重试');
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
      setConnectionError('加入房间失败: ' + err.message);
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
    setShowMultiplayerMenu(false);
  };
  
  const handleStartMultiplayerGame = () => {
    // Go to setup with multiplayer flag
    // The setup screen will handle player count for multiplayer
    const store = useGameStore.getState();
    store.setPlayers(1, 0, []); // Start with 1 human in multiplayer (more can join)
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
            <h2 className="text-2xl font-bold mb-2">欢迎来到大富翁3D</h2>
            <p className="text-purple-300">请输入你的名字开始学习吧！</p>
          </div>
          
          <div className="mb-4">
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="输入你的名字或昵称"
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
              稍后设置
            </button>
            <button
              onClick={handleSaveStudentId}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold hover:scale-105 transition-all"
              disabled={!studentName.trim()}
            >
              开始游戏
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-4 text-center">
            你的游戏记录将与这个名字关联，方便老师查看学习报告
          </p>
        </div>
      </div>
    );
  }
  
  // Multiplayer Menu Modal
  if (showMultiplayerMenu) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-8 max-w-md w-full mx-4 border border-purple-500/30">
          <div className="flex items-center justify-between mb-6">
            <div className="text-center flex-1">
              <div className="text-4xl mb-2">🌐</div>
              <h2 className="text-xl font-bold">局域网联机</h2>
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
                与同一局域网内的其他玩家进行游戏
              </p>
              
              <button
                onClick={handleCreateRoom}
                disabled={isConnecting}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold text-lg hover:scale-105 transition-all disabled:opacity-50"
              >
                {isConnecting ? '创建中...' : '🏠 创建房间'}
              </button>
              
              <div className="text-center text-gray-400 my-2">或者</div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="输入房间码"
                  className="flex-1 px-4 py-3 bg-black/30 border border-purple-500/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 uppercase"
                  maxLength={6}
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={isConnecting || !joinCode.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50"
                >
                  加入
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
              <div className="text-green-400 text-sm mb-2">✅ 房间已创建</div>
              <div className="bg-black/30 rounded-xl p-4 mb-4">
                <div className="text-xs text-gray-400 mb-1">房间码</div>
                <div className="text-4xl font-bold tracking-widest text-yellow-400">
                  {roomCode}
                </div>
              </div>
              <p className="text-purple-300 text-sm mb-4">
                将此房间码告诉其他玩家，让他们加入游戏
              </p>
              <div className="text-gray-400 text-xs mb-4">
                连接玩家: 1/{6}
              </div>
              <button
                onClick={handleStartMultiplayerGame}
                className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold"
              >
                开始游戏
              </button>
            </div>
          )}
          
          {multiplayerMode === 'join' && (
            <div className="text-center">
              <div className="text-green-400 text-sm mb-2">✅ 已连接到房间</div>
              <div className="bg-black/30 rounded-xl p-4 mb-4">
                <div className="text-xs text-gray-400 mb-1">房间码</div>
                <div className="text-2xl font-bold tracking-widest text-yellow-400">
                  {roomCode}
                </div>
              </div>
              <p className="text-purple-300 text-sm mb-4">
                等待房主开始游戏...
              </p>
              <button
                onClick={handleCancelMultiplayer}
                className="w-full px-6 py-3 bg-gray-600 rounded-xl font-bold"
              >
                退出
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-screen text-white">
      {/* Title */}
      <div className="mb-12 text-center">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
          🏦 大富翁3D
        </h1>
        <p className="text-xl text-purple-200">Educational Edition · 教育版</p>
        {studentId && (
          <p className="text-sm text-purple-400 mt-2">欢迎, {studentId}</p>
        )}
      </div>
      
      {/* Menu Buttons */}
      <div className="flex flex-col gap-4 w-72">
        <button
          onClick={goToSetup}
          className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-xl font-bold shadow-lg hover:shadow-purple-500/50 hover:scale-105 transition-all"
        >
          🎮 新游戏
        </button>
        
        {savedGame && (
          <button
            onClick={handleResume}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl text-xl font-bold shadow-lg hover:shadow-blue-500/50 hover:scale-105 transition-all"
          >
            📁 继续游戏
          </button>
        )}
        
        <button
          onClick={() => setShowMultiplayerMenu(true)}
          className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-xl font-bold shadow-lg hover:shadow-green-500/50 hover:scale-105 transition-all"
        >
          🌐 局域网联机
        </button>
        
        <button
          onClick={goToEditor}
          className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-xl font-bold shadow-lg hover:shadow-orange-500/50 hover:scale-105 transition-all"
        >
          🗺️ 地图编辑器
        </button>
        
        <button
          onClick={() => alert('📖 游戏规则：\\n\\n1. 轮流掷骰子移动棋子\\n2. 停在空地上可以购买地产\\n3. 停在问题格子上回答问题\\n4. 答对获得奖励，答错扣除金钱\\n5. 建造房屋可增加租金收入\\n6. 其他玩家经过你的地产时需付租金\\n7. 破产即出局，最后一人获胜！')}
          className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl text-xl font-bold shadow-lg hover:shadow-gray-500/50 hover:scale-105 transition-all"
        >
          📖 游戏规则
        </button>
        
        <button
          onClick={() => setShowAchievementPanel(true)}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl text-xl font-bold shadow-lg hover:shadow-yellow-500/50 hover:scale-105 transition-all"
        >
          🏆 成就中心
        </button>
        
        <button
          onClick={() => {
            if (confirm('确定要切换账号吗？这不会删除你的历史记录。')) {
              localStorage.removeItem('monopoly3d_student_id');
              setStudentId(null);
              setShowStudentIdPrompt(true);
            }
          }}
          className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl text-xl font-bold shadow-lg hover:shadow-gray-500/50 hover:scale-105 transition-all"
        >
          👤 切换账号
        </button>
        
        <button
          onClick={() => alert('🎓 大富翁3D教育版\n\n制作：教育游戏工作室\n版本：1.0.0\n\n© 2026')}
          className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl text-xl font-bold shadow-lg hover:shadow-gray-500/50 hover:scale-105 transition-all"
        >
          ℹ️ 关于游戏
        </button>
      </div>

      {/* Achievement Panel Modal */}
      {showAchievementPanel && (
        <AchievementPanel onClose={() => setShowAchievementPanel(false)} />
      )}
    </div>
  );
}
