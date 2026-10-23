import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  UNITS,
  UNIT_ORDER,
  armyCount,
  armyPower,
  canAfford,
  costLabel,
  fmtDuration,
  fmtInt,
  fmtNum,
  trainingDurationSec,
  unitRequirement,
  type Army,
  type UnitKey,
} from "../../shared/gameConfig";
import { errMsg } from "../lib/utils";
import { useNow } from "./useLive";
import type { LiveView, Me } from "./types";

const EMPTY_SEND: Army = { drone: 0, crawler: 0, mech: 0, titan: 0 };

function maxAffordable(unit: UnitKey, me: Me, live: LiveView): number {
  const def = UNITS[unit];
  let max = def.cost.metal > 0 ? Math.floor(live.resources.metal / def.cost.metal) : Infinity;
  if (def.cost.energy > 0) max = Math.min(max, Math.floor(live.resources.energy / def.cost.energy));
  if (def.cost.crystal > 0) max = Math.min(max, Math.floor(live.resources.crystal / def.cost.crystal));
  const queued = me.queue.reduce((s, q) => s + q.count, 0);
  const room = me.armyCap - armyCount(me.army) - queued;
  return Math.max(0, Math.min(max, room, 500));
}

export default function ArmyTab({ me, live }: { me: Me; live: LiveView }) {
  const train = useMutation(api.game.trainUnits);
  const claim = useMutation(api.game.claimQueue);
  const [counts, setCounts] = useState<Record<UnitKey, number>>({
    drone: 25,
    crawler: 0,
    mech: 0,
    titan: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<UnitKey | "claim" | null>(null);
  const now = useNow(250);

  const queued = me.queue.reduce((s, q) => s + q.count, 0);
  const fielded = armyCount(me.army);
  const total = fielded + queued;
  const capPct = Math.min(100, (total / me.armyCap) * 100);
  const anyReady = live.queue.some((q) => q.remaining <= 0);

  const setCount = (unit: UnitKey, value: number) => {
    setCounts((prev) => ({ ...prev, [unit]: Math.max(0, Math.min(500, Math.floor(value))) }));
  };

  const handleTrain = async (unit: UnitKey) => {
    const count = counts[unit];
    if (count < 1) return;
    setBusy(unit);
    setError(null);
    try {
      await train({ unit, count });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const handleClaim = async () => {
    setBusy("claim");
    setError(null);
    try {
      await claim();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {/* Capacity */}
      <section className="panel p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <span className="label text-ember">muster yard</span>
            <h2 className="text-lg font-semibold">Army Capacity</h2>
          </div>
          <p className="font-mono text-sm">
            <span className="text-ash">{fmtInt(total)}</span>
            <span className="text-steel"> / {fmtInt(me.armyCap)} slots</span>
            <span className="ml-3 text-ember">power {fmtInt(armyPower(me.army))}</span>
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-void">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              capPct > 90 ? "bg-alarm" : "bg-plasma/80"
            }`}
            style={{ width: `${capPct}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-xs text-steel">
          Command Nexus level {me.buildings.hq} gates the cap · War Foundry level{" "}
          {me.buildings.foundry} trims training time
        </p>
      </section>

      {error && (
        <p className="mt-4 rounded-lg border border-alarm/40 bg-alarm/10 px-3 py-2 font-mono text-xs text-alarm">
          {error}
        </p>
      )}

      {/* Units */}
      <div className="mt-6">
        <span className="label text-ember">fabricators</span>
        <h2 className="text-lg font-semibold">Train Units</h2>
      </div>
      <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {UNIT_ORDER.map((key) => {
          const def = UNITS[key];
          const unlocked = unitRequirement(key, me.buildings).ok;
          const requirement = unitRequirement(key, me.buildings).reason;
          const count = counts[key];
          const cost = {
            metal: def.cost.metal * count,
            energy: def.cost.energy * count,
            crystal: def.cost.crystal * count,
          };
          const affordable = count > 0 && canAfford(live.resources, cost);
          const cap = maxAffordable(key, me, live);

          return (
            <div key={key} className="panel flex flex-col p-5">
              <div className="flex items-baseline justify-between">
                <span className="label text-ember">{def.role}</span>
                <span className="font-mono text-xs text-steel">PWR {def.power}</span>
              </div>
              <h3 className="mt-1 text-base font-semibold">{def.name}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-steel">{def.blurb}</p>

              <div className="mt-3 flex items-end justify-between font-mono text-xs">
                <div>
                  <div className="label">owned</div>
                  <div className="text-lg font-bold text-ash">{fmtInt(me.army[key])}</div>
                </div>
                <div className="text-right">
                  <div className="label">train time</div>
                  <div className="text-ash">
                    {fmtDuration(def.trainSec * 1000 * count || def.trainSec * 1000)}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <button
                  className="btn-ghost h-8 w-8 px-0 text-base"
                  onClick={() => setCount(key, count - (count > 10 ? 10 : 1))}
                  disabled={!unlocked}
                >
                  −
                </button>
                <input
                  className="input h-8 flex-1 px-2 text-center text-xs"
                  type="number"
                  min={0}
                  max={500}
                  value={count}
                  disabled={!unlocked}
                  onChange={(e) => setCount(key, Number(e.target.value))}
                />
                <button
                  className="btn-ghost h-8 w-8 px-0 text-base"
                  onClick={() => setCount(key, count + (count >= 10 ? 10 : 1))}
                  disabled={!unlocked}
                >
                  +
                </button>
              </div>

              <div className="mt-2 flex gap-1.5 font-mono text-[10px]">
                {[1, 10, 25].map((n) => (
                  <button
                    key={n}
                    className="flex-1 rounded border border-edge py-1 text-steel transition hover:border-steel hover:text-ash"
                    onClick={() => setCount(key, n)}
                    disabled={!unlocked}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className="flex-1 rounded border border-edge py-1 text-steel transition hover:border-ember hover:text-ember"
                  onClick={() => setCount(key, cap)}
                  disabled={!unlocked || cap < 1}
                >
                  MAX {cap > 0 ? cap : ""}
                </button>
              </div>

              <p className="mt-2 font-mono text-[11px] text-steel">
                batch: <span className="text-ash">{costLabel(cost)}</span>
              </p>

              <button
                className="btn-primary mt-3 w-full"
                disabled={!unlocked || !affordable || busy !== null}
                onClick={() => handleTrain(key)}
              >
                {busy === key ? "QUEUING…" : `TRAIN ${count}`}
              </button>
              {!unlocked && (
                <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-steel">
                  {requirement}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Queue */}
      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="label text-ember">assembly line</span>
          <h2 className="text-lg font-semibold">Training Queue</h2>
        </div>
        <button
          className={anyReady ? "btn-primary px-4 py-2 text-xs" : "btn-ghost px-4 py-2 text-xs"}
          disabled={!anyReady || busy === "claim"}
          onClick={handleClaim}
        >
          {busy === "claim" ? "COLLECTING…" : anyReady ? "COLLECT READY UNITS" : "IN PROGRESS"}
        </button>
      </div>

      <div className="panel mt-3 divide-y divide-edge">
        {me.queue.length === 0 && (
          <p className="px-5 py-6 text-center font-mono text-sm text-steel/80">
            Nothing in the line. Fabricators idle — the enemy won't wait.
          </p>
        )}
        {live.queue.map((item) => {
          const def = UNITS[item.unit];
          const durationMs = trainingDurationSec(item.unit, item.count, me.buildings.foundry) * 1000;
          const endTs = now + item.remaining;
          const startTs = endTs - durationMs;
          const pct =
            item.remaining <= 0
              ? 100
              : Math.max(0, Math.min(100, ((now - startTs) / durationMs) * 100));
          const ready = item.remaining <= 0;
          return (
            <div key={item.id} className="flex items-center gap-4 px-5 py-3">
              <span className={`h-2 w-2 shrink-0 rounded-full ${ready ? "bg-toxin" : "bg-ember animate-pulse"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 font-mono text-xs">
                  <span className="truncate text-ash">
                    {item.count}× {def.name}
                  </span>
                  <span className={ready ? "text-toxin" : "text-steel"}>
                    {ready ? "READY" : fmtDuration(item.remaining)}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-void">
                  <div
                    className={`h-full rounded-full ${ready ? "bg-toxin" : "bg-ember/70"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 font-mono text-xs text-steel/80">
        Units sit in the line until collected — upgrades, training orders and attacks settle finished
        batches automatically. {fmtNum(armyPower(me.army))} power currently under your flag.
      </p>
    </div>
  );
}
