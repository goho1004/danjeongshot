/**
 * Toss Payments v1 REST 게이트웨이 (승인 · 조회).
 * 키는 단정샷 TOSS_SECRET_KEY — 장수 키와 공유하지 않는다.
 */

import type {
  TossConfirmOutcome,
  TossGateway,
  TossPaymentView,
} from "./types";

const BASE = "https://api.tosspayments.com/v1/payments";

/** 결과가 불확실한 4xx — 승인됐을 수 있으므로 "확정 거절"로 닫지 않는다 */
const TRANSIENT_CODE = /PROVIDER_ERROR|INTERNAL|TIMEOUT|UNKNOWN|TEMPORARY/i;

type TossBody = {
  paymentKey?: string;
  orderId?: string;
  totalAmount?: number;
  status?: string;
  code?: string;
  message?: string;
};

function authHeader(secret: string): string {
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

function toView(d: TossBody, fallbackKey: string): TossPaymentView {
  return {
    paymentKey: String(d.paymentKey ?? fallbackKey),
    orderId: String(d.orderId ?? ""),
    totalAmount: Number(d.totalAmount ?? NaN),
    status: String(d.status ?? ""),
  };
}

export class HttpTossGateway implements TossGateway {
  constructor(private secretKey: string, private fetchImpl: typeof fetch = fetch) {}

  async confirm(input: {
    paymentKey: string;
    orderId: string;
    amount: number;
    idempotencyKey: string;
  }): Promise<TossConfirmOutcome> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${BASE}/confirm`, {
        method: "POST",
        headers: {
          Authorization: authHeader(this.secretKey),
          "Content-Type": "application/json",
          // 결정적 키: 같은 (orderId, paymentKey) 재호출은 Toss 가 같은 결과로 응답한다
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          paymentKey: input.paymentKey,
          orderId: input.orderId,
          amount: input.amount,
        }),
      });
    } catch (e) {
      return { kind: "unknown", message: e instanceof Error ? e.message : "network" };
    }

    let data: TossBody = {};
    try {
      data = (await res.json()) as TossBody;
    } catch {
      if (res.ok || res.status >= 500) return { kind: "unknown", message: "parse" };
    }

    if (res.ok) return { kind: "done", payment: toView(data, input.paymentKey) };
    if (data.code === "ALREADY_PROCESSED_PAYMENT") return { kind: "already_processed" };
    if (res.status >= 500 || TRANSIENT_CODE.test(String(data.code ?? ""))) {
      return { kind: "unknown", message: data.message || `http ${res.status}` };
    }
    return {
      kind: "declined",
      code: String(data.code ?? `HTTP_${res.status}`),
      message: data.message || "결제 승인에 실패했습니다.",
    };
  }

  async getPayment(paymentKey: string): Promise<TossPaymentView | null> {
    const res = await this.fetchImpl(`${BASE}/${encodeURIComponent(paymentKey)}`, {
      headers: { Authorization: authHeader(this.secretKey) },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`toss getPayment http ${res.status}`);
    return toView((await res.json()) as TossBody, paymentKey);
  }
}

/**
 * 로컬 개발 전용 — Toss 없이 승인 성공을 흉내낸다. production 에서는 index.ts 가 만들지 않는다.
 */
export class SandboxTossGateway implements TossGateway {
  async confirm(input: {
    paymentKey: string;
    orderId: string;
    amount: number;
  }): Promise<TossConfirmOutcome> {
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

  async getPayment(): Promise<TossPaymentView | null> {
    return null;
  }
}
