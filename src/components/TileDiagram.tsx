"use client";

import { getSheetGrid, type PrintSize } from "@/lib/photoSheet";

/** 4×6 용지에 타일이 어떻게 깔리는지 도식 */
export default function TileDiagram({
  size,
  active = false,
}: {
  size: PrintSize;
  active?: boolean;
}) {
  const { cols, rows, count } = getSheetGrid(size);
  const cells = Array.from({ length: count }, (_, i) => i);

  return (
    <div className={`inline-flex flex-col items-center ${active ? "" : "opacity-80"}`}>
      <div
        className="relative rounded-sm border border-ink-300 bg-white p-1 shadow-sm"
        style={{ width: 72, height: 108 }}
        aria-hidden
      >
        <div
          className="grid h-full w-full gap-0.5"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {cells.map((i) => (
            <div
              key={i}
              className={`rounded-[1px] border ${
                active ? "border-accent/40 bg-accent-soft/80" : "border-ink-100 bg-ink-50"
              }`}
            />
          ))}
        </div>
      </div>
      <p className="mt-1 text-[10px] font-medium text-ink-500">
        {cols}×{rows} · {count}장
      </p>
    </div>
  );
}
