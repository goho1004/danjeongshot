/**
 * 결제 승인 요청 in-flight 공유 (장수 M0 이식).
 *
 * 승인 화면의 useEffect 는 React StrictMode 이중 실행·리렌더·뒤로가기로 여러 번 돈다.
 * 서버에 원자 claim 이 생겼어도 브라우저가 같은 승인을 N번 쏠 이유는 없다 —
 * 같은 (orderId, paymentKey) 는 **모듈 레벨**에서 하나의 Promise 를 나눠 쓴다.
 *
 * 성공/실패가 정해지면 항목을 지운다: 사람이 「다시 시도」를 눌렀을 때 재요청되어야 한다.
 */

export type ConfirmOnceInput = {
  paymentKey: string;
  orderId: string;
  amount: number;
  orderTicket: string;
};

export type ConfirmOnceResult = {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
};

const g = globalThis as unknown as {
  __djsConfirmInflight?: Map<string, Promise<ConfirmOnceResult>>;
};
if (!g.__djsConfirmInflight) g.__djsConfirmInflight = new Map();

async function postConfirm(
  input: ConfirmOnceInput,
  fetchImpl: typeof fetch
): Promise<ConfirmOnceResult> {
  const res = await fetchImpl("/api/checkout/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      amount: input.amount,
      orderTicket: input.orderTicket,
    }),
  });
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    /* 본문 없음 — status 로만 판단 */
  }
  return { ok: res.ok, status: res.status, data };
}

export function confirmOnce(
  input: ConfirmOnceInput,
  fetchImpl: typeof fetch = fetch
): Promise<ConfirmOnceResult> {
  const key = `${input.orderId}::${input.paymentKey}`;
  const running = g.__djsConfirmInflight!.get(key);
  if (running) return running;

  const p = postConfirm(input, fetchImpl).finally(() => {
    g.__djsConfirmInflight!.delete(key);
  });
  g.__djsConfirmInflight!.set(key, p);
  return p;
}

/** 테스트 전용 — 모듈 레벨 맵을 비운다 */
export function __resetConfirmInflight(): void {
  g.__djsConfirmInflight!.clear();
}
