/**
 * SeasonChallenges - Daily and weekly seasonal challenges
 * 
 * Features:
 * - Daily challenges (reset every day)
 * - Weekly challenges (reset every Monday)
 * - Progress tracking
 * - XP rewards
 */

import { useState, useEffect, useMemo } from 'react';
import { useSeasonPassStore } from './seasonPassStore';

export default function SeasonChallenges() {
  const [isOpen, setIsOpen] = useState(false);

  const initSeason = useSeasonPassStore(s => s.initSeason);
  const checkDailyReset = useSeasonPassStore(s => s.checkDailyReset);
  const checkWeeklyReset = useSeasonPassStore(s => s.checkWeeklyReset);
  const getActiveChallenges = useSeasonPassStore(s => s.getActiveChallenges);
  const claimChallengeReward = useSeasonPassStore(s => s.claimChallengeReward);

  useEffect(() => {
    if (isOpen) {
      initSeason();
      checkDailyReset();
      checkWeeklyReset();
    }
  }, [isOpen]);

  const { daily, weekly } = useMemo(() => getActiveChallenges(), [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-bold"
      >
        🎯 季节挑战
        {(daily.length + weekly.length) > 0 && (
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
            {daily.length + weekly.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">🎯 季节挑战</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"
          >
            关闭
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Daily challenges */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              📅 每日挑战
              <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">每天重置</span>
            </h3>
            <div className="space-y-3">
              {daily.length > 0 ? daily.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  onClaim={() => claimChallengeReward(challenge.id)}
                />
              )) : (
                <div className="text-gray-500 text-center py-4">今日挑战已全部完成</div>
              )}
            </div>
          </div>

          {/* Weekly challenges */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              📆 每周挑战
              <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">每周重置</span>
            </h3>
            <div className="space-y-3">
              {weekly.length > 0 ? weekly.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  onClaim={() => claimChallengeReward(challenge.id)}
                />
              )) : (
                <div className="text-gray-500 text-center py-4">本周挑战已全部完成</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Challenge card component
function ChallengeCard({ challenge, onClaim }) {
  const progressPercent = Math.min(1, challenge.progress / challenge.target);
  const isComplete = challenge.completed;
  const isClaimed = challenge.claimed;

  return (
    <div className={`rounded-xl p-4 ${
      isClaimed ? 'bg-gray-900/50 opacity-60' : 
      isComplete ? 'bg-green-900/20 border border-green-600/30' : 
      'bg-gray-700/50'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-white font-bold">{challenge.name}</h4>
            {isComplete && !isClaimed && (
              <span className="text-xs text-yellow-400 bg-yellow-600/20 px-2 py-0.5 rounded">
                待领取
              </span>
            )}
            {isClaimed && (
              <span className="text-xs text-green-400 bg-green-600/20 px-2 py-0.5 rounded">
                ✓ 已完成
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">{challenge.description}</p>
          
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>进度</span>
              <span>{challenge.progress} / {challenge.target}</span>
            </div>
            <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  isComplete ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercent * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* XP reward and claim button */}
        <div className="flex flex-col items-end gap-2">
          <div className="text-amber-400 font-bold text-sm">
            +{challenge.xpReward} XP
          </div>
          {isComplete && !isClaimed && (
            <button
              onClick={onClaim}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-lg text-white text-sm font-bold"
            >
              领取
            </button>
          )}
        </div>
      </div>
    </div>
  );
}