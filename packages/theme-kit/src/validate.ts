#!/usr/bin/env node
/**
 * CLI: validate one or more theme JSON files against the Forge theme schema.
 *
 * Usage:
 *   pnpm --filter @forge/theme-kit validate <glob>
 *   node packages/theme-kit/src/validate.ts apps/desktop/src/themes/*.json
 *
 * Exits 0 if all files are valid; exits 1 on any failure.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, extname } from "node:path";
import { validateTheme } from "./index.js";

function expandArgs(args: string[]): string[] {
  const paths: string[] = [];
  for (const arg of args) {
    try {
      const stat = statSync(arg);
      if (stat.isDirectory()) {
        readdirSync(arg)
          .filter((f) => extname(f) === ".json" && !f.startsWith("_"))
          .forEach((f) => paths.push(resolve(arg, f)));
      } else {
        paths.push(resolve(arg));
      }
    } catch {
      console.error(`[validate] cannot access: ${arg}`);
      process.exitCode = 1;
    }
  }
  return paths;
}

function validateFile(path: string): boolean {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`[fail] ${path}: JSON parse error — ${(err as Error).message}`);
    return false;
  }
  try {
    validateTheme(raw);
    console.log(`[ok]   ${path}`);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[fail] ${path}: ${msg}`);
    return false;
  }
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: validate <file|dir> [file|dir ...]");
  process.exit(1);
}

const files = expandArgs(args);

if (files.length === 0) {
  console.error("[validate] no .json files found");
  process.exit(1);
}

let allOk = true;
for (const f of files) {
  if (!validateFile(f)) allOk = false;
}

if (!allOk) process.exit(1);
