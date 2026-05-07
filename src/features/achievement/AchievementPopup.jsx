import { useState, useEffect } from 'react';
import { useAchievementStore } from './achievementStore';
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_DIFFICULTY } from './achievementTypes';

const CATEGORY_COLORS = {
  [ACHIEVEMENT_CATEGORIES.GAMEPLAY]: 'from-blue-500 to-cyan-500',
  [ACHIEVEMENT_CATEGORIES.LEARNING]: 'from-purple-500 to-pink-500',
  [ACHIEVEMENT_CATEGORIES.SOCIAL]: 'from-green-500 to-emerald-500',
  [ACHIEVEMENT_CATEGORIES.SPECIAL]: 'from-yellow-500 to-orange-500',
  [ACHIEVEMENT_CATEGORIES.SEASONAL]: 'from-red-500 to-pink-500',
};

const DIFFICULTY_STARS = {
  [ACHIEVEMENT_DIFFICULTY.EASY]: 1,
  [ACHIEVEMENT_DIFFICULTY.MEDIUM]: 2,
  [ACHIEVEMENT_DIFFICULTY.HARD]: 3,
  [ACHIEVEMENT_DIFFICULTY.LEGENDARY]: 4,
};

export default function AchievementPopup() {
  const [visible, setVisible] = useState(false);
  const [achievement, setAchievement] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const dismissPopup = useAchievementStore(s => s.dismissPopup);
  const pendingPopups = useAchievementStore(s => s.pendingPopups);
  const unlockedAchievements = useAchievementStore(s => s.unlockedAchievements);

  useEffect(() => {
    if (pendingPopups.length > 0 && !visible) {
      setAchievement(pendingPopups[0]);
      setVisible(true);
      setIsAnimating(true);

      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [pendingPopups, visible]);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setVisible(false);
      dismissPopup();
    }, 300);
  };

  if (!visible || !achievement) return null;

  const categoryColor = CATEGORY_COLORS[achievement.category] || CATEGORY_COLORS[ACHIEVEMENT_CATEGORIES.SPECIAL];
  const totalAchievements = 50; // Approximate count
  const currentUnlocked = Object.keys(unlockedAchievements || {}).length;

  return (
    <div
      className={`fixed top-8 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ${
        isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
      }`}
    >
      <div
        className={`relative bg-gradient-to-r ${categoryColor} p-1 rounded-2xl shadow-2xl max-w-sm w-full`}
      >
        <div className="bg-gray-900/95 rounded-xl p-4 backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{achievement.icon}</span>
              <div>
                <div className="text-xs text-white/60">成就解锁</div>
                <div className="font-bold text-white text-sm">
                  {DIFFICULTY_STARS[achievement.difficulty]}星成就
                </div>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/60 hover:text-white text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Achievement Name */}
          <h3 className="text-xl font-bold text-white mb-1">{achievement.name}</h3>
          <p className="text-sm text-white/80 mb-3">{achievement.description}</p>

          {/* Points */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-lg">+</span>
              <span className="text-yellow-400 text-2xl font-bold">{achievement.pointsEarned || achievement.points}</span>
              <span className="text-yellow-400 text-sm">积分</span>
            </div>
            <div className="text-xs text-white/60">
              {currentUnlocked} / {totalAchievements} 已解锁
            </div>
          </div>

          {/* Stars */}
          <div className="flex justify-center gap-1 mt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className={`text-lg ${
                  i < DIFFICULTY_STARS[achievement.difficulty]
                    ? 'text-yellow-400'
                    : 'text-white/30'
                }`}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        {/* Animated glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 rounded-2xl opacity-30 blur-sm animate-pulse -z-10" />
      </div>
    </div>
  );
}
