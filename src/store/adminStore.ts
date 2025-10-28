/**
 * Admin Store
 *
 * Zustand store for admin dashboard state management.
 * Handles user list, analytics, and audit log.
 */

import { create } from 'zustand';
import type {
  User,
  UserListResponse,
  UserListQuery,
  AdminAnalyticsOverview,
} from '@shared/types';
import * as adminApi from '@/lib/adminApi';

interface AdminStoreState {
  // User Management
  users: User[];
  totalUsers: number;
  currentPage: number;
  totalPages: number;
  isLoadingUsers: boolean;
  usersError: string | null;

  // Analytics
  analytics: AdminAnalyticsOverview | null;
  isLoadingAnalytics: boolean;
  analyticsError: string | null;

  // Audit Log
  auditLog: any[];
  auditLogPage: number;
  isLoadingAuditLog: boolean;
  auditLogError: string | null;

  // Actions - User Management
  fetchUsers: (query?: UserListQuery) => Promise<void>;
  refreshUsers: () => Promise<void>;
  updateUserInList: (userId: string, updates: Partial<User>) => void;
  removeUserFromList: (userId: string) => void;

  // Actions - Analytics
  fetchAnalytics: () => Promise<void>;

  // Actions - Audit Log
  fetchAuditLog: (page?: number) => Promise<void>;

  // Reset
  reset: () => void;
}

const initialState = {
  users: [],
  totalUsers: 0,
  currentPage: 1,
  totalPages: 0,
  isLoadingUsers: false,
  usersError: null,

  analytics: null,
  isLoadingAnalytics: false,
  analyticsError: null,

  auditLog: [],
  auditLogPage: 1,
  isLoadingAuditLog: false,
  auditLogError: null,
};

export const useAdminStore = create<AdminStoreState>((set, get) => ({
  ...initialState,

  /**
   * Fetch users with optional query parameters
   */
  fetchUsers: async (query: UserListQuery = {}) => {
    set({ isLoadingUsers: true, usersError: null });

    try {
      const response = await adminApi.listUsers(query);

      set({
        users: response.users,
        totalUsers: response.total,
        currentPage: response.page,
        totalPages: response.totalPages,
        isLoadingUsers: false,
        usersError: null,
      });
    } catch (error: any) {
      set({
        isLoadingUsers: false,
        usersError: error.message || 'Failed to fetch users',
      });
    }
  },

  /**
   * Refresh current user list
   */
  refreshUsers: async () => {
    const { currentPage } = get();
    await get().fetchUsers({ page: currentPage });
  },

  /**
   * Update user in local list (optimistic update)
   */
  updateUserInList: (userId: string, updates: Partial<User>) => {
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, ...updates } : user
      ),
    }));
  },

  /**
   * Remove user from local list
   */
  removeUserFromList: (userId: string) => {
    set((state) => ({
      users: state.users.filter((user) => user.id !== userId),
      totalUsers: state.totalUsers - 1,
    }));
  },

  /**
   * Fetch analytics overview
   */
  fetchAnalytics: async () => {
    set({ isLoadingAnalytics: true, analyticsError: null });

    try {
      const analytics = await adminApi.getAnalyticsOverview();

      set({
        analytics,
        isLoadingAnalytics: false,
        analyticsError: null,
      });
    } catch (error: any) {
      set({
        isLoadingAnalytics: false,
        analyticsError: error.message || 'Failed to fetch analytics',
      });
    }
  },

  /**
   * Fetch audit log
   */
  fetchAuditLog: async (page: number = 1) => {
    set({ isLoadingAuditLog: true, auditLogError: null });

    try {
      const response = await adminApi.getAuditLog(page);

      set({
        auditLog: response.actions,
        auditLogPage: response.page,
        isLoadingAuditLog: false,
        auditLogError: null,
      });
    } catch (error: any) {
      set({
        isLoadingAuditLog: false,
        auditLogError: error.message || 'Failed to fetch audit log',
      });
    }
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set(initialState);
  },
}));
