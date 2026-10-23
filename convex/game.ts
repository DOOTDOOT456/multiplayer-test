import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { collectEconomy, settleQueue } from "./economy";
import { ensureBots } from "./bots";
import {
  BUILDINGS,
  GAME_CONSTANTS,
  RESOURCE_ORDER,
  UNITS,
  UNIT_ORDER,
  addResources,
  armyCap,
  armyCount,
  armyPower,
  buildingCost,
  buildingRequirement,
  canAfford,
  emptyArmy,
  emptyResources,
  subtractResources,
  subtractArmy,
  trainingDurationSec,
  unitRequirement,
  type Army,
  type BuildingKey,
  type Resources,
  type UnitKey,
} from "../shared/gameConfig";

const armyValidator = v.object({
  drone: v.number(),
  crawler: v.number(),
  mech: v.number(),
  titan: v.number(),
});

const buildingKeyValidator = v.union(
  v.literal("hq"),
  v.literal("mine"),
  v.literal("reactor"),
  v.literal("refinery"),
  v.literal("foundry"),
  v.literal("walls")
);

const unitKeyValidator = v.union(v.literal("drone"), v.literal("crawler"), v.literal("mech"), v.literal("titan"));

export async function findPlayerByUser(ctx: QueryCtx | MutationCtx, userId: string) {
  return await ctx.db
    .query("players")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

export async function requirePlayer(ctx: MutationCtx): Promise<Doc<"players">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not signed in.");
  const player = await findPlayerByUser(ctx, identity.tokenIdentifier);
  if (!player) throw new Error("No commander found. Enter the game first.");
  return player;
}

function sanitizeName(raw: string | undefined): string {
  const cleaned = (raw ?? "")
    .replace(/[^\w \-]/g, "")
    .trim()
    .slice(0, 18);
  if (cleaned.length >= 3) return cleaned;
  return `Commander-${Math.floor(1000 + Math.random() * 9000)}`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function floorArmy(army: Army, share: number): Army {
  return {
    drone: Math.floor(army.drone * share),
    crawler: Math.floor(army.crawler * share),
    mech: Math.floor(army.mech * share),
    titan: Math.floor(army.titan * share),
  };
}

/** Creates the commander profile on first entry (and seeds rogue factories). */
export const ensurePlayer = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, { name }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in.");
    await ensureBots(ctx);
    const existing = await findPlayerByUser(ctx, identity.tokenIdentifier);
    if (existing) return existing._id;
    const now = Date.now();
    return await ctx.db.insert("players", {
      userId: identity.tokenIdentifier,
      name: sanitizeName(name),
      createdAt: now,
      lastTick: now,
      resources: { ...GAME_CONSTANTS.startResources },
      buildings: { hq: 1, mine: 1, reactor: 1, refinery: 0, foundry: 0, walls: 0 },
      army: emptyArmy(),
      queue: [],
      shieldUntil: now + GAME_CONSTANTS.newPlayerShieldMs,
      lastAttackAt: 0,
      stats: { wins: 0, losses: 0, attacks: 0, resourcesLooted: 0 },
    });
  },
});

/** Full live view of the commander's hold. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const player = await findPlayerByUser(ctx, identity.tokenIdentifier);
    if (!player) return null;
    const now = Date.now();
    const eco = collectEconomy(player, now);
    const { army, queue } = settleQueue(player, now);
    const alliance = player.allianceId ? await ctx.db.get(player.allianceId) : null;
    return {
      id: player._id,
      name: player.name,
      createdAt: player.createdAt,
      serverNow: now,
      resources: eco.resources,
      rates: eco.rates,
      cap: eco.cap,
      buildings: player.buildings,
      army,
      queue,
      armyCap: armyCap(player.buildings.hq),
      power: armyPower(army),
      shieldUntil: player.shieldUntil,
      cooldownRemaining: Math.max(0, GAME_CONSTANTS.attackCooldownMs - (now - player.lastAttackAt)),
      stats: player.stats,
      alliance: alliance
        ? { id: alliance._id, name: alliance.name, tag: alliance.tag, isLeader: alliance.leaderId === player._id }
        : null,
    };
  },
});

export const upgradeBuilding = mutation({
  args: { building: buildingKeyValidator },
  handler: async (ctx, { building }) => {
    const now = Date.now();
    const player = await requirePlayer(ctx);
    const key: BuildingKey = building;
    const level = player.buildings[key];
    return await applyUpgrade(ctx, player, key, level, now);
  },
});

async function applyUpgrade(
  ctx: MutationCtx,
  player: Doc<"players">,
  key: BuildingKey,
  level: number,
  now: number
) {
  const def = BUILDINGS[key];
  if (level >= def.maxLevel) throw new Error(`${def.name} is already at max level.`);
  const req = buildingRequirement(key, player.buildings);
  if (!req.ok) throw new Error(req.reason);
  const cost = buildingCost(key, level + 1);
  const eco = collectEconomy(player, now);
  if (!canAfford(eco.resources, cost)) throw new Error("Not enough resources.");
  const settled = settleQueue(player, now);
  await ctx.db.patch(player._id, {
    resources: subtractResources(eco.resources, cost),
    lastTick: now,
    buildings: { ...player.buildings, [key]: level + 1 },
    army: settled.army,
    queue: settled.queue,
  });
  return { level: level + 1 };
}

export const trainUnits = mutation({
  args: { unit: unitKeyValidator, count: v.number() },
  handler: async (ctx, { unit, count }) => {
    const now = Date.now();
    const player = await requirePlayer(ctx);
    const key: UnitKey = unit;
    if (!Number.isInteger(count) || count < 1 || count > GAME_CONSTANTS.maxTrainBatch) {
      throw new Error(`Batch size must be 1-${GAME_CONSTANTS.maxTrainBatch}.`);
    }
    const req = unitRequirement(key, player.buildings);
    if (!req.ok) throw new Error(req.reason);
    const def = UNITS[key];
    const eco = collectEconomy(player, now);
    const cost: Resources = {
      metal: def.cost.metal * count,
      energy: def.cost.energy * count,
      crystal: def.cost.crystal * count,
    };
    if (!canAfford(eco.resources, cost)) throw new Error("Not enough resources for that batch.");
    const settled = settleQueue(player, now);
    const pending = settled.queue.reduce((sum, q) => sum + q.count, 0);
    const cap = armyCap(player.buildings.hq);
    if (armyCount(settled.army) + pending + count > cap) {
      throw new Error(`Army capacity is ${cap}. Upgrade the Command Nexus.`);
    }
    if (settled.queue.length >= GAME_CONSTANTS.queueMaxEntries) {
      throw new Error("Training queue is full. Let it drain first.");
    }
    const duration = trainingDurationSec(key, count, player.buildings.foundry);
    const lastReady = settled.queue.reduce((m, q) => Math.max(m, q.readyAt), now);
    const readyAt = Math.max(now, lastReady) + duration * 1000;
    await ctx.db.patch(player._id, {
      resources: subtractResources(eco.resources, cost),
      lastTick: now,
      queue: [...settled.queue, { id: crypto.randomUUID(), unit: key, count, readyAt }],
    });
    return { readyAt };
  },
});

/** Pulls finished training batches into the army (also runs on every other action). */
export const claimQueue = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const player = await requirePlayer(ctx);
    const eco = collectEconomy(player, now);
    const settled = settleQueue(player, now);
    await ctx.db.patch(player._id, {
      army: settled.army,
      queue: settled.queue,
      resources: eco.resources,
      lastTick: now,
    });
  },
});

export const rename = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const player = await requirePlayer(ctx);
    const clean = sanitizeName(name);
    if (clean.startsWith("Commander-")) throw new Error("Names are 3-18 letters, digits, spaces or dashes.");
    await ctx.db.patch(player._id, { name: clean });
  },
});

export const attack = mutation({
  args: { defenderId: v.id("players"), send: armyValidator },
  handler: async (ctx, { defenderId, send }) => {
    const now = Date.now();
    const attacker = await requirePlayer(ctx);
    const defender = await ctx.db.get(defenderId);
    if (!defender) throw new Error("Target vanished from the grid.");
    if (attacker._id === defenderId) throw new Error("You cannot siege yourself.");
    if (defender.shieldUntil > now) throw new Error("Target is protected by a shield dome.");
    if (now - attacker.lastAttackAt < GAME_CONSTANTS.attackCooldownMs) {
      throw new Error("Fleet is rearming — wait before the next strike.");
    }
    if (attacker.allianceId && defender.allianceId && attacker.allianceId === defender.allianceId) {
      throw new Error("Allies don't shoot allies.");
    }

    for (const k of UNIT_ORDER) {
      if (!Number.isInteger(send[k]) || send[k] < 0) throw new Error("Invalid unit counts.");
    }
    const sentCount = armyCount(send);
    if (sentCount < 1) throw new Error("Select units to deploy.");
    if (sentCount > 5000) throw new Error("Deployment too large.");

    const atkEco = collectEconomy(attacker, now);
    const atkSettled = settleQueue(attacker, now);
    for (const k of UNIT_ORDER) {
      if (send[k] > atkSettled.army[k]) throw new Error(`Not enough ${UNITS[k].name}s in your garrison.`);
    }

    const defEco = collectEconomy(defender, now);
    const defSettled = settleQueue(defender, now);

    const wallMul = 1 + 0.05 * defender.buildings.walls;
    const attackerPower = Math.max(1, Math.round(armyPower(send) * jitterFactor()));
    const defenderPower = Math.max(0, Math.round(armyPower(defSettled.army) * wallMul * jitterFactor()));
    const attackerWon = attackerPower > defenderPower;

    const attRatio = defenderPower > 0 ? attackerPower / defenderPower : 99;
    const defRatio = attackerPower > 0 ? defenderPower / attackerPower : 99;

    const attackerLossShare = attackerWon
      ? clamp(defRatio * 0.45, 0.05, 0.55)
      : clamp(0.6 + 0.35 * Math.min(defRatio - 1, 1), 0.6, 0.95);
    const defenderLossShare = attackerWon ? clamp(attRatio * 0.75, 0.25, 0.95) : clamp(0.08 * attRatio, 0.02, 0.3);

    const attackerLosses = floorArmy(send, attackerLossShare);
    const defenderLosses = floorArmy(defSettled.army, defenderLossShare);
    const survivors = subtractArmy(send, attackerLosses);

    let loot = emptyResources();
    if (attackerWon) {
      const total = defEco.resources.metal + defEco.resources.energy + defEco.resources.crystal;
      if (total > 0) {
        const cargo = armyCount(survivors) * GAME_CONSTANTS.cargoPerSurvivor;
        for (const k of RESOURCE_ORDER) {
          const want = defEco.resources[k] * GAME_CONSTANTS.lootFactor;
          const share = cargo * (defEco.resources[k] / total);
          loot[k] = Math.floor(Math.min(want, share));
        }
      }
    }
    const lootTotal = loot.metal + loot.energy + loot.crystal;

    await ctx.db.patch(attacker._id, {
      army: subtractArmy(atkSettled.army, attackerLosses),
      resources: addResources(atkEco.resources, loot),
      lastTick: now,
      lastAttackAt: now,
      queue: atkSettled.queue,
      stats: {
        wins: attacker.stats.wins + (attackerWon ? 1 : 0),
        losses: attacker.stats.losses + (attackerWon ? 0 : 1),
        attacks: attacker.stats.attacks + 1,
        resourcesLooted: attacker.stats.resourcesLooted + lootTotal,
      },
    });
    await ctx.db.patch(defender._id, {
      army: subtractArmy(defSettled.army, defenderLosses),
      resources: subtractResources(defEco.resources, loot),
      lastTick: now,
      queue: defSettled.queue,
      stats: {
        wins: defender.stats.wins + (attackerWon ? 0 : 1),
        losses: defender.stats.losses + (attackerWon ? 1 : 0),
        attacks: defender.stats.attacks,
        resourcesLooted: defender.stats.resourcesLooted,
      },
    });

    const battleId = await ctx.db.insert("battles", {
      attackerId: attacker._id,
      attackerName: attacker.name,
      defenderId: defender._id,
      defenderName: defender.name,
      createdAt: now,
      attackerWon,
      sent: send,
      attackerLosses,
      defenderLosses,
      loot,
      attackerPower,
      defenderPower,
    });

    return {
      id: battleId,
      createdAt: now,
      attackerName: attacker.name,
      defenderName: defender.name,
      attackerWon,
      sent: send,
      attackerLosses,
      defenderLosses,
      survivors,
      loot,
      attackerPower,
      defenderPower,
    };
  },
});

function jitterFactor(): number {
  return 1 + (Math.random() * 2 - 1) * GAME_CONSTANTS.battleJitter;
}
