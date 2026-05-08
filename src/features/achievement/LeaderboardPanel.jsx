import { useState, useEffect } from 'react';
import { useAchievementStore } from './achievementStore';
import { useDailyChallengeStore } from './dailyChallengeStore';
import { useGameStore } from '../../game/store';

export default function LeaderboardPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // all | weekly | monthly
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);
  
  const leaderboard = useAchievementStore(s => s.leaderboard);
  const updateLeaderboard = useAchievementStore(s => s.updateLeaderboard);
  const getTotalEarnedPoints = useAchievementStore(s => s.getTotalEarnedPoints);
  const profileStats = useAchievementStore(s => s.profileStats);
  
  const dailyChallenges = useDailyChallengeStore(s => s.dailyChallenges);
  const getCompletionPercentage = useDailyChallengeStore(s => s.getCompletionPercentage);
  
  const gameStoreStudentId = useGameStore(s => s.studentId);
  const gameStats = useGameStore(s => s.gameStats);
  
  // Get student ID from localStorage or game store
  const studentId = gameStoreStudentId || localStorage.getItem('monopoly3d_student_id') || 'anonymous';
  
  // Calculate total score for leaderboard
  const getPlayerScore = (entry) => {
    // Score is based on achievement points + daily challenge completion + accuracy
    const accuracyBonus = Math.round((entry.accuracy || 0) * 10);
    return entry.score + accuracyBonus;
  };

  // Get current player rank
  const getPlayerRank = (studentId) => {
    if (!studentId) return null;
    const index = leaderboard.findIndex(e => e.studentId === studentId);
    return index >= 0 ? index + 1 : null;
  };

  const playerRank = getPlayerRank(studentId);

  // Submit score to leaderboard
  const submitScore = async () => {
    if (!studentId || studentId === 'anonymous') {
      setSubmitMessage({ type: 'error', text: '请先在设置中输入学生ID' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      // Get game record
      const gameRecord = useGameStore.getState().saveGameStatsToProfile?.();
      
      // Calculate total score
      const achievementPoints = getTotalEarnedPoints();
      const accuracyBonus = gameRecord ? Math.round(gameRecord.accuracy * 10) : 0;
      const dailyChallengeBonus = Math.round((getCompletionPercentage() / 100) * 50); // Up to 50 bonus points for daily challenges
      
      const totalScore = achievementPoints + accuracyBonus + dailyChallengeBonus;

      updateLeaderboard({
        studentId,
        name: studentId,
        score: totalScore,
        gamesPlayed: (profileStats.gamesPlayed || 0) + 1,
        wins: profileStats.wins || 0,
        accuracy: gameRecord?.accuracy || 0,
        dailyChallengeCompletion: getCompletionPercentage(),
      });

      setSubmitMessage({ type: 'success', text: `成绩已提交！获得 ${totalScore} 积分` });
    } catch (error) {
      console.error('Error submitting score:', error);
      setSubmitMessage({ type: 'error', text: '提交失败，请重试' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter leaderboard by period (simplified - would filter by date in production)
  const filteredLeaderboard = leaderboard; // TODO: Implement actual date filtering

  // Get medal emoji for top 3
  const getRankMedal = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-52 right-4 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl shadow-lg hover:scale-105 transition-all"
      >
        <span className="text-2xl">🏆</span>
        <div className="text-left">
          <div className="text-xs text-white/70">排行榜</div>
          <div className="font-bold text-white">
            {playerRank ? `#${playerRank}` : '--'}
          </div>
        </div>
      </button>

      {/* Panel Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-amber-500/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">🏆 排行榜</h2>
                  <p className="text-white/70 text-sm mt-1">
                    我的排名: {playerRank ? `#${playerRank}` : '未上榜'}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white text-3xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Period Tabs */}
              <div className="flex gap-2 mt-4">
                {[
                  { id: 'all', label: '全部' },
                  { id: 'weekly', label: '本周' },
                  { id: 'monthly', label: '本月' },
                ].map(period => (
                  <button
                    key={period.id}
                    onClick={() => setSelectedPeriod(period.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedPeriod === period.id
                        ? 'bg-white/30 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaderboard Content */}
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 280px)' }}>
              {filteredLeaderboard.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-7xl mb-6">🏆</div>
                  <h3 className="text-xl font-bold text-white mb-2">暂无排名数据</h3>
                  <p className="text-gray-400 mb-6">完成游戏后可以提交成绩到排行榜</p>
                  <button
                    onClick={submitScore}
                    disabled={isSubmitting || !studentId || studentId === 'anonymous'}
                    className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-bold text-white hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isSubmitting ? '提交中...' : '📤 立即提交成绩'}
                  </button>
                  {submitMessage && (
                    <p className={`mt-4 text-sm ${
                      submitMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {submitMessage.text}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLeaderboard.map((entry, index) => {
                    const isTop3 = index < 3;
                    const isMe = entry.studentId === studentId;

                    return (
                      <div
                        key={entry.studentId}
                        className={`relative p-4 rounded-xl transition-all hover:scale-[1.01] ${
                          isMe
                            ? 'bg-purple-500/30 border-2 border-purple-500'
                            : isTop3
                            ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30'
                            : 'bg-gray-800/50 border border-gray-700'
                        }`}
                      >
                        {/* Rank Badge */}
                        <div className={`absolute -left-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full font-bold text-lg ${
                          index === 0
                            ? 'bg-yellow-500 text-black'
                            : index === 1
                            ? 'bg-gray-400 text-black'
                            : index === 2
                            ? 'bg-amber-600 text-white'
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {getRankMedal(index)}
                        </div>

                        {/* Player Info */}
                        <div className="flex items-center gap-3 ml-8">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-lg ${isMe ? 'text-purple-300' : 'text-white'}`}>
                                {entry.name}
                              </span>
                              {isMe && (
                                <span className="px-2 py-0.5 bg-purple-500 rounded text-xs text-white">
                                  我
                                </span>
                              )}
                              {isTop3 && (
                                <span className="px-2 py-0.5 bg-amber-500/30 rounded text-xs text-amber-300">
                                  Top {index + 1}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                              <span>🎮 {entry.gamesPlayed} 局</span>
                              <span>✅ {entry.accuracy || 0}% 正确率</span>
                              {entry.dailyChallengeCompletion !== undefined && (
                                <span>📅 {entry.dailyChallengeCompletion}% 每日挑战</span>
                              )}
                            </div>
                          </div>

                          {/* Score */}
                          <div className="text-right">
                            <div className="text-2xl font-bold text-yellow-400">
                              {getPlayerScore(entry)}
                            </div>
                            <div className="text-xs text-gray-500">总积分</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
              {filteredLeaderboard.length > 0 && (
                <button
                  onClick={submitScore}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-bold text-white hover:scale-102 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? '提交中...' : '📤 更新我的成绩'}
                </button>
              )}
              {submitMessage && (
                <p className={`mt-3 text-center text-sm ${
                  submitMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {submitMessage.text}
                </p>
              )}
              <p className="mt-3 text-center text-xs text-gray-500">
                💡 每次游戏后可以更新你的排行榜成绩
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}