/**
 * SeasonPass - Season pass UI with tiers and rewards
 * 
 * Features:
 * - Season progress bar
 * - Tier unlock display
 * - Free and premium reward tracks
 * - Claim rewards functionality
 */

import { useState, useEffect, useMemo } from 'react';
import { useSeasonPassStore, SEASON_TIERS } from './seasonPassStore';

const REWARD_ICONS = {
  'avatar:star': '⭐',
  'avatar:galaxy': '🌌',
  'avatar:knight': '🗡️',
  'avatar:knight_gold': '⚔️',
  'avatar:phoenix': '🔥',
  'avatar:phoenix_glow': '✨',
  'emote:clap': '👏',
  'emote:fire': '🔥',
  'emote:fire_gold': '💥',
  'emote:meteor': '☄️',
  'emote:meteor_gold': '💫',
  'emote:legendary': '🏆',
  'theme:nebula': '🌌',
  'theme:nebula_plus': '🌠',
  'theme:forest': '🌲',
  'theme:forest_plus': '🌳',
  'theme:aurora': '🌈',
  'theme:aurora_plus': '✨',
  'piece:panda': '🐼',
  'piece:panda_glow': '✨',
  'piece:dragon': '🐉',
  'piece:dragon_glow': '💫',
};

function getRewardIcon(reward) {
  return REWARD_ICONS[reward] || '🎁';
}

export default function SeasonPass() {
  const [isOpen, setIsOpen] = useState(false);

  const initSeason = useSeasonPassStore(s => s.initSeason);
  const getSeasonProgress = useSeasonPassStore(s => s.getSeasonProgress);
  const isPremium = useSeasonPassStore(s => s.isPremium);
  const upgradeToPremium = useSeasonPassStore(s => s.upgradeToPremium);
  const claimReward = useSeasonPassStore(s => s.claimReward);
  const isRewardClaimed = useSeasonPassStore(s => s.isRewardClaimed);

  // Initialize season on first open
  useEffect(() => {
    if (isOpen) {
      initSeason();
    }
  }, [isOpen]);

  const progress = useMemo(() => getSeasonProgress(), [isOpen]);
  const premiumInfo = useMemo(() => useSeasonPassStore.getState().getPremiumInfo(), [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg text-white font-bold"
      >
        🏆 赛季通行证
        {progress && (
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
            Lv.{progress.tier}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-amber-600 to-orange-600 rounded-t-2xl">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
          >
            ✕
          </button>

          {/* Season info */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-1">
              {progress?.name || '赛季'}
            </h2>
            <div className="text-white/80 text-sm">
              剩余 {progress?.daysRemaining || 0} 天
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-white text-sm mb-2">
              <span>Tier {progress?.tier || 1}</span>
              <span>{progress?.xp || 0} / {progress?.xpForNextTier || 100} XP</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${(progress?.progressPercent || 0) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Premium upgrade banner */}
          {!premiumInfo.isPremium && (
            <div className="mb-6 bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-600/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-amber-400">升级到高级赛季</h3>
                  <p className="text-gray-300 text-sm mt-1">
                    解锁专属奖励，获得2倍经验值
                  </p>
                </div>
                <button
                  onClick={upgradeToPremium}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-lg text-white font-bold"
                >
                  立即升级
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {premiumInfo.benefits.map((b, i) => (
                  <span key={i} className="text-xs text-amber-300 bg-amber-600/20 px-2 py-1 rounded">
                    ✓ {b}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tier rewards */}
          <h3 className="text-lg font-bold text-white mb-4">🎁 赛季奖励</h3>
          <div className="space-y-4">
            {SEASON_TIERS.map(tierData => {
              const tier = tierData.tier;
              const isUnlocked = (progress?.tier || 0) >= tier;
              const freeClaimed = isRewardClaimed(tier, 'free');
              const premiumClaimed = isRewardClaimed(tier, 'premium');
              const isCurrentTier = (progress?.tier || 0) === tier;

              return (
                <div
                  key={tier}
                  className={`rounded-xl p-4 ${
                    isUnlocked ? 'bg-gray-700/50' : 'bg-gray-900/50 opacity-60'
                  } ${isCurrentTier ? 'ring-2 ring-amber-500' : ''}`}
                >
                  {/* Tier header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        tier <= 3 ? 'bg-amber-600 text-white' :
                        tier <= 6 ? 'bg-gray-600 text-white' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {tier}
                      </div>
                      <div>
                        <div className="text-white font-bold">等级 {tier}</div>
                        <div className="text-gray-400 text-xs">
                          {tierData.xpRequired} XP
                        </div>
                      </div>
                    </div>
                    {isCurrentTier && (
                      <span className="text-xs text-amber-400 bg-amber-600/20 px-2 py-1 rounded">
                        当前等级
                      </span>
                    )}
                  </div>

                  {/* Rewards */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Free rewards */}
                    <div className={`rounded-lg p-3 ${isUnlocked ? 'bg-gray-600/50' : 'bg-gray-800/50'}`}>
                      <div className="text-xs text-gray-400 mb-2">免费奖励</div>
                      <div className="flex items-center gap-2">
                        {tierData.freeRewards.map((reward, i) => (
                          <span key={i} className="text-2xl" title={reward}>
                            {getRewardIcon(reward)}
                          </span>
                        ))}
                      </div>
                      {isUnlocked && !freeClaimed && (
                        <button
                          onClick={() => claimReward(tier, 'free')}
                          className="mt-2 w-full py-1 bg-green-600 hover:bg-green-500 rounded text-white text-sm font-bold"
                        >
                          领取
                        </button>
                      )}
                      {freeClaimed && (
                        <div className="mt-2 text-green-400 text-sm font-bold text-center">
                          ✓ 已领取
                        </div>
                      )}
                    </div>

                    {/* Premium rewards */}
                    <div className={`rounded-lg p-3 ${isUnlocked && premiumInfo.isPremium ? 'bg-amber-600/20 border border-amber-600/30' : 'bg-gray-800/50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-amber-400">高级奖励</div>
                        {!premiumInfo.isPremium && (
                          <span className="text-xs text-gray-500">🔒</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {tierData.premiumRewards.map((reward, i) => (
                          <span key={i} className="text-2xl" title={reward}>
                            {getRewardIcon(reward)}
                          </span>
                        ))}
                      </div>
                      {isUnlocked && premiumInfo.isPremium && !premiumClaimed && (
                        <button
                          onClick={() => claimReward(tier, 'premium')}
                          className="mt-2 w-full py-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded text-white text-sm font-bold"
                        >
                          领取
                        </button>
                      )}
                      {premiumInfo.isPremium && premiumClaimed && (
                        <div className="mt-2 text-amber-400 text-sm font-bold text-center">
                          ✓ 已领取
                        </div>
                      )}
                      {!premiumInfo.isPremium && isUnlocked && (
                        <button
                          onClick={upgradeToPremium}
                          className="mt-2 w-full py-1 bg-gradient-to-r from-amber-600 to-orange-600 rounded text-white text-xs font-bold"
                        >
                          解锁
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}