import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGameStore } from '../../game/store';

// Category labels and colors
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

const CATEGORY_COLORS = {
  math: '#FF6B6B',
  shape: '#4ECDC4',
  time: '#45B7D1',
  geography: '#96CEB4',
  science: '#DDA0DD',
  reading: '#FFD700',
  life: '#98D8C8',
  emotion: '#F7DC6F',
  animal: '#BB8FCE',
};

// Adaptive difficulty levels
const DIFFICULTY_LEVELS = {
  EASY: { name: '入门', color: '#4ADE80', weight: 0.3 },
  MEDIUM: { name: '基础', color: '#FACC15', weight: 0.5 },
  HARD: { name: '挑战', color: '#FB923C', weight: 0.7 },
  MASTER: { name: '大师', color: '#F87171', weight: 1.0 },
};

// Practice modes
const PRACTICE_MODES = {
  WEAKSPOT: { name: '薄弱突破', icon: '🎯', description: '针对错题集中练习' },
  MARATHON: { name: '刷题冲刺', icon: '🏃', description: '限时连续答题' },
  TIMED_CHALLENGE: { name: '计时挑战', icon: '⏱️', description: '速度与准确率' },
  CATEGORY_BATTLE: { name: '分类对战', icon: '⚔️', description: '指定分类专项训练' },
  MIXED: { name: '混合练习', icon: '🎲', description: '全面覆盖综合训练' },
};

/**
 * PracticeMode - Adaptive practice component
 * Provides personalized question practice based on student performance
 */
export default function PracticeMode() {
  const [isOpen, setIsOpen] = useState(false);
  const [practiceMode, setPracticeMode] = useState('MIXED');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, incorrect: 0, streak: 0, maxStreak: 0 });
  const [timeLeft, setTimeLeft] = useState(30);
  const [isActive, setIsActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [questionsPool, setQuestionsPool] = useState([]);
  
  const timerRef = useRef(null);
  const timeoutFlagRef = useRef(false);
  
  // Game store
  const ageTier = useGameStore(s => s.ageTier);
  const enabledCategories = useGameStore(s => s.enabledCategories);
  const customQuestions = useGameStore(s => s.customQuestions);
  const gameStats = useGameStore(s => s.gameStats);
  
  // Load student performance data for adaptive difficulty
  const performanceData = useMemo(() => {
    const questionsAnswered = gameStats.questionsAnswered || [];
    const categoryStats = {};
    
    enabledCategories.forEach(cat => {
      const catQuestions = questionsAnswered.filter(q => q.category === cat);
      const correct = catQuestions.filter(q => q.correct).length;
      categoryStats[cat] = {
        total: catQuestions.length,
        correct,
        accuracy: catQuestions.length > 0 ? Math.round((correct / catQuestions.length) * 100) : 50,
      };
    });
    
    return categoryStats;
  }, [gameStats, enabledCategories]);
  
  // Get weak categories (accuracy < 60%)
  const weakCategories = useMemo(() => {
    return Object.entries(performanceData)
      .filter(([, stats]) => stats.accuracy < 60 && stats.total > 0)
      .map(([cat]) => cat);
  }, [performanceData]);
  
  // Build questions pool based on practice mode
  const buildQuestionsPool = useCallback(() => {
    // Get all questions for current tier
    let allQuestions = [];
    
    if (ageTier === 'kindergarten') {
      allQuestions = window.kindergartenQuestions || [];
    } else if (ageTier === 'primary1_2') {
      allQuestions = window.primary1_2Questions || [];
    } else {
      allQuestions = window.primary3_4Questions || [];
    }
    
    // Add custom questions
    allQuestions = [...allQuestions, ...customQuestions];
    
    // Filter by selected categories if needed
    if (selectedCategories.length > 0) {
      allQuestions = allQuestions.filter(q => selectedCategories.includes(q.category));
    }
    
    // Sort by practice mode
    switch (practiceMode) {
      case 'WEAKSPOT':
        // Prioritize weak categories
        allQuestions.sort((a, b) => {
          const aWeak = weakCategories.includes(a.category) ? 0 : 1;
          const bWeak = weakCategories.includes(b.category) ? 0 : 1;
          return aWeak - bWeak;
        });
        break;
      case 'CATEGORY_BATTLE':
        if (selectedCategories.length > 0) {
          allQuestions = allQuestions.filter(q => selectedCategories.includes(q.category));
        }
        break;
      default:
        // Shuffle for mixed practice
        allQuestions = allQuestions.sort(() => Math.random() - 0.5);
    }
    
    return allQuestions;
  }, [ageTier, customQuestions, selectedCategories, practiceMode, weakCategories]);
  
  // Get next question
  const getNextQuestion = useCallback(() => {
    if (questionsPool.length === 0) return null;
    
    // For weakspot mode, cycle through weak categories first
    if (practiceMode === 'WEAKSPOT' && weakCategories.length > 0) {
      const weakQuestion = questionsPool.find(q => weakCategories.includes(q.category));
      if (weakQuestion) return weakQuestion;
    }
    
    // Adaptive difficulty selection
    const random = Math.random();
    let filteredPool = questionsPool;
    
    if (difficulty === 'EASY' && random < 0.7) {
      filteredPool = questionsPool.slice(0, Math.ceil(questionsPool.length * 0.3));
    } else if (difficulty === 'HARD' && random < 0.5) {
      filteredPool = questionsPool.slice(Math.floor(questionsPool.length * 0.7));
    } else if (difficulty === 'MASTER') {
      filteredPool = questionsPool.slice(Math.floor(questionsPool.length * 0.8));
    }
    
    return filteredPool[Math.floor(Math.random() * filteredPool.length)] || questionsPool[0];
  }, [questionsPool, practiceMode, weakCategories, difficulty]);
  
  // Handle timeout - defined before use but using refs for dependencies
  const handleTimeout = useCallback(() => {
    if (!currentQuestion) return;
    
    setScore(prev => ({
      ...prev,
      incorrect: prev.incorrect + 1,
      streak: 0,
    }));
    
    setSessionHistory(prev => [
      ...prev,
      {
        question: currentQuestion.question,
        category: currentQuestion.category,
        correct: false,
        answer: null,
        timeExpired: true,
      },
    ]);
    
    timeoutFlagRef.current = true;
  }, [currentQuestion]);
  
  // Adjust difficulty based on performance
  const adjustDifficulty = useCallback((wasCorrect) => {
    setSessionHistory(prev => {
      const recentHistory = prev.slice(-5);
      if (recentHistory.length < 3) return prev;
      
      const recentAccuracy = recentHistory.filter(h => h.correct).length / recentHistory.length;
      
      if (wasCorrect && recentAccuracy >= 0.8 && difficulty !== 'MASTER') {
        const levels = Object.keys(DIFFICULTY_LEVELS);
        const currentIdx = levels.indexOf(difficulty);
        if (currentIdx < levels.length - 1) {
          setDifficulty(levels[currentIdx + 1]);
        }
      } else if (!wasCorrect && recentAccuracy <= 0.4 && difficulty !== 'EASY') {
        const levels = Object.keys(DIFFICULTY_LEVELS);
        const currentIdx = levels.indexOf(difficulty);
        if (currentIdx > 0) {
          setDifficulty(levels[currentIdx - 1]);
        }
      }
      return prev;
    });
  }, [difficulty]);
  
  // Advance to next question
  const advanceToNext = useCallback(() => {
    setQuestionIndex(prev => prev + 1);
    setShowResult(false);
    setSelectedAnswer(null);
    timeoutFlagRef.current = false;
    
    const question = getNextQuestion();
    setCurrentQuestion(question);
    
    // Reset timer for timed modes
    if (practiceMode === 'TIMED_CHALLENGE' || practiceMode === 'MARATHON') {
      setTimeLeft(practiceMode === 'TIMED_CHALLENGE' ? 30 : 20);
    }
  }, [getNextQuestion, practiceMode]);
  
  // Start practice
  const startPractice = useCallback(() => {
    const pool = buildQuestionsPool();
    setQuestionsPool(pool);
    setScore({ correct: 0, incorrect: 0, streak: 0, maxStreak: 0 });
    setQuestionIndex(0);
    setSessionHistory([]);
    setIsActive(true);
    setShowResult(false);
    setSelectedAnswer(null);
    timeoutFlagRef.current = false;
    
    const question = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    setCurrentQuestion(question);
    
    // Start timer
    if (practiceMode === 'TIMED_CHALLENGE' || practiceMode === 'MARATHON') {
      setTimeLeft(practiceMode === 'TIMED_CHALLENGE' ? 30 : 20);
    }
  }, [buildQuestionsPool, practiceMode]);
  
  // Handle answer selection
  const handleAnswer = useCallback((answerIndex) => {
    if (selectedAnswer !== null || !currentQuestion) return;
    
    clearInterval(timerRef.current);
    
    const isCorrect = answerIndex === currentQuestion.correctIndex;
    
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
      streak: isCorrect ? prev.streak + 1 : 0,
      maxStreak: isCorrect ? Math.max(prev.maxStreak, prev.streak + 1) : prev.maxStreak,
    }));
    
    setSessionHistory(prev => [
      ...prev,
      {
        question: currentQuestion.question,
        category: currentQuestion.category,
        correct: isCorrect,
        userAnswer: answerIndex,
        correctAnswer: currentQuestion.correctIndex,
      },
    ]);
    
    // Adaptive difficulty
    adjustDifficulty(isCorrect);
  }, [currentQuestion, selectedAnswer, adjustDifficulty]);
  
  // End practice
  const endPractice = useCallback(() => {
    clearInterval(timerRef.current);
    setIsActive(false);
    setCurrentQuestion(null);
  }, []);
  
  // Timer effect
  useEffect(() => {
    if (isActive && (practiceMode === 'TIMED_CHALLENGE' || practiceMode === 'MARATHON') && !showResult) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeout();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timerRef.current);
    }
  }, [isActive, practiceMode, showResult, handleTimeout]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);
  
  // Calculate session stats
  const sessionStats = useMemo(() => {
    const total = score.correct + score.incorrect;
    const accuracy = total > 0 ? Math.round((score.correct / total) * 100) : 0;
    
    // Category breakdown
    const categoryBreakdown = {};
    sessionHistory.forEach(h => {
      if (!categoryBreakdown[h.category]) {
        categoryBreakdown[h.category] = { correct: 0, total: 0 };
      }
      categoryBreakdown[h.category].total++;
      if (h.correct) categoryBreakdown[h.category].correct++;
    });
    
    return {
      total,
      accuracy,
      avgResponseTime: 'N/A',
      categoryBreakdown,
    };
  }, [score, sessionHistory]);
  
  // If not open, show floating button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-36 right-4 z-40 w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        title="练习模式"
      >
        <span className="text-2xl">📝</span>
      </button>
    );
  }
  
  // Practice selection screen
  if (!isActive) {
    return (
      <div className="fixed bottom-36 right-4 z-40 w-80 sm:w-96 max-h-[80vh] bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-green-500/30 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <div>
              <div className="text-white font-bold">练习模式</div>
              <div className="text-green-200 text-xs">自适应练习</div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>
        
        {/* Quick Stats */}
        <div className="p-3 bg-black/20">
          <div className="text-xs text-gray-400 mb-2">当前水平</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(performanceData).map(([cat, stats]) => (
              <div 
                key={cat}
                className="px-2 py-1 rounded-lg text-xs"
                style={{ backgroundColor: CATEGORY_COLORS[cat] + '30' }}
              >
                <span style={{ color: CATEGORY_COLORS[cat] }}>{CATEGORY_LABELS[cat]}</span>
                <span className="text-white ml-1">{stats.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Weak spots */}
        {weakCategories.length > 0 && (
          <div className="px-4 py-2 bg-red-900/20 border-y border-red-500/30">
            <div className="text-xs text-red-400 mb-1">⚠️ 薄弱项</div>
            <div className="flex flex-wrap gap-1">
              {weakCategories.map(cat => (
                <span 
                  key={cat}
                  className="px-2 py-0.5 bg-red-900/50 rounded text-xs text-red-300"
                >
                  {CATEGORY_LABELS[cat]}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Practice modes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-sm text-gray-400 mb-2">选择练习模式</div>
          {Object.entries(PRACTICE_MODES).map(([key, mode]) => (
            <button
              key={key}
              onClick={() => setPracticeMode(key)}
              className={`w-full p-3 rounded-xl text-left transition-all ${
                practiceMode === key
                  ? 'bg-green-600/30 border-2 border-green-500'
                  : 'bg-slate-800 border-2 border-transparent hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{mode.icon}</span>
                <div>
                  <div className="text-white font-bold">{mode.name}</div>
                  <div className="text-gray-400 text-xs">{mode.description}</div>
                </div>
              </div>
            </button>
          ))}
          
          {/* Category selection for CATEGORY_BATTLE */}
          {practiceMode === 'CATEGORY_BATTLE' && (
            <div className="mt-4">
              <div className="text-sm text-gray-400 mb-2">选择分类</div>
              <div className="flex flex-wrap gap-2">
                {enabledCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategories(prev => 
                      prev.includes(cat) 
                        ? prev.filter(c => c !== cat)
                        : [...prev, cat]
                    )}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      selectedCategories.includes(cat)
                        ? 'text-white'
                        : 'bg-slate-700 text-gray-400'
                    }`}
                    style={{ 
                      backgroundColor: selectedCategories.includes(cat) 
                        ? CATEGORY_COLORS[cat] + '60' 
                        : undefined,
                      borderColor: CATEGORY_COLORS[cat],
                      borderWidth: '1px',
                    }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Start button */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={startPractice}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl text-white font-bold text-lg transition-all"
          >
            开始练习 🚀
          </button>
        </div>
      </div>
    );
  }
  
  // Active practice screen
  return (
    <div className="fixed bottom-36 right-4 z-40 w-80 sm:w-96 max-h-[80vh] bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-green-500/30 flex flex-col overflow-hidden">
      {/* Practice header */}
      <div className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{PRACTICE_MODES[practiceMode].icon}</span>
          <div>
            <div className="text-white font-bold text-sm">{PRACTICE_MODES[practiceMode].name}</div>
            <div className="text-green-200 text-xs">第 {questionIndex + 1} 题</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Timer */}
          {(practiceMode === 'TIMED_CHALLENGE' || practiceMode === 'MARATHON') && (
            <div className={`text-lg font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              {timeLeft}s
            </div>
          )}
          
          {/* Score */}
          <div className="text-right">
            <div className="text-green-300 font-bold">{score.correct}✓</div>
            <div className="text-red-300 text-xs">{score.incorrect}✗</div>
          </div>
          
          <button
            onClick={endPractice}
            className="text-white/80 hover:text-white text-lg"
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* Difficulty indicator */}
      <div className="px-3 py-1 bg-black/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">难度:</span>
          <span 
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={{ backgroundColor: DIFFICULTY_LEVELS[difficulty].color + '40', color: DIFFICULTY_LEVELS[difficulty].color }}
          >
            {DIFFICULTY_LEVELS[difficulty].name}
          </span>
        </div>
        {score.streak >= 3 && (
          <div className="text-yellow-400 text-xs font-bold animate-pulse">
            🔥 连击 x{score.streak}
          </div>
        )}
      </div>
      
      {/* Question */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentQuestion ? (
          <div>
            {/* Category & Question */}
            <div className="mb-4">
              <div 
                className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2"
                style={{ backgroundColor: (CATEGORY_COLORS[currentQuestion.category] || '#888') + '30', color: CATEGORY_COLORS[currentQuestion.category] || '#888' }}
              >
                {CATEGORY_LABELS[currentQuestion.category] || '综合'}
              </div>
              <div className="text-white text-lg font-bold leading-relaxed">
                {currentQuestion.question}
              </div>
              {currentQuestion.imageUrl && (
                <img 
                  src={currentQuestion.imageUrl} 
                  alt="题目配图" 
                  className="mt-3 max-h-32 rounded-lg object-contain"
                />
              )}
            </div>
            
            {/* Options */}
            <div className="space-y-2">
              {currentQuestion.options.map((option, idx) => {
                let btnClass = 'bg-slate-700 hover:bg-slate-600 border-slate-600';
                
                if (showResult) {
                  if (idx === currentQuestion.correctIndex) {
                    btnClass = 'bg-green-600 border-green-400 text-white';
                  } else if (idx === selectedAnswer && idx !== currentQuestion.correctIndex) {
                    btnClass = 'bg-red-900/50 border-red-700 text-gray-500';
                  } else {
                    btnClass = 'bg-slate-800 border-slate-700 text-gray-500';
                  }
                }
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    disabled={showResult}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all font-medium ${btnClass}`}
                  >
                    <span className="text-purple-300 mr-2 font-bold">
                      {['A', 'B', 'C', 'D'][idx]}.
                    </span>
                    {option}
                    {showResult && idx === currentQuestion.correctIndex && (
                      <span className="ml-2">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Result feedback */}
            {showResult && (
              <div className={`mt-4 p-3 rounded-xl ${selectedAnswer === currentQuestion.correctIndex ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                <div className="text-center">
                  <div className={`text-2xl mb-1 ${selectedAnswer === currentQuestion.correctIndex ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedAnswer === currentQuestion.correctIndex ? '🎉 正确！' : '😢 错误'}
                  </div>
                  <div className="text-gray-400 text-sm">
                    正确答案: {currentQuestion.options[currentQuestion.correctIndex]}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📚</div>
            <div className="text-white font-bold">题目加载中...</div>
          </div>
        )}
      </div>
      
      {/* Next button */}
      {showResult && (
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={advanceToNext}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl text-white font-bold transition-all"
          >
            下一题 →
          </button>
        </div>
      )}
      
      {/* Session summary (shown periodically) */}
      {questionIndex > 0 && questionIndex % 5 === 0 && !showResult && (
        <div className="p-3 bg-black/30 border-t border-slate-700">
          <div className="text-xs text-gray-400 mb-2">阶段统计</div>
          <div className="flex justify-around text-center">
            <div>
              <div className="text-green-400 font-bold">{sessionStats.accuracy}%</div>
              <div className="text-xs text-gray-500">准确率</div>
            </div>
            <div>
              <div className="text-white font-bold">{score.maxStreak}</div>
              <div className="text-xs text-gray-500">最高连击</div>
            </div>
            <div>
              <div className="text-yellow-400 font-bold">{DIFFICULTY_LEVELS[difficulty].name}</div>
              <div className="text-xs text-gray-500">当前难度</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
