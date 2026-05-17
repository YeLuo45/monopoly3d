/**
 * TournamentBracket - Tournament bracket display component
 * 
 * Features:
 * - Single elimination bracket visualization
 * - Match cards with player names and scores
 * - Round labels
 * - Winner highlighting
 * - Current match indication
 */

import { useMemo } from 'react';
import { useTournamentStore } from './tournamentStore';

export default function TournamentBracket({ onMatchClick }) {
  const getBracketData = useTournamentStore(s => s.getBracketData);
  const getTournamentInfo = useTournamentStore(s => s.getTournamentInfo);
  const currentTournament = useTournamentStore(s => s.currentTournament);

  const bracketData = useMemo(() => getBracketData(), [currentTournament]);
  const info = useMemo(() => getTournamentInfo(), [currentTournament]);

  if (!bracketData || !info) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        暂无锦标赛数据
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max px-4">
        {bracketData.map((round, roundIdx) => (
          <div key={round.roundNumber} className="flex flex-col">
            {/* Round header */}
            <div className="text-center mb-4">
              <span className="text-white font-bold px-4 py-1 bg-gradient-to-r from-amber-600/40 to-orange-600/40 rounded-full">
                {round.roundName}
              </span>
            </div>

            {/* Matches in round */}
            <div className="flex flex-col justify-around flex-1 gap-4">
              {round.matches.map((match, matchIdx) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  roundIndex={roundIdx}
                  matchIndex={matchIdx}
                  totalMatches={round.matches.length}
                  onClick={() => onMatchClick?.(match)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Champion display */}
      {info.champion && (
        <div className="mt-8 text-center">
          <div className="inline-block px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-2xl shadow-lg">
            <div className="text-4xl mb-2">🏆</div>
            <div className="text-white font-bold text-xl">冠军</div>
            <div className="text-amber-200 font-bold">{info.champion.name}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Match card component
function MatchCard({ match, roundIndex, matchIndex, totalMatches, onClick }) {
  const hasPlayer1 = !!match.player1;
  const hasPlayer2 = !!match.player2;
  const isComplete = match.status === 'completed';
  const isBye = match.status === 'bye';
  const hasWinner = !!match.winner;

  // Calculate vertical spacing to center matches
  const matchSpacing = 120; // pixels
  const totalHeight = totalMatches * matchSpacing;
  const topOffset = (totalHeight - matchSpacing) / 2;

  return (
    <div
      onClick={!isBye ? onClick : undefined}
      className={`
        relative w-48 bg-gray-800 rounded-xl border transition-all
        ${isComplete ? 'border-green-600/50' : 'border-gray-600'}
        ${!isBye && hasPlayer1 && hasPlayer2 ? 'cursor-pointer hover:border-amber-500 hover:shadow-lg' : ''}
        ${match.winner ? 'ring-1 ring-amber-500/50' : ''}
      `}
      style={{ height: '100px' }}
    >
      {/* Player 1 */}
      <div className={`
        flex items-center gap-2 px-3 py-2 border-b border-gray-700 rounded-t-xl
        ${match.winner === match.player1?.id ? 'bg-green-900/30' : ''}
        ${!hasPlayer1 ? 'opacity-30' : ''}
      `}>
        <div className={`w-2 h-2 rounded-full ${
          hasWinner ? (match.winner === match.player1?.id ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-500'
        }`} />
        <span className={`flex-1 text-sm truncate ${
          match.winner === match.player1?.id ? 'text-green-400 font-bold' : 'text-gray-300'
        }`}>
          {match.player1?.name || 'TBD'}
        </span>
        {isComplete && (
          <span className="text-xs text-gray-400">{match.score1}</span>
        )}
      </div>

      {/* Player 2 */}
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-b-xl
        ${match.winner === match.player2?.id ? 'bg-green-900/30' : ''}
        ${!hasPlayer2 ? 'opacity-30' : ''}
      `}>
        <div className={`w-2 h-2 rounded-full ${
          hasWinner ? (match.winner === match.player2?.id ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-500'
        }`} />
        <span className={`flex-1 text-sm truncate ${
          match.winner === match.player2?.id ? 'text-green-400 font-bold' : 'text-gray-300'
        }`}>
          {match.player2?.name || 'TBD'}
        </span>
        {isComplete && (
          <span className="text-xs text-gray-400">{match.score2}</span>
        )}
      </div>

      {/* Bye indicator */}
      {isBye && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-xl">
          <span className="text-gray-500 text-sm">轮空</span>
        </div>
      )}

      {/* Winner crown */}
      {hasWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">
          👑
        </div>
      )}
    </div>
  );
}