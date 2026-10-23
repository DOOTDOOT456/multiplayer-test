import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findPlayerByUser, requirePlayer } from "./game";
import { settleQueue } from "./economy";
import { armyPower } from "../shared/gameConfig";

export const MAX_ALLIANCE_MEMBERS = 40;

export const createAlliance = mutation({
  args: {
    name: v.string(),
    tag: v.string(),
    motto: v.optional(v.string()),
  },
  handler: async (ctx, { name, tag, motto }) => {
    const player = await requirePlayer(ctx);
    if (player.allianceId) throw new Error("Leave your current alliance first.");
    const cleanName = name.trim().slice(0, 24);
    const cleanTag = tag
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 5);
    if (cleanName.length < 3) throw new Error("Alliance names need at least 3 characters.");
    if (cleanTag.length < 2) throw new Error("Tags need 2-5 letters or digits.");
    const taken = await ctx.db
      .query("alliances")
      .withIndex("by_tag", (q) => q.eq("tag", cleanTag))
      .unique();
    if (taken) throw new Error(`Tag [${cleanTag}] is already claimed.`);
    const allianceId = await ctx.db.insert("alliances", {
      name: cleanName,
      tag: cleanTag,
      motto: motto?.trim().slice(0, 80) || undefined,
      leaderId: player._id,
      createdAt: Date.now(),
    });
    await ctx.db.patch(player._id, { allianceId });
    return allianceId;
  },
});

export const joinAlliance = mutation({
  args: { allianceId: v.id("alliances") },
  handler: async (ctx, { allianceId }) => {
    const player = await requirePlayer(ctx);
    if (player.allianceId) throw new Error("You are already in an alliance.");
    const alliance = await ctx.db.get(allianceId);
    if (!alliance) throw new Error("That alliance no longer exists.");
    const members = await ctx.db
      .query("players")
      .withIndex("by_alliance", (q) => q.eq("allianceId", allianceId))
      .collect();
    if (members.length >= MAX_ALLIANCE_MEMBERS) throw new Error("That alliance is full.");
    await ctx.db.patch(player._id, { allianceId });
  },
});

export const leaveAlliance = mutation({
  args: {},
  handler: async (ctx) => {
    const player = await requirePlayer(ctx);
    if (!player.allianceId) throw new Error("You are not in an alliance.");
    const alliance = await ctx.db.get(player.allianceId);
    const members = await ctx.db
      .query("players")
      .withIndex("by_alliance", (q) => q.eq("allianceId", player.allianceId!))
      .collect();
    const others = members.filter((m) => m._id !== player._id);

    if (alliance) {
      if (others.length === 0) {
        // Last one out turns off the lights.
        const messages = await ctx.db
          .query("allianceMessages")
          .withIndex("by_alliance", (q) => q.eq("allianceId", alliance._id))
          .collect();
        for (const msg of messages) await ctx.db.delete(msg._id);
        await ctx.db.delete(alliance._id);
      } else if (alliance.leaderId === player._id) {
        // Hand the flag to the longest-serving member.
        const successor = others.reduce((oldest, m) => (m._creationTime < oldest._creationTime ? m : oldest));
        await ctx.db.patch(alliance._id, { leaderId: successor._id });
      }
    }
    await ctx.db.patch(player._id, { allianceId: undefined });
  },
});

export const sendMessage = mutation({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const player = await requirePlayer(ctx);
    if (!player.allianceId) throw new Error("You are not in an alliance.");
    const clean = text.trim().slice(0, 240);
    if (clean.length === 0) throw new Error("Empty message.");
    await ctx.db.insert("allianceMessages", {
      allianceId: player.allianceId,
      playerId: player._id,
      playerName: player.name,
      text: clean,
      createdAt: Date.now(),
    });
  },
});

/** Everything about the caller's alliance: roster + comms. */
export const myAlliance = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const player = await findPlayerByUser(ctx, identity.tokenIdentifier);
    if (!player?.allianceId) return null;
    const alliance = await ctx.db.get(player.allianceId);
    if (!alliance) return null;
    const now = Date.now();
    const members = await ctx.db
      .query("players")
      .withIndex("by_alliance", (q) => q.eq("allianceId", alliance._id))
      .collect();
    const roster = members.map((m) => {
      const { army } = settleQueue(m, now);
      return {
        id: m._id,
        name: m.name,
        isBot: !!m.isBot,
        power: armyPower(army),
        hq: m.buildings.hq,
        isLeader: alliance.leaderId === m._id,
        isYou: m._id === player._id,
      };
    });
    roster.sort((a, b) => b.power - a.power);
    const messages = await ctx.db
      .query("allianceMessages")
      .withIndex("by_alliance", (q) => q.eq("allianceId", alliance._id))
      .order("desc")
      .take(80);
    messages.reverse();
    return {
      id: alliance._id,
      name: alliance.name,
      tag: alliance.tag,
      motto: alliance.motto ?? null,
      createdAt: alliance.createdAt,
      memberCount: roster.length,
      totalPower: roster.reduce((s, m) => s + m.power, 0),
      roster,
      messages: messages.map((m) => ({
        id: m._id,
        playerId: m.playerId,
        playerName: m.playerName,
        text: m.text,
        createdAt: m.createdAt,
        isYou: m.playerId === player._id,
      })),
    };
  },
});

/** Open alliances the player could join. */
export const listAlliances = query({
  args: {},
  handler: async (ctx) => {
    const alliances = await ctx.db.query("alliances").collect();
    const players = await ctx.db.query("players").collect();
    const now = Date.now();
    return alliances
      .map((a) => {
        const members = players.filter((p) => p.allianceId === a._id);
        const leader = players.find((p) => p._id === a.leaderId);
        const totalPower = members.reduce((s, m) => s + armyPower(settleQueue(m, now).army), 0);
        return {
          id: a._id,
          name: a.name,
          tag: a.tag,
          motto: a.motto ?? null,
          memberCount: members.length,
          totalPower,
          leaderName: leader?.name ?? "unknown",
          full: members.length >= MAX_ALLIANCE_MEMBERS,
        };
      })
      .sort((a, b) => b.totalPower - a.totalPower)
      .slice(0, 50);
  },
});
