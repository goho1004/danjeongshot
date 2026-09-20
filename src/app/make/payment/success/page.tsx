"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  loadCheckoutSession,
  persistRestorePaid,
} from "@/lib/sessionHeavy";
import { confirmOnce } from "@/lib/payments/confirmOnce";

const SESSION_KEY = "djs_checkout_session";

function csBlock(code: string | null, orderId: string | null) {
  const show =
    code === "ORDER_TICKET_REQUIRED" ||
    code === "ORDER_NOT_FOUND" ||
    code === "AMOUNT_MISMATCH" ||
    // 결제 코어가 돌려주는 「사람이 봐야 하는」 실패들
    code === "POST_PAID_FAILED" ||
    code === "PAYMENT_KEY_MISMATCH" ||
    code === "TOSS_VERIFY_FAILED";
  if (!show) return null;
  return (
    <div className="mt-6 rounded-lg border border-ink-100 bg-ink-50/80 px-4 py-3 text-left text-xs leading-relaxed text-ink-600">
      <p className="font-semibold text-ink-800">결제는 됐는데 화면이 막혔다면</p>
      <ol className="mt-2 list-decimal space-y-1 pl-4">
        <li>같은 브라우저·같은 기기에서 /make 를 다시 열어 보세요.</li>
        <li>
          그래도 안 되면 고객센터로 <strong>주문번호</strong>를 보내 주세요.
          {orderId ? (
            <>
              {" "}
              (<code className="break-all text-[11px]">{orderId}</code>)
            </>
          ) : null}
        </li>
        <li>
          시스템 오류로 제품을 못 받은 경우만 환불 검토 ·{" "}
          <Link href="/legal/refund" className="underline">
            환불 안내
          </Link>
        </li>
      </ol>
    </div>
  );
}

function PaymentSuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState("결제를 확인하고 있어요…");
  const [err, setErr] = useState<string | null>(null);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [errOrderId, setErrOrderId] = useState<string | null>(null);

  useEffect(() => {
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = params.get("amount");
    if (!paymentKey || !orderId || !amount) {
      setErr("결제 정보가 없습니다. 만들기 화면에서 다시 시도해 주세요.");
      setErrCode("PAY_INFO_MISSING");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const saved = await loadCheckoutSession(SESSION_KEY);
        if (cancelled) return;
        if (saved && saved.orderId !== orderId) {
          setErr("주문 정보가 맞지 않습니다. 고객센터로 문의해 주세요.");
          setErrCode("ORDER_MISMATCH");
          setErrOrderId(orderId);
          return;
        }

        // 같은 (orderId, paymentKey) 승인은 한 번만 나간다 — StrictMode 이중 실행·리렌더 방어
        const { ok, data } = await confirmOnce({
          paymentKey,
          orderId,
          amount: Number(amount),
          orderTicket: saved?.orderTicket || "",
        });
        if (cancelled) return;
        if (!ok) {
          setErr(
            typeof data.error === "string" ? data.error : "결제 승인에 실패했습니다."
          );
          setErrCode(typeof data.code === "string" ? data.code : "CONFIRM_FAILED");
          setErrOrderId(orderId);
          return;
        }

        const restore = {
          v: 2,
          paid: true,
          orderId: String(data.orderId ?? orderId),
          unlockToken: String(data.unlockToken ?? ""),
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
        setMsg("결제되었습니다. 결과 화면으로 이동할게요.");
        const sid = encodeURIComponent(String(data.orderId || orderId));
        router.replace(`/result?session=${sid}`);
      } catch {
        if (cancelled) return;
        setErr("결제 확인 중 오류가 발생했습니다.");
        setErrCode("CONFIRM_EXCEPTION");
        setErrOrderId(orderId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <p className="font-display text-2xl text-ink-950">증명사진 -단정-</p>
      {err ? (
        <>
          <p className="mt-6 text-sm text-red-700" role="alert">
            {err}
          </p>
          {errCode && (
            <p className="mt-2 text-xs text-ink-400">코드: {errCode}</p>
          )}
          {csBlock(errCode, errOrderId)}
          <Link
            href="/make"
            className="mt-6 inline-block text-sm font-semibold text-studio underline"
          >
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
