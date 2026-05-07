import { useState } from 'react';
import { useAchievementStore } from './achievementStore';
import { useGameStore } from '../../game/store';

export default function Leaderboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // all | weekly | monthly
  const leaderboard = useAchievementStore(s => s.leaderboard);
  const updateLeaderboard = useAchievementStore(s => s.updateLeaderboard);
  const totalPoints = useAchievementStore(s => s.getTotalEarnedPoints());
  const studentId = useGameStore(s => s.studentId);
  const profileStats = useAchievementStore(s => s.profileStats);

  // Get current player rank
  const getPlayerRank = (studentId) => {
    if (!studentId) return null;
    const index = leaderboard.findIndex(e => e.studentId === studentId);
    return index >= 0 ? index + 1 : null;
  };

  const playerRank = getPlayerRank(studentId);

  // Submit score to leaderboard
  const submitScore = () => {
    if (!studentId) {
      alert('请先登录');
      return;
    }

    const gameRecord = useGameStore.getState().saveGameStatsToProfile?.();
    if (gameRecord) {
      updateLeaderboard({
        studentId,
        name: studentId,
        score: totalPoints + (gameRecord.accuracy * 10), // Points + accuracy bonus
        gamesPlayed: profileStats.gamesPlayed || 1,
        wins: profileStats.wins || 0,
        accuracy: gameRecord.accuracy,
      });
      alert('成绩已提交到排行榜！');
    }
  };

  // Filter by period (simplified - in reality would filter by date)
  const filteredLeaderboard = leaderboard; // Would filter based on period

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-36 right-4 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl shadow-lg hover:scale-105 transition-all"
      >
        <span className="text-2xl">📊</span>
        <div className="text-left">
          <div className="text-xs text-white/70">排行榜</div>
          <div className="font-bold text-white">
            {playerRank ? `#${playerRank}` : '--'}
          </div>
        </div>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-yellow-500/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">📊 排行榜</h2>
                  <p className="text-white/70 text-sm">我的排名: {playerRank ? `#${playerRank}` : '未上榜'}</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Period Tabs */}
              <div className="flex gap-2 mt-4">
                {['all', 'weekly', 'monthly'].map(period => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedPeriod === period
                        ? 'bg-white/30 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {period === 'all' ? '全部' : period === 'weekly' ? '本周' : '本月'}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaderboard List */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {filteredLeaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏆</div>
                  <p className="text-gray-400">暂无排名数据</p>
                  <p className="text-sm text-gray-500 mt-2">完成游戏后可以提交成绩到排行榜</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLeaderboard.map((entry, index) => {
                    const isTop3 = index < 3;
                    const isMe = entry.studentId === studentId;

                    return (
                      <div
                        key={entry.studentId}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                          isMe
                            ? 'bg-purple-500/30 border border-purple-500/50'
                            : isTop3
                            ? 'bg-yellow-500/10 border border-yellow-500/30'
                            : 'bg-gray-800/50 border border-gray-700'
                        }`}
                      >
                        {/* Rank */}
                        <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold ${
                          index === 0
                            ? 'bg-yellow-500 text-black'
                            : index === 1
                            ? 'bg-gray-400 text-black'
                            : index === 2
                            ? 'bg-amber-600 text-white'
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}
                        </div>

                        {/* Player Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{entry.name}</span>
                            {isMe && <span className="text-xs text-purple-400">(我)</span>}
                          </div>
                          <div className="flex gap-4 text-xs text-gray-400 mt-1">
                            <span>游戏 {entry.gamesPlayed} 局</span>
                            <span>胜率 {entry.accuracy || 0}%</span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right">
                          <div className="text-xl font-bold text-yellow-400">{entry.score}</div>
                          <div className="text-xs text-gray-400">积分</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit Score Button */}
            <div className="p-4 border-t border-gray-700">
              <button
                onClick={submitScore}
                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-bold text-white hover:scale-102 transition-all"
              >
                📤 提交成绩到排行榜
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
