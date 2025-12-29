-- Add user profile fields: nickname and badges system
-- Migration: add_user_profiles_badges.sql
-- Date: 2024-12-29

-- Add nickname column for display names
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);

-- Add badges column (JSONB array of badge objects)
-- Structure: [{ id: string, name: string, emoji: string, color: string, assignedBy: number, assignedAt: timestamp }]
ALTER TABLE users ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;

-- Add selected_badge column (which badge to display)
ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_badge VARCHAR(50);

COMMENT ON COLUMN users.nickname IS 'User-chosen display name/nickname';
COMMENT ON COLUMN users.badges IS 'Array of badges assigned to user by owners';
COMMENT ON COLUMN users.selected_badge IS 'ID of the badge currently displayed by user';

-- Create index for faster badge queries
CREATE INDEX IF NOT EXISTS idx_users_badges ON users USING GIN (badges);
