/**
 * ReplayTimeline - Enhanced timeline with turn markers and player highlights
 * 
 * Features:
 * - Visual timeline with turn markers
 * - Player color indicators
 * - Event density visualization
 * - Click to seek to specific turn
 */

import { useMemo } from 'react';

const TURN_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#a855f7', // purple
  '#f97316', // orange
];

export default function ReplayTimeline({
  events = [],
  currentIndex = 0,
  onSeek,
  players = [],
}) {
  // Group events by turn
  const turnData = useMemo(() => {
    const turns = [];
    let currentTurn = [];
    let turnNumber = 0;
    let lastPlayerId = null;

    events.forEach((event, index) => {
      // Detect turn change (end_turn event or player change after move_token)
      const isTurnEnd = event.type === 'end_turn';
      const isPlayerChange = lastPlayerId && event.playerId !== lastPlayerId;
      
      if (isTurnEnd || (isPlayerChange && currentTurn.length > 0)) {
        turns.push({
          turnNumber,
          events: currentTurn,
          startIndex: index - currentTurn.length,
          endIndex: index - 1,
        });
        currentTurn = [];
        turnNumber++;
      }
      
      currentTurn.push({ ...event, index });
      if (event.playerId) lastPlayerId = event.playerId;
    });

    // Push last turn
    if (currentTurn.length > 0) {
      turns.push({
        turnNumber,
        events: currentTurn,
        startIndex: events.length - currentTurn.length,
        endIndex: events.length - 1,
      });
    }

    return turns;
  }, [events]);

  // Calculate timeline segments
  const segments = useMemo(() => {
    if (events.length === 0) return [];

    return events.map((event, index) => {
      const turnIndex = turnData.findIndex(
        t => index >= t.startIndex && index <= t.endIndex
      );
      const turn = turnData[turnIndex];
      const playerIndex = players.findIndex(p => p.id === event.playerId);
      const playerColor = playerIndex >= 0 ? TURN_COLORS[playerIndex % TURN_COLORS.length] : '#666';

      return {
        index,
        event,
        turnNumber: turn?.turnNumber ?? 0,
        playerColor,
        isCurrent: index === currentIndex,
        isPast: index < currentIndex,
      };
    });
  }, [events, currentIndex, turnData, players]);

  const getEventTypeIntensity = (eventType) => {
    const highIntensity = ['buy_property', 'build_house', 'trade_property', 'go_to_jail'];
    const mediumIntensity = ['roll_dice', 'pay_rent', 'receive_money'];
    
    if (highIntensity.includes(eventType)) return 1;
    if (mediumIntensity.includes(eventType)) return 0.6;
    return 0.3;
  };

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Turn markers */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1 px-1">
        <span>回合 0</span>
        <span>{turnData.length} 回合</span>
      </div>

      {/* Timeline bar */}
      <div className="relative h-12 bg-gray-800 rounded-lg overflow-hidden">
        {/* Event density visualization */}
        <div className="absolute inset-0 flex">
          {segments.map((seg, i) => (
            <div
              key={i}
              className="flex-1 relative cursor-pointer transition-all hover:opacity-80"
              style={{
                backgroundColor: seg.isCurrent 
                  ? '#8b5cf6' 
                  : seg.isPast 
                    ? `rgba(136, 92, 246, ${getEventTypeIntensity(seg.event.type) * 0.7})`
                    : `rgba(100, 100, 100, ${getEventTypeIntensity(seg.event.type) * 0.3})`,
              }}
              onClick={() => onSeek?.(seg.index)}
              title={`${seg.event.type}${seg.event.playerId ? ` - ${seg.event.playerId}` : ''}`}
            >
              {/* Player color indicator at bottom */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ backgroundColor: seg.playerColor }}
              />
              
              {/* Turn number indicator */}
              {seg.event.type === 'end_turn' && (
                <div className="absolute top-0 left-0 right-0 flex justify-center">
                  <div className="bg-gray-700 text-xs text-gray-300 px-1 rounded-b">
                    {seg.turnNumber + 1}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Current position indicator */}
        {currentIndex >= 0 && currentIndex < segments.length && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
            style={{
              left: `${(currentIndex / segments.length) * 100}%`,
            }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
          </div>
        )}
      </div>

      {/* Turn legend */}
      {players.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-700">
          {players.map((player, index) => (
            <div key={player.id} className="flex items-center gap-1 text-xs">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: TURN_COLORS[index % TURN_COLORS.length] }}
              />
              <span className="text-gray-400">
                {player.name || `玩家${index + 1}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Current event info */}
      {currentIndex >= 0 && currentIndex < events.length && (
        <div className="mt-2 text-xs text-gray-400">
          <span className="text-gray-500">事件 {currentIndex + 1}/{events.length}</span>
          <span className="mx-2">•</span>
          <span>回合 {segments[currentIndex]?.turnNumber + 1 || 0}</span>
          <span className="mx-2">•</span>
          <span>{events[currentIndex]?.type || '未知'}</span>
        </div>
      )}
    </div>
  );
}