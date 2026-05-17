/**
 * AI Teammate Store - AI teammate management for solo games
 * 
 * Features:
 * - Recruit AI teammates in solo mode
 * - Teammate loyalty and trust system
 * - Team strategy coordination
 * - Resource sharing between teammates
 * - Teammate personality and specialization
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AI_PERSONALITY, getPersonalityLabel, getPersonalityNames } from '../../game/aiBrain';

const TEAM_ROLES = {
  SUPPORTER: 'supporter',     // Focus on helping human player
  STRATEGIST: 'strategist',   // Coordinate team strategy
  ACQUISITOR: 'acquisitor',   // Focus on property acquisition for team
  DEFENDER: 'defender',       // Focus on blocking opponents
};

const ROLE_LABELS = {
  [TEAM_ROLES.SUPPORTER]: '辅助型',
  [TEAM_ROLES.STRATEGIST]: '策略型',
  [TEAM_ROLES.ACQUISITOR]: '进攻型',
  [TEAM_ROLES.DEFENDER]: '防守型',
};

const ROLE_ICONS = {
  [TEAM_ROLES.SUPPORTER]: '🤝',
  [TEAM_ROLES.STRATEGIST]: '🧠',
  [TEAM_ROLES.ACQUISITOR]: '💼',
  [TEAM_ROLES.DEFENDER]: '🛡️',
};

// Generate unique ID
const genId = () => `tm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const MAX_TEAMMATES = 2;
const MAX_LOYALTY = 100;
const MAX_TRUST = 100;

export const useAiTeammateStore = create(
  persist(
    (set, get) => ({
      // Team members
      teammates: [],

      // Current team configuration
      teamStrategy: 'balanced', // balanced | aggressive | defensive

      // Solo mode active
      isSoloMode: false,

      // Team pool (shared resources)
      teamPool: {
        coins: 0,
        properties: [],
        achievements: [],
      },

      // ============ Teammate Management ============

      /**
       * Enable solo mode and start recruiting
       */
      enableSoloMode: () => {
        set({ isSoloMode: true });
      },

      /**
       * Disable solo mode
       */
      disableSoloMode: () => {
        set({ isSoloMode: false });
      },

      /**
       * Recruit a new AI teammate
       */
      recruitTeammate: (role = TEAM_ROLES.SUPPORTER) => {
        const state = get();
        if (state.teammates.length >= MAX_TEAMMATES) return null;
        if (!state.isSoloMode) return null;

        const personalities = [AI_PERSONALITY.AGGRESSIVE, AI_PERSONALITY.CONSERVATIVE, AI_PERSONALITY.BALANCED];
        const personality = personalities[Math.floor(Math.random() * personalities.length)];
        const names = getPersonalityNames(personality);
        const name = names[Math.floor(Math.random() * names.length)];

        const teammate = {
          id: genId(),
          name,
          personality,
          role,
          roleLabel: ROLE_LABELS[role],
          roleIcon: ROLE_ICONS[role],
          loyalty: 70, // Start with 70% loyalty
          trust: 50,  // Start with 50% trust
          level: 1,
          experience: 0,
          skills: {
            negotiation: Math.floor(Math.random() * 30) + 20,
            strategy: Math.floor(Math.random() * 30) + 20,
            property: Math.floor(Math.random() * 30) + 20,
            blocking: Math.floor(Math.random() * 30) + 20,
          },
          // Performance history
          matchesPlayed: 0,
          matchesWon: 0,
          totalContribution: 0,
          // Cooperation stats
          timesHelped: 0,
          timesBlocked: 0,
          tradesProposed: 0,
          tradesAccepted: 0,
          // Personal inventory
          personalCoins: 500,
          personalProperties: [],
          // Timestamps
          recruitedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        };

        set(state => ({
          teammates: [...state.teammates, teammate],
        }));

        return teammate;
      },

      /**
       * Dismiss a teammate
       */
      dismissTeammate: (teammateId) => {
        set(state => ({
          teammates: state.teammates.filter(t => t.id !== teammateId),
        }));
      },

      /**
       * Change teammate role
       */
      changeTeammateRole: (teammateId, newRole) => {
        set(state => ({
          teammates: state.teammates.map(t =>
            t.id === teammateId
              ? { ...t, role: newRole, roleLabel: ROLE_LABELS[newRole], roleIcon: ROLE_ICONS[newRole] }
              : t
          ),
        }));
      },

      /**
       * Get teammate by ID
       */
      getTeammate: (teammateId) => {
        return get().teammates.find(t => t.id === teammateId);
      },

      // ============ Loyalty & Trust ============

      /**
       * Modify teammate loyalty
       */
      modifyLoyalty: (teammateId, amount) => {
        set(state => ({
          teammates: state.teammates.map(t =>
            t.id === teammateId
              ? { ...t, loyalty: Math.max(0, Math.min(MAX_LOYALTY, t.loyalty + amount)) }
              : t
          ),
        }));
      },

      /**
       * Modify teammate trust
       */
      modifyTrust: (teammateId, amount) => {
        set(state => ({
          teammates: state.teammates.map(t =>
            t.id === teammateId
              ? { ...t, trust: Math.max(0, Math.min(MAX_TRUST, t.trust + amount)) }
              : t
          ),
        }));
      },

      /**
       * Update teammate stats after a match
       */
      updateTeammateStats: (teammateId, { won, contribution, helped, blocked, tradesProposed, tradesAccepted }) => {
        set(state => ({
          teammates: state.teammates.map(t => {
            if (t.id !== teammateId) return t;

            const newXP = t.experience + contribution;
            const newLevel = Math.floor(newXP / 500) + 1;

            return {
              ...t,
              matchesPlayed: t.matchesPlayed + 1,
              matchesWon: t.matchesWon + (won ? 1 : 0),
              totalContribution: t.totalContribution + contribution,
              timesHelped: t.timesHelped + (helped || 0),
              timesBlocked: t.timesBlocked + (blocked || 0),
              tradesProposed: t.tradesProposed + (tradesProposed || 0),
              tradesAccepted: t.tradesAccepted + (tradesAccepted || 0),
              experience: newXP,
              level: newLevel,
              lastActiveAt: new Date().toISOString(),
            };
          }),
        }));

        // Check if loyalty should decrease due to poor performance
        const teammate = get().teammates.find(t => t.id === teammateId);
        if (teammate && !won && teammate.loyalty > 20) {
          get().modifyLoyalty(teammateId, -5);
        }
      },

      // ============ Team Strategy ============

      /**
       * Set team strategy
       */
      setTeamStrategy: (strategy) => {
        set({ teamStrategy: strategy });
      },

      /**
       * Get team strategy description
       */
      getTeamStrategyDescription: () => {
        const strategies = {
          balanced: '均衡策略 - 团队成员平衡发展，既注重个人成长也考虑团队配合',
          aggressive: '激进策略 - 团队成员优先抢夺高价值资产，快速扩张',
          defensive: '防守策略 - 团队成员优先阻止对手，稳固地盘',
        };
        return strategies[get().teamStrategy] || strategies.balanced;
      },

      // ============ Team Pool (Shared Resources) ============

      /**
       * Add coins to team pool
       */
      addToTeamPool: (amount) => {
        set(state => ({
          teamPool: { ...state.teamPool, coins: state.teamPool.coins + amount },
        }));
      },

      /**
       * Remove coins from team pool
       */
      removeFromTeamPool: (amount) => {
        const current = get().teamPool.coins;
        if (current < amount) return false;
        set(state => ({
          teamPool: { ...state.teamPool, coins: state.teamPool.coins - amount },
        }));
        return true;
      },

      /**
       * Transfer property to team pool
       */
      transferPropertyToTeamPool: (propertyId) => {
        // This would need to interact with actual game state
        set(state => ({
          teamPool: { ...state.teamPool, properties: [...state.teamPool.properties, propertyId] },
        }));
      },

      // ============ Cooperation Actions ============

      /**
       * Teammate proposes a trade to human player
       */
      proposeTradeToPlayer: (teammateId, tradeOffer) => {
        const state = get();
        const teammate = state.teammates.find(t => t.id === teammateId);
        if (!teammate) return null;

        const proposal = {
          id: genId(),
          teammateId,
          teammateName: teammate.name,
          offered: tradeOffer.offered,
          requested: tradeOffer.requested,
          message: tradeOffer.message || `${teammate.name}想要和你交易`,
          createdAt: new Date().toISOString(),
          status: 'pending',
        };

        set(state => ({
          pendingProposals: [...(state.pendingProposals || []), proposal],
        }));

        return proposal;
      },

      /**
       * Human player responds to trade proposal
       */
      respondToProposal: (proposalId, accepted) => {
        const state = get();
        const proposal = (state.pendingProposals || []).find(p => p.id === proposalId);
        if (!proposal) return false;

        if (accepted) {
          // Execute the trade
          const teammate = state.teammates.find(t => t.id === proposal.teammateId);
          if (teammate) {
            get().modifyTrust(proposal.teammateId, 10);
            get().modifyLoyalty(proposal.teammateId, 5);
            get().updateTeammateStats(proposal.teammateId, { tradesAccepted: 1 });
          }
        } else {
          // Rejected
          if (Math.random() > 0.5) {
            get().modifyLoyalty(proposal.teammateId, -5);
          }
        }

        set(state => ({
          pendingProposals: (state.pendingProposals || []).map(p =>
            p.id === proposalId ? { ...p, status: accepted ? 'accepted' : 'rejected' } : p
          ),
        }));

        return true;
      },

      /**
       * Teammate offers help to human player
       */
      offerHelpToPlayer: (teammateId, helpType) => {
        const state = get();
        const teammate = state.teammates.find(t => t.id === teammateId);
        if (!teammate) return null;

        const helpOffer = {
          id: genId(),
          teammateId,
          teammateName: teammate.name,
          helpType, // 'coin_donation' | 'property_gift' | 'blocking_help'
          message: `${teammate.name}想要帮助你`,
          createdAt: new Date().toISOString(),
          status: 'pending',
        };

        set(state => ({
          pendingHelpOffers: [...(state.pendingHelpOffers || []), helpOffer],
        }));

        return helpOffer;
      },

      /**
       * Human player accepts help
       */
      acceptHelp: (helpOfferId) => {
        const state = get();
        const offer = (state.pendingHelpOffers || []).find(o => o.id === helpOfferId);
        if (!offer) return false;

        const teammate = state.teammates.find(t => t.id === offer.teammateId);
        if (teammate) {
          get().modifyTrust(offer.teammateId, 15);
          get().updateTeammateStats(offer.teammateId, { helped: 1 });
        }

        set(state => ({
          pendingHelpOffers: (state.pendingHelpOffers || []).map(o =>
            o.id === helpOfferId ? { ...o, status: 'accepted' } : o
          ),
        }));

        return true;
      },

      /**
       * Decline help offer
       */
      declineHelp: (helpOfferId) => {
        set(state => ({
          pendingHelpOffers: (state.pendingHelpOffers || []).map(o =>
            o.id === helpOfferId ? { ...o, status: 'declined' } : o
          ),
        }));
      },

      // ============ Utility ============

      /**
       * Get team power rating
       */
      getTeamPowerRating: () => {
        const state = get();
        if (state.teammates.length === 0) return 0;

        const totalPower = state.teammates.reduce((sum, t) => {
          const loyaltyBonus = t.loyalty / 100;
          const trustBonus = t.trust / 200;
          const skillAvg = (t.skills.negotiation + t.skills.strategy + t.skills.property + t.skills.blocking) / 4;
          return sum + skillAvg * (1 + loyaltyBonus + trustBonus);
        }, 0);

        return Math.round(totalPower);
      },

      /**
       * Get available teammates for actions
       */
      getAvailableTeammates: () => {
        return get().teammates.filter(t => t.loyalty > 20);
      },

      /**
       * Clear all data
       */
      resetTeam: () => {
        set({
          teammates: [],
          teamStrategy: 'balanced',
          isSoloMode: false,
          teamPool: { coins: 0, properties: [], achievements: [] },
          pendingProposals: [],
          pendingHelpOffers: [],
        });
      },

      /**
       * Get teammate summary
       */
      getTeamSummary: () => {
        const state = get();
        return {
          count: state.teammates.length,
          maxCount: MAX_TEAMMATES,
          isActive: state.isSoloMode,
          strategy: state.teamStrategy,
          strategyDescription: get().getTeamStrategyDescription(),
          teamPower: get().getTeamPowerRating(),
          pendingProposals: (state.pendingProposals || []).filter(p => p.status === 'pending').length,
          pendingHelpOffers: (state.pendingHelpOffers || []).filter(o => o.status === 'pending').length,
        };
      },
    }),
    {
      name: 'monopoly3d-ai-teammate',
      partialize: (state) => ({
        // Don't persist runtime state
        teammates: state.teammates.map(t => ({
          ...t,
          personalCoins: 500,
          personalProperties: [],
        })),
        teamStrategy: state.teamStrategy,
        isSoloMode: state.isSoloMode,
      }),
    }
  )
);

export { TEAM_ROLES, ROLE_LABELS, ROLE_ICONS, MAX_TEAMMATES };