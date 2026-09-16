import { NextRequest, NextResponse } from "next/server";
import {
  listBillLogs,
  summarizeBillAbuse,
} from "@/lib/geminiBillGate";
import { isMaintSmokeRequest } from "@/lib/maintSmoke";

export const runtime = "nodejs";

/**
 * GET /api/ops/bill-log?limit=100&windowMin=60
 * 헤더: x-djs-maint-smoke = MAINT_SMOKE_SECRET
 *
 * 과금 게이트 영속 로그 + 어뷰징/호출관리 요약.
 */
export async function GET(req: NextRequest) {
  if (!isMaintSmokeRequest(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "100");
  const windowMin = Number(req.nextUrl.searchParams.get("windowMin") ?? "60");
  const data = await listBillLogs(limit);
  const abuse = summarizeBillAbuse(data.entries, windowMin);
  return NextResponse.json({
    ...data,
    abuse,
    note:
      "billed=true 만 실과금 HTTP. route_pause/budget/inflight 는 호출관리·어뷰징 판단용.",
  });
}
