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
  /** sandbox = 베타 결제 시뮬레이션 */
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
      {sandbox ? (
        <p className="mb-3 rounded-lg border border-studio/20 bg-studio/5 px-3 py-2 text-[11px] leading-relaxed text-studio-deep">
          <span className="font-semibold">베타 · 결제 시뮬레이션</span>
          — 지금은 실제 출금 없이 흐름만 확인합니다. 사업자·PG 준비 후 실결제로 바뀝니다.
        </p>
      ) : null}
      <h2 className="text-sm font-semibold text-ink-700">팩 선택 · 결제</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-700">{PAY_NUDGE_LINES[nudgeIdx]}</p>
      <PackPicker packId={packId} setPackId={setPackId} bullets={packBullets} />
      <p className="mt-4 text-2xl font-semibold">₩{amount.toLocaleString("ko-KR")}</p>
      <p className="mt-1 text-xs text-ink-500">
        {packName} · {packTagline}
        {sandbox ? " · 베타(시뮬레이션)" : ""}
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
        에 동의한 것으로 봅니다. 받은 뒤·화면 캡처 후 환불은 어렵고, 미다운로드 자동 환불은 없으며,
        여권·관공서 제출용은 아니고, 배송은 없습니다.
      </p>
      <button
        type="button"
        onClick={checkout}
        disabled={paying || !!busyKind || !hasSelfie}
        className="mt-4 w-full rounded-xl bg-ink-950 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {paying
          ? "결제 처리 중…"
          : !hasSelfie
            ? "셀카를 올린 뒤 결제"
            : sandbox
              ? "결제하기 (베타 시뮬레이션)"
              : "결제하기"}
      </button>
      <InlineError at="checkout" errorAt={errorAt} message={error} />
    </div>
  );
}
