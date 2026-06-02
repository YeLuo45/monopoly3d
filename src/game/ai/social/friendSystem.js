/**
 * FriendSystem - Friend Management System
 * 
 * Manages friend relationships and game invitations for
 * multiplayer social features in Monopoly3D.
 */

export class FriendSystem {
  constructor() {
    this.friends = new Map();        // playerId -> Set of friendIds
    this.pendingInvites = new Map();  // playerId -> Array of invite objects
    this.sentInvites = new Map();     // playerId -> Array of sent invite objects
    this.inviteIdCounter = 1;
  }

  /**
   * Generate a unique invite ID
   * @returns {string} Unique invite identifier
   */
  generateInviteId() {
    return `invite_${this.inviteIdCounter++}_${Date.now().toString(36)}`;
  }

  /**
   * Ensure player exists in data structures
   * @param {string} playerId - Player ID
   */
  ensurePlayerExists(playerId) {
    if (!this.friends.has(playerId)) {
      this.friends.set(playerId, new Set());
    }
    if (!this.pendingInvites.has(playerId)) {
      this.pendingInvites.set(playerId, []);
    }
    if (!this.sentInvites.has(playerId)) {
      this.sentInvites.set(playerId, []);
    }
  }

  /**
   * Add a friend relationship (mutual)
   * @param {string} playerId - ID of the player adding friend
   * @param {string} friendId - ID of the friend to add
   * @returns {Object} Result with success status
   */
  addFriend(playerId, friendId) {
    if (playerId === friendId) {
      return { success: false, error: 'Cannot add self as friend' };
    }

    this.ensurePlayerExists(playerId);
    this.ensurePlayerExists(friendId);

    const playerFriends = this.friends.get(playerId);
    
    if (playerFriends.has(friendId)) {
      return { success: false, error: 'Already friends' };
    }

    // Add mutual friendship
    playerFriends.add(friendId);
    this.friends.get(friendId).add(playerId);

    return {
      success: true,
      friends: this.getFriends(playerId)
    };
  }

  /**
   * Remove a friend relationship (mutual)
   * @param {string} playerId - ID of the player removing friend
   * @param {string} friendId - ID of the friend to remove
   * @returns {Object} Result with success status
   */
  removeFriend(playerId, friendId) {
    if (!this.friends.has(playerId) || !this.friends.get(playerId).has(friendId)) {
      return { success: false, error: 'Not friends' };
    }

    // Remove mutual friendship
    this.friends.get(playerId).delete(friendId);
    
    if (this.friends.has(friendId)) {
      this.friends.get(friendId).delete(playerId);
    }

    return {
      success: true,
      friends: this.getFriends(playerId)
    };
  }

  /**
   * Get player's friend list
   * @param {string} playerId - ID of the player
   * @returns {Array} List of friend IDs
   */
  getFriends(playerId) {
    this.ensurePlayerExists(playerId);
    return Array.from(this.friends.get(playerId));
  }

  /**
   * Check if two players are friends
   * @param {string} playerId - First player ID
   * @param {string} friendId - Second player ID
   * @returns {boolean} True if they are friends
   */
  areFriends(playerId, friendId) {
    if (!this.friends.has(playerId)) return false;
    return this.friends.get(playerId).has(friendId);
  }

  /**
   * Get friend count
   * @param {string} playerId - Player ID
   * @returns {number} Number of friends
   */
  getFriendCount(playerId) {
    if (!this.friends.has(playerId)) return 0;
    return this.friends.get(playerId).size;
  }

  /**
   * Invite a friend to a game
   * @param {string} playerId - ID of the inviter
   * @param {string} friendId - ID of the friend to invite
   * @param {Object} gameInfo - Optional game info (roomId, gameMode, etc.)
   * @returns {Object} Result with invite details
   */
  inviteFriend(playerId, friendId, gameInfo = {}) {
    if (!this.areFriends(playerId, friendId)) {
      return { success: false, error: 'Not friends with this player' };
    }

    this.ensurePlayerExists(playerId);
    this.ensurePlayerExists(friendId);

    const invite = {
      id: this.generateInviteId(),
      from: playerId,
      to: friendId,
      roomId: gameInfo.roomId || null,
      gameMode: gameInfo.gameMode || 'classic',
      timestamp: Date.now(),
      status: 'pending'
    };

    // Add to recipient's pending invites
    this.pendingInvites.get(friendId).push(invite);
    
    // Add to sender's sent invites
    this.sentInvites.get(playerId).push(invite);

    return {
      success: true,
      invite: {
        id: invite.id,
        to: invite.to,
        roomId: invite.roomId,
        gameMode: invite.gameMode,
        timestamp: invite.timestamp
      }
    };
  }

  /**
   * Get pending invites for a player
   * @param {string} playerId - Player ID
   * @returns {Array} List of pending invites
   */
  getPendingInvites(playerId) {
    this.ensurePlayerExists(playerId);
    
    // Return invites that are still pending (not responded to)
    const pending = this.pendingInvites.get(playerId)
      .filter(invite => invite.status === 'pending')
      .map(invite => ({
        id: invite.id,
        from: invite.from,
        roomId: invite.roomId,
        gameMode: invite.gameMode,
        timestamp: invite.timestamp
      }));

    return pending;
  }

  /**
   * Accept an invite
   * @param {string} playerId - Player accepting the invite
   * @param {string} inviteId - Invite ID to accept
   * @returns {Object} Result with success status
   */
  acceptInvite(playerId, inviteId) {
    const invites = this.pendingInvites.get(playerId);
    if (!invites) {
      return { success: false, error: 'No invites found' };
    }

    const invite = invites.find(i => i.id === inviteId);
    if (!invite) {
      return { success: false, error: 'Invite not found' };
    }

    if (invite.status !== 'pending') {
      return { success: false, error: 'Invite already responded to' };
    }

    invite.status = 'accepted';

    // Update sender's sent invite status
    const sentInvites = this.sentInvites.get(invite.from);
    if (sentInvites) {
      const sentInvite = sentInvites.find(i => i.id === inviteId);
      if (sentInvite) {
        sentInvite.status = 'accepted';
      }
    }

    return {
      success: true,
      invite: {
        id: invite.id,
        from: invite.from,
        roomId: invite.roomId,
        gameMode: invite.gameMode
      }
    };
  }

  /**
   * Decline an invite
   * @param {string} playerId - Player declining the invite
   * @param {string} inviteId - Invite ID to decline
   * @returns {Object} Result with success status
   */
  declineInvite(playerId, inviteId) {
    const invites = this.pendingInvites.get(playerId);
    if (!invites) {
      return { success: false, error: 'No invites found' };
    }

    const invite = invites.find(i => i.id === inviteId);
    if (!invite) {
      return { success: false, error: 'Invite not found' };
    }

    if (invite.status !== 'pending') {
      return { success: false, error: 'Invite already responded to' };
    }

    invite.status = 'declined';

    // Update sender's sent invite status
    const sentInvites = this.sentInvites.get(invite.from);
    if (sentInvites) {
      const sentInvite = sentInvites.find(i => i.id === inviteId);
      if (sentInvite) {
        sentInvite.status = 'declined';
      }
    }

    return { success: true };
  }

  /**
   * Get sent invites for a player
   * @param {string} playerId - Player ID
   * @returns {Array} List of sent invites
   */
  getSentInvites(playerId) {
    this.ensurePlayerExists(playerId);
    return this.sentInvites.get(playerId).map(invite => ({
      id: invite.id,
      to: invite.to,
      roomId: invite.roomId,
      status: invite.status,
      timestamp: invite.timestamp
    }));
  }

  /**
   * Remove old invites (cleanup)
   * @param {number} maxAge - Maximum age in milliseconds
   */
  cleanupOldInvites(maxAge = 7 * 24 * 60 * 60 * 1000) { // Default 7 days
    const cutoff = Date.now() - maxAge;

    for (const [playerId, invites] of this.pendingInvites) {
      this.pendingInvites.set(playerId, invites.filter(i => i.timestamp > cutoff));
    }

    for (const [playerId, invites] of this.sentInvites) {
      this.sentInvites.set(playerId, invites.filter(i => i.timestamp > cutoff));
    }
  }
}

export default FriendSystem;
