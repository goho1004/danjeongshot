import { Suspense } from "react";
import Link from "next/link";
import MakeStudio from "@/components/make/MakeStudio";
import SiteFooter from "@/components/SiteFooter";
import { BRAND } from "@/lib/brand";

export default function ResultPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <Link href="/" className="font-display text-lg tracking-brand text-ink-950 md:text-xl">
            {BRAND.sign}
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/make" className="text-[11px] font-medium text-ink-500 hover:text-ink-800">
              만들기
            </Link>
            <p className="text-[11px] font-medium text-ink-400">{BRAND.speed}</p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-studio">Result</p>
        <h1 className="mt-2 font-display text-3xl text-ink-950 md:text-4xl">결과</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">
          결제 후 컷을 만들고, 마음에 드는 한 장을 고른 뒤 받으세요. {BRAND.speed}.
        </p>
        <Suspense fallback={<p className="mt-8 text-ink-500">로딩…</p>}>
          <MakeStudio variant="result" />
        </Suspense>
      </div>
      <SiteFooter />
    </div>
  );
}
