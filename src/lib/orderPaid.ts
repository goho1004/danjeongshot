import type { Order } from "@/lib/orders";
import { resolveOrderDurable } from "@/lib/orderDurable";

/** 주문 paid 확인 (토스 direct — complete/confirm 경로만). Redis SoT. */
export async function resolvePaidOrder(
  orderId: string,
  unlockToken: string
): Promise<Order | null> {
  const o = await resolveOrderDurable(orderId, unlockToken);
  return o?.paid ? o : null;
}
