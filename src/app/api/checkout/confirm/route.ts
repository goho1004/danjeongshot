import { NextRequest, NextResponse } from "next/server";
import { unsealOrder, type Order } from "@/lib/orders";
import { getOrderDurable, persistOrder } from "@/lib/orderDurable";
import {
  buildConfirmDeps,
  confirmPaymentOnce,
  getPaymentStore,
  getTossGateway,
} from "@/lib/payments";
import type { ConfirmResult } from "@/lib/payments/types";

/**
 * 토스 결제 승인 + 주문 paid 처리 — HTTP 변환만 한다.
 * 멱등·경합 판단은 `@/lib/payments` 코어(claim → Toss → CAS)가 전담한다.
 *
 * successUrl에서 paymentKey·orderId·amount와 함께 orderTicket을 보냄.
 * ticket 유실 + cold 인스턴스 → ORDER_TICKET_REQUIRED / ORDER_NOT_FOUND
 * (돈은 나갔을 수 있음 → CS·환불 경로 안내)
 */

/** 재시도 가능 = 같은 요청을 다시 보내도 안전(이중 승인 없음) */
const STATUS: Record<Extract<ConfirmResult, { ok: false }>["code"], number> = {
  ORDER_NOT_FOUND: 404,
  AMOUNT_MISMATCH: 400,
  PAYMENT_IN_PROGRESS: 409,
  PAYMENT_KEY_MISMATCH: 409,
  TOSS_DECLINED: 402,
  TOSS_UNKNOWN: 503,
  TOSS_VERIFY_FAILED: 409,
  STORE_UNAVAILABLE: 503,
  POST_PAID_FAILED: 500,
};

/** 사람이 고객센터를 찾아야 하는 실패 — 화면이 CS·환불 안내를 띄운다 */
const CS_CODES = new Set([
  "PAYMENT_KEY_MISMATCH",
  "TOSS_VERIFY_FAILED",
  "POST_PAID_FAILED",
]);

function paidPayload(order: Order, alreadyPaid?: boolean) {
  return {
    ok: true,
    ...(alreadyPaid ? { alreadyPaid: true } : null),
    orderId: order.id,
    unlockToken: order.unlockToken,
    amountKrw: order.amountKrw,
    packId: order.packId,
    includeLayout: order.includeSheet,
    layoutPaidSizeIds: order.layoutPaidSizeIds,
    redoUsed: order.redoUsed,
    asvUsed: order.asvUsed,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const paymentKey = String(body.paymentKey ?? "");
  const orderId = String(body.orderId ?? "");
  const amount = Number(body.amount ?? 0);
  const orderTicket = String(body.orderTicket ?? body.unlockToken ?? "");

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json(
      { error: "결제 정보가 부족합니다.", code: "PAY_INFO_MISSING" },
      { status: 400 }
    );
  }

  const order =
    (await getOrderDurable(orderId)) ||
    (orderTicket ? unsealOrder(orderTicket) : null);

  if (!order || order.id !== orderId) {
    if (!orderTicket) {
      return NextResponse.json(
        {
          error:
            "결제 세션을 찾을 수 없습니다. 같은 브라우저에서 다시 열어 주세요. 결제가 완료됐다면 고객센터로 문의해 주세요.",
          code: "ORDER_TICKET_REQUIRED",
          csHint: true,
          refundHint: true,
        },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        error:
          "주문을 찾을 수 없습니다. 결제가 완료됐다면 주문번호와 함께 고객센터로 문의해 주세요.",
        code: "ORDER_NOT_FOUND",
        orderId,
        csHint: true,
        refundHint: true,
      },
      { status: 404 }
    );
  }

  // ticket으로만 복원된 경우 Upstash에 올려 다음 요청 대비
  await persistOrder(order);

  // fail-closed: 저장소·게이트웨이가 없으면 승인하지 않는다 (prod 에서 메모리·sandbox ✗)
  const store = getPaymentStore();
  const toss = getTossGateway();

  if (order.paid) {
    // orderId만으로는 남의 결제완료 주문의 unlockToken을 채굴할 수 있음 — 소지 증명 필수.
    if (!orderTicket || unsealOrder(orderTicket)?.id !== orderId) {
      return NextResponse.json(
        {
          error: "주문 확인 정보가 없습니다. 결제 완료 화면에서 다시 시도해 주세요.",
          code: "TICKET_REQUIRED",
        },
        { status: 403 }
      );
    }
    // 이 주문을 결제한 키가 따로 기록돼 있는데 다른 키로 들어오면 「이미 됐다」고 하지 않는다 —
    // 같은 주문에 결제가 두 번 일어났다는 뜻이라 사람이 봐야 한다.
    // 기록이 없으면(구주문·샌드박스 complete) 예전처럼 그대로 돌려준다.
    const known = await store?.get(orderId).catch(() => null);
    if (known && known.status === "paid" && known.paymentKey !== paymentKey) {
      return NextResponse.json(
        {
          error: "이 주문에는 다른 결제가 이미 완료됐습니다. 고객센터로 문의해 주세요.",
          code: "PAYMENT_KEY_MISMATCH",
          orderId,
          csHint: true,
          refundHint: true,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(paidPayload(order, true));
  }

  if (!store || !toss) {
    return NextResponse.json(
      {
        error: "결제 승인 준비가 되지 않았습니다. 잠시 후 다시 시도해 주세요.",
        code: store ? "PAYMENT_MODE_UNAVAILABLE" : "PAYMENT_STORE_UNAVAILABLE",
        csHint: true,
      },
      { status: 503 }
    );
  }

  let paidOrder: Order | null = null;
  const result = await confirmPaymentOnce(
    buildConfirmDeps(store, toss, {
      orderTicket,
      onPaidOrder: (o) => {
        paidOrder = o;
      },
    }),
    { orderId, paymentKey, amount }
  );

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.message,
        code: result.code,
        retryable: result.retryable,
        ...(CS_CODES.has(result.code)
          ? { orderId, csHint: true, refundHint: true }
          : null),
      },
      { status: STATUS[result.code] }
    );
  }

  // onPaid 가 넘긴 주문이 가장 최신 — 없으면(있을 수 없음) 저장소에서 다시 읽는다
  const paid: Order = paidOrder ?? (await getOrderDurable(orderId)) ?? order;
  return NextResponse.json({
    ...paidPayload(paid),
    outcome: result.outcome,
  });
}
