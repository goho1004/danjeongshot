import InlineError from "@/components/make/InlineError";
import EmailDeliverForm from "@/components/make/EmailDeliverForm";
import type { SaveReady } from "@/lib/make/types";

type PostPaySaveStepProps = {
  downloadOk: string | null;
  error: string | null;
  errorAt: string | null;
  saveReady: SaveReady | null;
  saveReadyFile: () => void;
  setSavedOnce: (v: boolean) => void;
  setDownloadOk: (v: string | null) => void;
  download: () => void;
  downloading: boolean;
  deliverCleanByEmail: (email: string) => Promise<{ ok: boolean; message: string }>;
};

export default function PostPaySaveStep({
  downloadOk,
  error,
  errorAt,
  saveReady,
  saveReadyFile,
  setSavedOnce,
  setDownloadOk,
  download,
  downloading,
  deliverCleanByEmail,
}: PostPaySaveStepProps) {
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent-soft/40 p-5 space-y-4">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-accent-deep">사진에 저장</p>
          <p className="mt-1 text-xs text-ink-500">
            <strong className="font-semibold text-ink-700">사진에 저장</strong>을 누른 뒤, 공유
            창에서 <strong className="font-semibold text-ink-700">「이미지 저장」만</strong>{" "}
            누르세요. 못 찾겠으면 아래 이메일로 받으세요.
          </p>
        </div>
        {downloadOk && !errorAt && (
          <p className="text-sm text-accent-deep" role="status">
            {downloadOk}
          </p>
        )}
        <InlineError at="download" errorAt={errorAt} message={error} />
        {saveReady ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={saveReadyFile}
              className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-white"
            >
              사진에 저장
            </button>
            <p className="text-center text-[11px] text-ink-500">
              공유 창 → 「이미지 저장」(한 번만 더)
            </p>
            <EmailDeliverForm disabled={downloading} onSend={deliverCleanByEmail} />
            <a
              href={saveReady.url}
              download={saveReady.filename}
              onClick={() => {
                setSavedOnce(true);
                setDownloadOk(
                  "파일 링크를 눌렀어요. 다운로드 폴더일 수 있어요. 사진이 필요하면 위 「사진에 저장」을 쓰세요."
                );
              }}
              className="block w-full py-2 text-center text-[11px] text-ink-400 underline"
            >
              파일로 받기 (백업)
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={download}
              disabled={downloading}
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {downloading ? "준비 중…" : "사진에 저장 · 다시 시도"}
            </button>
            <EmailDeliverForm disabled={downloading} onSend={deliverCleanByEmail} />
          </div>
        )}
      </div>
    </div>
  );
}
