/**
 * Story Mode Store - AI-driven narrative campaign system
 * 
 * Features:
 * - Campaign chapters with branching narrative
 * - AI-driven story events based on player choices
 * - Character progression in story mode
 * - Unlock rewards and special game modes
 * - Track player decisions and consequences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const generateId = () => `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Story chapter structure
const STORY_CHAPTERS = [
  {
    id: 'chapter_1',
    title: '起始之地',
    description: '你踏上了大富翁世界的旅程，在一个充满机遇的起始之城开始冒险。',
    requiredLevel: 1,
    isUnlocked: true,
    isCompleted: false,
    missions: [
      {
        id: 'c1_m1',
        title: '赚取第一桶金',
        description: '通过地产买卖赚取500金币',
        type: 'earn_coins',
        target: 500,
        reward: { type: 'coins', amount: 100 },
        isCompleted: false,
      },
      {
        id: 'c1_m2',
        title: '初次交易',
        description: '与一名AI玩家完成一笔交易',
        type: 'trade',
        target: 1,
        reward: { type: 'item', id: 'lucky_charm' },
        isCompleted: false,
      },
      {
        id: 'c1_m3',
        title: '踏上房产之路',
        description: '购买你的第一块地皮',
        type: 'buy_property',
        target: 1,
        reward: { type: 'xp', amount: 50 },
        isCompleted: false,
      },
    ],
  },
  {
    id: 'chapter_2',
    title: '对手的挑战',
    description: '一位神秘对手出现在你的旅途中，带来了一系列挑战。',
    requiredLevel: 3,
    isUnlocked: false,
    isCompleted: false,
    missions: [
      {
        id: 'c2_m1',
        title: '击败对手',
        description: '在一局对战中击败神秘对手',
        type: 'win_against_npc',
        target: 1,
        reward: { type: 'title', id: 'challenger' },
        isCompleted: false,
      },
      {
        id: 'c2_m2',
        title: '房产大亨',
        description: '拥有5块不同的地皮',
        type: 'own_properties',
        target: 5,
        reward: { type: 'coins', amount: 200 },
        isCompleted: false,
      },
      {
        id: 'c2_m3',
        title: '谈判高手',
        description: '完成3笔有利交易',
        type: 'profitable_trades',
        target: 3,
        reward: { type: 'skill', id: 'negotiation_1' },
        isCompleted: false,
      },
    ],
  },
  {
    id: 'chapter_3',
    title: '大亨的崛起',
    description: '你已经证明了自己的实力，现在是时候成为真正的大亨了。',
    requiredLevel: 5,
    isUnlocked: false,
    isCompleted: false,
    missions: [
      {
        id: 'c3_m1',
        title: '积累财富',
        description: '积累10000金币',
        type: 'earn_coins',
        target: 10000,
        reward: { type: 'avatar', id: 'tycoon_avatar' },
        isCompleted: false,
      },
      {
        id: 'c3_m2',
        title: '连胜王者',
        description: '连续赢得3场比赛',
        type: 'win_streak',
        target: 3,
        reward: { type: 'title', id: 'streak_master' },
        isCompleted: false,
      },
      {
        id: 'c3_m3',
        title: '终极交易',
        description: '用5000金币进行一次大额投资',
        type: 'big_investment',
        target: 1,
        reward: { type: 'item', id: 'golden_card' },
        isCompleted: false,
      },
    ],
  },
  {
    id: 'chapter_4',
    title: '联盟与背叛',
    description: '在商业世界中，联盟和背叛只在一线之间。',
    requiredLevel: 8,
    isUnlocked: false,
    isCompleted: false,
    missions: [
      {
        id: 'c4_m1',
        title: '建立联盟',
        description: '在多人游戏中与一名玩家建立联盟',
        type: 'form_alliance',
        target: 1,
        reward: { type: 'coins', amount: 500 },
        isCompleted: false,
      },
      {
        id: 'c4_m2',
        title: '防御堡垒',
        description: '在对手的进攻下保全自己的资产',
        type: 'defend_assets',
        target: 1,
        reward: { type: 'skill', id: 'defense_1' },
        isCompleted: false,
      },
      {
        id: 'c4_m3',
        title: '绝地反击',
        description: '在劣势情况下翻盘获胜',
        type: 'comeback_win',
        target: 1,
        reward: { type: 'title', id: 'comeback_king' },
        isCompleted: false,
      },
    ],
  },
  {
    id: 'chapter_5',
    title: '巅峰对决',
    description: '最终章：与传说中的大亨一决高下，争夺至尊之位。',
    requiredLevel: 10,
    isUnlocked: false,
    isCompleted: false,
    missions: [
      {
        id: 'c5_m1',
        title: '至尊挑战',
        description: '挑战并击败游戏中的传说级对手',
        type: 'defeat_legend',
        target: 1,
        reward: { type: 'trophy', id: 'grand_champion' },
        isCompleted: false,
      },
      {
        id: 'c5_m2',
        title: '完全胜利',
        description: '以最高分完成所有对手的淘汰',
        type: 'perfect_victory',
        target: 1,
        reward: { type: 'coins', amount: 2000 },
        isCompleted: false,
      },
      {
        id: 'c5_m3',
        title: '传奇诞生',
        description: '完成巅峰对决，书写你的传奇',
        type: 'complete_campaign',
        target: 1,
        reward: { type: 'title', id: 'legend' },
        isCompleted: false,
      },
    ],
  },
];

// AI narrative event templates
const STORY_EVENTS = {
  TRADE_OFFER: {
    id: 'trade_offer',
    title: '交易机会',
    description: '一位神秘商人向你提供了一个独特的交易机会...',
    choices: [
      { id: 'accept', label: '接受交易', outcome: 'positive', reward: { coins: 200 } },
      { id: 'counter', label: '讨价还价', outcome: 'neutral', nextEvent: 'counter_offer' },
      { id: 'decline', label: '拒绝', outcome: 'negative' },
    ],
    probability: 0.15,
    triggerCondition: (state) => state.coins > 500 && state.properties.length >= 2,
  },
  
  LUCKY_CHANCE: {
    id: 'lucky_chance',
    title: '幸运时刻',
    description: '你发现了一个隐藏的宝箱！',
    choices: [
      { id: 'open', label: '打开宝箱', outcome: 'random' },
      { id: 'leave', label: '离开', outcome: 'none' },
    ],
    probability: 0.1,
    triggerCondition: (state) => state.gamesPlayed >= 3,
  },
  
  RIVAL_APPEARS: {
    id: 'rival_appears',
    title: '对手登场',
    description: '你的宿敌出现了，准备给你制造麻烦！',
    choices: [
      { id: 'challenge', label: '正面迎战', outcome: 'skill_test' },
      { id: 'avoid', label: '避其锋芒', outcome: 'escaped' },
      { id: 'negotiate', label: '尝试谈判', outcome: 'diplomacy' },
    ],
    probability: 0.08,
    triggerCondition: (state) => state.winStreak >= 2,
  },
  
  INVESTMENT_OPPORTUNITY: {
    id: 'investment',
    title: '投资机会',
    description: '一个看似有利可图的投资机会摆在你面前...',
    choices: [
      { id: 'invest', label: '大胆投资', outcome: 'high_risk_high_reward' },
      { id: 'small', label: '小额试探', outcome: 'low_risk' },
      { id: 'pass', label: '放弃', outcome: 'safe' },
    ],
    probability: 0.12,
    triggerCondition: (state) => state.coins > 1000,
  },
  
  COMMUNITY_CHEST: {
    id: 'community_chest',
    title: '社区福利',
    description: '社区基金为你提供了一个意外的惊喜！',
    choices: [
      { id: 'donate', label: '捐赠', outcome: 'reputation' },
      { id: 'take', label: '全拿', outcome: 'greedy' },
    ],
    probability: 0.2,
    triggerCondition: () => true,
  },
};

export const useStoryModeStore = create(
  persist(
    (set, get) => ({
      // Campaign state
      chapters: JSON.parse(JSON.stringify(STORY_CHAPTERS)),
      currentChapterId: 'chapter_1',
      
      // Player progress
      unlockedTitles: [],
      earnedTrophies: [],
      earnedItems: [],
      storyStats: {
        totalMissionsCompleted: 0,
        totalCoinsEarned: 0,
        totalGamesPlayed: 0,
        biggestComeback: 0,
        longestWinStreak: 0,
      },
      
      // Active story event
      activeEvent: null,
      eventHistory: [],
      
      // Player decisions (for AI learning)
      playerDecisions: [],
      
      // ============ Chapter Operations ============
      
      /**
       * Unlock next chapter
       */
      unlockNextChapter: () => {
        const { chapters, currentChapterId } = get();
        const currentIndex = chapters.findIndex(c => c.id === currentChapterId);
        
        if (currentIndex < chapters.length - 1) {
          const nextChapter = chapters[currentIndex + 1];
          set(state => ({
            chapters: state.chapters.map(c =>
              c.id === nextChapter.id ? { ...c, isUnlocked: true } : c
            ),
          }));
        }
      },
      
      /**
       * Complete current chapter
       */
      completeChapter: () => {
        const { currentChapterId } = get();
        
        set(state => ({
          chapters: state.chapters.map(c =>
            c.id === currentChapterId
              ? { ...c, isCompleted: true }
              : c
          ),
        }));
        
        // Unlock next chapter
        get().unlockNextChapter();
      },
      
      /**
       * Set current chapter
       */
      setCurrentChapter: (chapterId) => {
        set({ currentChapterId: chapterId });
      },
      
      /**
       * Get current chapter
       */
      getCurrentChapter: () => {
        const { chapters, currentChapterId } = get();
        return chapters.find(c => c.id === currentChapterId) || null;
      },
      
      /**
       * Get chapter by ID
       */
      getChapter: (chapterId) => {
        return get().chapters.find(c => c.id === chapterId) || null;
      },
      
      // ============ Mission Operations ============
      
      /**
       * Update mission progress
       */
      updateMissionProgress: (missionId, progress) => {
        set(state => ({
          chapters: state.chapters.map(chapter => ({
            ...chapter,
            missions: chapter.missions.map(mission =>
              mission.id === missionId
                ? { ...mission, currentProgress: progress }
                : mission
            ),
          })),
        }));
        
        // Check if mission completed
        const chapter = get().chapters.find(c =>
          c.missions.some(m => m.id === missionId)
        );
        if (chapter) {
          const mission = chapter.missions.find(m => m.id === missionId);
          if (mission && mission.currentProgress >= mission.target && !mission.isCompleted) {
            get().completeMission(missionId);
          }
        }
      },
      
      /**
       * Complete mission
       */
      completeMission: (missionId) => {
        const chapter = get().chapters.find(c =>
          c.missions.some(m => m.id === missionId)
        );
        if (!chapter) return;
        
        const mission = chapter.missions.find(m => m.id === missionId);
        if (!mission) return;
        
        // Mark as completed
        set(state => ({
          chapters: state.chapters.map(c =>
            c.id === chapter.id
              ? {
                  ...c,
                  missions: c.missions.map(m =>
                    m.id === missionId
                      ? { ...m, isCompleted: true, currentProgress: m.target }
                      : m
                  ),
                }
              : c
          ),
        }));
        
        // Apply reward
        if (mission.reward) {
          get().applyReward(mission.reward);
        }
        
        // Update stats
        set(state => ({
          storyStats: {
            ...state.storyStats,
            totalMissionsCompleted: state.storyStats.totalMissionsCompleted + 1,
          },
        }));
        
        // Check if chapter is completed
        const updatedChapter = get().chapters.find(c => c.id === chapter.id);
        if (updatedChapter && updatedChapter.missions.every(m => m.isCompleted)) {
          get().completeChapter();
        }
      },
      
      /**
       * Apply reward
       */
      applyReward: (reward) => {
        switch (reward.type) {
          case 'coins':
            // Coins are tracked in stats, actual game handles the amount
            set(state => ({
              storyStats: {
                ...state.storyStats,
                totalCoinsEarned: state.storyStats.totalCoinsEarned + reward.amount,
              },
            }));
            break;
          case 'xp':
            // Handled by game
            break;
          case 'title':
            set(state => ({
              unlockedTitles: [...state.unlockedTitles, reward.id],
            }));
            break;
          case 'trophy':
            set(state => ({
              earnedTrophies: [...state.earnedTrophies, reward.id],
            }));
            break;
          case 'item':
            set(state => ({
              earnedItems: [...state.earnedItems, reward.id],
            }));
            break;
          case 'skill':
            // Handled by game
            break;
        }
      },
      
      // ============ Story Event Operations ============
      
      /**
       * Trigger random story event based on conditions
       */
      triggerStoryEvent: () => {
        const state = get();
        const eligibleEvents = Object.values(STORY_EVENTS).filter(event =>
          event.triggerCondition(state) && Math.random() < event.probability
        );
        
        if (eligibleEvents.length === 0) return null;
        
        const event = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
        const triggeredEvent = {
          ...event,
          instanceId: generateId(),
          timestamp: Date.now(),
        };
        
        set({ activeEvent: triggeredEvent });
        return triggeredEvent;
      },
      
      /**
       * Make a choice in active event
       */
      makeChoice: (choiceId) => {
        const { activeEvent, playerDecisions } = get();
        if (!activeEvent) return;
        
        const choice = activeEvent.choices.find(c => c.id === choiceId);
        if (!choice) return;
        
        // Record decision
        const decisionRecord = {
          eventId: activeEvent.id,
          choiceId,
          outcome: choice.outcome,
          timestamp: Date.now(),
        };
        
        set(state => ({
          playerDecisions: [...state.playerDecisions, decisionRecord],
          eventHistory: [...state.eventHistory, { ...activeEvent, choiceMade: choiceId }],
          activeEvent: null,
        }));
        
        return choice;
      },
      
      /**
       * Dismiss active event
       */
      dismissEvent: () => {
        set({ activeEvent: null });
      },
      
      // ============ Stats Operations ============
      
      /**
       * Update story stats from game events
       */
      updateStoryStats: (stats) => {
        set(state => ({
          storyStats: {
            ...state.storyStats,
            ...stats,
            longestWinStreak: Math.max(state.storyStats.longestWinStreak, stats.winStreak || 0),
            biggestComeback: Math.max(state.storyStats.biggestComeback, stats.comebackMargin || 0),
          },
        }));
      },
      
      /**
       * Check and update chapter unlocks based on level
       */
      checkChapterUnlocks: (playerLevel) => {
        set(state => ({
          chapters: state.chapters.map(chapter => ({
            ...chapter,
            isUnlocked: playerLevel >= chapter.requiredLevel,
          })),
        }));
      },
      
      // ============ Progress Queries ============
      
      /**
       * Get overall campaign progress
       */
      getCampaignProgress: () => {
        const { chapters } = get();
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
      },
      
      /**
       * Get mission by ID
       */
      getMission: (missionId) => {
        for (const chapter of get().chapters) {
          const mission = chapter.missions.find(m => m.id === missionId);
          if (mission) return mission;
        }
        return null;
      },
      
      /**
       * Check if player has specific title
       */
      hasTitle: (titleId) => {
        return get().unlockedTitles.includes(titleId);
      },
      
      /**
       * Check if player has specific trophy
       */
      hasTrophy: (trophyId) => {
        return get().earnedTrophies.includes(trophyId);
      },
    }),
    {
      name: 'monopoly3d-story-mode',
    }
  )
);

// Export constants
export { STORY_CHAPTERS, STORY_EVENTS };

export default useStoryModeStore;