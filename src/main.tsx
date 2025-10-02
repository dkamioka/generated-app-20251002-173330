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
  }
]);
// IMPORTANT: Replace with your actual Google Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = "102189159129-v8v7g16h30j5vvev5q5i06o6qj5v11j9.apps.googleusercontent.com";
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