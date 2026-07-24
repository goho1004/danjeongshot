import { NextRequest, NextResponse } from "next/server";
import { markPaid, unsealOrder } from "@/lib/orders";

/** Sandbox: marks order paid. orderTicket으로 인스턴스 간 복원. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const orderId = String(body.orderId ?? "");
  const orderTicket = String(body.orderTicket ?? body.unlockToken ?? "");

  const paid = markPaid(orderId, orderTicket || undefined);
  if (!paid) {
    // 티켓만으로도 시도
    const fromTicket = orderTicket ? unsealOrder(orderTicket) : null;
    if (fromTicket && fromTicket.id === orderId) {
      const again = markPaid(orderId, orderTicket);
      if (!again) {
        return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        orderId: again.id,
        unlockToken: again.unlockToken,
        amountKrw: again.amountKrw,
        packId: again.packId,
        includeLayout: again.includeSheet,
        layoutPaidSizeIds: again.layoutPaidSizeIds,
        redoUsed: again.redoUsed,
        asvUsed: again.asvUsed,
      });
    }
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
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
