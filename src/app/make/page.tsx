import { Suspense } from "react";
import Link from "next/link";
import MakeStudio from "@/components/make/MakeStudio";
import SiteFooter from "@/components/SiteFooter";
import { BRAND } from "@/lib/brand";

export default function MakePage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <Link href="/" className="font-display text-lg tracking-brand text-ink-950 md:text-xl">
            {BRAND.sign}
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/#gallery" className="text-[11px] font-medium text-ink-500 hover:text-ink-800">
              갤러리
            </Link>
            <p className="text-[11px] font-medium text-ink-400">{BRAND.speed}</p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-studio">Make</p>
        <h1 className="mt-2 font-display text-3xl text-ink-950 md:text-4xl">만들기</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">
          용도와 사진 속 분을 고른 뒤 셀카를 올리고, 기본·플러스 중 골라 결제하세요. 결제 후 「첫
          컷 보기」가 열립니다. 마음에 들 때 받거나 다시 만들 수 있어요. {BRAND.speed}.
        </p>
        <Suspense fallback={<p className="mt-8 text-ink-500">로딩…</p>}>
          <MakeStudio />
        </Suspense>
      </div>
      <SiteFooter />
    </div>
  );
}
