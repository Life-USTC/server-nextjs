import { startPlaywrightStandaloneServer } from "./playwright-runtime";

const child = startPlaywrightStandaloneServer(process.cwd(), process.env);

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
