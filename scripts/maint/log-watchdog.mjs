#!/usr/bin/env node
/**
 * Log Watchdog Bot — 단정 generate-log / analytics 기반 경보.
 * 과금 배수·버스트·PAUSE 이상 → 콘솔 + (선택) Telegram.
 *
 * Usage:
 *   node scripts/maint/log-watchdog.mjs
 *   node scripts/maint/log-watchdog.mjs --notify
 *   npm run watchdog:logs -- --notify
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { notifyWatchdogTelegram } from "../lib/telegram-notify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const STATE = path.join(ROOT, "docs/evidence/watchdog/log-watchdog-state.json");
const BASE = process.env.DJS_BASE || "https://danjeongshot.vercel.app";

function loadEnvLocal() {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const k = m[1];
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE, "utf8"));
  } catch {
    return { lastAlertKeys: {}, lastRun: null };
  }
}

function writeState(s) {
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(s, null, 2), "utf8");
}

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(35000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function analyze(entries) {
  const alerts = [];
  const n = entries.length;
  if (!n) {
    return { alerts, summary: { n: 0 }, metrics: {} };
  }
  let gemini = 0;
  let okN = 0;
  let multi3 = 0;
  let pauseN = 0;
  const byHour = {};
  const byCode = {};
  for (const e of entries) {
    const g = Number(e.geminiCalls || 0);
    gemini += g;
    if (e.ok) okN += 1;
    if (g >= 3) multi3 += 1;
    if (e.code === "STUDIO_PAUSE") pauseN += 1;
    if (e.code) byCode[e.code] = (byCode[e.code] || 0) + 1;
    const h =
      e.hourKst != null
        ? String(e.hourKst)
        : e.ts
          ? String(new Date(e.ts).getUTCHours())
          : "?";
    byHour[h] = (byHour[h] || 0) + 1;
  }
  const avg = gemini / n;
  const metrics = {
    n,
    gemini,
    avg: Math.round(avg * 100) / 100,
    okRate: Math.round((okN / n) * 1000) / 10,
    multi3,
    pauseN,
    byCode,
    byHour,
  };

  // 의도: SHOT=1 이후 avg≈1. pause만 있는 구간은 gemini=0이라 avg 낮음.
  if (avg >= 2.2 && multi3 >= 3) {
    alerts.push({
      key: "gemini_multiplier",
      level: "HIGH",
      msg: `과금 배수 의 avg×${metrics.avg} · geminiCalls≥3 행 ${multi3}/${n}`,
    });
  } else if (avg >= 1.5 && multi3 >= 2) {
    alerts.push({
      key: "gemini_multiplier",
      level: "MED",
      msg: `과금 배수 주의 avg×${metrics.avg} · ≥3컷 ${multi3}건`,
    });
  }

  const topHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];
  if (topHour && topHour[1] >= 12 && n >= 20) {
    alerts.push({
      key: `burst_h${topHour[0]}`,
      level: "MED",
      msg: `시간대 버스트 KST ${topHour[0]}시 ${topHour[1]}건 / ${n}`,
    });
  }

  // pause가 대부분이면 emergency ON으로 해석 — 경보 ✗ (정보만)
  const pauseRatio = pauseN / n;
  if (pauseRatio >= 0.8 && n >= 5) {
    alerts.push({
      key: "studio_pause_majority",
      level: "INFO",
      msg: `STUDIO_PAUSE ${pauseN}/${n} — 비상정지 유지로 보임`,
    });
  }

  return { alerts, metrics };
}

async function main() {
  loadEnvLocal();
  const notify = process.argv.includes("--notify");
  const secret = process.env.MAINT_SMOKE_SECRET?.trim();
  if (!secret) {
    console.log(JSON.stringify({ ok: false, error: "MAINT_SMOKE_SECRET missing" }));
    process.exit(1);
  }

  const { ok, status, body } = await fetchJson(
    `${BASE}/api/ops/generate-log?limit=120`,
    { "x-djs-maint-smoke": secret }
  );
  if (!ok) {
    console.log(JSON.stringify({ ok: false, status, error: body?.error || "fetch_fail" }));
    process.exit(1);
  }

  const entries = Array.isArray(body.entries) ? body.entries : [];
  const { alerts, metrics } = analyze(entries);
  const state = readState();
  const now = Date.now();
  const cooldownMs = Number(process.env.LOG_WATCHDOG_COOLDOWN_MS || 2 * 60 * 60 * 1000);

  const actionable = alerts.filter((a) => a.level === "HIGH" || a.level === "MED");
  const toSend = [];
  for (const a of actionable) {
    const last = state.lastAlertKeys?.[a.key] || 0;
    if (now - last < cooldownMs) continue;
    toSend.push(a);
  }

  let tg = { skipped: true, reason: "no_actionable_or_no_notify" };
  if (notify && toSend.length) {
    const text = [
      "로그 워치독",
      ...toSend.map((a) => `· [${a.level}] ${a.msg}`),
      `· n=${metrics.n} avg×${metrics.avg} pause=${metrics.pauseN}`,
      BASE,
    ].join("\n");
    tg = await notifyWatchdogTelegram(text);
    if (tg.ok && !tg.skipped) {
      for (const a of toSend) state.lastAlertKeys[a.key] = now;
    }
  }

  state.lastRun = new Date().toISOString();
  state.lastMetrics = metrics;
  state.lastAlerts = alerts;
  writeState(state);

  const report = {
    ok: true,
    GREEN: actionable.length === 0,
    metrics,
    alerts,
    notify: { requested: notify, sent: toSend.map((a) => a.key), tg },
    sums: body.sums || null,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(actionable.some((a) => a.level === "HIGH") ? 2 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
