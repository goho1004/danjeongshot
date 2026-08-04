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
  includeLayout: boolean;
  amountKrw?: number;
  purposeId: string;
  previewAssetId: string | null;
  previewVault: string | null;
  shots: MakeStudioState["shots"];
  selectedShotId: string | null;
  primaryShotId: string | null;
  subjectLook: string;
  subjectSeason: string;
  selfie: string | null;
  layoutPaidSizeIds: string[];
  layoutPackPaid: boolean;
  extraPaidIds: string[];
  redoUsed: number;
  asvUsed: number;
  downloaded: boolean;
  savedOnce: boolean;
  layoutSavedOnce: boolean;
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
    includeLayout: !!snap.includeLayout,
    amountKrw: snap.amountKrw,
    purposeId: snap.purposeId,
    previewAssetId: snap.previewAssetId,
    previewVault: snap.previewVault,
    shots: snap.shots.map((s) => ({
      id: s.id,
      imageUrl: s.imageUrl,
      imageUrlClean: s.imageUrlClean,
      label: s.label,
      unlocked: s.unlocked,
      vault: s.vault,
      easter: s.easter,
      easterVariant: s.easterVariant,
    })),
    selectedShotId: snap.selectedShotId,
    primaryShotId: snap.primaryShotId,
    subjectLook: snap.subjectLook,
    subjectSeason: snap.subjectSeason,
    selfie: snap.selfie,
    layoutPaidSizeIds: snap.layoutPaidSizeIds,
    layoutPackPaid: !!snap.layoutPackPaid,
    extraPaidIds: snap.extraPaidIds,
    redoUsed: snap.redoUsed,
    asvUsed: snap.asvUsed,
    downloaded: !!snap.downloaded,
    savedOnce: !!snap.savedOnce,
    layoutSavedOnce: !!snap.layoutSavedOnce,
  });
}

function isLeavingMake(href: string): boolean {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return true;
    return !url.pathname.startsWith("/make");
  } catch {
    return false;
  }
}

/**
 * 결제 후 만들기 중 상태를 IndexedDB+sessionStorage에 계속 저장.
 * /help · /print · 푸터 · 외부 링크 나갔다 와도 컷·결제 상태가 유지됨.
 */
export function usePersistPaidSession(
  state: MakeStudioState,
  extras?: { layoutSavedOnce?: boolean }
) {
  const snap: PersistSnapshot = {
    paid: state.paid,
    orderId: state.orderId,
    unlockToken: state.unlockToken,
    orderTicket: state.orderTicket,
    packId: state.packId,
    includeLayout: state.includeLayout,
    amountKrw: state.amount,
    purposeId: state.purposeId,
    previewAssetId: state.previewAssetId,
    previewVault: state.previewVault,
    shots: state.shots,
    selectedShotId: state.selectedShotId,
    primaryShotId: state.primaryShotId,
    subjectLook: state.subjectLook,
    subjectSeason: state.subjectSeason,
    selfie: state.selfie,
    layoutPaidSizeIds: state.layoutPaidSizeIds,
    layoutPackPaid: state.layoutPackPaid,
    extraPaidIds: state.extraPaidIds,
    redoUsed: state.redoUsed,
    asvUsed: state.asvUsed,
    downloaded: state.downloaded,
    savedOnce: state.savedOnce,
    layoutSavedOnce: !!extras?.layoutSavedOnce,
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
    snap.includeLayout,
    snap.amountKrw,
    snap.purposeId,
    snap.previewAssetId,
    snap.previewVault,
    snap.shots,
    snap.selectedShotId,
    snap.primaryShotId,
    snap.subjectLook,
    snap.subjectSeason,
    snap.selfie,
    snap.layoutPaidSizeIds,
    snap.layoutPackPaid,
    snap.extraPaidIds,
    snap.redoUsed,
    snap.asvUsed,
    snap.downloaded,
    snap.savedOnce,
    snap.layoutSavedOnce,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const flush = () => {
      void writePersist(latest.current).catch(() => {});
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    /** Next SPA 클릭 이탈은 pagehide 없음 → 캡처 단계에서 동기 메타+비동기 IDB flush */
    const onClickCapture = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const a = t.closest("a");
      if (!a) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (!isLeavingMake(href)) return;
      flush();
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, []);
}
