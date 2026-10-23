import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  BUILDING_ORDER,
  BUILDINGS,
  RESOURCE_META,
  RESOURCE_ORDER,
  armyCap,
  buildingCost,
  buildingRequirement,
  canAfford,
  costLabel,
  fmtInt,
  fmtNum,
  productionRate,
  storageCap,
  trainSpeedMultiplier,
  type BuildingKey,
} from "../../shared/gameConfig";
import { errMsg } from "../lib/utils";
import type { LiveView, Me } from "./types";

function outputFor(key: BuildingKey, buildings: Me["buildings"], live: LiveView): string {
  const level = buildings[key];
  switch (key) {
    case "mine":
    case "reactor":
    case "refinery": {
      const rate = productionRate(buildings);
      const resource = key === "mine" ? "metal" : key === "reactor" ? "energy" : "crystal";
      return level === 0 ? "dormant" : `${fmtNum(rate[resource])} ${resource} / s`;
    }
    case "hq":
      return `storage ${fmtNum(live.cap)} · army cap ${armyCap(level)}`;
    case "foundry":
      return level === 0 ? "no speed bonus" : `×${trainSpeedMultiplier(level).toFixed(2)} training speed`;
    case "walls":
      return level === 0 ? "no fortification" : `+${5 * level}% defense strength`;
  }
}

export default function BaseTab({ me, live }: { me: Me; live: LiveView }) {
  const upgrade = useMutation(api.game.upgradeBuilding);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<BuildingKey | null>(null);

  const handleUpgrade = async (key: BuildingKey) => {
    setBusy(key);
    setError(null);
    try {
      await upgrade({ building: key });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {/* Storage */}
      <section className="panel p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <span className="label text-ember">stockpile</span>
            <h2 className="text-lg font-semibold">Storage Silos</h2>
          </div>
          <p className="font-mono text-xs text-steel">
            capacity grows with the Command Nexus · offline accrual up to 8h
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {RESOURCE_ORDER.map((key) => {
            const value = live.resources[key];
            const pct = Math.min(100, (value / live.cap) * 100);
            return (
              <div key={key} className="rounded-lg border border-edge bg-hull/70 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="label">{RESOURCE_META[key].name}</span>
                  <span className="font-mono text-xs text-ember">+{fmtNum(live.rates[key])}/s</span>
                </div>
                <div className="mt-1 font-mono text-xl font-bold">
                  {fmtInt(value)}
                  <span className="text-sm font-normal text-steel"> / {fmtInt(live.cap)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-void">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct > 95 ? "bg-alarm" : "bg-ember/70"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {error && (
        <p className="mt-4 rounded-lg border border-alarm/40 bg-alarm/10 px-3 py-2 font-mono text-xs text-alarm">
          {error}
        </p>
      )}

      {/* Buildings */}
      <div className="mt-6 flex items-baseline justify-between">
        <div>
          <span className="label text-ember">production lines</span>
          <h2 className="text-lg font-semibold">Facilities</h2>
        </div>
        <span className="font-mono text-xs text-steel">upgrades settle your training queue too</span>
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {BUILDING_ORDER.map((key) => {
          const def = BUILDINGS[key];
          const level = me.buildings[key];
          const maxed = level >= def.maxLevel;
          const req = buildingRequirement(key, me.buildings);
          const nextCost = maxed ? null : buildingCost(key, level + 1);
          const affordable = nextCost ? canAfford(live.resources, nextCost) : false;
          const locked = !req.ok;
          const disabled = maxed || locked || !affordable || busy !== null;
          const reason = maxed
            ? "MAX LEVEL"
            : locked
              ? req.reason
              : !affordable
                ? "INSUFFICIENT RESOURCES"
                : null;

          return (
            <div
              key={key}
              className={`panel flex flex-col p-5 transition ${
                !disabled ? "hover:border-ember/50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="label text-ember">{def.output}</span>
                  <h3 className="mt-0.5 text-base font-semibold">{def.name}</h3>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-edge bg-hull font-mono text-sm font-bold text-ash">
                  {level}
                </div>
              </div>

              <p className="mt-2 flex-1 text-sm leading-relaxed text-steel">{def.blurb}</p>

              <p className="mt-3 font-mono text-xs text-ash">{outputFor(key, me.buildings, live)}</p>

              <div className="mt-4 border-t border-edge pt-4">
                {maxed ? (
                  <div className="btn btn-ghost w-full border-ember/40 text-ember" aria-disabled>
                    MAX LEVEL
                  </div>
                ) : (
                  <button
                    className="btn-primary w-full"
                    disabled={disabled}
                    onClick={() => handleUpgrade(key)}
                  >
                    {busy === key
                      ? "UPGRADING…"
                      : `UPGRADE → ${level + 1} · ${costLabel(nextCost!)}`}
                  </button>
                )}
                {reason && !maxed && (
                  <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-steel">
                    {reason}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
