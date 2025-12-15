-- Migration: Add Chat System (Channels, Messages, Members)
-- Phase 1: Database Schema for Real Team Messaging

-- Create channel_type enum
DO $$ BEGIN
  CREATE TYPE channel_type AS ENUM ('public', 'private', 'dm');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create chat_channels table
CREATE TABLE IF NOT EXISTS chat_channels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type channel_type NOT NULL DEFAULT 'public',
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  metadata JSONB,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create channel_members table
CREATE TABLE IF NOT EXISTS channel_members (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  last_read_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(channel_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_type ON chat_channels(type);

-- Seed default public channels
INSERT INTO chat_channels (name, type, description, created_by)
VALUES 
  ('general-announcements', 'public', 'Company-wide news, safety bulletins', NULL),
  ('wins-and-shoutouts', 'public', 'Sales wins, 5-star reviews, employee recognition', NULL),
  ('safety-alerts', 'public', 'Weather warnings, job site hazards, OSHA updates', NULL),
  ('fleet-logistics', 'public', 'Truck assignments, maintenance, equipment tracking', NULL),
  ('leads-incoming', 'public', 'New leads from website/ads', NULL),
  ('estimates-and-bids', 'public', 'Pricing, material costs, margin approvals', NULL),
  ('active-installs', 'public', 'Live updates from the field', NULL),
  ('permitting-and-hoa', 'public', 'City permits and HOA approvals', NULL),
  ('service-and-repair', 'public', 'Warranty calls, leaks, post-install fixes', NULL),
  ('tech-support', 'public', 'CRM or iPad issues for field reps', NULL),
  ('material-orders', 'public', 'Shingles, panels, inverters requests', NULL),
  ('design-engineering', 'public', 'Solar array layouts, structural questions', NULL)
ON CONFLICT DO NOTHING;

-- Add all existing users to public channels automatically
INSERT INTO channel_members (channel_id, user_id, joined_at)
SELECT c.id, u.id, NOW()
FROM chat_channels c
CROSS JOIN users u
WHERE c.type = 'public'
ON CONFLICT DO NOTHING;

-- Note: RLS policies disabled for now
-- Supabase uses UUID-based auth (auth.uid()) but our users table uses INTEGER IDs
-- Access control is handled at the application layer via tRPC protected procedures
-- If you need RLS in the future, you'll need to either:
--   1. Add a uuid column to users table and map it to auth.users.id
--   2. Create a helper function to map auth.uid() to your integer user_id

-- For now, we rely on backend permission checks in chatRouter
-- All queries verify channel membership before returning data
