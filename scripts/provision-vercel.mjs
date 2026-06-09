#!/usr/bin/env node
// Fully unattended Vercel provisioning via the Vercel CLI.
//
// Phase C, step 3 (see docs/3-PROVISION.md) as a deterministic, idempotent,
// zero-prompt script. Drives the `vercel` CLI end-to-end:
//   1. Link (or create) a Vercel project named APP_NAME.
//   2. Push this scaffold's 5 canonical keys (from .env.local) into the
//      project's Production, Preview, and Development environments.
//   3. Run a Production deployment.
//   4. Write the resulting live URL into CLAUDE.md (the `Live URL:` line).
//
// Depends on the output of `npm run provision:supabase` — the 5 keys must
// already be in .env.local before this runs.
//
// The one human prerequisite is a Vercel access token (an auth credential
// cannot be auto-minted). Put it in a gitignored .env.provision file:
//   cp .env.provision.example .env.provision   # then paste your token
//
// Uses the Vercel CLI (already a dev tool) — no new npm deps.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ENV_LOCAL = join(ROOT, ".env.local");
const ENV_PROVISION = join(ROOT, ".env.provision");
const CLAUDE_MD = join(ROOT, "CLAUDE.md");

// The 5 canonical keys provision-supabase.mjs writes to .env.local. These are
// exactly what the deployed app needs at build/runtime on Vercel.
const CANONICAL_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "DATABASE_URL",
  "DIRECT_URL",
];
const TARGETS = ["production", "preview", "development"];

const log = (m) => console.log(`\x1b[36m[provision]\x1b[0m ${m}`);
const warn = (m) => console.warn(`\x1b[33m[provision]\x1b[0m ${m}`);
const die = (m) => {
  console.error(`\x1b[31m[provision] ${m}\x1b[0m`);
  process.exit(1);
};

// --- dotenv parsing (same shape used by provision-supabase.mjs) ---
function parseEnv(text) {
  const out = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // strip an inline comment only when the value is unquoted
    if (!val.startsWith('"') && !val.startsWith("'")) {
      const hash = val.indexOf(" #");
      if (hash !== -1) val = val.slice(0, hash).trim();
    }
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function appName() {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const name = pkg.name;
  if (!name || name === "app") {
    die("package.json `name` is still the template default ('app'). Run Intake (Phase B) to set APP_NAME first.");
  }
  return name;
}

// --- Vercel CLI runner ---
// Returns stdout (trimmed). Appends auth + scope to every call so the CLI runs
// non-interactively. Surfaces stderr in thrown errors so die() can report it.
function makeVc(token, scopeArgs) {
  return function vc(args, { input, allowFail } = {}) {
    try {
      const out = execFileSync(
        "vercel",
        [...args, ...scopeArgs, "--token", token],
        {
          encoding: "utf8",
          input: input ?? undefined,
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
      return (out ?? "").trim();
    } catch (e) {
      if (allowFail) return { failed: true, stderr: (e.stderr ?? "").toString() };
      const stderr = (e.stderr ?? "").toString().trim();
      const stdout = (e.stdout ?? "").toString().trim();
      throw new Error(
        `vercel ${args.join(" ")} failed:\n${stderr || stdout || e.message}`
      );
    }
  };
}

function linkProject(vc, name) {
  log(`Linking (or creating) Vercel project "${name}"…`);
  vc(["link", "--yes", "--project", name]);
  log(`Linked to project "${name}".`);
}

// `vercel env ls <environment>` prints a table; the var name is the first token
// on each row. Returns a Set of existing key names for that environment.
function existingEnvKeys(vc, environment) {
  const out = vc(["env", "ls", environment]);
  const keys = new Set();
  for (const raw of out.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const first = line.split(/\s+/)[0];
    if (/^[A-Z0-9_]+$/.test(first)) keys.add(first);
  }
  return keys;
}

// Idempotent upsert: env add has no --force, so remove an existing value first,
// then add. Value is piped via stdin (how the CLI reads it non-interactively).
function pushEnv(vc, env) {
  for (const target of TARGETS) {
    const existing = existingEnvKeys(vc, target);
    for (const key of CANONICAL_KEYS) {
      if (existing.has(key)) {
        vc(["env", "rm", key, target, "--yes"]);
      }
      vc(["env", "add", key, target], { input: `${env[key]}\n` });
    }
  }
  for (const key of CANONICAL_KEYS) log(`  ✓ ${key} → ${TARGETS.join(", ")}`);
}

function deployProd(vc) {
  log("Running a Production deployment (this builds remotely)…");
  const out = vc(["deploy", "--prod", "--yes"]);
  // The deployment URL is the last https:// line the CLI prints to stdout.
  const urls = out.split("\n").map((l) => l.trim()).filter((l) => /^https:\/\/\S+$/.test(l));
  const url = urls[urls.length - 1];
  if (!url) {
    die(`Deploy finished but no URL was found in the output:\n${out}`);
  }
  log(`Production deploy live at ${url}`);
  return url;
}

// Rewrite the `Live URL:` line in CLAUDE.md in place.
function writeLiveUrl(url) {
  if (!existsSync(CLAUDE_MD)) {
    warn("No CLAUDE.md found — skipping Live URL update.");
    return;
  }
  const text = readFileSync(CLAUDE_MD, "utf8");
  const lines = text.split("\n");
  let replaced = false;
  const next = lines.map((line) => {
    if (/^Live URL:/.test(line.trim())) {
      replaced = true;
      return `Live URL: **${url}**`;
    }
    return line;
  });
  if (!replaced) {
    warn("No `Live URL:` line in CLAUDE.md — leaving it unchanged.");
    return;
  }
  writeFileSync(CLAUDE_MD, next.join("\n"));
  log("Updated the Live URL in CLAUDE.md.");
}

async function main() {
  log(`Working dir: ${ROOT}`);

  if (!existsSync(ENV_PROVISION)) {
    die("No .env.provision found. Run `cp .env.provision.example .env.provision`, paste a Vercel access token (https://vercel.com/account/tokens) into VERCEL_TOKEN, then re-run.");
  }
  const cfg = parseEnv(readFileSync(ENV_PROVISION, "utf8"));
  const token = cfg.VERCEL_TOKEN;
  if (!token || token.includes("xxx")) {
    die("VERCEL_TOKEN is not set in .env.provision. Paste an access token from https://vercel.com/account/tokens.");
  }

  if (!existsSync(ENV_LOCAL)) {
    die("No .env.local found. Run `npm run provision:supabase` first — this script pushes the keys it writes.");
  }
  const env = parseEnv(readFileSync(ENV_LOCAL, "utf8"));
  const missing = CANONICAL_KEYS.filter((k) => !env[k]);
  if (missing.length) {
    die(`.env.local is missing ${missing.join(", ")}. Run \`npm run provision:supabase\` first — this script pushes the keys it writes.`);
  }

  const name = appName();
  const scopeArgs = cfg.VERCEL_TEAM_ID ? ["--scope", cfg.VERCEL_TEAM_ID] : [];
  const vc = makeVc(token, scopeArgs);

  linkProject(vc, name);
  log(`Pushing ${CANONICAL_KEYS.length} key(s) to ${TARGETS.length} environment(s)…`);
  pushEnv(vc, env);
  const url = deployProd(vc);
  writeLiveUrl(url);

  log("Vercel provisioning complete. Confirm the deploy is green in the Vercel dashboard.");
}

main().catch((e) => die(e.message));
