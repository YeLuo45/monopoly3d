import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameStore } from '../../game/store';
import { BOARD_CONFIG } from '../../game/boardConfig';

// Category labels
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

// AI Assistant personality modes
const AI_MODES = {
  TUTOR: {
    name: '学习导师',
    icon: '🎓',
    color: '#A78BFA',
    description: '详细讲解知识点，帮助理解',
  },
  HELPER: {
    name: '游戏助手',
    icon: '🎮',
    color: '#4ECDC4',
    description: '提供游戏策略和技巧',
  },
  FRIEND: {
    name: '小伙伴',
    icon: '🤗',
    color: '#FF6B6B',
    description: '轻松聊天，鼓励互动',
  },
};

// Suggested questions based on context
const SUGGESTED_QUESTIONS = {
  property: [
    '这个地块值多少钱？',
    '要不要买这块地？',
    '租金是怎么计算的？',
  ],
  question: [
    '这道题怎么做？',
    '有没有解题技巧？',
    '正确答案是什么？',
  ],
  general: [
    '今天的游戏我表现怎么样？',
    '我应该先做什么？',
    '怎么才能赢？',
  ],
};

// AI response templates
const AI_RESPONSES = {
  property: {
    buy: (tile) => `这块「${tile?.name || '地块'}」位置不错！\n\n价格：$${tile?.price || 0}\n租金：$${tile?.rent || 0}\n\n💡 建议：如果你的资金充足，买下来可以增加收入来源！但要注意别花光所有钱哦~`,
    dont_buy: (tile) => `这块「${tile?.name || '地块'}」目前可能不是最佳选择。\n\n原因：\n• 资金可能需要留作他用\n• 这个位置的人流量不是很高\n\n💡 建议：先把钱攒着，等待更好的机会！`,
    build: (tile) => `在这块地上建房子是个不错的选择！\n\n「${tile?.name || '地块'}」\n当前房价：$${tile?.price || 0}\n建造费用：$50/栋\n\n💡 建议：当你拥有同一颜色的所有地块时，建房可以大幅提高租金收入！`,
  },
  question: {
    hint: (category) => `这是一道${CATEGORY_LABELS[category] || '综合'}题目~ \n\n💡 小提示：\n• 仔细阅读题目要求\n• 注意题目中的关键词\n• 可以用排除法先去掉明显错误的选项\n\n加油！你行的！🌟`,
    encourage: `别紧张，你已经很努力了！\n\n无论结果如何，这都是一个学习的好机会。\n答对了开心，答错了也没关系，都是成长的一部分~ 💪`,
  },
  progress: (stats) => {
    const accuracy = stats.totalQuestions > 0 
      ? Math.round((stats.correctQuestions / stats.totalQuestions) * 100) 
      : 0;
    return `让我看看你的表现...\n\n📊 今日战绩：\n• 正确率：${accuracy}%\n• 答题数：${stats.totalQuestions}\n• 答对：${stats.correctQuestions}题\n• 房产：${stats.propertiesBought}处\n\n${accuracy >= 80 ? '🌟 太棒了！继续保持！' : accuracy >= 60 ? '💪 不错的表现，再接再厉！' : '📚 继续加油，你一定能进步！'}`;
  },
  general: {
    greeting: `你好呀！我是你的AI学习助手 🎓\n\n我可以帮你：\n• 解答游戏中的疑问\n• 提供学习方面的帮助\n• 给予鼓励和支持\n\n有什么想问的吗？`,
    strategy: `大富翁致胜攻略 📈\n\n1️⃣ 前期：多买地，少花钱\n2️⃣ 中期：建造房屋，提高收入\n3️⃣ 后期：巩固优势，等待对手犯错\n\n还有问题吗？随时问我哦！`,
  },
};

/**
 * AIAssistant - Chat UI for AI-powered help during gameplay
 * Provides contextual assistance based on game state
 */
export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [aiMode, setAiMode] = useState('TUTOR');
  const [isTyping, setIsTyping] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Game state
  const currentQuestion = useGameStore(s => s.currentQuestion);
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const phase = useGameStore(s => s.phase);
  const gameStats = useGameStore(s => s.gameStats);
  
  const currentPlayer = players[currentPlayerIndex];
  
  // Calculate stats
  const stats = useMemo(() => {
    const questionsAnswered = gameStats.questionsAnswered || [];
    return {
      totalQuestions: questionsAnswered.length,
      correctQuestions: questionsAnswered.filter(q => q.correct).length,
      propertiesBought: gameStats.propertiesBought?.length || 0,
    };
  }, [gameStats]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  // Initialize with greeting
  const initializeChat = useCallback(() => {
    setHasInitialized(true);
    setMessages([
      {
        id: 'init',
        type: 'ai',
        content: AI_RESPONSES.general.greeting,
        timestamp: Date.now(),
      },
    ]);
  }, []);
  
  useEffect(() => {
    if (isOpen && !hasInitialized) {
      initializeChat();
    }
    if (!isOpen) {
      setHasInitialized(false);
    }
  }, [isOpen, hasInitialized, initializeChat]);
  
  // Get contextual suggestions
  const getContextualSuggestions = useCallback(() => {
    if (phase === 'question' && currentQuestion) {
      return SUGGESTED_QUESTIONS.question;
    }
    if (phase === 'buy_property') {
      return SUGGESTED_QUESTIONS.property;
    }
    return SUGGESTED_QUESTIONS.general;
  }, [phase, currentQuestion]);
  
  // Generate AI response
  const generateResponse = useCallback((userMessage) => {
    const lowerMsg = userMessage.toLowerCase();
    
    // Check for property-related queries
    if (lowerMsg.includes('买') || lowerMsg.includes('地块') || lowerMsg.includes('地')) {
      if (currentPlayer) {
        const tile = BOARD_CONFIG[currentPlayer.position];
        return AI_RESPONSES.property.buy(tile);
      }
    }
    
    // Check for question-related queries
    if (lowerMsg.includes('题') || lowerMsg.includes('怎么') || lowerMsg.includes('做')) {
      if (currentQuestion) {
        return AI_RESPONSES.question.hint(currentQuestion.category);
      }
      return AI_RESPONSES.question.encourage;
    }
    
    // Check for progress/stats queries
    if (lowerMsg.includes('表现') || lowerMsg.includes('成绩') || lowerMsg.includes('统计')) {
      return AI_RESPONSES.progress(stats);
    }
    
    // Check for strategy queries
    if (lowerMsg.includes('策略') || lowerMsg.includes('怎么赢') || lowerMsg.includes('技巧')) {
      return AI_RESPONSES.general.strategy;
    }
    
    // Check for encouragement requests
    if (lowerMsg.includes('加油') || lowerMsg.includes('鼓励') || lowerMsg.includes('难过')) {
      return AI_RESPONSES.question.encourage;
    }
    
    // Default response based on mode
    if (aiMode === 'TUTOR') {
      return `这个问题很有意思！\n\n作为学习导师，我可以帮你：\n• 解释游戏规则\n• 分析当前局势\n• 提供学习建议\n\n试着问我：「我的表现怎么样？」或者「要不要买这块地？」`;
    }
    if (aiMode === 'HELPER') {
      return `让我来帮你分析一下当前局势！\n\n你可以问我：\n• 「要不要买这块地？」\n• 「我应该先做什么？」\n• 「怎么才能赢？」\n\n随时为你服务！ 🎮`;
    }
    return `嘿嘿，我听不太懂你说的~\n\n你可以问我：\n• 我的表现怎么样？\n• 这道题怎么做？\n• 要不要买这块地？\n\n我会尽力帮助你的！ 🤗`;
  }, [currentQuestion, currentPlayer, stats, aiMode]);
  
  // Handle send message
  const handleSend = useCallback(() => {
    if (!inputValue.trim() || isTyping) return;
    
    const userMsg = inputValue.trim();
    
    // Add user message
    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        type: 'user',
        content: userMsg,
        timestamp: Date.now(),
      },
    ]);
    
    setInputValue('');
    setIsTyping(true);
    
    // Simulate AI thinking
    setTimeout(() => {
      const response = generateResponse(userMsg);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: response,
          timestamp: Date.now(),
        },
      ]);
      setIsTyping(false);
    }, 800 + Math.random() * 400);
  }, [inputValue, isTyping, generateResponse]);
  
  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion) => {
    setInputValue(suggestion);
    handleSend();
  }, [handleSend]);
  
  // Handle key press
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);
  
  // Toggle mode
  const handleModeChange = useCallback((mode) => {
    setAiMode(mode);
    const modeInfo = AI_MODES[mode];
    setMessages(prev => [
      ...prev,
      {
        id: `system-${Date.now()}`,
        type: 'system',
        content: `切换到${modeInfo.icon} ${modeInfo.name}模式：${modeInfo.description}`,
        timestamp: Date.now(),
      },
    ]);
  }, []);
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        title="AI学习助手"
      >
        <span className="text-2xl">🤖</span>
        {/* Notification dot for new messages */}
        {messages.length > 1 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-24 right-4 z-40 w-80 sm:w-96 max-h-[500px] bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-purple-500/30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <div className="text-white font-bold text-sm">AI学习助手</div>
            <div className="text-purple-200 text-xs">{AI_MODES[aiMode].name}</div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/80 hover:text-white text-xl"
        >
          ✕
        </button>
      </div>
      
      {/* Mode selector */}
      <div className="flex gap-1 p-2 bg-black/20">
        {Object.entries(AI_MODES).map(([key, mode]) => (
          <button
            key={key}
            onClick={() => handleModeChange(key)}
            className={`flex-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
              aiMode === key 
                ? 'text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
            style={{ 
              backgroundColor: aiMode === key ? mode.color + '40' : 'transparent',
            }}
          >
            {mode.icon} {mode.name}
          </button>
        ))}
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                msg.type === 'user'
                  ? 'bg-purple-600 text-white rounded-br-sm'
                  : msg.type === 'system'
                  ? 'bg-gray-700/50 text-gray-400 text-xs italic'
                  : 'bg-slate-700 text-white rounded-bl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.content}
              </div>
              <div className={`text-xs mt-1 ${
                msg.type === 'user' ? 'text-purple-200' : 'text-gray-500'
              }`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-700 text-white rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Suggestions */}
      {messages.length <= 2 && !isTyping && (
        <div className="px-3 pb-2">
          <div className="text-xs text-gray-500 mb-2">快捷问题：</div>
          <div className="flex flex-wrap gap-1">
            {getContextualSuggestions().map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-xs text-purple-200 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="p-3 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入你的问题..."
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 focus:bg-slate-600 rounded-xl text-white placeholder-gray-400 text-sm outline-none transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl text-white font-bold transition-colors"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

// Export mode info for external use
export { AI_MODES };
