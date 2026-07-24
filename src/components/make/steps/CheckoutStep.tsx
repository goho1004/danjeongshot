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
}: CheckoutStepProps) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white/80 p-5">
      <p className="text-sm leading-relaxed text-ink-700">{PAY_NUDGE_LINES[nudgeIdx]}</p>
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
        에 동의한 것으로 봅니다. 받은 뒤에는 환불이 어렵고, 여권·관공서 제출용은 아니며, 배송은
        없습니다.
      </p>
      <button
        type="button"
        onClick={checkout}
        disabled={paying || !!busyKind}
        className="mt-4 w-full rounded-xl bg-ink-950 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {paying ? "결제 처리 중…" : "6. 결제하기"}
      </button>
      <InlineError at="checkout" errorAt={errorAt} message={error} />
    </div>
  );
}
