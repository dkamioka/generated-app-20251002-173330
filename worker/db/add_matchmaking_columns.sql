-- Add matchmaking-related columns to users table
-- Run this AFTER running schema.sql if users table already exists

-- Add columns for daily ranked game limits (tier feature)
ALTER TABLE users ADD COLUMN ranked_games_today INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_ranked_game_date TEXT;
ALTER TABLE users ADD COLUMN current_rating INTEGER DEFAULT 1200;
