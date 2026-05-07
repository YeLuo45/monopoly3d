import { useState, useRef, useMemo } from 'react';
import { useGameStore } from '../game/store';
import { BOARD_CONFIG } from '../game/boardConfig';

const ALL_CATEGORIES = ['math', 'shape', 'time', 'geography', 'science', 'reading', 'life', 'emotion', 'animal'];

const CATEGORY_LABELS = {
  math: '🔢 数学',
  shape: '⬡ 形状',
  time: '⏰ 时间',
  geography: '🌍 地理',
  science: '🔬 科学',
  reading: '📖 阅读',
  life: '🌱 生活',
  emotion: '💝 情感',
  animal: '🐾 动物',
};

function getAccuracyColor(accuracy) {
  if (accuracy >= 80) return '#4ADE80'; // green
  if (accuracy >= 60) return '#FACC15'; // yellow
  if (accuracy >= 40) return '#FB923C'; // orange
  return '#F87171'; // red
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function TeacherConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [showClassReport, setShowClassReport] = useState(false);
  const fileInputRef = useRef(null);
  
  const teacherMode = useGameStore(s => s.teacherMode);
  const toggleTeacherMode = useGameStore(s => s.toggleTeacherMode);
  const timerEnabled = useGameStore(s => s.timerEnabled);
  const toggleTimer = useGameStore(s => s.toggleTimer);
  const aiThinkingDelayEnabled = useGameStore(s => s.aiThinkingDelayEnabled);
  const toggleAiThinkingDelay = useGameStore(s => s.toggleAiThinkingDelay);
  const players = useGameStore(s => s.players);
  const saveGame = useGameStore(s => s.saveGame);
  const goToMenu = useGameStore(s => s.goToMenu);
  const enabledCategories = useGameStore(s => s.enabledCategories);
  const toggleCategory = useGameStore(s => s.toggleCategory);
  const importQuestions = useGameStore(s => s.importQuestions);
  const exportQuestions = useGameStore(s => s.exportQuestions);
  const downloadQuestionTemplate = useGameStore(s => s.downloadQuestionTemplate);
  const customQuestions = useGameStore(s => s.customQuestions);
  
  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) {
          setImportStatus({ type: 'error', message: 'JSON格式错误：需要是数组格式' });
          return;
        }
        // Validate structure
        const valid = data.every(q => 
          q.id && q.tier && q.category && q.question && 
          Array.isArray(q.options) && q.options.length === 4 &&
          typeof q.correctIndex === 'number'
        );
        if (!valid) {
          setImportStatus({ type: 'error', message: '题目格式错误，请检查JSON结构' });
          return;
        }
        const before = data.length;
        importQuestions(data);
        const afterCustom = useGameStore.getState().customQuestions.length;
        const imported = afterCustom - (useGameStore.getState().customQuestions.length - (before - (useGameStore.getState().customQuestions.length - before)));
        setImportStatus({ type: 'success', message: `成功导入 ${before} 道题目` });
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        setImportStatus({ type: 'error', message: 'JSON解析失败' });
      }
    };
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };
  
  if (!teacherMode) {
    return (
      <button
        onClick={toggleTeacherMode}
        className="absolute top-16 right-4 z-40 px-3 py-1 bg-purple-600/80 hover:bg-purple-500 rounded-lg text-white text-xs font-bold pointer-events-auto"
      >
        🎓 教师模式
      </button>
    );
  }
  
  // Class Report Panel
  if (showClassReport) {
    return <ClassReportPanel onClose={() => setShowClassReport(false)} />;
  }
  
  return (
    <div className="absolute top-16 right-4 z-40 bg-black/90 backdrop-blur-sm rounded-2xl p-4 w-80 border border-purple-500/30 pointer-events-auto max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="text-purple-300 font-bold text-sm">🎓 教师控制台</div>
        <button
          onClick={toggleTeacherMode}
          className="text-gray-400 hover:text-white text-lg"
        >
          ✕
        </button>
      </div>
      
      {/* Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm">答题计时器</span>
          <button
            onClick={toggleTimer}
            className={`px-3 py-1 rounded-lg text-sm font-bold ${
              timerEnabled ? 'bg-green-600' : 'bg-gray-600'
            } text-white`}
          >
            {timerEnabled ? '开启' : '关闭'}
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm">AI 思考延迟</span>
          <button
            onClick={toggleAiThinkingDelay}
            className={`px-3 py-1 rounded-lg text-sm font-bold ${
              aiThinkingDelayEnabled ? 'bg-green-600' : 'bg-gray-600'
            } text-white`}
          >
            {aiThinkingDelayEnabled ? '开启' : '关闭'}
          </button>
        </div>
        
        <div className="border-t border-gray-700 pt-3">
          <div className="text-gray-400 text-xs mb-2">玩家管理</div>
          {players.map(player => (
            <div key={player.id} className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: player.color }}
                />
                <span className="text-white text-sm">{player.name}</span>
                {player.isAI && <span className="text-xs">🤖</span>}
              </div>
              <div className="text-yellow-400 text-sm font-bold">
                ${player.money}
              </div>
            </div>
          ))}
        </div>
        
        {/* Category Filters */}
        <div className="border-t border-gray-700 pt-3">
          <div className="text-gray-400 text-xs mb-2">题目类别筛选</div>
          <div className="grid grid-cols-2 gap-1">
            {ALL_CATEGORIES.map(cat => (
              <label key={cat} className="flex items-center gap-1 cursor-pointer hover:bg-gray-800 rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={enabledCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="w-3 h-3 accent-purple-500"
                />
                <span className="text-xs text-gray-300">{CATEGORY_LABELS[cat]}</span>
              </label>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            已启用: {enabledCategories.length}/{ALL_CATEGORIES.length} 类
          </div>
        </div>
        
        {/* Custom Questions */}
        <div className="border-t border-gray-700 pt-3">
          <div className="text-gray-400 text-xs mb-2">自定义题库</div>
          <div className="text-xs text-gray-500 mb-2">
            自定义题目: {customQuestions.length} 道
          </div>
          
          {/* Import Status */}
          {importStatus && (
            <div className={`text-xs mb-2 p-2 rounded ${
              importStatus.type === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
            }`}>
              {importStatus.message}
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-bold"
            >
              📥 导入题库
            </button>
            <button
              onClick={exportQuestions}
              className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-bold"
            >
              📤 导出题库
            </button>
            <button
              onClick={downloadQuestionTemplate}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white text-sm font-bold"
            >
              📄 下载模板
            </button>
          </div>
        </div>
        
        {/* Class Report Button */}
        <div className="border-t border-gray-700 pt-3">
          <button
            onClick={() => setShowClassReport(true)}
            className="w-full px-3 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            📊 全班报告
          </button>
        </div>
        
        <div className="border-t border-gray-700 pt-3">
          <div className="text-gray-400 text-xs mb-2">快捷操作</div>
          <div className="flex gap-2">
            <button
              onClick={saveGame}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-bold"
            >
              💾 存档
            </button>
            <button
              onClick={goToMenu}
              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm font-bold"
            >
              🏠 退出
            </button>
          </div>
        </div>
        
        <div className="text-gray-500 text-xs text-center mt-2">
          教师模式已开启 · 学生视图已简化
        </div>
      </div>
    </div>
  );
}

// Class Report Panel Component
function ClassReportPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview | heatmap | properties
  
  // Load student profiles from localStorage
  const profilesData = useMemo(() => {
    const json = localStorage.getItem('monopoly3d_student_profiles');
    if (!json) return {};
    try {
      return JSON.parse(json);
    } catch {
      return {};
    }
  }, []);
  
  const profiles = Object.values(profilesData);
  
  // Calculate aggregate stats
  const aggregateStats = useMemo(() => {
    if (profiles.length === 0) return null;
    
    const allGames = profiles.flatMap(p => p.games || []);
    if (allGames.length === 0) return null;
    
    // Overall accuracy
    const totalQuestions = allGames.reduce((sum, g) => sum + (g.totalQuestions || 0), 0);
    const totalCorrect = allGames.reduce((sum, g) => sum + (g.correctQuestions || 0), 0);
    const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    
    // Average game duration
    const avgDuration = allGames.length > 0
      ? Math.round(allGames.reduce((sum, g) => sum + (g.duration || 0), 0) / allGames.length / 60000)
      : 0;
    
    // Average questions per game
    const avgQuestions = allGames.length > 0
      ? Math.round(allGames.reduce((sum, g) => sum + (g.totalQuestions || 0), 0) / allGames.length)
      : 0;
    
    // Category performance
    const categoryTotals = {};
    ALL_CATEGORIES.forEach(cat => {
      categoryTotals[cat] = { total: 0, correct: 0 };
    });
    
    allGames.forEach(game => {
      Object.entries(game.categoryStats || {}).forEach(([cat, stats]) => {
        if (categoryTotals[cat]) {
          categoryTotals[cat].total += stats.total || 0;
          categoryTotals[cat].correct += stats.correct || 0;
        }
      });
    });
    
    const categoryAccuracy = {};
    Object.entries(categoryTotals).forEach(([cat, data]) => {
      categoryAccuracy[cat] = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
    });
    
    // Find weakest and strongest categories
    const categoriesWithData = Object.entries(categoryAccuracy).filter(([_, acc]) => acc > 0);
    const weakestCategory = categoriesWithData.length > 0
      ? categoriesWithData.reduce((min, [cat, acc]) => acc < min[1] ? [cat, acc] : min)
      : null;
    const strongestCategory = categoriesWithData.length > 0
      ? categoriesWithData.reduce((max, [cat, acc]) => acc > max[1] ? [cat, acc] : max)
      : null;
    
    // Most popular properties
    const propertyCounts = {};
    allGames.forEach(game => {
      (game.propertiesBought || []).forEach(prop => {
        propertyCounts[prop.tileId] = (propertyCounts[prop.tileId] || 0) + 1;
      });
    });
    const popularProperties = Object.entries(propertyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tileId, count]) => {
        const tile = BOARD_CONFIG.find(t => t.id === parseInt(tileId));
        return { tileId, tileName: tile?.name || `格子${tileId}`, count };
      });
    
    return {
      totalStudents: profiles.length,
      totalGames: allGames.length,
      overallAccuracy,
      avgDuration,
      avgQuestions,
      categoryAccuracy,
      weakestCategory,
      strongestCategory,
      popularProperties,
      profiles: profiles.map(p => ({
        name: p.name,
        totalGames: p.totalGames || 0,
        lastPlayed: p.lastPlayed,
        latestGame: p.games?.[p.games.length - 1] || null,
      })),
    };
  }, [profilesData]);
  
  const handleExportCSV = () => {
    if (!aggregateStats) return;
    
    const headers = ['学生', '游戏次数', '最后游戏时间', '正确率', '答题数', '游戏时长(分钟)'];
    const rows = aggregateStats.profiles.map(p => [
      p.name,
      p.totalGames,
      formatDate(p.lastPlayed),
      p.latestGame ? `${p.latestGame.accuracy}%` : '-',
      p.latestGame ? p.latestGame.totalQuestions : '-',
      p.latestGame ? Math.round((p.latestGame.duration || 0) / 60000) : '-',
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monopoly3d-class-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleExportJSON = () => {
    const exportData = {
      exportTime: new Date().toISOString(),
      aggregateStats,
      profiles: profilesData,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monopoly3d-class-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (!aggregateStats) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-8 max-w-lg w-full border border-purple-500/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">📊 全班报告</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
          </div>
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-purple-300 mb-2">暂无学生数据</p>
            <p className="text-gray-400 text-sm">当学生完成游戏后，数据将显示在这里</p>
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl text-white font-bold"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">📊 全班报告</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-bold ${
              activeTab === 'overview' ? 'bg-purple-600 text-white' : 'bg-black/30 text-gray-400'
            }`}
          >
            📋 概览
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-4 py-2 rounded-lg text-sm font-bold ${
              activeTab === 'heatmap' ? 'bg-purple-600 text-white' : 'bg-black/30 text-gray-400'
            }`}
          >
            🔥 正确率热力图
          </button>
          <button
            onClick={() => setActiveTab('properties')}
            className={`px-4 py-2 rounded-lg text-sm font-bold ${
              activeTab === 'properties' ? 'bg-purple-600 text-white' : 'bg-black/30 text-gray-400'
            }`}
          >
            🏠 最受青睐房产
          </button>
        </div>
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-black/30 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{aggregateStats.totalStudents}</div>
                <div className="text-xs text-gray-400">学生数</div>
              </div>
              <div className="bg-black/30 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{aggregateStats.totalGames}</div>
                <div className="text-xs text-gray-400">游戏总数</div>
              </div>
              <div className="bg-black/30 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">{aggregateStats.overallAccuracy}%</div>
                <div className="text-xs text-gray-400">班级正确率</div>
              </div>
              <div className="bg-black/30 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">{aggregateStats.avgDuration}分</div>
                <div className="text-xs text-gray-400">平均时长</div>
              </div>
            </div>
            
            {/* Student Table */}
            <div className="bg-black/30 rounded-xl overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left p-3">学生</th>
                      <th className="text-center p-3">游戏次数</th>
                      <th className="text-center p-3">正确率</th>
                      <th className="text-center p-3">答题数</th>
                      <th className="text-center p-3">排名</th>
                      <th className="text-center p-3">最后游戏</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregateStats.profiles.map((profile, idx) => (
                      <tr key={idx} className="border-b border-gray-800 hover:bg-white/5">
                        <td className="p-3 text-white font-bold">{profile.name}</td>
                        <td className="p-3 text-center text-gray-300">{profile.totalGames}</td>
                        <td className="p-3 text-center">
                          {profile.latestGame ? (
                            <span
                              className="px-2 py-1 rounded text-xs font-bold"
                              style={{
                                backgroundColor: getAccuracyColor(profile.latestGame.accuracy) + '33',
                                color: getAccuracyColor(profile.latestGame.accuracy),
                              }}
                            >
                              {profile.latestGame.accuracy}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="p-3 text-center text-gray-300">
                          {profile.latestGame ? profile.latestGame.totalQuestions : '-'}
                        </td>
                        <td className="p-3 text-center text-gray-300">
                          {profile.latestGame ? `#${profile.latestGame.rank}/${profile.latestGame.totalPlayers}` : '-'}
                        </td>
                        <td className="p-3 text-center text-gray-400 text-xs">
                          {formatDate(profile.lastPlayed)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Category Performance */}
            <div className="mb-4">
              <h3 className="text-sm font-bold text-purple-300 mb-2">📈 班级分类正确率</h3>
              <div className="grid grid-cols-3 gap-2">
                {ALL_CATEGORIES.map(cat => {
                  const acc = aggregateStats.categoryAccuracy[cat] || 0;
                  return (
                    <div key={cat} className="bg-black/30 rounded-lg p-2 flex items-center gap-2">
                      <span className="text-xs w-16">{CATEGORY_LABELS[cat]}</span>
                      <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${acc}%`,
                            backgroundColor: getAccuracyColor(acc),
                          }}
                        />
                      </div>
                      <span className="text-xs w-10 text-right">{acc > 0 ? `${acc}%` : '-'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Weak/Strong Categories */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {aggregateStats.weakestCategory && (
                <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3">
                  <div className="text-xs text-red-400 mb-1">⚠️ 班级薄弱项</div>
                  <div className="font-bold text-white">
                    {CATEGORY_LABELS[aggregateStats.weakestCategory[0]]}
                  </div>
                  <div className="text-xs text-gray-400">
                    正确率: {aggregateStats.weakestCategory[1]}%
                  </div>
                </div>
              )}
              {aggregateStats.strongestCategory && (
                <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-3">
                  <div className="text-xs text-green-400 mb-1">💪 班级最强项</div>
                  <div className="font-bold text-white">
                    {CATEGORY_LABELS[aggregateStats.strongestCategory[0]]}
                  </div>
                  <div className="text-xs text-gray-400">
                    正确率: {aggregateStats.strongestCategory[1]}%
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Heatmap Tab */}
        {activeTab === 'heatmap' && (
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-3">显示每个学生在各类别的正确率（%）</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left p-2">学生</th>
                    {ALL_CATEGORIES.map(cat => (
                      <th key={cat} className="text-center p-2 min-w-[60px]">{CATEGORY_LABELS[cat]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {aggregateStats.profiles.map((profile, idx) => {
                    const game = profile.latestGame;
                    return (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="p-2 text-white font-bold">{profile.name}</td>
                        {ALL_CATEGORIES.map(cat => {
                          const catStats = game?.categoryStats?.[cat];
                          const acc = catStats?.accuracy || 0;
                          return (
                            <td key={cat} className="text-center p-1">
                              <div
                                className="rounded mx-auto w-12 h-8 flex items-center justify-center text-white font-bold"
                                style={{
                                  backgroundColor: acc > 0 ? getAccuracyColor(acc) : '#333',
                                }}
                              >
                                {acc > 0 ? `${acc}%` : '-'}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F87171' }} />
                <span className="text-xs text-gray-400">0-39%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FB923C' }} />
                <span className="text-xs text-gray-400">40-59%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FACC15' }} />
                <span className="text-xs text-gray-400">60-79%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4ADE80' }} />
                <span className="text-xs text-gray-400">80%+</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-purple-300 mb-3">🏠 学生最常购买的房产</h3>
            <div className="space-y-2">
              {aggregateStats.popularProperties.map((prop, idx) => (
                <div key={prop.tileId} className="flex items-center gap-3 bg-black/30 rounded-xl p-3">
                  <div className="text-2xl font-bold text-gray-400 w-8">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-white">{prop.tileName}</div>
                    <div className="text-xs text-gray-400">格子 #{prop.tileId}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">{prop.count}</div>
                    <div className="text-xs text-gray-400">次购买</div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Overall class insights */}
            <div className="mt-4 bg-black/20 rounded-xl p-3">
              <h4 className="text-sm font-bold text-purple-300 mb-2">📝 教学建议</h4>
              {aggregateStats.weakestCategory && (
                <p className="text-sm text-gray-300">
                  💡 建议加强对 {CATEGORY_LABELS[aggregateStats.weakestCategory[0]]} 的教学，
                  班级整体正确率仅 {aggregateStats.weakestCategory[1]}%
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Export Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold"
          >
            📊 导出CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-white font-bold"
          >
            📥 导出JSON
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl text-white font-bold"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
