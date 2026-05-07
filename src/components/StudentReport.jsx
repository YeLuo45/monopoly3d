import { useState, useMemo } from 'react';
import { useGameStore } from '../game/store';
import { BOARD_CONFIG } from '../game/boardConfig';

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

function formatDuration(ms) {
  if (!ms) return '0分钟';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes === 0) return `${seconds}秒`;
  return `${minutes}分${seconds}秒`;
}

function getAccuracyColor(accuracy) {
  if (accuracy >= 80) return '#4ADE80'; // green
  if (accuracy >= 60) return '#FACC15'; // yellow
  if (accuracy >= 40) return '#FB923C'; // orange
  return '#F87171'; // red
}

function generateSuggestions(weakestCategory, categoryStats, enabledCategories) {
  const suggestions = [];
  
  if (weakestCategory) {
    const catLabel = CATEGORY_LABELS[weakestCategory] || weakestCategory;
    suggestions.push(`📚 建议加强 ${catLabel} 的练习，可以帮助提高整体正确率`);
  }
  
  // Find categories with no attempts
  const noAttemptCats = enabledCategories.filter(
    cat => !categoryStats[cat] || categoryStats[cat].total === 0
  );
  if (noAttemptCats.length > 0) {
    const catLabels = noAttemptCats.map(c => CATEGORY_LABELS[c] || c).slice(0, 2).join('、');
    suggestions.push(`💡 建议尝试更多 ${catLabels} 类题目，增加答题经验`);
  }
  
  // Add general suggestions
  if (suggestions.length === 0) {
    suggestions.push('🌟 继续保持！你的答题表现很棒！');
    suggestions.push('🎮 可以尝试更难的关卡来挑战自己');
  }
  
  return suggestions;
}

export default function StudentReport({ onClose }) {
  const gameStats = useGameStore(s => s.gameStats);
  const studentId = useGameStore(s => s.studentId);
  const players = useGameStore(s => s.players);
  const ageTier = useGameStore(s => s.ageTier);
  const enabledCategories = useGameStore(s => s.enabledCategories);
  
  const [showFullReport, setShowFullReport] = useState(false);
  
  // Calculate derived stats
  const stats = useMemo(() => {
    const questionsAnswered = gameStats.questionsAnswered || [];
    const totalQuestions = questionsAnswered.length;
    const correctQuestions = questionsAnswered.filter(q => q.correct).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;
    
    // Calculate accuracy by category
    const categoryStats = {};
    enabledCategories.forEach(cat => {
      const catQuestions = questionsAnswered.filter(q => q.category === cat);
      const catCorrect = catQuestions.filter(q => q.correct).length;
      categoryStats[cat] = {
        total: catQuestions.length,
        correct: catCorrect,
        accuracy: catQuestions.length > 0 ? Math.round((catCorrect / catQuestions.length) * 100) : 0,
      };
    });
    
    // Find weakest and strongest categories
    const categoriesWithData = Object.entries(categoryStats).filter(([_, stats]) => stats.total > 0);
    const weakestCategory = categoriesWithData.length > 0
      ? categoriesWithData.reduce((min, [cat, s]) => s.accuracy < min[1].accuracy ? [cat, s] : min)
      : null;
    const strongestCategory = categoriesWithData.length > 0
      ? categoriesWithData.reduce((max, [cat, s]) => s.accuracy > max[1].accuracy ? [cat, s] : max)
      : null;
    
    // Calculate duration
    const duration = gameStats.endTime && gameStats.startTime 
      ? gameStats.endTime - gameStats.startTime 
      : 0;
    
    // Most visited tiles
    const mostVisited = Object.entries(gameStats.mostVisitedTiles || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tileId, count]) => {
        const tile = BOARD_CONFIG.find(t => t.id === parseInt(tileId));
        return { tileId, tileName: tile?.name || `格子${tileId}`, count };
      });
    
    // Calculate rank
    const rankedPlayers = [...players].sort((a, b) => {
      const netA = a.money + a.properties.reduce((sum, pid) => sum + 100, 0);
      const netB = b.money + b.properties.reduce((sum, pid) => sum + 100, 0);
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
      mostVisited,
      playerRank,
      totalPlayers: humanPlayers.length,
      propertiesBought: gameStats.propertiesBought || [],
      rentPaid: gameStats.rentPaid || 0,
      rentReceived: gameStats.rentReceived || 0,
    };
  }, [gameStats, players, enabledCategories]);
  
  const suggestions = useMemo(() => {
    return generateSuggestions(stats.weakestCategory, stats.categoryStats, enabledCategories);
  }, [stats, enabledCategories]);
  
  const handleExportJSON = () => {
    const exportData = {
      studentId: studentId || 'anonymous',
      exportTime: new Date().toISOString(),
      gameStats,
      calculatedStats: stats,
      suggestions,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monopoly3d-report-${studentId || 'student'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const ageTierLabels = {
    kindergarten: '幼儿园',
    primary1_2: '小学1-2年级',
    primary3_4: '小学3-4年级',
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">📊 游戏报告</h2>
            <p className="text-purple-300 text-sm">
              {studentId ? `学生: ${studentId}` : '匿名玩家'} · {ageTierLabels[ageTier] || ageTier}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>
        
        {/* Summary Card */}
        <div className="bg-black/30 rounded-2xl p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{stats.accuracy}%</div>
              <div className="text-xs text-gray-400">正确率</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{stats.totalQuestions}</div>
              <div className="text-xs text-gray-400">答题数</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">{formatDuration(stats.duration)}</div>
              <div className="text-xs text-gray-400">游戏时长</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">#{stats.playerRank}</div>
              <div className="text-xs text-gray-400">排名</div>
            </div>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-green-400">{stats.correctQuestions}</div>
            <div className="text-xs text-gray-400">答对</div>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-red-400">{stats.totalQuestions - stats.correctQuestions}</div>
            <div className="text-xs text-gray-400">答错</div>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-cyan-400">{stats.propertiesBought.length}</div>
            <div className="text-xs text-gray-400">购买房产</div>
          </div>
        </div>
        
        {/* Category Performance */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-purple-300 mb-2">📈 分类正确率</h3>
          <div className="space-y-2">
            {enabledCategories.map(cat => {
              const catStats = stats.categoryStats[cat] || { total: 0, accuracy: 0 };
              const color = CATEGORY_COLORS[cat] || '#888';
              return (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-xs w-20 text-right" style={{ color }}>{CATEGORY_LABELS[cat]}</span>
                  <div className="flex-1 h-4 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${catStats.total > 0 ? catStats.accuracy : 0}%`,
                        backgroundColor: catStats.total > 0 ? getAccuracyColor(catStats.accuracy) : '#444',
                      }}
                    />
                  </div>
                  <span className="text-xs w-12 text-right">
                    {catStats.total > 0 ? `${catStats.accuracy}%` : '-'}
                  </span>
                  <span className="text-xs w-10 text-right text-gray-500">
                    {catStats.total > 0 ? `${catStats.correct}/${catStats.total}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Weak/Strong Categories */}
        {(stats.weakestCategory || stats.strongestCategory) && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {stats.weakestCategory && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3">
                <div className="text-xs text-red-400 mb-1">⚠️ 需要加强</div>
                <div className="font-bold text-white">
                  {CATEGORY_LABELS[stats.weakestCategory] || stats.weakestCategory}
                </div>
                <div className="text-xs text-gray-400">
                  正确率: {stats.categoryStats[stats.weakestCategory]?.accuracy || 0}%
                </div>
              </div>
            )}
            {stats.strongestCategory && (
              <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-3">
                <div className="text-xs text-green-400 mb-1">💪 最强项</div>
                <div className="font-bold text-white">
                  {CATEGORY_LABELS[stats.strongestCategory] || stats.strongestCategory}
                </div>
                <div className="text-xs text-gray-400">
                  正确率: {stats.categoryStats[stats.strongestCategory]?.accuracy || 0}%
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Most Visited Tiles */}
        {stats.mostVisited.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-purple-300 mb-2">🗺️ 最常经过的地段</h3>
            <div className="space-y-1">
              {stats.mostVisited.map((tile, idx) => (
                <div key={tile.tileId} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 w-4">{idx + 1}.</span>
                  <span className="text-white">{tile.tileName}</span>
                  <span className="text-gray-400 ml-auto">{tile.count}次</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Property Summary */}
        {stats.propertiesBought.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-purple-300 mb-2">🏠 房产交易</h3>
            <div className="text-sm text-gray-300">
              购买: {stats.propertiesBought.length}处 · 
              支出租金: ${stats.rentPaid} · 
              收入租金: ${stats.rentReceived}
            </div>
          </div>
        )}
        
        {/* Suggestions */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-purple-300 mb-2">💡 改进建议</h3>
          <div className="space-y-1">
            {suggestions.map((suggestion, idx) => (
              <div key={idx} className="text-sm text-gray-300">{suggestion}</div>
            ))}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleExportJSON}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold"
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

// Summary Card component for GameOverScreen
export function StudentReportSummary({ onViewFullReport }) {
  const gameStats = useGameStore(s => s.gameStats);
  const studentId = useGameStore(s => s.studentId);
  
  const stats = useMemo(() => {
    const questionsAnswered = gameStats.questionsAnswered || [];
    const totalQuestions = questionsAnswered.length;
    const correctQuestions = questionsAnswered.filter(q => q.correct).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;
    const duration = gameStats.endTime && gameStats.startTime 
      ? gameStats.endTime - gameStats.startTime 
      : 0;
    
    return { totalQuestions, correctQuestions, accuracy, duration };
  }, [gameStats]);
  
  return (
    <div className="bg-gradient-to-r from-indigo-800/50 to-purple-800/50 rounded-2xl p-4 border border-purple-500/30 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-purple-300 text-sm font-bold">📊 本局表现</div>
        <button
          onClick={onViewFullReport}
          className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded-lg text-white"
        >
          查看完整报告
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-green-400">{stats.accuracy}%</div>
          <div className="text-xs text-gray-400">正确率</div>
        </div>
        <div>
          <div className="text-lg font-bold text-blue-400">{stats.totalQuestions}</div>
          <div className="text-xs text-gray-400">答题</div>
        </div>
        <div>
          <div className="text-lg font-bold text-purple-400">{formatDuration(stats.duration)}</div>
          <div className="text-xs text-gray-400">时长</div>
        </div>
        <div>
          <div className="text-lg font-bold text-yellow-400">{stats.correctQuestions}</div>
          <div className="text-xs text-gray-400">答对</div>
        </div>
      </div>
      {studentId && (
        <div className="text-xs text-gray-400 mt-2 text-center">
          玩家: {studentId}
        </div>
      )}
    </div>
  );
}
