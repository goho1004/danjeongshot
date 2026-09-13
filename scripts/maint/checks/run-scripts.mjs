#!/usr/bin/env node

import { spawnSync } from "child_process";

import { join, dirname } from "path";

import { fileURLToPath } from "url";

import { mkdtempSync, rmSync, writeFileSync } from "fs";

import { tmpdir } from "os";



const __dir = dirname(fileURLToPath(import.meta.url));

const root = join(__dir, "..", "..");



/**
 * 세션 전달은 temp 파일로 (Linux execve 단일 env 128KB 제한 회피).
 * SMOKE_SESSION env 직접 전달 금지 — CI에서 E2BIG으로 자식 프로세스 미실행.
 */
function spawnWithSession(script, base, sessionJson) {
  let dir = null;
  const env = { ...process.env, SMOKE_BASE: base };
  // 세션에 큰 base64(vault·dataURL, 수MB)가 들어있어 env 전달 불가
  delete env.SMOKE_SESSION;
  delete env.SMOKE_SESSION_FILE;
  if (sessionJson) {
    dir = mkdtempSync(join(tmpdir(), "djs-session-"));
    const fp = join(dir, "session.json");
    writeFileSync(fp, sessionJson, "utf8");
    env.SMOKE_SESSION_FILE = fp;
  }
  try {
    return spawnSync(process.execPath, [join(root, script)], {
      cwd: root,
      env,
      encoding: "utf8",
    });
  } finally {
    if (dir) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
}

/** 실패 원인 한 줄 (status·code·메시지 앞 120자, 토큰·vault ✗) */
function shortReason(out) {
  const m = String(out || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" | ")
    .replace(/[A-Za-z0-9+/=]{200,}/g, "[blob]")
    .slice(0, 120);
  return m || "no output";
}

export function runDownloadLoop(base, sessionJson) {

  const r = spawnWithSession("download-loop.mjs", base, sessionJson);

  const out = (r.stdout || "") + (r.stderr || "");

  const green = out.includes('"GREEN":true') || out.includes('"GREEN": true');

  const ok = green && r.status === 0;

  return {
    name: "download-loop",
    ok,
    output: out.trim().slice(-500),
    ...(ok ? {} : { reason: shortReason(out) || (r.error ? String(r.error.message || r.error).slice(0, 120) : "spawn failed") }),
  };

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

  const r = spawnWithSession("e2e-download-ui.mjs", base, sessionJson);

  const out = (r.stdout || "") + (r.stderr || "");

  const ok = r.status === 0 && out.includes("E2E_PASS");

  return {
    name: "flow-e2e",
    ok,
    output: out.trim().slice(-600),
    ...(ok ? {} : { reason: shortReason(out) }),
  };

}


