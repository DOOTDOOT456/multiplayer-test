// Shared game rules used by both the Convex backend and the client UI.
// Pure functions only — no Convex imports so it stays trivially portable.

export type ResourceKey = "metal" | "energy" | "crystal";
export type Resources = Record<ResourceKey, number>;

export const RESOURCE_ORDER: ResourceKey[] = ["metal", "energy", "crystal"];

export const RESOURCE_META: Record<ResourceKey, { name: string; blurb: string }> = {
  metal: { name: "Metal", blurb: "Structural plates cut from bedrock. Builds everything that endures." },
  energy: { name: "Energy", blurb: "Reactor output. Keeps the lines hot and the lights on." },
  crystal: { name: "Crystal", blurb: "Refined war-glass. The price of advanced machines." },
};

export type BuildingKey = "hq" | "mine" | "reactor" | "refinery" | "foundry" | "walls";
export type Buildings = Record<BuildingKey, number>;

export interface BuildingDef {
  name: string;
  blurb: string;
  baseCost: Resources;
  growth: number;
  maxLevel: number;
  requires?: { building: BuildingKey; level: number };
  output?: string;
}

export const BUILDING_ORDER: BuildingKey[] = ["hq", "mine", "reactor", "refinery", "foundry", "walls"];

export const BUILDINGS: Record<BuildingKey, BuildingDef> = {
  hq: {
    name: "Command Nexus",
    blurb: "Heart of the hold. Every level raises storage, army capacity and unlocks higher tech.",
    baseCost: { metal: 150, energy: 100, crystal: 0 },
    growth: 1.75,
    maxLevel: 12,
    output: "+storage, +army cap, +unlocks",
  },
  mine: {
    name: "Ore Extractor",
    blurb: "Grinds the bedrock into usable metal, hour after hour, even while you sleep.",
    baseCost: { metal: 0, energy: 70, crystal: 0 },
    growth: 1.55,
    maxLevel: 20,
    output: "+metal / s",
  },
  reactor: {
    name: "Fusion Reactor",
    blurb: "Feeds the forges. Reactor output drives every machine you own.",
    baseCost: { metal: 80, energy: 0, crystal: 0 },
    growth: 1.55,
    maxLevel: 20,
    output: "+energy / s",
  },
  refinery: {
    name: "Crystal Refinery",
    blurb: "Condenses raw war-glass for advanced machines and heavy weapons.",
    baseCost: { metal: 140, energy: 140, crystal: 0 },
    growth: 1.6,
    maxLevel: 15,
    requires: { building: "hq", level: 2 },
    output: "+crystal / s",
  },
  foundry: {
    name: "War Foundry",
    blurb: "Assembly lines run hotter — every unit trains faster.",
    baseCost: { metal: 220, energy: 180, crystal: 40 },
    growth: 1.65,
    maxLevel: 10,
    requires: { building: "hq", level: 3 },
    output: "+8% train speed / level",
  },
  walls: {
    name: "Fortress Wall",
    blurb: "Blast-plated perimeter that hardens every unit defending your hold.",
    baseCost: { metal: 260, energy: 120, crystal: 30 },
    growth: 1.7,
    maxLevel: 15,
    requires: { building: "hq", level: 2 },
    output: "+5% defense / level",
  },
};

export type UnitKey = "drone" | "crawler" | "mech" | "titan";
export type Army = Record<UnitKey, number>;

export interface UnitDef {
  name: string;
  role: string;
  blurb: string;
  cost: Resources;
  power: number;
  trainSec: number;
  hqRequired: number;
}

export const UNIT_ORDER: UnitKey[] = ["drone", "crawler", "mech", "titan"];

export const UNITS: Record<UnitKey, UnitDef> = {
  drone: {
    name: "Skitter Drone",
    role: "Swarm",
    blurb: "Disposable airframes. Cheap, everywhere, never alone.",
    cost: { metal: 25, energy: 15, crystal: 0 },
    power: 2,
    trainSec: 2,
    hqRequired: 1,
  },
  crawler: {
    name: "Siege Crawler",
    role: "Armor",
    blurb: "Tracked artillery. Crushes swarms, fears anything that closes the distance.",
    cost: { metal: 130, energy: 70, crystal: 15 },
    power: 9,
    trainSec: 7,
    hqRequired: 3,
  },
  mech: {
    name: "Aegis Mech",
    role: "Heavy",
    blurb: "Walker frame with ablative plating and rail fists. The line-holder.",
    cost: { metal: 360, energy: 230, crystal: 80 },
    power: 26,
    trainSec: 15,
    hqRequired: 5,
  },
  titan: {
    name: "War Titan",
    role: "Apex",
    blurb: "A walking fortress. One titan turns a losing battle into a parade.",
    cost: { metal: 1200, energy: 850, crystal: 340 },
    power: 85,
    trainSec: 36,
    hqRequired: 7,
  },
};

export const GAME_CONSTANTS = {
  offlineCapHours: 8,
  attackCooldownMs: 45_000,
  newPlayerShieldMs: 2 * 60 * 60 * 1000,
  battleJitter: 0.12,
  lootFactor: 0.2,
  cargoPerSurvivor: 12,
  queueMaxEntries: 8,
  maxTrainBatch: 500,
  startResources: { metal: 300, energy: 250, crystal: 20 } as Resources,
  botCount: 6,
};

export function emptyResources(): Resources {
  return { metal: 0, energy: 0, crystal: 0 };
}

export function emptyArmy(): Army {
  return { drone: 0, crawler: 0, mech: 0, titan: 0 };
}

export function buildingCost(key: BuildingKey, nextLevel: number): Resources {
  const def = BUILDINGS[key];
  const mult = Math.pow(def.growth, nextLevel - 1);
  return {
    metal: Math.floor(def.baseCost.metal * mult),
    energy: Math.floor(def.baseCost.energy * mult),
    crystal: Math.floor(def.baseCost.crystal * mult),
  };
}

export function productionRate(buildings: Buildings): Resources {
  return {
    metal: buildings.mine > 0 ? 1.5 * Math.pow(1.28, buildings.mine - 1) : 0,
    energy: buildings.reactor > 0 ? 1.5 * Math.pow(1.28, buildings.reactor - 1) : 0,
    crystal: buildings.refinery > 0 ? 0.6 * Math.pow(1.26, buildings.refinery - 1) : 0,
  };
}

export function storageCap(buildings: Buildings): number {
  return Math.floor(1500 * Math.pow(1.55, Math.max(0, buildings.hq - 1)));
}

export function trainSpeedMultiplier(foundryLevel: number): number {
  return 1 + 0.08 * foundryLevel;
}

export function trainingDurationSec(unit: UnitKey, count: number, foundryLevel: number): number {
  return Math.ceil((UNITS[unit].trainSec * count) / trainSpeedMultiplier(foundryLevel));
}

export function armyCap(hqLevel: number): number {
  return 30 + 30 * hqLevel;
}

export function armyPower(army: Army): number {
  return UNIT_ORDER.reduce((sum, k) => sum + army[k] * UNITS[k].power, 0);
}

export function armyCount(army: Army): number {
  return UNIT_ORDER.reduce((sum, k) => sum + army[k], 0);
}

export function addArmy(a: Army, b: Army): Army {
  return { drone: a.drone + b.drone, crawler: a.crawler + b.crawler, mech: a.mech + b.mech, titan: a.titan + b.titan };
}

export function subtractArmy(a: Army, b: Army): Army {
  return {
    drone: Math.max(0, a.drone - b.drone),
    crawler: Math.max(0, a.crawler - b.crawler),
    mech: Math.max(0, a.mech - b.mech),
    titan: Math.max(0, a.titan - b.titan),
  };
}

export function canAfford(have: Resources, cost: Resources): boolean {
  return have.metal >= cost.metal && have.energy >= cost.energy && have.crystal >= cost.crystal;
}

export function subtractResources(have: Resources, cost: Resources): Resources {
  return {
    metal: Math.max(0, have.metal - cost.metal),
    energy: Math.max(0, have.energy - cost.energy),
    crystal: Math.max(0, have.crystal - cost.crystal),
  };
}

export function addResources(have: Resources, gain: Resources): Resources {
  return { metal: have.metal + gain.metal, energy: have.energy + gain.energy, crystal: have.crystal + gain.crystal };
}

export interface RequirementCheck {
  ok: boolean;
  reason?: string;
}

export function buildingRequirement(key: BuildingKey, buildings: Buildings): RequirementCheck {
  const def = BUILDINGS[key];
  if (!def.requires) return { ok: true };
  const have = buildings[def.requires.building];
  if (have < def.requires.level) {
    return { ok: false, reason: `Needs ${BUILDINGS[def.requires.building].name} ${def.requires.level}` };
  }
  return { ok: true };
}

export function unitRequirement(key: UnitKey, buildings: Buildings): RequirementCheck {
  const need = UNITS[key].hqRequired;
  if (buildings.hq < need) return { ok: false, reason: `Needs Command Nexus ${need}` };
  return { ok: true };
}

export function fmtNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (abs >= 100) return `${Math.floor(n)}`;
  return `${Math.floor(n * 10) / 10}`;
}

export function fmtInt(n: number): string {
  return `${Math.floor(n).toLocaleString("en-US")}`;
}

export function fmtDuration(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function fmtTimeOfDay(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function costLabel(cost: Resources): string {
  const parts: string[] = [];
  if (cost.metal > 0) parts.push(`${fmtNum(cost.metal)} metal`);
  if (cost.energy > 0) parts.push(`${fmtNum(cost.energy)} energy`);
  if (cost.crystal > 0) parts.push(`${fmtNum(cost.crystal)} crystal`);
  return parts.join(" · ") || "free";
}
