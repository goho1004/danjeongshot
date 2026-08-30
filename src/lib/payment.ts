/**
 * 포트원(PortOne) v2 브라우저 결제 — 카카오페이 Easy Pay.
 * storeId / channelKey 는 NEXT_PUBLIC_* (placeholder → 회장님 발급값).
 */
import PortOne from "@portone/browser-sdk/v2";

export type KakaoPayRequest = {
  orderId: string;
  orderName: string;
  amount: number;
  customerEmail?: string;
  customerName?: string;
};

export function portoneConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_PORTONE_STORE_ID?.trim() &&
      process.env.NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY?.trim() &&
      !process.env.NEXT_PUBLIC_PORTONE_STORE_ID.includes("xxxxxxxx") &&
      !process.env.NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY.includes("xxxxxxxx")
  );
}

export async function requestKakaoPayment({
  orderId,
  orderName,
  amount,
  customerEmail,
  customerName,
}: KakaoPayRequest) {
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID?.trim();
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY?.trim();
  if (!storeId || !channelKey) {
    throw new Error("포트원 키가 없습니다. .env.local 에 STORE_ID·CHANNEL_KEY 를 넣어 주세요.");
  }
  if (storeId.includes("xxxxxxxx") || channelKey.includes("xxxxxxxx")) {
    throw new Error("포트원 placeholder 키입니다. 회장님 발급값으로 교체해 주세요.");
  }

  return PortOne.requestPayment({
    storeId,
    channelKey,
    paymentId: orderId,
    orderName,
    totalAmount: amount,
    currency: "CURRENCY_KRW",
    payMethod: "EASY_PAY",
    easyPay: { easyPayProvider: "EASY_PAY_PROVIDER_KAKAOPAY" },
    customer: {
      email: customerEmail,
      fullName: customerName,
    },
  });
}
