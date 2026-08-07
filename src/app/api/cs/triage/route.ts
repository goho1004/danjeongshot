import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/orders";
import { resolveRefundWithOrder, triageCsMessage } from "@/lib/csTriage";
import { notifyWatchdog } from "@/lib/notify/telegram";

/** 자동 CS: 메시지 → 표준 응답 · 환불·urgent만 텔레그램(업무) */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = String(body.message ?? "");
  const orderId = String(body.orderId ?? "");
  const sendNotify = body.notify !== false;

  let triage = triageCsMessage(message);
  const order = orderId ? getOrder(orderId) : null;
  if (order) {
    triage = resolveRefundWithOrder(triage, {
      paid: order.paid,
      downloadedAt: order.downloadedAt,
      redoUsed: order.redoUsed,
      asvUsed: order.asvUsed,
    });
  }

  let notify: Awaited<ReturnType<typeof notifyWatchdog>> | null = null;
  if (sendNotify && triage.notifyWatchdog) {
    const snippet = message.replace(/\s+/g, " ").trim().slice(0, 160);
    notify = await notifyWatchdog(
      `CS ${triage.intent} · ${triage.agentNote.slice(0, 80)} · ${snippet}`
    );
  }

  return NextResponse.json({
    ok: true,
    triage,
    notify,
    order: order
      ? {
          id: order.id,
          paid: order.paid,
          downloaded: !!order.downloadedAt,
          redoUsed: order.redoUsed,
          asvUsed: order.asvUsed,
        }
      : null,
  });
}
