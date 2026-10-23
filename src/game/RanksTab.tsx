import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { fmtInt } from "../../shared/gameConfig";
import type { LiveView, Me } from "./types";

const RANK_COLORS = ["text-ember", "text-plasma", "text-gold"];

export default function RanksTab({ me, live }: { me: Me; live: LiveView }) {
  void live;
  const board = useQuery(api.social.leaderboard);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="label text-ember">power index</span>
          <h2 className="text-lg font-semibold">Global Ranks</h2>
        </div>
        <span className="font-mono text-xs text-steel">
          army power · rogue factories included · refreshed live
        </span>
      </div>

      <div className="panel mt-3 overflow-hidden">
        {board === undefined && (
          <p className="px-5 py-8 text-center font-mono text-sm text-steel/80">
            tallying power…
          </p>
        )}
        {board && board.length === 0 && (
          <p className="px-5 py-8 text-center font-mono text-sm text-steel/80">
            The board is empty. Someone has to take first place.
          </p>
        )}
        {board && board.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] font-mono text-sm">
              <thead>
                <tr className="label border-b border-edge bg-raised/50 text-left">
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">commander</th>
                  <th className="px-4 py-2.5 text-right">nexus</th>
                  <th className="px-4 py-2.5 text-right">power</th>
                  <th className="px-4 py-2.5 text-right">record</th>
                  <th className="px-4 py-2.5 text-right">status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {board.map((row, i) => {
                  const isSelf = row.id === me.id;
                  return (
                    <tr
                      key={row.id}
                      className={isSelf ? "bg-ember/10" : "transition hover:bg-raised/40"}
                    >
                      <td className={`px-4 py-2.5 font-bold ${RANK_COLORS[i] ?? "text-steel"}`}>
                        {i + 1}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={isSelf ? "font-bold text-ember" : "text-ash"}>
                          {row.name}
                          {isSelf && " ◄ you"}
                        </span>
                        {row.allianceTag && (
                          <span className="ml-2 rounded border border-plasma/40 bg-plasma/10 px-1 py-px text-[10px] text-plasma">
                            [{row.allianceTag}]
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-steel">{row.hq}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-ash">
                        {fmtInt(row.power)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-steel">
                        {row.wins}
                        <span className="text-steel/50">/</span>
                        {row.losses}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {row.isBot ? (
                          <span className="text-[10px] uppercase tracking-wider text-ember">
                            rogue
                          </span>
                        ) : row.shielded ? (
                          <span className="text-[10px] uppercase tracking-wider text-gold">
                            shielded
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider text-toxin">
                            active
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 font-mono text-xs text-steel/80">
        Power counts every unit under your flag — training queues only bank once collected, and walls
        don't inflate your score, they just punish the people who hit you.
      </p>
    </div>
  );
}
