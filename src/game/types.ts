import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

import type { Resources, UnitKey } from "../../shared/gameConfig";

export type Me = NonNullable<FunctionReturnType<typeof api.game.me>>;

export interface LiveView {
  /** Resources interpolated forward from the last server snapshot, capped by storage. */
  resources: Resources;
  rates: Resources;
  cap: number;
  /** Server clock estimate, used for queue timers and shields. */
  serverNow: number;
  /** Milliseconds until the attack cooldown clears. */
  cooldownRemaining: number;
  /** Milliseconds of shield dome remaining. */
  shieldRemaining: number;
  queue: Array<{ id: string; unit: UnitKey; count: number; readyAt: number; remaining: number }>;
}
export type Targets = FunctionReturnType<typeof api.social.targets>;
export type TargetRow = Targets[number];
export type Leaderboard = FunctionReturnType<typeof api.social.leaderboard>;
export type BattleFeed = FunctionReturnType<typeof api.social.battleFeed>;
export type MyAlliance = FunctionReturnType<typeof api.alliance.myAlliance>;
export type AllianceList = FunctionReturnType<typeof api.alliance.listAlliances>;
export type BattleReport = FunctionReturnType<typeof api.game.attack>;
