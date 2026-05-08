import { useState, useEffect } from 'react';
import { useGameStore } from '../game/store';
import { useAchievementStore } from '../features/achievement/achievementStore';

const CATEGORY_NAMES = {
  math: '📐 数学',
  shape: '🔷 形状',
  time: '⏰ 时间',
  geography: '🌍 地理',
  science: '🔬 科学',
  reading: '📖 阅读',
  life: '🏠 生活',
  emotion: '💭 情感',
  animal: '🐾 动物',
};

const CATEGORY_ICONS = {
  math: '📐',
  shape: '🔷',
  time: '⏰',
  geography: '🌍',
  science: '🔬',
  reading: '📖',
  life: '🏠',
  emotion: '💭',
  animal: '🐾',
};

// AI Learning Stats Content Component
function AIStatsContent({ studentId }) {
  const [aiStats, setAiStats] = useState({ totalDecisions: 0, buyDecisions: 0, passDecisions: 0, buildDecisions: 0, recentDecisions: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAIStatsFromProfile();
  }, [studentId]);

  const loadAIStatsFromProfile = () => {
    setIsLoading(true);
    const profilesJson = localStorage.getItem('monopoly3d_student_profiles');
    if (!profilesJson) {
      setAiStats({ totalDecisions: 0, buyDecisions: 0, passDecisions: 0, buildDecisions: 0, recentDecisions: [] });
      setIsLoading(false);
      return;
    }

    const profiles = JSON.parse(profilesJson);
    const profile = studentId ? profiles[studentId] : null;
    
    if (!profile || !profile.games || profile.games.length === 0) {
      setAiStats({ totalDecisions: 0, buyDecisions: 0, passDecisions: 0, buildDecisions: 0, recentDecisions: [] });
      setIsLoading(false);
      return;
    }

    // Aggregate AI decisions from all saved games
    let allDecisions = [];
    profile.games.forEach(game => {
      if (game.aiDecisions && game.aiDecisions.length > 0) {
        allDecisions = [...allDecisions, ...game.aiDecisions.map(d => ({ ...d, gameDate: game.date }))];
      }
    });

    const buyDecisions = allDecisions.filter(d => d.type === 'buy');
    const passDecisions = allDecisions.filter(d => d.type === 'pass');
    const buildDecisions = allDecisions.filter(d => d.type === 'build');

    setAiStats({
      totalDecisions: allDecisions.length,
      buyDecisions: buyDecisions.length,
      passDecisions: passDecisions.length,
      buildDecisions: buildDecisions.length,
      recentDecisions: allDecisions.slice(-20).reverse(),
    });
    setIsLoading(false);
  };

  const getDecisionIcon = (type) => {
    switch (type) {
      case 'buy': return '🏠';
      case 'pass': return '⏭️';
      case 'build': return '🏗️';
      case 'trade': return '🔄';
      default: return '❓';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 text-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <>
      {/* Stats Overview */}
      <div className="bg-gray-800/50 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-6 text-center">🧠 AI学习记录</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900/50 rounded-xl p-4 text-center">
            <div className="text-4xl mb-2">📝</div>
            <div className="text-3xl font-bold text-white">{aiStats.totalDecisions}</div>
            <div className="text-gray-400 text-sm">总决策数</div>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-4 text-center">
            <div className="text-4xl mb-2">🏠</div>
            <div className="text-3xl font-bold text-blue-400">{aiStats.buyDecisions}</div>
            <div className="text-gray-400 text-sm">购房决策</div>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-4 text-center">
            <div className="text-4xl mb-2">⏭️</div>
            <div className="text-3xl font-bold text-yellow-400">{aiStats.passDecisions}</div>
            <div className="text-gray-400 text-sm">跳过决策</div>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-4 text-center">
            <div className="text-4xl mb-2">🏗️</div>
            <div className="text-3xl font-bold text-purple-400">{aiStats.buildDecisions}</div>
            <div className="text-gray-400 text-sm">建屋决策</div>
          </div>
        </div>
      </div>

      {/* Recent Decisions from saved games */}
      <div className="bg-gray-800/50 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">📋 AI决策历史</h3>
        {aiStats.recentDecisions.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <div className="text-5xl mb-4">📭</div>
            <p>暂无AI决策记录</p>
            <p className="text-sm mt-2">与AI对战时，AI的决策会被记录下来！</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {aiStats.recentDecisions.map((decision, idx) => (
              <div key={idx} className="bg-gray-900/50 rounded-lg p-3 flex items-center justify-between text-gray-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getDecisionIcon(decision.type)}</span>
                  <div>
                    <div className="font-bold">
                      {decision.type === 'buy' && `购房: ${decision.tileName || '未知'}`}
                      {decision.type === 'pass' && '跳过购买'}
                      {decision.type === 'build' && `建屋: ${decision.tileName || '未知'}`}
                      {decision.type === 'trade' && '交易'}
                    </div>
                    <div className="text-sm text-gray-400">
                      ¥{decision.playerMoney} | 位置:{decision.playerPosition} | 决策:{decision.decision?.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>{formatDate(decision.gameDate)}</div>
                  <div>{formatTime(decision.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// Calculate level from games played
function calculateLevel(gamesPlayed) {
  if (gamesPlayed >= 100) return { level: 10, title: '传奇玩家', progress: 100 };
  if (gamesPlayed >= 75) return { level: 9, title: '史诗大师', progress: ((gamesPlayed - 75) / 25) * 100 };
  if (gamesPlayed >= 50) return { level: 8, title: '钻石王者', progress: ((gamesPlayed - 50) / 25) * 100 };
  if (gamesPlayed >= 35) return { level: 7, title: '铂金高手', progress: ((gamesPlayed - 35) / 15) * 100 };
  if (gamesPlayed >= 25) return { level: 6, title: '黄金选手', progress: ((gamesPlayed - 25) / 10) * 100 };
  if (gamesPlayed >= 15) return { level: 5, title: '白银玩家', progress: ((gamesPlayed - 15) / 10) * 100 };
  if (gamesPlayed >= 8) return { level: 4, title: '青铜新秀', progress: ((gamesPlayed - 8) / 7) * 100 };
  if (gamesPlayed >= 4) return { level: 3, title: '入门学者', progress: ((gamesPlayed - 4) / 4) * 100 };
  if (gamesPlayed >= 2) return { level: 2, title: '学前儿童', progress: ((gamesPlayed - 2) / 2) * 100 };
  return { level: 1, title: '新手萌娃', progress: (gamesPlayed / 2) * 100 };
}

export default function ProfileScreen() {
  const studentId = useGameStore(s => s.studentId);
  const setStudentId = useGameStore(s => s.setStudentId);
  const profileStats = useAchievementStore(s => s.profileStats);

  const [activeTab, setActiveTab] = useState('stats');
  const [gameHistory, setGameHistory] = useState([]);
  const [wrongAnswersByCategory, setWrongAnswersByCategory] = useState({});
  const [aiBattleRecord, setAiBattleRecord] = useState({ wins: 0, losses: 0, total: 0 });
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  // Load game history from localStorage
  useEffect(() => {
    const profilesJson = localStorage.getItem('monopoly3d_student_profiles');
    if (profilesJson) {
      const profiles = JSON.parse(profilesJson);
      const currentProfile = studentId ? profiles[studentId] : null;
      if (currentProfile) {
        const games = currentProfile.games || [];
        setGameHistory(games.slice(-20).reverse());

        // Process wrong answers by category
        const wrongByCategory = {};
        games.forEach(game => {
          if (game.categoryStats) {
            Object.entries(game.categoryStats).forEach(([cat, stats]) => {
              if (!wrongByCategory[cat]) {
                wrongByCategory[cat] = { total: 0, correct: 0 };
              }
              wrongByCategory[cat].total += stats.total;
              wrongByCategory[cat].correct += stats.correct;
            });
          }
        });
        setWrongAnswersByCategory(wrongByCategory);

        // Calculate AI battle record (games with AI opponents)
        let aiWins = 0, aiLosses = 0;
        games.forEach(game => {
          if (game.rank === 1) aiWins++;
          else if (game.rank > 1) aiLosses++;
        });
        setAiBattleRecord({ wins: aiWins, losses: aiLosses, total: aiWins + aiLosses });
      }
    }
  }, [studentId]);

  const levelInfo = calculateLevel(profileStats?.gamesPlayed || 0);
  const winRate = profileStats?.gamesPlayed > 0
    ? Math.round((profileStats.wins / profileStats.gamesPlayed) * 100)
    : 0;

  const handleSaveName = () => {
    if (newName.trim()) {
      setStudentId(newName.trim());
      setIsEditingName(false);
    }
  };

  const handleResetProfile = () => {
    if (confirm('确定要重置所有数据吗？此操作不可撤销！')) {
      localStorage.removeItem('monopoly3d_student_profiles');
      localStorage.removeItem('monopoly3d_achievements');
      window.location.reload();
    }
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getRankBadge = (rank, total) => {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}/${total}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
            👤 个人中心
          </h1>
          <button
            onClick={() => useGameStore.getState().goToMenu?.() || window.history.back()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition-all"
          >
            ← 返回
          </button>
        </div>

        {/* Player Card */}
        <div className="bg-gradient-to-br from-purple-800/50 to-pink-800/50 rounded-2xl p-6 mb-6 border border-purple-500/30">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-5xl shadow-lg">
              {studentId?.charAt(0)?.toUpperCase() || '?'}
            </div>

            {/* Name & Level */}
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    maxLength={20}
                    className="px-4 py-2 bg-black/30 border border-purple-500/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-4 py-2 bg-green-500 hover:bg-green-400 rounded-xl font-bold"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-xl font-bold"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{studentId || '访客'}</h2>
                  <button
                    onClick={() => { setNewName(studentId || ''); setIsEditingName(true); }}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    ✏️
                  </button>
                </div>
              )}
              <p className="text-purple-300 mt-1">{levelInfo.title}</p>

              {/* Level Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-sm text-purple-200 mb-1">
                  <span>Lv.{levelInfo.level}</span>
                  <span>{Math.round(levelInfo.progress)}%</span>
                </div>
                <div className="h-3 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-300 transition-all duration-500"
                    style={{ width: `${levelInfo.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { id: 'stats', label: '📊 统计数据' },
            { id: 'history', label: '📜 游戏记录' },
            { id: 'wrong', label: '📖 错题本' },
            { id: 'ai', label: '🤖 AI对战' },
            { id: 'ai_stats', label: '🧠 AI战绩' },
            { id: 'settings', label: '⚙️ 设置' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">🎮</div>
              <div className="text-3xl font-bold text-white">{profileStats?.gamesPlayed || 0}</div>
              <div className="text-gray-400 text-sm">总场次</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">🏆</div>
              <div className="text-3xl font-bold text-yellow-400">{profileStats?.wins || 0}</div>
              <div className="text-gray-400 text-sm">胜利次数</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">📈</div>
              <div className="text-3xl font-bold text-green-400">{winRate}%</div>
              <div className="text-gray-400 text-sm">胜率</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">🔥</div>
              <div className="text-3xl font-bold text-orange-400">{profileStats?.currentProgress?.correctStreak || 0}</div>
              <div className="text-gray-400 text-sm">当前连胜</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">🏠</div>
              <div className="text-3xl font-bold text-blue-400">{profileStats?.propertiesBought || 0}</div>
              <div className="text-gray-400 text-sm">购买地产</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">🏗️</div>
              <div className="text-3xl font-bold text-purple-400">{profileStats?.housesBuilt || 0}</div>
              <div className="text-gray-400 text-sm">建造房屋</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">❓</div>
              <div className="text-3xl font-bold text-cyan-400">{profileStats?.totalQuestionsAnswered || 0}</div>
              <div className="text-gray-400 text-sm">答题总数</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">💰</div>
              <div className="text-3xl font-bold text-emerald-400">{profileStats?.maxMoneyEarned || 0}</div>
              <div className="text-gray-400 text-sm">最高财富</div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-gray-800/50 rounded-xl overflow-hidden">
            {gameHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="text-5xl mb-4">📭</div>
                <p>暂无游戏记录</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50 sticky top-0">
                    <tr className="text-left text-gray-400 text-sm">
                      <th className="px-4 py-3">日期</th>
                      <th className="px-4 py-3">排名</th>
                      <th className="px-4 py-3">正确率</th>
                      <th className="px-4 py-3">时长</th>
                      <th className="px-4 py-3">题目</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameHistory.map((game, idx) => (
                      <tr key={idx} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-sm">{formatDate(game.date)}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${game.rank === 1 ? 'text-yellow-400' : 'text-white'}`}>
                            {getRankBadge(game.rank, game.totalPlayers)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${game.accuracy >= 80 ? 'text-green-400' : game.accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {game.accuracy}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300">{formatDuration(game.duration)}</td>
                        <td className="px-4 py-3 text-gray-300">{game.correctQuestions}/{game.totalQuestions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Wrong Answers Tab */}
        {activeTab === 'wrong' && (
          <div className="space-y-4">
            {Object.keys(CATEGORY_NAMES).length === 0 ? (
              <div className="bg-gray-800/50 rounded-xl p-8 text-center text-gray-400">
                <div className="text-5xl mb-4">📖</div>
                <p>暂无答题数据</p>
              </div>
            ) : (
              Object.entries(CATEGORY_NAMES).map(([cat, name]) => {
                const stats = wrongAnswersByCategory[cat] || { total: 0, correct: 0 };
                const wrong = stats.total - stats.correct;
                const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                return (
                  <div key={cat} className="bg-gray-800/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
                        <span className="font-bold">{name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-sm">正确率: <span className={`font-bold ${accuracy >= 80 ? 'text-green-400' : accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{accuracy}%</span></span>
                        <span className="text-gray-400 text-sm">错题: <span className="font-bold text-red-400">{wrong}</span></span>
                      </div>
                    </div>
                    <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${accuracy >= 80 ? 'bg-green-500' : accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>正确: {stats.correct}</span>
                      <span>总计: {stats.total}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* AI Battle Tab */}
        {activeTab === 'ai' && (
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-6 text-center">🤖 AI对战记录</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                <div className="text-4xl mb-2">🏆</div>
                <div className="text-3xl font-bold text-green-400">{aiBattleRecord.wins}</div>
                <div className="text-gray-400 text-sm">胜利</div>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                <div className="text-4xl mb-2">💀</div>
                <div className="text-3xl font-bold text-red-400">{aiBattleRecord.losses}</div>
                <div className="text-gray-400 text-sm">失败</div>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                <div className="text-4xl mb-2">📊</div>
                <div className="text-3xl font-bold text-blue-400">
                  {aiBattleRecord.total > 0 ? Math.round((aiBattleRecord.wins / aiBattleRecord.total) * 100) : 0}%
                </div>
                <div className="text-gray-400 text-sm">胜率</div>
              </div>
            </div>
            {aiBattleRecord.total === 0 && (
              <p className="text-center text-gray-400">开始游戏来积累AI对战记录吧！</p>
            )}
          </div>
        )}

        {/* AI Learning Stats Tab */}
        {activeTab === 'ai_stats' && (
          <div className="space-y-4">
            <AIStatsContent studentId={studentId} />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">👤 账号设置</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">玩家名称</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newName || studentId || ''}
                      onChange={(e) => setNewName(e.target.value)}
                      maxLength={20}
                      className="flex-1 px-4 py-3 bg-black/30 border border-purple-500/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                    />
                    <button
                      onClick={handleSaveName}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold hover:scale-105 transition-all"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">⚠️ 数据管理</h3>
              <p className="text-gray-400 text-sm mb-4">重置将清除所有游戏记录、成就和设置，此操作不可撤销！</p>
              <button
                onClick={handleResetProfile}
                className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 rounded-xl font-bold hover:scale-105 transition-all"
              >
                🗑️ 重置所有数据
              </button>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">ℹ️ 关于</h3>
              <div className="text-gray-400 text-sm space-y-1">
                <p>大富翁3D教育版</p>
                <p>版本: 1.0.0</p>
                <p>© 2026 教育游戏工作室</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
