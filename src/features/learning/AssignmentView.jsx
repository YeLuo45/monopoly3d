/**
 * AssignmentView - Student view for assigned lesson plans
 * 
 * Features:
 * - View assigned homework/assignments
 * - Track completion status and scores
 * - Practice mode for assigned questions
 */

import { useState, useMemo } from 'react';
import { useLessonPlanStore } from './lessonPlanStore';
import { useGameStore } from '../../game/store';
import PracticeMode from './PracticeMode';

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

const DIFFICULTY_COLORS = {
  EASY: '#4ADE80',
  MEDIUM: '#FACC15',
  HARD: '#FB923C',
  MASTER: '#F87171',
};

export default function AssignmentView() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [showPractice, setShowPractice] = useState(false);

  const lessonPlans = useLessonPlanStore(s => s.lessonPlans);
  const getCompletionRate = useLessonPlanStore(s => s.getCompletionRate);
  const getAverageScore = useLessonPlanStore(s => s.getAverageScore);

  // Get student ID (in real app, this would come from auth)
  const studentId = 'student_default';

  // Filter published plans assigned to this student (or all if no specific assignment)
  const assignedPlans = useMemo(() => {
    return lessonPlans
      .filter(p => p.status === 'published')
      .filter(p => {
        // If no specific assignments, show all published
        if (!p.assignedStudents?.length) return true;
        return p.assignedStudents.includes(studentId) || p.assignedStudents.includes('all');
      })
      .sort((a, b) => {
        // Sort by due date (earliest first), then by creation date
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [lessonPlans, studentId]);

  // Get completion status for selected plan
  const selectedPlan = useMemo(() => {
    return lessonPlans.find(p => p.id === selectedPlanId);
  }, [lessonPlans, selectedPlanId]);

  // Check if completed
  const isCompleted = selectedPlan?.completions?.[studentId];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold"
      >
        📝 我的作业 {assignedPlans.length > 0 && `(${assignedPlans.length})`}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">📝 我的作业</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"
          >
            关闭
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left - assignment list */}
          <div className="w-72 border-r border-gray-700 p-4 overflow-y-auto">
            <h3 className="text-gray-400 text-sm mb-3">待完成作业</h3>
            <div className="space-y-2">
              {assignedPlans.length > 0 ? assignedPlans.map(plan => {
                const completion = plan.completions?.[studentId];
                const isDone = !!completion;
                const isSelected = selectedPlanId === plan.id;

                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full text-left p-3 rounded-xl ${
                      isSelected ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
                    } ${isDone ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">
                          {plan.title || '(无标题)'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {plan.questions?.length || 0} 题 · {plan.categories?.length || 0} 分类
                        </div>
                      </div>
                      {isDone && (
                        <span className="text-green-400 text-lg">✓</span>
                      )}
                    </div>

                    {/* Due date warning */}
                    {plan.dueDate && !isDone && (
                      <DueDateBadge dueDate={plan.dueDate} />
                    )}

                    {/* Score if completed */}
                    {completion && (
                      <div className="mt-2 text-sm">
                        <span className="text-yellow-400 font-bold">
                          {completion.score}%
                        </span>
                        <span className="text-gray-400 text-xs ml-2">
                          {new Date(completion.completedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </button>
                );
              }) : (
                <div className="text-gray-500 text-center py-8 text-sm">
                  暂无作业
                </div>
              )}
            </div>

            {/* Completed assignments section */}
            <h3 className="text-gray-400 text-sm mb-3 mt-6">已完成</h3>
            <div className="space-y-2">
              {lessonPlans
                .filter(p => p.status !== 'archived' && p.completions?.[studentId])
                .filter(p => !assignedPlans.some(ap => ap.id === p.id))
                .map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className="w-full text-left p-3 rounded-xl bg-gray-700/50 hover:bg-gray-600/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-white text-sm truncate">{plan.title || '(无标题)'}</span>
                    </div>
                    <div className="text-xs text-yellow-400 font-medium mt-1">
                      {plan.completions[studentId].score}% · {new Date(plan.completions[studentId].completedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Right - assignment details */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedPlan ? (
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedPlan.title || '(无标题)'}</h3>
                  {selectedPlan.description && (
                    <p className="text-gray-400 mt-2">{selectedPlan.description}</p>
                  )}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-4">
                  <StatCard
                    label="题目数"
                    value={selectedPlan.questions?.length || 0}
                    icon="❓"
                  />
                  <StatCard
                    label="分类数"
                    value={selectedPlan.categories?.length || 0}
                    icon="🏷️"
                  />
                  <StatCard
                    label="难度"
                    value={selectedPlan.difficulty || 'MEDIUM'}
                    icon="⚡"
                    color={DIFFICULTY_COLORS[selectedPlan.difficulty] || '#FACC15'}
                  />
                  <StatCard
                    label="完成率"
                    value={`${getCompletionRate(selectedPlan.id)}%`}
                    icon="📊"
                  />
                </div>

                {/* Due date */}
                {selectedPlan.dueDate && (
                  <div className="flex items-center gap-2 bg-gray-700/50 rounded-xl p-4">
                    <span className="text-xl">📅</span>
                    <div>
                      <div className="text-gray-400 text-sm">截止日期</div>
                      <div className="text-white font-medium">
                        {new Date(selectedPlan.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                    {isCompleted && (
                      <span className="ml-auto text-green-400 font-bold">✓ 已完成</span>
                    )}
                  </div>
                )}

                {/* Categories */}
                {selectedPlan.categories?.length > 0 && (
                  <div>
                    <h4 className="text-gray-400 text-sm mb-2">涉及分类</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPlan.categories.map(cat => (
                        <span
                          key={cat}
                          className="px-3 py-1 bg-blue-600/30 text-blue-300 rounded-full text-sm"
                        >
                          {CATEGORY_LABELS[cat] || cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Questions preview */}
                <div>
                  <h4 className="text-gray-400 text-sm mb-2">作业内容预览</h4>
                  <div className="bg-gray-700/50 rounded-xl p-4">
                    <div className="text-white text-sm">
                      共 {selectedPlan.questions?.length || 0} 道题目
                    </div>
                    {selectedPlan.questions?.length > 0 && (
                      <div className="mt-3 text-xs text-gray-400">
                        点击下方按钮开始答题
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                  {isCompleted ? (
                    <div className="flex items-center gap-4">
                      <div className="px-6 py-3 bg-green-600/30 rounded-xl text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {selectedPlan.completions[studentId].score}%
                        </div>
                        <div className="text-xs text-gray-400">得分</div>
                      </div>
                      <button
                        onClick={() => setShowPractice(true)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-bold"
                      >
                        重新练习
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPractice(true)}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-bold"
                    >
                      开始答题
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                选择一个作业查看详情
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Practice mode overlay */}
      {showPractice && selectedPlan && (
        <PracticeModeWithPlan
          plan={selectedPlan}
          onClose={() => setShowPractice(false)}
          onComplete={(score) => {
            useLessonPlanStore.getState().recordCompletion(selectedPlan.id, studentId, { score });
            setShowPractice(false);
          }}
        />
      )}
    </div>
  );
}

// Stat card component
function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-gray-700/50 rounded-xl p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div
        className="text-xl font-bold"
        style={{ color: color || 'white' }}
      >
        {value}
      </div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

// Due date badge with color coding
function DueDateBadge({ dueDate }) {
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return <span className="text-xs text-red-400 mt-1 block">已逾期</span>;
  }
  if (daysLeft === 0) {
    return <span className="text-xs text-orange-400 mt-1 block">今天截止</span>;
  }
  if (daysLeft <= 2) {
    return <span className="text-xs text-yellow-400 mt-1 block">还有 {daysLeft} 天</span>;
  }
  return <span className="text-xs text-gray-400 mt-1 block">{daysLeft} 天后截止</span>;
}

// Practice mode wrapper for lesson plan
function PracticeModeWithPlan({ plan, onClose, onComplete }) {
  const customQuestions = useGameStore(s => s.customQuestions);

  // Filter questions to only include those in the lesson plan
  const planQuestionIds = plan.questions || [];
  const planQuestions = planQuestionIds
    .map(id => customQuestions.find(q => q.id === id))
    .filter(Boolean);

  // Create a wrapper around PracticeMode that uses plan questions
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const currentQ = planQuestions[currentIndex];
  const total = planQuestions.length;

  const handleAnswer = (correct) => {
    if (correct) setScore(s => s + 1);
    setAnswered(a => a + 1);

    if (currentIndex < total - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setShowResult(true);
    }
  };

  if (showResult) {
    const finalScore = Math.round((score / total) * 100);
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
        <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-white mb-2">作业完成！</h3>
          <div className="text-4xl font-bold text-yellow-400 mb-4">
            {finalScore}%
          </div>
          <div className="text-gray-400 mb-6">
            正确 {score}/{total} 题
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setScore(0);
                setAnswered(0);
                setShowResult(false);
              }}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl text-white"
            >
              再练一次
            </button>
            <button
              onClick={() => onComplete(finalScore)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl text-white font-bold"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
        <div className="text-white text-center">
          <p>暂无题目数据</p>
          <button onClick={onClose} className="mt-4 px-6 py-2 bg-gray-600 rounded-lg">
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="text-white">
            <span className="font-bold">{currentIndex + 1}</span>
            <span className="text-gray-400"> / {total}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"
          >
            退出
          </button>
        </div>

        {/* Question */}
        <div className="p-6">
          <div className="mb-4">
            <span className={`px-2 py-1 rounded text-xs ${
              plan.difficulty === 'EASY' ? 'bg-green-600/30 text-green-300' :
              plan.difficulty === 'MEDIUM' ? 'bg-yellow-600/30 text-yellow-300' :
              plan.difficulty === 'HARD' ? 'bg-orange-600/30 text-orange-300' :
              'bg-red-600/30 text-red-300'
            }`}>
              {plan.difficulty}
            </span>
            <span className="ml-2 text-xs text-gray-400">
              {CATEGORY_LABELS[currentQ.category] || currentQ.category}
            </span>
          </div>

          <h3 className="text-xl text-white font-medium mb-6">
            {currentQ.question}
          </h3>

          {/* Options */}
          <div className="space-y-3">
            {currentQ.options?.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(idx === currentQ.correctIndex)}
                className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-xl text-white transition-colors"
              >
                <span className="text-gray-400 mr-3">{String.fromCharCode(65 + idx)}.</span>
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}