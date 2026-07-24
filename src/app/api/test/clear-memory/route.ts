import { NextResponse } from "next/server";
import { clearRuntimeMaps, runtimeStoreSize } from "@/lib/runtimeStore";

/**
 * MOCK 전용 — 인메모리 orders/assets 클리어 (서버리스 인스턴스 전환 시뮬).
 * MOCK_GENERATE≠1 이면 404.
 */
export async function POST() {
  if (process.env.MOCK_GENERATE !== "1") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const before = runtimeStoreSize();
  const cleared = clearRuntimeMaps();
  return NextResponse.json({
    ok: true,
    before,
    cleared,
    after: runtimeStoreSize(),
  });
}
