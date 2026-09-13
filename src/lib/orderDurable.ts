/**
 * 주문 SoT — Upstash에 주문 JSON 저장 + paid/redo/asv 원자 claim.
 * ticket(봉인 토큰)은 보조. Upstash 없으면 기존 메모리+unseal 경로.
 */

import {
  getOrder,
  markAsv,
  markPaid,
  markRedo,
  putOrder,
  unsealOrder,
  type Order,
} from "@/lib/orders";
import { hasUpstash, kvGet, kvSet, kvSetNx } from "@/lib/upstashKv";

const ORDER_TTL_SEC = 60 * 60 * 24 * 7; // 7일 (unseal 만료와 맞춤)
const CLAIM_TTL_SEC = ORDER_TTL_SEC;

function orderKey(id: string) {
  return `djs:ord:${id}`;
}
function paidClaimKey(id: string) {
  return `djs:claim:paid:${id}`;
}
function redoClaimKey(id: string) {
  return `djs:claim:redo:${id}`;
}
function asvClaimKey(id: string) {
  return `djs:claim:asv:${id}`;
}

/** 저장용 — unlockToken 제외(재봉인은 putOrder/cache) */
type StoredOrder = Omit<Order, "unlockToken">;

function toStored(o: Order): StoredOrder {
  const { unlockToken: _, ...rest } = o;
  return rest;
}

function fromStored(s: StoredOrder): Order {
  return putOrder({ ...s, unlockToken: "" });
}

export async function persistOrder(order: Order): Promise<void> {
  if (!hasUpstash()) return;
  try {
    await kvSet(orderKey(order.id), JSON.stringify(toStored(order)), ORDER_TTL_SEC);
  } catch {
    /* ignore — 메모리는 이미 갱신됨 */
  }
}

export async function loadOrderById(orderId: string): Promise<Order | null> {
  const mem = getOrder(orderId);
  if (mem) return mem;

  if (!hasUpstash()) return null;
  const raw = await kvGet(orderKey(orderId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredOrder;
    if (!parsed?.id || parsed.id !== orderId) return null;
    return fromStored(parsed);
  } catch {
    return null;
  }
}

/**
 * 인증: ticket unseal(id 일치) 또는 메모리 unlockToken 일치.
 * 상태 SoT: Upstash 주문 JSON(있으면) · 없으면 토큰/메모리 후 persist.
 */
export async function resolveOrderDurable(
  orderId: string,
  token: string
): Promise<Order | null> {
  const fromToken = unsealOrder(token);
  const tokenOk = !!(fromToken && fromToken.id === orderId);
  const mem = getOrder(orderId);
  const memOk = !!(mem && mem.unlockToken === token);
  if (!tokenOk && !memOk) return null;

  const redis = await loadOrderById(orderId);
  if (redis) {
    // Redis 카운터를 SoT로 — stale 토큰이 redoUsed를 되돌리지 못하게
    return redis;
  }

  if (fromToken && fromToken.id === orderId) {
    const hydrated = putOrder({ ...fromToken, unlockToken: "" });
    await persistOrder(hydrated);
    return hydrated;
  }

  if (memOk && mem) {
    await persistOrder(mem);
    return mem;
  }
  return null;
}

export async function getOrderDurable(
  orderId: string
): Promise<Order | undefined> {
  return (await loadOrderById(orderId)) ?? undefined;
}

/**
 * 결제 반영 — claim으로 이중 markPaid 경합 완화 후 Redis 저장.
 */
export async function markPaidDurable(
  orderId: string,
  ticket?: string
): Promise<Order | undefined> {
  let base =
    (await loadOrderById(orderId)) ||
    getOrder(orderId) ||
    (ticket ? unsealOrder(ticket) : null) ||
    undefined;
  if (!base || base.id !== orderId) return undefined;

  if (base.paid) {
    await persistOrder(base);
    return base;
  }

  const claim = await kvSetNx(paidClaimKey(orderId), "1", CLAIM_TTL_SEC);
  if (claim === false) {
    // 다른 인스턴스가 선점 — 최신 로드
    const again = await loadOrderById(orderId);
    if (again?.paid) return again;
    // claim만 있고 본문 미기록 레이스 — 짧게 대기 후 재시도 1회
    await new Promise((r) => setTimeout(r, 80));
    const third = await loadOrderById(orderId);
    if (third?.paid) return third;
  }

  const paid = markPaid(orderId, ticket || base.unlockToken);
  if (paid) await persistOrder(paid);
  return paid;
}

export async function markRedoDurable(
  orderId: string,
  token: string
): Promise<Order | null> {
  await resolveOrderDurable(orderId, token);

  const claim = await kvSetNx(redoClaimKey(orderId), "1", CLAIM_TTL_SEC);
  if (claim === false) return null; // 이미 1회 소진(병렬 포함)
  // claim === null → Upstash 없음/오류 → 메모리 markRedo만 (기존 동작)

  const next = markRedo(orderId, token);
  if (!next) return null;
  await persistOrder(next);
  return next;
}

export async function markAsvDurable(
  orderId: string,
  token: string
): Promise<Order | null> {
  await resolveOrderDurable(orderId, token);

  const claim = await kvSetNx(asvClaimKey(orderId), "1", CLAIM_TTL_SEC);
  if (claim === false) return null;

  const next = markAsv(orderId, token);
  if (!next) return null;
  await persistOrder(next);
  return next;
}

export { hasUpstash as orderStoreUsesUpstash };
