import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import {
  RESOURCE_ORDER,
  RESOURCE_META,
  armyCount,
  fmtDuration,
  fmtInt,
  fmtNum,
} from "../../shared/gameConfig";
import { errMsg } from "../lib/utils";
import { useLive } from "./useLive";
import type { LiveView, Me } from "./types";
import BaseTab from "./BaseTab";
import ArmyTab from "./ArmyTab";
import WarTab from "./WarTab";
import AllianceTab from "./AllianceTab";
import RanksTab from "./RanksTab";

type TabKey = "base" | "army" | "war" | "alliance" | "ranks";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "base", label: "Base" },
  { key: "army", label: "Army" },
  { key: "war", label: "War" },
  { key: "alliance", label: "Alliance" },
  { key: "ranks", label: "Ranks" },
];

function ResourceChip({
  name,
  value,
  rate,
  cap,
}: {
  name: string;
  value: number;
  rate: number;
  cap: number;
}) {
  const pct = Math.min(100, (value / cap) * 100);
  return (
    <div className="min-w-[104px] flex-1 border-l border-edge px-3 py-1.5 first:border-l-0">
      <div className="label flex items-center justify-between gap-2">
        <span>{name}</span>
        <span className="text-ember">+{fmtNum(rate)}/s</span>
      </div>
      <div className="font-mono text-sm font-semibold text-ash">{fmtInt(value)}</div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-hull">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct > 95 ? "bg-alarm" : "bg-ember/70"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TopBar({
  me,
  live,
  onRename,
}: {
  me: Me;
  live: LiveView;
  onRename: (name: string) => Promise<unknown>;
}) {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(me.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const saveName = async () => {
    setEditing(false);
    const clean = draft.trim();
    if (clean && clean !== me.name) {
      try {
        await onRename(clean);
      } catch {
        setDraft(me.name);
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-edge bg-void/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Link to="/" className="flex items-center gap-2" title="Back to home">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-ember/50 bg-ember/10 font-mono text-xs font-bold text-ember">
            IH
          </span>
          <span className="hidden text-sm font-bold tracking-tight sm:block">
            IRON<span className="text-ember">HOLD</span>
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          {editing ? (
            <input
              ref={inputRef}
              className="input h-7 w-36 py-0 text-xs"
              value={draft}
              maxLength={18}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") {
                  setDraft(me.name);
                  setEditing(false);
                }
              }}
            />
          ) : (
            <button
              className="group flex min-w-0 items-center gap-1.5 font-mono text-sm font-semibold text-ash transition hover:text-ember"
              onClick={() => setEditing(true)}
              title="Rename commander"
            >
              <span className="truncate">{me.name}</span>
              <span className="text-[10px] text-steel opacity-0 transition group-hover:opacity-100">
                ✎
              </span>
            </button>
          )}
          {me.alliance && (
            <span className="rounded border border-plasma/40 bg-plasma/10 px-1.5 py-0.5 font-mono text-[10px] text-plasma">
              [{me.alliance.tag}]
            </span>
          )}
          {live.shieldRemaining > 0 && (
            <span className="rounded border border-gold/40 bg-gold/10 px-1.5 py-0.5 font-mono text-[10px] text-gold">
              SHIELD {fmtDuration(live.shieldRemaining)}
            </span>
          )}
          {live.cooldownRemaining > 0 && (
            <span className="rounded border border-edge bg-raised px-1.5 py-0.5 font-mono text-[10px] text-steel">
              REARM {fmtDuration(live.cooldownRemaining)}
            </span>
          )}
        </div>

        <div className="order-last flex w-full items-stretch gap-0 overflow-hidden rounded-lg border border-edge sm:order-none sm:w-auto sm:flex-1">
          {RESOURCE_ORDER.map((key) => (
            <ResourceChip
              key={key}
              name={RESOURCE_META[key].name}
              value={live.resources[key]}
              rate={live.rates[key]}
              cap={live.cap}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="label">power</div>
            <div className="font-mono text-sm font-bold text-ember">{fmtInt(me.power)}</div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="label">army</div>
            <div className="font-mono text-sm font-bold text-ash">
              {fmtInt(armyCount(me.army))}
              <span className="text-steel">/{me.armyCap}</span>
            </div>
          </div>
          <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

export default function GamePage() {
  const me = useQuery(api.game.me);
  const ensurePlayer = useMutation(api.game.ensurePlayer);
  const rename = useMutation(api.game.rename);
  const [ensureError, setEnsureError] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (me === null && !attempted.current) {
      attempted.current = true;
      setEnsureError(null);
      ensurePlayer({}).catch((e) => {
        attempted.current = false;
        setEnsureError(errMsg(e));
      });
    }
  }, [me, ensurePlayer]);

  const live = useLive(me ?? undefined);
  const [tab, setTab] = useState<TabKey>("base");

  if (!me || !live) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-void px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-edge border-t-ember" />
        <p className="label animate-pulse">
          {ensureError ? "uplink failed" : "establishing your hold…"}
        </p>
        {ensureError && (
          <div className="panel max-w-sm p-4 text-center">
            <p className="font-mono text-xs text-alarm">{ensureError}</p>
            <button
              className="btn-ghost mt-3 px-4 py-2 text-xs"
              onClick={() => {
                attempted.current = false;
                setEnsureError(null);
                ensurePlayer({}).catch((e) => {
                  setEnsureError(errMsg(e));
                });
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void">
      <TopBar me={me} live={live} onRename={(name) => rename({ name })} />

      <nav className="border-b border-edge bg-hull/70">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative whitespace-nowrap px-4 py-3 font-mono text-xs uppercase tracking-[0.16em] transition ${
                tab === t.key ? "text-ember" : "text-steel hover:text-ash"
              }`}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-ember shadow-ember" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="bg-grid min-h-[calc(100vh-7rem)]">
        <div className="mx-auto max-w-6xl px-4 py-6 pb-20">
          {tab === "base" && <BaseTab me={me} live={live} />}
          {tab === "army" && <ArmyTab me={me} live={live} />}
          {tab === "war" && <WarTab me={me} live={live} />}
          {tab === "alliance" && <AllianceTab me={me} live={live} />}
          {tab === "ranks" && <RanksTab me={me} live={live} />}
        </div>
      </main>
    </div>
  );
}
