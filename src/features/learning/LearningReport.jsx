import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGameStore } from '../../game/store';
import { BOARD_CONFIG } from '../../game/boardConfig';

// Category labels and colors
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

const CATEGORY_COLORS = {
  math: '#FF6B6B',
  shape: '#4ECDC4',
  time: '#45B7D1',
  geography: '#96CEB4',
  science: '#DDA0DD',
  reading: '#FFD700',
  life: '#98D8C8',
  emotion: '#F7DC6F',
  animal: '#BB8FCE',
};

// Grade level labels
const GRADE_LABELS = {
  kindergarten: '幼儿园',
  primary1_2: '小学1-2年级',
  primary3_4: '小学3-4年级',
};

// Time formatting
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// Get accuracy color
function getAccuracyColor(accuracy) {
  if (accuracy >= 80) return '#4ADE80';
  if (accuracy >= 60) return '#FACC15';
  if (accuracy >= 40) return '#FB923C';
  return '#F87171';
}

/**
 * LearningReport - Comprehensive learning analytics component
 * Displays detailed learning progress, performance trends, and improvement suggestions
 */
export default function LearningReport() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview | history | weakspots | achievements
  const [dateRange, setDateRange] = useState('all'); // week, month, all
  const [timestamp] = useState(() => Date.now());
  
  // Game store state
  const gameStats = useGameStore(s => s.gameStats);
  const studentId = useGameStore(s => s.studentId);
  const players = useGameStore(s => s.players);
  const ageTier = useGameStore(s => s.ageTier);
  const enabledCategories = useGameStore(s => s.enabledCategories);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  
  // Load historical data from localStorage
  const loadHistoricalData = useCallback(() => {
    const historyJson = localStorage.getItem('monopoly3d_learning_history');
    if (historyJson) {
      try {
        return JSON.parse(historyJson);
      } catch (e) {
        console.error('Failed to parse history:', e);
      }
    }
    return [];
  }, []);
  
  const historicalData = useMemo(() => loadHistoricalData(), [loadHistoricalData]);
  
  // Calculate current game stats
  const currentStats = useMemo(() => {
    const questionsAnswered = gameStats.questionsAnswered || [];
    const totalQuestions = questionsAnswered.length;
    const correctQuestions = questionsAnswered.filter(q => q.correct).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;
    
    // Category stats
    const categoryStats = {};
    enabledCategories.forEach(cat => {
      const catQuestions = questionsAnswered.filter(q => q.category === cat);
      const catCorrect = catQuestions.filter(q => q.correct).length;
      categoryStats[cat] = {
        total: catQuestions.length,
        correct: catCorrect,
        accuracy: catQuestions.length > 0 ? Math.round((catCorrect / catQuestions.length) * 100) : 0,
        recentTrend: calculateTrend(catQuestions),
      };
    });
    
    // Find weakest and strongest
    const categoriesWithData = Object.entries(categoryStats).filter(([, stats]) => stats.total > 0);
    const weakestCategory = categoriesWithData.length > 0
      ? categoriesWithData.reduce((min, [cat, s]) => s.accuracy < min[1].accuracy ? [cat, s] : min)
      : null;
    const strongestCategory = categoriesWithData.length > 0
      ? categoriesWithData.reduce((max, [cat, s]) => s.accuracy > max[1].accuracy ? [cat, s] : max)
      : null;
    
    // Duration
    const duration = gameStats.endTime && gameStats.startTime 
      ? gameStats.endTime - gameStats.startTime 
      : 0;
    
    // Calculate rank
    const rankedPlayers = [...players].sort((a, b) => {
      const netA = a.money + a.properties.reduce((sum) => sum + 100, 0);
      const netB = b.money + b.properties.reduce((sum) => sum + 100, 0);
      return netB - netA;
    });
    const humanPlayers = rankedPlayers.filter(p => !p.isAI);
    const playerRank = humanPlayers.length > 0 ? humanPlayers.findIndex(p => p.id === players[0]?.id) + 1 : 1;
    
    return {
      totalQuestions,
      correctQuestions,
      accuracy,
      categoryStats,
      weakestCategory: weakestCategory ? weakestCategory[0] : null,
      strongestCategory: strongestCategory ? strongestCategory[0] : null,
      duration,
      playerRank,
      totalPlayers: humanPlayers.length,
      propertiesBought: gameStats.propertiesBought?.length || 0,
      rentPaid: gameStats.rentPaid || 0,
      rentReceived: gameStats.rentReceived || 0,
    };
  }, [gameStats, players, enabledCategories]);
  
  // Calculate historical trends
  const historicalStats = useMemo(() => {
    if (historicalData.length === 0) {
      return {
        totalGames: 0,
        avgAccuracy: 0,
        improvement: 0,
        totalQuestions: 0,
        categoryTrends: {},
      };
    }
    
    // Filter by date range
    const now = timestamp;
    let filteredData = historicalData;
    
    if (dateRange === 'week') {
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      filteredData = historicalData.filter(g => g.timestamp > weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
      filteredData = historicalData.filter(g => g.timestamp > monthAgo);
    }
    
    // Calculate aggregate stats
    const totalGames = filteredData.length;
    const allQuestions = filteredData.flatMap(g => g.questionsAnswered || []);
    const totalQuestions = allQuestions.length;
    const totalCorrect = allQuestions.filter(q => q.correct).length;
    const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    
    // Calculate improvement (compare first 3 games vs last 3 games)
    let improvement = 0;
    if (filteredData.length >= 6) {
      const first3 = filteredData.slice(0, 3);
      const last3 = filteredData.slice(-3);
      
      const firstAccuracy = first3.reduce((sum, g) => {
        const qs = g.questionsAnswered || [];
        const correct = qs.filter(q => q.correct).length;
        return sum + (qs.length > 0 ? correct / qs.length : 0);
      }, 0) / 3;
      
      const lastAccuracy = last3.reduce((sum, g) => {
        const qs = g.questionsAnswered || [];
        const correct = qs.filter(q => q.correct).length;
        return sum + (qs.length > 0 ? correct / qs.length : 0);
      }, 0) / 3;
      
      improvement = Math.round((lastAccuracy - firstAccuracy) * 100);
    }
    
    // Category trends
    const categoryTrends = {};
    enabledCategories.forEach(cat => {
      const catQuestions = allQuestions.filter(q => q.category === cat);
      const correct = catQuestions.filter(q => q.correct).length;
      categoryTrends[cat] = {
        total: catQuestions.length,
        accuracy: catQuestions.length > 0 ? Math.round((correct / catQuestions.length) * 100) : 0,
      };
    });
    
    return {
      totalGames,
      avgAccuracy,
      improvement,
      totalQuestions,
      categoryTrends,
    };
  }, [historicalData, dateRange, enabledCategories]);
  
  // Get weak spots
  const weakSpots = useMemo(() => {
    const spots = [];
    
    Object.entries(currentStats.categoryStats).forEach(([cat, stats]) => {
      if (stats.total >= 3 && stats.accuracy < 60) {
        spots.push({
          category: cat,
          accuracy: stats.accuracy,
          total: stats.total,
          suggestion: generateWeakSpotSuggestion(cat, stats),
        });
      }
    });
    
    return spots.sort((a, b) => a.accuracy - b.accuracy);
  }, [currentStats]);
  
  // Calculate trend for a category
  function calculateTrend(questions) {
    if (questions.length < 3) return 'stable';
    
    const recent = questions.slice(-3);
    const older = questions.slice(0, -3);
    
    if (older.length === 0) return 'stable';
    
    const recentAccuracy = recent.filter(q => q.correct).length / recent.length;
    const olderAccuracy = older.filter(q => q.correct).length / older.length;
    
    if (recentAccuracy > olderAccuracy + 0.2) return 'improving';
    if (recentAccuracy < olderAccuracy - 0.2) return 'declining';
    return 'stable';
  }
  
  // Generate weak spot suggestion
  function generateWeakSpotSuggestion(category) {
    const suggestions = {
      math: '多做基础计算练习，熟练掌握加减乘除',
      shape: '多观察生活中的几何图形，建立空间感',
      time: '多看时钟练习，熟练认读整点和半点',
      geography: '多看地图和中国地理，认识各省位置',
      science: '多观察自然现象，理解基本科学原理',
      reading: '多朗读课文，练习理解文章内容',
      life: '多参与日常生活，培养生活技能',
      emotion: '多表达自己的感受，学会情绪管理',
      animal: '多观察动物特征，了解动物习性',
    };
    
    return suggestions[category] || '多做相关练习题';
  }
  
  // Generate improvement suggestions
  const suggestions = useMemo(() => {
    const tips = [];
    
    if (currentStats.weakestCategory) {
      const cat = currentStats.weakestCategory;
      tips.push({
        type: 'weakness',
        icon: '📚',
        title: `加强${CATEGORY_LABELS[cat]}练习`,
        description: generateWeakSpotSuggestion(cat, currentStats.categoryStats[cat]),
        priority: 'high',
      });
    }
    
    if (currentStats.propertiesBought === 0 && players[currentPlayerIndex]?.money > 500) {
      tips.push({
        type: 'game',
        icon: '🏠',
        title: '尝试购买房产',
        description: '攒钱买地是积累财富的好方法，买下地块后可以收取租金！',
        priority: 'medium',
      });
    }
    
    if (currentStats.duration > 30 * 60 * 1000 && currentStats.totalQuestions > 0) {
      tips.push({
        type: 'time',
        icon: '⏰',
        title: '控制游戏时间',
        description: '可以尝试更短的游戏时间，提高答题效率',
        priority: 'low',
      });
    }
    
    if (historicalStats.improvement > 10) {
      tips.push({
        type: 'progress',
        icon: '🌟',
        title: '进步明显！',
        description: `你的正确率提升了${historicalStats.improvement}%，继续保持！`,
        priority: 'high',
      });
    }
    
    return tips;
  }, [currentStats, players, currentPlayerIndex, historicalStats]);
  
  // Export report
  const handleExport = useCallback(() => {
    const exportData = {
      studentId: studentId || 'anonymous',
      exportTime: new Date().toISOString(),
      gradeLevel: ageTier,
      currentSession: {
        ...currentStats,
        gameStats,
      },
      historicalStats,
      weakSpots,
      suggestions,
      recentGames: historicalData.slice(-10).map(g => ({
        date: new Date(g.timestamp).toLocaleDateString(),
        accuracy: g.questionsAnswered?.length > 0 
          ? Math.round(g.questionsAnswered.filter(q => q.correct).length / g.questionsAnswered.length * 100)
          : 0,
        questions: g.questionsAnswered?.length || 0,
      })),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monopoly3d-learning-report-${studentId || 'student'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [studentId, ageTier, currentStats, gameStats, historicalStats, weakSpots, suggestions, historicalData]);
  
  // If not open, show floating button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-48 right-4 z-40 w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        title="学习报告"
      >
        <span className="text-2xl">📊</span>
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-48 right-4 z-40 w-80 sm:w-96 max-h-[80vh] bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-blue-500/30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <div>
            <div className="text-white font-bold">学习报告</div>
            <div className="text-blue-200 text-xs">
              {studentId || '匿名'} · {GRADE_LABELS[ageTier] || ageTier}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/80 hover:text-white text-xl"
        >
          ✕
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-slate-700 bg-black/20">
        {[
          { key: 'overview', label: '总览', icon: '📈' },
          { key: 'weakspots', label: '薄弱项', icon: '🎯' },
          { key: 'history', label: '历史', icon: '📜' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 text-xs font-bold flex items-center justify-center gap-1 transition-all ${
              activeTab === tab.key
                ? 'text-white bg-blue-600/30 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-4 space-y-4">
            {/* Main stats card */}
            <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-xl p-4 border border-blue-500/30">
              <div className="text-xs text-blue-300 mb-3">本局表现</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ color: getAccuracyColor(currentStats.accuracy) }}>
                    {currentStats.accuracy}%
                  </div>
                  <div className="text-xs text-gray-400">正确率</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">
                    {currentStats.totalQuestions}
                  </div>
                  <div className="text-xs text-gray-400">答题数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {currentStats.correctQuestions}
                  </div>
                  <div className="text-xs text-gray-400">答对</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    #{currentStats.playerRank}
                  </div>
                  <div className="text-xs text-gray-400">排名</div>
                </div>
              </div>
            </div>
            
            {/* Category performance */}
            <div>
              <div className="text-sm text-gray-400 mb-2">📈 分类正确率</div>
              <div className="space-y-2">
                {enabledCategories.map(cat => {
                  const catStats = currentStats.categoryStats[cat] || { total: 0, accuracy: 0 };
                  const color = CATEGORY_COLORS[cat] || '#888';
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="text-xs w-16 text-right" style={{ color }}>{CATEGORY_LABELS[cat]}</span>
                      <div className="flex-1 h-3 bg-black/30 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${catStats.total > 0 ? catStats.accuracy : 0}%`,
                            backgroundColor: catStats.total > 0 ? getAccuracyColor(catStats.accuracy) : '#444',
                          }}
                        />
                      </div>
                      <span className="text-xs w-10 text-right text-gray-400">
                        {catStats.total > 0 ? `${catStats.accuracy}%` : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Weak/Strong */}
            {(currentStats.weakestCategory || currentStats.strongestCategory) && (
              <div className="grid grid-cols-2 gap-2">
                {currentStats.weakestCategory && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2">
                    <div className="text-xs text-red-400">⚠️ 需加强</div>
                    <div className="text-sm font-bold text-white">
                      {CATEGORY_LABELS[currentStats.weakestCategory]}
                    </div>
                    <div className="text-xs text-gray-400">
                      {currentStats.categoryStats[currentStats.weakestCategory]?.accuracy || 0}%
                    </div>
                  </div>
                )}
                {currentStats.strongestCategory && (
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-2">
                    <div className="text-xs text-green-400">💪 最强项</div>
                    <div className="text-sm font-bold text-white">
                      {CATEGORY_LABELS[currentStats.strongestCategory]}
                    </div>
                    <div className="text-xs text-gray-400">
                      {currentStats.categoryStats[currentStats.strongestCategory]?.accuracy || 0}%
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div>
                <div className="text-sm text-gray-400 mb-2">💡 改进建议</div>
                <div className="space-y-2">
                  {suggestions.map((tip, idx) => (
                    <div 
                      key={idx}
                      className={`p-2 rounded-lg text-xs ${
                        tip.priority === 'high' ? 'bg-yellow-900/20 border border-yellow-500/30' :
                        tip.priority === 'medium' ? 'bg-blue-900/20 border border-blue-500/30' :
                        'bg-slate-800 border border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{tip.icon}</span>
                        <span className="font-bold text-white">{tip.title}</span>
                      </div>
                      <div className="text-gray-400">{tip.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Weakspots Tab */}
        {activeTab === 'weakspots' && (
          <div className="p-4 space-y-4">
            {weakSpots.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🌟</div>
                <div className="text-white font-bold">太棒了！</div>
                <div className="text-gray-400 text-sm mt-1">暂无薄弱项，各科表现均衡</div>
              </div>
            ) : (
              <>
                <div className="text-sm text-gray-400 mb-2">
                  共 {weakSpots.length} 个薄弱项需要加强
                </div>
                {weakSpots.map((spot, idx) => (
                  <div 
                    key={spot.category}
                    className="bg-red-900/20 border border-red-500/30 rounded-xl p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-lg px-2 py-1 rounded-lg"
                          style={{ backgroundColor: (CATEGORY_COLORS[spot.category] || '#888') + '40' }}
                        >
                          {CATEGORY_LABELS[spot.category]}
                        </span>
                        <span className="text-red-400 font-bold">
                          {spot.accuracy}%
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {spot.total}题
                      </span>
                    </div>
                    <div className="text-sm text-gray-300">{spot.suggestion}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
        
        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="p-4 space-y-4">
            {/* Date range filter */}
            <div className="flex gap-2">
              {[
                { key: 'week', label: '本周' },
                { key: 'month', label: '本月' },
                { key: 'all', label: '全部' },
              ].map(range => (
                <button
                  key={range.key}
                  onClick={() => setDateRange(range.key)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dateRange === range.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            
            {/* Historical stats */}
            <div className="bg-black/30 rounded-xl p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-400">{historicalStats.totalGames}</div>
                  <div className="text-xs text-gray-400">游戏场次</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: getAccuracyColor(historicalStats.avgAccuracy) }}>
                    {historicalStats.avgAccuracy}%
                  </div>
                  <div className="text-xs text-gray-400">历史平均</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${historicalStats.improvement >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {historicalStats.improvement >= 0 ? '+' : ''}{historicalStats.improvement}%
                  </div>
                  <div className="text-xs text-gray-400">进步幅度</div>
                </div>
              </div>
            </div>
            
            {/* Recent games list */}
            <div>
              <div className="text-sm text-gray-400 mb-2">📜 近期战绩</div>
              {historicalData.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  暂无历史记录
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {historicalData.slice(-10).reverse().map((game, idx) => {
                    const accuracy = game.questionsAnswered?.length > 0
                      ? Math.round(game.questionsAnswered.filter(q => q.correct).length / game.questionsAnswered.length * 100)
                      : 0;
                    return (
                      <div 
                        key={idx}
                        className="bg-slate-800 rounded-lg p-2 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs text-gray-400">
                            {formatDate(game.timestamp)}
                          </div>
                          <div className="text-sm text-white">
                            {game.questionsAnswered?.length || 0}题
                          </div>
                        </div>
                        <div 
                          className="text-lg font-bold"
                          style={{ color: getAccuracyColor(accuracy) }}
                        >
                          {accuracy}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-slate-700 flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-bold transition-colors"
        >
          📥 导出报告
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-bold transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
