/**
 * LessonPlanEditor - Create and edit lesson plans with assigned questions
 * 
 * Features:
 * - Create/edit/delete lesson plans
 * - Add questions from question bank
 * - Set difficulty, categories, due date
 * - Assign to students/classes
 */

import { useState, useMemo } from 'react';
import { useLessonPlanStore, LESSON_CATEGORIES } from './lessonPlanStore';
import { useGameStore } from '../../game/store';

const DIFFICULTY_OPTIONS = [
  { value: 'EASY', label: '🟢 入门', color: '#4ADE80' },
  { value: 'MEDIUM', label: '🟡 基础', color: '#FACC15' },
  { value: 'HARD', label: '🟠 挑战', color: '#FB923C' },
  { value: 'MASTER', label: '🔴 大师', color: '#F87171' },
];

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

export default function LessonPlanEditor() {
  const [isOpen, setIsOpen] = useState(false);

  const lessonPlans = useLessonPlanStore(s => s.lessonPlans);
  const selectedPlanId = useLessonPlanStore(s => s.selectedPlanId);
  const createPlan = useLessonPlanStore(s => s.createPlan);
  const selectPlan = useLessonPlanStore(s => s.selectPlan);
  const deletePlan = useLessonPlanStore(s => s.deletePlan);
  const getPlan = useLessonPlanStore(s => s.getPlan);
  const updatePlan = useLessonPlanStore(s => s.updatePlan);
  const publishPlan = useLessonPlanStore(s => s.publishPlan);
  const getPlansByStatus = useLessonPlanStore(s => s.getPlansByStatus);

  const customQuestions = useGameStore(s => s.customQuestions);

  const selectedPlan = selectedPlanId ? getPlan(selectedPlanId) : null;
  const plansByStatus = getPlansByStatus();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-bold"
      >
        📚 作业管理
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">📚 作业管理系统</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"
          >
            关闭
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar - plan list */}
          <div className="w-64 border-r border-gray-700 p-4 overflow-y-auto">
            <button
              onClick={() => createPlan()}
              className="w-full mb-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-bold"
            >
              + 新建作业
            </button>

            {/* Draft plans */}
            <PlanSection
              title="📝 草稿"
              plans={plansByStatus.draft}
              selectedId={selectedPlanId}
              onSelect={selectPlan}
            />

            {/* Published plans */}
            <PlanSection
              title="✅ 已发布"
              plans={plansByStatus.published}
              selectedId={selectedPlanId}
              onSelect={selectPlan}
            />

            {/* Archived plans */}
            <PlanSection
              title="📦 已归档"
              plans={plansByStatus.archived}
              selectedId={selectedPlanId}
              onSelect={selectPlan}
            />
          </div>

          {/* Right side - plan editor */}
          <div className="flex-1 p-4 overflow-y-auto">
            {selectedPlan ? (
              <PlanEditorPanel
                plan={selectedPlan}
                onUpdate={(updates) => updatePlan(selectedPlan.id, updates)}
                onPublish={() => publishPlan(selectedPlan.id)}
                onDelete={() => {
                  deletePlan(selectedPlan.id);
                  setIsOpen(false);
                }}
                customQuestions={customQuestions}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                选择一个作业进行编辑，或创建新作业
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Plan section in sidebar
function PlanSection({ title, plans, selectedId, onSelect }) {
  if (!plans.length) return null;

  return (
    <div className="mb-4">
      <h3 className="text-sm text-gray-400 mb-2">{title}</h3>
      <div className="space-y-1">
        {plans.map(plan => (
          <button
            key={plan.id}
            onClick={() => onSelect(plan.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
              selectedId === plan.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="font-medium truncate">{plan.title || '(无标题)'}</div>
            <div className="text-xs text-gray-400">
              {plan.questions.length} 题 · {plan.categories?.length || 0} 分类
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Plan editor panel
function PlanEditorPanel({ plan, onUpdate, onPublish, onDelete, customQuestions }) {
  const [newTitle, setNewTitle] = useState(plan.title);
  const [newDescription, setNewDescription] = useState(plan.description);
  const [newDifficulty, setNewDifficulty] = useState(plan.difficulty);
  const [newDueDate, setNewDueDate] = useState(plan.dueDate || '');
  const [selectedCategories, setSelectedCategories] = useState(plan.categories || []);
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);

  const handleSaveTitle = () => {
    onUpdate({ title: newTitle, description: newDescription });
  };

  const handleDifficultyChange = (diff) => {
    setNewDifficulty(diff);
    onUpdate({ difficulty: diff });
  };

  const handleDueDateChange = (date) => {
    setNewDueDate(date);
    onUpdate({ dueDate: date || null });
  };

  const toggleCategory = (cat) => {
    const newCats = selectedCategories.includes(cat)
      ? selectedCategories.filter(c => c !== cat)
      : [...selectedCategories, cat];
    setSelectedCategories(newCats);
    onUpdate({ categories: newCats });
  };

  const handleRemoveQuestion = (qId) => {
    onUpdate({ questions: plan.questions.filter(id => id !== qId) });
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="bg-gray-700/50 rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-4">📋 基本信息</h3>
        
        <div className="mb-4">
          <label className="text-gray-300 text-sm mb-1 block">作业标题</label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={handleSaveTitle}
            className="w-full bg-gray-600 text-white rounded-lg px-4 py-2"
            placeholder="输入作业标题..."
          />
        </div>

        <div className="mb-4">
          <label className="text-gray-300 text-sm mb-1 block">描述说明</label>
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            onBlur={handleSaveTitle}
            className="w-full bg-gray-600 text-white rounded-lg px-4 py-2 h-20"
            placeholder="作业描述（可选）..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-300 text-sm mb-1 block">难度等级</label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleDifficultyChange(opt.value)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    newDifficulty === opt.value
                      ? 'text-black'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  style={{ backgroundColor: newDifficulty === opt.value ? opt.color : undefined }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-gray-300 text-sm mb-1 block">截止日期</label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="w-full bg-gray-600 text-white rounded-lg px-4 py-2"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-gray-700/50 rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-4">🏷️ 知识分类</h3>
        <div className="flex flex-wrap gap-2">
          {LESSON_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-1 rounded text-sm ${
                selectedCategories.includes(cat)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div className="bg-gray-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">❓ 题目列表 ({plan.questions?.length || 0})</h3>
          <button
            onClick={() => setShowQuestionPicker(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm"
          >
            + 添加题目
          </button>
        </div>

        {plan.questions?.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {plan.questions.map((qId, idx) => {
              const q = customQuestions.find(q => q.id === qId);
              return (
                <div key={qId} className="flex items-center gap-3 bg-gray-600/50 rounded-lg p-3">
                  <span className="text-gray-400 text-sm w-6">{idx + 1}.</span>
                  <div className="flex-1">
                    <div className="text-white text-sm">
                      {q?.question?.substring(0, 50) || `题目 ${qId}`}
                      {(q?.question?.length || 0) > 50 ? '...' : ''}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {q?.category && CATEGORY_LABELS[q.category]} · {q?.tier}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveQuestion(qId)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    删除
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-400 text-center py-8">
            暂无题目，请添加题目
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={onPublish}
          disabled={!plan.title || plan.questions?.length === 0}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-bold"
        >
          发布作业
        </button>
        <button
          onClick={onDelete}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold"
        >
          删除
        </button>
      </div>

      {/* Question Picker Modal */}
      {showQuestionPicker && (
        <QuestionPicker
          questions={customQuestions}
          selectedIds={plan.questions || []}
          onSelect={(ids) => {
            onUpdate({ questions: [...(plan.questions || []), ...ids] });
            setShowQuestionPicker(false);
          }}
          onClose={() => setShowQuestionPicker(false)}
        />
      )}
    </div>
  );
}

// Question picker modal
function QuestionPicker({ questions, selectedIds, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set(selectedIds));

  const filtered = useMemo(() => {
    if (!search) return questions.slice(0, 50);
    const q = search.toLowerCase();
    return questions.filter(item => 
      item.question?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [questions, search]);

  const toggleSelect = (id) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelected(newSet);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">选择题目</h3>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索题目..."
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filtered.map((q, idx) => (
              <div
                key={q.id || idx}
                className={`p-3 rounded-lg cursor-pointer ${
                  selected.has(q.id) ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
                onClick={() => toggleSelect(q.id)}
              >
                <div className="text-white text-sm">
                  {q.question?.substring(0, 60)}{q.question?.length > 60 ? '...' : ''}
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  {q.category && CATEGORY_LABELS[q.category]} · {q.tier} · 正确答案: {q.options?.[q.correctIndex]}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 flex items-center justify-between">
          <span className="text-gray-300">已选择: {selected.size} 题</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"
            >
              取消
            </button>
            <button
              onClick={() => onSelect([...selected])}
              disabled={selected.size === 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg text-white font-bold"
            >
              添加 ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}