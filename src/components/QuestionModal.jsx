import { useState, useEffect } from 'react';
import { useGameStore } from '../game/store';

export default function QuestionModal() {
  const currentQuestion = useGameStore(s => s.currentQuestion);
  const questionAnswered = useGameStore(s => s.questionAnswered);
  const questionTimer = useGameStore(s => s.questionTimer);
  const answerQuestion = useGameStore(s => s.answerQuestion);
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const ageTier = useGameStore(s => s.ageTier);
  const timerEnabled = useGameStore(s => s.timerEnabled);
  
  const currentPlayer = players[currentPlayerIndex];
  
  // TTS for kindergarten
  useEffect(() => {
    if (ageTier === 'kindergarten' && currentQuestion) {
      const utterance = new SpeechSynthesisUtterance(currentQuestion.question);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  }, [currentQuestion, ageTier]);
  
  if (!currentQuestion) return null;
  
  const timerPercent = (questionTimer / 15) * 100;
  const timerColor = questionTimer > 10 ? 'bg-green-500' : questionTimer > 5 ? 'bg-yellow-500' : 'bg-red-500';
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 w-[600px] max-w-[90vw] shadow-2xl border border-purple-500/30">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">📝</span>
            <div>
              <div className="text-purple-300 text-sm">知识问答</div>
              <div className="text-white font-bold text-lg">{currentPlayer?.name}</div>
            </div>
          </div>
          
          {timerEnabled && (
            <div className="flex flex-col items-end">
              <div className="text-gray-400 text-xs mb-1">剩余时间</div>
              <div className="text-3xl font-bold text-white">{questionTimer}s</div>
              <div className="w-32 h-2 bg-gray-700 rounded-full mt-1">
                <div
                  className={`h-full rounded-full transition-all ${timerColor}`}
                  style={{ width: `${timerPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Question */}
        <div className="bg-slate-700/50 rounded-2xl p-6 mb-6">
          <div className="text-yellow-300 text-xs uppercase tracking-wider mb-2">
            {currentQuestion.subject === 'math' ? '🔢 数学' :
             currentQuestion.subject === 'science' ? '🔬 科学' :
             currentQuestion.subject === 'general' ? '🌍 常识' : '📚 问题'}
          </div>
          <div className="text-white text-2xl font-bold leading-relaxed">
            {currentQuestion.question}
          </div>
        </div>
        
        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {currentQuestion.options.map((option, idx) => {
            const isCorrect = idx === currentQuestion.correctIndex;
            const isSelected = questionAnswered !== null && idx === currentQuestion.correctIndex;
            const isWrong = questionAnswered !== null && questionAnswered === 'incorrect' && idx !== currentQuestion.correctIndex;
            
            let btnClass = 'bg-slate-700 hover:bg-slate-600 border-slate-600';
            if (questionAnswered !== null) {
              if (isSelected) {
                btnClass = 'bg-green-600 border-green-400 text-white';
              } else if (isWrong) {
                btnClass = 'bg-red-900/50 border-red-700 text-gray-500';
              } else {
                btnClass = 'bg-slate-800 border-slate-700 text-gray-500';
              }
            }
            
            return (
              <button
                key={idx}
                onClick={() => questionAnswered === null && answerQuestion(idx)}
                disabled={questionAnswered !== null}
                className={`p-4 rounded-xl border-2 text-left transition-all font-bold text-lg ${btnClass}`}
              >
                <span className="text-purple-300 mr-2">
                  {['A', 'B', 'C', 'D'][idx]}.
                </span>
                {option}
              </button>
            );
          })}
        </div>
        
        {/* Result feedback */}
        {questionAnswered !== null && (
          <div className={`mt-6 p-4 rounded-xl text-center ${
            questionAnswered === 'correct' ? 'bg-green-900/50' : 'bg-red-900/50'
          }`}>
            <div className={`text-3xl mb-2 ${
              questionAnswered === 'correct' ? 'text-green-400' : 'text-red-400'
            }`}>
              {questionAnswered === 'correct' ? '🎉 正确！+' : '😢 错误！'}
            </div>
            <div className={`text-xl font-bold ${
              questionAnswered === 'correct' ? 'text-green-300' : 'text-red-300'
            }`}>
              {questionAnswered === 'correct' ? '+$100' : '-$50'}
            </div>
            <div className="text-gray-400 text-sm mt-2">
              正确答案: {currentQuestion.options[currentQuestion.correctIndex]}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
