import Link from "next/link";
import LegalShell from "@/components/LegalShell";
import { BRAND } from "@/lib/brand";
import { PRINTING_BOX, PRINTING_BOX_PAPER } from "@/lib/printingBox";

export const metadata = {
  title: `포토박스 · 인화 — ${BRAND.sign}`,
  description:
    "단정 인화용 레이아웃 PNG를 프린팅박스에서 4×6으로 뽑는 방법. 배송 없음 · 내 주변 기기 찾기 링크.",
};

export default function PhotoboxPage() {
  return (
    <LegalShell title="포토박스 · 인화">
      <p className="mt-[-1.5rem] text-sm text-ink-600">
        택배로 인화본을 보내드리지는 않아요. 받은{" "}
        <strong className="font-semibold text-ink-900">인화용 레이아웃 PNG</strong>를{" "}
        {PRINTING_BOX.name}에서 직접 뽑으면 됩니다. (인핸즈와 같은 인화 안내 패턴)
      </p>

      <section className="rounded-xl border border-studio/25 bg-studio/5 p-5">
        <p className="text-sm font-semibold text-studio-deep">내 주변 {PRINTING_BOX.name} 찾기</p>
        <p className="mt-2 text-sm text-ink-700">
          편의점·지하철·마트 등에 설치된 무인 기기를 지도에서 확인할 수 있어요.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={PRINTING_BOX.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring inline-flex rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
          >
            {PRINTING_BOX.name} 위치 찾기 →
          </a>
          <a
            href={PRINTING_BOX.homeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring inline-flex rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-medium text-ink-800 hover:border-ink-400"
          >
            {PRINTING_BOX.name} 홈
          </a>
        </div>
        <p className="mt-3 text-xs text-ink-500">
          외부 서비스입니다. 인화비·품질·기기 장애는 {PRINTING_BOX.name}·매장 영역이에요. 고객센터{" "}
          {PRINTING_BOX.supportPhone}
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">집에서 (단정)</h2>
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
        <h2 className="text-base font-semibold text-ink-950">{PRINTING_BOX.name}에서</h2>
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
            에서 사진 인화를 고르세요.
          </li>
          <li>
            용지 <strong>{PRINTING_BOX_PAPER.sizeLabel}</strong> · 저장한 레이아웃 PNG를 업로드하세요.
          </li>
          <li>인쇄코드(보통 7자리)를 받은 뒤, 근처 기기에 입력·결제·출력하세요.</li>
        </ol>
        <p className="mt-3 rounded-lg border border-ink-100 bg-ink-50/80 px-3 py-2 text-xs text-ink-600">
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
