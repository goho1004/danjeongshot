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
/** 프리뷰 생성 중 이중 POST 차단 (짧은 TTL) */
function previewGenClaimKey(id: string) {
  return `djs:claim:previewgen:${id}`;
}
/** redo 생성 중 이중 POST 차단 — 1회 소진키(redoClaimKey)와 분리된 단기 inflight키 */
function redoGenClaimKey(id: string) {
  return `djs:claim:redogen:${id}`;
}
/** asv 생성 중 이중 POST 차단 — 1회 소진키(asvClaimKey)와 분리된 단기 inflight키 */
function asvGenClaimKey(id: string) {
  return `djs:claim:asvgen:${id}`;
}

const PREVIEW_GEN_CLAIM_TTL_SEC = 120;
const gGenInflight = globalThis as unknown as {
  __djsPreviewGenInflight?: Map<string, number>;
  __djsRedoGenInflight?: Map<string, number>;
  __djsAsvGenInflight?: Map<string, number>;
};
if (!gGenInflight.__djsPreviewGenInflight) {
  gGenInflight.__djsPreviewGenInflight = new Map();
}
if (!gGenInflight.__djsRedoGenInflight) {
  gGenInflight.__djsRedoGenInflight = new Map();
}
if (!gGenInflight.__djsAsvGenInflight) {
  gGenInflight.__djsAsvGenInflight = new Map();
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
    // Upstash Global 복제 지연 대비: 서명된 토큰(위조 불가, AES-GCM)이
    // paid:true인데 방금 읽은 Redis 레플리카가 아직 구버전(false)일 수
    // 있음 — 이 경우만 paid를 토큰 신뢰(카운터는 그대로 Redis SoT 유지).
    if (!redis.paid && tokenOk && fromToken?.paid) {
      return { ...redis, paid: true };
    }
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
  // claim === null(Upstash 없음/오류) → fail-closed: 저장소 없이 소진 표시 불가.
  // 과금 전 사전 claim(claimRedoGenerate)이 1차 방벽이므로 여기는 1회성 보장용.
  if (claim === null && !mockClaimBypass()) return null;

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
  // P0-2 fail-closed: null이면 메모리 markAsv로 진행하지 않음 (위 markRedoDurable과 동일).
  if (claim === null && !mockClaimBypass()) return null;

  const next = markAsv(orderId, token);
  if (!next) return null;
  await persistOrder(next);
  return next;
}

/**
 * 유료 generate 사전 claim 결과.
 * - "ok": 선점 성공 → Gemini 발사 허용
 * - "inflight": 이미 선점됨 → HTTP 발사 없이 429
 * - "unavailable": 저장소(Upstash) 없음/오류 → HTTP 발사 없이 503 (P0-2 fail-closed)
 */
export type GenerateClaim = "ok" | "inflight" | "unavailable";

/**
 * 메모리 폴백 예외 1줄: MOCK_GENERATE=1(로컬/테스트)일 때만 허용 · prod 가정은 Upstash 필수.
 * mock은 Gemini를 쏘지 않으므로 메모리 claim으로 과금 리스크 없음.
 */
function mockClaimBypass(): boolean {
  return process.env.MOCK_GENERATE === "1";
}

/** Gemini 호출 직전 원자 선점 — Upstash NX 우선, null이면 fail-closed(메모리 폴백은 mock 예외만). */
async function claimGenSlot(
  key: string,
  mem: Map<string, number>
): Promise<GenerateClaim> {
  const nx = await kvSetNx(key, "1", PREVIEW_GEN_CLAIM_TTL_SEC);
  if (nx === true) return "ok";
  if (nx === false) return "inflight";
  if (!mockClaimBypass()) return "unavailable";

  // Upstash 없음 — mock 전용 프로세스 로컬 (Gemini 미발사이므로 과금 영향 없음)
  const now = Date.now();
  const until = mem.get(key) ?? 0;
  if (until > now) return "inflight";
  mem.set(key, now + PREVIEW_GEN_CLAIM_TTL_SEC * 1000);
  return "ok";
}

/**
 * 프리뷰 Gemini 호출 직전 원자 claim (TTL 120s · 실패해도 해제 없음 — 과금 방지가 UX보다 우선).
 */
export async function claimPreviewGenerate(
  orderId: string
): Promise<GenerateClaim> {
  return claimGenSlot(
    previewGenClaimKey(orderId),
    gGenInflight.__djsPreviewGenInflight!
  );
}

/**
 * P0-1: redo Gemini/mock 생성 전 원자 claim.
 * 1회 소진키(redoClaimKey)와 별도 단기키이므로 이중 mark·영구잠금 없음.
 */
export async function claimRedoGenerate(
  orderId: string
): Promise<GenerateClaim> {
  return claimGenSlot(
    redoGenClaimKey(orderId),
    gGenInflight.__djsRedoGenInflight!
  );
}

/**
 * P0-1: asv Gemini/mock 생성 전 원자 claim (redo와 동일 구조).
 */
export async function claimAsvGenerate(
  orderId: string
): Promise<GenerateClaim> {
  return claimGenSlot(
    asvGenClaimKey(orderId),
    gGenInflight.__djsAsvGenInflight!
  );
}

export { hasUpstash as orderStoreUsesUpstash };
