import { query } from "./_generated/server";
import { findPlayerByUser } from "./game";
import { collectEconomy, settleQueue } from "./economy";
import { armyPower } from "../shared/gameConfig";

/** Public numbers shown on the landing page and war room. */
export const worldStats = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("players").collect();
    const commanders = players.filter((p) => !p.isBot).length;
    const rogueFactories = players.filter((p) => p.isBot).length;
    const alliances = (await ctx.db.query("alliances").collect()).length;
    // Fine at MVP scale; replace with a counter table before big traffic.
    const battles = await ctx.db.query("battles").collect();
    const lootTotal = battles.reduce((s, b) => s + b.loot.metal + b.loot.energy + b.loot.crystal, 0);
    return { commanders, rogueFactories, alliances, battles: battles.length, lootTotal };
  },
});

/** Power ranking — commanders and rogue factories alike. */
export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const players = await ctx.db.query("players").collect();
    const rows = [];
    for (const p of players) {
      const { army } = settleQueue(p, now);
      const alliance = p.allianceId ? await ctx.db.get(p.allianceId) : null;
      rows.push({
        id: p._id,
        name: p.name,
        isBot: !!p.isBot,
        hq: p.buildings.hq,
        power: armyPower(army),
        wins: p.stats.wins,
        losses: p.stats.losses,
        allianceTag: alliance?.tag ?? null,
        shielded: p.shieldUntil > now,
      });
    }
    rows.sort((a, b) => b.power - a.power);
    return rows.slice(0, 25);
  },
});

/** Everyone you could hit right now, easiest targets first. */
export const targets = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const me = await findPlayerByUser(ctx, identity.tokenIdentifier);
    if (!me) return [];
    const now = Date.now();
    const players = await ctx.db.query("players").collect();
    const rows = [];
    for (const p of players) {
      if (p._id === me._id) continue;
      const { army } = settleQueue(p, now);
      const alliance = p.allianceId ? await ctx.db.get(p.allianceId) : null;
      const allied = Boolean(alliance && me.allianceId && me.allianceId === alliance._id);
      rows.push({
        id: p._id,
        name: p.name,
        isBot: !!p.isBot,
        power: armyPower(army),
        hq: p.buildings.hq,
        walls: p.buildings.walls,
        shielded: p.shieldUntil > now,
        allied,
        allianceTag: alliance?.tag ?? null,
        // Rogue factories are fully scouted; commanders only show rough might.
        lootHint: p.isBot ? collectEconomy(p, now).resources : null,
      });
    }
    rows.sort((a, b) => a.power - b.power);
    return rows;
  },
});

/** Global war feed. */
export const battleFeed = query({
  args: {},
  handler: async (ctx) => {
    const battles = await ctx.db
      .query("battles")
      .order("desc")
      .take(30);
    return battles.map((b) => ({
      id: b._id,
      createdAt: b.createdAt,
      attackerName: b.attackerName,
      defenderName: b.defenderName,
      attackerWon: b.attackerWon,
      lootTotal: b.loot.metal + b.loot.energy + b.loot.crystal,
      attackerLosses: b.attackerLosses,
      defenderLosses: b.defenderLosses,
      attackerPower: b.attackerPower,
      defenderPower: b.defenderPower,
    }));
  },
});
