import { useState, useEffect } from 'react';
import { useDailyChallengeStore, useDailyChallenges, useAvailableRewards } from './dailyChallengeStore';
import { CHALLENGE_DIFFICULTY } from './dailyChallenges';
import { useAchievementStore } from './achievementStore';

const DIFFICULTY_CONFIG = {
  [CHALLENGE_DIFFICULTY.EASY]: { 
    label: '简单', 
    color: 'from-green-500/20 to-green-600/20', 
    border: 'border-green-500/30',
    progressColor: 'bg-green-500',
    icon: '🌱',
  },
  [CHALLENGE_DIFFICULTY.MEDIUM]: { 
    label: '中等', 
    color: 'from-blue-500/20 to-blue-600/20', 
    border: 'border-blue-500/30',
    progressColor: 'bg-blue-500',
    icon: '🔥',
  },
  [CHALLENGE_DIFFICULTY.HARD]: { 
    label: '困难', 
    color: 'from-purple-500/20 to-purple-600/20', 
    border: 'border-purple-500/30',
    progressColor: 'bg-purple-500',
    icon: '💎',
  },
};

export default function DailyChallengeScreen() {
  const [isOpen, setIsOpen] = useState(false);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  
  const dailyChallenges = useDailyChallenges();
  const availableRewards = useAvailableRewards();
  const claimRewards = useDailyChallengeStore(s => s.claimRewards);
  const checkAndRefreshChallenges = useDailyChallengeStore(s => s.checkAndRefreshChallenges);
  const getTimeUntilRefresh = useDailyChallengeStore(s => s.getTimeUntilRefresh);
  const getCompletionPercentage = useDailyChallengeStore(s => s.getCompletionPercentage);
  
  const updateLeaderboard = useAchievementStore(s => s.updateLeaderboard);
  const profileStats = useAchievementStore(s => s.profileStats);
  const studentId = useAchievementStore(s => s.profileStats); // This is from achievementStore
  
  // Check and refresh challenges on mount
  useEffect(() => {
    checkAndRefreshChallenges();
  }, [checkAndRefreshChallenges]);

  // Format time until midnight
  const formatTimeRemaining = (ms) => {
    if (ms <= 0) return '00:00:00';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get time remaining
  const [timeRemaining, setTimeRemaining] = useState(getTimeUntilRefresh());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeUntilRefresh());
    }, 1000);
    return () => clearInterval(interval);
  }, [getTimeUntilRefresh]);

  // Handle claiming rewards
  const handleClaimRewards = () => {
    const reward = claimRewards();
    if (reward > 0) {
      setShowRewardAnimation(true);
      setTimeout(() => setShowRewardAnimation(false), 2000);
      
      // Update leaderboard with new score
      const currentStudentId = localStorage.getItem('monopoly3d_student_id') || 'anonymous';
      updateLeaderboard({
        studentId: currentStudentId,
        name: currentStudentId,
        score: profileStats.totalQuestionsAnswered * 10 + reward,
        gamesPlayed: profileStats.gamesPlayed || 1,
        wins: profileStats.wins || 0,
      });
    }
  };

  const completionPercentage = getCompletionPercentage();
  const completedCount = dailyChallenges.filter(c => c.completed).length;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg hover:scale-105 transition-all"
      >
        <span className="text-2xl">📅</span>
        <div className="text-left">
          <div className="text-xs text-white/70">每日挑战</div>
          <div className="font-bold text-white">
            {completedCount}/{dailyChallenges.length}
          </div>
        </div>
        {availableRewards > 0 && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-black">
            {availableRewards}
          </div>
        )}
      </button>

      {/* Panel Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-emerald-500/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">📅 每日挑战</h2>
                  <p className="text-white/70 text-sm mt-1">每天重置，奖励翻倍！</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white text-3xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Progress */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-white/80 mb-1">
                  <span>今日进度</span>
                  <span>{completionPercentage}% ({completedCount}/{dailyChallenges.length})</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Refresh Timer */}
              <div className="mt-3 text-center">
                <span className="text-xs text-white/60">
                  ⏰ 距离下次重置: {formatTimeRemaining(timeRemaining)}
                </span>
              </div>
            </div>

            {/* Challenges List */}
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 220px)' }}>
              <div className="space-y-4">
                {dailyChallenges.map((challenge) => {
                  const config = DIFFICULTY_CONFIG[challenge.difficulty];
                  const progress = challenge.progress || 0;
                  const percentage = Math.min(100, Math.round((progress / challenge.target) * 100));
                  const isComplete = challenge.completed;

                  return (
                    <div
                      key={challenge.id}
                      className={`p-4 rounded-xl border ${config.border} bg-gradient-to-br ${config.color} transition-all ${
                        isComplete ? 'opacity-80' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`text-3xl ${isComplete ? '' : 'grayscale opacity-70'}`}>
                          {config.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-white">{challenge.title}</h4>
                              <p className="text-xs text-gray-300 mt-0.5">{challenge.description}</p>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-bold ${isComplete ? 'text-yellow-400' : 'text-gray-400'}`}>
                                +{challenge.reward}
                              </div>
                              <div className="text-xs text-gray-500">积分</div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-300 mb-1">
                              <span>{progress}/{challenge.target}</span>
                              <span>{percentage}%</span>
                            </div>
                            <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${config.progressColor} transition-all duration-300`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>

                          {/* Completed Badge */}
                          {isComplete && (
                            <div className="mt-2 flex items-center gap-1 text-green-400 text-xs">
                              <span>✓</span>
                              <span>已完成</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Empty State */}
              {dailyChallenges.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📅</div>
                  <p className="text-gray-400">正在加载今日挑战...</p>
                </div>
              )}
            </div>

            {/* Footer with Claim Button */}
            <div className="p-4 border-t border-gray-700">
              {availableRewards > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">可领取奖励</span>
                    <span className="text-2xl font-bold text-yellow-400">+{availableRewards} 积分</span>
                  </div>
                  <button
                    onClick={handleClaimRewards}
                    className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-bold text-white hover:scale-102 transition-all animate-pulse"
                  >
                    🎁 领取奖励
                  </button>
                </div>
              ) : (
                <div className="text-center text-gray-500 text-sm">
                  {completedCount === dailyChallenges.length 
                    ? '太棒了！所有挑战已完成！'
                    : '继续游戏完成挑战以获得奖励'}
                </div>
              )}
            </div>

            {/* Reward Animation Overlay */}
            {showRewardAnimation && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-60">
                <div className="text-center animate-bounce">
                  <div className="text-8xl mb-4">🎉</div>
                  <div className="text-4xl font-bold text-yellow-400">+{availableRewards} 积分！</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}