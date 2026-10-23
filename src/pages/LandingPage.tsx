import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  UNIT_ORDER,
  UNITS,
  fmtInt,
  fmtNum,
  fmtTimeOfDay,
} from "../../shared/gameConfig";

const LOOP = [
  {
    n: "01",
    title: "Extract",
    body: "Ore Extractors, Fusion Reactors and Crystal Refineries run on a clock that never stops. Log off overnight, come back to full silos.",
  },
  {
    n: "02",
    title: "Forge",
    body: "Spend stockpiles on a standing army. The War Foundry shaves seconds off every batch; the Command Nexus decides how big that army can grow.",
  },
  {
    n: "03",
    title: "Deploy",
    body: "Pick a target, commit your formation, and resolve the battle on the spot. Winners haul home metal, energy and crystal.",
  },
  {
    n: "04",
    title: "Conquer",
    body: "Climb the power ranks solo — or fly an alliance tag, lock your borders, and coordinate strikes against the powers above you.",
  },
];

const WAR_RULES = [
  "Allies never shoot allies — coordinated fleets stay home.",
  "New holds carry a shield dome for their first two hours.",
  "Every strike rearms your fleet for 45 seconds. Choose targets deliberately.",
  "Walls harden every defending unit by 5% per level.",
];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-5 text-center">
      <div className="font-mono text-2xl font-bold text-ash sm:text-3xl">{value}</div>
      <div className="label mt-1">{label}</div>
    </div>
  );
}

export default function LandingPage() {
  const stats = useQuery(api.social.worldStats);
  const feed = useQuery(api.social.battleFeed);

  return (
    <div className="min-h-screen bg-void">
      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-edge/80 bg-void/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-ember/50 bg-ember/10 font-mono text-sm font-bold text-ember">
              IH
            </span>
            <span className="text-lg font-bold tracking-tight">
              IRON<span className="text-ember">HOLD</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 font-mono text-xs uppercase tracking-widest text-steel md:flex">
            <a href="#loop" className="transition hover:text-ash">
              The Loop
            </a>
            <a href="#arsenal" className="transition hover:text-ash">
              Arsenal
            </a>
            <a href="#alliances" className="transition hover:text-ash">
              Alliances
            </a>
            <a href="#warfeed" className="transition hover:text-ash">
              War Feed
            </a>
          </nav>
          <Link to="/auth" className="btn-primary px-4 py-2 text-xs">
            ENTER THE HOLD
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0" />
        <div className="glow-ember absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div className="animate-rise">
            <p className="label text-ember">Idle factory warfare · persistent world</p>
            <h1 className="mt-4 text-5xl font-bold leading-[1.03] tracking-tight sm:text-6xl">
              Your factories
              <br />
              never stop.
              <br />
              <span className="text-ember">Neither does the war.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-steel">
              IRONHOLD is a multiplayer idle war fought over a shared grid of sectors. Extract while
              you're away, forge armies, raid rival factories, and team up — every alliance on the
              board is a real commander deciding who gets to keep their resources.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/auth" className="btn-primary px-6 py-3 text-base">
                DEPLOY YOUR FIRST HOLD <span aria-hidden>▸</span>
              </Link>
              <a href="#loop" className="btn-ghost px-6 py-3 text-base">
                See the war loop
              </a>
            </div>
            <p className="mt-4 font-mono text-xs text-steel/80">
              No install · plays in the browser · progress accrues while offline
            </p>
          </div>

          {/* Live console */}
          <div className="animate-rise" style={{ animationDelay: "120ms" }}>
            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-edge bg-raised/60 px-4 py-2.5">
                <span className="label text-ember">◉ live sector telemetry</span>
                <span className="label">grid-07</span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-edge border-b border-edge">
                <Stat
                  label="commanders"
                  value={stats ? fmtInt(stats.commanders) : "—"}
                />
                <Stat label="alliances" value={stats ? fmtInt(stats.alliances) : "—"} />
              </div>
              <div className="grid grid-cols-2 divide-x divide-edge border-b border-edge">
                <Stat label="battles fought" value={stats ? fmtInt(stats.battles) : "—"} />
                <Stat
                  label="resources seized"
                  value={stats ? fmtNum(stats.lootTotal) : "—"}
                />
              </div>
              <div className="px-4 py-3">
                <span className="label">recent strikes</span>
                <ul className="mt-2 space-y-1.5 font-mono text-xs">
                  {feed === undefined && <li className="text-steel/60">contacting grid…</li>}
                  {feed && feed.length === 0 && (
                    <li className="text-steel/70">
                      silence on the grid — the first strike is yours to make
                    </li>
                  )}
                  {feed?.slice(0, 5).map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3">
                      <span className="truncate">
                        <span className={b.attackerWon ? "text-ember" : "text-steel"}>
                          {b.attackerName}
                        </span>
                        <span className="text-steel/60"> ▸ </span>
                        <span className={b.attackerWon ? "text-steel/60" : "text-plasma"}>
                          {b.defenderName}
                        </span>
                      </span>
                      <span className="shrink-0 text-steel/70">
                        {fmtTimeOfDay(b.createdAt)} · +{fmtNum(b.lootTotal)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Loop ────────────────────────────────────── */}
      <section id="loop" className="border-t border-edge bg-hull/60">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="label text-ember">The war loop</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Four moves, repeating forever
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {LOOP.map((step, i) => (
              <div
                key={step.n}
                className="panel group p-6 transition duration-200 hover:-translate-y-1 hover:border-ember/50"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span className="font-mono text-xs text-ember">{step.n}</span>
                <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-steel">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Arsenal ─────────────────────────────────────── */}
      <section id="arsenal" className="border-t border-edge">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label text-ember">Arsenal</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Four tiers of steel
              </h2>
            </div>
            <p className="max-w-md text-sm text-steel">
              Power is what wins battles — but cost, training time and the Command Nexus gate decide
              how much of it you can field at once.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {UNIT_ORDER.map((key) => {
              const unit = UNITS[key];
              return (
                <div key={key} className="panel p-6">
                  <div className="flex items-baseline justify-between">
                    <span className="label text-ember">{unit.role}</span>
                    <span className="font-mono text-xs text-steel">NEXUS {unit.hqRequired}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{unit.name}</h3>
                  <p className="mt-2 min-h-[3rem] text-sm leading-relaxed text-steel">{unit.blurb}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-edge pt-4 font-mono text-xs">
                    <div>
                      <div className="label">power</div>
                      <div className="text-ash">{unit.power}</div>
                    </div>
                    <div>
                      <div className="label">train</div>
                      <div className="text-ash">{unit.trainSec}s</div>
                    </div>
                    <div>
                      <div className="label">metal</div>
                      <div className="text-ash">{fmtNum(unit.cost.metal)}</div>
                    </div>
                    <div>
                      <div className="label">energy</div>
                      <div className="text-ash">{fmtNum(unit.cost.energy)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Alliances ───────────────────────────────────── */}
      <section id="alliances" className="relative border-t border-edge bg-hull/60">
        <div className="glow-plasma absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-2">
          <div>
            <p className="label text-plasma">Alliances</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              No commander holds a sector alone
            </h2>
            <p className="mt-4 text-base leading-relaxed text-steel">
              Found an alliance, stamp it with a tag, and every member flies your colors on the
              leaderboard. Shared comms run inside the alliance, member rosters show live power, and
              your combined might reshapes the ranks the moment someone trains a titan.
            </p>
            <Link to="/auth" className="btn-primary mt-7 px-5 py-3">
              FOUND AN ALLIANCE <span aria-hidden>▸</span>
            </Link>
          </div>
          <div className="panel p-6">
            <span className="label">engagement rules</span>
            <ul className="mt-4 space-y-3">
              {WAR_RULES.map((rule) => (
                <li key={rule} className="flex gap-3 text-sm leading-relaxed text-ash">
                  <span className="mt-0.5 text-ember">▸</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── War feed ────────────────────────────────────── */}
      <section id="warfeed" className="border-t border-edge">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="label text-ember">War feed</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            The grid remembers every strike
          </h2>
          <div className="panel mt-8 divide-y divide-edge">
            {feed === undefined && (
              <div className="px-5 py-8 text-center font-mono text-sm text-steel/70">
                establishing uplink…
              </div>
            )}
            {feed && feed.length === 0 && (
              <div className="px-5 py-10 text-center">
                <p className="font-mono text-sm text-steel">
                  No battles recorded yet. The sector is quiet — suspiciously quiet.
                </p>
                <Link to="/auth" className="btn-primary mt-4 px-5 py-2.5">
                  Be the first aggressor
                </Link>
              </div>
            )}
            {feed?.slice(0, 10).map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 font-mono text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className={b.attackerWon ? "text-ember" : "text-steel/60"}>
                    {b.attackerName}
                  </span>
                  <span className="text-steel/50">attacked</span>
                  <span className={b.attackerWon ? "text-steel/60" : "text-plasma"}>
                    {b.defenderName}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
                      b.attackerWon
                        ? "bg-ember/15 text-ember"
                        : "bg-plasma/15 text-plasma"
                    }`}
                  >
                    {b.attackerWon ? "raid won" : "repelled"}
                  </span>
                </span>
                <span className="text-xs text-steel/70">
                  {fmtTimeOfDay(b.createdAt)} · loot {fmtNum(b.lootTotal)} · attacker losses{" "}
                  {fmtInt(
                    b.attackerLosses.drone +
                      b.attackerLosses.crawler +
                      b.attackerLosses.mech +
                      b.attackerLosses.titan,
                  )}{" "}
                  · defender losses{" "}
                  {fmtInt(
                    b.defenderLosses.drone +
                      b.defenderLosses.crawler +
                      b.defenderLosses.mech +
                      b.defenderLosses.titan,
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-edge">
        <div className="bg-grid absolute inset-0 opacity-70" />
        <div className="glow-ember absolute inset-0" />
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            The sector is already moving.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-steel">
            Every minute you wait is production someone else is banking. Deploy a hold, train the
            first drones, and stake your claim on the grid.
          </p>
          <Link to="/auth" className="btn-primary mt-8 inline-flex px-8 py-4 text-base">
            ENTER THE HOLD <span aria-hidden>▸</span>
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-edge bg-hull/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8">
          <span className="font-mono text-xs text-steel/70">
            IRONHOLD · idle factory war · {fmtInt(stats?.commanders ?? 0)} commanders and counting
          </span>
          <div className="flex gap-6 font-mono text-xs text-steel/70">
            <a href="#loop" className="transition hover:text-ash">
              The Loop
            </a>
            <a href="#arsenal" className="transition hover:text-ash">
              Arsenal
            </a>
            <Link to="/auth" className="transition hover:text-ash">
              Enlist
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
