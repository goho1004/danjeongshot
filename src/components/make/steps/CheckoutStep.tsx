import Link from "next/link";
import InlineError from "@/components/make/InlineError";
import PackPicker from "@/components/make/steps/PackPicker";
import type { BusyKind } from "@/lib/make/types";
import type { PackId } from "@/lib/purposes";
import { PAY_NUDGE_LINES } from "@/lib/purposes";

type CheckoutStepProps = {
  nudgeIdx: number;
  packId: PackId;
  setPackId: (id: PackId) => void;
  packBullets: string[];
  packName: string;
  packTagline: string;
  amount: number;
  checkout: () => void;
  paying: boolean;
  busyKind: BusyKind;
  error: string | null;
  errorAt: string | null;
  hasSelfie: boolean;
  /** sandbox | toss */
  paymentMode?: "sandbox" | "toss";
  /** 주문서형 결제 UI 준비 여부 */
  tossWidgetsReady?: boolean;
  tossWidgetsError?: string | null;
};

export default function CheckoutStep({
  nudgeIdx,
  packId,
  setPackId,
  packBullets,
  packName,
  packTagline,
  amount,
  checkout,
  paying,
  busyKind,
  error,
  errorAt,
  hasSelfie,
  paymentMode = "sandbox",
  tossWidgetsReady = false,
  tossWidgetsError = null,
}: CheckoutStepProps) {
  const toss = paymentMode === "toss";
  const payDisabled =
    paying ||
    !!busyKind ||
    !hasSelfie ||
    (toss && (!tossWidgetsReady || !!tossWidgetsError));

  return (
    <div className="rounded-2xl border border-accent/25 bg-white/90 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-700">팩 선택 · 결제</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-700">{PAY_NUDGE_LINES[nudgeIdx]}</p>
      <PackPicker packId={packId} setPackId={setPackId} bullets={packBullets} />
      <p className="mt-4 text-2xl font-semibold">₩{amount.toLocaleString("ko-KR")}</p>
      <p className="mt-1 text-xs text-ink-500">
        {packName} · {packTagline}
      </p>
      <p className="mt-2 text-xs font-semibold text-ink-600">
        생성이 성공하면 제공이 시작돼요 · 환불은 시스템 결함으로 못 받은 경우만 가능해요.
      </p>
      <details className="mt-1.5 text-[11px] text-ink-400">
        <summary className="cursor-pointer underline">약관 자세히</summary>
        <p className="mt-1.5 leading-relaxed">
          결제하시면{" "}
          <Link href="/legal/terms" className="underline hover:text-ink-600" target="_blank">
            이용약관
          </Link>
          과{" "}
          <Link href="/legal/refund" className="underline hover:text-ink-600" target="_blank">
            환불 정책
          </Link>
          에 동의한 것으로 봅니다. 결제는 컷 생성·제공 의사표시이며, 품질은 받기 전 다시
          만들기·A/S로 안내합니다. 배송은 없습니다.
        </p>
      </details>

      {toss ? (
        <div className="mt-4 space-y-3">
          <div
            id="djs-toss-methods"
            className="min-h-[120px] rounded-xl border border-ink-100 bg-white p-2"
          />
          <div
            id="djs-toss-agreement"
            className="rounded-xl border border-ink-100 bg-white p-2"
          />
          {!tossWidgetsReady && !tossWidgetsError ? (
            <p className="text-center text-[11px] text-ink-400">결제수단 불러오는 중…</p>
          ) : null}
          {tossWidgetsError ? (
            <div className="space-y-1 text-center" role="alert">
              <p className="text-[11px] text-red-600">{tossWidgetsError}</p>
              <p className="text-[10px] text-ink-400">
                키가 거부되면(UNAUTHORIZED) 개발자센터의 주문서형·결제창형 테스트 키를 확인하세요.
                광고차단이 있으면 시크릿 창을 써 보세요.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={checkout}
        disabled={payDisabled}
        className="mt-4 w-full rounded-xl bg-ink-950 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {paying
          ? "결제 처리 중…"
          : !hasSelfie
            ? "셀카를 올린 뒤 결제"
            : toss && !tossWidgetsReady
              ? "결제수단 준비 중…"
              : "결제하기"}
      </button>
      {!toss ? (
        <p className="mt-2 text-center text-[10px] text-ink-300">테스트 결제 모드</p>
      ) : (
        <p className="mt-2 text-center text-[10px] leading-relaxed text-ink-400">
          위에서 결제수단을 선택한 뒤 결제하기를 눌러 주세요.
        </p>
      )}
      <InlineError at="checkout" errorAt={errorAt} message={error} />
    </div>
  );
}
