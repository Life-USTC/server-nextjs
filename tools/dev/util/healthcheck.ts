import { resolveHealthcheckUrl } from "./app-runtime";

try {
  const response = await fetch(resolveHealthcheckUrl());
  process.exit(response.ok ? 0 : 1);
} catch {
  process.exit(1);
}
