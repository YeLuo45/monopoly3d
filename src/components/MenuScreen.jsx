import { useGameStore } from '../game/store';

export default function MenuScreen() {
  const goToSetup = useGameStore(s => s.goToSetup);
  const loadGame = useGameStore(s => s.loadGame);
  
  const handleResume = () => {
    const success = loadGame();
    if (!success) alert('没有找到存档！');
  };
  
  const savedGame = typeof window !== 'undefined' && localStorage.getItem('monopoly3d_save');
  
  return (
    <div className="flex flex-col items-center justify-center h-screen text-white">
      {/* Title */}
      <div className="mb-12 text-center">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
          🏦 大富翁3D
        </h1>
        <p className="text-xl text-purple-200">Educational Edition · 教育版</p>
      </div>
      
      {/* Menu Buttons */}
      <div className="flex flex-col gap-4 w-72">
        <button
          onClick={goToSetup}
          className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-xl font-bold shadow-lg hover:shadow-purple-500/50 hover:scale-105 transition-all"
        >
          🎮 新游戏
        </button>
        
        {savedGame && (
          <button
            onClick={handleResume}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl text-xl font-bold shadow-lg hover:shadow-blue-500/50 hover:scale-105 transition-all"
          >
            📁 继续游戏
          </button>
        )}
        
        <button
          onClick={() => alert('📖 游戏规则：\n\n1. 轮流掷骰子移动棋子\n2. 停在空地上可以购买地产\n3. 停在问题格子上回答问题\n4. 答对获得奖励，答错扣除金钱\n5. 建造房屋可增加租金收入\n6. 其他玩家经过你的地产时需付租金\n7. 破产即出局，最后一人获胜！')}
          className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl text-xl font-bold shadow-lg hover:shadow-gray-500/50 hover:scale-105 transition-all"
        >
          📖 游戏规则
        </button>
        
        <button
          onClick={() => alert('🎓 大富翁3D教育版\n\n制作：教育游戏工作室\n版本：1.0.0\n\n© 2026')}
          className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl text-xl font-bold shadow-lg hover:shadow-gray-500/50 hover:scale-105 transition-all"
        >
          ℹ️ 关于游戏
        </button>
      </div>
    </div>
  );
}
