import { useEffect, useMemo, useState } from "react";
import type { Resources } from "../../shared/gameConfig";
import type { LiveView, Me } from "./types";

/** Ticking clock for idle interpolation. */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Convex queries are reactive but time doesn't re-run them, so the server hands
 * us a snapshot (`serverNow` + resources) and we interpolate forward locally —
 * the classic idle-game trick. Any mutation produces a fresh snapshot.
 */
export function useLive(me: Me | undefined): LiveView | undefined {
  const now = useNow(250);
  const base = useMemo(
    () =>
      me
        ? {
            at: Date.now(),
            serverNow: me.serverNow,
            resources: me.resources,
            cooldownRemaining: me.cooldownRemaining,
          }
        : null,
    [me],
  );

  if (!me || !base) return undefined;

  const elapsedMs = Math.max(0, now - base.at);
  const elapsedSec = elapsedMs / 1000;
  const resources: Resources = {
    metal: Math.min(me.cap, base.resources.metal + me.rates.metal * elapsedSec),
    energy: Math.min(me.cap, base.resources.energy + me.rates.energy * elapsedSec),
    crystal: Math.min(me.cap, base.resources.crystal + me.rates.crystal * elapsedSec),
  };
  const serverNow = base.serverNow + elapsedMs;
  const queue = me.queue.map((q) => ({ ...q, remaining: q.readyAt - serverNow }));

  return {
    resources,
    rates: me.rates,
    cap: me.cap,
    serverNow,
    cooldownRemaining: Math.max(0, base.cooldownRemaining - elapsedMs),
    shieldRemaining: Math.max(0, me.shieldUntil - serverNow),
    queue,
  };
}
