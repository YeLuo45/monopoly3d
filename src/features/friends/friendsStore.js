import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Generate 6-character invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Generate unique OD (one-direction link) ID
function generateODL() {
  return `odl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Initial state
const initialFriendState = {
  friends: [],      // FriendShip[]
  inviteCodes: {}, // { [code]: PlayerInviteCode }
};

export const useFriendsStore = create(
  persist(
    (set, get) => ({
      ...initialFriendState,

      // ==================== FRIEND MANAGEMENT ====================

      // Add friend by invite code or player info
      addFriend: ({ friendId, friendName, inviteCode }) => {
        const state = get();
        // Check if already friends
        const exists = state.friends.find(f => f.friendId === friendId);
        if (exists) return false;

        const newFriend = {
          odl: generateODL(),
          friendId,
          friendName,
          inviteCode: inviteCode || '',
          status: 'offline',
          addedAt: Date.now(),
        };

        set(s => ({
          friends: [...s.friends, newFriend],
        }));
        return true;
      },

      // Remove friend
      removeFriend: (friendId) => {
        set(s => ({
          friends: s.friends.filter(f => f.friendId !== friendId),
        }));
      },

      // Update friend status
      updateFriendStatus: (friendId, status) => {
        set(s => ({
          friends: s.friends.map(f =>
            f.friendId === friendId ? { ...f, status } : f
          ),
        }));
      },

      // Search friends by name
      searchFriends: (query) => {
        const { friends } = get();
        if (!query.trim()) return friends;
        const lowerQuery = query.toLowerCase();
        return friends.filter(f =>
          f.friendName.toLowerCase().includes(lowerQuery) ||
          f.friendId.toLowerCase().includes(lowerQuery)
        );
      },

      // ==================== INVITE CODE MANAGEMENT ====================

      // Get my invite code (create if doesn't exist)
      getMyInviteCode: (playerId, playerName) => {
        const state = get();
        const existing = Object.values(state.inviteCodes).find(
          code => code.ownerId === playerId
        );
        if (existing) return existing.code;

        // Create new invite code
        const newCode = generateInviteCode();
        const inviteCodeObj = {
          odl: generateODL(),
          code: newCode,
          ownerId: playerId,
          ownerName: playerName,
          createdAt: Date.now(),
        };

        set(s => ({
          inviteCodes: { ...s.inviteCodes, [newCode]: inviteCodeObj },
        }));

        return newCode;
      },

      // Generate new invite code (invalidate old one)
      generateInviteCode: (playerId, playerName) => {
        // Remove old code for this player
        const state = get();
        const oldCode = Object.values(state.inviteCodes).find(c => c.ownerId === playerId);
        if (oldCode) {
          set(s => {
            const { [oldCode.code]: _, ...rest } = s.inviteCodes;
            return { inviteCodes: rest };
          });
        }

        // Generate new code
        return get().getMyInviteCode(playerId, playerName);
      },

      // Find player by invite code
      findPlayerByCode: (code) => {
        const { inviteCodes } = get();
        return inviteCodes[code.toUpperCase()] || null;
      },

      // ==================== STATE MANAGEMENT ====================

      // Clear all friends data
      clearAllFriends: () => {
        set({ friends: [], inviteCodes: {} });
      },

      // Get friend by ID
      getFriend: (friendId) => {
        return get().friends.find(f => f.friendId === friendId);
      },

      // Get online friends count
      getOnlineCount: () => {
        return get().friends.filter(f => f.status === 'online').length;
      },

      // Get in-game friends count
      getInGameCount: () => {
        return get().friends.filter(f => f.status === 'in_game').length;
      },
    }),
    {
      name: 'monopoly3d_friends',
      partialize: (state) => ({
        friends: state.friends,
        inviteCodes: state.inviteCodes,
      }),
    }
  )
);

// Selector hooks for performance
export const useFriends = () => useFriendsStore(s => s.friends);
export const useInviteCodes = () => useFriendsStore(s => s.inviteCodes);
export const useOnlineFriendsCount = () => useFriendsStore(s => s.getOnlineCount());