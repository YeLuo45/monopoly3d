import { useState } from 'react';
import { useGameStore } from '../game/store';
import { AI_DIFFICULTY } from '../game/aiBrain';
import { THEMES, BOARD_THEMES } from '../game/themes';

const CATEGORY_LABELS = {
  math: '🔢 数学',
  shape: '⬡ 形状',
  time: '⏰ 时间',
  geography: '🌍 地理',
  science: '🔬 科学',
  reading: '📖 阅读',
  life: '🌱 生活',
  emotion: '💝 情感',
  animal: '🐾 动物',
};

const DIFFICULTY_OPTIONS = [
  { key: AI_DIFFICULTY.EASY, label: '简单', color: 'bg-green-600' },
  { key: AI_DIFFICULTY.NORMAL, label: '普通', color: 'bg-yellow-600' },
  { key: AI_DIFFICULTY.HARD, label: '困难', color: 'bg-red-600' },
];

export default function SetupScreen() {
  const goToMenu = useGameStore(s => s.goToMenu);
  const setAgeTier = useGameStore(s => s.setAgeTier);
  const setPlayers = useGameStore(s => s.setPlayers);
  const ageTier = useGameStore(s => s.ageTier);
  const enabledCategories = useGameStore(s => s.enabledCategories);
  const currentTheme = useGameStore(s => s.currentTheme);
  const setTheme = useGameStore(s => s.setTheme);

  // Default: 1 human + 1 AI
  const [humanCount, setHumanCount] = useState(1);
  const [aiCount, setAiCount] = useState(1);
  const [aiDifficulties, setAiDifficulties] = useState([AI_DIFFICULTY.NORMAL]);

  // Update AI difficulties when aiCount changes
  const handleAiCountChange = (newCount) => {
    setAiCount(newCount);
    // Extend or truncate difficulties array
    const newDifficulties = [...aiDifficulties];
    while (newDifficulties.length < newCount) {
      newDifficulties.push(AI_DIFFICULTY.NORMAL);
    }
    setAiDifficulties(newDifficulties.slice(0, newCount));
  };

  // Update individual AI difficulty
  const handleDifficultyChange = (aiIndex, difficulty) => {
    const newDifficulties = [...aiDifficulties];
    newDifficulties[aiIndex] = difficulty;
    setAiDifficulties(newDifficulties);
  };

  const handleStart = () => {
    if (humanCount + aiCount < 2) {
      alert('至少需要2名玩家！');
      return;
    }
    setPlayers(humanCount, aiCount, aiDifficulties);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white p-8">
      <h2 className="text-4xl font-bold mb-8 text-yellow-300">⚙️ 游戏设置</h2>

      {/* Age Tier Selection */}
      <div className="mb-8 w-96">
        <h3 className="text-xl mb-4 text-purple-200">选择年龄段</h3>
        <div className="grid grid-cols-1 gap-2">
          {[
            { key: 'kindergarten', label: '🌈 幼儿园 (4-6岁)', desc: '简单问答 + 语音朗读' },
            { key: 'primary1_2', label: '📚 小学1-2年级 (6-8岁)', desc: '基础数学 + 常识' },
            { key: 'primary3_4', label: '🏆 小学3-4年级 (8-10岁)', desc: '进阶数学 + 科学知识' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setAgeTier(opt.key)}
              className={`p-4 rounded-xl text-left transition-all ${
                ageTier === opt.key
                  ? 'bg-purple-600 ring-2 ring-purple-300'
                  : 'bg-purple-800/50 hover:bg-purple-700/50'
              }`}
            >
              <div className="font-bold">{opt.label}</div>
              <div className="text-sm text-purple-200">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Enabled Categories Display */}
      <div className="mb-8 w-96">
        <h3 className="text-xl mb-4 text-purple-200">已启用题目类别</h3>
        <div className="bg-gray-800/50 rounded-xl p-4">
          <div className="flex flex-wrap gap-2">
            {enabledCategories.map(cat => (
              <span
                key={cat}
                className="px-2 py-1 bg-purple-600/50 rounded-full text-sm"
              >
                {CATEGORY_LABELS[cat] || cat}
              </span>
            ))}
          </div>
          <div className="text-sm text-gray-400 mt-2">
            共 {enabledCategories.length} 个类别已启用
          </div>
        </div>
      </div>

      {/* Player Setup — Default 1 human + 1 AI */}
      <div className="mb-8 w-96">
        <h3 className="text-xl mb-4 text-purple-200">玩家数量</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-4xl mb-2">👤</div>
            <div className="text-sm text-gray-400 mb-2">人类玩家</div>
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={() => setHumanCount(Math.max(1, humanCount - 1))}
                className="w-10 h-10 bg-gray-700 rounded-full font-bold hover:bg-gray-600"
              >-</button>
              <span className="text-2xl font-bold w-8 text-center">{humanCount}</span>
              <button
                onClick={() => setHumanCount(Math.min(4 - aiCount, humanCount + 1))}
                className="w-10 h-10 bg-gray-700 rounded-full font-bold hover:bg-gray-600"
              >+</button>
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-4xl mb-2">🤖</div>
            <div className="text-sm text-gray-400 mb-2">电脑玩家</div>
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={() => handleAiCountChange(Math.max(0, aiCount - 1))}
                className="w-10 h-10 bg-gray-700 rounded-full font-bold hover:bg-gray-600"
              >-</button>
              <span className="text-2xl font-bold w-8 text-center">{aiCount}</span>
              <button
                onClick={() => handleAiCountChange(Math.min(4 - humanCount, aiCount + 1))}
                className="w-10 h-10 bg-gray-700 rounded-full font-bold hover:bg-gray-600"
              >+</button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-gray-400">
          共 {humanCount + aiCount} 名玩家
          <span className="block text-sm mt-1 text-green-400">
            💡 默认：1 人类 + 1 AI（可直接开始）
          </span>
        </div>
      </div>

      {/* AI Difficulty Selection */}
      {aiCount > 0 && (
        <div className="mb-8 w-96">
          <h3 className="text-xl mb-4 text-purple-200">AI 难度设置</h3>
          <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
            {Array.from({ length: aiCount }, (_, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-white">🤖 AI {i + 1}</span>
                <div className="flex gap-2">
                  {DIFFICULTY_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => handleDifficultyChange(i, opt.key)}
                      className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${
                        aiDifficulties[i] === opt.key
                          ? `${opt.color} text-white ring-2 ring-white/50`
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Theme Selection */}
      <div className="mb-8 w-96">
        <h3 className="text-xl mb-4 text-purple-200">🎨 棋盘主题</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(BOARD_THEMES).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={`p-4 rounded-xl text-left transition-all ${
                currentTheme === key
                  ? 'bg-purple-600 ring-2 ring-purple-300'
                  : 'bg-gray-800/50 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full" style={{ background: theme.boardColor }} />
                <div className="w-6 h-6 rounded-full" style={{ background: theme.feltColor }} />
                <div className="w-6 h-6 rounded-full" style={{ background: theme.centerColor }} />
              </div>
              <div className="font-bold text-white">{theme.name}</div>
              <div className="text-xs text-gray-400">{theme.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={goToMenu}
          className="px-8 py-3 bg-gray-700 rounded-xl font-bold hover:bg-gray-600"
        >
          ← 返回
        </button>
        <button
          onClick={handleStart}
          className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold text-xl hover:scale-105 transition-all shadow-lg"
        >
          🎮 选择棋子 →
        </button>
      </div>
    </div>
  );
}

