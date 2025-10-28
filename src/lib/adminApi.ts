/**
 * Admin API Client
 *
 * Client functions for all admin-related API endpoints.
 * Handles authentication tokens and error responses.
 *
 * Related: FEATURE_SPEC_USER_MANAGEMENT.md
 */

import type {
  User,
  LoginResponse,
  GoogleProfile,
  UserListResponse,
  UserListQuery,
  AdminAnalyticsOverview,
  ApiResponse,
} from '@shared/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('kido-auth-token');
}

/**
 * Set authentication token in localStorage
 */
function setAuthToken(token: string): void {
  localStorage.setItem('kido-auth-token', token);
}

/**
 * Remove authentication token from localStorage
 */
function removeAuthToken(): void {
  localStorage.removeItem('kido-auth-token');
}

/**
 * Make authenticated API request
 */
async function authenticatedFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

// ============================================================================
// Authentication API
// ============================================================================

export async function loginWithGoogle(profile: GoogleProfile): Promise<LoginResponse> {
  const response = await authenticatedFetch<LoginResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ profile }),
  });

  if (response.data) {
    setAuthToken(response.data.token);
    return response.data;
  }

  throw new Error('Login failed');
}

export async function getCurrentUser(): Promise<User> {
  const response = await authenticatedFetch<User>('/auth/me');

  if (response.data) {
    return response.data;
  }

  throw new Error('Failed to get current user');
}

export async function refreshToken(): Promise<{ token: string; expiresAt: string }> {
  const response = await authenticatedFetch<{ token: string; expiresAt: string }>(
    '/auth/refresh',
    { method: 'POST' }
  );

  if (response.data) {
    setAuthToken(response.data.token);
    return response.data;
  }

  throw new Error('Failed to refresh token');
}

export function logout(): void {
  removeAuthToken();
}

// ============================================================================
// User Profile API
// ============================================================================

export async function updateUserProfile(updates: {
  name?: string;
  picture?: string;
}): Promise<User> {
  const response = await authenticatedFetch<User>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

  if (response.data) {
    return response.data;
  }

  throw new Error('Failed to update profile');
}

// ============================================================================
// Admin - User Management API
// ============================================================================

export async function listUsers(query: UserListQuery = {}): Promise<UserListResponse> {
  const params = new URLSearchParams();

  if (query.page) params.append('page', query.page.toString());
  if (query.limit) params.append('limit', query.limit.toString());
  if (query.search) params.append('search', query.search);
  if (query.role) params.append('role', query.role);
  if (query.tier) params.append('tier', query.tier);
  if (query.sortBy) params.append('sortBy', query.sortBy);
  if (query.sortOrder) params.append('sortOrder', query.sortOrder);

  const queryString = params.toString();
  const endpoint = `/admin/users${queryString ? `?${queryString}` : ''}`;

  const response = await authenticatedFetch<UserListResponse>(endpoint);

  if (response.data) {
    return response.data;
  }

  throw new Error('Failed to list users');
}

export async function getUserById(userId: string): Promise<User> {
  const response = await authenticatedFetch<User>(`/admin/users/${userId}`);

  if (response.data) {
    return response.data;
  }

  throw new Error('Failed to get user');
}

export async function updateUserRole(
  userId: string,
  role: 'admin' | 'moderator' | 'user'
): Promise<User> {
  const response = await authenticatedFetch<User>(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });

  if (response.data) {
    return response.data;
  }

  throw new Error('Failed to update user role');
}

export async function banUser(userId: string, reason: string): Promise<User> {
  const response = await authenticatedFetch<User>(`/admin/users/${userId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

  if (response.data) {
    return response.data;
  }

  throw new Error('Failed to ban user');
}

export async function unbanUser(userId: string): Promise<User> {
  const response = await authenticatedFetch<User>(`/admin/users/${userId}/unban`, {
    method: 'POST',
  });

  if (response.data) {
    return response.data;
  }

  throw new Error('Failed to unban user');
}

export async function deleteUser(userId: string): Promise<void> {
  await authenticatedFetch<{ deleted: boolean }>(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Admin - Analytics API
// ============================================================================

export async function getAnalyticsOverview(): Promise<AdminAnalyticsOverview> {
  const response = await authenticatedFetch<AdminAnalyticsOverview>(
    '/admin/analytics/overview'
  );

  if (response.data) {
    return response.data;
  }

  throw new Error('Failed to get analytics');
}

export async function getAuditLog(
  page: number = 1,
  limit: number = 50
): Promise<{
  actions: any[];
  page: number;
  limit: number;
}> {
  const response = await authenticatedFetch<{
    actions: any[];
    page: number;
    limit: number;
  }>(`/admin/audit-log?page=${page}&limit=${limit}`);

  if (response.data) {
    return response.data;
  }

  throw new Error('Failed to get audit log');
}

export async function clearAllGames(): Promise<void> {
  await authenticatedFetch<{ cleared: boolean }>('/admin/games/clear', {
    method: 'DELETE',
  });
}

// Export token management functions
export { getAuthToken, setAuthToken, removeAuthToken };
