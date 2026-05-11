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
    <div className="w-full h-full flex items-center justify-center p-8">
      {/* 毛玻璃主卡片 */}
      <div className="glass rounded-3xl p-10 w-full max-w-md space-y-8 shadow-2xl">
        {/* 标题区域 */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-bold gradient-text drop-shadow-lg">
            🏦 大富翁3D
          </h1>
          <p className="text-lg text-purple-200/80 tracking-widest uppercase">
            Educational Edition
          </p>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full opacity-60" />
        </div>
        
        {/* 菜单按钮组 */}
        <div className="flex flex-col gap-4">
          <button
            onClick={goToSetup}
            className="group relative px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl text-xl font-bold text-white shadow-lg btn-glow transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              <span className="text-2xl">🎮</span> 新游戏
            </span>
          </button>
          
          {savedGame && (
            <button
              onClick={handleResume}
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl text-xl font-bold text-white shadow-lg btn-glow transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                <span className="text-2xl">📁</span> 继续游戏
              </span>
            </button>
          )}
          
          <button
            onClick={() => alert('📖 游戏规则：\n\n1. 轮流掷骰子移动棋子\n2. 停在空地上可以购买地产\n3. 停在问题格子上回答问题\n4. 答对获得奖励，答错扣除金钱\n5. 建造房屋可增加租金收入\n6. 其他玩家经过你的地产时需付租金\n7. 破产即出局，最后一人获胜！')}
            className="group relative px-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-xl font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 border border-white/20"
          >
            <span className="flex items-center justify-center gap-3">
              <span className="text-2xl">📖</span> 游戏规则
            </span>
          </button>
          
          <button
            onClick={() => alert('🎓 大富翁3D教育版\n\n制作：教育游戏工作室\n版本：1.0.0\n\n© 2026')}
            className="group relative px-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-xl font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 border border-white/20"
          >
            <span className="flex items-center justify-center gap-3">
              <span className="text-2xl">ℹ️</span> 关于游戏
            </span>
          </button>
        </div>
        
        {/* 底部装饰 */}
        <div className="text-center text-white/40 text-sm pt-4">
          <p>🎲 Educational Edition · 教育版 🎓</p>
        </div>
      </div>
    </div>
  );
}
