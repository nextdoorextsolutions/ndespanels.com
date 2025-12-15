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
  name VARCHAR(100) NOT NULL,
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

-- Enable Row Level Security (RLS)
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_channels
CREATE POLICY "Users can view channels they are members of"
  ON chat_channels FOR SELECT
  USING (
    type = 'public' OR
    id IN (SELECT channel_id FROM channel_members WHERE user_id = auth.uid()::integer)
  );

CREATE POLICY "Users can create channels"
  ON chat_channels FOR INSERT
  WITH CHECK (created_by = auth.uid()::integer);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their channels"
  ON chat_messages FOR SELECT
  USING (
    channel_id IN (
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()::integer
    )
  );

CREATE POLICY "Users can send messages to their channels"
  ON chat_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::integer AND
    channel_id IN (
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()::integer
    )
  );

CREATE POLICY "Users can edit their own messages"
  ON chat_messages FOR UPDATE
  USING (user_id = auth.uid()::integer);

-- RLS Policies for channel_members
CREATE POLICY "Users can view channel members"
  ON channel_members FOR SELECT
  USING (
    channel_id IN (
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()::integer
    )
  );

CREATE POLICY "Channel owners can add members"
  ON channel_members FOR INSERT
  WITH CHECK (
    channel_id IN (
      SELECT channel_id FROM channel_members 
      WHERE user_id = auth.uid()::integer AND role IN ('owner', 'admin')
    )
  );
