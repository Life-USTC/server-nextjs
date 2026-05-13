import { spawn } from "node:child_process";
import path from "node:path";
import { resolveAppHost, resolveAppPort } from "./app-runtime";

const child = spawn(
  path.join(process.cwd(), "node_modules", ".bin", "next"),
  ["dev", "--hostname", resolveAppHost(), "--port", resolveAppPort()],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  },
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
