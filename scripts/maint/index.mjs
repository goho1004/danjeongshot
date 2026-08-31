#!/usr/bin/env node
/**
 * 단정샷 유지보수 CLI (모듈화)
 *   node scripts/maint/index.mjs <command> [--base URL]
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { runHealth } from "./checks/health.mjs";
import { runDownloadLoop, runSmoke, runFlowE2e } from "./checks/run-scripts.mjs";
import { runWatermark } from "./checks/watermark.mjs";
import { runSafariMultipart } from "./checks/safari-multipart.mjs";
import { runDebugArtifacts } from "./checks/debug-artifacts.mjs";
import { runGate } from "./gate.mjs";
import { createPaidSession } from "./checks/prepPaid.mjs";
import { runPaymentIntegrity } from "./checks/payment-integrity.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const args = process.argv.slice(2);

function loadEnvLocal() {
  const local = join(root, "..", ".env.local");
  if (!existsSync(local)) return;
  for (const line of readFileSync(local, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || line.startsWith("#")) continue;
    const val = m[2].trim();
    if (val && process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}
loadEnvLocal();

const cmd = args[0] || "help";
const baseIdx = args.indexOf("--base");
const BASE =
  (baseIdx >= 0 && args[baseIdx + 1]) ||
  process.env.SMOKE_BASE ||
  "https://danjeongshot.vercel.app";

function envCheck() {
  const local = join(root, "..", ".env.local");
  const important = [
    "GEMINI_API_KEY",
    "MOCK_GENERATE",
    "PAYMENT_MODE",
    "NEXT_PUBLIC_SITE_URL",
    "PREVIEW_QUOTA_SECRET",
  ];
  const present = new Set();
  if (existsSync(local)) {
    for (const line of readFileSync(local, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=/);
      if (m && line.slice(m[0].length).trim()) present.add(m[1]);
    }
  }
  console.log(
    JSON.stringify(
      {
        note: "Vercel env는 대시보드에서 별도 확인",
        localFile: existsSync(local),
        report: important.map((k) => ({ key: k, local: present.has(k) ? "SET" : "MISSING" })),
      },
      null,
      2
    )
  );
  return 0;
}

function help() {
  console.log(`단정샷 maint (modular)

Usage:
  node scripts/maint/index.mjs <command> [--base URL]

Commands:
  health            페이지·다운로드 가드
  smoke             generate→pay→download
  download-loop     다운로드 API GREEN
  watermark         미리보기 워터마크 검증
  safari-multipart  iOS multipart 다운로드
  flow-e2e          Playwright UI 시퀀스
  gate              health+payment-integrity+download+watermark+safari+e2e
  payment-integrity 결제 토큰·stale 세션 시뮬레이션
  loop              gate (exit 1 on fail)
  env-check         로컬 .env
  check-debug       디버그 계측 잔여
  help

Env: SMOKE_BASE (default ${BASE})
Docs: docs/MAINTENANCE.md
`);
  return 0;
}

const map = {
  health: async () => {
    const r = await runHealth(BASE);
    console.log(JSON.stringify({ ...r, HEALTH: r.ok ? "GREEN" : "RED" }, null, 2));
    return r.ok ? 0 : 1;
  },
  smoke: () => {
    const r = runSmoke(BASE);
    console.log(JSON.stringify(r, null, 2));
    return r.ok ? 0 : 1;
  },
  "download-loop": () => {
    const r = runDownloadLoop(BASE);
    console.log(r.output || JSON.stringify(r));
    return r.ok ? 0 : 1;
  },
  watermark: async () => {
    const session = await createPaidSession(BASE);
    const r = await runWatermark(BASE, session);
    console.log(JSON.stringify(r, null, 2));
    return r.ok ? 0 : 1;
  },
  "safari-multipart": async () => {
    const session = await createPaidSession(BASE);
    const r = await runSafariMultipart(BASE, session);
    console.log(JSON.stringify(r, null, 2));
    return r.ok ? 0 : 1;
  },
  "flow-e2e": () => {
    const r = runFlowE2e(BASE);
    console.log(r.output || JSON.stringify(r));
    return r.ok ? 0 : 1;
  },
  "payment-integrity": async () => {
    const r = await runPaymentIntegrity(BASE);
    console.log(JSON.stringify(r, null, 2));
    return r.ok ? 0 : 1;
  },
  gate: async () => {
    const r = await runGate(BASE);
    console.log(JSON.stringify(r, null, 2));
    return r.GREEN ? 0 : 1;
  },
  loop: async () => {
    const r = await runGate(BASE);
    console.log(JSON.stringify(r, null, 2));
    if (!r.GREEN) {
      console.error("FAILURES:", r.failures.join(", "));
      return 1;
    }
    console.log("GATE GREEN");
    return 0;
  },
  "env-check": () => envCheck(),
  "check-debug": () => {
    const r = runDebugArtifacts();
    console.log(JSON.stringify(r, null, 2));
    return r.ok ? 0 : 1;
  },
  help: () => help(),
};

const fn = map[cmd] || help;
Promise.resolve(fn())
  .then((code) => process.exit(typeof code === "number" ? code : 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
