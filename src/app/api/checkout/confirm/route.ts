import { NextRequest, NextResponse } from "next/server";
import { getOrder, markPaid, unsealOrder } from "@/lib/orders";
import { confirmTossPayment, getPaymentMode } from "@/lib/toss";

/**
 * 토스 결제 승인 + 주문 paid 처리.
 * successUrl에서 paymentKey·orderId·amount와 함께 orderTicket을 보냄.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const paymentKey = String(body.paymentKey ?? "");
  const orderId = String(body.orderId ?? "");
  const amount = Number(body.amount ?? 0);
  const orderTicket = String(body.orderTicket ?? body.unlockToken ?? "");

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json(
      { error: "결제 정보가 부족합니다." },
      { status: 400 }
    );
  }

  let order = getOrder(orderId) || (orderTicket ? unsealOrder(orderTicket) : null);
  if (!order || order.id !== orderId) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  // 클라·리다이렉트 amount는 참고만 — 승인·검증은 서버 주문 금액만 신뢰
  const expectedAmount = order.amountKrw;
  if (!Number.isFinite(amount) || amount !== expectedAmount) {
    return NextResponse.json(
      { error: "결제 금액이 주문과 다릅니다. 고객센터로 문의해 주세요." },
      { status: 400 }
    );
  }

  if (order.paid) {
    return NextResponse.json({
      ok: true,
      alreadyPaid: true,
      orderId: order.id,
      unlockToken: order.unlockToken,
      amountKrw: order.amountKrw,
      packId: order.packId,
      includeLayout: order.includeSheet,
      layoutPaidSizeIds: order.layoutPaidSizeIds,
      redoUsed: order.redoUsed,
      asvUsed: order.asvUsed,
    });
  }

  if (getPaymentMode() === "toss") {
    const confirmed = await confirmTossPayment({
      paymentKey,
      orderId,
      amount: expectedAmount,
    });
    if (!confirmed.ok) {
      return NextResponse.json(
        { error: confirmed.message, code: confirmed.code },
        { status: 402 }
      );
    }
  }

  const paid = markPaid(orderId, orderTicket || order.unlockToken);
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
