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
          <p className="text-sm font-semibold text-accent-deep">7. 파일로 저장</p>
          <p className="mt-1 text-xs text-ink-500">
            기기에 저장하거나, 폰에서 파일을 못 찾을 땐 이메일로 받으세요. 저장·발송 후 인화
            레이아웃으로 이어가요.
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
              기기에 저장 · PNG
            </button>
            <a
              href={saveReady.url}
              download={saveReady.filename}
              onClick={() => {
                setSavedOnce(true);
                setDownloadOk("저장 링크를 눌렀어요. 아래에서 인화 레이아웃으로 이어 가세요.");
              }}
              className="block w-full rounded-xl border border-accent/40 bg-white py-3 text-center text-sm font-semibold text-accent-deep"
            >
              링크를 눌러 저장 (사파리·백업)
            </a>
            <EmailDeliverForm
              disabled={downloading}
              onSend={deliverCleanByEmail}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={download}
              disabled={downloading}
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {downloading ? "파일 준비 중…" : "다시 준비하기"}
            </button>
            <EmailDeliverForm
              disabled={downloading}
              onSend={async (email) => {
                const r = await deliverCleanByEmail(email);
                return r;
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
