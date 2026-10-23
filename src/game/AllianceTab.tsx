import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { fmtInt, fmtTimeOfDay } from "../../shared/gameConfig";
import { errMsg } from "../lib/utils";
import type { LiveView, Me } from "./types";

export default function AllianceTab({ me, live }: { me: Me; live: LiveView }) {
  void live;
  const my = useQuery(api.alliance.myAlliance);
  const list = useQuery(api.alliance.listAlliances);
  const create = useMutation(api.alliance.createAlliance);
  const join = useMutation(api.alliance.joinAlliance);
  const leave = useMutation(api.alliance.leaveAlliance);
  const sendMessage = useMutation(api.alliance.sendMessage);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Founding form
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [motto, setMotto] = useState("");

  // Chat
  const [draft, setDraft] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageCount = my?.messages.length ?? 0;
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageCount]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    setConfirmLeave(false);
    try {
      await fn();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (my === undefined) {
    return (
      <p className="label animate-pulse py-16 text-center">contacting alliance registry…</p>
    );
  }

  const errorBar = error && (
    <p className="mb-4 rounded-lg border border-alarm/40 bg-alarm/10 px-3 py-2 font-mono text-xs text-alarm">
      {error}
    </p>
  );

  /* ── No alliance: found or join ────────────────────── */
  if (my === null) {
    return (
      <div>
        {errorBar}
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="panel p-6">
            <span className="label text-ember">charter a new power</span>
            <h2 className="mt-1 text-lg font-semibold">Found an Alliance</h2>
            <p className="mt-2 text-sm leading-relaxed text-steel">
              Your tag goes on every member's header and the ranks board. One alliance per commander.
            </p>
            <div className="mt-5 space-y-3">
              <div>
                <label className="label" htmlFor="ally-name">
                  Alliance name
                </label>
                <input
                  id="ally-name"
                  className="input mt-1"
                  placeholder="Ashfall Compact"
                  value={name}
                  maxLength={24}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="label" htmlFor="ally-tag">
                    Tag (2–5)
                  </label>
                  <input
                    id="ally-tag"
                    className="input mt-1 uppercase"
                    placeholder="ASH"
                    value={tag}
                    maxLength={5}
                    onChange={(e) => setTag(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="flex-1">
                  <label className="label" htmlFor="ally-motto">
                    Motto (optional)
                  </label>
                  <input
                    id="ally-motto"
                    className="input mt-1"
                    placeholder="We outlast the furnace"
                    value={motto}
                    maxLength={80}
                    onChange={(e) => setMotto(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <button
              className="btn-primary mt-5 w-full py-2.5"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await create({ name, tag, motto: motto || undefined });
                  setName("");
                  setTag("");
                  setMotto("");
                })
              }
            >
              {busy ? "CHARTERING…" : "FOUND ALLIANCE"}
            </button>
          </div>

          <div className="panel overflow-hidden">
            <div className="border-b border-edge px-5 py-3">
              <span className="label text-plasma">open alliances</span>
            </div>
            <div className="max-h-[60vh] divide-y divide-edge overflow-y-auto">
              {list === undefined && (
                <p className="px-5 py-6 text-center font-mono text-sm text-steel/80">
                  reading the registry…
                </p>
              )}
              {list && list.length === 0 && (
                <p className="px-5 py-6 text-center font-mono text-sm text-steel/80">
                  No alliances formed yet. The board is wide open — grab a tag before someone else does.
                </p>
              )}
              {list?.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-plasma/40 bg-plasma/10 px-1.5 py-px font-mono text-[10px] text-plasma">
                        [{a.tag}]
                      </span>
                      <span className="truncate font-mono text-sm font-semibold text-ash">
                        {a.name}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-steel">
                      {a.memberCount} members · power {fmtInt(a.totalPower)} · leader {a.leaderName}
                    </div>
                  </div>
                  <button
                    className="btn-ghost shrink-0 px-3 py-1.5 text-xs"
                    disabled={busy || a.full}
                    onClick={() => run(() => join({ allianceId: a.id }))}
                  >
                    {a.full ? "FULL" : "JOIN"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Member view ───────────────────────────────────── */
  const isLeader = me.alliance?.isLeader ?? false;
  return (
    <div>
      {errorBar}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Roster */}
        <div>
          <div className="panel p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="label text-plasma">your alliance</span>
                <h2 className="mt-1 flex items-center gap-2 text-xl font-bold">
                  <span className="rounded border border-plasma/40 bg-plasma/10 px-2 py-0.5 font-mono text-sm text-plasma">
                    [{my.tag}]
                  </span>
                  {my.name}
                </h2>
                {my.motto && <p className="mt-1 text-sm italic text-steel">“{my.motto}”</p>}
              </div>
              <div className="text-right font-mono text-xs">
                <div className="label">combined power</div>
                <div className="text-lg font-bold text-ember">{fmtInt(my.totalPower)}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-edge pt-4 font-mono text-xs">
              <div>
                <div className="label">members</div>
                <div className="text-ash">{my.memberCount} / 40</div>
              </div>
              <div>
                <div className="label">founded</div>
                <div className="text-ash">{new Date(my.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          <div className="panel mt-4 overflow-hidden">
            <div className="border-b border-edge px-5 py-3">
              <span className="label">roster · live power</span>
            </div>
            <div className="max-h-[40vh] divide-y divide-edge overflow-y-auto">
              {my.roster.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="w-5 font-mono text-xs text-steel">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <span className="truncate font-mono text-sm text-ash">
                      {m.name}
                      {m.isYou && <span className="text-ember"> (you)</span>}
                    </span>
                    <div className="font-mono text-[10px] text-steel">
                      nexus {m.hq}
                      {m.isBot && " · rogue"}
                    </div>
                  </div>
                  {m.isLeader && (
                    <span className="rounded bg-gold/15 px-1.5 py-px font-mono text-[10px] text-gold">
                      leader
                    </span>
                  )}
                  <span className="font-mono text-xs text-ember">{fmtInt(m.power)}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            className={`mt-4 w-full ${confirmLeave ? "btn-danger" : "btn-ghost"} py-2.5`}
            disabled={busy}
            onClick={() => {
              if (confirmLeave) {
                run(() => leave());
              } else {
                setConfirmLeave(true);
                setTimeout(() => setConfirmLeave(false), 4000);
              }
            }}
          >
            {confirmLeave ? "CLICK AGAIN TO LEAVE" : isLeader ? "Leave (leadership passes on)" : "Leave alliance"}
          </button>
        </div>

        {/* Chat */}
        <div className="panel flex max-h-[70vh] flex-col overflow-hidden">
          <div className="border-b border-edge px-5 py-3">
            <span className="label text-plasma">secure channel</span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {my.messages.length === 0 && (
              <p className="py-8 text-center font-mono text-sm text-steel/80">
                Channel quiet. Coordinate a strike, set rally targets, argue about titans.
              </p>
            )}
            {my.messages.map((m) => (
              <div key={m.id} className="font-mono text-xs">
                <span className={m.isYou ? "text-ember" : "text-plasma"}>
                  {m.isYou ? "you" : m.playerName}
                </span>
                <span className="ml-2 text-steel/60">{fmtTimeOfDay(m.createdAt)}</span>
                <p className="mt-0.5 break-words text-ash">{m.text}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form
            className="flex gap-2 border-t border-edge px-4 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              const text = draft.trim();
              if (!text) return;
              setDraft("");
              sendMessage({ text }).catch((err) => {
                setDraft(text);
                setError(errMsg(err));
              });
            }}
          >
            <input
              className="input flex-1"
              placeholder="Message your alliance…"
              value={draft}
              maxLength={240}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="btn-primary px-4" disabled={!draft.trim()}>
              SEND
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
