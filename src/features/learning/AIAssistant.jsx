import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameStore } from '../../game/store';
import { BOARD_CONFIG } from '../../game/boardConfig';
import { t } from '../../i18n';

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
    nameKey: 'learning_tutor_mode',
    icon: '🎓',
    color: '#A78BFA',
    descKey: 'tutor_explain',
  },
  HELPER: {
    nameKey: 'game_helper_mode',
    icon: '🎮',
    color: '#4ECDC4',
    descKey: 'helper_provide_tips',
  },
  FRIEND: {
    nameKey: 'buddy_mode',
    icon: '🤗',
    color: '#FF6B6B',
    descKey: 'buddy_chat',
  },
};

// Suggested questions based on context
const SUGGESTED_QUESTIONS = {
  property: [
    'property_worth',
    'should_buy_land',
    'rent_calculation',
  ],
  question: [
    'how_to_solve_problem',
    'any_tips_label',
    'correct_answer_label',
  ],
  general: [
    'hows_my_performance',
    'what_first',
    'how_to_win_game',
  ],
};

// AI response templates
const AI_RESPONSES = {
  property: {
    buy: (tile) => `${t('this_is_category_question')} ${tile?.name || t('unknown')}${t('question_concern')}\n\n${t('price')}: $${tile?.price || 0}\n${t('rent')}: $${tile?.rent || 0}\n\n💡 ${t('suggestions_improvement')}: ${t('try_buy_property_label')}!`,
    dont_buy: (tile) => `${tile?.name || t('unknown')} ${t('question_concern')}\n\n💡 ${t('suggestions_improvement')}: ${t('save_money_buy_land')}`,
    build: (tile) => `${t('this_is_category_question')} ${tile?.name || t('unknown')}${t('question_concern')}\n\n${t('rent')}: $${tile?.rent || 0}\n\n💡 ${t('suggestions_improvement')}: ${t('try_buy_property_label')}!`,
  },
  question: {
    hint: (category) => `${t('this_is_category_question')} ${CATEGORY_LABELS[category] || t('category_comprehensive')}${t('question_concern')} \n\n💡 ${t('any_tips_label')}:\n• ${t('try_ask_me')}\n\n💪 ${t('dont_worry_encourage')}`,
    encourage: `${t('dont_worry_encourage')}\n\n💪 ${t('加油_keep_learning')}`,
  },
  progress: (stats) => {
    const accuracy = stats.totalQuestions > 0 
      ? Math.round((stats.correctQuestions / stats.totalQuestions) * 100) 
      : 0;
    return `${t('let_me_check_performance')}\n\n${t('today_stats')}\n• ${t('accuracy')}: ${accuracy}%\n• ${t('questions_answered_label')}: ${stats.totalQuestions}\n• ${t('correct_answers_label')}: ${stats.correctQuestions}\n• ${t('property_count')}: ${stats.propertiesBought}\n\n${accuracy >= 80 ? t('great_keepgoing') : accuracy >= 60 ? t('good_job_continue') : t('加油_keep_learning')}`;
  },
  general: {
    greeting: `${t('hello_ai_helper')}\n\n${t('as_tutor_can_help')}\n\n${t('try_ask_me')}`,
    strategy: `${t('monopoly_strategy')}\n\n1️⃣ ${t('weakspots_tab')}: ${t('try_buy_property_label')}\n2️⃣ ${t('strengthen_practice_label')}: ${t('save_money_buy_land')}\n3️⃣ ${t('control_game_time_label')}: ${t('short_game_tips')}`,
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
        content: `${t('switch_to_mode')}${t(modeInfo.nameKey)} ${t('mode_description')}${t(modeInfo.descKey)}`,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        title={t('ai_learning_assistant')}
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
            <div className="text-white font-bold text-sm">{t('ai_learning_assistant')}</div>
            <div className="text-purple-200 text-xs">{t(AI_MODES[aiMode].nameKey)}</div>
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
            {mode.icon} {t(mode.nameKey)}
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
          <div className="text-xs text-gray-500 mb-2">{t('quick_questions')}</div>
          <div className="flex flex-wrap gap-1">
            {getContextualSuggestions().map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-xs text-purple-200 transition-colors"
              >
                {t(suggestion)}
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
            placeholder={t('type_your_question')}
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
