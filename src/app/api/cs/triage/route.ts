import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/orders";
import { resolveRefundWithOrder, triageCsMessage } from "@/lib/csTriage";

/** 자동 CS: 메시지(+주문번호) → 표준 응답·액션 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = String(body.message ?? "");
  const orderId = String(body.orderId ?? "");

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

  return NextResponse.json({
    ok: true,
    triage,
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
