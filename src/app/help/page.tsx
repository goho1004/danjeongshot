import Link from "next/link";
import LegalShell from "@/components/LegalShell";
import ShootTips from "@/components/ShootTips";
import { CS_FAQ } from "@/lib/csTriage";

export const metadata = {
  title: "도움말 — 증명사진 -단정-",
};

export default function HelpPage() {
  return (
    <LegalShell title="도움말 · CS">
      <section className="rounded-xl border border-accent/25 bg-accent-soft/40 p-4 text-sm text-ink-800">
        <p className="font-semibold text-accent-deep">결제 후 이렇게 나뉩니다</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-700">
          <li>
            <strong>마음에 들어요</strong> → PNG 다운로드 → 종료 (이후 환불 불가)
          </li>
          <li>
            <strong>마음에 안 들어요</strong> → 다시 만들기 1회 (같은 셀카 또는{" "}
            <strong>다른 사진 업로드</strong>)
          </li>
          <li>
            그래도 아쉬우면 → <strong>A/S 서비스</strong> 1회 (역시 다른 사진 가능)
          </li>
        </ol>
        <p className="mt-2 text-xs text-ink-500">
          품질이 아쉬우면 환불보다 다시 만들기를 권합니다. 결제 전 미리보기는 기기당 하루 횟수가
          있어, 재접속만으로 초기화되지 않아요. 팩은 기본(₩9,900 · PNG)과 플러스(₩14,900 · PNG +
          반명함·증명) 두 가지입니다.
        </p>
      </section>

      <ShootTips id="shoot-tips" />

      <section>
        <h2 className="text-base font-semibold text-ink-950">자주 묻는 질문</h2>
        <ul className="mt-4 space-y-4">
          {CS_FAQ.map((item) => (
            <li key={item.q} className="border-b border-ink-100 pb-4">
              <p className="font-medium text-ink-900">{item.q}</p>
              <p className="mt-1 text-ink-600">{item.a}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">정책</h2>
        <p className="mt-2">
          <Link href="/legal/refund" className="text-accent-deep underline">
            환불·청약철회
          </Link>
          {" · "}
          <Link href="/legal/terms" className="text-accent-deep underline">
            이용약관
          </Link>
          {" · "}
          <Link href="/make" className="text-accent-deep underline">
            만들기
          </Link>
        </p>
      </section>
    </LegalShell>
  );
}
