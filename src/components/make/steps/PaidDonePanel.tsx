"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import Link from "next/link";
import TileDiagram from "@/components/TileDiagram";
import WatermarkFrame from "@/components/WatermarkFrame";
import InlineError from "@/components/make/InlineError";
import DownloadPreviewModal from "@/components/make/DownloadPreviewModal";
import EmailDeliverForm from "@/components/make/EmailDeliverForm";
import RegenPanel from "@/components/make/steps/RegenPanel";
import type { BusyKind, LayoutSaveReady, SaveReady, Shot } from "@/lib/make/types";
import {
  DEFAULT_PRINT_SIZE_ID,
  LAYOUT_UPSELL_ORDER,
  generatePhotoSheet,
  getPrintSize,
  getSheetGrid,
  type PrintSize,
} from "@/lib/photoSheet";
import { PRICE, type PackId, type SubjectLookId } from "@/lib/purposes";
import { PRINT_GUIDE, PRINTING_BOX } from "@/lib/printingBox";

type ModalTarget =
  | { kind: "clean" }
  | { kind: "print" }
  | {
      kind: "layout";
      mode: "free" | "single" | "pack";
      sizeId: string;
      owned?: boolean;
      label: string;
      priceLabel?: string;
    }
  | { kind: "extra"; shot: Shot; freeOrPaid: boolean };

type PaidDonePanelProps = {
  packId: PackId;
  includeLayout: boolean;
  downloaded: boolean;
  savedOnce: boolean;
  setSavedOnce: (v: boolean) => void;
  layoutSavedOnce: boolean;
  setLayoutSavedOnce: (v: boolean) => void;
  downloadOk: string | null;
  setDownloadOk: (v: string | null) => void;
  error: string | null;
  errorAt: string | null;
  busyKind: BusyKind;
  loadingLines: readonly string[];
  loadingIdx: number;
  downloading: boolean;
  layoutBuying: boolean;
  extraBusyId: string | null;
  selectedUrl: string | null;
  saveReady: SaveReady | null;
  layoutSaveReady: LayoutSaveReady | null;
  layoutUrl: string | null;
  layoutBusy: boolean;
  primaryShotId: string | null;
  shots: Shot[];
  selectedShotId: string | null;
  setSelectedShotId: (id: string) => void;
  setPreviewVault: (vault: string | null) => void;
  download: () => Promise<boolean> | boolean | void;
  saveReadyFile: () => Promise<boolean> | boolean | void;
  prepareAndSaveDefaultLayout: (shot: Shot) => Promise<unknown>;
  deliverCleanByEmail: (email: string) => Promise<{ ok: boolean; message: string }>;
  deliverLayoutByEmail: (email: string) => Promise<{ ok: boolean; message: string }>;
  redoUsed: number;
  asvUsed: number;
  regenSelfie: string | null;
  setRegenSelfie: (v: string | null) => void;
  regenInputRef: RefObject<HTMLInputElement | null>;
  onRegenFile: (e: ChangeEvent<HTMLInputElement>) => void;
  runPaidRegen: (stage: "redo" | "asv") => void;
  subjectLook: SubjectLookId;
  extraPresetIds: string[];
  toggleExtraPreset: (id: string) => void;
  extraCustom: string;
  setExtraCustom: (v: string) => void;
  layoutOffer: PrintSize | null;
  layoutFreeUsed: boolean;
  layoutRemainingCount: number;
  layoutPackPaid: boolean;
  layoutPaidSizeIds: string[];
  downloadLayout: (
    shot: Shot,
    mode: "free" | "single" | "pack",
    sizeId?: string
  ) => Promise<boolean> | boolean | void;
  redownloadOwnedLayout: (shot: Shot, sizeId: string) => Promise<boolean> | boolean | void;
  setLayoutSkippedIds: Dispatch<SetStateAction<string[]>>;
  extraShots: Shot[];
  extraPaidIds: string[];
  downloadExtra: (shot: Shot) => Promise<boolean> | boolean | void;
};

export default function PaidDonePanel(props: PaidDonePanelProps) {
  const {
    packId,
    includeLayout,
    downloaded,
    savedOnce,
    setSavedOnce,
    layoutSavedOnce,
    setLayoutSavedOnce,
    downloadOk,
    setDownloadOk,
    error,
    errorAt,
    busyKind,
    loadingLines,
    loadingIdx,
    downloading,
    layoutBuying,
    extraBusyId,
    selectedUrl,
    saveReady,
    layoutSaveReady,
    layoutUrl,
    layoutBusy,
    primaryShotId,
    shots,
    selectedShotId,
    setSelectedShotId,
    setPreviewVault,
    download,
    saveReadyFile,
    prepareAndSaveDefaultLayout,
    deliverCleanByEmail,
    deliverLayoutByEmail,
    redoUsed,
    asvUsed,
    regenSelfie,
    setRegenSelfie,
    regenInputRef,
    onRegenFile,
    runPaidRegen,
    subjectLook,
    extraPresetIds,
    toggleExtraPreset,
    extraCustom,
    setExtraCustom,
    layoutOffer,
    layoutFreeUsed,
    layoutRemainingCount,
    layoutPackPaid,
    layoutPaidSizeIds,
    downloadLayout,
    redownloadOwnedLayout,
    setLayoutSkippedIds,
    extraShots,
    extraPaidIds,
    downloadExtra,
  } = props;

  /** 플러스=포함 규격 · 기본=첫 규격 무료 — 저장 후 인화 CTA 공통 노출 */
  const isPlus = includeLayout || packId === "plus";
  const busy = !!busyKind || downloading || layoutBuying || !!extraBusyId;
  const awaitingPhoto = !savedOnce;
  const awaitingPrint = savedOnce && !layoutSavedOnce;
  const allSaved = savedOnce && layoutSavedOnce;

  const badge = awaitingPhoto
    ? isPlus
      ? "1/2 · 사진"
      : "사진 저장"
    : awaitingPrint
      ? isPlus
        ? "2/2 · 인화용"
        : "인화용"
      : isPlus
        ? "완료 · 사진+인화"
        : "저장 완료";

  const primaryShot =
    (primaryShotId && shots.find((s) => s.id === primaryShotId)) ||
    shots.find((s) => s.unlocked) ||
    shots[0];
  const previewShotUrl = primaryShot?.imageUrl || selectedUrl;
  const printPreviewUrl = layoutUrl || layoutSaveReady?.url || null;

  const [modal, setModal] = useState<ModalTarget | null>(null);
  const [sheetPreview, setSheetPreview] = useState<string | null>(null);
  const [sheetPreparing, setSheetPreparing] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const closeModal = () => {
    if (modalSaving) return;
    setModal(null);
    setSheetPreview(null);
    setSheetPreparing(false);
    setModalError(null);
  };

  const openModal = (target: ModalTarget) => {
    setModalError(null);
    setSheetPreview(null);
    setSheetPreparing(false);
    setModal(target);
  };

  useEffect(() => {
    if (!modal) return;
    let cancelled = false;

    if (modal.kind === "clean") {
      setSheetPreview(saveReady?.url || selectedUrl || previewShotUrl || null);
      setSheetPreparing(false);
      return;
    }

    if (modal.kind === "extra") {
      setSheetPreview(modal.shot.imageUrl || null);
      setSheetPreparing(false);
      return;
    }

    const sizeId =
      modal.kind === "print"
        ? layoutPaidSizeIds[0] || DEFAULT_PRINT_SIZE_ID
        : modal.sizeId;
    const size = getPrintSize(sizeId);

    if (modal.kind === "print" && printPreviewUrl) {
      setSheetPreview(printPreviewUrl);
      setSheetPreparing(false);
      return;
    }

    if (
      modal.kind === "layout" &&
      layoutSaveReady?.url &&
      layoutSaveReady.label === size.label
    ) {
      setSheetPreview(layoutSaveReady.url);
      setSheetPreparing(false);
      return;
    }

    const source = previewShotUrl;
    if (!source) {
      setSheetPreview(null);
      setSheetPreparing(false);
      setModalError("미리볼 사진이 없어요. 먼저 단정 사진을 받아 주세요.");
      return;
    }

    setSheetPreparing(true);
    generatePhotoSheet(source, size)
      .then((sheet) => {
        if (!cancelled) {
          setSheetPreview(sheet.dataUrl);
          setModalError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSheetPreview(source);
          setModalError("시트 미리보기 생성에 실패했어요. 사진으로 대신 보여요.");
        }
      })
      .finally(() => {
        if (!cancelled) setSheetPreparing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    modal,
    saveReady?.url,
    selectedUrl,
    previewShotUrl,
    printPreviewUrl,
    layoutSaveReady?.url,
    layoutSaveReady?.label,
    layoutPaidSizeIds,
  ]);

  const onConfirmModal = async () => {
    if (!modal || modalSaving) return;
    setModalSaving(true);
    setModalError(null);
    try {
      let ok = false;
      if (modal.kind === "clean") {
        if (saveReady && downloaded) ok = !!(await saveReadyFile());
        else ok = !!(await download());
        if (ok) setSavedOnce(true);
      } else if (modal.kind === "print") {
        if (!primaryShot) {
          setModalError("받을 컷이 없어요.");
          return;
        }
        ok = !!(await prepareAndSaveDefaultLayout(primaryShot));
        if (ok) setLayoutSavedOnce(true);
      } else if (modal.kind === "layout") {
        const shot = shots.find((s) => s.id === primaryShotId) || primaryShot;
        if (!shot) {
          setModalError("받을 컷이 없어요.");
          return;
        }
        if (modal.owned) ok = !!(await redownloadOwnedLayout(shot, modal.sizeId));
        else ok = !!(await downloadLayout(shot, modal.mode, modal.sizeId));
        if (ok) setLayoutSavedOnce(true);
      } else if (modal.kind === "extra") {
        ok = !!(await downloadExtra(modal.shot));
      }

      if (ok) {
        setModal(null);
        setSheetPreview(null);
        setSheetPreparing(false);
      } else if (!modalError) {
        setModalError(error || "저장이 완료되지 않았어요. 다시 시도해 주세요.");
      }
    } catch {
      setModalError("저장 중 오류가 났어요. 다시 시도해 주세요.");
    } finally {
      setModalSaving(false);
    }
  };

  const modalTitle =
    modal?.kind === "clean"
      ? "단정 사진"
      : modal?.kind === "print"
        ? "인화용 사진"
        : modal?.kind === "layout"
          ? modal.mode === "pack"
            ? "인화 패키지"
            : modal.label
          : modal?.kind === "extra"
            ? modal.shot.label || "추가 컷"
            : "";

  const modalHint =
    modal?.kind === "clean"
      ? "아래 미리보기가 저장될 파일입니다."
      : modal?.kind === "print"
        ? isPlus
          ? "플러스 포함 · 인화용 시트가 저장됩니다."
          : "첫 규격 무료 · 인화용 시트가 저장됩니다."
        : modal?.kind === "layout"
          ? modal.priceLabel
            ? `${modal.priceLabel} · 미리보기 확인 후 저장`
            : "미리보기 확인 후 저장하세요."
          : modal?.kind === "extra"
            ? modal.freeOrPaid
              ? "이 컷을 사진에 저장합니다."
              : `₩${PRICE.extraShotKrw.toLocaleString("ko-KR")} · 미리보기 후 저장`
            : undefined;

  const modalConfirmLabel =
    modal?.kind === "layout" && modal.priceLabel
      ? `${modal.priceLabel} · 저장`
      : modal?.kind === "extra" && !modal.freeOrPaid
        ? `₩${PRICE.extraShotKrw.toLocaleString("ko-KR")} · 저장`
        : "저장";

  return (
    <div
      id="djs-result-hero"
      className="rounded-2xl border border-accent/30 bg-accent-soft/40 p-5 space-y-4 overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-accent-deep">받기</p>
          <p className="mt-1 text-xs text-ink-500">
            {awaitingPhoto
              ? shots.length > 1
                ? `지금 · ${shots.length}장 중 고른 컷을 사진에 저장하세요. 미리보기 확인 후 「저장」.`
                : "지금 · 단정 PNG를 사진에 저장하세요. 미리보기 확인 후 「저장」을 누르면 됩니다."
              : awaitingPrint
                ? isPlus
                  ? "다음 · 플러스에 포함된 인화용(반명함·증명)을 저장하세요."
                  : "다음 · 인화용 레이아웃을 저장하세요. 첫 규격은 무료입니다."
                : "둘 다 저장됐어요. 필요하면 아래에서 다시 받거나 이메일로 보내세요."}
          </p>
          {isPlus && (
            <p className="mt-1.5 text-[11px] font-medium text-accent-deep">
              플러스 ₩{PRICE.packPlusKrw.toLocaleString("ko-KR")} · 제출용 PNG + 반명함·증명
              인화 포함
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-600 border border-ink-100">
          {badge}
        </span>
      </div>

      {downloadOk && !errorAt && (
        <p className="text-sm text-accent-deep" role="status">
          {downloadOk}
        </p>
      )}
      <InlineError at="download" errorAt={errorAt} message={error} />
      <InlineError at="layout" errorAt={errorAt} message={error} />

      {(busyKind === "redo" || busyKind === "asv") && (
        <div
          className="rounded-xl border border-accent/20 bg-white/95 px-4 py-3 text-center"
          aria-live="polite"
        >
          <p className="text-[11px] font-semibold tracking-wide text-accent-deep">
            {busyKind === "redo" ? "다시 만드는 중" : "한 번 더 정성을 들이는 중"}
          </p>
          <p
            key={`paid-${busyKind}-${loadingIdx}`}
            className="animate-rise mt-1.5 text-sm font-medium text-ink-800"
          >
            {loadingLines[loadingIdx % loadingLines.length]}
          </p>
        </div>
      )}

      {/* Step 1 — pick cut (basic·plus same) then save */}
      {awaitingPhoto && (
        <>
          {shots.length > 1 && (
            <div id="djs-result-shots" className="space-y-2 scroll-mt-4">
              <p className="text-[11px] font-semibold tracking-wide text-studio">
                받을 컷 고르기 · {shots.length}장
              </p>
              <div className="grid grid-cols-3 gap-2">
                {shots.map((shot) => {
                  const active = selectedShotId === shot.id;
                  return (
                    <button
                      key={shot.id}
                      type="button"
                      onClick={() => {
                        setSelectedShotId(shot.id);
                        if (shot.vault) setPreviewVault(shot.vault);
                      }}
                      className={`relative text-left ${
                        active ? "rounded-lg ring-2 ring-accent/50" : ""
                      }`}
                    >
                      {active && (
                        <span className="absolute right-1 top-1 z-10 rounded bg-accent px-1 py-0.5 text-[9px] font-semibold text-white">
                          선택
                        </span>
                      )}
                      {shot.easter && (
                        <span className="absolute left-1 top-1 z-10 rounded bg-ink-800/80 px-1 py-0.5 text-[9px] font-medium text-white">
                          희소
                        </span>
                      )}
                      <WatermarkFrame src={shot.imageUrl} locked={false} />
                      <p className="mt-1 truncate px-0.5 text-[10px] font-medium text-ink-600">
                        {shot.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => openModal({ kind: "clean" })}
            disabled={!selectedUrl || busy}
            className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {downloading ? "준비 중…" : "이 컷 · 사진에 저장"}
          </button>
          <p className="text-center text-[11px] text-ink-500 -mt-2">
            미리보기 → 「저장」→ 공유 창 「이미지 저장」
          </p>
          {isPlus ? (
            <p className="rounded-xl border border-accent/20 bg-white/90 px-3 py-2 text-xs text-ink-600">
              이 다음은{" "}
              <strong className="font-semibold text-ink-800">인화용(반명함·증명)</strong>
              입니다. 플러스에 이미 포함되어 있어요.
            </p>
          ) : (
            <p className="text-center text-[11px] text-ink-500">
              저장 후 인화 레이아웃 첫 규격은 무료로 받을 수 있어요.
            </p>
          )}
        </>
      )}

      {/* Step 2 — print is the only loud CTA; photo re-save demoted */}
      {awaitingPrint && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => openModal({ kind: "print" })}
            disabled={busy || !primaryShot}
            className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {layoutBuying || layoutBusy ? "인화용 준비 중…" : "인화용 사진에 저장"}
          </button>
          <p className="text-center text-[11px] text-ink-500 -mt-1">
            {isPlus
              ? "추가 결제 없음 · 미리보기 후 「저장」"
              : "첫 규격 무료 · 미리보기 후 「저장」"}
          </p>
          <button
            type="button"
            onClick={() => openModal({ kind: "clean" })}
            disabled={!selectedUrl || busy}
            className="w-full rounded-xl border border-ink-200 bg-white py-2.5 text-xs font-medium text-ink-600 disabled:opacity-50"
          >
            단정 사진 다시 저장
          </button>
          <PrintingBoxCard />
        </div>
      )}

      {/* Done — re-save both as secondary */}
      {allSaved && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => openModal({ kind: "clean" })}
              disabled={!selectedUrl || busy}
              className="w-full rounded-xl border border-ink-200 bg-white py-3 text-sm font-semibold text-ink-700 disabled:opacity-50"
            >
              사진 다시 저장
            </button>
            <button
              type="button"
              onClick={() => openModal({ kind: "print" })}
              disabled={busy || !primaryShot}
              className="w-full rounded-xl border border-ink-200 bg-white py-3 text-sm font-semibold text-ink-700 disabled:opacity-50"
            >
              {layoutBuying ? "인화용 준비 중…" : "인화용 다시 저장"}
            </button>
          </div>
          <PrintingBoxCard />
        </div>
      )}

      {/* Secondary — 저장 전엔 아무 것도 노출하지 않음(한 번 저장한 뒤에만 접힌 「다른 방법」) */}
      {savedOnce && (
        <div className="space-y-3 border-t border-accent/15 pt-4">
          <details className="rounded-xl border border-ink-100 bg-white px-3 py-3">
            <summary className="cursor-pointer text-xs font-semibold text-ink-800">
              다른 방법{" "}
              <span className="ml-1 text-[11px] font-normal text-ink-400">
                더 받기 · 이메일 · 다시 만들기
              </span>
            </summary>
            <div className="mt-3 space-y-4">
          {primaryShotId && (
            <section
              className="rounded-xl border border-ink-200 bg-white px-3 py-3 space-y-3 overflow-hidden"
              aria-label="추가구성"
            >
              <div>
                <p className="text-xs font-semibold text-ink-800">더 받기 · 추가구성</p>
                <p className="mt-0.5 text-[11px] text-ink-500">
                  {isPlus
                    ? "플러스 포함 규격 외 · 다른 사이즈·추가 컷"
                    : "다른 인화 규격 · 추가 컷(미리보기 후 결제)"}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-ink-600">다른 인화 규격</p>
                {(layoutPackPaid || layoutPaidSizeIds.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {(layoutPackPaid ? LAYOUT_UPSELL_ORDER : layoutPaidSizeIds).map((id) => {
                      const s = getPrintSize(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            openModal({
                              kind: "layout",
                              mode: "single",
                              sizeId: id,
                              owned: true,
                              label: s.label,
                            })
                          }
                          className="flex max-w-full items-center gap-2 overflow-hidden rounded-lg border border-ink-200 bg-ink-50/60 px-2 py-1.5 text-left disabled:opacity-50"
                        >
                          <TileDiagram size={s} imageUrl={previewShotUrl} />
                          <span className="min-w-0 truncate text-[11px] font-medium text-ink-700">
                            {s.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {layoutOffer && (
                  <div className="rounded-lg border border-ink-100 bg-ink-50/80 p-3 overflow-hidden">
                    <div className="flex gap-3 min-w-0">
                      <TileDiagram size={layoutOffer} active imageUrl={previewShotUrl} />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="text-xs font-semibold text-ink-900">
                          {!layoutFreeUsed
                            ? `무료 · ${layoutOffer.label}`
                            : `추가 · ${layoutOffer.label}`}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-500">
                          {getSheetGrid(layoutOffer).count}장 · 4×6
                        </p>
                        {previewShotUrl && (
                          <div className="mt-2 h-14 w-14 overflow-hidden rounded-md border border-ink-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previewShotUrl}
                              alt={`${layoutOffer.label}에 들어갈 사진`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        openModal({
                          kind: "layout",
                          mode: layoutFreeUsed ? "single" : "free",
                          sizeId: layoutOffer.id,
                          label: layoutOffer.label,
                          priceLabel: !layoutFreeUsed
                            ? "무료"
                            : `₩${PRICE.extraLayoutKrw.toLocaleString("ko-KR")}`,
                        })
                      }
                      disabled={busy}
                      className="mt-3 w-full rounded-xl bg-ink-950 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {!layoutFreeUsed
                        ? "무료 규격 미리보기"
                        : `₩${PRICE.extraLayoutKrw.toLocaleString("ko-KR")} · 미리보기`}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLayoutSkippedIds((ids) =>
                          ids.includes(layoutOffer.id) ? ids : [...ids, layoutOffer.id]
                        )
                      }
                      className="mt-2 w-full text-center text-[11px] text-ink-400 underline"
                    >
                      넘어가기
                    </button>
                    {layoutFreeUsed && layoutRemainingCount >= 2 && (
                      <div className="mt-2 space-y-2">
                        {(layoutUrl || previewShotUrl) && (
                          <div className="overflow-hidden rounded-lg border border-accent/20 bg-white px-2 py-2">
                            <p className="text-[11px] font-semibold text-ink-600">
                              나머지 규격 미리보기
                            </p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={layoutUrl || previewShotUrl!}
                              alt="인화 패키지 미리보기"
                              className="mt-1.5 max-h-28 w-full max-w-full rounded-md border border-ink-100 object-contain"
                            />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            openModal({
                              kind: "layout",
                              mode: "pack",
                              sizeId: layoutOffer.id,
                              label: "나머지 전부",
                              priceLabel: `₩${PRICE.layoutPackKrw.toLocaleString("ko-KR")}`,
                            })
                          }
                          disabled={busy}
                          className="w-full rounded-xl border border-accent/40 bg-white py-2.5 text-sm font-semibold text-accent-deep disabled:opacity-50"
                        >
                          나머지 전부 · ₩{PRICE.layoutPackKrw.toLocaleString("ko-KR")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {!layoutOffer &&
                  !(layoutPackPaid || layoutPaidSizeIds.length > 0) &&
                  isPlus && (
                    <p className="text-[11px] text-ink-500">
                      반명함·증명은 위에서 「인화용 사진에 저장」으로 받으세요. 다른 규격이
                      열리면 여기에 보여요.
                    </p>
                  )}
              </div>

              {extraShots.length > 0 && (
                <div className="space-y-2 border-t border-ink-100 pt-3">
                  <p className="text-[11px] font-semibold text-ink-600">
                    다른 컷 · ₩{PRICE.extraShotKrw.toLocaleString("ko-KR")}
                  </p>
                  <ul className="space-y-2">
                    {extraShots.map((shot) => {
                      const freeOrPaid =
                        shot.unlocked ||
                        extraPaidIds.includes(shot.id) ||
                        shot.id === primaryShotId;
                      const shotBusy = extraBusyId === shot.id;
                      return (
                        <li
                          key={shot.id}
                          className="flex items-center gap-3 rounded-lg border border-ink-100 bg-ink-50/40 p-2 overflow-hidden"
                        >
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-ink-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={shot.imageUrl}
                              alt={shot.label}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-ink-800">
                              {shot.label}
                              {shot.easter ? " · 희소" : ""}
                            </p>
                            {shot.easter && (
                              <p className="mt-0.5 text-[11px] text-ink-500">
                                보너스 · 제출용 비권장
                              </p>
                            )}
                            {!freeOrPaid && !shot.easter && (
                              <p className="mt-0.5 text-[11px] text-ink-500">
                                추가 컷 미리보기
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              openModal({ kind: "extra", shot, freeOrPaid })
                            }
                            disabled={busy}
                            className="shrink-0 rounded-lg bg-ink-950 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                          >
                            {shotBusy
                              ? "…"
                              : freeOrPaid
                                ? "받기"
                                : `₩${PRICE.extraShotKrw.toLocaleString("ko-KR")}`}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section
            className="rounded-xl border border-ink-100 bg-white px-3 py-3 space-y-3"
            aria-label="이메일"
          >
            <div>
              <p className="text-xs font-semibold text-ink-800">이메일로 받기</p>
              <p className="mt-0.5 text-[11px] text-ink-500">
                공유 창이 안 열리면 이메일·파일로 받으세요.
              </p>
            </div>
            <EmailDeliverForm
              disabled={busy}
              title="단정 사진 · 이메일로 받기"
              onSend={deliverCleanByEmail}
            />
            {layoutSaveReady && (
              <EmailDeliverForm
                disabled={busy}
                title="인화용 · 이메일로 받기"
                onSend={deliverLayoutByEmail}
              />
            )}
            {saveReady && (
              <a
                href={saveReady.url}
                download={saveReady.filename}
                onClick={() => {
                  setSavedOnce(true);
                  setDownloadOk(
                    "파일 링크를 눌렀어요. 다운로드 폴더일 수 있어요. 인화용이 필요하면 위 「인화용 사진에 저장」을 쓰세요."
                  );
                }}
                className="block text-center text-[11px] font-medium text-ink-600 underline"
              >
                파일로 받기 (백업)
              </a>
            )}
          </section>

          <section
            className="rounded-xl border border-ink-100 bg-white px-3 py-3"
            aria-label="다시 만들기"
          >
            <RegenPanel
              busyKind={busyKind}
              redoUsed={redoUsed}
              asvUsed={asvUsed}
              regenSelfie={regenSelfie}
              setRegenSelfie={setRegenSelfie}
              regenInputRef={regenInputRef}
              onRegenFile={onRegenFile}
              runPaidRegen={runPaidRegen}
              error={error}
              errorAt={errorAt}
              subjectLook={subjectLook}
              extraPresetIds={extraPresetIds}
              toggleExtraPreset={toggleExtraPreset}
              extraCustom={extraCustom}
              setExtraCustom={setExtraCustom}
            />
          </section>
            </div>
          </details>

          <p className="text-[11px] text-ink-400">
            받은 뒤에는{" "}
            <Link href="/legal/refund" className="underline">
              환불이 어려워요
            </Link>
            .
          </p>
        </div>
      )}

      <DownloadPreviewModal
        open={!!modal}
        title={modalTitle}
        hint={modalHint}
        previewUrl={sheetPreview}
        preparing={sheetPreparing}
        preparingLabel="인화용 미리보기 준비 중…"
        saving={modalSaving || downloading || layoutBuying || !!extraBusyId}
        error={modalError}
        confirmLabel={modalConfirmLabel}
        confirmDisabled={sheetPreparing || !sheetPreview}
        onConfirm={onConfirmModal}
        onClose={closeModal}
      />
    </div>
  );
}

function PrintingBoxCard() {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-950 px-3 py-3 text-white">
      <p className="text-[11px] font-semibold text-studio-soft">{PRINTING_BOX.name}</p>
      <p className="mt-1 text-xs text-ink-300">
        인화용 PNG를 올린 뒤 근처 기기에서 뽑으세요.
      </p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        <a
          href={PRINTING_BOX.storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-studio-soft underline"
        >
          위치 찾기
        </a>
        <a
          href={PRINTING_BOX.eventsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-white/80 underline"
        >
          쿠폰·이벤트
        </a>
        <Link href={PRINT_GUIDE.path} className="text-ink-400 underline" prefetch={false}>
          {PRINT_GUIDE.label}
        </Link>
      </div>
    </div>
  );
}
