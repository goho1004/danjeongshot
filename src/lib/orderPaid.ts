import { unsealOrder, type Order } from "@/lib/orders";
import { resolveOrderDurable } from "@/lib/orderDurable";

/**
 * 주문 paid 확인 (토스 direct — complete/confirm 경로만). Redis SoT.
 * preview 게이트 전용: 제시된 토큰 자체가 "결제 후 발급본"이어야 함 —
 * 구(pre-pay) 토큰은 주문이 나중에 paid 되어도 재사용해서 무제한
 * preview(제미니 호출) 재발급을 못 하도록 차단.
 */
export async function resolvePaidOrder(
  orderId: string,
  unlockToken: string
): Promise<Order | null> {
  const o = await resolveOrderDurable(orderId, unlockToken);
  if (!o?.paid) return null;

  const fromToken = unsealOrder(unlockToken);
  if (fromToken && fromToken.id === orderId && !fromToken.paid) {
    return null; // pre-pay 시절 토큰 — 결제 후에도 재사용 불가
  }
  return o;
}
