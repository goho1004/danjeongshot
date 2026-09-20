/**
 * Upstash PaymentStore — 단정샷 전용 3번째 저장소.
 *
 * 장수는 Postgres 단일 UPDATE 문장으로 원자성을 얻지만 단정샷에는 Postgres 가 없다.
 * 대신 Redis `SET NX EX` 리스(lease)로 같은 계약(claim/markPaid/markFailed/get)을 만든다.
 *
 * 키 3벌 (`djs:pay:` 접두사 — 장수와 분리):
 *  - `rec:{orderId}`    결제 레코드 JSON (7일)
 *  - `lease:{orderId}`  승인 진행 중 리스. 값 = paymentKey · TTL 이 곧 리스 만료
 *  - `pk:{paymentKey}`  paymentKey → orderId 바인딩 (pg 의 payment_key 유니크 인덱스 대용)
 *
 * 리스를 쥔 호출만 레코드를 쓴다. 저장소가 없거나 오류면 **예외를 던져** 호출측이
 * STORE_UNAVAILABLE(503·재시도 가능)로 닫는다 — 조용히 통과시키지 않는다(fail-closed).
 */

import {
  PaymentKeyReusedError,
  type ClaimInput,
  type ClaimResult,
  type PaymentRecord,
  type PaymentStore,
} from "./types";

/** 저장소를 쓸 수 없음 — 코어가 STORE_UNAVAILABLE(재시도 가능)로 변환한다 */
export class PaymentStoreUnavailableError extends Error {
  constructor(op: string) {
    super(`payment store unavailable: ${op}`);
    this.name = "PaymentStoreUnavailableError";
  }
}

/**
 * 실제 Redis 명령만 쓴다 — 테스트가 같은 원시 명령을 구현한 가짜로 계약을 검증할 수 있게.
 * `setNx` 반환: true=획득 · false=이미 존재 · null=저장소 없음/오류
 */
export type PaymentKv = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, exSec: number): Promise<boolean>;
  setNx(key: string, value: string, exSec: number): Promise<boolean | null>;
  del(key: string): Promise<void>;
};

const REC_TTL_SEC = 60 * 60 * 24 * 7; // 주문 TTL(7일)과 맞춤
const PK_TTL_SEC = REC_TTL_SEC;

function recKey(orderId: string) {
  return `djs:pay:rec:${orderId}`;
}
function leaseKey(orderId: string) {
  return `djs:pay:lease:${orderId}`;
}
/** paymentKey 원문을 키에 넣지 않는다 — Toss 키가 Redis 키 공간에 남지 않게 */
function pkKey(paymentKey: string) {
  return `djs:pay:pk:${hashKey(paymentKey)}`;
}

function hashKey(v: string): string {
  // 비암호 해시로 충분 — 목적은 충돌 회피와 원문 미노출
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}${v.length.toString(36)}`;
}

function parseRecord(raw: string | null): PaymentRecord | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<PaymentRecord>;
    if (!p || typeof p.orderId !== "string" || typeof p.paymentKey !== "string") {
      return null;
    }
    if (p.status !== "confirming" && p.status !== "paid" && p.status !== "failed") {
      return null;
    }
    return {
      orderId: p.orderId,
      paymentKey: p.paymentKey,
      amount: Number(p.amount ?? 0),
      status: p.status,
      leaseUntil: Number(p.leaseUntil ?? 0),
      attempts: Number(p.attempts ?? 1),
      failCode: typeof p.failCode === "string" ? p.failCode : null,
      createdAt: Number(p.createdAt ?? 0),
      updatedAt: Number(p.updatedAt ?? 0),
      paidAt: typeof p.paidAt === "number" ? p.paidAt : null,
    };
  } catch {
    return null;
  }
}

export class UpstashPaymentStore implements PaymentStore {
  constructor(private kv: PaymentKv) {}

  private async readRecord(orderId: string): Promise<PaymentRecord | null> {
    return parseRecord(await this.kv.get(recKey(orderId)));
  }

  private async writeRecord(record: PaymentRecord): Promise<void> {
    const ok = await this.kv.set(
      recKey(record.orderId),
      JSON.stringify(record),
      REC_TTL_SEC
    );
    if (!ok) throw new PaymentStoreUnavailableError("write record");
  }

  /** 다른 주문에 이미 묶인 paymentKey 인지 — pg 의 payment_key 유니크 인덱스 대용 */
  private async bindPaymentKey(orderId: string, paymentKey: string): Promise<void> {
    const key = pkKey(paymentKey);
    const won = await this.kv.setNx(key, orderId, PK_TTL_SEC);
    if (won === null) throw new PaymentStoreUnavailableError("bind paymentKey");
    if (won) return;
    const owner = await this.kv.get(key);
    // owner 가 null = 방금 만료. 다른 주문 것이 아니라는 증거가 없으므로 통과시키지 않는다.
    if (owner === null) throw new PaymentStoreUnavailableError("bind paymentKey (race)");
    if (owner !== orderId) throw new PaymentKeyReusedError(paymentKey);
  }

  async claim(input: ClaimInput): Promise<ClaimResult> {
    const { orderId, paymentKey, now, leaseUntil } = input;
    await this.bindPaymentKey(orderId, paymentKey);

    // 이미 paid 면 리스를 잡을 필요가 없다 — 코어가 replayed 로 처리한다
    const before = await this.readRecord(orderId);
    if (before?.status === "paid") return { won: false, record: before };

    const leaseSec = Math.max(1, Math.ceil((leaseUntil - now) / 1000));
    const gotLease = await this.kv.setNx(leaseKey(orderId), paymentKey, leaseSec);
    if (gotLease === null) throw new PaymentStoreUnavailableError("acquire lease");

    if (!gotLease) return { won: false, record: await this.leaseHolderView(input) };

    // ── 리스 보유 구간: 이 주문의 레코드를 쓰는 것은 이 호출뿐 ──
    const cur = await this.readRecord(orderId);

    if (!cur) {
      const record: PaymentRecord = {
        orderId,
        paymentKey,
        amount: input.amount,
        status: "confirming",
        leaseUntil,
        attempts: 1,
        failCode: null,
        createdAt: now,
        updatedAt: now,
        paidAt: null,
      };
      await this.writeRecord(record);
      return { won: true, record };
    }

    if (cur.status === "paid") {
      await this.kv.del(leaseKey(orderId));
      return { won: false, record: cur };
    }

    // failed → 새 paymentKey 로 재시도 인수
    // confirming → 리스가 만료된 뒤이므로, 같은 paymentKey 일 때만 재인수
    const takeover =
      cur.status === "failed" ||
      (cur.status === "confirming" && cur.paymentKey === paymentKey);
    if (!takeover) {
      await this.kv.del(leaseKey(orderId));
      return { won: false, record: cur };
    }

    const record: PaymentRecord = {
      ...cur,
      paymentKey,
      amount: input.amount,
      status: "confirming",
      leaseUntil,
      attempts: cur.attempts + 1,
      failCode: null,
      updatedAt: now,
    };
    await this.writeRecord(record);
    return { won: true, record };
  }

  /**
   * 리스를 뺏겼을 때 코어에 돌려줄 레코드.
   * 레코드가 아직 안 쓰였으면(승자의 2번째 왕복 전) 리스 값(paymentKey)으로 메꾼다 —
   * 코어가 「진행 중」과 「다른 결제」를 구분할 수 있어야 하기 때문.
   */
  private async leaseHolderView(input: ClaimInput): Promise<PaymentRecord> {
    const cur = await this.readRecord(input.orderId);
    if (cur) return cur;
    const holder = await this.kv.get(leaseKey(input.orderId));
    return {
      orderId: input.orderId,
      // holder 가 null = 방금 만료. 진행 중(재시도 가능)으로 본다
      paymentKey: holder ?? input.paymentKey,
      amount: input.amount,
      status: "confirming",
      leaseUntil: input.leaseUntil,
      attempts: 1,
      failCode: null,
      createdAt: input.now,
      updatedAt: input.now,
      paidAt: null,
    };
  }

  private async settle(
    orderId: string,
    paymentKey: string,
    now: number,
    next: Pick<PaymentRecord, "status" | "failCode" | "paidAt">
  ): Promise<boolean> {
    const cur = await this.readRecord(orderId);
    if (!cur || cur.status !== "confirming" || cur.paymentKey !== paymentKey) {
      return false;
    }
    await this.writeRecord({ ...cur, ...next, updatedAt: now });
    // 리스 해제 — 실패 후 재시도가 만료를 기다리지 않게
    await this.kv.del(leaseKey(orderId));
    return true;
  }

  async markPaid(orderId: string, paymentKey: string, now: number): Promise<boolean> {
    return this.settle(orderId, paymentKey, now, {
      status: "paid",
      failCode: null,
      paidAt: now,
    });
  }

  async markFailed(
    orderId: string,
    paymentKey: string,
    code: string,
    now: number
  ): Promise<boolean> {
    return this.settle(orderId, paymentKey, now, {
      status: "failed",
      failCode: code,
      paidAt: null,
    });
  }

  async get(orderId: string): Promise<PaymentRecord | null> {
    return this.readRecord(orderId);
  }
}
