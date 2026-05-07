import { useState, useEffect } from 'react';
import { useAchievementStore } from './achievementStore';
import { ACHIEVEMENTS } from './achievementData';
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_DIFFICULTY, ACHIEVEMENT_STATUS } from './achievementTypes';
import { useGameStore } from '../../game/store';

const CATEGORY_NAMES = {
  [ACHIEVEMENT_CATEGORIES.GAMEPLAY]: '🎮 游戏',
  [ACHIEVEMENT_CATEGORIES.LEARNING]: '📚 学习',
  [ACHIEVEMENT_CATEGORIES.SOCIAL]: '🤝 社交',
  [ACHIEVEMENT_CATEGORIES.SPECIAL]: '⭐ 特殊',
  [ACHIEVEMENT_CATEGORIES.SEASONAL]: '🎉 限时',
};

const CATEGORY_COLORS = {
  [ACHIEVEMENT_CATEGORIES.GAMEPLAY]: 'border-blue-500 bg-blue-500/10',
  [ACHIEVEMENT_CATEGORIES.LEARNING]: 'border-purple-500 bg-purple-500/10',
  [ACHIEVEMENT_CATEGORIES.SOCIAL]: 'border-green-500 bg-green-500/10',
  [ACHIEVEMENT_CATEGORIES.SPECIAL]: 'border-yellow-500 bg-yellow-500/10',
  [ACHIEVEMENT_CATEGORIES.SEASONAL]: 'border-red-500 bg-red-500/10',
};

const DIFFICULTY_STARS = {
  [ACHIEVEMENT_DIFFICULTY.EASY]: 1,
  [ACHIEVEMENT_DIFFICULTY.MEDIUM]: 2,
  [ACHIEVEMENT_DIFFICULTY.HARD]: 3,
  [ACHIEVEMENT_DIFFICULTY.LEGENDARY]: 4,
};

export default function TaskProgress() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const unlockedAchievements = useAchievementStore(s => s.unlockedAchievements);
  const totalPoints = useAchievementStore(s => s.getTotalEarnedPoints());
  const completionPercentage = useAchievementStore(s => s.getCompletionPercentage());
  const pendingPopups = useAchievementStore(s => s.pendingPopups);
  const profileStats = useAchievementStore(s => s.profileStats);
  const gameStats = useGameStore(s => s.gameStats);
  const studentId = useGameStore(s => s.studentId);

  const categories = Object.values(ACHIEVEMENT_CATEGORIES);
  const totalAchievements = ACHIEVEMENTS.length;
  const unlockedCount = Object.keys(unlockedAchievements).length;

  // Group achievements by category
  const achievementsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = ACHIEVEMENTS.filter(a => a.category === cat);
    return acc;
  }, {});

  // Calculate stats for a category
  const getCategoryStats = (cat) => {
    const catAchievements = achievementsByCategory[cat] || [];
    const unlocked = catAchievements.filter(a => unlockedAchievements[a.id]).length;
    const total = catAchievements.length;
    const points = catAchievements.reduce((sum, a) => sum + a.points, 0);
    return { unlocked, total, points };
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg hover:scale-105 transition-all"
      >
        <span className="text-2xl">🏆</span>
        <div className="text-left">
          <div className="text-xs text-white/70">成就</div>
          <div className="font-bold text-white">{unlockedCount}/{totalAchievements}</div>
        </div>
        {pendingPopups.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold animate-bounce">
            {pendingPopups.length}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-purple-500/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">🏆 成就中心</h2>
                  <p className="text-white/70 text-sm">学生: {studentId || '未登录'}</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="bg-white/20 rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-white">{unlockedCount}</div>
                  <div className="text-xs text-white/70">已解锁</div>
                </div>
                <div className="bg-white/20 rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-yellow-300">{totalPoints}</div>
                  <div className="text-xs text-white/70">总积分</div>
                </div>
                <div className="bg-white/20 rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-green-300">{completionPercentage}%</div>
                  <div className="text-xs text-white/70">完成度</div>
                </div>
                <div className="bg-white/20 rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-blue-300">{gameStats?.questionsAnswered?.length || 0}</div>
                  <div className="text-xs text-white/70">答题数</div>
                </div>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 p-3 overflow-x-auto bg-gray-800/50">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === null
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                全部 ({unlockedCount}/{totalAchievements})
              </button>
              {categories.map(cat => {
                const stats = getCategoryStats(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {CATEGORY_NAMES[cat]} ({stats.unlocked}/{stats.total})
                  </button>
                );
              })}
            </div>

            {/* Achievement List */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(selectedCategory ? achievementsByCategory[selectedCategory] : ACHIEVEMENTS)
                  .map(achievement => {
                    const isUnlocked = !!unlockedAchievements[achievement.id];
                    const unlockData = unlockedAchievements[achievement.id];

                    return (
                      <div
                        key={achievement.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isUnlocked
                            ? `${CATEGORY_COLORS[achievement.category]} border-opacity-50`
                            : 'border-gray-700 bg-gray-800/50 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`text-3xl ${isUnlocked ? '' : 'grayscale'}`}>
                            {achievement.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white truncate">{achievement.name}</h4>
                              {achievement.secret && !isUnlocked && (
                                <span className="text-xs text-gray-500">???</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                              {achievement.secret && !isUnlocked
                                ? '未解锁成就'
                                : achievement.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-sm text-yellow-400">
                                +{achievement.points}分
                              </span>
                              {isUnlocked && unlockData?.weatherAtUnlock && (
                                <span className="text-xs text-gray-500">
                                  天气: {unlockData.weatherAtUnlock}
                                </span>
                              )}
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}
