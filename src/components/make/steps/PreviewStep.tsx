import WatermarkFrame from "@/components/WatermarkFrame";
import type { Shot } from "@/lib/make/types";

type PreviewStepProps = {
  shots: Shot[];
  selectedShotId: string | null;
  setSelectedShotId: (id: string) => void;
  setPreviewVault: (vault: string | null) => void;
  mock: boolean;
};

export default function PreviewStep({
  shots,
  selectedShotId,
  setSelectedShotId,
  setPreviewVault,
  mock,
}: PreviewStepProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink-700">5. 첫 컷</h2>
      <p className="mt-1 text-xs text-ink-500">
        결제 후 만든 컷입니다. 아래에서 확인한 뒤 「이 컷 받기」로 PNG를 저장하세요
        {mock ? " · MOCK" : ""}
      </p>
      <div
        className={`mt-3 grid gap-3 ${
          shots.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : "mx-auto max-w-sm"
        }`}
      >
        {shots.map((shot) => (
          <button
            key={shot.id}
            type="button"
            onClick={() => {
              setSelectedShotId(shot.id);
              if (shot.vault) setPreviewVault(shot.vault);
            }}
            className={`text-left ${
              selectedShotId === shot.id ? "rounded-xl ring-2 ring-accent/40" : ""
            }`}
          >
            <WatermarkFrame src={shot.imageUrl} locked={false} />
            <p className="mt-1.5 px-1 text-xs font-medium text-ink-700">{shot.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
