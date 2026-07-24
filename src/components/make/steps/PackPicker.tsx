import { PACKS, type PackId } from "@/lib/purposes";

type PackPickerProps = {
  packId: PackId;
  setPackId: (id: PackId) => void;
  bullets: string[];
};

export default function PackPicker({ packId, setPackId, bullets }: PackPickerProps) {
  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-medium text-ink-600">팩 선택</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {PACKS.map((p) => {
          const selected = packId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPackId(p.id)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                selected
                  ? "border-accent bg-accent-soft/50 ring-1 ring-accent/30"
                  : "border-ink-100 bg-white/80 hover:border-ink-200"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink-900">{p.name}</span>
                {p.recommended && (
                  <span className="rounded-md bg-ink-950 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    인화까지
                  </span>
                )}
              </div>
              <p className="mt-1 text-lg font-semibold tracking-tight text-ink-950">
                ₩{p.priceKrw.toLocaleString("ko-KR")}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{p.tagline}</p>
            </button>
          );
        })}
      </div>
      <ul className="space-y-1 px-0.5 text-[11px] text-ink-400">
        {bullets.map((b) => (
          <li key={b}>· {b}</li>
        ))}
      </ul>
    </div>
  );
}
