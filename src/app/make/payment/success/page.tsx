"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  loadCheckoutSession,
  persistRestorePaid,
} from "@/lib/sessionHeavy";

const SESSION_KEY = "djs_checkout_session";

function PaymentSuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState("결제를 확인하고 있어요…");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = params.get("amount");
    if (!paymentKey || !orderId || !amount) {
      setErr("결제 정보가 없습니다. 만들기 화면에서 다시 시도해 주세요.");
      return;
    }

    (async () => {
      try {
        const saved = await loadCheckoutSession(SESSION_KEY);
        if (saved && saved.orderId !== orderId) {
          setErr("주문 정보가 맞지 않습니다. 고객센터로 문의해 주세요.");
          return;
        }

        const res = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
            orderTicket: saved?.orderTicket || "",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErr(data.error || "결제 승인에 실패했습니다.");
          return;
        }

        const restore = {
          v: 2,
          paid: true,
          orderId: data.orderId as string,
          unlockToken: data.unlockToken as string,
          orderTicket: saved?.orderTicket || data.unlockToken,
          amountKrw: data.amountKrw,
          packId: data.packId,
          includeLayout: data.includeLayout,
          layoutPaidSizeIds: data.layoutPaidSizeIds || [],
          redoUsed: data.redoUsed ?? 0,
          asvUsed: data.asvUsed ?? 0,
          purposeId: saved?.purposeId,
          previewAssetId: saved?.previewAssetId ?? null,
          previewVault: saved?.previewVault ?? null,
          shots: saved?.shots ?? [],
          selectedShotId: saved?.selectedShotId ?? null,
          subjectLook: saved?.subjectLook,
          subjectSeason: saved?.subjectSeason,
          selfie: saved?.selfie ?? null,
        };
        await persistRestorePaid("djs_restore_paid", restore);
        sessionStorage.removeItem(SESSION_KEY);
        setMsg("결제되었습니다. 만들기 화면으로 돌아갈게요.");
        router.replace("/make?paid=1");
      } catch {
        setErr("결제 확인 중 오류가 발생했습니다.");
      }
    })();
  }, [params, router]);

  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <p className="font-display text-2xl text-ink-950">증명사진 -단정-</p>
      {err ? (
        <>
          <p className="mt-6 text-sm text-red-700" role="alert">
            {err}
          </p>
          <Link href="/make" className="mt-6 inline-block text-sm font-semibold text-studio underline">
            만들기로 돌아가기
          </Link>
        </>
      ) : (
        <p className="mt-6 text-sm text-ink-500">{msg}</p>
      )}
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-5 py-20 text-center text-sm text-ink-500">
          결제 확인 중…
        </div>
      }
    >
      <PaymentSuccessInner />
    </Suspense>
  );
}
