import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function AuthPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = searchParams.get("returnTo") || "/game";
  const providers = useQuery(api.authConfig.availableProviders);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate(returnTo, { replace: true });
  }, [isAuthenticated, navigate, returnTo]);

  const handleSignIn = async (provider: string) => {
    setBusy(provider);
    setError(null);
    try {
      await signIn(provider);
      // The effect above navigates once auth state lands.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Try again.");
    } finally {
      setBusy(null);
    }
  };

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-edge border-t-ember" />
      </div>
    );
  }

  const githubEnabled = providers?.github ?? false;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void px-4">
      <div className="bg-grid absolute inset-0 opacity-70" />
      <div className="glow-ember absolute inset-0" />

      <div className="relative w-full max-w-md animate-rise">
        <Link
          to="/"
          className="label mb-6 inline-flex items-center gap-2 text-steel transition hover:text-ember"
        >
          ← IRONHOLD
        </Link>

        <div className="panel p-8">
          <p className="label text-ember">Enlistment terminal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Enter the Hold</h1>
          <p className="mt-3 text-sm leading-relaxed text-steel">
            Your factory runs whether you're here or not. Sign in, claim a sector, and start the war —
            resources accrue even while you're away.
          </p>

          <div className="mt-7 space-y-3">
            <button
              className="btn-primary w-full py-3"
              onClick={() => handleSignIn("anonymous")}
              disabled={busy !== null}
            >
              {busy === "anonymous" ? "ESTABLISHING…" : "▸ DEPLOY ANONYMOUSLY"}
            </button>

            {githubEnabled && (
              <button
                className="btn-ghost w-full py-3"
                onClick={() => handleSignIn("github")}
                disabled={busy !== null}
              >
                {busy === "github" ? "LINKING…" : "Continue with GitHub"}
              </button>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-alarm/40 bg-alarm/10 px-3 py-2 font-mono text-xs text-alarm">
              {error}
            </p>
          )}

          <div className="mt-6 border-t border-edge pt-5">
            <p className="label mb-2">First orders</p>
            <ul className="space-y-1.5 font-mono text-xs text-steel">
              <li>
                <span className="text-ember">01</span> Feed the Ore Extractor and Fusion Reactor — they
                produce while you're offline.
              </li>
              <li>
                <span className="text-ember">02</span> Turn stockpiles into drones, crawlers, mechs and
                titans.
              </li>
              <li>
                <span className="text-ember">03</span> Raid rogue factories, then alliances for the human
                powers.
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-5 text-center font-mono text-[11px] text-steel/70">
          No password. Your session lives in this browser.
        </p>
      </div>
    </div>
  );
}
