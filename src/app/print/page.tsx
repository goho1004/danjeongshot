import Link from "next/link";
import LegalShell from "@/components/LegalShell";
import { BRAND } from "@/lib/brand";
import { PRINTING_BOX, PRINTING_BOX_PAPER, PRINT_GUIDE } from "@/lib/printingBox";

export const metadata = {
  title: `${PRINT_GUIDE.label} — ${BRAND.sign}`,
  description:
    "단정 인화용 레이아웃 PNG를 프린팅박스에서 4×6으로 뽑는 방법. 배송 없음 · 내 주변 기기 찾기.",
};

export default function PrintGuidePage() {
  return (
    <LegalShell title={PRINT_GUIDE.label}>
      <p className="mt-[-1.5rem] text-sm text-ink-600">
        택배로 인화본을 보내드리지는 않아요. 받은{" "}
        <strong className="font-semibold text-ink-900">인화용 레이아웃 PNG</strong>를{" "}
        <strong className="font-semibold text-ink-900">{PRINTING_BOX.name}</strong>에서 직접 뽑으면
        됩니다.
      </p>

      <section className="rounded-2xl border-2 border-ink-950 bg-ink-950 px-5 py-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-studio-soft">
          {PRINTING_BOX.name}
        </p>
        <h2 className="mt-2 font-display text-2xl">위치 찾기 · 쿠폰·이벤트</h2>
        <p className="mt-2 text-sm text-ink-300">
          편의점·지하철·마트 무인 기기 · 앱/웹에서 업로드 → 인쇄코드 → 출력. 메인에서 진행 중인
          쿠폰·이벤트도 확인하세요.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={PRINTING_BOX.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring inline-flex rounded-full bg-studio-soft px-5 py-3 text-sm font-semibold text-ink-950 hover:bg-white"
          >
            {PRINTING_BOX.name} 위치 찾기 →
          </a>
          <a
            href={PRINTING_BOX.eventsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink-950 hover:bg-studio-soft"
          >
            쿠폰·이벤트 보러가기 →
          </a>
        </div>
        <p className="mt-4 text-xs text-ink-400">
          외부 서비스 · 쿠폰·요금·품질은 {PRINTING_BOX.name}·매장 영역 · 고객센터{" "}
          {PRINTING_BOX.supportPhone}
        </p>
      </section>

      <section className="rounded-xl border border-ink-200 bg-ink-50/80 px-4 py-3 text-sm text-ink-700">
        <p className="font-semibold text-ink-900">폰에서 파일을 못 찾을 때</p>
        <p className="mt-1 text-xs text-ink-600">
          만들기에서 <strong>사진에 저장</strong>(공유 창 → 이미지 저장)이 제일 쉽고, 안 되면{" "}
          <strong>이메일로 받기</strong>로 메일함에서 열어 {PRINTING_BOX.name}에 올리세요.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">1. 집에서 (단정)</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-700">
          <li>
            <Link href="/make?purpose=sheet" className="text-accent-deep underline">
              만들기
            </Link>
            에서 단정 PNG를 받아요.
          </li>
          <li>플러스면 반명함·증명 인화 레이아웃을 받아요. (기본은 필요 시 추가)</li>
          <li>타일 PNG를 폰 앨범·클라우드에 저장해요.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">2. {PRINTING_BOX.name}에서</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-700">
          <li>
            앱 또는{" "}
            <a
              href={PRINTING_BOX.homeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-deep underline"
            >
              {PRINTING_BOX.name} 웹
            </a>
            에서 <strong>사진 인화</strong>를 고르세요.
          </li>
          <li>
            용지 <strong>{PRINTING_BOX_PAPER.sizeLabel}</strong> · 저장한 레이아웃 PNG를 업로드하세요.
          </li>
          <li>인쇄코드(보통 7자리)를 받은 뒤, 근처 기기에 입력·결제·출력하세요.</li>
        </ol>
        <p className="mt-3 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-700">
          {PRINTING_BOX_PAPER.tip}
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">앱 (선택)</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-700">
          <li>
            <a
              href={PRINTING_BOX.androidUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-deep underline"
            >
              Google Play — {PRINTING_BOX.name}
            </a>
          </li>
          <li>
            <a
              href={PRINTING_BOX.iosUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-deep underline"
            >
              App Store — {PRINTING_BOX.name}
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">알아 두세요</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-700">
          <li>실물 배송·특정 키오스크 전용 연동은 없습니다.</li>
          <li>여권·관공서 제출용을 보장하지 않습니다.</li>
          <li>인화비는 매장·{PRINTING_BOX.name} 요금입니다.</li>
        </ul>
        <p className="mt-4">
          <Link href="/make?purpose=sheet" className="text-accent-deep underline">
            인화용으로 시작
          </Link>
          {" · "}
          <Link href="/help" className="text-accent-deep underline">
            도움말
          </Link>
        </p>
      </section>
    </LegalShell>
  );
}
