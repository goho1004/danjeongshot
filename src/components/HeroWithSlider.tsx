"use client";

import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { POSITIONING, TRUST_CHIPS } from "@/lib/purposes";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

const HERO = {
  beforeSrc: "/gallery/real-w-mid-before.png",
  afterSrc: "/gallery/real-w-mid-after.png",
  title: "이력서 · 여성 · 중년",
};

/** 시안형 히어로: 카피 + BA 슬라이더 증거 */
export default function HeroWithSlider() {
  return (
    <section className="hero-wash relative min-h-[100svh] pt-16">
      <div className="grain" aria-hidden />
      <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-10 px-5 pb-16 pt-10 md:grid-cols-2 md:gap-14 md:px-8 md:pb-24 md:pt-14">
        <div>
          <p className="animate-rise text-sm font-medium tracking-wide text-studio-deep">
            {BRAND.beta} · {BRAND.speed} · 마감 전에 쓰는 단정 프사
          </p>
          <h1 className="animate-rise-2 mt-4 font-display text-[2.2rem] leading-[1.1] tracking-tight text-ink-950 sm:text-[2.6rem] md:text-5xl md:leading-[1.08]">
            <span className="block text-studio">{BRAND.sign}</span>
            <span className="mt-2 block font-normal italic text-ink-700">
              급할 때,
              <br />
              나처럼 보이는
              <br />
              단정 프사.
            </span>
          </h1>
          <p className="animate-rise-3 mt-6 max-w-md text-base leading-relaxed text-ink-500 md:text-lg">
            {POSITIONING.oneLiner} 과보정 없이, 스튜디오 전에 쓸 한 장.
          </p>
          <div className="animate-rise-3 mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/make"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-studio px-7 py-3.5 text-base font-semibold text-white shadow-lift transition hover:bg-studio-deep"
            >
              용도 고르고 만들기
              <span aria-hidden className="text-studio-soft">
                →
              </span>
            </Link>
            <a
              href="#gallery"
              className="focus-ring rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink-700 ring-1 ring-ink-100 transition hover:text-studio"
            >
              샘플 비교 보기
            </a>
          </div>
          <ul className="animate-fade mt-8 flex flex-wrap gap-2">
            {TRUST_CHIPS.map((c) => (
              <li
                key={c}
                className="rounded-lg border border-ink-100 bg-white/80 px-2.5 py-1.5 text-[11px] font-medium text-ink-500"
              >
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-ink-400">
            여권·민원 제출용 사진이 아닙니다. 민간 서류·프로필 전용.
          </p>
        </div>

        <div className="animate-rise-3 mx-auto w-full max-w-[380px] md:max-w-none">
          <BeforeAfterSlider
            beforeSrc={HERO.beforeSrc}
            afterSrc={HERO.afterSrc}
            beforeAlt={`${HERO.title} · 전`}
            afterAlt={`${HERO.title} · 후`}
            aspectClass="aspect-[3/4]"
          />
        </div>
      </div>
    </section>
  );
}
