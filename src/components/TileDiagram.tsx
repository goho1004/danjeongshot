"use client";

import { getSheetGrid, type PrintSize } from "@/lib/photoSheet";

/** 4×6 용지에 타일이 어떻게 깔리는지 도식 · imageUrl 있으면 실사진 타일 */
export default function TileDiagram({
  size,
  active = false,
  imageUrl,
}: {
  size: PrintSize;
  active?: boolean;
  imageUrl?: string | null;
}) {
  const { cols, rows, count } = getSheetGrid(size);
  const cells = Array.from({ length: count }, (_, i) => i);

  return (
    <div
      className={`inline-flex max-w-full shrink-0 flex-col items-center ${active ? "" : "opacity-80"}`}
    >
      <div
        className="relative overflow-hidden rounded-sm border border-ink-300 bg-white p-1 shadow-sm"
        style={{ width: 72, height: 108, maxWidth: "100%" }}
        aria-hidden
      >
        <div
          className="grid h-full w-full gap-0.5 overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {cells.map((i) =>
            imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={imageUrl}
                alt=""
                className="h-full w-full min-h-0 min-w-0 rounded-[1px] object-cover"
              />
            ) : (
              <div
                key={i}
                className={`min-h-0 min-w-0 rounded-[1px] border ${
                  active ? "border-accent/40 bg-accent-soft/80" : "border-ink-100 bg-ink-50"
                }`}
              />
            )
          )}
        </div>
      </div>
      <p className="mt-1 text-[10px] font-medium text-ink-500">
        {cols}×{rows} · {count}장
      </p>
    </div>
  );
}
