/**
 * Tests for FriendSystem
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { FriendSystem } from '../../src/game/ai/social/friendSystem.js';

describe('FriendSystem', () => {
  let friendSystem;

  beforeEach(() => {
    friendSystem = new FriendSystem();
  });

  test('constructor initializes empty state', () => {
    assert.strictEqual(friendSystem.friends.size, 0);
    assert.strictEqual(friendSystem.pendingInvites.size, 0);
  });

  test('addFriend creates mutual friendship', () => {
    const result = friendSystem.addFriend('player1', 'player2');
    
    assert.strictEqual(result.success, true);
    assert.ok(result.friends.includes('player2'));
    assert.strictEqual(friendSystem.areFriends('player1', 'player2'), true);
    assert.strictEqual(friendSystem.areFriends('player2', 'player1'), true);
  });

  test('addFriend prevents self-friending', () => {
    const result = friendSystem.addFriend('player1', 'player1');
    
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Cannot add self as friend');
  });

  test('addFriend prevents duplicate friends', () => {
    friendSystem.addFriend('player1', 'player2');
    const result = friendSystem.addFriend('player1', 'player2');
    
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Already friends');
  });

  test('removeFriend removes mutual friendship', () => {
    friendSystem.addFriend('player1', 'player2');
    const result = friendSystem.removeFriend('player1', 'player2');
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(friendSystem.areFriends('player1', 'player2'), false);
  });

  test('removeFriend fails for non-friends', () => {
    const result = friendSystem.removeFriend('player1', 'player2');
    
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Not friends');
  });

  test('getFriends returns friend list', () => {
    friendSystem.addFriend('player1', 'player2');
    friendSystem.addFriend('player1', 'player3');
    
    const friends = friendSystem.getFriends('player1');
    
    assert.strictEqual(friends.length, 2);
    assert.ok(friends.includes('player2'));
    assert.ok(friends.includes('player3'));
  });

  test('getFriends returns empty array for new player', () => {
    const friends = friendSystem.getFriends('newplayer');
    
    assert.deepStrictEqual(friends, []);
  });

  test('getFriendCount returns correct count', () => {
    friendSystem.addFriend('player1', 'player2');
    friendSystem.addFriend('player1', 'player3');
    
    assert.strictEqual(friendSystem.getFriendCount('player1'), 2);
  });

  test('inviteFriend sends invite to friend', () => {
    friendSystem.addFriend('player1', 'player2');
    const result = friendSystem.inviteFriend('player1', 'player2', { roomId: 'room1' });
    
    assert.strictEqual(result.success, true);
    assert.ok(result.invite.id);
    assert.strictEqual(result.invite.to, 'player2');
    assert.strictEqual(result.invite.roomId, 'room1');
  });

  test('inviteFriend fails for non-friends', () => {
    const result = friendSystem.inviteFriend('player1', 'player2');
    
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Not friends with this player');
  });

  test('getPendingInvites returns pending invites', () => {
    friendSystem.addFriend('player1', 'player2');
    friendSystem.inviteFriend('player1', 'player2', { roomId: 'room1' });
    
    const invites = friendSystem.getPendingInvites('player2');
    
    assert.strictEqual(invites.length, 1);
    assert.strictEqual(invites[0].from, 'player1');
    assert.strictEqual(invites[0].roomId, 'room1');
  });

  test('acceptInvite marks invite as accepted', () => {
    friendSystem.addFriend('player1', 'player2');
    const { invite } = friendSystem.inviteFriend('player1', 'player2');
    
    const result = friendSystem.acceptInvite('player2', invite.id);
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.invite.from, 'player1');
  });

  test('declineInvite marks invite as declined', () => {
    friendSystem.addFriend('player1', 'player2');
    const { invite } = friendSystem.inviteFriend('player1', 'player2');
    
    const result = friendSystem.declineInvite('player2', invite.id);
    
    assert.strictEqual(result.success, true);
  });

  test('getSentInvites returns sent invites', () => {
    friendSystem.addFriend('player1', 'player2');
    friendSystem.inviteFriend('player1', 'player2');
    
    const sent = friendSystem.getSentInvites('player1');
    
    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].to, 'player2');
    assert.strictEqual(sent[0].status, 'pending');
  });

  test('inviteFriend works with default gameInfo', () => {
    friendSystem.addFriend('player1', 'player2');
    const result = friendSystem.inviteFriend('player1', 'player2');
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.invite.roomId, null);
    assert.strictEqual(result.invite.gameMode, 'classic');
  });
});
