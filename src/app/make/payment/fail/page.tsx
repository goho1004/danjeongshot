"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function PaymentFailInner() {
  const params = useSearchParams();
  const code = params.get("code");
  const message = params.get("message") || "결제가 취소되었거나 실패했습니다.";

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
