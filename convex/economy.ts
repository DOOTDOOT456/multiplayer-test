import type { Doc } from "./_generated/dataModel";
import {
  GAME_CONSTANTS,
  productionRate,
  storageCap,
  UNIT_ORDER,
  type Army,
  type Resources,
} from "../shared/gameConfig";

/**
 * Lazily settles idle production: metal/energy/crystal accrue every millisecond
 * the player is away, capped by storage and by the offline accrual window.
 */
export function collectEconomy(player: Doc<"players">, now: number) {
  const windowMs = GAME_CONSTANTS.offlineCapHours * 3_600_000;
  const elapsedMs = Math.max(0, Math.min(now - player.lastTick, windowMs));
  const sec = elapsedMs / 1000;
  const rates = productionRate(player.buildings);
  const cap = storageCap(player.buildings);
  const resources: Resources = {
    metal: Math.min(cap, player.resources.metal + rates.metal * sec),
    energy: Math.min(cap, player.resources.energy + rates.energy * sec),
    crystal: Math.min(cap, player.resources.crystal + rates.crystal * sec),
  };
  return { resources, rates, cap, lastTick: now };
}

/** Moves finished training batches into the army; returns live queue remainder. */
export function settleQueue(player: Doc<"players">, now: number) {
  const army: Army = { ...player.army };
  const queue: Doc<"players">["queue"] = [];
  for (const item of player.queue) {
    if (item.readyAt <= now) {
      army[item.unit] += item.count;
    } else {
      queue.push(item);
    }
  }
  return { army, queue };
}

export function isShielded(player: Doc<"players">, now: number): boolean {
  return player.shieldUntil > now;
}


