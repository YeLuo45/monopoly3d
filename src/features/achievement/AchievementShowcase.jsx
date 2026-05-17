/**
 * AchievementShowcase - 3D rotating achievement display
 * 
 * Features:
 * - 3D card carousel rotation
 * - Auto-rotation with manual controls
 * - Achievement details on hover/focus
 * - Rarity glow effects
 * - Progress indicators
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAchievementShowcaseStore } from './achievementShowcaseStore';
import { ACHIEVEMENTS } from './achievementData';
import { ACHIEVEMENT_RARITY, RARITY_LABELS, RARITY_COLORS } from './achievementTypes';
import { t } from '../../i18n';

const RARITY_GLOW = {
  [ACHIEVEMENT_RARITY.COMMON]: 'shadow-gray-500/30',
  [ACHIEVEMENT_RARITY.UNCOMMON]: 'shadow-green-500/30',
  [ACHIEVEMENT_RARITY.RARE]: 'shadow-blue-500/30',
  [ACHIEVEMENT_RARITY.EPIC]: 'shadow-purple-500/50',
  [ACHIEVEMENT_RARITY.LEGENDARY]: 'shadow-yellow-500/70 animate-pulse',
};

const RARITY_BORDER = {
  [ACHIEVEMENT_RARITY.COMMON]: 'border-gray-500',
  [ACHIEVEMENT_RARITY.UNCOMMON]: 'border-green-500',
  [ACHIEVEMENT_RARITY.RARE]: 'border-blue-500',
  [ACHIEVEMENT_RARITY.EPIC]: 'border-purple-500',
  [ACHIEVEMENT_RARITY.LEGENDARY]: 'border-yellow-400',
};

export default function AchievementShowcase({ onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const showcaseIndex = useAchievementShowcaseStore(s => s.showcaseIndex);
  const featuredAchievements = useAchievementShowcaseStore(s => s.featuredAchievements);
  const isAutoRotating = useAchievementShowcaseStore(s => s.isAutoRotating);
  const rotationInterval = useAchievementShowcaseStore(s => s.rotationInterval);
  const collectionStats = useAchievementShowcaseStore(s => s.collectionStats);
  const nextShowcase = useAchievementShowcaseStore(s => s.nextShowcase);
  const prevShowcase = useAchievementShowcaseStore(s => s.prevShowcase);
  const goToShowcaseIndex = useAchievementShowcaseStore(s => s.goToShowcaseIndex);
  const getCurrentShowcase = useAchievementShowcaseStore(s => s.getCurrentShowcase);
  const stopRotation = useAchievementShowcaseStore(s => s.stopRotation);
  const startRotation = useAchievementShowcaseStore(s => s.startRotation);
  const getRarityProgress = useAchievementShowcaseStore(s => s.getRarityProgress);
  const getCompletionPercentage = useAchievementShowcaseStore(s => s.getCompletionPercentage);

  // Auto-rotation effect
  useEffect(() => {
    if (!isOpen || isPaused || !isAutoRotating) return;

    const interval = setInterval(() => {
      setRotationAngle(prev => (prev + 1) % 360);
    }, 50);

    const rotateInterval = setInterval(() => {
      nextShowcase();
    }, rotationInterval);

    return () => {
      clearInterval(interval);
      clearInterval(rotateInterval);
    };
  }, [isOpen, isPaused, isAutoRotating, rotationInterval]);

  // Update featured when opened
  useEffect(() => {
    if (isOpen) {
      // Get unlocked from achievementStore
      const unlockedStr = localStorage.getItem('monopoly3d-achievement-store');
      if (unlockedStr) {
        try {
          const parsed = JSON.parse(unlockedStr);
          const unlockedAchievements = parsed.state?.unlockedAchievements || {};
          useAchievementShowcaseStore.getState().updateFeaturedAchievements(unlockedAchievements);
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [isOpen]);

  const currentAchievement = getCurrentShowcase();
  const completionPercent = getCompletionPercentage();
  const rarityProgress = getRarityProgress();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-lg text-white font-bold"
      >
        🏅 成就秀场
        <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
          {Math.round(completionPercent)}%
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-amber-600 to-orange-600">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
          >
            ✕
          </button>

          <h2 className="text-2xl font-bold text-white text-center mb-2">🏅 成就秀场</h2>
          <p className="text-white/80 text-center text-sm">
            收集 {collectionStats.unlocked}/{collectionStats.total} 成就 ({Math.round(completionPercent)}%)
          </p>

          {/* Progress bar */}
          <div className="mt-3 mx-auto max-w-xs">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 3D Carousel */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-white mb-4 text-center">✨ 精选成就</h3>
            
            <div className="relative h-64 flex items-center justify-center">
              {/* Carousel container */}
              <div 
                className="relative w-full max-w-lg h-48"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                {featuredAchievements.map((achievement, index) => {
                  const offset = index - showcaseIndex;
                  const absOffset = Math.abs(offset);
                  const isCurrent = offset === 0;
                  const totalItems = featuredAchievements.length;

                  // Calculate position
                  const baseOffset = 120; // pixels between items
                  const xOffset = offset * baseOffset * (1 - absOffset * 0.1);
                  const zOffset = -absOffset * 50;
                  const scale = isCurrent ? 1 : Math.max(0.7, 1 - absOffset * 0.15);
                  const opacity = isCurrent ? 1 : Math.max(0.4, 1 - absOffset * 0.3);
                  const rotateY = offset * 25; // rotation in degrees

                  return (
                    <div
                      key={achievement.id}
                      onClick={() => {
                        goToShowcaseIndex(index);
                        setSelectedAchievement(achievement);
                      }}
                      className={`absolute cursor-pointer transition-all duration-500 ${
                        isCurrent ? 'z-10' : 'z-0'
                      }`}
                      style={{
                        transform: `translateX(${xOffset}px) translateZ(${zOffset}px) scale(${scale}) rotateY(${rotateY}deg)`,
                        opacity,
                        left: '50%',
                        marginLeft: '-80px',
                      }}
                    >
                      <AchievementCard
                        achievement={achievement}
                        isSelected={isCurrent}
                        onClick={() => setSelectedAchievement(achievement)}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Navigation arrows */}
              <button
                onClick={prevShowcase}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white text-2xl"
              >
                ‹
              </button>
              <button
                onClick={nextShowcase}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white text-2xl"
              >
                ›
              </button>
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center gap-2 mt-4">
              {featuredAchievements.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToShowcaseIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === showcaseIndex ? 'bg-amber-500 scale-125' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Rarity progress */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-3">📊 稀有度进度</h3>
            <div className="grid grid-cols-5 gap-3">
              {rarityProgress.map(({ rarity, total, unlocked, progress }) => (
                <div key={rarity} className="bg-gray-800 rounded-xl p-3 text-center">
                  <div className={`text-2xl mb-1 ${
                    rarity === ACHIEVEMENT_RARITY.LEGENDARY ? 'animate-pulse' : ''
                  }`}>
                    {rarity === ACHIEVEMENT_RARITY.LEGENDARY ? '💎' :
                     rarity === ACHIEVEMENT_RARITY.EPIC ? '💜' :
                     rarity === ACHIEVEMENT_RARITY.RARE ? '💙' :
                     rarity === ACHIEVEMENT_RARITY.UNCOMMON ? '💚' : '⚪'}
                  </div>
                  <div className="text-white font-bold">{unlocked}/{total}</div>
                  <div className="text-gray-400 text-xs">{RARITY_LABELS[rarity]}</div>
                  <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        rarity === ACHIEVEMENT_RARITY.LEGENDARY ? 'bg-yellow-500' :
                        rarity === ACHIEVEMENT_RARITY.EPIC ? 'bg-purple-500' :
                        rarity === ACHIEVEMENT_RARITY.RARE ? 'bg-blue-500' :
                        rarity === ACHIEVEMENT_RARITY.UNCOMMON ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent unlocks */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">🕐 最近解锁</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {collectionStats.unlocked > 0 ? (
                <div className="text-gray-500 py-4">暂无最近解锁</div>
              ) : (
                <div className="text-gray-500 py-4">完成成就来解锁它们</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Achievement detail modal */}
      {selectedAchievement && (
        <AchievementDetailModal
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
        />
      )}
    </div>
  );
}

// Achievement card component
function AchievementCard({ achievement, isSelected, onClick }) {
  const { id, name, description, icon, rarity, points } = achievement;
  const isLegendary = rarity === ACHIEVEMENT_RARITY.LEGENDARY;

  return (
    <div
      onClick={onClick}
      className={`
        relative w-40 h-48 rounded-2xl p-4 cursor-pointer
        bg-gradient-to-b from-gray-800 to-gray-900
        border-2 ${RARITY_BORDER[rarity]}
        shadow-lg ${RARITY_GLOW[rarity]}
        transition-all hover:scale-105
        ${isSelected ? 'ring-2 ring-amber-400' : ''}
      `}
    >
      {/* Icon */}
      <div className="text-4xl text-center mb-2">{icon}</div>

      {/* Name */}
      <div className="text-white font-bold text-sm text-center mb-1 line-clamp-2">
        {name}
      </div>

      {/* Points */}
      <div className="text-amber-400 text-xs text-center">
        +{points} pts
      </div>

      {/* Rarity badge */}
      <div className={`absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded ${
        rarity === ACHIEVEMENT_RARITY.LEGENDARY ? 'bg-yellow-500 text-black' :
        rarity === ACHIEVEMENT_RARITY.EPIC ? 'bg-purple-600 text-white' :
        rarity === ACHIEVEMENT_RARITY.RARE ? 'bg-blue-600 text-white' :
        rarity === ACHIEVEMENT_RARITY.UNCOMMON ? 'bg-green-600 text-white' :
        'bg-gray-600 text-white'
      }`}>
        {RARITY_LABELS[rarity]}
      </div>

      {/* Legendary shimmer effect */}
      {isLegendary && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
        </div>
      )}
    </div>
  );
}

// Achievement detail modal
function AchievementDetailModal({ achievement, onClose }) {
  const { name, description, icon, rarity, points, category } = achievement;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
      <div className={`bg-gray-800 rounded-2xl p-6 max-w-sm w-full border-2 ${RARITY_BORDER[rarity]} ${
        rarity === ACHIEVEMENT_RARITY.LEGENDARY ? 'shadow-yellow-500/50 shadow-2xl' : ''
      }`}>
        {/* Icon */}
        <div className="text-6xl text-center mb-4">{icon}</div>

        {/* Name */}
        <h3 className="text-xl font-bold text-white text-center mb-2">{name}</h3>

        {/* Description */}
        <p className="text-gray-300 text-center mb-4">{description}</p>

        {/* Stats */}
        <div className="flex justify-center gap-4 mb-4">
          <div className="text-center">
            <div className="text-amber-400 font-bold text-lg">+{points}</div>
            <div className="text-gray-400 text-xs">成就积分</div>
          </div>
          <div className="text-center">
            <div className={`font-bold text-lg ${
              rarity === ACHIEVEMENT_RARITY.LEGENDARY ? 'text-yellow-400' :
              rarity === ACHIEVEMENT_RARITY.EPIC ? 'text-purple-400' :
              rarity === ACHIEVEMENT_RARITY.RARE ? 'text-blue-400' :
              rarity === ACHIEVEMENT_RARITY.UNCOMMON ? 'text-green-400' : 'text-gray-400'
            }`}>
              {RARITY_LABELS[rarity]}
            </div>
            <div className="text-gray-400 text-xs">稀有度</div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold"
        >
          关闭
        </button>
      </div>
    </div>
  );
}