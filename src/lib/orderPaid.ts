import { resolveOrder, type Order } from "@/lib/orders";

/** 주문 paid 확인 (토스 direct — complete/confirm 경로만). */
export async function resolvePaidOrder(
  orderId: string,
  unlockToken: string
): Promise<Order | null> {
  return resolveOrder(orderId, unlockToken);
}
