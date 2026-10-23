import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const resources = () =>
  v.object({
    metal: v.number(),
    energy: v.number(),
    crystal: v.number(),
  });

const army = () =>
  v.object({
    drone: v.number(),
    crawler: v.number(),
    mech: v.number(),
    titan: v.number(),
  });

const stats = () =>
  v.object({
    wins: v.number(),
    losses: v.number(),
    attacks: v.number(),
    resourcesLooted: v.number(),
  });

export default defineSchema({
  ...authTables,

  players: defineTable({
    userId: v.string(),
    name: v.string(),
    isBot: v.optional(v.boolean()),
    createdAt: v.number(),
    lastTick: v.number(),
    resources: resources(),
    buildings: v.object({
      hq: v.number(),
      mine: v.number(),
      reactor: v.number(),
      refinery: v.number(),
      foundry: v.number(),
      walls: v.number(),
    }),
    army: army(),
    queue: v.array(
      v.object({
        id: v.string(),
        unit: v.union(v.literal("drone"), v.literal("crawler"), v.literal("mech"), v.literal("titan")),
        count: v.number(),
        readyAt: v.number(),
      })
    ),
    allianceId: v.optional(v.id("alliances")),
    shieldUntil: v.number(),
    lastAttackAt: v.number(),
    stats: stats(),
    botState: v.optional(
      v.object({
        targetArmy: army(),
      })
    ),
  }).index("by_user", ["userId"])
    .index("by_alliance", ["allianceId"]),

  alliances: defineTable({
    name: v.string(),
    tag: v.string(),
    motto: v.optional(v.string()),
    leaderId: v.id("players"),
    createdAt: v.number(),
  }).index("by_tag", ["tag"]),

  allianceMessages: defineTable({
    allianceId: v.id("alliances"),
    playerId: v.id("players"),
    playerName: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_alliance", ["allianceId"]),

  battles: defineTable({
    attackerId: v.id("players"),
    attackerName: v.string(),
    defenderId: v.id("players"),
    defenderName: v.string(),
    createdAt: v.number(),
    attackerWon: v.boolean(),
    sent: army(),
    attackerLosses: army(),
    defenderLosses: army(),
    loot: resources(),
    attackerPower: v.number(),
    defenderPower: v.number(),
  }),
});
