/**
 * Matchmaking API Routes
 *
 * Handles matchmaking queue operations and stats endpoints.
 */

import { Hono } from 'hono';
import { authMiddleware, AuthContext } from '../middleware/auth';
import { RatingService } from '../services/ratingService';
import type { Env } from '../core-utils';

export function matchmakingRoutes(app: Hono<{ Bindings: Env }>) {
  // Get matchmaking Durable Object stub
  function getMatchmakingQueue(env: Env) {
    const id = env.MatchmakingQueue.idFromName('global');
    return env.MatchmakingQueue.get(id);
  }

  // ==========================================================================
  // Matchmaking Queue Endpoints
  // ==========================================================================

  /**
   * Join matchmaking queue
   * POST /api/matchmaking/join
   */
  app.post(
    '/api/matchmaking/join',
    (c, next) =>
      authMiddleware(c.env.JWT_SECRET, c.env.kido_go_users)(c, next),
    async (c) => {
      try {
        const authContext = c as AuthContext;
        const user = authContext.user!;

        // Check tier limits (free users: 10 ranked/day)
        if (user.tier === 'free') {
          const today = new Date().toISOString().split('T')[0];

          // Check/reset daily counter
          if (user.last_ranked_game_date !== today) {
            await c.env.kido_go_users
              .prepare('UPDATE users SET ranked_games_today = 0, last_ranked_game_date = ? WHERE id = ?')
              .bind(today, user.id)
              .run();
            user.ranked_games_today = 0;
          }

          if ((user.ranked_games_today || 0) >= 10) {
            return c.json(
              {
                success: false,
                error: 'Daily ranked game limit reached',
                upgradePrompt: 'Upgrade to paid tier for unlimited ranked games',
              },
              403
            );
          }
        }

        // Get player rating
        const ratingService = new RatingService(c.env.kido_go_users);
        const playerRating = await ratingService.getPlayerRating(user.id);

        // Call Durable Object
        const queue = getMatchmakingQueue(c.env);
        const response = await queue.fetch(
          new Request('http://internal/join', {
            method: 'POST',
            body: JSON.stringify({
              userId: user.id,
              userName: user.name,
              userPicture: user.picture,
              rating: playerRating.rating,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
          })
        );

        const result = await response.json();
        return c.json({ success: true, data: result });
      } catch (error: any) {
        console.error('[Matchmaking] Join error:', error);
        return c.json(
          { success: false, error: error.message },
          500
        );
      }
    }
  );

  /**
   * Leave matchmaking queue
   * POST /api/matchmaking/leave
   */
  app.post(
    '/api/matchmaking/leave',
    (c, next) =>
      authMiddleware(c.env.JWT_SECRET, c.env.kido_go_users)(c, next),
    async (c) => {
      try {
        const authContext = c as AuthContext;
        const user = authContext.user!;

        const queue = getMatchmakingQueue(c.env);
        const response = await queue.fetch(
          new Request('http://internal/leave', {
            method: 'POST',
            body: JSON.stringify({ userId: user.id }),
            headers: {
              'Content-Type': 'application/json',
            },
          })
        );

        const result = await response.json();
        return c.json({ success: true, data: result });
      } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
      }
    }
  );

  /**
   * Get queue status
   * GET /api/matchmaking/status
   */
  app.get(
    '/api/matchmaking/status',
    (c, next) =>
      authMiddleware(c.env.JWT_SECRET, c.env.kido_go_users)(c, next),
    async (c) => {
      try {
        const authContext = c as AuthContext;
        const user = authContext.user!;

        const queue = getMatchmakingQueue(c.env);
        const response = await queue.fetch(
          `http://internal/status?userId=${user.id}`
        );

        const result = await response.json();
        return c.json({ success: true, data: result });
      } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
      }
    }
  );

  /**
   * Accept match
   * POST /api/matchmaking/accept/:matchId
   */
  app.post(
    '/api/matchmaking/accept/:matchId',
    (c, next) =>
      authMiddleware(c.env.JWT_SECRET, c.env.kido_go_users)(c, next),
    async (c) => {
      try {
        const authContext = c as AuthContext;
        const user = authContext.user!;
        const matchId = c.req.param('matchId');

        const queue = getMatchmakingQueue(c.env);
        const response = await queue.fetch(
          new Request('http://internal/accept', {
            method: 'POST',
            body: JSON.stringify({ userId: user.id, matchId }),
            headers: {
              'Content-Type': 'application/json',
            },
          })
        );

        const result = await response.json();
        return c.json({ success: true, data: result });
      } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
      }
    }
  );

  /**
   * Reject match
   * POST /api/matchmaking/reject/:matchId
   */
  app.post(
    '/api/matchmaking/reject/:matchId',
    (c, next) =>
      authMiddleware(c.env.JWT_SECRET, c.env.kido_go_users)(c, next),
    async (c) => {
      try {
        const authContext = c as AuthContext;
        const user = authContext.user!;
        const matchId = c.req.param('matchId');

        const queue = getMatchmakingQueue(c.env);
        const response = await queue.fetch(
          new Request('http://internal/reject', {
            method: 'POST',
            body: JSON.stringify({ userId: user.id, matchId }),
            headers: {
              'Content-Type': 'application/json',
            },
          })
        );

        const result = await response.json();
        return c.json({ success: true, data: result });
      } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
      }
    }
  );

  // ==========================================================================
  // Stats & Leaderboard Endpoints
  // ==========================================================================

  /**
   * Get my stats
   * GET /api/stats/me
   */
  app.get(
    '/api/stats/me',
    (c, next) =>
      authMiddleware(c.env.JWT_SECRET, c.env.kido_go_users)(c, next),
    async (c) => {
      try {
        const authContext = c as AuthContext;
        const user = authContext.user!;

        const ratingService = new RatingService(c.env.kido_go_users);
        const rating = await ratingService.getPlayerRating(user.id);
        const rank = await ratingService.getPlayerRank(user.id);
        const recentGames = await ratingService.getPlayerRecentGames(
          user.id,
          10
        );

        return c.json({
          success: true,
          data: {
            rating,
            rank,
            recentGames,
          },
        });
      } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
      }
    }
  );

  /**
   * Get user stats by ID
   * GET /api/stats/user/:userId
   */
  app.get('/api/stats/user/:userId', async (c) => {
    try {
      const userId = c.req.param('userId');

      const ratingService = new RatingService(c.env.kido_go_users);
      const rating = await ratingService.getPlayerRating(userId);
      const rank = await ratingService.getPlayerRank(userId);

      return c.json({
        success: true,
        data: {
          rating,
          rank,
        },
      });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  /**
   * Get leaderboard
   * GET /api/stats/leaderboard?limit=100
   */
  app.get('/api/stats/leaderboard', async (c) => {
    try {
      const limit = Number(c.req.query('limit')) || 100;

      const ratingService = new RatingService(c.env.kido_go_users);
      const topPlayers = await ratingService.getTopPlayers(limit);

      // Enrich with user data
      const enrichedPlayers = await Promise.all(
        topPlayers.map(async (player) => {
          const user = await c.env.kido_go_users
            .prepare('SELECT id, name, picture, tier FROM users WHERE id = ?')
            .bind(player.user_id)
            .first<{ id: string; name: string; picture: string; tier: string }>();

          return {
            ...player,
            user: user || { id: player.user_id, name: 'Unknown', picture: '', tier: 'free' },
          };
        })
      );

      return c.json({
        success: true,
        data: enrichedPlayers,
      });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });
}
