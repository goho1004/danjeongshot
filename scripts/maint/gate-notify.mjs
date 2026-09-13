#!/usr/bin/env node
/**
 * maint:gate 정기점검 + 실패 시 텔레그램 알림.
 * GREEN → 콘솔 OK만, 텔레그램 무전송. RED → 실패 체크 이름만 전송(값 ✗).
 * flow-e2e 단독 실패는 스킵 합의 항목이라 exit 0 + 텔레그램 무전송. exit: GREEN/onlyE2e=0, RED=1.
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
if (onlyE2e) {
  // 스킵 합의 항목 단독 실패 — 스팸 방지: exit 0 + 텔레그램 무전송
  console.log(
    JSON.stringify({
      GATE: "GREEN(e2e-skip)",
      base: BASE,
      failures: r.failures,
      note: "flow-e2e만 FAIL(스킵 합의) — 알림 없이 통과 처리",
    })
  );
  process.exit(0);
}

// 실패 원인 한 줄씩 (status·code·메시지 앞부분, 토큰·vault ✗ — run-scripts에서 redact済)
const reasons = {};
for (const c of r.checks || []) {
  if (!c.ok && c.reason) reasons[c.name] = String(c.reason).slice(0, 120);
}
const failStr = r.failures
  .map((f) => (reasons[f] ? `${f}(${reasons[f]})` : f))
  .join(",");
const text = `gate RED base=${BASE} failures=${failStr}`.slice(0, 1000);
const nt = await notifyWatchdogTelegram(text);
console.log(
  JSON.stringify({
    GATE: "RED",
    base: BASE,
    failures: r.failures,
    reasons,
    notify: nt.skipped ? "skipped" : nt.ok ? "sent" : `failed:${nt.error}`,
  })
);
process.exit(1);
