"use client";

import { useEffect } from "react";
import { RESTORE_PAID_KEY, type RestorePaidData, type Shot } from "@/lib/make/types";
import type { MakeStudioState } from "@/hooks/make/useMakeStudioState";

/**
 * /make 진입 시 저장된 결제·컷 세션 복원.
 * ?paid=1(토스 복귀)뿐 아니라 /help 등에서 돌아올 때도 동작.
 * 키는 지우지 않음 — 새 결제 시작 시에만 clear.
 */
export function useSessionRestore(state: MakeStudioState) {
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
    setSelfie,
    setLayoutPaidSizeIds,
    setLayoutFreeUsed,
    setRedoUsed,
    setAsvUsed,
    setDownloaded,
  } = state;

  useEffect(() => {
    if (restoredOnce || typeof window === "undefined") return;
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
        if (data.packId === "plus" || data.packId === "basic") setPackId(data.packId);
        if (data.purposeId) setPurposeId(data.purposeId);
        if (data.previewAssetId) setPreviewAssetId(data.previewAssetId);
        if (data.previewVault) setPreviewVault(data.previewVault);
        if (Array.isArray(data.shots) && data.shots.length) {
          setShots(
            data.shots.map((s) => ({
              id: s.id,
              imageUrl: s.imageUrl,
              label: s.label || "컷",
              timeSec: s.timeSec,
              vault: s.vault ?? null,
              unlocked: !!s.unlocked,
            })) as Shot[]
          );
          setSelectedShotId(data.selectedShotId || data.shots[0]?.id || null);
        }
        if (data.subjectLook) setSubjectLook(data.subjectLook);
        if (data.subjectSeason) setSubjectSeason(data.subjectSeason);
        if (data.selfie) setSelfie(data.selfie);
        if (Array.isArray(data.layoutPaidSizeIds)) {
          setLayoutPaidSizeIds(data.layoutPaidSizeIds);
          setLayoutFreeUsed(data.layoutPaidSizeIds.length > 0);
        }
        if (typeof data.redoUsed === "number") setRedoUsed(data.redoUsed);
        if (typeof data.asvUsed === "number") setAsvUsed(data.asvUsed);
        if (data.downloaded) setDownloaded(true);
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
  }, [restoredOnce]);
}
