import { NextRequest, NextResponse } from "next/server";
import {
  listGenerateLogs,
  sumGeminiCalls,
} from "@/lib/generateCallLog";
import { isMaintSmokeRequest } from "@/lib/maintSmoke";

export const runtime = "nodejs";

/**
 * GET /api/ops/generate-log?limit=100
 * 헤더: x-djs-maint-smoke = MAINT_SMOKE_SECRET
 */
export async function GET(req: NextRequest) {
  if (!isMaintSmokeRequest(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "100");
  const data = await listGenerateLogs(limit);
  const sums = sumGeminiCalls(data.entries);
  return NextResponse.json({
    ...data,
    sums,
    note:
      "geminiCalls=실제 Interactions 발사 수. preview 성공 시 보통 3. mock은 0.",
  });
}
