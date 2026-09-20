/**
 * 승인 화면 in-flight 공유 — StrictMode 이중 실행으로 같은 승인이 두 번 나가지 않는다.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { confirmOnce, __resetConfirmInflight } from "../confirmOnce";

const tick = (ms = 1) => new Promise((r) => setTimeout(r, ms));

function fakeFetch(
  log: string[],
  respond: () => { status: number; body: unknown } = () => ({
    status: 200,
    body: { ok: true, orderId: "ord_1" },
  })
) {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    log.push(String(url));
    await tick(5);
    const { status, body } = respond();
    void init;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

const input = {
  paymentKey: "pk_1",
  orderId: "ord_1",
  amount: 12_000,
  orderTicket: "tkt",
};

describe("confirmOnce", () => {
  beforeEach(() => {
    __resetConfirmInflight();
  });

  it("같은 주문·결제키의 동시 호출 6개 → POST 1회, 결과는 모두 같다", async () => {
    const log: string[] = [];
    const f = fakeFetch(log);
    const results = await Promise.all(
      Array.from({ length: 6 }, () => confirmOnce(input, f))
    );
    expect(log).toHaveLength(1);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(new Set(results).size).toBe(1); // 같은 Promise 의 결과 객체
  });

  it("끝난 뒤 다시 누르면 재요청된다 (「다시 시도」가 죽지 않게)", async () => {
    const log: string[] = [];
    const f = fakeFetch(log);
    await confirmOnce(input, f);
    await confirmOnce(input, f);
    expect(log).toHaveLength(2);
  });

  it("실패해도 in-flight 를 비운다", async () => {
    const log: string[] = [];
    const f = fakeFetch(log, () => ({
      status: 409,
      body: { error: "진행 중", code: "PAYMENT_IN_PROGRESS" },
    }));
    const first = await confirmOnce(input, f);
    expect(first.ok).toBe(false);
    expect(first.status).toBe(409);
    expect(first.data.code).toBe("PAYMENT_IN_PROGRESS");
    await confirmOnce(input, f);
    expect(log).toHaveLength(2);
  });

  it("다른 주문은 서로를 막지 않는다", async () => {
    const log: string[] = [];
    const f = fakeFetch(log);
    await Promise.all([
      confirmOnce(input, f),
      confirmOnce({ ...input, orderId: "ord_2" }, f),
      confirmOnce({ ...input, paymentKey: "pk_2" }, f),
    ]);
    expect(log).toHaveLength(3);
  });
});
