import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Rogue factories regrow garrisons and refill loot between raids.
crons.interval("regrow rogue factories", { minutes: 10 }, internal.bots.growBots, {});

export default crons;
