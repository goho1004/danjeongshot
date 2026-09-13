#!/usr/bin/env node
/**
 * maint:gate 정기점검 + 실패 시 텔레그램 알림.
 * GREEN → 콘솔 OK만, 텔레그램 무전송. RED → 실패 체크 이름만 전송(값 ✗).
 * flow-e2e 단독 실패는 스킵 합의 항목이라 경고 톤 낮춤. exit: GREEN=0, RED=1.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { runGate } from "./gate.mjs";
import { notifyWatchdogTelegram } from "../lib/telegram-notify.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..", "..");

// .env.local 로드 (scripts/maint/index.mjs와 동일 — 값 출력 ✗)
const local = join(root, ".env.local");
if (existsSync(local)) {
  for (const line of readFileSync(local, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || line.startsWith("#")) continue;
    const val = m[2].trim();
    if (val && process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE =
  (baseIdx >= 0 && args[baseIdx + 1]) ||
  process.env.SMOKE_BASE ||
  "https://danjeongshot.vercel.app";

const r = await runGate(BASE);
if (r.GREEN) {
  console.log(JSON.stringify({ GATE: "GREEN", base: BASE }));
  process.exit(0);
}

const onlyE2e = r.failures.length === 1 && r.failures[0] === "flow-e2e";
const head = onlyE2e
  ? "gate 주의: flow-e2e만 FAIL(스킵 합의 항목)"
  : "gate RED";
const text = `${head} base=${BASE} failures=${r.failures.join(",")}`;
const nt = await notifyWatchdogTelegram(text);
console.log(
  JSON.stringify({
    GATE: "RED",
    base: BASE,
    failures: r.failures,
    onlyE2e,
    notify: nt.skipped ? "skipped" : nt.ok ? "sent" : `failed:${nt.error}`,
  })
);
process.exit(1);
