#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..", "..", "..");

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(p, acc);
    } else if (/\.(ts|tsx|js|mjs)$/.test(name)) acc.push(p);
  }
  return acc;
}

export function runDebugArtifacts() {
  const needles = ["djsDebug", "debug-log", "0acea6", "#region agent log"];
  const hits = [];
  for (const file of walk(join(root, "src"))) {
    const text = readFileSync(file, "utf8");
    for (const n of needles) {
      if (text.includes(n)) {
        hits.push({ file: file.replace(root + "\\", "").replace(root + "/", ""), needle: n });
        break;
      }
    }
  }
  return { name: "debug-artifacts", ok: hits.length === 0, hits, count: hits.length };
}
