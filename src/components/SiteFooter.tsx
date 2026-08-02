import Link from "next/link";
import { APP_VERSION, BRAND } from "@/lib/brand";
import { bizField, getBusinessInfo, isBizPreRegistration } from "@/lib/business";

export default function SiteFooter() {
  const b = getBusinessInfo();
  const preReg = isBizPreRegistration(b);

  return (
    <footer className="border-t border-ink-100 bg-white py-10">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-lg tracking-brand text-ink-700">{BRAND.sign}</span>
              <span className="rounded-full bg-studio/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-studio-deep">
                {BRAND.beta}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-400">
              © {new Date().getFullYear()} · {BRAND.speed} · {BRAND.legal} · v{APP_VERSION}
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-400">
            <Link href="/#gallery" className="hover:text-ink-700">
              갤러리
            </Link>
            <Link href="/make?resume=1" className="hover:text-ink-700">
              만들기
            </Link>
            <Link href="/legal/terms" className="hover:text-ink-700">
              이용약관
            </Link>
            <Link href="/legal/refund" className="hover:text-ink-700">
              환불·청약철회
            </Link>
            <Link href="/photobox" className="hover:text-ink-700">
              포토박스
            </Link>
            <Link href="/help" className="hover:text-ink-700">
              도움말
            </Link>
            <Link href="/legal/privacy" className="hover:text-ink-700">
              개인정보
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-ink-100 pt-6 text-[11px] leading-relaxed text-ink-400">
          {preReg ? (
            <>
              <p className="font-medium text-ink-500">베타 · 사업자 등록 전</p>
              <p className="mt-2 text-ink-500">{BRAND.betaNote}</p>
              <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                <li>상호: {bizField(b.tradeName, BRAND.sign)}</li>
                <li>문의: {bizField(b.email)}</li>
              </ul>
              <p className="mt-2 text-ink-400">
                사업자등록번호·통신판매업 신고번호·대표·주소는 등록 후 이 자리에 올립니다.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-ink-500">사업자 · 전자상거래</p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                <li>상호: {bizField(b.tradeName)}</li>
                <li>사업자 구분: {bizField(b.entityType)}</li>
                <li>대표: {bizField(b.ceo)}</li>
                <li>사업자등록번호: {bizField(b.bizNo)}</li>
                <li>통신판매업 신고번호: {bizField(b.mailOrderNo)}</li>
                <li>이메일: {bizField(b.email)}</li>
                <li className="sm:col-span-2">사업장 주소: {bizField(b.address)}</li>
                <li>전화: {bizField(b.phone)}</li>
              </ul>
            </>
          )}
          <p className="mt-3 text-ink-500">{b.vatNote}</p>
          <p className="mt-1 text-ink-400">{b.taxInvoiceNote}</p>
          <p className="mt-2 text-ink-300">
            여권·신분증·관공서 제출용을 보장하지 않습니다. 디지털콘텐츠 특성상 다운로드 후 환불이
            제한될 수 있습니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
