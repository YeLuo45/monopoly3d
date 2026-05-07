import { useState, useEffect } from 'react';
import { useAchievementStore } from './achievementStore';
import { ACHIEVEMENTS, getTotalPossiblePoints } from './achievementData';
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_DIFFICULTY, TASK_CHAPTERS } from './achievementTypes';
import { useGameStore } from '../../game/store';

const CATEGORY_NAMES = {
  [ACHIEVEMENT_CATEGORIES.GAMEPLAY]: '🎮 游戏成就',
  [ACHIEVEMENT_CATEGORIES.LEARNING]: '📚 学习成就',
  [ACHIEVEMENT_CATEGORIES.SOCIAL]: '🤝 社交成就',
  [ACHIEVEMENT_CATEGORIES.SPECIAL]: '⭐ 特殊成就',
  [ACHIEVEMENT_CATEGORIES.SEASONAL]: '🎉 限时成就',
};

const DIFFICULTY_INFO = {
  [ACHIEVEMENT_DIFFICULTY.EASY]: { label: '简单', color: 'text-green-400', stars: 1 },
  [ACHIEVEMENT_DIFFICULTY.MEDIUM]: { label: '中等', color: 'text-blue-400', stars: 2 },
  [ACHIEVEMENT_DIFFICULTY.HARD]: { label: '困难', color: 'text-purple-400', stars: 3 },
  [ACHIEVEMENT_DIFFICULTY.LEGENDARY]: { label: '传说', color: 'text-yellow-400', stars: 4 },
};

export default function AchievementPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('achievements'); // achievements | tasks | stats
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('default'); // default | points | difficulty

  const unlockedAchievements = useAchievementStore(s => s.unlockedAchievements);
  const totalPoints = useAchievementStore(s => s.getTotalEarnedPoints());
  const completionPercentage = useAchievementStore(s => s.getCompletionPercentage());
  const profileStats = useAchievementStore(s => s.profileStats);
  const getUnlockedAchievements = useAchievementStore(s => s.getUnlockedAchievements);
  const studentId = useGameStore(s => s.studentId);

  const totalPossiblePoints = getTotalPossiblePoints();
  const unlockedCount = Object.keys(unlockedAchievements).length;

  // Filter and sort achievements
  const getFilteredAchievements = () => {
    let filtered = [...ACHIEVEMENTS];

    if (filterCategory !== 'all') {
      filtered = filtered.filter(a => a.category === filterCategory);
    }

    // Sort
    if (sortBy === 'points') {
      filtered.sort((a, b) => b.points - a.points);
    } else if (sortBy === 'difficulty') {
      const order = [ACHIEVEMENT_DIFFICULTY.LEGENDARY, ACHIEVEMENT_DIFFICULTY.HARD, ACHIEVEMENT_DIFFICULTY.MEDIUM, ACHIEVEMENT_DIFFICULTY.EASY];
      filtered.sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty));
    }

    return filtered;
  };

  const achievements = getFilteredAchievements();

  // Calculate chapter progress
  const getChapterProgress = (chapter) => {
    const tasks = chapter.tasks || [];
    const unlocked = tasks.filter(t => unlockedAchievements[t]).length;
    return { unlocked, total: tasks.length };
  };

  return (
    <>
      {/* Menu Button in Main Menu */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium hover:scale-105 transition-all shadow-lg"
      >
        <span className="text-xl">🏆</span>
        <div className="text-left">
          <div className="text-xs text-white/70">成就中心</div>
          <div className="font-bold text-sm">{unlockedCount}/{ACHIEVEMENTS.length}</div>
        </div>
      </button>

      {/* Panel Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-purple-500/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white">🏆 成就中心</h2>
                  <p className="text-white/70 text-sm mt-1">学生: {studentId || '访客'}</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white text-3xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-white/80 mb-1">
                  <span>完成进度</span>
                  <span>{completionPercentage}% ({unlockedCount}/{ACHIEVEMENTS.length})</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-300 transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/60 mt-1">
                  <span>当前积分: {totalPoints}</span>
                  <span>最高可获: {totalPossiblePoints}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setSelectedTab('achievements')}
                className={`flex-1 py-3 text-center font-medium transition-all ${
                  selectedTab === 'achievements'
                    ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🏆 成就
              </button>
              <button
                onClick={() => setSelectedTab('tasks')}
                className={`flex-1 py-3 text-center font-medium transition-all ${
                  selectedTab === 'tasks'
                    ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📋 任务
              </button>
              <button
                onClick={() => setSelectedTab('stats')}
                className={`flex-1 py-3 text-center font-medium transition-all ${
                  selectedTab === 'stats'
                    ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📊 统计
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
              {/* Achievements Tab */}
              {selectedTab === 'achievements' && (
                <>
                  {/* Filters */}
                  <div className="flex gap-4 mb-4 flex-wrap">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
                    >
                      <option value="all">全部分类</option>
                      {Object.entries(CATEGORY_NAMES).map(([key, name]) => (
                        <option key={key} value={key}>{name}</option>
                      ))}
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
                    >
                      <option value="default">默认排序</option>
                      <option value="points">按积分</option>
                      <option value="difficulty">按难度</option>
                    </select>
                  </div>

                  {/* Achievement Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {achievements.map(achievement => {
                      const isUnlocked = !!unlockedAchievements[achievement.id];
                      const difficulty = DIFFICULTY_INFO[achievement.difficulty];

                      return (
                        <div
                          key={achievement.id}
                          className={`p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                            isUnlocked
                              ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/50'
                              : 'bg-gray-800/50 border-gray-700'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`text-4xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                              {achievement.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-bold ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
                                  {achievement.secret && !isUnlocked ? '???' : achievement.name}
                                </h4>
                              </div>
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                {achievement.secret && !isUnlocked
                                  ? '未解锁'
                                  : achievement.description}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className={`text-xs ${difficulty.color}`}>
                                  {'★'.repeat(difficulty.stars)}{'☆'.repeat(4 - difficulty.stars)}
                                </span>
                                <span className={`text-sm font-bold ${isUnlocked ? 'text-yellow-400' : 'text-gray-500'}`}>
                                  +{achievement.points}
                                </span>
                              </div>
                            </div>
                            {isUnlocked && (
                              <div className="text-green-400 text-xl">✓</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Tasks Tab */}
              {selectedTab === 'tasks' && (
                <div className="space-y-6">
                  {Object.values(TASK_CHAPTERS).map(chapter => {
                    const progress = getChapterProgress(chapter);
                    const percentage = Math.round((progress.unlocked / progress.total) * 100);

                    return (
                      <div key={chapter.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-white text-lg">{chapter.name}</h3>
                            <p className="text-sm text-gray-400">{chapter.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-purple-400">
                              {progress.unlocked}/{progress.total}
                            </div>
                            <div className="text-xs text-gray-500">任务完成</div>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Stats Tab */}
              {selectedTab === 'stats' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                    <div className="text-4xl mb-2">🎮</div>
                    <div className="text-3xl font-bold text-white">{profileStats.gamesPlayed || 0}</div>
                    <div className="text-sm text-gray-400">游戏次数</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                    <div className="text-4xl mb-2">🏆</div>
                    <div className="text-3xl font-bold text-yellow-400">{profileStats.wins || 0}</div>
                    <div className="text-sm text-gray-400">胜利次数</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                    <div className="text-4xl mb-2">📝</div>
                    <div className="text-3xl font-bold text-purple-400">{profileStats.totalQuestionsAnswered || 0}</div>
                    <div className="text-sm text-gray-400">答题总数</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                    <div className="text-4xl mb-2">✅</div>
                    <div className="text-3xl font-bold text-green-400">
                      {profileStats.totalQuestionsAnswered > 0
                        ? Math.round((profileStats.totalCorrectAnswers / profileStats.totalQuestionsAnswered) * 100)
                        : 0}%
                    </div>
                    <div className="text-sm text-gray-400">正确率</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                    <div className="text-4xl mb-2">🏠</div>
                    <div className="text-3xl font-bold text-blue-400">{profileStats.propertiesBought || 0}</div>
                    <div className="text-sm text-gray-400">购买地产</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                    <div className="text-4xl mb-2">🏗️</div>
                    <div className="text-3xl font-bold text-orange-400">{profileStats.housesBuilt || 0}</div>
                    <div className="text-sm text-gray-400">建造房屋</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                    <div className="text-4xl mb-2">💰</div>
                    <div className="text-3xl font-bold text-emerald-400">{profileStats.maxMoneyEarned || 0}</div>
                    <div className="text-sm text-gray-400">最高金币</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                    <div className="text-4xl mb-2">⭐</div>
                    <div className="text-3xl font-bold text-pink-400">{totalPoints}</div>
                    <div className="text-sm text-gray-400">成就积分</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
