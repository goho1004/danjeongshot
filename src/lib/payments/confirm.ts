/**
 * 결제 승인 멱등 코어 (장수 M0 → 단정샷 이식 · 로직 무변경).
 *
 * 콜백·새로고침·뒤로가기·웹훅이 몇 번, 동시에 들어와도 Toss confirm 은 order 당 한 번만 나간다.
 *  1) 서버가 아는 금액과 대조 (클라이언트 값 불신)
 *  2) store.claim — orderId 리스 + 상태 조건으로 승자 1명만 통과
 *  3) 승자만 Toss confirm 호출 (결정적 Idempotency-Key)
 *  4) 결과를 CAS 로 반영 · 애매한 실패는 락을 유지해 승인됐을 수 있는 결제를 재승인하지 않는다
 */

import {
  PaymentKeyReusedError,
  type ConfirmDeps,
  type ConfirmResult,
  type PaymentRecord,
  type TossPaymentView,
} from "./types";

/** 단정샷 전용 접두사 — 장수(`jsu-`)와 Toss 멱등키 공간을 공유하지 않는다 */
export function confirmIdempotencyKey(orderId: string, paymentKey: string): string {
  return `djs-confirm-${orderId}-${paymentKey}`.slice(0, 300);
}

function fail(
  code: Extract<ConfirmResult, { ok: false }>["code"],
  message: string,
  retryable: boolean
): ConfirmResult {
  return { ok: false, code, message, retryable };
}

/**
 * 번들이 갈리면(HMR·서버리스 다중 모듈 인스턴스) `instanceof` 가 깨져
 * 「이미 쓰인 결제키」가 「저장소 장애」로 둔갑한다 — name 도 함께 본다.
 */
function isKeyReused(e: unknown): boolean {
  if (e instanceof PaymentKeyReusedError) return true;
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { name?: unknown }).name === "PaymentKeyReusedError"
  );
}

function claimError(e: unknown): ConfirmResult {
  if (isKeyReused(e)) {
    return fail(
      "PAYMENT_KEY_MISMATCH",
      "이미 다른 주문에 쓰인 결제입니다. 고객센터로 문의해 주세요.",
      false
    );
  }
  return fail("STORE_UNAVAILABLE", "잠시 후 다시 시도해 주세요.", true);
}

function viewMatches(
  v: TossPaymentView,
  want: { orderId: string; paymentKey: string; amount: number }
): boolean {
  return (
    v.status === "DONE" &&
    v.orderId === want.orderId &&
    v.paymentKey === want.paymentKey &&
    v.totalAmount === want.amount
  );
}

/** paid 로 확정된 뒤의 공통 마무리 — 주문 반영은 멱등 후처리에 맡긴다 */
async function runOnPaid(
  deps: ConfirmDeps,
  record: PaymentRecord,
  outcome: "confirmed" | "replayed"
): Promise<ConfirmResult> {
  try {
    await deps.onPaid(record.orderId, record);
  } catch {
    // 결제 기록은 이미 paid — 같은 요청을 다시 보내면 replayed 경로가 후처리를 다시 시도한다
    return fail(
      "POST_PAID_FAILED",
      "결제는 확인됐지만 주문 반영에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      true
    );
  }
  return { ok: true, outcome, record };
}

async function handleNotWon(
  deps: ConfirmDeps,
  record: PaymentRecord,
  paymentKey: string
): Promise<ConfirmResult> {
  if (record.paymentKey !== paymentKey) {
    return fail(
      "PAYMENT_KEY_MISMATCH",
      "이 주문에는 다른 결제가 이미 진행됐습니다. 고객센터로 문의해 주세요.",
      false
    );
  }
  if (record.status === "paid") return runOnPaid(deps, record, "replayed");
  // confirming(락 유효) — 다른 요청이 승인 중
  return fail(
    "PAYMENT_IN_PROGRESS",
    "결제를 확인하고 있어요. 잠시 후 다시 확인해 주세요.",
    true
  );
}

export async function confirmPaymentOnce(
  deps: ConfirmDeps,
  input: { orderId: string; paymentKey: string; amount: number }
): Promise<ConfirmResult> {
  const now = deps.now ?? Date.now;
  const { orderId, paymentKey, amount } = input;

  const expected = await deps.getOrderAmount(orderId);
  if (expected == null) {
    return fail("ORDER_NOT_FOUND", "주문을 찾을 수 없습니다.", false);
  }
  if (!Number.isFinite(amount) || amount !== expected) {
    return fail("AMOUNT_MISMATCH", "결제 금액이 주문과 다릅니다.", false);
  }

  let claim;
  try {
    const t = now();
    claim = await deps.store.claim({
      orderId,
      paymentKey,
      amount: expected,
      now: t,
      leaseUntil: t + deps.leaseMs,
    });
  } catch (e) {
    return claimError(e);
  }
  if (!claim.won) return handleNotWon(deps, claim.record, paymentKey);

  // ── 승자: 이 호출만 Toss 에 간다 ──
  let outcome;
  try {
    outcome = await deps.toss.confirm({
      paymentKey,
      orderId,
      amount: expected,
      idempotencyKey: confirmIdempotencyKey(orderId, paymentKey),
    });
  } catch {
    outcome = { kind: "unknown" as const, message: "toss confirm threw" };
  }

  let view: TossPaymentView | null = null;
  if (outcome.kind === "done") {
    view = outcome.payment;
  } else if (outcome.kind === "already_processed") {
    // 같은 paymentKey 는 이미 승인됐다는 뜻 — 맹신하지 말고 Toss 조회로 확인
    try {
      view = await deps.toss.getPayment(paymentKey);
    } catch {
      view = null;
    }
    if (!view) {
      return fail("TOSS_UNKNOWN", "결제 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", true);
    }
  } else if (outcome.kind === "declined") {
    await deps.store.markFailed(orderId, paymentKey, outcome.code, now()).catch(() => false);
    return fail("TOSS_DECLINED", outcome.message || "결제 승인에 실패했습니다.", false);
  } else {
    // unknown — 승인됐을 수 있다. 실패로 닫지 않고 락 유지(만료 후 같은 키로 재인수)
    return fail("TOSS_UNKNOWN", "결제 승인 결과를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", true);
  }

  if (!viewMatches(view, { orderId, paymentKey, amount: expected })) {
    // 돈이 나갔을 수 있는데 주문과 안 맞음 — paid 로 올리지 않고 락 유지, 사람이 본다
    return fail("TOSS_VERIFY_FAILED", "결제 정보가 주문과 맞지 않습니다. 고객센터로 문의해 주세요.", false);
  }

  return settleApproved(deps, orderId, paymentKey);
}

/** Toss 승인이 확인된 뒤 paid 전이 + 후처리 */
async function settleApproved(
  deps: ConfirmDeps,
  orderId: string,
  paymentKey: string
): Promise<ConfirmResult> {
  const now = deps.now ?? Date.now;
  let marked: boolean;
  try {
    marked = await deps.store.markPaid(orderId, paymentKey, now());
  } catch {
    return fail("STORE_UNAVAILABLE", "잠시 후 다시 시도해 주세요.", true);
  }
  const record = await deps.store.get(orderId).catch(() => null);
  if (!record) return fail("STORE_UNAVAILABLE", "잠시 후 다시 시도해 주세요.", true);

  if (marked) return runOnPaid(deps, record, "confirmed");
  // CAS 실패 — 느려서 락이 만료되어 다른 호출이 먼저 끝냈을 수 있음
  if (record.status === "paid" && record.paymentKey === paymentKey) {
    return runOnPaid(deps, record, "replayed");
  }
  return fail("PAYMENT_IN_PROGRESS", "결제를 확인하고 있어요. 잠시 후 다시 확인해 주세요.", true);
}

/**
 * 웹훅 재동기화 — successUrl 유실 대비.
 * 웹훅 본문은 신뢰하지 않고 paymentKey 만 받아 Toss 조회로 사실을 확인한다.
 * 이미 Toss 가 DONE 이므로 confirm 재호출 없이 claim → paid 전이만 한다.
 */
export async function reconcilePayment(
  deps: ConfirmDeps,
  input: { paymentKey: string }
): Promise<ConfirmResult> {
  const now = deps.now ?? Date.now;
  let view: TossPaymentView | null;
  try {
    view = await deps.toss.getPayment(input.paymentKey);
  } catch {
    view = null;
  }
  if (!view) {
    return fail("TOSS_UNKNOWN", "결제 상태를 확인하지 못했습니다.", true);
  }
  if (view.status !== "DONE") {
    // 취소·대기 등은 M0 범위 밖 — paid 로 올리지 않는다
    return fail("TOSS_VERIFY_FAILED", `결제 상태가 DONE 이 아닙니다: ${view.status}`, false);
  }

  const expected = await deps.getOrderAmount(view.orderId);
  if (expected == null) return fail("ORDER_NOT_FOUND", "주문을 찾을 수 없습니다.", false);
  if (view.totalAmount !== expected) {
    return fail("AMOUNT_MISMATCH", "결제 금액이 주문과 다릅니다.", false);
  }

  let claim;
  try {
    const t = now();
    claim = await deps.store.claim({
      orderId: view.orderId,
      paymentKey: view.paymentKey,
      amount: expected,
      now: t,
      leaseUntil: t + deps.leaseMs,
    });
  } catch (e) {
    return claimError(e);
  }
  if (!claim.won) return handleNotWon(deps, claim.record, view.paymentKey);
  return settleApproved(deps, view.orderId, view.paymentKey);
}
