import { useState, useRef } from 'react';
import { useGameStore } from '../game/store';
import { BOARD_CONFIG } from '../game/boardConfig';

const ALL_CATEGORIES = ['math', 'shape', 'time', 'geography', 'science', 'reading', 'life', 'emotion', 'animal'];

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

export default function TeacherConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);
  
  const teacherMode = useGameStore(s => s.teacherMode);
  const toggleTeacherMode = useGameStore(s => s.toggleTeacherMode);
  const timerEnabled = useGameStore(s => s.timerEnabled);
  const toggleTimer = useGameStore(s => s.toggleTimer);
  const aiThinkingDelayEnabled = useGameStore(s => s.aiThinkingDelayEnabled);
  const toggleAiThinkingDelay = useGameStore(s => s.toggleAiThinkingDelay);
  const players = useGameStore(s => s.players);
  const saveGame = useGameStore(s => s.saveGame);
  const goToMenu = useGameStore(s => s.goToMenu);
  const enabledCategories = useGameStore(s => s.enabledCategories);
  const toggleCategory = useGameStore(s => s.toggleCategory);
  const importQuestions = useGameStore(s => s.importQuestions);
  const exportQuestions = useGameStore(s => s.exportQuestions);
  const downloadQuestionTemplate = useGameStore(s => s.downloadQuestionTemplate);
  const customQuestions = useGameStore(s => s.customQuestions);
  
  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) {
          setImportStatus({ type: 'error', message: 'JSON格式错误：需要是数组格式' });
          return;
        }
        // Validate structure
        const valid = data.every(q => 
          q.id && q.tier && q.category && q.question && 
          Array.isArray(q.options) && q.options.length === 4 &&
          typeof q.correctIndex === 'number'
        );
        if (!valid) {
          setImportStatus({ type: 'error', message: '题目格式错误，请检查JSON结构' });
          return;
        }
        const before = data.length;
        importQuestions(data);
        const afterCustom = useGameStore.getState().customQuestions.length;
        const imported = afterCustom - (useGameStore.getState().customQuestions.length - (before - (useGameStore.getState().customQuestions.length - before)));
        setImportStatus({ type: 'success', message: `成功导入 ${before} 道题目` });
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        setImportStatus({ type: 'error', message: 'JSON解析失败' });
      }
    };
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };
  
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
    <div className="absolute top-16 right-4 z-40 bg-black/90 backdrop-blur-sm rounded-2xl p-4 w-80 border border-purple-500/30 pointer-events-auto max-h-[80vh] overflow-y-auto">
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
        
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm">AI 思考延迟</span>
          <button
            onClick={toggleAiThinkingDelay}
            className={`px-3 py-1 rounded-lg text-sm font-bold ${
              aiThinkingDelayEnabled ? 'bg-green-600' : 'bg-gray-600'
            } text-white`}
          >
            {aiThinkingDelayEnabled ? '开启' : '关闭'}
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
        
        {/* Category Filters */}
        <div className="border-t border-gray-700 pt-3">
          <div className="text-gray-400 text-xs mb-2">题目类别筛选</div>
          <div className="grid grid-cols-2 gap-1">
            {ALL_CATEGORIES.map(cat => (
              <label key={cat} className="flex items-center gap-1 cursor-pointer hover:bg-gray-800 rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={enabledCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="w-3 h-3 accent-purple-500"
                />
                <span className="text-xs text-gray-300">{CATEGORY_LABELS[cat]}</span>
              </label>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            已启用: {enabledCategories.length}/{ALL_CATEGORIES.length} 类
          </div>
        </div>
        
        {/* Custom Questions */}
        <div className="border-t border-gray-700 pt-3">
          <div className="text-gray-400 text-xs mb-2">自定义题库</div>
          <div className="text-xs text-gray-500 mb-2">
            自定义题目: {customQuestions.length} 道
          </div>
          
          {/* Import Status */}
          {importStatus && (
            <div className={`text-xs mb-2 p-2 rounded ${
              importStatus.type === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
            }`}>
              {importStatus.message}
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-bold"
            >
              📥 导入题库
            </button>
            <button
              onClick={exportQuestions}
              className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-bold"
            >
              📤 导出题库
            </button>
            <button
              onClick={downloadQuestionTemplate}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white text-sm font-bold"
            >
              📄 下载模板
            </button>
          </div>
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
