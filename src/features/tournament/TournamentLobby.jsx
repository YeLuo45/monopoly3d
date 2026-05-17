/**
 * TournamentLobby - Create/join tournament interface
 * 
 * Features:
 * - Create new tournament
 * - Browse available tournaments
 * - Join tournament with entry fee
 * - View tournament details
 */

import { useState, useEffect } from 'react';
import { useTournamentStore, TOURNAMENT_TYPES, TOURNAMENT_STATUS } from './tournamentStore';
import { useGameStore } from '../../game/store';

export default function TournamentLobby({ onClose }) {
  const [activeTab, setActiveTab] = useState('browse'); // browse | create | my_tournament
  const [showCreateModal, setShowCreateModal] = useState(false);

  const currentTournament = useTournamentStore(s => s.currentTournament);
  const availableTournaments = useTournamentStore(s => s.availableTournaments);
  const createTournament = useTournamentStore(s => s.createTournament);
  const registerPlayer = useTournamentStore(s => s.registerPlayer);
  const leaveTournament = useTournamentStore(s => s.leaveTournament);

  const studentId = useGameStore(s => s.studentId);
  const displayName = useGameStore(s => s.profile?.displayName) || '玩家';

  const openTournaments = availableTournaments.filter(
    t => t.status === TOURNAMENT_STATUS.REGISTRATION && t.currentPlayers < t.maxPlayers
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">🏆 锦标赛大厅</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"
          >
            关闭
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 py-3 text-center font-bold transition-colors ${
              activeTab === 'browse' 
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🏅 公开赛事
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 text-center font-bold transition-colors ${
              activeTab === 'create' 
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ➕ 创建赛事
          </button>
          {currentTournament && (
            <button
              onClick={() => setActiveTab('my_tournament')}
              className={`flex-1 py-3 text-center font-bold transition-colors ${
                activeTab === 'my_tournament' 
                  ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🎮 我的赛事
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'browse' && (
            <BrowseTournaments 
              tournaments={openTournaments}
              onJoin={(t) => {
                registerPlayer(studentId, displayName);
                setActiveTab('my_tournament');
              }}
            />
          )}
          {activeTab === 'create' && (
            <CreateTournament 
              onCreate={(config) => {
                createTournament({ ...config, creatorId: studentId, creatorName: displayName });
                setShowCreateModal(false);
                setActiveTab('my_tournament');
              }}
              onCancel={() => setShowCreateModal(false)}
            />
          )}
          {activeTab === 'my_tournament' && currentTournament && (
            <MyTournament tournament={currentTournament} onLeave={leaveTournament} />
          )}
        </div>
      </div>
    </div>
  );
}

// Browse tournaments list
function BrowseTournaments({ tournaments, onJoin }) {
  const currentTournament = useTournamentStore(s => s.currentTournament);
  const studentId = useGameStore(s => s.studentId);

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🏆</div>
        <h3 className="text-xl font-bold text-white mb-2">暂无公开赛事</h3>
        <p className="text-gray-400">成为第一个创建赛事的人吧！</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {tournaments.map(tournament => {
        const isRegistered = tournament.registeredPlayers?.some(p => p.id === studentId);
        const isFull = tournament.currentPlayers >= tournament.maxPlayers;
        const isOwn = tournament.creator?.id === studentId;

        return (
          <div key={tournament.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {tournament.name}
                  {tournament.type === 'single_elimination' && (
                    <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded">单败</span>
                  )}
                  {tournament.type === 'double_elimination' && (
                    <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded">双败</span>
                  )}
                  {isOwn && (
                    <span className="text-xs bg-amber-600/30 text-amber-300 px-2 py-0.5 rounded">我创建的</span>
                  )}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                  <span>👥 {tournament.currentPlayers}/{tournament.maxPlayers}</span>
                  <span>💰 报名费: {tournament.entryFee}</span>
                  <span>🏆 冠军奖励: {tournament.prizePool?.[0]?.xp || 0} XP</span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  创建者: {tournament.creator?.name}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {isOwn ? (
                  <span className="px-4 py-2 bg-gray-700 text-gray-400 rounded-lg text-center">自己的赛事</span>
                ) : isRegistered ? (
                  <span className="px-4 py-2 bg-green-600 text-white rounded-lg text-center">已报名</span>
                ) : isFull ? (
                  <span className="px-4 py-2 bg-gray-700 text-gray-400 rounded-lg text-center">已满</span>
                ) : (
                  <button
                    onClick={() => onJoin(tournament)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-lg text-white font-bold"
                  >
                    加入赛事
                  </button>
                )}
              </div>
            </div>

            {/* Registered players */}
            <div className="mt-4 flex flex-wrap gap-2">
              {tournament.registeredPlayers?.map((player, idx) => (
                <span key={idx} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                  {idx + 1}. {player.name}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Create tournament form
function CreateTournament({ onCreate, onCancel }) {
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [entryFee, setEntryFee] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);

  const playerCounts = [2, 4, 8, 16, 32];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      maxPlayers,
      entryFee,
      isPrivate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <h3 className="text-lg font-bold text-white mb-4">创建新赛事</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-gray-400 text-sm mb-1">赛事名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="春节杯锦标赛"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">参赛人数</label>
          <div className="flex gap-2">
            {playerCounts.map(count => (
              <button
                key={count}
                type="button"
                onClick={() => setMaxPlayers(count)}
                className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
                  maxPlayers === count
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {count}人
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">报名费 (金币)</label>
          <input
            type="number"
            value={entryFee}
            onChange={(e) => setEntryFee(Math.max(0, parseInt(e.target.value) || 0))}
            min="0"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPrivate"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="w-5 h-5 rounded bg-gray-800 border-gray-600"
          />
          <label htmlFor="isPrivate" className="text-gray-300">私人赛事（不公开显示）</label>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-lg text-white font-bold"
        >
          创建赛事
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold"
        >
          取消
        </button>
      </div>
    </form>
  );
}

// My tournament view
function MyTournament({ tournament, onLeave }) {
  const getTournamentInfo = useTournamentStore(s => s.getTournamentInfo);
  const getCurrentMatch = useTournamentStore(s => s.getCurrentMatch);
  const startTournament = useTournamentStore(s => s.startTournament);
  const updateMatchResult = useTournamentStore(s => s.updateMatchResult);
  const studentId = useGameStore(s => s.studentId);

  const info = getTournamentInfo();
  const currentMatch = getCurrentMatch(studentId);

  const isCreator = tournament.creator?.id === studentId;
  const isRegistered = tournament.registeredPlayers?.some(p => p.id === studentId);
  const canStart = isCreator && tournament.status === TOURNAMENT_STATUS.REGISTRATION && tournament.currentPlayers >= 2;

  return (
    <div>
      {/* Tournament header */}
      <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-600/30 rounded-xl p-4 mb-4">
        <h3 className="text-xl font-bold text-white mb-2">{tournament.name}</h3>
        <div className="flex items-center gap-4 text-sm text-gray-300">
          <span>👥 {tournament.currentPlayers}/{tournament.maxPlayers}</span>
          <span>📊 {tournament.type}</span>
          <span>🏆 {tournament.prizePool?.[0]?.xp || 0} XP冠军奖励</span>
        </div>
        <div className="mt-2">
          <span className={`text-sm px-3 py-1 rounded-full ${
            tournament.status === 'registration' ? 'bg-blue-600/30 text-blue-300' :
            tournament.status === 'in_progress' ? 'bg-green-600/30 text-green-300' :
            'bg-gray-600/30 text-gray-300'
          }`}>
            {tournament.status === 'registration' ? '报名中' :
             tournament.status === 'in_progress' ? '进行中' :
             tournament.status === 'completed' ? '已结束' : '未知'}
          </span>
        </div>
      </div>

      {/* Current match */}
      {currentMatch && (
        <div className="bg-gray-800 rounded-xl p-4 mb-4 border border-amber-500/50">
          <h4 className="text-lg font-bold text-amber-400 mb-3">🎮 当前比赛</h4>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{currentMatch.player1?.name}</div>
              <div className="text-gray-400 text-sm">选手1</div>
            </div>
            <div className="text-2xl text-gray-400">VS</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{currentMatch.player2?.name}</div>
              <div className="text-gray-400 text-sm">选手2</div>
            </div>
          </div>
          <button
            onClick={() => {/* TODO: Start match */}}
            className="w-full mt-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-white font-bold"
          >
            开始比赛
          </button>
        </div>
      )}

      {/* Registered players */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <h4 className="text-lg font-bold text-white mb-3">👥 已报名玩家 ({tournament.currentPlayers})</h4>
        <div className="grid grid-cols-2 gap-2">
          {tournament.registeredPlayers?.map((player, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2">
              <span className="text-lg">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
              </span>
              <span className="text-white">{player.name}</span>
              {player.id === studentId && (
                <span className="text-xs text-amber-400">(你)</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {canStart && (
          <button
            onClick={startTournament}
            className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-white font-bold"
          >
            🚀 开始锦标赛
          </button>
        )}
        {!isRegistered && tournament.status === 'registration' && (
          <button
            className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg text-white font-bold"
          >
            加入赛事
          </button>
        )}
        {tournament.status === 'registration' && !isCreator && (
          <button
            onClick={onLeave}
            className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-lg text-white font-bold"
          >
            退出赛事
          </button>
        )}
      </div>
    </div>
  );
}