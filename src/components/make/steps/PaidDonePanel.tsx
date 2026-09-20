"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import Link from "next/link";
import WatermarkFrame from "@/components/WatermarkFrame";
import InlineError from "@/components/make/InlineError";
import DownloadPreviewModal, {
  type DownloadChoice,
} from "@/components/make/DownloadPreviewModal";
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

/** 시트에서 그 자리에 펼치는 항목 (preview 로 넘어가지 않음) */
const EXPANDABLE = new Set(["email:clean", "email:layout", "file"]);

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

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

  // ── 받기 시트 ──
  const [sheetOpen, setSheetOpen] = useState(false);
  const [phase, setPhase] = useState<"choose" | "preview">("choose");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalTarget | null>(null);
  const [sheetPreview, setSheetPreview] = useState<string | null>(null);
  const [sheetPreparing, setSheetPreparing] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const closeSheet = () => {
    if (modalSaving) return;
    setSheetOpen(false);
    setPhase("choose");
    setModal(null);
    setExpandedId(null);
    setSheetPreview(null);
    setSheetPreparing(false);
    setModalError(null);
  };

  const openSheet = () => {
    setModalError(null);
    setSheetPreview(null);
    setSheetPreparing(false);
    setExpandedId(null);
    setModal(null);
    setPhase("choose");
    setSheetOpen(true);
  };

  const backToChoose = () => {
    if (modalSaving) return;
    setModal(null);
    setSheetPreview(null);
    setSheetPreparing(false);
    setModalError(null);
    setPhase("choose");
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

  /**
   * 받을 수 있는 것들 — 기능은 그대로, 노출만 한 장에 모은다.
   * 값·분기는 기존과 동일하다(가격·무료 규칙·소진 조건 무변경).
   */
  const choices = useMemo<DownloadChoice[]>(() => {
    const out: DownloadChoice[] = [];

    out.push({
      id: "clean",
      title: "단정 사진",
      desc: savedOnce
        ? "이력서·원서에 올리는 PNG 한 장. 다시 저장할 수 있어요."
        : "이력서·원서에 올리는 PNG 한 장이에요.",
      badge: savedOnce ? "받음" : "포함",
      thumbUrl: previewShotUrl,
      recommended: awaitingPhoto,
      disabled: !selectedUrl,
    });

    // prepareAndSaveDefaultLayout 는 savedOnce 를 요구한다 — 조건을 어긋나게 두지 않는다
    if (savedOnce && primaryShot) {
      out.push({
        id: "print",
        title: "인화용 사진",
        desc: isPlus
          ? "반명함·증명 규격을 한 장에 모아 드려요. 플러스에 포함돼 있어요."
          : "반명함·증명 규격을 한 장에 모아 드려요. 첫 규격은 무료예요.",
        badge: isPlus ? "포함" : layoutFreeUsed ? undefined : "무료",
        thumbUrl: printPreviewUrl || previewShotUrl,
        recommended: awaitingPrint,
      });
    }

    if (savedOnce && primaryShotId) {
      for (const id of layoutPackPaid ? LAYOUT_UPSELL_ORDER : layoutPaidSizeIds) {
        const s = getPrintSize(id);
        out.push({
          id: `owned:${id}`,
          title: `${s.label} 인화`,
          desc: `${getSheetGrid(s).count}장 · 4×6 용지 · 이미 열린 규격이에요.`,
          badge: "보유",
          thumbUrl: previewShotUrl,
        });
      }

      if (layoutOffer) {
        out.push({
          id: `offer:${layoutOffer.id}`,
          title: `${layoutOffer.label} 인화`,
          desc: layoutFreeUsed
            ? `${getSheetGrid(layoutOffer).count}장 · 4×6 용지 · 지금은 무료로 열려요.`
            : `${getSheetGrid(layoutOffer).count}장 · 4×6 용지 · 첫 규격이라 무료예요.`,
          badge: layoutFreeUsed ? won(PRICE.extraLayoutKrw) : "무료",
          thumbUrl: previewShotUrl,
          skip: {
            label: "이 규격은 그만 보기",
            onSkip: () =>
              setLayoutSkippedIds((ids) =>
                ids.includes(layoutOffer.id) ? ids : [...ids, layoutOffer.id]
              ),
          },
        });

        if (layoutFreeUsed && layoutRemainingCount >= 2) {
          out.push({
            id: "pack",
            title: "나머지 규격 전부",
            desc: "남은 인화 규격을 한 번에 열어요. 지금은 무료예요.",
            badge: won(PRICE.layoutPackKrw),
            thumbUrl: layoutUrl || previewShotUrl,
          });
        }
      }

      for (const shot of extraShots) {
        const freeOrPaid =
          shot.unlocked || extraPaidIds.includes(shot.id) || shot.id === primaryShotId;
        out.push({
          id: `extra:${shot.id}`,
          title: shot.label || "다른 컷",
          desc: shot.easter
            ? "보너스 컷이에요. 제출용으로는 권하지 않아요."
            : freeOrPaid
              ? "고르지 않았던 다른 컷을 사진에 저장해요."
              : "고르지 않았던 다른 컷이에요. 지금은 무료예요.",
          badge: shot.easter ? "희소" : freeOrPaid ? undefined : won(PRICE.extraShotKrw),
          thumbUrl: shot.imageUrl,
        });
      }
    }

    if (savedOnce) {
      out.push({
        id: "email:clean",
        title: "이메일로 받기",
        desc: "공유 창이 안 열리거나 폰에서 파일을 못 찾을 때 쓰세요.",
        thumbUrl: previewShotUrl,
        body: <EmailDeliverForm disabled={busy} title="단정 사진 · 이메일로 받기" onSend={deliverCleanByEmail} />,
      });
      if (layoutSaveReady) {
        out.push({
          id: "email:layout",
          title: "인화용 이메일로 받기",
          desc: "인화용 시트를 메일함으로 보내 드려요.",
          thumbUrl: printPreviewUrl || previewShotUrl,
          body: <EmailDeliverForm disabled={busy} title="인화용 · 이메일로 받기" onSend={deliverLayoutByEmail} />,
        });
      }
      if (saveReady) {
        out.push({
          id: "file",
          title: "파일로 받기 (백업)",
          desc: "사진첩 대신 다운로드 폴더로 바로 내려받아요.",
          body: (
            <a
              href={saveReady.url}
              download={saveReady.filename}
              onClick={() => {
                setSavedOnce(true);
                setDownloadOk(
                  "파일 링크를 눌렀어요. 다운로드 폴더일 수 있어요. 인화용이 필요하면 「인화용 사진」으로 받으세요."
                );
              }}
              className="block rounded-lg border border-ink-200 bg-white py-2.5 text-center text-sm font-medium text-ink-700"
            >
              파일로 받기
            </a>
          ),
        });
      }
    }

    return out;
  }, [
    awaitingPhoto,
    awaitingPrint,
    busy,
    deliverCleanByEmail,
    deliverLayoutByEmail,
    extraPaidIds,
    extraShots,
    isPlus,
    layoutFreeUsed,
    layoutOffer,
    layoutPackPaid,
    layoutPaidSizeIds,
    layoutRemainingCount,
    layoutSaveReady,
    layoutUrl,
    previewShotUrl,
    primaryShot,
    primaryShotId,
    printPreviewUrl,
    saveReady,
    savedOnce,
    selectedUrl,
    setDownloadOk,
    setLayoutSkippedIds,
    setSavedOnce,
  ]);

  const targetFor = (id: string): ModalTarget | null => {
    if (id === "clean") return { kind: "clean" };
    if (id === "print") return { kind: "print" };
    if (id.startsWith("owned:")) {
      const sizeId = id.slice("owned:".length);
      return {
        kind: "layout",
        mode: "single",
        sizeId,
        owned: true,
        label: getPrintSize(sizeId).label,
      };
    }
    if (id.startsWith("offer:")) {
      const sizeId = id.slice("offer:".length);
      return {
        kind: "layout",
        mode: layoutFreeUsed ? "single" : "free",
        sizeId,
        label: getPrintSize(sizeId).label,
        priceLabel: layoutFreeUsed ? won(PRICE.extraLayoutKrw) : "무료",
      };
    }
    if (id === "pack") {
      return {
        kind: "layout",
        mode: "pack",
        sizeId: layoutOffer?.id || DEFAULT_PRINT_SIZE_ID,
        label: "나머지 전부",
        priceLabel: won(PRICE.layoutPackKrw),
      };
    }
    if (id.startsWith("extra:")) {
      const shotId = id.slice("extra:".length);
      const shot = extraShots.find((s) => s.id === shotId);
      if (!shot) return null;
      return {
        kind: "extra",
        shot,
        freeOrPaid:
          shot.unlocked || extraPaidIds.includes(shot.id) || shot.id === primaryShotId,
      };
    }
    return null;
  };

  const onChoose = (id: string) => {
    if (EXPANDABLE.has(id)) {
      setExpandedId((prev) => (prev === id ? null : id));
      return;
    }
    const target = targetFor(id);
    if (!target) return;
    setModalError(null);
    setSheetPreview(null);
    setSheetPreparing(false);
    setModal(target);
    setPhase("preview");
  };

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
        setSheetOpen(false);
        setPhase("choose");
        setModal(null);
        setExpandedId(null);
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
            ? modal.priceLabel === "무료"
              ? "무료 · 미리보기 확인 후 저장"
              : `${modal.priceLabel} · 확인 시 저장 (추가 인화 · 지금은 무료)`
            : "미리보기 확인 후 저장하세요."
          : modal?.kind === "extra"
            ? modal.freeOrPaid
              ? "이 컷을 사진에 저장합니다."
              : `${won(PRICE.extraShotKrw)} · 확인 시 저장 (지금은 무료)`
            : undefined;

  const modalConfirmLabel =
    modal?.kind === "layout" && modal.priceLabel
      ? modal.priceLabel === "무료"
        ? "무료 · 저장"
        : `${modal.priceLabel} · 무료 저장`
      : modal?.kind === "extra" && !modal.freeOrPaid
        ? `${won(PRICE.extraShotKrw)} · 무료 저장`
        : "저장";

  const ctaHint = awaitingPhoto
    ? "누르면 받을 수 있는 것들을 보여 드려요. 고르면 미리보기 → 「저장」."
    : awaitingPrint
      ? isPlus
        ? "다음은 인화용(반명함·증명)이에요. 추가 결제 없이 포함돼 있어요."
        : "다음은 인화 레이아웃이에요. 첫 규격은 무료입니다."
      : "다시 받기·다른 규격·이메일 모두 여기 있어요.";

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
                ? `${shots.length}장 중 받을 컷을 고른 뒤 「사진에 저장」을 누르세요.`
                : "「사진에 저장」을 누르면 무엇을 받을지 골라서 저장합니다."
              : awaitingPrint
                ? "사진은 저장됐어요. 이어서 인화용을 받아 보세요."
                : "둘 다 저장됐어요. 다시 받거나 다른 규격·이메일도 여기서 고르세요."}
          </p>
          {isPlus && (
            <p className="mt-1.5 text-[11px] font-medium text-accent-deep">
              플러스 {won(PRICE.packPlusKrw)} · 제출용 PNG + 반명함·증명 인화 포함
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

      {/* 받을 컷 고르기 — 받기 이전 단계라 시트 밖에 둔다 */}
      {awaitingPhoto && shots.length > 1 && (
        <div className="space-y-2 scroll-mt-4">
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

      {/* 주 CTA 1개 — 받는 방법은 전부 시트 안에 있다 */}
      <button
        type="button"
        onClick={openSheet}
        disabled={busy || !selectedUrl}
        className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "준비 중…" : "사진에 저장"}
      </button>
      <p className="text-center text-[11px] text-ink-500 -mt-2">{ctaHint}</p>

      {awaitingPhoto && (
        <p className="text-[11px] leading-relaxed text-ink-400">
          마음에 안 들면 받기 전에 아래에서 다시 만들기·한 번 더를 쓸 수 있어요. 받은
          뒤에는 잠깁니다.
        </p>
      )}

      {savedOnce && <PrintingBoxCard />}

      {awaitingPhoto ? (
        <section
          className="rounded-xl border border-ink-100 bg-white px-3 py-3 space-y-3"
          aria-label="다시 만들기"
        >
          <RegenPanel
            busyKind={busyKind}
            redoUsed={redoUsed}
            asvUsed={asvUsed}
            downloaded={downloaded}
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
      ) : (
        <details className="rounded-xl border border-ink-100 bg-white px-3 py-3">
          <summary className="cursor-pointer text-xs font-semibold text-ink-800">
            다시 만들기{" "}
            <span className="ml-1 text-[11px] font-normal text-ink-400">
              한 번 더 · 요청 사항
            </span>
          </summary>
          <div className="mt-3">
            <RegenPanel
              busyKind={busyKind}
              redoUsed={redoUsed}
              asvUsed={asvUsed}
              downloaded={downloaded}
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
          </div>
        </details>
      )}

      {savedOnce && (
        <p className="text-[11px] text-ink-400">
          받은 뒤에는{" "}
          <Link href="/legal/refund" className="underline">
            환불이 어려워요
          </Link>
          .
        </p>
      )}

      <DownloadPreviewModal
        open={sheetOpen}
        phase={phase}
        choices={choices}
        chooseTitle="무엇을 받으시겠어요?"
        chooseHint="고르면 미리 보여 드리고 저장합니다."
        expandedId={expandedId}
        onChoose={onChoose}
        onBack={backToChoose}
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
        onClose={closeSheet}
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
