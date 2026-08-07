#!/usr/bin/env node
/**
 * C-Day countdown + checklist reminder for 단정샷 formal launch.
 * Usage:
 *   node scripts/watchdog-cday.mjs
 *   node scripts/watchdog-cday.mjs --gate
 *   node scripts/watchdog-cday.mjs --json
 *   node scripts/watchdog-cday.mjs --notify
 *   node scripts/watchdog-cday.mjs --gate --notify
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { notifyWatchdogTelegram } from "./lib/telegram-notify.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  const local = join(root, ".env.local");
  if (!existsSync(local)) return;
  for (const line of readFileSync(local, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    if (val && process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}
loadEnvLocal();

/** Formal launch (실PG) — lock in docs/LAUNCH_DDAY.md */
const C_DAY = "2026-09-01";
const SITE = "https://danjeongshot.vercel.app";

const WEEKS = [
  {
    id: "W0",
    start: "2026-08-05",
    end: "2026-08-10",
    theme: "B 개선 수집 · 사업자 신청 착수",
    must: ["개선 백로그 1장", "사업자 신청 접수"],
  },
  {
    id: "W1",
    start: "2026-08-11",
    end: "2026-08-17",
    theme: "사업자 진행 · 통판 준비",
    must: ["사업자등록증 또는 접수번호", "통판 서류 체크"],
  },
  {
    id: "W2",
    start: "2026-08-18",
    end: "2026-08-24",
    theme: "토스 라이브 계약 · env 초안(스위치 ✗)",
    must: ["토스 라이브 키 확보", "Vercel env 초안 메모"],
  },
  {
    id: "W3",
    start: "2026-08-25",
    end: "2026-08-31",
    theme: "C-1 리허설",
    must: ["푸터 실값 스테이징", "maint:gate GREEN", "라이브 전환 런북"],
  },
  {
    id: "C",
    start: "2026-09-01",
    end: "2026-09-01",
    theme: "Go live",
    must: ["PAYMENT_MODE=toss", "실결제 1건 E2E", "공지"],
  },
];

const C_CHECKLIST = [
  "C1 사업자 등록",
  "C2 통신판매업 신고",
  "C3 BIZ_* 확정 문자열",
  "C4 CS 메일/전화 수신",
  "C5 환불 문구 정합",
  "C6 토스 라이브 계약",
  "C7 라이브 키 Vercel",
  "C8 PAYMENT_MODE=toss",
  "C9 confirm API 라이브 검증",
  "C10 실결제 1건 E2E",
  "C11 실패·취소 경로",
  "C12 수수료·마진 메모",
  "C13 푸터 사업자·통판 노출",
  "C14 베타 고지 정리",
  "C15 MOCK_GENERATE=0 · abuse",
  "C16 PREVIEW_QUOTA_SECRET 동일",
  "C17 legal 3종 검수",
  "C18 금지어·웹 CTA",
  "C19 maint:gate GREEN",
  "C20 (선택) 커스텀 도메인",
];

function parseYMD(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function todayYMD(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(a, b) {
  const ms = parseYMD(b) - parseYMD(a);
  return Math.round(ms / 86400000);
}

function currentWeek(today) {
  for (const w of WEEKS) {
    if (today >= w.start && today <= w.end) return w;
  }
  if (today < WEEKS[0].start) return WEEKS[0];
  return WEEKS[WEEKS.length - 1];
}

async function main() {
  const args = process.argv.slice(2);
  const wantGate = args.includes("--gate");
  const asJson = args.includes("--json");
  const wantNotify = args.includes("--notify");
  const today = todayYMD();
  const dLeft = daysBetween(today, C_DAY);
  const week = currentWeek(today);

  const report = {
    ok: true,
    today,
    cDay: C_DAY,
    daysLeft: dLeft,
    phase: dLeft > 0 ? "countdown" : dLeft === 0 ? "c-day" : "past-c-day",
    week,
    site: SITE,
    checklist: C_CHECKLIST,
    note: "B단계=개선 수집 중 · C 일정은 서류 병목이 아니면 밀지 않음",
  };

  if (wantGate) {
    const r = spawnSync(
      process.execPath,
      [join(root, "scripts/maint/index.mjs"), "gate", "--base", SITE],
      { encoding: "utf8", cwd: root },
    );
    let gate = { exit: r.status, green: r.status === 0 };
    try {
      const parsed = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
      gate = { ...gate, GREEN: !!parsed.GREEN, failures: parsed.failures || [] };
    } catch {
      gate.rawTail = (r.stdout || "").slice(-800);
    }
    report.gate = gate;
    report.ok = gate.green || gate.GREEN === true;
  }

  if (wantNotify) {
    const gatePart = report.gate
      ? report.gate.GREEN || report.gate.green
        ? "gate GREEN"
        : "gate FAIL"
      : "gate n/a";
    const smsText = `C-Day ${C_DAY} D${dLeft >= 0 ? "-" + dLeft : "+" + Math.abs(dLeft)} · ${week.id} ${week.theme} · ${gatePart}`;
    report.notify = await notifyWatchdogTelegram(smsText);
    if (!asJson) {
      const n = report.notify;
      console.log(
        n.skipped
          ? `TG 건너뜀: ${n.reason}`
          : n.ok
            ? "TG 업무 전송"
            : `TG 실패: ${n.error}`,
      );
    }
  }

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("");
    console.log("══ 단정샷 C-Day 와치독 ══");
    console.log(`오늘 ${today} · C-Day ${C_DAY} · D${dLeft >= 0 ? "-" + dLeft : "+" + Math.abs(dLeft)}`);
    console.log(`주간 ${week.id} · ${week.theme}`);
    console.log("이번 주 필수:");
    for (const m of week.must) console.log(`  · ${m}`);
    console.log("");
    console.log("C 체크리스트 (수동 ☐):");
    for (const c of C_CHECKLIST) console.log(`  ☐ ${c}`);
    if (report.gate) {
      console.log("");
      console.log(
        report.gate.GREEN || report.gate.green
          ? "maint:gate GREEN"
          : `maint:gate FAIL · ${JSON.stringify(report.gate.failures || report.gate)}`,
      );
    }
    console.log("");
    console.log(`정본: docs/LAUNCH_DDAY.md · 당일: docs/LAUNCH_DAY_PLAYBOOK.md · ${SITE}`);
    console.log("CS: docs/CS_CHANNEL.md · 환불·urgent→TG · npm run watchdog:cday -- --notify");
    console.log("");
  }

  if (wantGate && !report.ok) process.exit(1);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
