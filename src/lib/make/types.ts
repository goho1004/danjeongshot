import type { PackId, PurposeId, SubjectLookId, SubjectSeasonId } from "@/lib/purposes";

export type Shot = {
  id: string;
  imageUrl: string;
  label: string;
  timeSec?: string;
  vault: string | null;
  unlocked: boolean;
};

export type SaveReady = {
  blob: Blob;
  filename: string;
  url: string;
};

export type LayoutSaveReady = SaveReady & {
  label: string;
};

export type BusyKind = "preview" | "redo" | "asv" | null;

export const CHECKOUT_SESSION_KEY = "djs_checkout_session";
export const RESTORE_PAID_KEY = "djs_restore_paid";

export function newShotId(): string {
  return `shot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type RestorePaidData = {
  paid?: boolean;
  orderId?: string;
  unlockToken?: string;
  orderTicket?: string;
  packId?: PackId;
  purposeId?: PurposeId;
  previewAssetId?: string | null;
  previewVault?: string | null;
  shots?: Shot[];
  selectedShotId?: string | null;
  subjectLook?: SubjectLookId;
  subjectSeason?: SubjectSeasonId;
  selfie?: string | null;
  layoutPaidSizeIds?: string[];
  redoUsed?: number;
  asvUsed?: number;
};
