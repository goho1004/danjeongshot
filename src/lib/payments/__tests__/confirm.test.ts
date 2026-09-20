/**
 * 완료 기준: 콜백을 여러 번(동시 포함) 보내도 Toss 승인은 1회.
 * 장수 M0 `__tests__/confirm.test.ts` 19 시나리오를 저장소만 바꿔 그대로 돌린다 —
 * 메모리 저장소와 **단정샷 신규 Upstash 저장소** 양쪽에서.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { confirmPaymentOnce, reconcilePayment } from "../confirm";
import { MemoryPaymentStore } from "../memoryStore";
import { UpstashPaymentStore } from "../upstashStore";
import { FakeKv } from "./fakeKv";
import type {
  ConfirmDeps,
  PaymentStore,
  TossConfirmOutcome,
  TossGateway,
  TossPaymentView,
} from "../types";

const tick = (ms = 1) => new Promise((r) => setTimeout(r, ms));

type ConfirmInput = {
  paymentKey: string;
  orderId: string;
  amount: number;
  idempotencyKey: string;
};

class FakeToss implements TossGateway {
  confirmCalls: ConfirmInput[] = [];
  /** 호출 순번(1부터)별 응답. 없으면 done */
  script: ((
    n: number,
    input: { paymentKey: string; orderId: string; amount: number }
  ) => TossConfirmOutcome)[] = [];
  views = new Map<string, TossPaymentView>();
  delayMs = 5;

  async confirm(input: ConfirmInput) {
    this.confirmCalls.push(input);
    await tick(this.delayMs); // 동시 요청이 실제로 겹치도록
    const step = this.script[this.confirmCalls.length - 1];
    if (step) return step(this.confirmCalls.length, input);
    return {
      kind: "done" as const,
      payment: {
        paymentKey: input.paymentKey,
        orderId: input.orderId,
        totalAmount: input.amount,
        status: "DONE",
      },
    };
  }
  async getPayment(paymentKey: string) {
    return this.views.get(paymentKey) ?? null;
  }
}

const stores: [string, (now: () => number) => PaymentStore][] = [
  ["memory", () => new MemoryPaymentStore()],
  ["upstash(SET NX 리스)", (now) => new UpstashPaymentStore(new FakeKv(now))],
];

describe.each(stores)("결제 멱등 코어 — %s", (_name, makeStore) => {
  let toss: FakeToss;
  let store: PaymentStore;
  let paidHooks: string[];
  let clock: number;
  let hookFail: number;
  const AMOUNT = 12_000;
  const now = () => clock;

  const deps = (over: Partial<ConfirmDeps> = {}): ConfirmDeps => ({
    store,
    toss,
    leaseMs: 30_000,
    now,
    getOrderAmount: async (id) => (id.startsWith("ord_") ? AMOUNT : null),
    onPaid: async (id) => {
      if (hookFail > 0) {
        hookFail--;
        throw new Error("hook down");
      }
      paidHooks.push(id);
    },
    ...over,
  });
  const input = (
    o: Partial<{ orderId: string; paymentKey: string; amount: number }> = {}
  ) => ({ orderId: "ord_1", paymentKey: "pk_1", amount: AMOUNT, ...o });

  beforeEach(() => {
    toss = new FakeToss();
    clock = 1_000_000;
    store = makeStore(now);
    paidHooks = [];
    hookFail = 0;
  });

  it("동시 콜백 6개 → Toss confirm 1회, 승인 실행(confirmed) 1건", async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, () => confirmPaymentOnce(deps(), input()))
    );

    expect(toss.confirmCalls).toHaveLength(1);
    expect(results.filter((r) => r.ok && r.outcome === "confirmed")).toHaveLength(1);
    // 나머지는 승인 진행 중(재시도 가능) 이거나 이미 paid 재생 — 어느 쪽이든 Toss 는 안 간다
    for (const r of results) {
      if (!r.ok) {
        expect(r.code).toBe("PAYMENT_IN_PROGRESS");
        expect(r.retryable).toBe(true);
      }
    }
    expect((await store.get("ord_1"))?.status).toBe("paid");
  });

  it("동시 콜백 뒤 다시 6번 순차 콜백(새로고침·뒤로가기) → 전부 replayed, Toss 여전히 1회", async () => {
    await Promise.all(
      Array.from({ length: 6 }, () => confirmPaymentOnce(deps(), input()))
    );
    for (let i = 0; i < 6; i++) {
      const r = await confirmPaymentOnce(deps(), input());
      expect(r.ok && r.outcome).toBe("replayed");
    }
    expect(toss.confirmCalls).toHaveLength(1);
    expect((await store.get("ord_1"))?.attempts).toBe(1);
  });

  it("순차 10회 → 첫 호출만 confirmed, 나머지 replayed", async () => {
    const outcomes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = await confirmPaymentOnce(deps(), input());
      outcomes.push(r.ok ? r.outcome : r.code);
    }
    expect(outcomes[0]).toBe("confirmed");
    expect(outcomes.slice(1).every((o) => o === "replayed")).toBe(true);
    expect(toss.confirmCalls).toHaveLength(1);
  });

  it("Toss 로 가는 멱등키는 결정적이다 (랜덤 UUID ✗)", async () => {
    await confirmPaymentOnce(deps(), input());
    expect(toss.confirmCalls[0]!.idempotencyKey).toBe("djs-confirm-ord_1-pk_1");
  });

  it("승인 금액은 서버 주문 금액으로 — 클라이언트 금액이 다르면 Toss 호출 없음", async () => {
    const r = await confirmPaymentOnce(deps(), input({ amount: 100 }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("AMOUNT_MISMATCH");
    expect(toss.confirmCalls).toHaveLength(0);
    expect(await store.get("ord_1")).toBeNull();
  });

  it("없는 주문 → ORDER_NOT_FOUND, Toss 호출 없음", async () => {
    const r = await confirmPaymentOnce(deps(), input({ orderId: "zzz" }));
    expect(!r.ok && r.code).toBe("ORDER_NOT_FOUND");
    expect(toss.confirmCalls).toHaveLength(0);
  });

  it("paid 주문에 다른 paymentKey → PAYMENT_KEY_MISMATCH, Toss 호출 없음", async () => {
    await confirmPaymentOnce(deps(), input());
    const r = await confirmPaymentOnce(deps(), input({ paymentKey: "pk_other" }));
    expect(!r.ok && r.code).toBe("PAYMENT_KEY_MISMATCH");
    expect(toss.confirmCalls).toHaveLength(1);
  });

  it("같은 paymentKey 를 다른 주문에 붙이려 하면 거부", async () => {
    await confirmPaymentOnce(deps(), input());
    const r = await confirmPaymentOnce(deps(), input({ orderId: "ord_2" }));
    expect(!r.ok && r.code).toBe("PAYMENT_KEY_MISMATCH");
    expect(toss.confirmCalls).toHaveLength(1);
  });

  it("Toss 확정 거절 → failed, 새 paymentKey 재시도는 허용되고 그때만 다시 Toss 호출", async () => {
    toss.script = [
      () => ({ kind: "declined", code: "REJECT_CARD_PAYMENT", message: "카드 거절" }),
    ];
    const first = await confirmPaymentOnce(deps(), input());
    expect(!first.ok && first.code).toBe("TOSS_DECLINED");
    expect((await store.get("ord_1"))?.status).toBe("failed");

    const retry = await confirmPaymentOnce(deps(), input({ paymentKey: "pk_2" }));
    expect(retry.ok && retry.outcome).toBe("confirmed");
    expect(toss.confirmCalls.map((c) => c.paymentKey)).toEqual(["pk_1", "pk_2"]);
  });

  it("Toss 결과 불명(unknown) → 락 유지: 즉시 재시도는 Toss 를 안 부르고, 다른 paymentKey 도 못 들어옴", async () => {
    toss.script = [() => ({ kind: "unknown", message: "timeout" })];
    const first = await confirmPaymentOnce(deps(), input());
    expect(!first.ok && first.code).toBe("TOSS_UNKNOWN");
    expect(!first.ok && first.retryable).toBe(true);

    const again = await confirmPaymentOnce(deps(), input());
    expect(!again.ok && again.code).toBe("PAYMENT_IN_PROGRESS");

    const other = await confirmPaymentOnce(deps(), input({ paymentKey: "pk_other" }));
    expect(!other.ok && other.code).toBe("PAYMENT_KEY_MISMATCH");
    expect(toss.confirmCalls).toHaveLength(1);
  });

  it("락 만료 뒤 같은 paymentKey 는 같은 멱등키로 재인수해 승인 마무리", async () => {
    toss.script = [() => ({ kind: "unknown", message: "timeout" })];
    await confirmPaymentOnce(deps(), input());

    clock += 30_001;
    const r = await confirmPaymentOnce(deps(), input());
    expect(r.ok && r.outcome).toBe("confirmed");
    expect(toss.confirmCalls).toHaveLength(2);
    expect(toss.confirmCalls[1]!.idempotencyKey).toBe(
      toss.confirmCalls[0]!.idempotencyKey
    );
    expect((await store.get("ord_1"))?.attempts).toBe(2);
  });

  it("락 만료 직후 동시 콜백 6개 → 재인수 승자 1명만 Toss 호출", async () => {
    toss.script = [() => ({ kind: "unknown", message: "timeout" })];
    await confirmPaymentOnce(deps(), input());
    clock += 30_001;

    const results = await Promise.all(
      Array.from({ length: 6 }, () => confirmPaymentOnce(deps(), input()))
    );
    expect(toss.confirmCalls).toHaveLength(2); // 최초 1 + 재인수 1
    expect(results.filter((r) => r.ok && r.outcome === "confirmed")).toHaveLength(1);
  });

  it("already_processed → Toss 조회로 검증 후 paid (조회 결과가 안 맞으면 paid 아님)", async () => {
    toss.script = [() => ({ kind: "already_processed" })];
    toss.views.set("pk_1", {
      paymentKey: "pk_1",
      orderId: "ord_1",
      totalAmount: AMOUNT,
      status: "DONE",
    });
    const ok = await confirmPaymentOnce(deps(), input());
    expect(ok.ok && ok.outcome).toBe("confirmed");

    toss = new FakeToss();
    store = makeStore(now);
    toss.script = [() => ({ kind: "already_processed" })];
    toss.views.set("pk_1", {
      paymentKey: "pk_1",
      orderId: "ord_1",
      totalAmount: 1,
      status: "DONE",
    });
    const bad = await confirmPaymentOnce(deps(), input());
    expect(!bad.ok && bad.code).toBe("TOSS_VERIFY_FAILED");
    expect((await store.get("ord_1"))?.status).toBe("confirming");
    expect(paidHooks).toEqual(["ord_1"]); // 첫 케이스에서만
  });

  it("승인 응답의 금액·orderId 가 주문과 다르면 paid 로 올리지 않는다", async () => {
    toss.script = [
      (_n, i) => ({
        kind: "done",
        payment: {
          paymentKey: i.paymentKey,
          orderId: i.orderId,
          totalAmount: AMOUNT - 1,
          status: "DONE",
        },
      }),
    ];
    const r = await confirmPaymentOnce(deps(), input());
    expect(!r.ok && r.code).toBe("TOSS_VERIFY_FAILED");
    expect(paidHooks).toEqual([]);
  });

  it("주문 반영(onPaid) 실패 → POST_PAID_FAILED, 재시도는 Toss 재호출 없이 후처리만 다시", async () => {
    hookFail = 1;
    const first = await confirmPaymentOnce(deps(), input());
    expect(!first.ok && first.code).toBe("POST_PAID_FAILED");
    expect((await store.get("ord_1"))?.status).toBe("paid");

    const retry = await confirmPaymentOnce(deps(), input());
    expect(retry.ok && retry.outcome).toBe("replayed");
    expect(paidHooks).toEqual(["ord_1"]);
    expect(toss.confirmCalls).toHaveLength(1);
  });

  it("successUrl 콜백 + 웹훅이 동시에 와도 paid 전이는 1번, Toss confirm 은 콜백 쪽 1회뿐", async () => {
    toss.views.set("pk_1", {
      paymentKey: "pk_1",
      orderId: "ord_1",
      totalAmount: AMOUNT,
      status: "DONE",
    });
    const results = await Promise.all([
      confirmPaymentOnce(deps(), input()),
      reconcilePayment(deps(), { paymentKey: "pk_1" }),
      confirmPaymentOnce(deps(), input()),
      reconcilePayment(deps(), { paymentKey: "pk_1" }),
    ]);
    expect(toss.confirmCalls.length).toBeLessThanOrEqual(1);
    expect(results.filter((r) => r.ok && r.outcome === "confirmed")).toHaveLength(1);
    expect((await store.get("ord_1"))?.status).toBe("paid");
  });

  it("웹훅만 온 경우(successUrl 유실) → Toss 조회 후 paid, confirm 호출 0", async () => {
    toss.views.set("pk_1", {
      paymentKey: "pk_1",
      orderId: "ord_1",
      totalAmount: AMOUNT,
      status: "DONE",
    });
    const r = await reconcilePayment(deps(), { paymentKey: "pk_1" });
    expect(r.ok && r.outcome).toBe("confirmed");
    expect(toss.confirmCalls).toHaveLength(0);
    expect(paidHooks).toEqual(["ord_1"]);

    const again = await reconcilePayment(deps(), { paymentKey: "pk_1" });
    expect(again.ok && again.outcome).toBe("replayed");
  });

  it("웹훅: Toss 상태가 DONE 이 아니거나 조회 실패면 paid 로 올리지 않는다", async () => {
    toss.views.set("pk_1", {
      paymentKey: "pk_1",
      orderId: "ord_1",
      totalAmount: AMOUNT,
      status: "CANCELED",
    });
    const canceled = await reconcilePayment(deps(), { paymentKey: "pk_1" });
    expect(!canceled.ok && canceled.code).toBe("TOSS_VERIFY_FAILED");
    const missing = await reconcilePayment(deps(), { paymentKey: "pk_none" });
    expect(!missing.ok && missing.code).toBe("TOSS_UNKNOWN");
    expect(await store.get("ord_1")).toBeNull();
  });

  it("서로 다른 주문은 서로를 막지 않는다", async () => {
    const [a, b] = await Promise.all([
      confirmPaymentOnce(deps(), input({ orderId: "ord_a", paymentKey: "pk_a" })),
      confirmPaymentOnce(deps(), input({ orderId: "ord_b", paymentKey: "pk_b" })),
    ]);
    expect(a!.ok && a!.outcome).toBe("confirmed");
    expect(b!.ok && b!.outcome).toBe("confirmed");
    expect(toss.confirmCalls).toHaveLength(2);
  });
});
