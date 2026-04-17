import { useState } from 'react';
import { useGameStore } from '../game/store';
import { BOARD_CONFIG } from '../game/boardConfig';

export default function TeacherConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const teacherMode = useGameStore(s => s.teacherMode);
  const toggleTeacherMode = useGameStore(s => s.toggleTeacherMode);
  const timerEnabled = useGameStore(s => s.timerEnabled);
  const toggleTimer = useGameStore(s => s.toggleTimer);
  const players = useGameStore(s => s.players);
  const saveGame = useGameStore(s => s.saveGame);
  const goToMenu = useGameStore(s => s.goToMenu);
  
  if (!teacherMode) {
    return (
      <button
        onClick={toggleTeacherMode}
        className="absolute top-16 right-4 z-40 px-3 py-1 bg-purple-600/80 hover:bg-purple-500 rounded-lg text-white text-xs font-bold pointer-events-auto"
      >
        🎓 教师模式
      </button>
    );
  }
  
  return (
    <div className="absolute top-16 right-4 z-40 bg-black/90 backdrop-blur-sm rounded-2xl p-4 w-80 border border-purple-500/30 pointer-events-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="text-purple-300 font-bold text-sm">🎓 教师控制台</div>
        <button
          onClick={toggleTeacherMode}
          className="text-gray-400 hover:text-white text-lg"
        >
          ✕
        </button>
      </div>
      
      {/* Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm">答题计时器</span>
          <button
            onClick={toggleTimer}
            className={`px-3 py-1 rounded-lg text-sm font-bold ${
              timerEnabled ? 'bg-green-600' : 'bg-gray-600'
            } text-white`}
          >
            {timerEnabled ? '开启' : '关闭'}
          </button>
        </div>
        
        <div className="border-t border-gray-700 pt-3">
          <div className="text-gray-400 text-xs mb-2">玩家管理</div>
          {players.map(player => (
            <div key={player.id} className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: player.color }}
                />
                <span className="text-white text-sm">{player.name}</span>
                {player.isAI && <span className="text-xs">🤖</span>}
              </div>
              <div className="text-yellow-400 text-sm font-bold">
                ${player.money}
              </div>
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-700 pt-3">
          <div className="text-gray-400 text-xs mb-2">快捷操作</div>
          <div className="flex gap-2">
            <button
              onClick={saveGame}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-bold"
            >
              💾 存档
            </button>
            <button
              onClick={goToMenu}
              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm font-bold"
            >
              🏠 退出
            </button>
          </div>
        </div>
        
        <div className="text-gray-500 text-xs text-center mt-2">
          教师模式已开启 · 学生视图已简化
        </div>
      </div>
    </div>
  );
}
