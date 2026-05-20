#!/usr/bin/env node
/**
 * Postinstall fix for chrome-launcher's Windows temp-cleanup crash.
 *
 * chrome-launcher (bundled under `lighthouse`, used by `@lhci/cli`) kills Chrome
 * with `taskkill /F` and then immediately `rmSync`s its temp profile dir. On
 * Windows the process holds file handles a moment longer, so that rmSync throws
 * `EPERM` — which aborts the whole Lighthouse run *after* the audit already
 * completed, failing `npm run test:a11y:lighthouse`.
 *
 * We wrap that cleanup in try/catch so a harmless leftover temp dir no longer
 * fails the run. Done as a postinstall script (not patch-package, which is
 * broken on Node 25) so it survives `npm install`.
 *
 * Idempotent and non-fatal: if the line is already wrapped, or the upstream code
 * changed shape (version bump), it logs and exits 0 without breaking install.
 */
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const MARKER = "Failed to remove temp dir";

const TARGET_LINE =
  "        rmSync(this.userDataDir, { recursive: true, force: true, maxRetries: 10 });";

const REPLACEMENT = [
  "        try {",
  "            rmSync(this.userDataDir, { recursive: true, force: true, maxRetries: 10 });",
  "        }",
  "        catch (err) {",
  "            // Windows: `taskkill /F` returns before Chrome releases its file",
  "            // handles, so this immediate rmSync of the temp profile can throw",
  "            // EPERM. The audit has already completed by this point, so a leftover",
  "            // temp dir is harmless -- log and continue instead of failing the run.",
  "            log.warn('ChromeLauncher', `" + MARKER + " ${this.userDataDir}: ${err.message}`);",
  "        }",
].join("\n");

function resolveChromeLauncher() {
  // Prefer the copy lighthouse actually loads (nested), fall back to top-level.
  const searchPaths = [];
  try {
    searchPaths.push(dirname(require.resolve("lighthouse/package.json")));
  } catch {
    // lighthouse not installed in this context — fine, try top-level below.
  }
  for (const opts of [{ paths: searchPaths }, undefined]) {
    try {
      return require.resolve("chrome-launcher/dist/chrome-launcher.js", opts);
    } catch {
      // try next resolution strategy
    }
  }
  return null;
}

function main() {
  const file = resolveChromeLauncher();
  if (!file) {
    console.log("[patch-chrome-launcher] chrome-launcher not found; skipping.");
    return;
  }

  const source = readFileSync(file, "utf8");
  if (source.includes(MARKER)) {
    console.log("[patch-chrome-launcher] already patched; skipping.");
    return;
  }
  if (!source.includes(TARGET_LINE)) {
    console.log(
      `[patch-chrome-launcher] cleanup line not found in ${file} (upstream changed?); skipping.`,
    );
    return;
  }

  writeFileSync(file, source.replace(TARGET_LINE, REPLACEMENT), "utf8");
  console.log(`[patch-chrome-launcher] patched ${file}`);
}

main();
