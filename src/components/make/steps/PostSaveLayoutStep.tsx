import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import TileDiagram from "@/components/TileDiagram";
import InlineError from "@/components/make/InlineError";
import EmailDeliverForm from "@/components/make/EmailDeliverForm";
import type { LayoutSaveReady, SaveReady, Shot } from "@/lib/make/types";
import {
  LAYOUT_UPSELL_ORDER,
  getPrintSize,
  getSheetGrid,
  type PrintSize,
} from "@/lib/photoSheet";
import { PRICE, type PackId } from "@/lib/purposes";
import { PRINT_GUIDE, PRINTING_BOX } from "@/lib/printingBox";

type PostSaveLayoutStepProps = {
  downloadOk: string | null;
  error: string | null;
  errorAt: string | null;
  download: () => void;
  downloading: boolean;
  extraBusyId: string | null;
  layoutBuying: boolean;
  saveReady: SaveReady | null;
  saveReadyFile: () => void;
  primaryShotId: string | null;
  packId: PackId;
  layoutSaveReady: LayoutSaveReady | null;
  saveLayoutReadyFile: () => void;
  layoutPackPaid: boolean;
  layoutPaidSizeIds: string[];
  shots: Shot[];
  redownloadOwnedLayout: (shot: Shot, sizeId: string) => void;
  layoutOffer: PrintSize | null;
  layoutFreeUsed: boolean;
  layoutRemainingCount: number;
  downloadLayout: (shot: Shot, mode: "free" | "single" | "pack", sizeId?: string) => void;
  setLayoutSkippedIds: Dispatch<SetStateAction<string[]>>;
  extraShots: Shot[];
  extraPaidIds: string[];
  downloadExtra: (shot: Shot) => void;
  deliverCleanByEmail: (email: string) => Promise<{ ok: boolean; message: string }>;
  deliverLayoutByEmail: (email: string) => Promise<{ ok: boolean; message: string }>;
};

export default function PostSaveLayoutStep({
  downloadOk,
  error,
  errorAt,
  download,
  downloading,
  extraBusyId,
  layoutBuying,
  saveReady,
  saveReadyFile,
  primaryShotId,
  packId,
  layoutSaveReady,
  saveLayoutReadyFile,
  layoutPackPaid,
  layoutPaidSizeIds,
  shots,
  redownloadOwnedLayout,
  layoutOffer,
  layoutFreeUsed,
  layoutRemainingCount,
  downloadLayout,
  setLayoutSkippedIds,
  extraShots,
  extraPaidIds,
  downloadExtra,
  deliverCleanByEmail,
  deliverLayoutByEmail,
}: PostSaveLayoutStepProps) {
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent-soft/40 p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-accent-deep">저장 완료</p>
        <p className="mt-1 text-xs text-ink-500">
          받으신 뒤에는{" "}
          <Link href="/legal/refund" className="underline">
            환불이 어려워요
          </Link>
          . 필요하면 PNG를 다시 받거나, 인화 레이아웃으로 이어 가세요.
        </p>
        {downloadOk && !errorAt && (
          <p className="mt-2 text-sm text-accent-deep" role="status">
            {downloadOk}
          </p>
        )}
        <button
          type="button"
          onClick={download}
          disabled={downloading || !!extraBusyId || layoutBuying}
          className="mt-3 w-full rounded-xl border border-ink-200 bg-white py-2.5 text-sm font-medium text-ink-700 disabled:opacity-50"
        >
          {downloading ? "준비 중…" : "PNG 다시 받기"}
        </button>
        {saveReady && (
          <div className="mt-2 space-y-2">
            <button
              type="button"
              onClick={saveReadyFile}
              className="w-full rounded-xl border border-accent/40 bg-white py-2.5 text-sm font-semibold text-accent-deep"
            >
              사진에 저장
            </button>
            <p className="text-center text-[11px] text-ink-500">공유 창 → 「이미지 저장」</p>
            <a
              href={saveReady.url}
              download={saveReady.filename}
              className="block w-full text-center text-[11px] text-ink-400 underline"
            >
              파일로 받기 (백업)
            </a>
            <EmailDeliverForm
              disabled={downloading || !!extraBusyId || layoutBuying}
              onSend={deliverCleanByEmail}
            />
          </div>
        )}
        {!saveReady && (
          <div className="mt-2">
            <EmailDeliverForm
              disabled={downloading || !!extraBusyId || layoutBuying}
              onSend={deliverCleanByEmail}
            />
          </div>
        )}
        <InlineError at="download" errorAt={errorAt} message={error} />
      </div>

      {primaryShotId && (
        <div className="rounded-xl border border-ink-100 bg-white/90 p-4 text-left space-y-3">
          <p className="text-sm font-semibold text-ink-800">8. 인화용 레이아웃</p>
          {packId === "plus" && (
            <p className="text-[11px] text-ink-500">
              플러스에 반명함·증명 포함 · 한 규격씩 받아 가세요
            </p>
          )}
          {packId === "basic" && (
            <p className="text-[11px] text-ink-500">
              기본팩은 PNG만 · 인화는 첫 규격 무료, 이후 개별/패키지
            </p>
          )}

          {layoutSaveReady && (
            <div className="space-y-2 rounded-lg border border-accent/20 bg-accent-soft/20 p-3">
              <p className="text-xs font-medium text-accent-deep">
                {layoutSaveReady.label} 레이아웃 준비됨
              </p>
              <button
                type="button"
                onClick={saveLayoutReadyFile}
                className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white"
              >
                사진에 저장 · 레이아웃
              </button>
              <p className="text-center text-[11px] text-ink-500">공유 창 → 「이미지 저장」</p>
              <a
                href={layoutSaveReady.url}
                download={layoutSaveReady.filename}
                className="block w-full rounded-xl border border-accent/40 bg-white py-2.5 text-center text-sm font-semibold text-accent-deep"
              >
                파일로 받기 (백업)
              </a>
              <EmailDeliverForm
                disabled={layoutBuying}
                onSend={deliverLayoutByEmail}
              />
              <p className="text-[11px] text-ink-500">
                메일로 받은 뒤{" "}
                <a
                  href={PRINTING_BOX.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {PRINTING_BOX.name}
                </a>
                에 올리거나{" "}
                <Link href={PRINT_GUIDE.path} className="underline">
                  {PRINT_GUIDE.label}
                </Link>
                를 보세요.
              </p>
            </div>
          )}

          {(layoutPackPaid || layoutPaidSizeIds.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {(layoutPackPaid ? LAYOUT_UPSELL_ORDER : layoutPaidSizeIds).map((id) => {
                const s = getPrintSize(id);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={layoutBuying}
                    onClick={() => {
                      const shot = shots.find((x) => x.id === primaryShotId);
                      if (shot) redownloadOwnedLayout(shot, id);
                    }}
                    className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-[11px] font-medium text-ink-700 disabled:opacity-50"
                  >
                    {s.label} 다시 준비
                  </button>
                );
              })}
            </div>
          )}

          {layoutOffer ? (
            <div className="rounded-lg border border-accent/20 bg-accent-soft/30 p-3">
              <div className="flex gap-3">
                <TileDiagram size={layoutOffer} active />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink-900">
                    {!layoutFreeUsed
                      ? `기본 첫 규격 무료 · ${layoutOffer.label}`
                      : `추가 · ${layoutOffer.label}`}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-500">{layoutOffer.note}</p>
                  <p className="mt-1 text-[11px] text-ink-400">
                    {getSheetGrid(layoutOffer).count}장 · 4×6
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const shot = shots.find((s) => s.id === primaryShotId);
                  if (!shot) return;
                  downloadLayout(shot, layoutFreeUsed ? "single" : "free", layoutOffer.id);
                }}
                disabled={layoutBuying || downloading || !!extraBusyId}
                className="mt-3 w-full rounded-xl bg-ink-950 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {layoutBuying
                  ? "레이아웃 준비 중…"
                  : !layoutFreeUsed
                    ? "무료 레이아웃 준비"
                    : `₩${PRICE.extraLayoutKrw.toLocaleString("ko-KR")} · 준비`}
              </button>
              <button
                type="button"
                onClick={() =>
                  setLayoutSkippedIds((ids) =>
                    ids.includes(layoutOffer.id) ? ids : [...ids, layoutOffer.id]
                  )
                }
                disabled={layoutBuying}
                className="mt-2 w-full text-center text-[11px] text-ink-400 underline disabled:opacity-50"
              >
                이번엔 넘어갈게요
              </button>

              {layoutFreeUsed && layoutRemainingCount >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const shot = shots.find((s) => s.id === primaryShotId);
                    if (shot) downloadLayout(shot, "pack", layoutOffer.id);
                  }}
                  disabled={layoutBuying || downloading || !!extraBusyId}
                  className="mt-2 w-full rounded-xl border border-accent/40 bg-white py-2.5 text-sm font-semibold text-accent-deep disabled:opacity-50"
                >
                  나머지 전부 · ₩{PRICE.layoutPackKrw.toLocaleString("ko-KR")}
                </button>
              )}
            </div>
          ) : (
            !layoutPackPaid &&
            layoutRemainingCount === 0 && (
              <p className="text-xs text-ink-500">
                받으신 레이아웃은 위에서 다시 준비할 수 있어요.
              </p>
            )
          )}

          {layoutPackPaid && (
            <p className="text-[11px] text-accent-deep">전 사이즈 패키지 · 모두 받을 수 있어요</p>
          )}

          <InlineError at="layout" errorAt={errorAt} message={error} />
        </div>
      )}

      {extraShots.length > 0 && (
        <div className="rounded-xl border border-ink-100 bg-white/90 p-4 text-left">
          <p className="text-sm font-semibold text-ink-800">다른 컷도 받을까요?</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            다시 만들기로 생긴 컷은 장당 ₩{PRICE.extraShotKrw.toLocaleString("ko-KR")}에 받을 수
            있어요.
          </p>
          <ul className="mt-3 space-y-3">
            {extraShots.map((shot) => {
              const freeOrPaid =
                shot.unlocked || extraPaidIds.includes(shot.id) || shot.id === primaryShotId;
              const busy = extraBusyId === shot.id;
              return (
                <li key={shot.id} className="rounded-lg border border-ink-100 p-2">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shot.imageUrl}
                      alt={shot.label}
                      className="h-14 w-14 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink-800">{shot.label}</p>
                      <p className="text-[11px] text-ink-400">
                        {freeOrPaid
                          ? "결제됨 · 다시 받을 수 있어요"
                          : `추가 ₩${PRICE.extraShotKrw.toLocaleString("ko-KR")}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadExtra(shot)}
                      disabled={busy || downloading || !!extraBusyId}
                      className="shrink-0 rounded-lg bg-ink-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {busy ? "준비 중…" : freeOrPaid ? "다시 받기" : "결제 · 받기"}
                    </button>
                  </div>
                  <InlineError at={`extra:${shot.id}`} errorAt={errorAt} message={error} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
