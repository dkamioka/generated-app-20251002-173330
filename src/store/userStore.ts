import { create } from 'zustand';
import { googleLogout } from '@react-oauth/google';
import type { User, GoogleProfile } from '@shared/types';
import * as adminApi from '@/lib/adminApi';

export interface UserProfile {
  name: string;
  picture?: string;
}

interface UserStoreState {
  // Legacy support
  user: UserProfile | null;
  isAuthenticated: boolean;

  // New full user support
  fullUser: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUserProfile: (profile: UserProfile) => void;
  loadUserProfile: () => void;
  signOut: () => void;

  // New authentication actions
  loginWithGoogle: (profile: GoogleProfile) => Promise<void>;
  loadCurrentUser: () => Promise<void>;
  isAdmin: () => boolean;
  isModerator: () => boolean;
}

const USER_STORAGE_KEY = 'kido-user-profile';

export const useUserStore = create<UserStoreState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  fullUser: null,
  isLoading: false,
  error: null,

  setUserProfile: (profile: UserProfile) => {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
      set({ user: profile, isAuthenticated: true });
    } catch (error) {
      console.error("Failed to save user profile to local storage:", error);
    }
  },

  loadUserProfile: () => {
    try {
      const storedProfile = localStorage.getItem(USER_STORAGE_KEY);
      if (storedProfile) {
        set({ user: JSON.parse(storedProfile), isAuthenticated: true });
      }
    } catch (error) {
      console.error("Failed to load user profile from local storage:", error);
    }
  },

  signOut: () => {
    try {
      googleLogout();
      localStorage.removeItem(USER_STORAGE_KEY);
      adminApi.logout();

      // Clear all game sessions on sign out
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('kido-session-')) {
          localStorage.removeItem(key);
        }
      });

      set({
        user: null,
        fullUser: null,
        isAuthenticated: false,
        error: null
      });
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  },

  /**
   * Login with Google OAuth
   */
  loginWithGoogle: async (profile: GoogleProfile) => {
    set({ isLoading: true, error: null });

    try {
      const response = await adminApi.loginWithGoogle(profile);

      // Set both legacy and new user
      const legacyProfile: UserProfile = {
        name: response.user.name,
        picture: response.user.picture,
      };

      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(legacyProfile));

      set({
        user: legacyProfile,
        fullUser: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Login failed'
      });
      throw error;
    }
  },

  /**
   * Load current user from API
   */
  loadCurrentUser: async () => {
    // Check if we have a token
    const token = adminApi.getAuthToken();
    if (!token) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const user = await adminApi.getCurrentUser();

      // Update legacy user profile too
      const legacyProfile: UserProfile = {
        name: user.name,
        picture: user.picture,
      };

      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(legacyProfile));

      set({
        user: legacyProfile,
        fullUser: user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      // If token is invalid, clear it
      if (error.message.includes('401') || error.message.includes('Authentication')) {
        adminApi.logout();
        localStorage.removeItem(USER_STORAGE_KEY);
        set({
          user: null,
          fullUser: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          isLoading: false,
          error: error.message || 'Failed to load user'
        });
      }
    }
  },

  /**
   * Check if current user is admin
   */
  isAdmin: () => {
    const { fullUser } = get();
    return fullUser?.role === 'admin';
  },

  /**
   * Check if current user is moderator or admin
   */
  isModerator: () => {
    const { fullUser } = get();
    return fullUser?.role === 'admin' || fullUser?.role === 'moderator';
  },
}));

// Initialize user profile on application load
useUserStore.getState().loadUserProfile();

// Try to load full user from API if token exists
if (adminApi.getAuthToken()) {
  useUserStore.getState().loadCurrentUser();
}
