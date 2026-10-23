import type { JSX } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useConvexAuth } from "@convex-dev/auth/react";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import GamePage from "./game/GamePage";
import { backendReady } from "./lib/backend";

function Splash({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-void">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-edge border-t-ember" />
      <p className="label animate-pulse">{label}</p>
    </div>
  );
}

function BackendOffline() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-6">
      <div className="panel max-w-lg p-8">
        <p className="label text-ember">Backend not configured</p>
        <h1 className="mt-3 text-2xl font-bold">IRONHOLD needs its Convex deployment</h1>
        <p className="mt-3 text-sm leading-relaxed text-steel">
          This build has no <code className="font-mono text-ash">VITE_CONVEX_URL</code>. In development the app
          serves the backend itself — run <code className="font-mono text-ash">bun run dev</code>. For a hosted
          build, set <code className="font-mono text-ash">VITE_CONVEX_URL</code> to your Convex deployment URL
          (Convex dashboard → Settings → URL &amp; deploy key).
        </p>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const location = useLocation();
  if (isLoading) return <Splash label="VERIFYING CLEARANCE" />;
  if (!isAuthenticated) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?returnTo=${returnTo}`} replace />;
  }
  return children;
}

export default function App() {
  if (!backendReady) return <BackendOffline />;
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/game"
          element={
            <RequireAuth>
              <GamePage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
