import { useState, useEffect } from 'react';
import { useGameStore } from '../../game/store';
import { useFriendsStore } from './friendsStore';

export default function FriendPanel({ onClose }) {
  const studentId = useGameStore(s => s.studentId);
  const studentName = studentId || 'Player';
  
  const friends = useFriendsStore(s => s.friends);
  const addFriend = useFriendsStore(s => s.addFriend);
  const removeFriend = useFriendsStore(s => s.removeFriend);
  const updateFriendStatus = useFriendsStore(s => s.updateFriendStatus);
  const getMyInviteCode = useFriendsStore(s => s.getMyInviteCode);
  const generateInviteCode = useFriendsStore(s => s.generateInviteCode);
  const searchFriends = useFriendsStore(s => s.searchFriends);
  const findPlayerByCode = useFriendsStore(s => s.findPlayerByCode);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  
  // Get my invite code
  const myCode = getMyInviteCode(studentId || 'local_user', studentName);
  
  // Filtered friends based on search
  const displayedFriends = searchQuery ? searchFriends(searchQuery) : friends;
  
  // Copy invite code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setMessage('✓ 邀请码已复制!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = myCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setMessage('✓ 邀请码已复制!');
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // Handle adding friend by invite code
  const handleAddByCode = () => {
    if (!inviteCodeInput.trim()) {
      setMessage('请输入邀请码');
      return;
    }
    
    const code = inviteCodeInput.trim().toUpperCase();
    const player = findPlayerByCode(code);
    
    if (!player) {
      setMessage('未找到该邀请码对应的玩家');
      return;
    }
    
    if (player.ownerId === (studentId || 'local_user')) {
      setMessage('不能添加自己为好友');
      return;
    }
    
    const success = addFriend({
      friendId: player.ownerId,
      friendName: player.ownerName,
      inviteCode: code,
    });
    
    if (success) {
      setMessage(`已添加好友: ${player.ownerName}`);
      setInviteCodeInput('');
    } else {
      setMessage('该玩家已在好友列表中');
    }
  };
  
  // Handle remove friend
  const handleRemoveFriend = (friendId, friendName) => {
    if (window.confirm(`确定要删除好友 "${friendName}" 吗?`)) {
      removeFriend(friendId);
      setMessage(`已删除好友: ${friendName}`);
    }
  };
  
  // Handle generate new invite code
  const handleGenerateNewCode = () => {
    generateInviteCode(studentId || 'local_user', studentName);
    setShowGenerateConfirm(false);
    setMessage('新的邀请码已生成');
  };
  
  // Simulate friend status updates (in a real app, this would come from a server)
  useEffect(() => {
    // For demo purposes, randomly set some friends as online/in_game
    // In production, this would be handled by a real-time connection
    const interval = setInterval(() => {
      friends.forEach(friend => {
        if (Math.random() < 0.1) { // 10% chance to change status
          const statuses = ['online', 'offline', 'in_game'];
          const currentIndex = statuses.indexOf(friend.status);
          const newStatus = statuses[(currentIndex + 1) % statuses.length];
          // Only update occasionally for demo
        }
      });
    }, 10000);
    
    return () => clearInterval(interval);
  }, [friends]);
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'in_game': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };
  
  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'online': return '在线';
      case 'in_game': return '游戏中';
      case 'offline': return '离线';
      default: return '离线';
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>👥</span>
            <span>好友</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* My Invite Code Section */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-2">我的邀请码</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/30 rounded-lg px-4 py-3">
                <span className="text-2xl font-bold tracking-widest text-yellow-400">
                  {myCode}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className={`px-4 py-3 rounded-lg font-bold transition-all ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 text-white'
                }`}
              >
                {copied ? '✓' : '📋'}
              </button>
              <button
                onClick={() => setShowGenerateConfirm(true)}
                className="px-4 py-3 rounded-lg font-bold bg-gray-700 hover:bg-gray-600 text-white transition-all"
                title="生成新邀请码"
              >
                🔄
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              分享邀请码给朋友,让他们加入你的好友列表
            </p>
          </div>
          
          {/* Add Friend by Code */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-2">通过邀请码添加好友</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                placeholder="输入邀请码"
                className="flex-1 px-4 py-2 bg-black/30 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 uppercase"
                maxLength={6}
              />
              <button
                onClick={handleAddByCode}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg font-bold hover:scale-105 transition-all text-white"
              >
                添加
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-2">搜索好友</div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入好友名称搜索..."
              className="w-full px-4 py-2 bg-black/30 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>
          
          {/* Friends List */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-3">
              好友列表 ({displayedFriends.length})
            </div>
            
            {displayedFriends.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">👤</div>
                <p>{searchQuery ? '没有找到匹配的好友' : '还没有好友,快去分享邀请码吧!'}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {displayedFriends.map(friend => (
                  <div
                    key={friend.odl}
                    className="flex items-center gap-3 p-3 bg-black/20 rounded-lg hover:bg-black/30 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg font-bold">
                        {friend.friendName.charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${getStatusColor(friend.status)} border-2 border-gray-800`} />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">
                        {friend.friendName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {getStatusText(friend.status)}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {friend.status === 'in_game' && (
                        <button
                          className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg text-xs font-bold hover:scale-105 transition-all text-white"
                          onClick={() => setMessage('正在加入游戏...')}
                        >
                          加入
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveFriend(friend.friendId, friend.friendName)}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-xs font-bold transition-colors text-red-400"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Message */}
          {message && (
            <div className="text-center text-sm text-green-400 bg-green-500/10 rounded-lg py-2">
              {message}
            </div>
          )}
        </div>
        
        {/* Generate New Code Confirmation Modal */}
        {showGenerateConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full border border-gray-600">
              <h3 className="text-lg font-bold text-white mb-4">生成新邀请码?</h3>
              <p className="text-gray-400 text-sm mb-6">
                新的邀请码将替代当前码,旧码将失效。确定要继续吗?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowGenerateConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 rounded-lg font-bold hover:bg-gray-500 text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleGenerateNewCode}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg font-bold hover:scale-105 transition-all text-white"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}