import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { BRAND } from "@/lib/brand";

export default function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <header className="border-b border-ink-100 bg-white/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-display text-lg tracking-brand text-ink-950 md:text-xl">
            {BRAND.sign}
          </Link>
          <Link href="/make?resume=1" className="text-xs font-medium text-accent-deep">
            만들기
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-3xl text-ink-950">{title}</h1>
        <p className="mt-2 text-xs text-ink-400">시행일 2026-07-23 · 법무 최종 검수 전 초안</p>
        <div className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-ink-700">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
