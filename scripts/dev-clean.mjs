import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const workspaceRoot = process.cwd();
const nextDir = resolve(workspaceRoot, ".next");
const nextBin = resolve(workspaceRoot, "node_modules", ".bin", "next");

await rm(nextDir, { force: true, recursive: true });

const child = spawn(nextBin, ["dev"], {
  cwd: workspaceRoot,
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
