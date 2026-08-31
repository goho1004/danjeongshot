import type { NextRequest } from "next/server";

/** maint gate·무결성 검사 — PG 검증·rate limit 생략 (MAINT_SMOKE_SECRET 필요) */
export function isMaintSmokeRequest(req: NextRequest): boolean {
  const expected = process.env.MAINT_SMOKE_SECRET?.trim();
  if (!expected) return false;
  return req.headers.get("x-djs-maint-smoke") === expected;
}
