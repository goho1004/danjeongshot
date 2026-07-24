/**
 * 토스페이먼츠 — 테스트/라이브 키로 승인.
 * PAYMENT_MODE=sandbox → 키 없이 즉시 결제 완료
 * PAYMENT_MODE=toss → 클라이언트 결제창 + 서버 confirm
 */

export type PaymentMode = "sandbox" | "toss";

export function getPaymentMode(): PaymentMode {
  const m = (process.env.PAYMENT_MODE || "sandbox").trim().toLowerCase();
  if (m === "toss" && process.env.TOSS_SECRET_KEY?.trim() && process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim()) {
    return "toss";
  }
  return "sandbox";
}

export function getTossClientKey(): string | null {
  return process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() || null;
}

export function getTossSecretKey(): string | null {
  return process.env.TOSS_SECRET_KEY?.trim() || null;
}

export type TossConfirmResult =
  | { ok: true; paymentKey: string; orderId: string; totalAmount: number; method?: string }
  | { ok: false; code?: string; message: string };

/** 토스 결제 승인 API */
export async function confirmTossPayment(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossConfirmResult> {
  const secret = getTossSecretKey();
  if (!secret) {
    return { ok: false, message: "TOSS_SECRET_KEY가 없습니다." };
  }

  const auth = Buffer.from(`${secret}:`).toString("base64");
  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      amount: input.amount,
    }),
  });

  const data = (await res.json()) as {
    paymentKey?: string;
    orderId?: string;
    totalAmount?: number;
    method?: string;
    code?: string;
    message?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      code: data.code,
      message: data.message || "결제 승인에 실패했습니다.",
    };
  }

  return {
    ok: true,
    paymentKey: String(data.paymentKey || input.paymentKey),
    orderId: String(data.orderId || input.orderId),
    totalAmount: Number(data.totalAmount ?? input.amount),
    method: data.method,
  };
}
