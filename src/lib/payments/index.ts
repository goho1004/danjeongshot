/**
 * 결제 코어 배선 — 저장소 선택 · Toss 게이트웨이 · 주문 어댑터.
 * (장수 M0 `src/lib/payments/index.ts` 이식 — 저장소만 Postgres → Upstash 로 교체)
 *
 * fail-closed:
 *  - production 에서 Upstash 가 없으면 저장소를 만들지 않고 null (호출측 503).
 *    메모리 저장소는 서버리스 멀티 인스턴스에서 서로 안 보여 멱등을 못 지킨다.
 *  - production 에서 sandbox 모드면 게이트웨이도 null — 공짜 paid 를 만들 수 없다.
 */

import { getOrderDurable, markPaidDurable } from "@/lib/orderDurable";
import { unsealOrder, type Order } from "@/lib/orders";
import { getPaymentMode } from "@/lib/toss";
import { hasUpstash, kvDel, kvGet, kvSet, kvSetNx } from "@/lib/upstashKv";
import { MemoryPaymentStore } from "./memoryStore";
import { UpstashPaymentStore, type PaymentKv } from "./upstashStore";
import { HttpTossGateway, SandboxTossGateway } from "./tossGateway";
import type { ConfirmDeps, PaymentStore, TossGateway } from "./types";

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

/** 로컬·스모크에서만 메모리 저장소 허용 — Upstash 없는 CI 가 결제 경로를 돌릴 수 있게 */
function mockStoreAllowed(): boolean {
  return !isProd() || process.env.MOCK_GENERATE === "1";
}

const upstashKv: PaymentKv = {
  get: (key) => kvGet(key),
  set: (key, value, exSec) => kvSet(key, value, exSec),
  setNx: (key, value, exSec) => kvSetNx(key, value, exSec),
  del: async (key) => {
    await kvDel(key);
  },
};

const g = globalThis as unknown as { __djsPaymentStore?: PaymentStore };

export function getPaymentStore(): PaymentStore | null {
  if (g.__djsPaymentStore) return g.__djsPaymentStore;

  if (hasUpstash()) {
    g.__djsPaymentStore = new UpstashPaymentStore(upstashKv);
    return g.__djsPaymentStore;
  }

  if (mockStoreAllowed()) {
    console.warn("[payments] Upstash 없음 — 로컬/스모크용 메모리 저장소 사용");
    g.__djsPaymentStore = new MemoryPaymentStore();
    return g.__djsPaymentStore;
  }
  return null;
}

export function getTossGateway(): TossGateway | null {
  if (getPaymentMode() === "toss") {
    return new HttpTossGateway(process.env.TOSS_SECRET_KEY!.trim());
  }
  // sandbox 는 로컬 개발·스모크 전용 — production 에서 공짜 paid 를 만들 수 없다
  return mockStoreAllowed() ? new SandboxTossGateway() : null;
}

/** confirming 리스 유지 시간(엔지니어링 기본값, 정책 수치 아님) */
export function confirmLeaseMs(): number {
  const n = Number(process.env.PAYMENT_CONFIRM_LEASE_MS ?? "30000");
  return Number.isFinite(n) && n > 0 ? n : 30000;
}

/**
 * 단정샷 주문(Order) 어댑터.
 * 콜드 인스턴스에서는 Upstash 에 주문이 없을 수 있어 orderTicket(봉인 토큰)으로 복원한다.
 *
 * `onPaidOrder` 로 갱신된 주문을 그대로 넘긴다 — 라우트가 Upstash 를 다시 읽으면
 * Global 복제 지연으로 paid:false 토큰을 내려보낼 수 있기 때문.
 */
export function buildConfirmDeps(
  store: PaymentStore,
  toss: TossGateway,
  ctx: { orderTicket?: string; onPaidOrder?: (order: Order) => void }
): ConfirmDeps {
  const ticket = ctx.orderTicket || "";
  return {
    store,
    toss,
    leaseMs: confirmLeaseMs(),
    async getOrderAmount(orderId) {
      const o =
        (await getOrderDurable(orderId)) || (ticket ? unsealOrder(ticket) : null);
      return o && o.id === orderId ? o.amountKrw : null;
    },
    async onPaid(orderId) {
      // markPaidDurable 는 이미 paid 면 그대로 돌려주는 멱등 함수 —
      // 승인 호출(confirmed)·재생(replayed) 양쪽에서 안전하다.
      const paid = await markPaidDurable(orderId, ticket || undefined);
      if (!paid) throw new Error("markPaid failed");
      ctx.onPaidOrder?.(paid);
    },
  };
}

export { confirmPaymentOnce, reconcilePayment } from "./confirm";
export type { ConfirmResult, PaymentRecord } from "./types";
