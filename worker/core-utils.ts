/**
 * Core utilities for the Cloudflare Durable Object template
 * STRICTLY DO NOT MODIFY THIS FILE - Hidden from AI to prevent breaking core functionality
 */
import { GlobalDurableObject } from './durableObject';
import { MatchmakingQueue } from './durableObjects/MatchmakingQueue';

export { GlobalDurableObject, MatchmakingQueue };

export type Env = {
    GlobalDurableObject: DurableObjectNamespace<GlobalDurableObject>;
    MatchmakingQueue: DurableObjectNamespace<MatchmakingQueue>;
    kido_go_users: D1Database;
    JWT_SECRET: string;
}