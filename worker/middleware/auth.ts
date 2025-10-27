/**
 * Authentication Middleware
 *
 * Validates JWT tokens and attaches user to request context.
 * Blocks banned users from accessing the API.
 *
 * Related: FEATURE_SPEC_USER_MANAGEMENT.md - Authentication Flow
 */

import { Context, Next } from 'hono';
import type { User, AuthTokenPayload } from '../../shared/types';
import { UserService } from '../services/userService';

// Extended context with user
export interface AuthContext extends Context {
  user?: User;
  userId?: string;
}

/**
 * JWT utilities using Web Crypto API
 */
export class JWTUtil {
  constructor(private secret: string) {}

  /**
   * Create JWT token
   */
  async sign(payload: AuthTokenPayload): Promise<string> {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const encodedHeader = this.base64urlEncode(JSON.stringify(header));
    const encodedPayload = this.base64urlEncode(JSON.stringify(payload));
    const data = `${encodedHeader}.${encodedPayload}`;

    const signature = await this.createSignature(data);
    const encodedSignature = this.base64urlEncode(signature);

    return `${data}.${encodedSignature}`;
  }

  /**
   * Verify and decode JWT token
   */
  async verify(token: string): Promise<AuthTokenPayload> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    // Verify signature
    const expectedSignature = await this.createSignature(data);
    const actualSignature = this.base64urlDecode(encodedSignature);

    if (!this.constantTimeCompare(expectedSignature, actualSignature)) {
      throw new Error('Invalid token signature');
    }

    // Decode payload
    const payload = JSON.parse(
      new TextDecoder().decode(this.base64urlDecode(encodedPayload))
    ) as AuthTokenPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }

    return payload;
  }

  /**
   * Create HMAC signature
   */
  private async createSignature(data: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.secret);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    return await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  }

  /**
   * Base64url encode
   */
  private base64urlEncode(data: string | ArrayBuffer): string {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Base64url decode
   */
  private base64urlDecode(str: string): Uint8Array {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Constant time comparison to prevent timing attacks
   */
  private constantTimeCompare(a: ArrayBuffer, b: ArrayBuffer): boolean {
    const aBytes = new Uint8Array(a);
    const bBytes = new Uint8Array(b);

    if (aBytes.length !== bBytes.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < aBytes.length; i++) {
      result |= aBytes[i] ^ bBytes[i];
    }

    return result === 0;
  }
}

/**
 * Authentication middleware
 *
 * Usage:
 *   app.use('/api/protected/*', authMiddleware(jwtSecret, db));
 *
 * Attaches user to context: c.user
 */
export function authMiddleware(jwtSecret: string, db: D1Database) {
  const jwtUtil = new JWTUtil(jwtSecret);
  const userService = new UserService(db);

  return async (c: Context, next: Next) => {
    try {
      // Extract token from Authorization header
      const authHeader = c.req.header('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Missing or invalid authorization header' }, 401);
      }

      const token = authHeader.substring(7); // Remove "Bearer "

      // Verify token
      const payload = await jwtUtil.verify(token);

      // Get user from database
      const user = await userService.getUserById(payload.userId);
      if (!user) {
        return c.json({ error: 'User not found' }, 401);
      }

      // Check if user is banned
      if (user.isBanned) {
        return c.json(
          {
            error: 'Account banned',
            reason: user.banReason,
          },
          403
        );
      }

      // Attach user to context
      (c as AuthContext).user = user;
      (c as AuthContext).userId = user.id;

      await next();
    } catch (error: any) {
      if (error.message === 'Token expired') {
        return c.json({ error: 'Token expired' }, 401);
      }
      if (error.message === 'Invalid token signature') {
        return c.json({ error: 'Invalid token' }, 401);
      }
      return c.json({ error: 'Authentication failed' }, 401);
    }
  };
}

/**
 * Optional authentication middleware
 *
 * Attaches user if token is present and valid, but doesn't require it.
 * Useful for routes that show different content for authenticated vs anonymous users.
 */
export function optionalAuthMiddleware(jwtSecret: string, db: D1Database) {
  const jwtUtil = new JWTUtil(jwtSecret);
  const userService = new UserService(db);

  return async (c: Context, next: Next) => {
    try {
      const authHeader = c.req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = await jwtUtil.verify(token);
        const user = await userService.getUserById(payload.userId);

        if (user && !user.isBanned) {
          (c as AuthContext).user = user;
          (c as AuthContext).userId = user.id;
        }
      }
    } catch (error) {
      // Silently fail for optional auth
    }

    await next();
  };
}

/**
 * Create JWT token for user
 */
export async function createAuthToken(
  user: User,
  jwtSecret: string,
  expiresInSeconds: number = 30 * 24 * 60 * 60 // 30 days default
): Promise<{ token: string; expiresAt: string }> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInSeconds;

  const payload: AuthTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
    iat: now,
    exp,
  };

  const jwtUtil = new JWTUtil(jwtSecret);
  const token = await jwtUtil.sign(payload);

  return {
    token,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}
