/**
 * Upstash 저장소 고유 계약 — 공유 시나리오(confirm.test.ts)가 덮지 않는 것들.
 * 저장소가 흔들릴 때 **승인하지 않는 쪽**으로 닫히는지가 핵심이다.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { confirmPaymentOnce } from "../confirm";
import { UpstashPaymentStore } from "../upstashStore";
import { FakeKv } from "./fakeKv";
import { PaymentKeyReusedError } from "../types";
import type { ConfirmDeps, TossConfirmOutcome, TossGateway } from "../types";

const AMOUNT = 12_000;

class CountingToss implements TossGateway {
  calls = 0;
  async confirm(input: {
    paymentKey: string;
    orderId: string;
    amount: number;
  }): Promise<TossConfirmOutcome> {
    this.calls++;
    return {
      kind: "done",
      payment: {
        paymentKey: input.paymentKey,
        orderId: input.orderId,
        totalAmount: input.amount,
        status: "DONE",
      },
    };
  }
  async getPayment() {
    return null;
  }
}

describe("UpstashPaymentStore", () => {
  let clock: number;
  let kv: FakeKv;
  let store: UpstashPaymentStore;
  let toss: CountingToss;
  const now = () => clock;

  const deps = (): ConfirmDeps => ({
    store,
    toss,
    leaseMs: 30_000,
    now,
    getOrderAmount: async (id) => (id.startsWith("ord_") ? AMOUNT : null),
    onPaid: async () => {},
  });
  const claimInput = (over: Partial<{ orderId: string; paymentKey: string }> = {}) => ({
    orderId: "ord_1",
    paymentKey: "pk_1",
    amount: AMOUNT,
    now: clock,
    leaseUntil: clock + 30_000,
    ...over,
  });

  beforeEach(() => {
    clock = 1_000_000;
    kv = new FakeKv(now);
    store = new UpstashPaymentStore(kv);
    toss = new CountingToss();
  });

  it("저장소가 응답하지 않으면 승인하지 않는다 — Toss 호출 0, 재시도 가능", async () => {
    kv.failSetNx = 1; // 첫 SET NX(=paymentKey 바인딩)가 null
    const r = await confirmPaymentOnce(deps(), {
      orderId: "ord_1",
      paymentKey: "pk_1",
      amount: AMOUNT,
    });
    expect(!r.ok && r.code).toBe("STORE_UNAVAILABLE");
    expect(!r.ok && r.retryable).toBe(true);
    expect(toss.calls).toBe(0);
  });

  it("리스 획득 단계에서 저장소가 죽어도 승인하지 않는다", async () => {
    kv.failSetNx = 0;
    // 바인딩은 통과시키고 리스 SET NX 만 죽인다
    const realSetNx = kv.setNx.bind(kv);
    let n = 0;
    kv.setNx = async (key, value, ex) => {
      n++;
      return n === 2 ? null : realSetNx(key, value, ex);
    };
    const r = await confirmPaymentOnce(deps(), {
      orderId: "ord_1",
      paymentKey: "pk_1",
      amount: AMOUNT,
    });
    expect(!r.ok && r.code).toBe("STORE_UNAVAILABLE");
    expect(toss.calls).toBe(0);
  });

  it("다른 주문에 묶인 paymentKey 는 PaymentKeyReusedError", async () => {
    await store.claim(claimInput());
    await expect(store.claim(claimInput({ orderId: "ord_2" }))).rejects.toBeInstanceOf(
      PaymentKeyReusedError
    );
  });

  it("paymentKey 원문은 Redis 키에 남기지 않는다", async () => {
    await store.claim(claimInput({ paymentKey: "tviva20260920_SECRET" }));
    const keys = Array.from(kv.rows.keys());
    expect(keys.some((k) => k.startsWith("djs:pay:"))).toBe(true);
    expect(keys.some((k) => k.includes("SECRET"))).toBe(false);
  });

  it("markFailed 는 리스를 풀어 준다 — 재시도가 만료를 기다리지 않는다", async () => {
    await store.claim(claimInput());
    expect(kv.rows.has("djs:pay:lease:ord_1")).toBe(true);

    expect(await store.markFailed("ord_1", "pk_1", "REJECT_CARD_PAYMENT", clock)).toBe(
      true
    );
    expect(kv.rows.has("djs:pay:lease:ord_1")).toBe(false);

    // 같은 시각(리스 만료 전)에 새 키로 바로 재인수된다
    const retry = await store.claim(claimInput({ paymentKey: "pk_2" }));
    expect(retry.won).toBe(true);
    expect(retry.record.attempts).toBe(2);
  });

  it("markPaid/markFailed 는 리스 주인이 아니면 반영하지 않는다", async () => {
    await store.claim(claimInput());
    expect(await store.markPaid("ord_1", "pk_other", clock)).toBe(false);
    expect(await store.markFailed("ord_1", "pk_other", "X", clock)).toBe(false);
    expect((await store.get("ord_1"))?.status).toBe("confirming");
  });

  it("paid 레코드에는 리스를 잡지 않는다 (재생은 왕복 2회)", async () => {
    await store.claim(claimInput());
    await store.markPaid("ord_1", "pk_1", clock);

    kv.calls = [];
    const again = await store.claim(claimInput());
    expect(again.won).toBe(false);
    expect(again.record.status).toBe("paid");
    expect(kv.calls.filter((c) => c.startsWith("SETNX djs:pay:lease"))).toHaveLength(0);
  });

  it("리스 승자가 레코드를 쓰기 전이면 진행 중과 다른 결제를 구분한다", async () => {
    // 승자가 리스만 잡고 아직 레코드를 못 쓴 상태를 직접 만든다
    await kv.setNx("djs:pay:lease:ord_1", "pk_1", 30);

    const same = await store.claim(claimInput({ paymentKey: "pk_1" }));
    expect(same.won).toBe(false);
    expect(same.record.paymentKey).toBe("pk_1"); // → 코어가 PAYMENT_IN_PROGRESS

    const other = await store.claim(claimInput({ paymentKey: "pk_2" }));
    expect(other.won).toBe(false);
    expect(other.record.paymentKey).toBe("pk_1"); // → 코어가 PAYMENT_KEY_MISMATCH
  });
});
