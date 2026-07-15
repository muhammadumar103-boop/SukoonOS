import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = resolve(__dirname, "..");
const nextBin = resolve(workspaceRoot, "node_modules", ".bin", "next");
const port = 3100;
const routes = [
  "/",
  "/projects",
  "/donations",
  "/donors",
  "/expenses",
  "/transfers",
  "/finance",
  "/finance-ledger",
  "/reports",
  "/settings",
  "/login",
];

function startServer() {
  return spawn(nextBin, ["dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: workspaceRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForReady(server) {
  let output = "";
  const onData = (chunk) => {
    output += chunk.toString();
  };

  server.stdout.on("data", onData);
  server.stderr.on("data", onData);

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/login`);
      if (response.ok) {
        server.stdout.off("data", onData);
        server.stderr.off("data", onData);
        return;
      }
    } catch {}

    await delay(500);
  }

  throw new Error(`Route smoke server did not start in time.\n${output}`);
}

async function run() {
  const server = startServer();

  try {
    await waitForReady(server);

    for (const route of routes) {
      const response = await fetch(`http://127.0.0.1:${port}${route}`);
      if (!response.ok) {
        throw new Error(`Smoke check failed for ${route}: ${response.status}`);
      }
    }

    process.stdout.write(`Route smoke passed for ${routes.length} routes.\n`);
  } finally {
    server.kill("SIGINT");
    await delay(500);
  }
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
