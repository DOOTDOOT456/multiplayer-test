import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  UNITS,
  UNIT_ORDER,
  armyPower,
  fmtDuration,
  fmtInt,
  fmtNum,
  fmtTimeOfDay,
  type Army,
} from "../../shared/gameConfig";
import { errMsg } from "../lib/utils";
import type { BattleReport, LiveView, Me, TargetRow } from "./types";

const EMPTY_SEND: Army = { drone: 0, crawler: 0, mech: 0, titan: 0 };

function unitLine(army: Army): string {
  const parts = UNIT_ORDER.filter((k) => army[k] > 0).map((k) => `${army[k]}× ${UNITS[k].name}`);
  return parts.length > 0 ? parts.join(", ") : "—";
}

/* ── Battle report modal ─────────────────────────────── */
function BattleReportModal({ report, onClose }: { report: BattleReport; onClose: () => void }) {
  const won = report.attackerWon;
  const lootTotal = report.loot.metal + report.loot.energy + report.loot.crystal;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/85 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-2xl animate-rise overflow-hidden">
        <div
          className={`border-b px-6 py-5 ${
            won ? "border-ember/40 bg-ember/10" : "border-alarm/40 bg-alarm/10"
          }`}
        >
          <p className={`label ${won ? "text-ember" : "text-alarm"}`}>
            {won ? "engagement won" : "engagement lost"}
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            {won ? "The sector bleeds for you" : "Your fleet limps home"}
          </h2>
          <p className="mt-1 font-mono text-xs text-steel">
            {report.attackerName} ▸ {report.defenderName} · attacker {fmtInt(report.attackerPower)} vs
            defender {fmtInt(report.defenderPower)}
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="label border-b border-edge text-left">
                <th className="py-2">unit</th>
                <th className="py-2 text-right">deployed</th>
                <th className="py-2 text-right">lost</th>
                <th className="py-2 text-right">survived</th>
                <th className="py-2 text-right">enemy lost</th>
              </tr>
            </thead>
            <tbody>
              {UNIT_ORDER.map((k) => (
                <tr key={k} className="border-b border-edge/60">
                  <td className="py-2 text-ash">{UNITS[k].name}</td>
                  <td className="py-2 text-right text-steel">{report.sent[k]}</td>
                  <td className="py-2 text-right text-alarm">{report.attackerLosses[k]}</td>
                  <td className="py-2 text-right text-toxin">{report.survivors[k]}</td>
                  <td className="py-2 text-right text-plasma">{report.defenderLosses[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-edge bg-hull/70 p-3">
              <div className="label">salvaged metal</div>
              <div className="font-mono text-lg font-bold text-ash">+{fmtInt(report.loot.metal)}</div>
            </div>
            <div className="rounded-lg border border-edge bg-hull/70 p-3">
              <div className="label">salvaged energy</div>
              <div className="font-mono text-lg font-bold text-ash">+{fmtInt(report.loot.energy)}</div>
            </div>
            <div className="rounded-lg border border-edge bg-hull/70 p-3">
              <div className="label">salvaged crystal</div>
              <div className="font-mono text-lg font-bold text-ash">+{fmtInt(report.loot.crystal)}</div>
            </div>
          </div>

          {!won && (
            <p className="mt-4 rounded-lg border border-alarm/40 bg-alarm/10 px-3 py-2 font-mono text-xs text-alarm">
              Defeat means no salvage. Rebuild, upgrade the Fortress Wall plan, and hit them back.
            </p>
          )}
          {won && lootTotal === 0 && (
            <p className="mt-4 font-mono text-xs text-steel">
              Their silos ran dry — you took the sector but nothing worth hauling home.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-edge px-6 py-4">
          <button className="btn-primary px-5 py-2.5" onClick={onClose}>
            BACK TO THE WAR
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Strike dialog ───────────────────────────────────── */
function AttackDialog({
  target,
  me,
  live,
  onCancel,
  onResolved,
}: {
  target: TargetRow;
  me: Me;
  live: LiveView;
  onCancel: () => void;
  onResolved: (report: BattleReport) => void;
}) {
  const attack = useMutation(api.game.attack);
  const [send, setSend] = useState<Army>(EMPTY_SEND);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const defensePower = Math.round(target.power * (1 + 0.05 * target.walls));
  const sentPower = armyPower(send);
  const sentCount = UNIT_ORDER.reduce((s, k) => s + send[k], 0);
  const overFielded = UNIT_ORDER.some((k) => send[k] > me.army[k]);
  const cooldown = live.cooldownRemaining > 0;
  const canLaunch = sentCount > 0 && !overFielded && !cooldown && !busy;

  const setCount = (k: keyof Army, value: number) =>
    setSend((prev) => ({ ...prev, [k]: Math.max(0, Math.min(me.army[k], Math.floor(value))) }));

  const launch = async () => {
    setBusy(true);
    setError(null);
    try {
      const report = await attack({ defenderId: target.id, send });
      onResolved(report);
    } catch (e) {
      setError(errMsg(e));
      setBusy(false);
    }
  };

  const edge = sentPower - defensePower;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/85 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-xl animate-rise">
        <div className="flex items-start justify-between gap-4 border-b border-edge px-6 py-5">
          <div>
            <p className="label text-ember">strike order</p>
            <h2 className="mt-1 text-xl font-bold">{target.name}</h2>
            <p className="mt-1 font-mono text-xs text-steel">
              {target.allianceTag && <span className="text-plasma">[{target.allianceTag}] </span>}
              nexus {target.hq} · walls {target.walls} · might ≈{fmtInt(defensePower)}
            </p>
          </div>
          <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="label mb-2">commit formation · you have</div>
          <div className="space-y-2">
            {UNIT_ORDER.map((k) => {
              const owned = me.army[k];
              const locked = owned === 0;
              return (
                <div
                  key={k}
                  className="flex items-center gap-2 rounded-lg border border-edge bg-hull/60 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs text-ash">
                      {UNITS[k].name}{" "}
                      <span className="text-steel">
                        · {UNITS[k].power} pwr · own {owned}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-ember">
                      sending {send[k]} → {send[k] * UNITS[k].power} power
                    </div>
                  </div>
                  <button
                    className="btn-ghost h-7 w-7 px-0"
                    disabled={locked}
                    onClick={() => setCount(k, send[k] - (send[k] > 10 ? 10 : 1))}
                  >
                    −
                  </button>
                  <input
                    className="input h-7 w-16 px-1 text-center text-xs"
                    type="number"
                    min={0}
                    max={owned}
                    value={send[k]}
                    disabled={locked}
                    onChange={(e) => setCount(k, Number(e.target.value))}
                  />
                  <button
                    className="btn-ghost h-7 w-7 px-0"
                    disabled={locked}
                    onClick={() => setCount(k, send[k] + (send[k] >= 10 ? 10 : 1))}
                  >
                    +
                  </button>
                  <button
                    className="btn-ghost h-7 px-2 text-[10px]"
                    disabled={locked}
                    onClick={() => setSend((prev) => ({ ...prev, [k]: owned }))}
                  >
                    ALL
                  </button>
                </div>
              );
            })}
          </div>

          <div
            className={`mt-4 rounded-lg border px-4 py-3 font-mono text-xs ${
              sentCount === 0
                ? "border-edge text-steel"
                : edge >= 0
                  ? "border-toxin/40 bg-toxin/10 text-toxin"
                  : "border-alarm/40 bg-alarm/10 text-alarm"
            }`}
          >
            {sentCount === 0 ? (
              "Select units to project force."
            ) : edge >= 0 ? (
              <>
                PROJECTED EDGE {fmtInt(edge)} — your formation outmuscles the defense (±jitter).
              </>
            ) : (
              <>
                OUTGUNNED BY {fmtInt(-edge)} — expect heavy losses, if any make it home.
              </>
            )}
          </div>

          {cooldown && (
            <p className="mt-3 font-mono text-xs text-gold">
              Fleet rearming — ready in {fmtDuration(live.cooldownRemaining)}.
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-lg border border-alarm/40 bg-alarm/10 px-3 py-2 font-mono text-xs text-alarm">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-edge px-6 py-4">
          <button className="btn-ghost px-4 py-2.5" onClick={onCancel}>
            Stand down
          </button>
          <button className="btn-primary px-5 py-2.5" disabled={!canLaunch} onClick={launch}>
            {busy ? "ENGAGING…" : `LAUNCH RAID (${sentCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── War tab ─────────────────────────────────────────── */
export default function WarTab({ me, live }: { me: Me; live: LiveView }) {
  const targets = useQuery(api.social.targets);
  const feed = useQuery(api.social.battleFeed);
  const [selected, setSelected] = useState<TargetRow | null>(null);
  const [report, setReport] = useState<BattleReport | null>(null);
  const cooldown = live.cooldownRemaining > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <span className="label text-ember">sector scan</span>
            <h2 className="text-lg font-semibold">Targets · easiest first</h2>
          </div>
          <span className="font-mono text-xs text-steel">
            {cooldown ? `rearming ${fmtDuration(live.cooldownRemaining)}` : "fleet combat-ready"}
          </span>
        </div>

        <div className="panel mt-3 divide-y divide-edge">
          {targets === undefined && (
            <p className="px-5 py-6 text-center font-mono text-sm text-steel/80">scanning sector…</p>
          )}
          {targets && targets.length === 0 && (
            <p className="px-5 py-6 text-center font-mono text-sm text-steel/80">
              No other holds on the grid yet. Rogue factories arrive with your first login.
            </p>
          )}
          {targets?.map((t) => {
            const shielded = t.shielded;
            const allied = t.allied;
            const disabled = shielded || allied || cooldown;
            const reason = shielded
              ? "SHIELDED"
              : allied
                ? "ALLIED"
                : cooldown
                  ? `REARM ${fmtDuration(live.cooldownRemaining)}`
                  : null;
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-mono text-sm font-semibold text-ash">
                      {t.name}
                    </span>
                    {t.allianceTag && (
                      <span className="rounded border border-plasma/40 bg-plasma/10 px-1 py-px font-mono text-[10px] text-plasma">
                        [{t.allianceTag}]
                      </span>
                    )}
                    <span
                      className={`rounded px-1 py-px font-mono text-[10px] uppercase tracking-wider ${
                        t.isBot ? "bg-ember/15 text-ember" : "bg-plasma/15 text-plasma"
                      }`}
                    >
                      {t.isBot ? "rogue factory" : "commander"}
                    </span>
                    {shielded && (
                      <span className="rounded bg-gold/15 px-1 py-px font-mono text-[10px] text-gold">
                        shielded
                      </span>
                    )}
                    {allied && (
                      <span className="rounded bg-toxin/15 px-1 py-px font-mono text-[10px] text-toxin">
                        ally
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-steel">
                    nexus {t.hq} · walls {t.walls} · might ≈{fmtInt(t.power)}
                    {t.lootHint && (
                      <span className="text-ember">
                        {" "}
                        · silos {fmtNum(t.lootHint.metal + t.lootHint.energy + t.lootHint.crystal)}
                      </span>
                    )}
                  </div>
                </div>
                {reason ? (
                  <span className="shrink-0 rounded border border-edge px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-steel">
                    {reason}
                  </span>
                ) : (
                  <button
                    className="btn-primary shrink-0 px-3 py-1.5 text-xs"
                    onClick={() => setSelected(t)}
                  >
                    ATTACK
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-3 font-mono text-xs text-steel/80">
          Attacking an ally is blocked, shields protect fresh holds for 2h, and every raid rearms your
          fleet for 45s.
        </p>
      </div>

      {/* War feed */}
      <div>
        <div>
          <span className="label text-ember">after-action wire</span>
          <h2 className="text-lg font-semibold">War Feed</h2>
        </div>
        <div className="panel mt-3 divide-y divide-edge">
          {feed === undefined && (
            <p className="px-5 py-6 text-center font-mono text-sm text-steel/80">tuning the wire…</p>
          )}
          {feed && feed.length === 0 && (
            <p className="px-5 py-6 text-center font-mono text-sm text-steel/80">
              No strikes recorded. Yours could be the first entry.
            </p>
          )}
          {feed?.slice(0, 14).map((b) => (
            <div key={b.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs">
                  <span className={b.attackerWon ? "text-ember" : "text-steel/60"}>
                    {b.attackerName}
                  </span>
                  <span className="text-steel/50"> ▸ </span>
                  <span className={b.attackerWon ? "text-steel/60" : "text-plasma"}>
                    {b.defenderName}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[10px] text-steel/70">
                  {fmtTimeOfDay(b.createdAt)}
                </span>
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-steel/70">
                {b.attackerWon ? "raid won" : "repelled"} · loot {fmtNum(b.lootTotal)} · losses{" "}
                {fmtInt(
                  b.attackerLosses.drone +
                    b.attackerLosses.crawler +
                    b.attackerLosses.mech +
                    b.attackerLosses.titan,
                )}
                /
                {fmtInt(
                  b.defenderLosses.drone +
                    b.defenderLosses.crawler +
                    b.defenderLosses.mech +
                    b.defenderLosses.titan,
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="panel mt-4 p-4">
          <span className="label">your war record</span>
          <div className="mt-2 grid grid-cols-3 gap-3 font-mono text-center text-sm">
            <div>
              <div className="text-lg font-bold text-toxin">{me.stats.wins}</div>
              <div className="label">wins</div>
            </div>
            <div>
              <div className="text-lg font-bold text-alarm">{me.stats.losses}</div>
              <div className="label">losses</div>
            </div>
            <div>
              <div className="text-lg font-bold text-ember">{fmtNum(me.stats.resourcesLooted)}</div>
              <div className="label">looted</div>
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <AttackDialog
          target={selected}
          me={me}
          live={live}
          onCancel={() => setSelected(null)}
          onResolved={(r) => {
            setSelected(null);
            setReport(r);
          }}
        />
      )}
      {report && <BattleReportModal report={report} onClose={() => setReport(null)} />}
    </div>
  );
}
