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
  /** sandbox = 로컬/테스트 결제 시뮬레이션 (UI에 베타 표기 ✗) */
  paymentMode?: "sandbox" | "toss";
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
}: CheckoutStepProps) {
  const sandbox = paymentMode !== "toss";

  return (
    <div className="rounded-2xl border border-accent/25 bg-white/90 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-700">팩 선택 · 결제</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-700">{PAY_NUDGE_LINES[nudgeIdx]}</p>
      <PackPicker packId={packId} setPackId={setPackId} bullets={packBullets} />
      <p className="mt-4 text-2xl font-semibold">₩{amount.toLocaleString("ko-KR")}</p>
      <p className="mt-1 text-xs text-ink-500">
        {packName} · {packTagline}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
        결제하시면{" "}
        <Link href="/legal/terms" className="underline hover:text-ink-600" target="_blank">
          이용약관
        </Link>
        과{" "}
        <Link href="/legal/refund" className="underline hover:text-ink-600" target="_blank">
          환불 정책
        </Link>
        에 동의한 것으로 봅니다. 결제는 컷 생성·제공 의사표시이며,{" "}
        <strong className="font-medium text-ink-500">생성이 성공하면</strong> 제공이 시작됩니다.{" "}
        <strong className="font-medium text-ink-500">
          환불은 시스템 문제로 파일을 전달받지 못한 경우
        </strong>
        에만 검토하고, 품질은 받기 전 다시 만들기·A/S로 안내합니다. 배송은 없습니다.
      </p>
      <button
        type="button"
        onClick={checkout}
        disabled={paying || !!busyKind || !hasSelfie}
        className="mt-4 w-full rounded-xl bg-ink-950 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {paying ? "결제 처리 중…" : !hasSelfie ? "셀카를 올린 뒤 결제" : "결제하기"}
      </button>
      {sandbox ? (
        <p className="mt-2 text-center text-[10px] text-ink-300">테스트 결제 모드</p>
      ) : null}
      <InlineError at="checkout" errorAt={errorAt} message={error} />
    </div>
  );
}
