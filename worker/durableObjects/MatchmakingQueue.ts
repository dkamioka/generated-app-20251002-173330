/**
 * MatchmakingQueue Durable Object
 *
 * Manages the matchmaking queue and finds matches between players.
 * Uses a simple algorithm: match players with similar ratings.
 */

export interface QueueEntry {
  userId: string;
  userName: string;
  userPicture: string;
  rating: number;
  joinedAt: number;
  ratingRange: number; // Expands over time
}

export interface Match {
  id: string;
  player1: QueueEntry;
  player2: QueueEntry;
  createdAt: number;
  expiresAt: number; // Players have 30s to accept
}

export interface QueueStatus {
  inQueue: boolean;
  position?: number;
  estimatedWait?: number;
  queueSize?: number;
}

export class MatchmakingQueue {
  private state: DurableObjectState;
  private env: any;
  private queue: Map<string, QueueEntry>;
  private pendingMatches: Map<string, Match>;
  private matchAcceptance: Map<string, Set<string>>; // matchId -> Set of userIds who accepted

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    this.queue = new Map();
    this.pendingMatches = new Map();
    this.matchAcceptance = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/join' && request.method === 'POST') {
        const data = await request.json<{
          userId: string;
          userName: string;
          userPicture: string;
          rating: number;
        }>();
        return await this.handleJoin(data);
      }

      if (path === '/leave' && request.method === 'POST') {
        const data = await request.json<{ userId: string }>();
        return await this.handleLeave(data.userId);
      }

      if (path === '/status' && request.method === 'GET') {
        const userId = url.searchParams.get('userId');
        if (!userId) {
          return new Response('Missing userId', { status: 400 });
        }
        return await this.handleStatus(userId);
      }

      if (path === '/accept' && request.method === 'POST') {
        const data = await request.json<{ userId: string; matchId: string }>();
        return await this.handleAccept(data.userId, data.matchId);
      }

      if (path === '/reject' && request.method === 'POST') {
        const data = await request.json<{ userId: string; matchId: string }>();
        return await this.handleReject(data.userId, data.matchId);
      }

      return new Response('Not found', { status: 404 });
    } catch (error: any) {
      console.error('[MatchmakingQueue] Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Player joins the queue
   */
  private async handleJoin(data: {
    userId: string;
    userName: string;
    userPicture: string;
    rating: number;
  }): Promise<Response> {
    // Check if already in queue
    if (this.queue.has(data.userId)) {
      return new Response(
        JSON.stringify({ error: 'Already in queue' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Add to queue
    const entry: QueueEntry = {
      userId: data.userId,
      userName: data.userName,
      userPicture: data.userPicture,
      rating: data.rating,
      joinedAt: Date.now(),
      ratingRange: 100, // Initial range ±100
    };

    this.queue.set(data.userId, entry);

    // Try to find match immediately
    const match = await this.findMatch(entry);

    if (match) {
      // Match found!
      return new Response(
        JSON.stringify({
          success: true,
          match: {
            id: match.id,
            opponent:
              match.player1.userId === data.userId
                ? match.player2
                : match.player1,
          },
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // No match found, stay in queue
    // Start expanding range over time
    this.scheduleRangeExpansion(data.userId);

    return new Response(
      JSON.stringify({ success: true, inQueue: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Player leaves the queue
   */
  private async handleLeave(userId: string): Promise<Response> {
    this.queue.delete(userId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Get queue status
   */
  private async handleStatus(userId: string): Promise<Response> {
    const entry = this.queue.get(userId);

    if (!entry) {
      // Check if in pending match
      for (const match of this.pendingMatches.values()) {
        if (
          match.player1.userId === userId ||
          match.player2.userId === userId
        ) {
          return new Response(
            JSON.stringify({
              inQueue: false,
              matchFound: true,
              match: {
                id: match.id,
                opponent:
                  match.player1.userId === userId
                    ? match.player2
                    : match.player1,
              },
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ inQueue: false }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const queueSize = this.queue.size;
    const position = Array.from(this.queue.values())
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .findIndex((e) => e.userId === userId) + 1;

    const waitTime = Math.floor((Date.now() - entry.joinedAt) / 1000);

    return new Response(
      JSON.stringify({
        inQueue: true,
        position,
        queueSize,
        waitTime,
        ratingRange: entry.ratingRange,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Player accepts match
   */
  private async handleAccept(
    userId: string,
    matchId: string
  ): Promise<Response> {
    const match = this.pendingMatches.get(matchId);

    if (!match) {
      return new Response(
        JSON.stringify({ error: 'Match not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Add to acceptance set
    if (!this.matchAcceptance.has(matchId)) {
      this.matchAcceptance.set(matchId, new Set());
    }
    this.matchAcceptance.get(matchId)!.add(userId);

    // Check if both players accepted
    const acceptances = this.matchAcceptance.get(matchId)!;
    if (
      acceptances.has(match.player1.userId) &&
      acceptances.has(match.player2.userId)
    ) {
      // Both accepted! Create ranked game via GlobalDurableObject
      try {
        // Get GlobalDurableObject instance
        const doId = this.env.GlobalDurableObject.idFromName('global');
        const stub = this.env.GlobalDurableObject.get(doId);

        // Create ranked game
        const result = await stub.createRankedGame(
          matchId,
          {
            userId: match.player1.userId,
            name: match.player1.userName,
            rating: match.player1.rating,
          },
          {
            userId: match.player2.userId,
            name: match.player2.userName,
            rating: match.player2.rating,
          },
          19 // Default to 19x19 for ranked
        );

        // Remove from queue and pending
        this.queue.delete(match.player1.userId);
        this.queue.delete(match.player2.userId);
        this.pendingMatches.delete(matchId);
        this.matchAcceptance.delete(matchId);

        return new Response(
          JSON.stringify({
            success: true,
            gameReady: true,
            gameId: result.game.gameId,
            player1SessionId: result.player1Session.sessionId,
            player2SessionId: result.player2Session.sessionId,
            player1PlayerId: result.player1Session.id,
            player2PlayerId: result.player2Session.id,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        console.error('[MatchmakingQueue] Failed to create ranked game:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to create game: ' + error.message,
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Waiting for other player
    return new Response(
      JSON.stringify({
        success: true,
        waitingForOpponent: true,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Player rejects match
   */
  private async handleReject(
    userId: string,
    matchId: string
  ): Promise<Response> {
    const match = this.pendingMatches.get(matchId);

    if (!match) {
      return new Response(
        JSON.stringify({ error: 'Match not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Remove match
    this.pendingMatches.delete(matchId);
    this.matchAcceptance.delete(matchId);

    // Put both players back in queue (unless they left)
    // They stay in queue with their current settings

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Find a match for a player
   */
  private async findMatch(player: QueueEntry): Promise<Match | null> {
    let bestMatch: QueueEntry | null = null;
    let bestRatingDiff = Infinity;

    // Search queue for compatible opponent
    for (const [userId, entry] of this.queue) {
      // Skip self
      if (userId === player.userId) continue;

      // Check rating range
      const ratingDiff = Math.abs(entry.rating - player.rating);
      if (ratingDiff > player.ratingRange) continue;
      if (ratingDiff > entry.ratingRange) continue;

      // Track best match
      if (ratingDiff < bestRatingDiff) {
        bestMatch = entry;
        bestRatingDiff = ratingDiff;
      }
    }

    if (!bestMatch) {
      return null;
    }

    // Create match
    const match: Match = {
      id: crypto.randomUUID(),
      player1: player,
      player2: bestMatch,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30000, // 30 seconds to accept
    };

    // Remove from queue (temporarily)
    this.queue.delete(player.userId);
    this.queue.delete(bestMatch.userId);

    // Add to pending matches
    this.pendingMatches.set(match.id, match);

    // Schedule expiration
    setTimeout(() => {
      this.expireMatch(match.id);
    }, 30000);

    return match;
  }

  /**
   * Expand rating range over time
   */
  private scheduleRangeExpansion(userId: string): void {
    // Every 30 seconds, expand range by 50 (up to max 300)
    const interval = setInterval(() => {
      const entry = this.queue.get(userId);
      if (!entry) {
        clearInterval(interval);
        return;
      }

      // Expand range
      entry.ratingRange = Math.min(entry.ratingRange + 50, 300);

      // Try to find match again
      this.findMatch(entry).then((match) => {
        if (match) {
          clearInterval(interval);
          // Match found will be picked up by polling
        }
      });

      // Stop after 5 minutes
      if (Date.now() - entry.joinedAt > 300000) {
        clearInterval(interval);
        this.queue.delete(userId);
      }
    }, 30000);
  }

  /**
   * Expire a match if not accepted
   */
  private expireMatch(matchId: string): void {
    const match = this.pendingMatches.get(matchId);
    if (!match) return;

    const acceptances = this.matchAcceptance.get(matchId);
    if (acceptances?.size === 2) return; // Both accepted

    // Match expired, put players back in queue
    this.pendingMatches.delete(matchId);
    this.matchAcceptance.delete(matchId);

    // Re-add to queue if they haven't left
    // (they would have called /leave)
  }
}
