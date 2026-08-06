#!/usr/bin/env node
// Pre-commit gate: if a commit touches architecturally relevant source and
// doesn't touch the docs/ vault, ask the local `claude` CLI to judge whether
// it should have. Blocks on "yes" — override with SKIP_DOCS_CHECK=1.
import { execSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// On Windows, Node's execSync shells out via cmd.exe, whose PATH doesn't always
// include per-user install dirs (e.g. ~/.local/bin) that a Git Bash / POSIX
// shell session picks up. Extend PATH so `claude` resolves the same way here.
const home = process.env.USERPROFILE || process.env.HOME || "";
const extraPaths = [`${home}\\.local\\bin`, `${home}/.local/bin`].filter(Boolean);
const CHILD_ENV = {
  ...process.env,
  PATH: [process.env.PATH, ...extraPaths].filter(Boolean).join(process.platform === "win32" ? ";" : ":"),
};

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", env: CHILD_ENV, ...opts });
}

function warnFallback(reason, files) {
  console.warn(`[docs-check] ${reason}`);
  console.warn(
    `[docs-check] This commit touches ${files.length} file(s) under src/app, src/components, src/lib, prisma, or scripts ` +
      `without touching docs/. Check docs/Home.md and update the relevant note or docs/context/DECISION_LOG.md if this is architecturally significant.`,
  );
  console.warn("[docs-check] Override once you've checked: SKIP_DOCS_CHECK=1 git commit ...");
}

if (process.env.SKIP_DOCS_CHECK) {
  console.log("[docs-check] SKIP_DOCS_CHECK set — skipping.");
  process.exit(0);
}

const staged = sh("git diff --cached --name-only").trim().split("\n").filter(Boolean);
if (staged.length === 0) process.exit(0);

const docsTouched = staged.some((f) => f.startsWith("docs/") || f === "CLAUDE.md" || f === "AGENTS.md");
if (docsTouched) process.exit(0);

// This is a single Next.js app, not a monorepo — relevant source lives at the
// repo root under src/, prisma/, and scripts/ (not apps/*/src as in a monorepo).
const RELEVANT = [
  /^src\/app\//,
  /^src\/components\//,
  /^src\/lib\//,
  /^prisma\//,
  /^scripts\//,
];
const relevant = staged.filter((f) => RELEVANT.some((re) => re.test(f)));
if (relevant.length === 0) process.exit(0);

// Notes list: walk docs/ recursively for *.md (this vault spans many
// subfolders — context/, architecture/, backend/, frontend/, operations/,
// planning/, marketing/, compliance/ — unlike a flat per-app note layout).
function walkMarkdown(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      walkMarkdown(full, out);
    } else if (entry.endsWith(".md")) {
      out.push(full.replace(/\\/g, "/"));
    }
  }
  return out;
}

const notes = walkMarkdown("docs");

let diff;
try {
  diff = sh(`git diff --cached -- ${relevant.map((f) => JSON.stringify(f)).join(" ")}`).slice(0, 12000);
} catch (err) {
  warnFallback(`Could not read staged diff (${err.message.split("\n")[0]}).`, relevant);
  process.exit(1);
}

const prompt =
  `You are a pre-commit check for a Next.js app (Renovessa). Existing architecture docs (an Obsidian vault):\n${notes.join("\n")}\n\n` +
  `Note: several files under docs/context, docs/architecture, docs/backend, docs/frontend, and docs/planning are stale ` +
  `Phase-0 templates (they say "Planned" / "no code exists yet") and are already flagged as such in docs/context.md, ` +
  `docs/architecture.md, docs/backend.md, docs/frontend.md, and docs/planning.md — don't recommend updating those stale ` +
  `files themselves, only their index note or a genuinely current doc (docs/context/CURRENT_STATE.md, ` +
  `docs/context/SYSTEM_MAP.md, docs/context/DECISION_LOG.md, docs/context/NEXT_STEPS.md, etc.).\n\n` +
  `Staged diff (source files only, may be truncated):\n${diff}\n\n` +
  `Does this diff introduce a change significant enough that one of the current docs notes above ` +
  `should be updated to stay accurate? Ignore purely cosmetic/refactor/formatting changes. ` +
  `Reply with EXACTLY one line: "OK" if no doc update is warranted, or ` +
  `"UPDATE_NEEDED: <note path> — <reason in under 15 words>" if one is.`;

let verdict;
try {
  verdict = sh(`claude -p ${JSON.stringify(prompt)}`, { timeout: 45000 }).trim();
} catch (err) {
  warnFallback(
    `Could not run \`claude\` CLI for a smart check (${err.message.split("\n")[0]}).`,
    relevant,
  );
  process.exit(1);
}

if (verdict.toUpperCase().startsWith("UPDATE_NEEDED")) {
  console.error(`[docs-check] ${verdict}`);
  console.error("[docs-check] Update that note (or docs/context/DECISION_LOG.md) and re-stage, or override:");
  console.error("[docs-check]   SKIP_DOCS_CHECK=1 git commit ...");
  process.exit(1);
}

console.log(`[docs-check] OK — ${verdict}`);
process.exit(0);
