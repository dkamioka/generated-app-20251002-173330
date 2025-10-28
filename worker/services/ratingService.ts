/**
 * Rating Service - ELO Rating System
 *
 * Handles player rating calculations and updates using the ELO rating system.
 * Reference: https://en.wikipedia.org/wiki/Elo_rating_system
 */

export interface PlayerRating {
  user_id: string;
  rating: number;
  ranked_wins: number;
  ranked_losses: number;
  peak_rating: number;
  current_streak: number;
  best_streak: number;
  total_games: number;
  last_game_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RatingChange {
  oldRating: number;
  newRating: number;
  change: number;
}

export interface GameResult {
  winnerId: string;
  loserId: string;
  isDraw: boolean;
}

export class RatingService {
  private db: D1Database;
  private readonly K_FACTOR = 32; // Standard K-factor for active players
  private readonly INITIAL_RATING = 1200;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Calculate ELO rating change
   * Formula: newRating = oldRating + K * (actualScore - expectedScore)
   */
  calculateNewRating(
    playerRating: number,
    opponentRating: number,
    result: 'win' | 'loss' | 'draw'
  ): number {
    // Calculate expected score (probability of winning)
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));

    // Actual score: 1 for win, 0 for loss, 0.5 for draw
    const actualScore = result === 'win' ? 1 : result === 'loss' ? 0 : 0.5;

    // Calculate rating change
    const ratingChange = this.K_FACTOR * (actualScore - expectedScore);

    // Return new rating (rounded to nearest integer)
    return Math.round(playerRating + ratingChange);
  }

  /**
   * Get or create player rating
   */
  async getPlayerRating(userId: string): Promise<PlayerRating> {
    const result = await this.db
      .prepare('SELECT * FROM player_ratings WHERE user_id = ?')
      .bind(userId)
      .first<PlayerRating>();

    if (result) {
      return result;
    }

    // Create new rating entry
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO player_ratings
        (user_id, rating, peak_rating, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)`
      )
      .bind(userId, this.INITIAL_RATING, this.INITIAL_RATING, now, now)
      .run();

    return {
      user_id: userId,
      rating: this.INITIAL_RATING,
      ranked_wins: 0,
      ranked_losses: 0,
      peak_rating: this.INITIAL_RATING,
      current_streak: 0,
      best_streak: 0,
      total_games: 0,
      last_game_at: null,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Update ratings after a game
   */
  async updateRatingsAfterGame(
    player1Id: string,
    player2Id: string,
    winnerId: string | null // null for draw
  ): Promise<{ player1: RatingChange; player2: RatingChange }> {
    // Get current ratings
    const player1Rating = await this.getPlayerRating(player1Id);
    const player2Rating = await this.getPlayerRating(player2Id);

    // Determine results
    const isDraw = winnerId === null;
    const player1Result = isDraw ? 'draw' : (winnerId === player1Id ? 'win' : 'loss');
    const player2Result = isDraw ? 'draw' : (winnerId === player2Id ? 'win' : 'loss');

    // Calculate new ratings
    const player1NewRating = this.calculateNewRating(
      player1Rating.rating,
      player2Rating.rating,
      player1Result
    );
    const player2NewRating = this.calculateNewRating(
      player2Rating.rating,
      player1Rating.rating,
      player2Result
    );

    // Update player 1
    await this.updatePlayerRating(
      player1Id,
      player1NewRating,
      player1Result === 'win'
    );

    // Update player 2
    await this.updatePlayerRating(
      player2Id,
      player2NewRating,
      player2Result === 'win'
    );

    return {
      player1: {
        oldRating: player1Rating.rating,
        newRating: player1NewRating,
        change: player1NewRating - player1Rating.rating,
      },
      player2: {
        oldRating: player2Rating.rating,
        newRating: player2NewRating,
        change: player2NewRating - player2Rating.rating,
      },
    };
  }

  /**
   * Update individual player rating
   */
  private async updatePlayerRating(
    userId: string,
    newRating: number,
    isWin: boolean
  ): Promise<void> {
    const current = await this.getPlayerRating(userId);
    const now = new Date().toISOString();

    // Calculate streak
    const newStreak = isWin ? current.current_streak + 1 : 0;
    const newBestStreak = Math.max(current.best_streak, newStreak);
    const newPeakRating = Math.max(current.peak_rating, newRating);

    await this.db
      .prepare(
        `UPDATE player_ratings
        SET rating = ?,
            ranked_wins = ranked_wins + ?,
            ranked_losses = ranked_losses + ?,
            peak_rating = ?,
            current_streak = ?,
            best_streak = ?,
            total_games = total_games + 1,
            last_game_at = ?,
            updated_at = ?
        WHERE user_id = ?`
      )
      .bind(
        newRating,
        isWin ? 1 : 0,
        isWin ? 0 : 1,
        newPeakRating,
        newStreak,
        newBestStreak,
        now,
        now,
        userId
      )
      .run();
  }

  /**
   * Get top players for leaderboard
   */
  async getTopPlayers(limit: number = 100): Promise<PlayerRating[]> {
    const results = await this.db
      .prepare(
        `SELECT * FROM player_ratings
        WHERE total_games >= 5
        ORDER BY rating DESC
        LIMIT ?`
      )
      .bind(limit)
      .all<PlayerRating>();

    return results.results || [];
  }

  /**
   * Get player rank
   */
  async getPlayerRank(userId: string): Promise<number> {
    const rating = await this.getPlayerRating(userId);

    const result = await this.db
      .prepare(
        `SELECT COUNT(*) as rank
        FROM player_ratings
        WHERE rating > ? AND total_games >= 5`
      )
      .bind(rating.rating)
      .first<{ rank: number }>();

    return (result?.rank || 0) + 1;
  }

  /**
   * Save game to history
   */
  async saveRankedGame(
    gameId: string,
    player1Id: string,
    player2Id: string,
    player1RatingBefore: number,
    player2RatingBefore: number,
    player1RatingAfter: number,
    player2RatingAfter: number,
    winnerId: string | null,
    durationSeconds: number
  ): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO ranked_games
        (id, game_id, player1_id, player2_id,
         player1_rating_before, player2_rating_before,
         player1_rating_after, player2_rating_after,
         winner_id, duration_seconds, completed_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        gameId,
        player1Id,
        player2Id,
        player1RatingBefore,
        player2RatingBefore,
        player1RatingAfter,
        player2RatingAfter,
        winnerId,
        durationSeconds,
        now,
        now
      )
      .run();
  }

  /**
   * Get player's recent ranked games
   */
  async getPlayerRecentGames(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    const results = await this.db
      .prepare(
        `SELECT * FROM ranked_games
        WHERE player1_id = ? OR player2_id = ?
        ORDER BY created_at DESC
        LIMIT ?`
      )
      .bind(userId, userId, limit)
      .all();

    return results.results || [];
  }
}
