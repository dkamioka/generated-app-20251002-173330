import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'
import { LobbyPage } from '@/pages/LobbyPage';
import { GamePage } from '@/pages/GamePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ReplayPage } from '@/pages/ReplayPage';
import { AdminPage } from '@/pages/AdminPage';
import { MatchmakingPage } from '@/pages/MatchmakingPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { StatsPage } from '@/pages/StatsPage';
const router = createBrowserRouter([
  {
    path: "/",
    element: <LobbyPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/game/:gameId",
    element: <GamePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/profile",
    element: <ProfilePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/replay/:gameId",
    element: <ReplayPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/admin",
    element: <AdminPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/matchmaking",
    element: <MatchmakingPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/leaderboard",
    element: <LeaderboardPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/stats",
    element: <StatsPage />,
    errorElement: <RouteErrorBoundary />,
  }
]);
// IMPORTANT: Set VITE_GOOGLE_CLIENT_ID in your environment
// For local dev: create .env.local with VITE_GOOGLE_CLIENT_ID=your-client-id
// For production: wrangler will use the value from build time
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "102189159129-v8v7g16h30j5vvev5q5i06o6qj5v11j9.apps.googleusercontent.com";

// Log Client ID configuration status (for debugging)
if (import.meta.env.VITE_GOOGLE_CLIENT_ID) {
  console.log('✅ Using VITE_GOOGLE_CLIENT_ID from environment:', GOOGLE_CLIENT_ID.substring(0, 20) + '...');
} else {
  console.warn('⚠️ Using fallback Google Client ID. Set VITE_GOOGLE_CLIENT_ID environment variable.');
}

if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your-client-id')) {
  console.error('❌ VITE_GOOGLE_CLIENT_ID is not configured! Google OAuth will not work.');
}

// Expose debug function to window for checking Client ID in production
// Usage: Open browser console and type: window.__checkGoogleClientId()
if (typeof window !== 'undefined') {
  (window as any).__checkGoogleClientId = () => {
    console.log('🔍 Google OAuth Client ID:', GOOGLE_CLIENT_ID);
    console.log('📦 Source:', import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Environment Variable' : 'Fallback/Hardcoded');
    return {
      clientId: GOOGLE_CLIENT_ID,
      source: import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'environment' : 'fallback',
      isConfigured: !!import.meta.env.VITE_GOOGLE_CLIENT_ID
    };
  };
  console.log('💡 Tip: Run window.__checkGoogleClientId() to verify OAuth configuration');
}
// Do not touch this code
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </GoogleOAuthProvider>
  </StrictMode>,
)