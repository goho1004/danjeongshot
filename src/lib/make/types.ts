import type { PackId, PurposeId, SubjectLookId, SubjectSeasonId } from "@/lib/purposes";

export type Shot = {
  id: string;
  imageUrl: string;
  /** 이스터 슬롯 클린 원본 (있으면 제거 업셀용). vault도 클린. */
  imageUrlClean?: string;
  label: string;
  timeSec?: string;
  vault: string | null;
  unlocked: boolean;
  /** 의도적 희소 보너스 — 워터마크 오버레이 (제출용 비권장) */
  easter?: boolean;
  easterVariant?: "glyph" | "animal";
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
  /** 결제 복원 힌트 — packId 없을 때 plus 판별 */
  includeLayout?: boolean;
  amountKrw?: number;
  purposeId?: PurposeId;
  previewAssetId?: string | null;
  previewVault?: string | null;
  shots?: Shot[];
  selectedShotId?: string | null;
  primaryShotId?: string | null;
  subjectLook?: SubjectLookId;
  subjectSeason?: SubjectSeasonId;
  selfie?: string | null;
  layoutPaidSizeIds?: string[];
  layoutPackPaid?: boolean;
  extraPaidIds?: string[];
  redoUsed?: number;
  asvUsed?: number;
  downloaded?: boolean;
  savedOnce?: boolean;
  layoutSavedOnce?: boolean;
};
