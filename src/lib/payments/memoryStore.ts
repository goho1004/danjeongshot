/**
 * 메모리 PaymentStore — 테스트·로컬 개발 전용. (장수 M0 이식 · 로직 무변경)
 * 각 메서드는 await 없는 동기 구간이라 JS 단일 스레드에서 원자적이다.
 * 서버리스 멀티 인스턴스에서는 서로 안 보이므로 prod 에서 쓰지 않는다 (index.ts 가 막는다).
 */

import {
  PaymentKeyReusedError,
  type ClaimInput,
  type ClaimResult,
  type PaymentRecord,
  type PaymentStore,
} from "./types";

export class MemoryPaymentStore implements PaymentStore {
  private rows = new Map<string, PaymentRecord>();

  async claim(input: ClaimInput): Promise<ClaimResult> {
    const cur = this.rows.get(input.orderId);
    // Upstash 저장소의 paymentKey→orderId 바인딩과 동일: 다른 주문에 묶인 키는 거부
    let reused = false;
    this.rows.forEach((row, oid) => {
      if (oid !== input.orderId && row.paymentKey === input.paymentKey) reused = true;
    });
    if (reused) throw new PaymentKeyReusedError(input.paymentKey);
    if (!cur) {
      const record: PaymentRecord = {
        orderId: input.orderId,
        paymentKey: input.paymentKey,
        amount: input.amount,
        status: "confirming",
        leaseUntil: input.leaseUntil,
        attempts: 1,
        failCode: null,
        createdAt: input.now,
        updatedAt: input.now,
        paidAt: null,
      };
      this.rows.set(input.orderId, record);
      return { won: true, record: { ...record } };
    }

    const takeoverFailed = cur.status === "failed";
    const takeoverExpired =
      cur.status === "confirming" &&
      cur.leaseUntil < input.now &&
      cur.paymentKey === input.paymentKey;
    if (takeoverFailed || takeoverExpired) {
      const record: PaymentRecord = {
        ...cur,
        paymentKey: input.paymentKey,
        amount: input.amount,
        status: "confirming",
        leaseUntil: input.leaseUntil,
        attempts: cur.attempts + 1,
        failCode: null,
        updatedAt: input.now,
      };
      this.rows.set(input.orderId, record);
      return { won: true, record: { ...record } };
    }
    return { won: false, record: { ...cur } };
  }

  async markPaid(orderId: string, paymentKey: string, now: number): Promise<boolean> {
    const cur = this.rows.get(orderId);
    if (!cur || cur.status !== "confirming" || cur.paymentKey !== paymentKey) {
      return false;
    }
    this.rows.set(orderId, { ...cur, status: "paid", paidAt: now, updatedAt: now });
    return true;
  }

  async markFailed(
    orderId: string,
    paymentKey: string,
    code: string,
    now: number
  ): Promise<boolean> {
    const cur = this.rows.get(orderId);
    if (!cur || cur.status !== "confirming" || cur.paymentKey !== paymentKey) {
      return false;
    }
    this.rows.set(orderId, { ...cur, status: "failed", failCode: code, updatedAt: now });
    return true;
  }

  async get(orderId: string): Promise<PaymentRecord | null> {
    const cur = this.rows.get(orderId);
    return cur ? { ...cur } : null;
  }
}
