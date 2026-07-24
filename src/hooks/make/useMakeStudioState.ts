"use client";

import { useMemo, useRef, useState } from "react";
import {
  DEFAULT_PRINT_SIZE_ID,
  LAYOUT_UPSELL_ORDER,
  getPrintSize,
} from "@/lib/photoSheet";
import { getPack, packAmountKrw, type PackId, type PurposeId, type SubjectLookId, type SubjectSeasonId } from "@/lib/purposes";
import type { BusyKind, LayoutSaveReady, SaveReady, Shot } from "@/lib/make/types";

export function useMakeStudioState(initialPurpose: PurposeId) {
  const [purposeId, setPurposeId] = useState<PurposeId>(initialPurpose);
  const [subjectLook, setSubjectLook] = useState<SubjectLookId>("as_photo");
  const [subjectSeason, setSubjectSeason] = useState<SubjectSeasonId>("as_photo");
  const [packId, setPackId] = useState<PackId>(initialPurpose === "sheet" ? "plus" : "basic");
  const [shots, setShots] = useState<Shot[]>([]);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [regenSelfie, setRegenSelfie] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const [previewLeft, setPreviewLeft] = useState<number | null>(null);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [previewVault, setPreviewVault] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState<BusyKind>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorAt, setErrorAt] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [paying, setPaying] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderTicket, setOrderTicket] = useState<string | null>(null);
  const [unlockToken, setUnlockToken] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [primaryShotId, setPrimaryShotId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadOk, setDownloadOk] = useState<string | null>(null);
  const [saveReady, setSaveReady] = useState<SaveReady | null>(null);
  const [savedOnce, setSavedOnce] = useState(false);
  const [layoutSaveReady, setLayoutSaveReady] = useState<LayoutSaveReady | null>(null);
  const [printSizeId, setPrintSizeId] = useState(DEFAULT_PRINT_SIZE_ID);
  const [layoutUrl, setLayoutUrl] = useState<string | null>(null);
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [layoutBuying, setLayoutBuying] = useState(false);
  const [layoutPaidSizeIds, setLayoutPaidSizeIds] = useState<string[]>([]);
  const [layoutFreeUsed, setLayoutFreeUsed] = useState(false);
  const [layoutPackPaid, setLayoutPackPaid] = useState(false);
  const [layoutSkippedIds, setLayoutSkippedIds] = useState<string[]>([]);
  const [extraPaidIds, setExtraPaidIds] = useState<string[]>([]);
  const [extraBusyId, setExtraBusyId] = useState<string | null>(null);
  const [redoUsed, setRedoUsed] = useState(0);
  const [asvUsed, setAsvUsed] = useState(0);
  const [restoredOnce, setRestoredOnce] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const regenInputRef = useRef<HTMLInputElement>(null);

  const clearFail = () => {
    setError(null);
    setErrorAt(null);
  };
  const fail = (at: string, message: string) => {
    setErrorAt(at);
    setError(message);
  };

  const resetOrderState = () => {
    setPaid(false);
    setUnlockToken(null);
    setOrderId(null);
    setOrderTicket(null);
    setDownloaded(false);
    setPrimaryShotId(null);
    setExtraPaidIds([]);
    setLayoutPaidSizeIds([]);
    setLayoutFreeUsed(false);
    setLayoutPackPaid(false);
    setLayoutSkippedIds([]);
    setExtraBusyId(null);
    setLayoutBuying(false);
    setRedoUsed(0);
    setAsvUsed(0);
    setRegenSelfie(null);
    setLayoutUrl(null);
    setPreviewAssetId(null);
    setPreviewVault(null);
    setSaveReady(null);
    setSavedOnce(false);
    setLayoutSaveReady(null);
    setDownloadOk(null);
  };

  const pack = useMemo(() => getPack(packId), [packId]);
  const amount = useMemo(() => packAmountKrw(packId), [packId]);
  const includeLayout = packId === "plus";
  const selectedShot = useMemo(
    () => shots.find((s) => s.id === selectedShotId) ?? null,
    [shots, selectedShotId]
  );
  const selectedUrl = selectedShot?.imageUrl ?? null;
  const extraShots = useMemo(
    () => (primaryShotId ? shots.filter((s) => s.id !== primaryShotId) : []),
    [shots, primaryShotId]
  );
  const layoutOffer = useMemo(() => {
    if (layoutPackPaid) return null;
    const blocked = new Set([...layoutPaidSizeIds, ...layoutSkippedIds]);
    const nextId = LAYOUT_UPSELL_ORDER.find((id) => !blocked.has(id));
    return nextId ? getPrintSize(nextId) : null;
  }, [layoutPackPaid, layoutPaidSizeIds, layoutSkippedIds]);
  const layoutRemainingCount = useMemo(() => {
    if (layoutPackPaid) return 0;
    return LAYOUT_UPSELL_ORDER.filter((id) => !layoutPaidSizeIds.includes(id)).length;
  }, [layoutPackPaid, layoutPaidSizeIds]);
  const hasPreview = shots.length > 0;

  return {
    purposeId,
    setPurposeId,
    subjectLook,
    setSubjectLook,
    subjectSeason,
    setSubjectSeason,
    packId,
    setPackId,
    shots,
    setShots,
    selectedShotId,
    setSelectedShotId,
    selfie,
    setSelfie,
    regenSelfie,
    setRegenSelfie,
    mock,
    setMock,
    previewLeft,
    setPreviewLeft,
    previewAssetId,
    setPreviewAssetId,
    previewVault,
    setPreviewVault,
    busyKind,
    setBusyKind,
    error,
    errorAt,
    clearFail,
    fail,
    paid,
    setPaid,
    paying,
    setPaying,
    orderId,
    setOrderId,
    orderTicket,
    setOrderTicket,
    unlockToken,
    setUnlockToken,
    downloaded,
    setDownloaded,
    primaryShotId,
    setPrimaryShotId,
    downloading,
    setDownloading,
    downloadOk,
    setDownloadOk,
    saveReady,
    setSaveReady,
    savedOnce,
    setSavedOnce,
    layoutSaveReady,
    setLayoutSaveReady,
    printSizeId,
    setPrintSizeId,
    layoutUrl,
    setLayoutUrl,
    layoutBusy,
    setLayoutBusy,
    layoutBuying,
    setLayoutBuying,
    layoutPaidSizeIds,
    setLayoutPaidSizeIds,
    layoutFreeUsed,
    setLayoutFreeUsed,
    layoutPackPaid,
    setLayoutPackPaid,
    layoutSkippedIds,
    setLayoutSkippedIds,
    extraPaidIds,
    setExtraPaidIds,
    extraBusyId,
    setExtraBusyId,
    redoUsed,
    setRedoUsed,
    asvUsed,
    setAsvUsed,
    restoredOnce,
    setRestoredOnce,
    inputRef,
    regenInputRef,
    resetOrderState,
    pack,
    amount,
    includeLayout,
    selectedShot,
    selectedUrl,
    extraShots,
    layoutOffer,
    layoutRemainingCount,
    hasPreview,
  };
}

export type MakeStudioState = ReturnType<typeof useMakeStudioState>;
