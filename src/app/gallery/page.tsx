import type { Metadata } from "next";
import Link from "next/link";
import GalleryView from "@/components/GalleryView";
import SiteFooter from "@/components/SiteFooter";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `갤러리 — ${BRAND.sign}`,
  description: `셀카와 ${BRAND.sign} 전후 예시. ${BRAND.speed}. 이력서·링크드인·인화용. 과한 보정 없이 닮은 단정함. 여권·관공서용은 아닙니다.`,
};

export default function GalleryPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-paper text-ink-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-ink-100/60 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            className="focus-ring font-display text-xl tracking-brand text-ink-950 transition hover:text-studio md:text-2xl"
          >
            {BRAND.sign}
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-500 md:flex">
            <Link href="/gallery" className="focus-ring rounded text-ink-900">
              갤러리
            </Link>
            <Link href="/make" className="focus-ring rounded hover:text-ink-900">
              만들기
            </Link>
            <Link href="/help" className="focus-ring rounded hover:text-ink-900">
              도움말
            </Link>
          </nav>
          <Link
            href="/make"
            className="focus-ring rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-studio"
          >
            만들기
          </Link>
        </div>
      </header>

      <main className="pt-16">
        <section className="hero-wash relative border-b border-ink-100">
          <div className="grain" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
            <p className="animate-rise text-xs font-semibold tracking-wide text-studio">
              전 · 후
            </p>
            <h1 className="animate-rise-2 mt-3 font-display text-4xl tracking-tight text-ink-950 md:text-6xl">
              갤러리
            </h1>
            <p className="animate-rise-3 mt-5 max-w-xl text-base leading-relaxed text-ink-500 md:text-lg">
              셀카에서 단정 프사로. 용도별로 보면, 결제 후 받는 결이 어떤지 감이 옵니다. 과한
              미모 보정이나 네컷 감성은 아니에요.
            </p>
            <p className="animate-fade mt-4 max-w-xl text-xs leading-relaxed text-ink-400">
              아래는 구성·톤 예시입니다. 실제 결과물은 업로드한 셀카와 선택한 용도에 따라
              달라집니다. 여권·관공서 제출용은 아닙니다.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
          <GalleryView />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
