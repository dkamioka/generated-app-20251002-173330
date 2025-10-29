-- Matchmaking System Schema
-- Run this after the main schema.sql

-- Player ratings and statistics
CREATE TABLE IF NOT EXISTS player_ratings (
    user_id TEXT PRIMARY KEY,
    rating INTEGER DEFAULT 1200,
    ranked_wins INTEGER DEFAULT 0,
    ranked_losses INTEGER DEFAULT 0,
    peak_rating INTEGER DEFAULT 1200,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    total_games INTEGER DEFAULT 0,
    last_game_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Matchmaking game history
CREATE TABLE IF NOT EXISTS ranked_games (
    id TEXT PRIMARY KEY,
    player1_id TEXT NOT NULL,
    player2_id TEXT NOT NULL,
    player1_rating_before INTEGER NOT NULL,
    player2_rating_before INTEGER NOT NULL,
    player1_rating_after INTEGER NOT NULL,
    player2_rating_after INTEGER NOT NULL,
    winner_id TEXT,
    game_id TEXT NOT NULL UNIQUE,
    duration_seconds INTEGER,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Matchmaking queue tracking (for analytics)
CREATE TABLE IF NOT EXISTS queue_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    joined_at TEXT NOT NULL,
    matched_at TEXT,
    match_id TEXT,
    wait_time_seconds INTEGER,
    status TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ratings_rating ON player_ratings(rating DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_last_game ON player_ratings(last_game_at);
CREATE INDEX IF NOT EXISTS idx_ranked_games_player1 ON ranked_games(player1_id);
CREATE INDEX IF NOT EXISTS idx_ranked_games_player2 ON ranked_games(player2_id);
CREATE INDEX IF NOT EXISTS idx_ranked_games_created ON ranked_games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_user ON queue_history(user_id);
