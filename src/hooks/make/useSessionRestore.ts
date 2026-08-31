"use client";

import { useEffect } from "react";
import { RESTORE_PAID_KEY, type RestorePaidData, type Shot } from "@/lib/make/types";
import { PLUS_LAYOUT_SIZE_IDS, type PackId } from "@/lib/purposes";
import type { MakeStudioState } from "@/hooks/make/useMakeStudioState";

function resolveRestoredPackId(data: RestorePaidData): PackId | null {
  if (data.packId === "plus" || data.packId === "basic") return data.packId;
  if (data.includeLayout || Number(data.amountKrw) >= 14000) return "plus";
  const sizes = Array.isArray(data.layoutPaidSizeIds) ? data.layoutPaidSizeIds : [];
  if (PLUS_LAYOUT_SIZE_IDS.every((id) => sizes.includes(id))) return "plus";
  return null;
}

type SessionRestoreExtras = {
  setLayoutSavedOnce?: (v: boolean) => void;
  /** false = 새 주문 (/make). true = 이어하기·결과 (/make?resume=1, /result) */
  enabled?: boolean;
};

/**
 * 저장된 결제·컷 세션 복원.
 * `/make` (resume 없음) = 복원 안 함 · `/make?resume=1` · `/result` = 복원.
 */
export function useSessionRestore(
  state: MakeStudioState,
  extras?: SessionRestoreExtras
) {
  const enabled = extras?.enabled ?? true;
  const {
    restoredOnce,
    setRestoredOnce,
    setPaid,
    setOrderId,
    setUnlockToken,
    setOrderTicket,
    setPackId,
    setPurposeId,
    setSubjectLook,
    setSubjectSeason,
    setPreviewAssetId,
    setPreviewVault,
    setShots,
    setSelectedShotId,
    setPrimaryShotId,
    setSelfie,
    setLayoutPaidSizeIds,
    setLayoutFreeUsed,
    setLayoutPackPaid,
    setExtraPaidIds,
    setRedoUsed,
    setAsvUsed,
    setDownloaded,
    setSavedOnce,
  } = state;

  useEffect(() => {
    if (restoredOnce || typeof window === "undefined") return;
    if (!enabled) {
      setRestoredOnce(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { loadRestorePaid } = await import("@/lib/sessionHeavy");
        const data = (await loadRestorePaid(RESTORE_PAID_KEY)) as RestorePaidData | null;
        if (cancelled || !data?.paid || !data.orderId || !data.unlockToken) return;
        setPaid(true);
        setOrderId(data.orderId);
        setUnlockToken(data.unlockToken);
        if (data.orderTicket) setOrderTicket(data.orderTicket);
        const restoredPack = resolveRestoredPackId(data);
        if (restoredPack) setPackId(restoredPack);
        if (data.purposeId) setPurposeId(data.purposeId);
        if (data.previewAssetId) setPreviewAssetId(data.previewAssetId);
        if (data.previewVault) setPreviewVault(data.previewVault);
        if (Array.isArray(data.shots) && data.shots.length) {
          setShots(
            data.shots.map((s) => ({
              id: s.id,
              imageUrl: s.imageUrl,
              imageUrlClean: s.imageUrlClean,
              label: s.label || "컷",
              timeSec: s.timeSec,
              vault: s.vault ?? null,
              unlocked: !!s.unlocked,
              easter: !!s.easter,
              easterVariant: s.easterVariant,
            })) as Shot[]
          );
          const preferClean =
            data.shots.find((s) => !s.easter)?.id ||
            data.selectedShotId ||
            data.shots[0]?.id ||
            null;
          setSelectedShotId(
            data.selectedShotId &&
              data.shots.some((s) => s.id === data.selectedShotId && !s.easter)
              ? data.selectedShotId
              : preferClean
          );
        }
        const primary =
          data.primaryShotId ||
          (data.downloaded ? data.selectedShotId || data.shots?.[0]?.id || null : null);
        if (primary) setPrimaryShotId(primary);
        if (data.subjectLook) setSubjectLook(data.subjectLook);
        if (data.subjectSeason) setSubjectSeason(data.subjectSeason);
        if (data.selfie) setSelfie(data.selfie);
        const plusPack = restoredPack === "plus" || !!data.includeLayout;
        const restoredSizes = Array.isArray(data.layoutPaidSizeIds)
          ? data.layoutPaidSizeIds.map(String)
          : [];
        if (restoredSizes.length > 0) {
          setLayoutPaidSizeIds(restoredSizes);
          setLayoutFreeUsed(true);
        } else if (plusPack) {
          // 플러스 결제인데 규격 목록이 비면 포함 규격(반명함·증명) 복구
          setLayoutPaidSizeIds([...PLUS_LAYOUT_SIZE_IDS]);
          setLayoutFreeUsed(true);
        }
        if (data.layoutPackPaid) setLayoutPackPaid(true);
        if (Array.isArray(data.extraPaidIds)) setExtraPaidIds(data.extraPaidIds);
        if (typeof data.redoUsed === "number") setRedoUsed(data.redoUsed);
        if (typeof data.asvUsed === "number") setAsvUsed(data.asvUsed);
        if (data.downloaded) setDownloaded(true);
        if (data.savedOnce) setSavedOnce(true);
        if (data.layoutSavedOnce) extras?.setLayoutSavedOnce?.(true);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setRestoredOnce(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once until restoredOnce
  }, [restoredOnce, enabled]);
}
