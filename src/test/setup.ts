// Vitest setup — runs before every test file.
import "@testing-library/jest-dom/vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Load .env.local into process.env so DB-backed integration tests can run
// locally. In CI there's no .env.local, so those tests skip themselves
// (they guard on DATABASE_URL). No dotenv dependency needed.
const envPath = join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const raw of readFileSync(envPath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key] === undefined) process.env[key] = line.slice(eq + 1).trim();
  }
}
