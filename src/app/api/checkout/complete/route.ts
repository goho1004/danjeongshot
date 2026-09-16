import { NextRequest, NextResponse } from "next/server";
import { unsealOrder } from "@/lib/orders";
import {
  getOrderDurable,
  markPaidDurable,
  persistOrder,
} from "@/lib/orderDurable";
import { getPaymentMode } from "@/lib/toss";
import { isMaintSmokeRequest } from "@/lib/maintSmoke";

/**
 * 샌드박스 즉시 결제 완료. toss 는 /api/checkout/confirm 사용.
 * 실결제(toss) 모드에서는 무료로 paid를 부여할 수 없음 — maint smoke만 시크릿 헤더로 통과.
 */
export async function POST(req: NextRequest) {
  if (getPaymentMode() === "toss" && !isMaintSmokeRequest(req)) {
    return NextResponse.json(
      {
        error: "실결제 모드입니다. 토스 결제 승인 절차를 이용해 주세요.",
        code: "TOSS_MODE_REQUIRES_CONFIRM",
      },
      { status: 403 }
    );
  }

  const body = await req.json();
  const orderId = String(body.orderId ?? "");
  const orderTicket = String(body.orderTicket ?? body.unlockToken ?? "");

  if (!orderId) {
    return NextResponse.json({ error: "주문 ID가 없습니다." }, { status: 400 });
  }

  let base =
    (await getOrderDurable(orderId)) ||
    (orderTicket ? unsealOrder(orderTicket) ?? undefined : undefined);
  if (!base || base.id !== orderId) {
    return NextResponse.json(
      {
        error: "주문을 찾을 수 없습니다.",
        code: orderTicket ? "ORDER_NOT_FOUND" : "ORDER_TICKET_REQUIRED",
      },
      { status: 404 }
    );
  }

  await persistOrder(base);

  if (base.paid) {
    return NextResponse.json({
      ok: true,
      alreadyPaid: true,
      orderId: base.id,
      unlockToken: base.unlockToken,
      amountKrw: base.amountKrw,
      packId: base.packId,
      includeLayout: base.includeSheet,
      layoutPaidSizeIds: base.layoutPaidSizeIds,
      redoUsed: base.redoUsed,
      asvUsed: base.asvUsed,
    });
  }

  const paid = await markPaidDurable(orderId, orderTicket || base.unlockToken);
  if (!paid) {
    return NextResponse.json({ error: "결제 반영에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    orderId: paid.id,
    unlockToken: paid.unlockToken,
    amountKrw: paid.amountKrw,
    packId: paid.packId,
    includeLayout: paid.includeSheet,
    layoutPaidSizeIds: paid.layoutPaidSizeIds,
    redoUsed: paid.redoUsed,
    asvUsed: paid.asvUsed,
  });
}
