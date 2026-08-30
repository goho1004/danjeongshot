/**
 * 포트원(PortOne) v2 브라우저 결제.
 * 기본 채널: 토스페이먼츠(tosspay_v2) — 카카오/네이버/토스/카드 커버.
 */
import PortOne from "@portone/browser-sdk/v2";

export type PaymentRequest = {
  orderId: string;
  orderName: string;
  amount: number;
  customerEmail?: string;
  customerName?: string;
};

export function portoneConfigured(): boolean {
  const store = process.env.NEXT_PUBLIC_PORTONE_STORE_ID?.trim() || "";
  const toss = process.env.NEXT_PUBLIC_PORTONE_TOSS_CHANNEL_KEY?.trim() || "";
  return Boolean(store && toss && !store.includes("xxxxxxxx") && !toss.includes("xxxxxxxx"));
}

export async function requestPayment({
  orderId,
  orderName,
  amount,
  customerEmail,
  customerName,
}: PaymentRequest) {
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID?.trim();
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_TOSS_CHANNEL_KEY?.trim();
  if (!storeId || !channelKey) {
    throw new Error(
      "포트원 키가 없습니다. STORE_ID·TOSS_CHANNEL_KEY 를 확인해 주세요."
    );
  }
  if (storeId.includes("xxxxxxxx") || channelKey.includes("xxxxxxxx")) {
    throw new Error("포트원 placeholder 키입니다. 실키로 교체해 주세요.");
  }

  return PortOne.requestPayment({
    storeId,
    channelKey,
    paymentId: orderId,
    orderName,
    totalAmount: amount,
    currency: "CURRENCY_KRW",
    payMethod: "EASY_PAY",
    customer: {
      email: customerEmail,
      fullName: customerName,
    },
  });
}

/** @deprecated use requestPayment (토스페이먼츠 채널) */
export async function requestKakaoPayment(args: PaymentRequest) {
  return requestPayment(args);
}
