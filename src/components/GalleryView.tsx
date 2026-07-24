"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GALLERY_ITEMS, GALLERY_TABS, type GalleryItem } from "@/lib/gallery";
import type { PurposeId } from "@/lib/purposes";

function PairCard({ item }: { item: GalleryItem }) {
  return (
    <article className="group">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <figure className="overflow-hidden rounded-sm bg-ink-50 shadow-soft ring-1 ring-ink-100/80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.beforeSrc}
            alt={`${item.title} · 전`}
            className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
          <figcaption className="border-t border-ink-100 bg-white px-2 py-1.5 text-[10px] font-semibold tracking-wide text-ink-400">
            전 · 셀카
          </figcaption>
        </figure>
        <figure className="overflow-hidden rounded-sm bg-ink-50 shadow-soft ring-1 ring-ink-100/80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.afterSrc}
            alt={`${item.title} · 후`}
            className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
          <figcaption className="border-t border-ink-100 bg-white px-2 py-1.5 text-[10px] font-semibold tracking-wide text-studio">
            후 · 단정
          </figcaption>
        </figure>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-ink-900">{item.title}</h3>
      <p className="mt-0.5 text-xs text-ink-400">{item.note}</p>
    </article>
  );
}

export default function GalleryView() {
  const [tab, setTab] = useState<(typeof GALLERY_TABS)[number]["id"]>("all");

  const items = useMemo(() => {
    if (tab === "all") return GALLERY_ITEMS;
    return GALLERY_ITEMS.filter((i) => i.purposeId === (tab as PurposeId));
  }, [tab]);

  return (
    <div>
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="갤러리 용도"
      >
        {GALLERY_TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              className={`focus-ring rounded-full px-4 py-2 text-sm font-semibold transition ${
                on
                  ? "bg-ink-950 text-white"
                  : "bg-white text-ink-500 ring-1 ring-ink-100 hover:text-ink-900"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12">
        {items.map((item) => (
          <PairCard key={item.id} item={item} />
        ))}
      </div>

      {items.length === 0 && (
        <p className="mt-12 text-center text-sm text-ink-400">이 용도 샘플이 아직 없어요.</p>
      )}

      <div className="mt-16 rounded-sm border border-ink-100 bg-white px-5 py-8 text-center md:px-10">
        <p className="font-display text-2xl text-ink-950 md:text-3xl">내 사진으로도 이렇게</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-500">
          과한 보정 없이, 닮은 단정함. 여권·관공서 제출용은 아닙니다. 마음에 드는 용도로 시작해
          보세요.
        </p>
        <Link
          href="/make"
          className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-studio px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-studio-deep"
        >
          용도 고르고 만들기
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
