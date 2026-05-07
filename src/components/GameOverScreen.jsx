import { useState } from 'react';
import { useGameStore } from '../game/store';
import StudentReport, { StudentReportSummary } from './StudentReport';

export default function GameOverScreen() {
  const winner = useGameStore(s => s.winner);
  const players = useGameStore(s => s.players);
  const goToMenu = useGameStore(s => s.goToMenu);
  const goToSetup = useGameStore(s => s.goToSetup);
  
  const [showStudentReport, setShowStudentReport] = useState(false);
  
  // Rank all players by net worth
  const rankedPlayers = [...players].sort((a, b) => {
    const netA = a.money + a.properties.reduce((sum, pid) => {
      return sum + 100; // Simplified property value estimate
    }, 0);
    const netB = b.money + b.properties.reduce((sum, pid) => {
      return sum + 100;
    }, 0);
    return netB - netA;
  });
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white p-8">
      {/* Student Report Modal */}
      {showStudentReport && (
        <StudentReport onClose={() => setShowStudentReport(false)} />
      )}
      
      {/* Trophy / Winner display */}
      <div className="mb-8 text-center">
        {winner ? (
          <>
            <div className="text-8xl mb-4">🏆</div>
            <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 bg-clip-text text-transparent">
              {winner.name}
            </h1>
            <p className="text-2xl text-purple-200">获胜！</p>
            <div className="mt-4 text-yellow-400 text-3xl font-bold">
              财富: ${winner.money.toLocaleString()}
            </div>
          </>
        ) : (
          <>
            <div className="text-8xl mb-4">🎮</div>
            <h1 className="text-5xl font-black mb-2 text-purple-300">游戏结束</h1>
          </>
        )}
      </div>
      
      {/* Rankings */}
      <div className="w-full max-w-md bg-black/40 backdrop-blur-sm rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 text-purple-200">最终排名</h2>
        <div className="space-y-3">
          {rankedPlayers.map((player, idx) => (
            <div
              key={player.id}
              className={`flex items-center gap-4 p-3 rounded-xl ${
                idx === 0
                  ? 'bg-yellow-900/40 border border-yellow-500/50'
                  : idx === 1
                  ? 'bg-gray-600/40 border border-gray-400/50'
                  : idx === 2
                  ? 'bg-orange-900/40 border border-orange-600/50'
                  : 'bg-gray-800/40'
              }`}
            >
              <div className="text-2xl font-black">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
              </div>
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: player.color }}
              />
              <div className="flex-1">
                <div className="font-bold">{player.name}</div>
                <div className="text-xs text-gray-400">
                  房产: {player.properties.length} · {player.isBankrupt ? '💀 破产' : '🏦 正常'}
                </div>
              </div>
              <div className="text-yellow-400 font-bold">
                ${player.money.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Student Report Summary Card */}
      <div className="w-full max-w-md mb-8">
        <StudentReportSummary onViewFullReport={() => setShowStudentReport(true)} />
      </div>
      
      {/* Stats summary */}
      <div className="flex gap-4 mb-8">
        <div className="bg-black/40 rounded-xl px-6 py-4 text-center">
          <div className="text-3xl font-bold text-green-400">{players.filter(p => !p.isBankrupt).length}</div>
          <div className="text-xs text-gray-400">存活玩家</div>
        </div>
        <div className="bg-black/40 rounded-xl px-6 py-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{players.reduce((sum, p) => sum + p.properties.length, 0)}</div>
          <div className="text-xs text-gray-400">交易房产</div>
        </div>
        <div className="bg-black/40 rounded-xl px-6 py-4 text-center">
          <div className="text-3xl font-bold text-purple-400">20</div>
          <div className="text-xs text-gray-400">游戏回合</div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={goToMenu}
          className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl font-bold text-xl hover:scale-105 transition-all"
        >
          🏠 返回主页
        </button>
        <button
          onClick={goToSetup}
          className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold text-xl hover:scale-105 transition-all shadow-lg"
        >
          🔄 再来一局
        </button>
      </div>
    </div>
  );
}
