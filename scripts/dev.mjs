import { spawn } from "node:child_process";

// Pinned so the local backend binary stays compatible with this workspace's glibc.
const BACKEND_VERSION = "precompiled-2026-09-03-53dc9bd";

const children = [];
let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of children) {
    try {
      child.kill("SIGTERM");
    } catch {
      // already gone
    }
  }
  process.exit(code);
}

function run(cmd, args, name) {
  const child = spawn(cmd, args, { stdio: "inherit", env: process.env });
  child.on("exit", (code) => {
    console.log(`[dev] ${name} exited (${code ?? "signal"})`);
    shutdown(code ?? 0);
  });
  child.on("error", (err) => {
    console.error(`[dev] ${name} failed to start:`, err.message);
    shutdown(1);
  });
  children.push({ child, name });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

run("bun", ["convex", "dev", "--local-backend-version", BACKEND_VERSION], "convex");
run("bunx", ["vite"], "vite");
