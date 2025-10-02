import { create } from 'zustand';
import { googleLogout } from '@react-oauth/google';
export interface UserProfile {
  name: string;
  picture?: string;
}
interface UserStoreState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  setUserProfile: (profile: UserProfile) => void;
  loadUserProfile: () => void;
  signOut: () => void;
}
const USER_STORAGE_KEY = 'kido-user-profile';
export const useUserStore = create<UserStoreState>((set) => ({
  user: null,
  isAuthenticated: false,
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
      // Clear all game sessions on sign out
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('kido-session-')) {
          localStorage.removeItem(key);
        }
      });
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  },
}));
// Initialize user profile on application load
useUserStore.getState().loadUserProfile();