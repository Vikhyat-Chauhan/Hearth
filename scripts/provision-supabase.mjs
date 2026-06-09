#!/usr/bin/env node
// Fully unattended Supabase provisioning via the Supabase Management API.
//
// Phase C, step 2 (see docs/3-PROVISION.md) as a deterministic, idempotent,
// zero-prompt script. Drives https://api.supabase.com end-to-end:
//   1. Resolve the org (auto-pick if you have exactly one).
//   2. Create a project named APP_NAME (or reuse an existing one).
//   3. Poll until the project is ACTIVE_HEALTHY.
//   4. Fetch anon + service_role API keys.
//   5. Fetch the pooler connection strings.
//   6. Remap everything to this scaffold's canonical keys and merge into
//      .env.local — preserving local-only keys (RESEND_*, TEST_*, …).
//
// The one human prerequisite is a Personal Access Token (an auth credential
// cannot be auto-minted). Put it in a gitignored .env.provision file:
//   cp .env.provision.example .env.provision   # then paste your PAT
//
// Node 18+ has global fetch — no new npm deps.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

const API = "https://api.supabase.com";
const ROOT = process.cwd();
const ENV_LOCAL = join(ROOT, ".env.local");
const ENV_PROVISION = join(ROOT, ".env.provision");

const log = (m) => console.log(`\x1b[36m[provision]\x1b[0m ${m}`);
const warn = (m) => console.warn(`\x1b[33m[provision]\x1b[0m ${m}`);
const die = (m) => {
  console.error(`\x1b[31m[provision] ${m}\x1b[0m`);
  process.exit(1);
};

const sleep = () => execFileSync("sleep", ["10"]); // 10s; foreground, no deps

// --- dotenv parsing (shared shape used for both .env.provision and .env.local) ---
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

// Merge canonical vars into .env.local: replace those keys in place, append new
// ones, leave every other line untouched.
function mergeEnvLocal(resolved) {
  const existing = existsSync(ENV_LOCAL) ? readFileSync(ENV_LOCAL, "utf8") : "";
  const lines = existing.length ? existing.split("\n") : [];
  const remaining = new Set(Object.keys(resolved));

  const next = lines.map((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (m && resolved[m[1]] !== undefined) {
      remaining.delete(m[1]);
      return `${m[1]}=${resolved[m[1]]}`;
    }
    return line;
  });

  if (remaining.size) {
    if (next.length && next[next.length - 1].trim() !== "") next.push("");
    next.push("# --- Supabase (provisioned via the Management API) ---");
    for (const key of remaining) next.push(`${key}=${resolved[key]}`);
  }

  let out = next.join("\n");
  if (!out.endsWith("\n")) out += "\n";
  writeFileSync(ENV_LOCAL, out);
}

// Persist a single key back into .env.provision (e.g. the generated db password)
// so subsequent runs can rebuild connection strings.
function persistProvision(key, value) {
  const text = existsSync(ENV_PROVISION) ? readFileSync(ENV_PROVISION, "utf8") : "";
  const lines = text.length ? text.split("\n") : [];
  let replaced = false;
  const next = lines.map((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (m && m[1] === key) {
      replaced = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!replaced) next.push(`${key}=${value}`);
  let out = next.join("\n");
  if (!out.endsWith("\n")) out += "\n";
  writeFileSync(ENV_PROVISION, out);
}

// --- Management API client ---
function makeApi(token) {
  return async function api(method, path, body) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    if (!res.ok) {
      const detail = typeof json === "object" && json ? json.message ?? JSON.stringify(json) : json;
      throw new Error(`${method} ${path} → ${res.status}: ${detail}`);
    }
    return json;
  };
}

function genPassword() {
  // URL-safe alphanumeric so the string drops straight into a connection URL.
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(28);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
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

async function resolveOrg(api, cfg) {
  if (cfg.SUPABASE_ORG_ID) {
    log(`Using SUPABASE_ORG_ID=${cfg.SUPABASE_ORG_ID}`);
    return cfg.SUPABASE_ORG_ID;
  }
  const orgs = await api("GET", "/v1/organizations");
  if (!Array.isArray(orgs) || orgs.length === 0) {
    die("No organizations found for this token. Create one at supabase.com, then re-run.");
  }
  if (orgs.length > 1) {
    const list = orgs.map((o) => `  - ${o.id}  (${o.name})`).join("\n");
    die(`Multiple organizations found — set SUPABASE_ORG_ID in .env.provision to one of:\n${list}`);
  }
  log(`Auto-picked the only organization: ${orgs[0].id} (${orgs[0].name})`);
  return orgs[0].id;
}

async function findOrCreateProject(api, { name, orgId, region, dbPass }) {
  const projects = await api("GET", "/v1/projects");
  const existing = Array.isArray(projects) ? projects.find((p) => p.name === name) : null;
  if (existing) {
    log(`Reusing existing project "${name}" (ref ${existing.ref}).`);
    return { ref: existing.ref, region: existing.region ?? region, created: false };
  }
  log(`Creating Supabase project "${name}" in ${region}…`);
  const created = await api("POST", "/v1/projects", {
    name,
    organization_id: orgId,
    region,
    db_pass: dbPass,
  });
  log(`Created project ref ${created.ref}.`);
  return { ref: created.ref, region: created.region ?? region, created: true };
}

async function pollHealthy(api, ref) {
  const MAX = 30; // 30 * 10s = 5 min
  for (let i = 1; i <= MAX; i++) {
    const proj = await api("GET", `/v1/projects/${ref}`);
    const status = proj.status ?? "UNKNOWN";
    if (status === "ACTIVE_HEALTHY") {
      log("Project is ACTIVE_HEALTHY.");
      return;
    }
    log(`Status ${status} — waiting for ACTIVE_HEALTHY (${i}/${MAX})…`);
    if (i < MAX) sleep();
  }
  die("Project did not reach ACTIVE_HEALTHY within ~5 min. Check the Supabase dashboard, then re-run (idempotent).");
}

async function fetchApiKeys(api, ref) {
  const keys = await api("GET", `/v1/projects/${ref}/api-keys`);
  const find = (name) => {
    const hit = Array.isArray(keys) ? keys.find((k) => k.name === name) : null;
    return hit?.api_key ?? hit?.apiKey ?? null;
  };
  const anon = find("anon");
  const service = find("service_role");
  if (!anon || !service) {
    die(`Could not read anon/service_role keys from /api-keys response: ${JSON.stringify(keys)}`);
  }
  return { anon, service };
}

// Returns { databaseUrl (6543), directUrl (5432) }. Prefers the authoritative
// pooler config endpoint; falls back to templated construction with a warning.
async function fetchConnectionStrings(api, ref, region, dbPass) {
  const inject = (s) =>
    s
      .replace("[YOUR-PASSWORD]", dbPass)
      .replace("[YOUR_PASSWORD]", dbPass)
      .replace(":[password]", `:${dbPass}`);

  try {
    const pooler = await api("GET", `/v1/projects/${ref}/config/database/pooler`);
    const entries = Array.isArray(pooler) ? pooler : pooler ? [pooler] : [];
    const host =
      entries[0]?.db_host ?? entries[0]?.connection_string?.match(/@([^:/]+)/)?.[1] ?? null;
    if (host) {
      const base = `postgresql://postgres.${ref}:${dbPass}@${host}`;
      return {
        databaseUrl: `${base}:6543/postgres?pgmode=transaction`,
        directUrl: `${base}:5432/postgres`,
      };
    }
    // Some responses hand back full connection strings keyed by pool_mode.
    const tx = entries.find((e) => e.pool_mode === "transaction")?.connection_string;
    const sess = entries.find((e) => e.pool_mode === "session")?.connection_string;
    if (tx && sess) return { databaseUrl: inject(tx), directUrl: inject(sess) };
    throw new Error("pooler endpoint returned an unrecognized shape");
  } catch (e) {
    warn(`Could not read the pooler config endpoint (${e.message}).`);
    warn("Falling back to a constructed host with 'aws-0' — VERIFY the host in .env.local against the Supabase dashboard (Settings → Database).");
    const host = `aws-0-${region}.pooler.supabase.com`;
    const base = `postgresql://postgres.${ref}:${dbPass}@${host}`;
    return {
      databaseUrl: `${base}:6543/postgres?pgmode=transaction`,
      directUrl: `${base}:5432/postgres`,
    };
  }
}

async function main() {
  log(`Working dir: ${ROOT}`);

  if (!existsSync(ENV_PROVISION)) {
    die("No .env.provision found. Run `cp .env.provision.example .env.provision`, paste a Supabase Personal Access Token (https://supabase.com/dashboard/account/tokens), then re-run.");
  }
  const cfg = parseEnv(readFileSync(ENV_PROVISION, "utf8"));
  const token = cfg.SUPABASE_ACCESS_TOKEN;
  if (!token || token.includes("sbp_xxx")) {
    die("SUPABASE_ACCESS_TOKEN is not set in .env.provision. Paste a Personal Access Token from https://supabase.com/dashboard/account/tokens.");
  }

  const name = appName();
  const region = cfg.SUPABASE_REGION || "us-east-1";
  const api = makeApi(token);

  const orgId = await resolveOrg(api, cfg);

  // Password: reuse the one stored in .env.provision, else generate + persist it.
  let dbPass = cfg.SUPABASE_DB_PASSWORD;
  let generated = false;
  if (!dbPass) {
    dbPass = genPassword();
    generated = true;
  }

  const { ref, region: actualRegion, created } = await findOrCreateProject(api, {
    name,
    orgId,
    region,
    dbPass,
  });

  if (!created && generated) {
    die(`Project "${name}" already exists but no SUPABASE_DB_PASSWORD is stored in .env.provision — the API never re-returns it, so connection strings can't be rebuilt. Set SUPABASE_DB_PASSWORD (reset it in the dashboard), or rename/delete the project, then re-run.`);
  }
  if (created && generated) {
    persistProvision("SUPABASE_DB_PASSWORD", dbPass);
    log("Generated a DB password and saved it to .env.provision.");
  }

  await pollHealthy(api, ref);
  const { anon, service } = await fetchApiKeys(api, ref);
  const { databaseUrl, directUrl } = await fetchConnectionStrings(api, ref, actualRegion, dbPass);

  const resolved = {
    NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
    SUPABASE_ACCESS_TOKEN: service, // server admin (service_role); distinct from the PAT in .env.provision
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
  };

  mergeEnvLocal(resolved);
  log("Wrote 5 var(s) to .env.local:");
  for (const k of Object.keys(resolved)) log(`  ✓ ${k}`);
  log("Supabase env ready. Next: `npm run db:generate && npm run db:migrate` (after Sprint 0 writes schema).");
}

main().catch((e) => die(e.message));
