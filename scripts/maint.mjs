#!/usr/bin/env node
/**
 * 단정샷 유지보수 CLI
 *   node scripts/maint.mjs <command> [--base URL]
 *
 * commands: health | smoke | download-loop | env-check | check-debug | help
 */
import { spawnSync } from "child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const args = process.argv.slice(2);
const cmd = args[0] || "help";
const baseIdx = args.indexOf("--base");
const BASE =
  (baseIdx >= 0 && args[baseIdx + 1]) ||
  process.env.SMOKE_BASE ||
  "https://danjeongshot.vercel.app";

function runNode(script) {
  const r = spawnSync(process.execPath, [join(__dir, script)], {
    cwd: root,
    env: { ...process.env, SMOKE_BASE: BASE },
    encoding: "utf8",
    shell: false,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status ?? 1;
}

async function health() {
  const paths = ["/", "/make", "/gallery", "/help"];
  const out = [];
  for (const p of paths) {
    try {
      const res = await fetch(`${BASE}${p}`, { redirect: "follow" });
      out.push({ path: p, status: res.status, ok: res.status >= 200 && res.status < 400 });
    } catch (e) {
      out.push({ path: p, status: 0, ok: false, error: String(e.message || e) });
    }
  }
  // download must reject without auth
  let dl = { status: 0, ok: false };
  try {
    const res = await fetch(`${BASE}/api/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: "x", unlockToken: "y" }),
    });
    dl = { status: res.status, ok: res.status === 403 || res.status === 400 };
  } catch (e) {
    dl = { status: 0, ok: false, error: String(e.message || e) };
  }
  const allOk = out.every((x) => x.ok) && dl.ok;
  console.log(
    JSON.stringify(
      { base: BASE, pages: out, downloadUnauth: dl, HEALTH: allOk ? "GREEN" : "RED" },
      null,
      2
    )
  );
  return allOk ? 0 : 1;
}

function envCheck() {
  const example = join(root, ".env.example");
  const local = join(root, ".env.local");
  const keys = [];
  if (existsSync(example)) {
    for (const line of readFileSync(example, "utf8").split(/\r?\n/)) {
      const m = line.match(/^#?\s*([A-Z0-9_]+)=/);
      if (m) keys.push(m[1]);
    }
  }
  const present = new Set();
  if (existsSync(local)) {
    for (const line of readFileSync(local, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=/);
      if (m && line.slice(m[0].length).trim()) present.add(m[1]);
    }
  }
  const important = [
    "GEMINI_API_KEY",
    "MOCK_GENERATE",
    "PAYMENT_MODE",
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_TOSS_CLIENT_KEY",
    "TOSS_SECRET_KEY",
    "PREVIEW_QUOTA_SECRET",
    "NEXT_PUBLIC_BIZ_NO",
  ];
  const report = important.map((k) => ({
    key: k,
    local: present.has(k) ? "SET" : "MISSING",
  }));
  console.log(
    JSON.stringify(
      {
        note: "Vercel env는 대시보드에서 별도 확인",
        localFile: existsSync(local),
        report,
      },
      null,
      2
    )
  );
  return 0;
}

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

function checkDebug() {
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
  console.log(
    JSON.stringify(
      {
        debugArtifacts: hits.length,
        hits,
        advice:
          hits.length === 0
            ? "디버그 계측 없음"
            : "안정화 확인 후 djsDebug·/api/debug-log·agent log 영역 제거",
      },
      null,
      2
    )
  );
  return 0;
}

function help() {
  console.log(`단정샷 maint

Usage:
  node scripts/maint.mjs <command> [--base URL]

Commands:
  health           페이지·다운로드 가드 헬스
  smoke            generate→pay→download 스모크
  download-loop    다운로드/결제 루프 (GREEN 필수)
  env-check        로컬 .env.local 주요 키
  check-debug      디버그 계측 잔여 검색
  help             이 도움말

Env:
  SMOKE_BASE       기본 ${BASE}

Docs:
  docs/MAINTENANCE.md
`);
  return 0;
}

const map = {
  health: () => health(),
  smoke: () => runNode("smoke-flow.mjs"),
  "download-loop": () => runNode("download-loop.mjs"),
  "env-check": () => envCheck(),
  "check-debug": () => checkDebug(),
  help: () => help(),
};

const fn = map[cmd] || help;
Promise.resolve(fn())
  .then((code) => process.exit(typeof code === "number" ? code : 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
