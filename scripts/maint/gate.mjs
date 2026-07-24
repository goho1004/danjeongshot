#!/usr/bin/env node

import { runHealth } from "./checks/health.mjs";

import { runDownloadLoop, runSmoke, runFlowE2e } from "./checks/run-scripts.mjs";

import { runWatermark } from "./checks/watermark.mjs";

import { runSafariMultipart } from "./checks/safari-multipart.mjs";

import { runDebugArtifacts } from "./checks/debug-artifacts.mjs";

import { createPaidSession } from "./checks/prepPaid.mjs";



export async function runGate(base, { includeDebug = false } = {}) {

  let session;

  let prepCheck;

  try {

    session = await createPaidSession(base);

    prepCheck = { name: "prep-session", ok: true };

  } catch (e) {

    prepCheck = {

      name: "prep-session",

      ok: false,

      error: e instanceof Error ? e.message : String(e),

    };

    const checks = [prepCheck];

    return {

      GREEN: false,

      base,

      failures: ["prep-session"],

      checks,

    };

  }



  const sessionJson = JSON.stringify(session);

  const checks = [

    prepCheck,

    await runHealth(base),

    runDownloadLoop(base, sessionJson),

    await runWatermark(base, session),

    await runSafariMultipart(base, session),

    runFlowE2e(base, sessionJson),

  ];

  if (includeDebug) checks.push(runDebugArtifacts());

  const failures = checks.filter((c) => !c.ok).map((c) => c.name);

  return {

    GREEN: failures.length === 0,

    base,

    failures,

    checks,

  };

}


