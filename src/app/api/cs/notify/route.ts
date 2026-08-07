import { NextRequest, NextResponse } from "next/server";
import { notifyWatchdog } from "@/lib/notify/telegram";

function authorized(req: NextRequest): boolean {
  const expected = process.env.OPS_CS_TOKEN?.trim();
  if (!expected) return process.env.NODE_ENV !== "production";
  const h = req.headers.get("x-ops-token") || "";
  const q = req.nextUrl.searchParams.get("token") || "";
  return h === expected || q === expected;
}

/** 운영자 수동 · 업무 텔레그램 (강제) · Hermes ✗ */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ ok: false, error: "text_required" }, { status: 400 });
  }
  const result = await notifyWatchdog(text.slice(0, 3400));
  return NextResponse.json({ ok: result.ok, result });
}
