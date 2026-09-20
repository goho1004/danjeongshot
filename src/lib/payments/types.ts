/**
 * 결제 멱등 코어 — 타입. (장수 M0 이식 · PATCH_NOTE_PAYMENT_M0_FOR_DANJEONGSHOT)
 * orderId = 멱등키. confirm 은 저장소의 원자 claim + 상태 조건으로 주문당 한 번만 실행.
 * 단정샷 저장소는 Upstash(prod) · 메모리(로컬·테스트) 두 벌 — pgStore 는 이식 대상 아님.
 */

/** confirming = 승인 진행 중(락) · paid = 승인 완료 · failed = Toss가 확정 거절 */
export type PaymentStatus = "confirming" | "paid" | "failed";

export type PaymentRecord = {
  orderId: string;
  paymentKey: string;
  amount: number;
  status: PaymentStatus;
  /** confirming 락 만료 시각(ms epoch). 만료 후 같은 paymentKey 로만 재인수 가능 */
  leaseUntil: number;
  attempts: number;
  failCode: string | null;
  createdAt: number;
  updatedAt: number;
  paidAt: number | null;
};

/** 이미 다른 주문에 묶인 Toss paymentKey 로 claim 하려 할 때 (payment_key 유니크 위반) */
export class PaymentKeyReusedError extends Error {
  constructor(paymentKey: string) {
    super(`paymentKey already bound to another order: ${paymentKey.slice(0, 8)}…`);
    this.name = "PaymentKeyReusedError";
  }
}

export type ClaimInput = {
  orderId: string;
  paymentKey: string;
  amount: number;
  now: number;
  leaseUntil: number;
};

export type ClaimResult =
  | { won: true; record: PaymentRecord }
  | { won: false; record: PaymentRecord };

/**
 * 원자 연산만 노출한다. 구현체는 각 메서드를 단일 원자 단위로 실행해야 한다
 * (Upstash: SET NX 리스 · 메모리: await 없는 동기 구간).
 */
export interface PaymentStore {
  /**
   * orderId 당 최초 1건만 생성. 이미 있으면:
   *  - failed → 새 paymentKey 로 재시도 인수
   *  - confirming 이고 lease 만료 + 같은 paymentKey → 재인수(같은 멱등키로 Toss 재호출)
   *  - 그 외 → won:false (기존 레코드 반환)
   */
  claim(input: ClaimInput): Promise<ClaimResult>;
  /** confirming + 같은 paymentKey 일 때만 paid 로. 반영됐으면 true */
  markPaid(orderId: string, paymentKey: string, now: number): Promise<boolean>;
  /** confirming + 같은 paymentKey 일 때만 failed 로. 반영됐으면 true */
  markFailed(
    orderId: string,
    paymentKey: string,
    code: string,
    now: number
  ): Promise<boolean>;
  get(orderId: string): Promise<PaymentRecord | null>;
}

export type TossPaymentView = {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  /** Toss status 원문 (DONE, CANCELED, ...) */
  status: string;
};

export type TossConfirmOutcome =
  /** 승인 성공 */
  | { kind: "done"; payment: TossPaymentView }
  /** Toss 가 이미 처리된 결제라고 응답 — 호출측이 조회로 검증한다 */
  | { kind: "already_processed" }
  /** Toss 가 확정 거절(4xx) — 재시도해도 같은 결과 */
  | { kind: "declined"; code: string; message: string }
  /** 결과를 알 수 없음(네트워크·5xx·파싱) — 승인됐을 수 있으므로 락 유지 */
  | { kind: "unknown"; message: string };

export interface TossGateway {
  confirm(input: {
    paymentKey: string;
    orderId: string;
    amount: number;
    /** 결정적 키 — 같은 (orderId, paymentKey) 재호출 시 Toss 가 같은 결과를 돌려준다 */
    idempotencyKey: string;
  }): Promise<TossConfirmOutcome>;
  getPayment(paymentKey: string): Promise<TossPaymentView | null>;
}

export type ConfirmErrorCode =
  | "ORDER_NOT_FOUND"
  | "AMOUNT_MISMATCH"
  | "PAYMENT_IN_PROGRESS"
  | "PAYMENT_KEY_MISMATCH"
  | "TOSS_DECLINED"
  | "TOSS_UNKNOWN"
  | "TOSS_VERIFY_FAILED"
  | "STORE_UNAVAILABLE"
  | "POST_PAID_FAILED";

export type ConfirmResult =
  /** confirmed = 이번 호출이 승인을 실행 · replayed = 이미 paid, Toss 재호출 없음 */
  | { ok: true; outcome: "confirmed" | "replayed"; record: PaymentRecord }
  | {
      ok: false;
      code: ConfirmErrorCode;
      message: string;
      /** 클라이언트가 같은 요청을 다시 보내도 안전한지 */
      retryable: boolean;
    };

export type ConfirmDeps = {
  store: PaymentStore;
  toss: TossGateway;
  /** 서버가 아는 주문 금액(원). 없으면 null. 클라이언트 금액은 신뢰하지 않는다 */
  getOrderAmount(orderId: string): Promise<number | null>;
  /**
   * 주문을 paid 로 반영하는 후처리. **멱등이어야 한다** — 승인을 실행한 호출(confirmed)과
   * 재생(replayed) 모두에서 호출되어 주문 상태를 자가치유한다.
   * 생성 큐 등록처럼 한 번만 해야 하는 일은 result.outcome === "confirmed" 일 때만 한다.
   */
  onPaid(orderId: string, record: PaymentRecord): Promise<void>;
  now?: () => number;
  /** confirming 락 유지 시간(ms) */
  leaseMs: number;
};
