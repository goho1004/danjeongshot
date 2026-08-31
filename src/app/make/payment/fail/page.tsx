"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function failHint(code: string | null): string {
  if (code === "PAY_PROCESS_CANCELED") {
    return "결제를 취소하셨습니다. 다시 시도해 주세요.";
  }
  if (code === "PAY_PROCESS_ABORTED") {
    return "결제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (code === "REJECT_CARD_COMPANY") {
    return "카드사에서 결제를 거절했습니다. 다른 카드로 시도해 주세요.";
  }
  return "";
}

function PaymentFailInner() {
  const params = useSearchParams();
  const code = params.get("code");
  const hint = failHint(code);
  const message =
    hint || params.get("message") || "결제가 취소되었거나 실패했습니다.";

  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <p className="font-display text-2xl text-ink-950">증명사진 -단정-</p>
      <p className="mt-6 text-sm text-ink-700">{message}</p>
      {code && <p className="mt-2 text-xs text-ink-400">코드: {code}</p>}
      <Link
        href="/make"
        className="mt-8 inline-block rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold text-white"
      >
        만들기로 돌아가기
      </Link>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<p className="p-10 text-center text-ink-500">불러오는 중…</p>}>
      <PaymentFailInner />
    </Suspense>
  );
}
