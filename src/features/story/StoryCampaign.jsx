/**
 * StoryCampaign - AI-driven narrative campaign UI
 * 
 * Features:
 * - Chapter selection with progress
 * - Mission tracking
 * - Story event choices
 * - Reward display
 */

import { useState, useEffect } from 'react';
import { useStoryModeStore, STORY_CHAPTERS } from './storyModeStore';
import { t } from '../../i18n';

export default function StoryCampaign({ onClose }) {
  const [activeView, setActiveView] = useState('chapters'); // chapters | missions | rewards
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const chapters = useStoryModeStore(s => s.chapters);
  const currentChapterId = useStoryModeStore(s => s.currentChapterId);
  const activeEvent = useStoryModeStore(s => s.activeEvent);
  const storyStats = useStoryModeStore(s => s.storyStats);
  const unlockedTitles = useStoryModeStore(s => s.unlockedTitles);
  const earnedTrophies = useStoryModeStore(s => s.earnedTrophies);
  const earnedItems = useStoryModeStore(s => s.earnedItems);
  const getCampaignProgress = useStoryModeStore(s => s.getCampaignProgress);
  const makeChoice = useStoryModeStore(s => s.makeChoice);
  const dismissEvent = useStoryModeStore(s => s.dismissEvent);
  const setCurrentChapter = useStoryModeStore(s => s.setCurrentChapter);

  // Memoize progress to prevent recalculation
  const progress = useStoryModeStore(s => {
    const chapters = s.chapters;
    const totalMissions = chapters.reduce((sum, c) => sum + c.missions.length, 0);
    const completedMissions = chapters.reduce(
      (sum, c) => sum + c.missions.filter(m => m.isCompleted).length, 0
    );
    return {
      chaptersCompleted: chapters.filter(c => c.isCompleted).length,
      totalChapters: chapters.length,
      missionsCompleted: completedMissions,
      totalMissions,
      progressPercent: totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0,
    };
  });

  // Auto-select first unlocked non-completed chapter - defer to avoid render loop
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!selectedChapter) {
        const firstUnlocked = chapters.find(c => c.isUnlocked && !c.isCompleted);
        if (firstUnlocked) setSelectedChapter(firstUnlocked.id);
      }
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedChapter, chapters]);

  const selectedChapterData = chapters.find(c => c.id === selectedChapter);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <div>
              <h2 className="text-xl font-bold text-white">故事模式</h2>
              <p className="text-gray-400 text-sm">
                进度: {progress.missionsCompleted}/{progress.totalMissions} 任务 | {progress.progressPercent}%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"
          >
            关闭
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>第一章</span>
            <span>第二章</span>
            <span>第三章</span>
            <span>第四章</span>
            <span>第五章</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveView('chapters')}
            className={`flex-1 py-3 text-center font-bold transition-colors ${
              activeView === 'chapters'
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📚 章节
          </button>
          <button
            onClick={() => setActiveView('missions')}
            className={`flex-1 py-3 text-center font-bold transition-colors ${
              activeView === 'missions'
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🎯 任务
          </button>
          <button
            onClick={() => setActiveView('rewards')}
            className={`flex-1 py-3 text-center font-bold transition-colors ${
              activeView === 'rewards'
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🏆 成就
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeView === 'chapters' && (
            <ChaptersView
              chapters={chapters}
              selectedChapter={selectedChapter}
              onSelectChapter={(id) => {
                setSelectedChapter(id);
                setCurrentChapter(id);
              }}
            />
          )}
          {activeView === 'missions' && selectedChapterData && (
            <MissionsView chapter={selectedChapterData} />
          )}
          {activeView === 'rewards' && (
            <RewardsView
              storyStats={storyStats}
              unlockedTitles={unlockedTitles}
              earnedTrophies={earnedTrophies}
              earnedItems={earnedItems}
            />
          )}
        </div>

        {/* Active Event Modal */}
        {activeEvent && (
          <StoryEventModal
            event={activeEvent}
            onChoice={makeChoice}
            onDismiss={dismissEvent}
          />
        )}
      </div>
    </div>
  );
}

// Chapters view
function ChaptersView({ chapters, selectedChapter, onSelectChapter }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {chapters.map((chapter, index) => (
        <button
          key={chapter.id}
          onClick={() => onSelectChapter(chapter.id)}
          disabled={!chapter.isUnlocked}
          className={`text-left p-4 rounded-xl border-2 transition-all ${
            selectedChapter === chapter.id
              ? 'border-amber-500 bg-amber-500/10'
              : chapter.isUnlocked
              ? 'border-gray-600 bg-gray-800 hover:border-gray-500'
              : 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-2xl ${
              chapter.isCompleted ? 'grayscale' : ''
            }`}>
              {chapter.isCompleted ? '✅' : chapter.isUnlocked ? '📖' : '🔒'}
            </span>
            <div>
              <div className="text-white font-bold">第{index + 1}章: {chapter.title}</div>
              <div className="text-gray-400 text-sm">
                {chapter.isCompleted ? '已完成' : chapter.isUnlocked ? '进行中' : `需要等级 ${chapter.requiredLevel}`}
              </div>
            </div>
          </div>
          
          <p className="text-gray-400 text-sm mb-3">{chapter.description}</p>
          
          {/* Mission progress */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{
                  width: `${(chapter.missions.filter(m => m.isCompleted).length / chapter.missions.length) * 100}%`
                }}
              />
            </div>
            <span className="text-xs text-gray-400">
              {chapter.missions.filter(m => m.isCompleted).length}/{chapter.missions.length}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

// Missions view
function MissionsView({ chapter }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">📖</span>
        <div>
          <h3 className="text-lg font-bold text-white">{chapter.title}</h3>
          <p className="text-gray-400 text-sm">{chapter.description}</p>
        </div>
      </div>

      {chapter.missions.map((mission, index) => (
        <div
          key={mission.id}
          className={`p-4 rounded-xl border ${
            mission.isCompleted
              ? 'bg-green-900/20 border-green-600/30'
              : 'bg-gray-800 border-gray-700'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              mission.isCompleted ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
            }`}>
              {mission.isCompleted ? '✓' : index + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-white font-bold">{mission.title}</h4>
                {mission.isCompleted && (
                  <span className="text-xs bg-green-600/30 text-green-400 px-2 py-0.5 rounded">
                    已完成
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm mt-1">{mission.description}</p>
              
              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>进度</span>
                  <span>
                    {(mission.currentProgress || 0)} / {mission.target}
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, ((mission.currentProgress || 0) / mission.target) * 100)}%`
                    }}
                  />
                </div>
              </div>
              
              {/* Reward */}
              {mission.reward && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-400">奖励:</span>
                  <span className="text-xs bg-amber-600/30 text-amber-400 px-2 py-0.5 rounded">
                    {getRewardLabel(mission.reward)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Rewards view
function RewardsView({ storyStats, unlockedTitles, earnedTrophies, earnedItems }) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-white font-bold mb-4">📊 故事统计</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">
              {storyStats.totalMissionsCompleted}
            </div>
            <div className="text-gray-400 text-sm">完成任务</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {storyStats.totalCoinsEarned}
            </div>
            <div className="text-gray-400 text-sm">获得金币</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {storyStats.longestWinStreak}
            </div>
            <div className="text-gray-400 text-sm">最长连胜</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {storyStats.biggestComeback}
            </div>
            <div className="text-gray-400 text-sm">最大翻盘</div>
          </div>
        </div>
      </div>

      {/* Titles */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-white font-bold mb-4">👑 解锁称号</h3>
        {unlockedTitles.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">尚未解锁任何称号</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unlockedTitles.map(title => (
              <span key={title} className="bg-amber-600/30 text-amber-400 px-3 py-1 rounded-full text-sm">
                {getTitleLabel(title)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Trophies */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-white font-bold mb-4">🏆 获得奖杯</h3>
        {earnedTrophies.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">尚未获得任何奖杯</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {earnedTrophies.map(trophy => (
              <span key={trophy} className="bg-yellow-600/30 text-yellow-400 px-3 py-1 rounded-full text-sm">
                {getTrophyLabel(trophy)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-white font-bold mb-4">🎁 获得道具</h3>
        {earnedItems.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">尚未获得任何道具</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {earnedItems.map(item => (
              <span key={item} className="bg-blue-600/30 text-blue-400 px-3 py-1 rounded-full text-sm">
                {getItemLabel(item)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Story event modal
function StoryEventModal({ event, onChoice, onDismiss }) {
  const [selectedOutcome, setSelectedOutcome] = useState(null);

  const handleChoice = (choiceId) => {
    const outcome = onChoice(choiceId);
    if (outcome) {
      setSelectedOutcome(outcome);
      // Auto close after showing outcome
      setTimeout(() => {
        setSelectedOutcome(null);
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md p-6 border-2 border-amber-500/50">
        {selectedOutcome ? (
          <div className="text-center">
            <div className="text-5xl mb-4">
              {selectedOutcome.outcome === 'positive' ? '🎉' :
               selectedOutcome.outcome === 'negative' ? '😢' :
               selectedOutcome.outcome === 'random' ? '🎲' : '🤔'}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">结果</h3>
            <p className="text-gray-400">
              {selectedOutcome.outcome === 'positive' && '这是个好的结果！'}
              {selectedOutcome.outcome === 'negative' && '这个选择不太理想'}
              {selectedOutcome.outcome === 'random' && '命运揭晓...'}
              {selectedOutcome.outcome === 'neutral' && '结果还不错'}
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">⚡</div>
              <h3 className="text-xl font-bold text-white">{event.title}</h3>
            </div>
            
            <p className="text-gray-300 text-center mb-6">{event.description}</p>
            
            <div className="space-y-2">
              {event.choices.map(choice => (
                <button
                  key={choice.id}
                  onClick={() => handleChoice(choice.id)}
                  className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-amber-500 rounded-xl text-white text-center transition-all"
                >
                  {choice.label}
                </button>
              ))}
            </div>
            
            <button
              onClick={onDismiss}
              className="w-full mt-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-400 hover:text-white"
            >
              稍后再说
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Helper functions
function getRewardLabel(reward) {
  switch (reward.type) {
    case 'coins': return `${reward.amount} 金币`;
    case 'xp': return `${reward.amount} XP`;
    case 'title': return getTitleLabel(reward.id);
    case 'trophy': return getTrophyLabel(reward.id);
    case 'item': return getItemLabel(reward.id);
    case 'skill': return getSkillLabel(reward.id);
    default: return reward.type;
  }
}

function getTitleLabel(titleId) {
  const titles = {
    challenger: '挑战者',
    streak_master: '连胜大师',
    comeback_king: '翻盘之王',
    legend: '传奇',
  };
  return titles[titleId] || titleId;
}

function getTrophyLabel(trophyId) {
  const trophies = {
    grand_champion: '至尊冠军',
  };
  return trophies[trophyId] || trophyId;
}

function getItemLabel(itemId) {
  const items = {
    lucky_charm: '幸运符',
    golden_card: '金卡',
  };
  return items[itemId] || itemId;
}

function getSkillLabel(skillId) {
  const skills = {
    negotiation_1: '谈判 I',
    defense_1: '防守 I',
  };
  return skills[skillId] || skillId;
}