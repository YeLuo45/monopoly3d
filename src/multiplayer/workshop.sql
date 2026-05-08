-- Workshop (Creative Workshop) Database Schema for Monopoly3D
-- Run this SQL in your Supabase SQL Editor to set up the creative workshop system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Workshop Maps (user-created board configurations)
CREATE TABLE IF NOT EXISTS workshop_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id VARCHAR(50) NOT NULL,
  author_name VARCHAR(20) NOT NULL,
  name VARCHAR(20) NOT NULL,
  description VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  board_config JSONB NOT NULL,
  rules_config JSONB DEFAULT '{}',
  version VARCHAR(10) DEFAULT 'v1',
  downloads INTEGER DEFAULT 0,
  rating_avg FLOAT DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workshop Question Banks
CREATE TABLE IF NOT EXISTS workshop_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id VARCHAR(50) NOT NULL,
  author_name VARCHAR(20) NOT NULL,
  title VARCHAR(50) NOT NULL,
  categories TEXT[] DEFAULT '{}',
  questions JSONB NOT NULL,
  downloads INTEGER DEFAULT 0,
  rating_avg FLOAT DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workshop Themes
CREATE TABLE IF NOT EXISTS workshop_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id VARCHAR(50) NOT NULL,
  author_name VARCHAR(20) NOT NULL,
  name VARCHAR(30) NOT NULL,
  theme_config JSONB NOT NULL,
  downloads INTEGER DEFAULT 0,
  rating_avg FLOAT DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workshop Ratings (1-5 stars + optional comment)
CREATE TABLE IF NOT EXISTS workshop_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL,
  item_type VARCHAR(10) NOT NULL CHECK (item_type IN ('map', 'question', 'theme')),
  user_id VARCHAR(50) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(item_id, user_id)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE workshop_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_ratings ENABLE ROW LEVEL SECURITY;

-- Public read for all workshop content
CREATE POLICY "Anyone can read maps" ON workshop_maps FOR SELECT USING (true);
CREATE POLICY "Anyone can read questions" ON workshop_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can read themes" ON workshop_themes FOR SELECT USING (true);
CREATE POLICY "Anyone can read ratings" ON workshop_ratings FOR SELECT USING (true);

-- Anyone can insert (publish)
CREATE POLICY "Anyone can publish maps" ON workshop_maps FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can publish questions" ON workshop_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can publish themes" ON workshop_themes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can rate items" ON workshop_ratings FOR INSERT WITH CHECK (true);

-- Anyone can update their own ratings
CREATE POLICY "Anyone can update own ratings" ON workshop_ratings FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

-- Anyone can delete their own ratings
CREATE POLICY "Anyone can delete own ratings" ON workshop_ratings FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Increment download count
CREATE OR REPLACE FUNCTION increment_map_downloads(map_id UUID)
RETURNS VOID AS $$
  UPDATE workshop_maps SET downloads = downloads + 1 WHERE id = map_id;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_question_downloads(q_id UUID)
RETURNS VOID AS $$
  UPDATE workshop_questions SET downloads = downloads + 1 WHERE id = q_id;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_theme_downloads(t_id UUID)
RETURNS VOID AS $$
  UPDATE workshop_themes SET downloads = downloads + 1 WHERE id = t_id;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update rating average for an item
CREATE OR REPLACE FUNCTION update_item_rating(item_uuid UUID, item_type VARCHAR)
RETURNS VOID AS $$
BEGIN
  IF item_type = 'map' THEN
    UPDATE workshop_maps SET
      rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM workshop_ratings WHERE item_id = item_uuid),
      rating_count = (SELECT COUNT(*) FROM workshop_ratings WHERE item_id = item_uuid)
    WHERE id = item_uuid;
  ELSIF item_type = 'question' THEN
    UPDATE workshop_questions SET
      rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM workshop_ratings WHERE item_id = item_uuid),
      rating_count = (SELECT COUNT(*) FROM workshop_ratings WHERE item_id = item_uuid)
    WHERE id = item_uuid;
  ELSIF item_type = 'theme' THEN
    UPDATE workshop_themes SET
      rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM workshop_ratings WHERE item_id = item_uuid),
      rating_count = (SELECT COUNT(*) FROM workshop_ratings WHERE item_id = item_uuid)
    WHERE id = item_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update rating on new rating insert
CREATE OR REPLACE FUNCTION trigger_update_rating()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_item_rating(NEW.item_id, NEW.item_type);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_rating
  AFTER INSERT ON workshop_ratings
  FOR EACH ROW EXECUTE FUNCTION trigger_update_rating();
