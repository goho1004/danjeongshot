#!/usr/bin/env node

import { spawnSync } from "child_process";

import { join, dirname } from "path";

import { fileURLToPath } from "url";



const __dir = dirname(fileURLToPath(import.meta.url));

const root = join(__dir, "..", "..");



export function runDownloadLoop(base, sessionJson) {

  const r = spawnSync(process.execPath, [join(root, "download-loop.mjs")], {

    cwd: root,

    env: {

      ...process.env,

      SMOKE_BASE: base,

      ...(sessionJson ? { SMOKE_SESSION: sessionJson } : {}),

    },

    encoding: "utf8",

  });

  const out = (r.stdout || "") + (r.stderr || "");

  const green = out.includes('"GREEN":true') || out.includes('"GREEN": true');

  return { name: "download-loop", ok: green && r.status === 0, output: out.trim().slice(-500) };

}



export function runSmoke(base) {

  const r = spawnSync(process.execPath, [join(root, "smoke-flow.mjs")], {

    cwd: root,

    env: { ...process.env, SMOKE_BASE: base },

    encoding: "utf8",

  });

  const ok = r.status === 0 && (r.stdout || "").includes("SMOKE_PASS");

  return { name: "smoke", ok, output: ((r.stdout || "") + (r.stderr || "")).trim().slice(-400) };

}



export function runFlowE2e(base, sessionJson) {

  const r = spawnSync(process.execPath, [join(root, "e2e-download-ui.mjs")], {

    cwd: root,

    env: {

      ...process.env,

      SMOKE_BASE: base,

      ...(sessionJson ? { SMOKE_SESSION: sessionJson } : {}),

    },

    encoding: "utf8",

  });

  const out = (r.stdout || "") + (r.stderr || "");

  const ok = r.status === 0 && out.includes("E2E_PASS");

  return { name: "flow-e2e", ok, output: out.trim().slice(-600) };

}


