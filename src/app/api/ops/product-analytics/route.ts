import { NextRequest, NextResponse } from "next/server";
import {
  listGenerateLogs,
  probeGenLogStore,
  genLogProbeErr,
  summarizeGenerateLogs,
} from "@/lib/generateCallLog";
import {
  listProductEvents,
  summarizeProductEvents,
  PRODUCT_ID,
} from "@/lib/productEventLog";
import { isMaintSmokeRequest } from "@/lib/maintSmoke";

export const runtime = "nodejs";

/**
 * GET /api/ops/product-analytics?limit=200
 * 헤더: x-djs-maint-smoke = MAINT_SMOKE_SECRET
 * 제품개선용 요약 (PII ✗)
 */
export async function GET(req: NextRequest) {
  if (!isMaintSmokeRequest(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "200");
  const [gen, events, storeOk] = await Promise.all([
    listGenerateLogs(limit),
    listProductEvents(limit),
    probeGenLogStore(),
  ]);

  return NextResponse.json({
    product: PRODUCT_ID,
    storeOk,
    storeErr: storeOk ? null : genLogProbeErr(),
    generate: {
      mode: gen.mode,
      max: gen.max,
      ttlDays: gen.ttlDays,
      analytics: summarizeGenerateLogs(gen.entries),
    },
    funnel: {
      mode: events.mode,
      max: events.max,
      ttlDays: events.ttlDays,
      analytics: summarizeProductEvents(events.entries),
    },
    note:
      "분석용. prompt/image/IP/UA전문/token ✗. hourKst·purpose·배수·퍼널만.",
  });
}
