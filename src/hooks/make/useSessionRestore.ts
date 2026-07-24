"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { RESTORE_PAID_KEY, type RestorePaidData, type Shot } from "@/lib/make/types";
import type { MakeStudioState } from "@/hooks/make/useMakeStudioState";

export function useSessionRestore(state: MakeStudioState) {
  const params = useSearchParams();
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
  } = state;

  useEffect(() => {
    if (restoredOnce || typeof window === "undefined") return;
    const paidFlag = params.get("paid");
    if (paidFlag !== "1") return;
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
          setShots(data.shots as Shot[]);
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
        sessionStorage.removeItem(RESTORE_PAID_KEY);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setRestoredOnce(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, restoredOnce, state]);
}
