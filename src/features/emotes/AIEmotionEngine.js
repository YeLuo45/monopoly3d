/**
 * AI Emotion Engine - Triggers AI player emotes based on game events
 * 
 * Features:
 * - React to property purchases (happy/excited)
 * - React to paying rent (frustrated)
 * - React to correct/wrong answers (happy/sad)
 * - React to landing on opponent properties (angry/frustrated)
 * - React to landing on chance cards (various)
 * - React to winning/losing (ecstatic/devastated)
 */

import { useGameStore } from '../../game/store';
import { useAIWatchStore } from '../aiWatch/aiWatchStore';

// Emote sets for different emotions
const EMOTE_SETS = {
  happy: ['😄', '😊', '🙂', '😁', '🤗', '🥰'],
  excited: ['🤩', '😍', '🥳', '🎉', '🎊', '✨'],
  frustrated: ['😤', '😠', '😾', '🙄', '😒', '😤'],
  sad: ['😢', '😭', '😞', '😔', '🥺', '😿'],
  angry: ['🤬', '😡', '💢', '👿', '😤', '💥'],
  surprised: ['😮', '😲', '🙀', '😱', '🤯', '❗'],
  lucky: ['🍀', '🌟', '⭐', '🎰', '💫', '✨'],
  unlucky: ['😱', '💀', '☠️', '🙀', '😵', '💩'],
};

// Trigger cooldowns (in ms)
const EMOTE_COOLDOWN = 5000; // 5 seconds between emotes
const LAST_EMOTE_TIME = {};

function getRandomEmote(emotion) {
  const set = EMOTE_SETS[emotion] || EMOTE_SETS.happy;
  return set[Math.floor(Math.random() * set.length)];
}

function canSendEmote(playerId) {
  const now = Date.now();
  const lastTime = LAST_EMOTE_TIME[playerId] || 0;
  return now - lastTime >= EMOTE_COOLDOWN;
}

function recordEmoteSent(playerId) {
  LAST_EMOTE_TIME[playerId] = Date.now();
}

/**
 * AI Emotion Engine - Core trigger function
 * Call this after game events to trigger AI emotes
 */
export function triggerAIEmotion(playerId, eventType, eventData = {}) {
  // Only trigger for AI players
  const state = useGameStore.getState();
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.isAI) return;
  if (!canSendEmote(playerId)) return;

  let emotion = 'happy';
  let emote = null;

  switch (eventType) {
    case 'property_purchased':
      // Happy when buying property
      emotion = Math.random() > 0.5 ? 'excited' : 'happy';
      emote = getRandomEmote(emotion);
      break;

    case 'property_acquired':
      // Acquired through trade or auction
      emotion = 'excited';
      emote = getRandomEmote(emotion);
      break;

    case 'rent_paid':
      // Frustrated when paying rent
      emotion = 'frustrated';
      emote = getRandomEmote(emotion);
      break;

    case 'rent_received':
      // Happy when receiving rent
      emotion = 'happy';
      emote = getRandomEmote(emotion);
      break;

    case 'question_correct':
      // Excited about correct answer
      emotion = Math.random() > 0.3 ? 'excited' : 'happy';
      emote = getRandomEmote(emotion);
      break;

    case 'question_incorrect':
      // Sad about wrong answer
      emotion = Math.random() > 0.5 ? 'sad' : 'frustrated';
      emote = getRandomEmote(emotion);
      break;

    case 'landed_on_opponent_property':
      // Frustrated/angry landing on opponent's property
      emotion = Math.random() > 0.5 ? 'angry' : 'frustrated';
      emote = getRandomEmote(emotion);
      break;

    case 'landed_on_chance':
      // Depends on chance outcome
      if (eventData.isGood) {
        emotion = 'lucky';
        emote = getRandomEmote(emotion);
      } else {
        emotion = 'unlucky';
        emote = getRandomEmote(emotion);
      }
      break;

    case 'go_to_jail':
      emotion = 'angry';
      emote = getRandomEmote(emotion);
      break;

    case 'escape_jail':
      emotion = 'lucky';
      emote = getRandomEmote(emotion);
      break;

    case 'build_house':
      emotion = 'excited';
      emote = getRandomEmote(emotion);
      break;

    case 'trade_propose':
      emotion = 'surprised';
      emote = getRandomEmote(emotion);
      break;

    case 'trade_accepted':
      emotion = 'excited';
      emote = getRandomEmote(emotion);
      break;

    case 'trade_rejected':
      emotion = 'frustrated';
      emote = getRandomEmote(emotion);
      break;

    case 'game_won':
      emotion = 'excited';
      emote = getRandomEmote(emotion);
      break;

    case 'game_lost':
      emotion = 'sad';
      emote = getRandomEmote(emotion);
      break;

    case 'bankrupt':
      emotion = 'sad';
      emote = getRandomEmote(emotion);
      break;

    case 'auction_won':
      emotion = 'excited';
      emote = getRandomEmote(emotion);
      break;

    case 'auction_lost':
      emotion = 'frustrated';
      emote = getRandomEmote(emotion);
      break;

    case 'landed_on_free_parking':
      emotion = 'happy';
      emote = getRandomEmote(emotion);
      break;

    case 'passed_go':
      emotion = 'lucky';
      emote = getRandomEmote(emotion);
      break;

    default:
      return; // Don't send emote for unknown events
  }

  if (emote) {
    // Get player position
    const playerPos = state.players.find(p => p.id === playerId)?.position || 0;
    
    // Send emote via store
    useGameStore.getState().sendEmote(playerId, emote, { position: playerPos });
    
    // Also record in AI watch store if in watch mode
    const aiWatchStore = useAIWatchStore.getState();
    if (aiWatchStore.isWatchMode) {
      aiWatchStore.recordDecision({
        type: 'emote',
        playerId,
        emote,
        emotion,
        triggerEvent: eventType,
      });
    }
    
    recordEmoteSent(playerId);
  }
}

/**
 * AI Emotion Engine Hook - React component for AI emotion triggers
 */
export function useAIEmotionEngine() {
  // This hook can be used to auto-subscribe to game events
  // and trigger emotes based on them
  // Currently implemented as a trigger function above
}

export default {
  triggerAIEmotion,
  useAIEmotionEngine,
};