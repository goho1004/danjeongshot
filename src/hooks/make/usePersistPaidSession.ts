"use client";

import { useEffect, useRef } from "react";
import { RESTORE_PAID_KEY } from "@/lib/make/types";
import type { MakeStudioState } from "@/hooks/make/useMakeStudioState";

type PersistSnapshot = {
  paid: boolean;
  orderId: string | null;
  unlockToken: string | null;
  orderTicket: string | null;
  packId: string;
  purposeId: string;
  previewAssetId: string | null;
  previewVault: string | null;
  shots: MakeStudioState["shots"];
  selectedShotId: string | null;
  subjectLook: string;
  subjectSeason: string;
  selfie: string | null;
  layoutPaidSizeIds: string[];
  redoUsed: number;
  asvUsed: number;
  downloaded: boolean;
};

async function writePersist(snap: PersistSnapshot) {
  if (!snap.paid || !snap.orderId || !snap.unlockToken) return;
  const { persistRestorePaid } = await import("@/lib/sessionHeavy");
  await persistRestorePaid(RESTORE_PAID_KEY, {
    paid: true,
    orderId: snap.orderId,
    unlockToken: snap.unlockToken,
    orderTicket: snap.orderTicket || snap.unlockToken,
    packId: snap.packId,
    purposeId: snap.purposeId,
    previewAssetId: snap.previewAssetId,
    previewVault: snap.previewVault,
    shots: snap.shots.map((s) => ({
      id: s.id,
      imageUrl: s.imageUrl,
      label: s.label,
      unlocked: s.unlocked,
      vault: s.vault,
    })),
    selectedShotId: snap.selectedShotId,
    subjectLook: snap.subjectLook,
    subjectSeason: snap.subjectSeason,
    selfie: snap.selfie,
    layoutPaidSizeIds: snap.layoutPaidSizeIds,
    redoUsed: snap.redoUsed,
    asvUsed: snap.asvUsed,
    downloaded: !!snap.downloaded,
  });
}

/**
 * 결제 후 만들기 중 상태를 IndexedDB+sessionStorage에 계속 저장.
 * /help 등 나갔다 와도 컷·결제 상태가 유지됨.
 */
export function usePersistPaidSession(state: MakeStudioState) {
  const snap: PersistSnapshot = {
    paid: state.paid,
    orderId: state.orderId,
    unlockToken: state.unlockToken,
    orderTicket: state.orderTicket,
    packId: state.packId,
    purposeId: state.purposeId,
    previewAssetId: state.previewAssetId,
    previewVault: state.previewVault,
    shots: state.shots,
    selectedShotId: state.selectedShotId,
    subjectLook: state.subjectLook,
    subjectSeason: state.subjectSeason,
    selfie: state.selfie,
    layoutPaidSizeIds: state.layoutPaidSizeIds,
    redoUsed: state.redoUsed,
    asvUsed: state.asvUsed,
    downloaded: state.downloaded,
  };
  const latest = useRef(snap);
  latest.current = snap;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!snap.paid || !snap.orderId || !snap.unlockToken) return;
    void writePersist(snap).catch(() => {});
  }, [
    snap.paid,
    snap.orderId,
    snap.unlockToken,
    snap.orderTicket,
    snap.packId,
    snap.purposeId,
    snap.previewAssetId,
    snap.previewVault,
    snap.shots,
    snap.selectedShotId,
    snap.subjectLook,
    snap.subjectSeason,
    snap.selfie,
    snap.layoutPaidSizeIds,
    snap.redoUsed,
    snap.asvUsed,
    snap.downloaded,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const flush = () => {
      void writePersist(latest.current).catch(() => {});
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
}
