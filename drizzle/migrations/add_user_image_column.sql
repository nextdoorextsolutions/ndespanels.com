-- Add image column to users table for profile photos/avatars
-- Migration: add_user_image_column.sql
-- Date: 2024-12-12

ALTER TABLE users ADD COLUMN IF NOT EXISTS image TEXT;

COMMENT ON COLUMN users.image IS 'Profile photo/avatar URL stored in Supabase Storage';
