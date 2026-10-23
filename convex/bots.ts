import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { collectEconomy } from "./economy";
import { GAME_CONSTANTS, type Army } from "../shared/gameConfig";

interface BotDef {
  name: string;
  buildings: Doc<"players">["buildings"];
  army: Army;
  resources: { metal: number; energy: number; crystal: number };
}

/**
 * Rogue factories: AI warlords that hold territory, hoard resources and
 * regrow their garrisons over time. They give every commander something to
 * raid from minute one, before human PvP heat picks up.
 */
const BOT_DEFS: BotDef[] = [
  {
    name: "Rust Vulture",
    buildings: { hq: 2, mine: 3, reactor: 2, refinery: 1, foundry: 0, walls: 1 },
    army: { drone: 45, crawler: 0, mech: 0, titan: 0 },
    resources: { metal: 700, energy: 600, crystal: 60 },
  },
  {
    name: "Ember Cartel",
    buildings: { hq: 3, mine: 4, reactor: 3, refinery: 2, foundry: 1, walls: 2 },
    army: { drone: 90, crawler: 10, mech: 0, titan: 0 },
    resources: { metal: 1400, energy: 1200, crystal: 200 },
  },
  {
    name: "Slag Brotherhood",
    buildings: { hq: 4, mine: 5, reactor: 5, refinery: 3, foundry: 2, walls: 3 },
    army: { drone: 130, crawler: 26, mech: 2, titan: 0 },
    resources: { metal: 2600, energy: 2400, crystal: 500 },
  },
  {
    name: "Ashen Pact",
    buildings: { hq: 5, mine: 7, reactor: 6, refinery: 4, foundry: 3, walls: 4 },
    army: { drone: 160, crawler: 44, mech: 8, titan: 0 },
    resources: { metal: 4500, energy: 4200, crystal: 1100 },
  },
  {
    name: "Obsidian Choir",
    buildings: { hq: 6, mine: 9, reactor: 8, refinery: 5, foundry: 4, walls: 6 },
    army: { drone: 210, crawler: 60, mech: 18, titan: 1 },
    resources: { metal: 8000, energy: 7500, crystal: 2200 },
  },
  {
    name: "The Last Furnace",
    buildings: { hq: 8, mine: 12, reactor: 11, refinery: 7, foundry: 5, walls: 8 },
    army: { drone: 260, crawler: 90, mech: 30, titan: 3 },
    resources: { metal: 16000, energy: 15000, crystal: 5000 },
  },
];

export async function ensureBots(ctx: MutationCtx) {
  const bots = await ctx.db
    .query("players")
    .filter((q) => q.eq(q.field("isBot"), true))
    .collect();
  const existing = new Set(bots.map((b) => b.name));
  const now = Date.now();
  for (const def of BOT_DEFS) {
    if (existing.has(def.name)) continue;
    await ctx.db.insert("players", {
      userId: `bot:${def.name}`,
      name: def.name,
      isBot: true,
      createdAt: now,
      lastTick: now,
      resources: { ...def.resources },
      buildings: { ...def.buildings },
      army: { ...def.army },
      queue: [],
      shieldUntil: 0,
      lastAttackAt: 0,
      stats: {
        wins: Math.floor(Math.random() * 40),
        losses: Math.floor(Math.random() * 25),
        attacks: 0,
        resourcesLooted: 0,
      },
      botState: { targetArmy: { ...def.army } },
    });
  }
}

/** Cron: rogue factories rearm and refill so they stay worth raiding. */
export const growBots = internalMutation({
  args: {},
  handler: async (ctx) => {
    const bots = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("isBot"), true))
      .collect();
    const now = Date.now();
    for (const bot of bots) {
      const eco = collectEconomy(bot, now);
      const target = bot.botState?.targetArmy ?? bot.army;
      const regrow = (have: number, want: number) => have + Math.ceil(Math.max(0, want - have) * 0.3);
      const army: Army = {
        drone: regrow(bot.army.drone, target.drone),
        crawler: regrow(bot.army.crawler, target.crawler),
        mech: regrow(bot.army.mech, target.mech),
        titan: regrow(bot.army.titan, target.titan),
      };
      await ctx.db.patch(bot._id, { army, resources: eco.resources, lastTick: now });
    }
    if (bots.length < GAME_CONSTANTS.botCount) {
      await ensureBots(ctx);
    }
  },
});
