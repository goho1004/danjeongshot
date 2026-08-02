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
      <section className="mb-4 rounded-xl border border-studio/20 bg-studio/5 p-4 text-sm text-ink-800">
        <p className="font-semibold text-studio-deep">베타 안내</p>
        <p className="mt-1 text-ink-600">
          사업자 등록 전 베타입니다. 결제는 시뮬레이션일 수 있어요. 여권·관공서 제출용은 아니며,
          받은 뒤 환불은 어렵습니다. 팩은 기본(₩9,900 · PNG)과 플러스(₩14,900 · PNG + 반명함·증명)
          입니다.
        </p>
      </section>
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
          품질이 아쉬우면 환불보다 다시 만들기를 권합니다. 무료 미리보기는 없고, 결제 후 첫 컷이
          열립니다. 팩은 기본(₩9,900 · PNG)과 플러스(₩14,900 · PNG + 반명함·증명) 두 가지입니다.
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
        <h2 className="text-base font-semibold text-ink-950">사진인화안내 · 프린팅박스</h2>
        <p className="mt-2 text-ink-700">
          배송은 없고, 레이아웃 PNG를{" "}
          <Link href="/print" className="text-accent-deep underline">
            사진인화안내
          </Link>
          대로 <strong>프린팅박스</strong>에서 뽑으면 됩니다.{" "}
          <a
            href="https://printingbox.kr/store"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-deep underline"
          >
            위치 찾기
          </a>
          {" · "}
          <a
            href="https://printingbox.kr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-deep underline"
          >
            쿠폰·이벤트
          </a>
          . 폰에서 파일을 못 찾으면 만들기에서 <strong>이메일로 받기</strong>를 쓰세요.
        </p>
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
          <Link href="/make?resume=1" className="text-accent-deep underline">
            만들기로 돌아가기
          </Link>
        </p>
      </section>
    </LegalShell>
  );
}
