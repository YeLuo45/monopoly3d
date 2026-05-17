-- Supabase Database Schema for Monopoly3D Online Multiplayer
-- Run this SQL in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(6) UNIQUE NOT NULL,
  host_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  max_players INTEGER DEFAULT 6,
  current_turn INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_id VARCHAR(50) NOT NULL,
  name VARCHAR(20) NOT NULL,
  position INTEGER DEFAULT 0,
  money INTEGER DEFAULT 1500,
  properties INTEGER[] DEFAULT '{}',
  is_ready BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT true,
  color VARCHAR(10) DEFAULT '#FF6B6B',
  order_index INTEGER DEFAULT 0,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game events table (for event sourcing)
CREATE TABLE IF NOT EXISTS game_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('roll_dice', 'buy_property', 'pay_toll', 'build_house', 'answer_question', 'trade_property', 'end_turn')),
  payload JSONB DEFAULT '{}',
  turn_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_id VARCHAR(50) NOT NULL,
  player_name VARCHAR(20) NOT NULL,
  player_color VARCHAR(10) DEFAULT '#FF6B6B',
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Replays table
CREATE TABLE IF NOT EXISTS replays (
  id VARCHAR(50) PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  room_code VARCHAR(6) NOT NULL,
  duration INTEGER DEFAULT 0,
  event_count INTEGER DEFAULT 0,
  events JSONB DEFAULT '[]',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_players_player_id ON players(player_id);
CREATE INDEX IF NOT EXISTS idx_game_events_room_id ON game_events(room_id);
CREATE INDEX IF NOT EXISTS idx_game_events_created ON game_events(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_replays_room_code ON replays(room_code);
CREATE INDEX IF NOT EXISTS idx_replays_recorded_at ON replays(recorded_at);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to generate a unique 6-character room code
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code VARCHAR(6) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new room
CREATE OR REPLACE FUNCTION create_room(
  p_host_id VARCHAR(50),
  p_max_players INTEGER DEFAULT 6,
  p_settings JSONB DEFAULT '{}'
)
RETURNS rooms AS $$
DECLARE
  v_code VARCHAR(6);
  v_room rooms;
BEGIN
  -- Generate unique code
  LOOP
    v_code := generate_room_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM rooms WHERE code = v_code);
  END LOOP;
  
  INSERT INTO rooms (code, host_id, max_players, settings)
  VALUES (v_code, p_host_id, p_max_players, p_settings)
  RETURNING * INTO v_room;
  
  RETURN v_room;
END;
$$ LANGUAGE plpgsql;

-- Function to add a player to a room
CREATE OR REPLACE FUNCTION add_player_to_room(
  p_room_id UUID,
  p_player_id VARCHAR(50),
  p_name VARCHAR(20),
  p_color VARCHAR(10)
)
RETURNS players AS $$
DECLARE
  v_player_count INTEGER;
  v_max_players INTEGER;
  v_order_index INTEGER;
  v_player players;
BEGIN
  -- Check room capacity
  SELECT max_players INTO v_max_players FROM rooms WHERE id = p_room_id;
  SELECT COUNT(*) INTO v_player_count FROM players WHERE room_id = p_room_id;
  
  IF v_player_count >= v_max_players THEN
    RAISE EXCEPTION 'Room is full';
  END IF;
  
  -- Get next order index
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_order_index 
  FROM players WHERE room_id = p_room_id;
  
  INSERT INTO players (room_id, player_id, name, color, order_index)
  VALUES (p_room_id, p_player_id, p_name, p_color, v_order_index)
  RETURNING * INTO v_player;
  
  RETURN v_player;
END;
$$ LANGUAGE plpgsql;

-- Function to record a game event
CREATE OR REPLACE FUNCTION record_game_event(
  p_room_id UUID,
  p_player_id VARCHAR(50),
  p_event_type VARCHAR(30),
  p_payload JSONB DEFAULT '{}',
  p_turn_index INTEGER DEFAULT 0
)
RETURNS game_events AS $$
DECLARE
  v_event game_events;
BEGIN
  INSERT INTO game_events (room_id, player_id, event_type, payload, turn_index)
  VALUES (p_room_id, p_player_id, p_event_type, p_payload, p_turn_index)
  RETURNING * INTO v_event;
  
  RETURN v_event;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_events;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE replays;

-- ============================================
-- ROW LEVEL SECURITY (optional, for production)
-- ============================================

-- For anonymous access, you may want to disable RLS or configure appropriately
-- ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE players ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Simple policies allowing anonymous access (for development)
-- In production, you'd want proper authentication
CREATE POLICY "Allow all on rooms" ON rooms FOR ALL USING (true);
CREATE POLICY "Allow all on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all on game_events" ON game_events FOR ALL USING (true);
CREATE POLICY "Allow all on chat_messages" ON chat_messages FOR ALL USING (true);
CREATE POLICY "Allow all on replays" ON replays FOR ALL USING (true);

-- =====================================================
-- LEADERBOARD TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT UNIQUE NOT NULL,
  player_name TEXT,
  avatar TEXT DEFAULT '👤',
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  win_rate NUMERIC(5,4) DEFAULT 0,
  achievement_points INTEGER DEFAULT 0,
  total_wealth BIGINT DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  total_play_time INTEGER DEFAULT 0, -- in seconds
  last_game_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_wins ON leaderboard(wins DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_games ON leaderboard(games_played DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_win_rate ON leaderboard(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_achievement_points ON leaderboard(achievement_points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_wealth ON leaderboard(total_wealth DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_streak ON leaderboard(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_updated ON leaderboard(updated_at);

ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard;
CREATE POLICY "Allow all on leaderboard" ON leaderboard FOR ALL USING (true);

-- =====================================================
-- USER PROFILES & CLOUD SAVE TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '玩家',
  avatar TEXT DEFAULT '👤',
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 1000,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cloud_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  save_key TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, save_key)
);

CREATE INDEX IF NOT EXISTS idx_cloud_saves_user ON cloud_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_saves_updated ON cloud_saves(updated_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE cloud_saves;
CREATE POLICY "Allow all on profiles" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow all on cloud_saves" ON cloud_saves FOR ALL USING (true);
