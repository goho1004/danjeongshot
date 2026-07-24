/**
 * 미리보기 자산 — 클린본 서버 보관(+ vault로 인스턴스 간 전달).
 */

import { randomBytes } from "crypto";

export type PreviewAsset = {
  id: string;
  cleanPng: Buffer;
  purposeId: string;
  createdAt: number;
  orderId: string | null;
};

const TTL_MS = 1000 * 60 * 60 * 6;
const g = globalThis as unknown as { __djsPreviewAssets?: Map<string, PreviewAsset> };
if (!g.__djsPreviewAssets) g.__djsPreviewAssets = new Map();

function prune(): void {
  const now = Date.now();
  const entries = Array.from(g.__djsPreviewAssets!.entries());
  for (const [id, a] of entries) {
    if (now - a.createdAt > TTL_MS) g.__djsPreviewAssets!.delete(id);
  }
}

export function storePreviewAsset(input: {
  cleanPng: Buffer;
  purposeId: string;
  id?: string;
}): PreviewAsset {
  prune();
  const id = input.id || `prv_${randomBytes(12).toString("hex")}`;
  const asset: PreviewAsset = {
    id,
    cleanPng: input.cleanPng,
    purposeId: input.purposeId,
    createdAt: Date.now(),
    orderId: null,
  };
  g.__djsPreviewAssets!.set(id, asset);
  return asset;
}

export function getPreviewAsset(id: string): PreviewAsset | undefined {
  prune();
  return g.__djsPreviewAssets!.get(id);
}

export function bindPreviewToOrder(previewId: string, orderId: string): boolean {
  const a = g.__djsPreviewAssets!.get(previewId);
  if (!a) return false;
  a.orderId = orderId;
  g.__djsPreviewAssets!.set(previewId, a);
  return true;
}

/** 다운로드용 — 재다운로드 허용(삭제하지 않음) */
export function getCleanForDownload(
  previewId: string,
  orderId: string
): Buffer | null {
  const a = g.__djsPreviewAssets!.get(previewId);
  if (!a || a.orderId !== orderId) return null;
  return a.cleanPng;
}

export function replaceCleanAsset(
  previewId: string,
  orderId: string,
  cleanPng: Buffer
): boolean {
  const a = g.__djsPreviewAssets!.get(previewId);
  if (!a || a.orderId !== orderId) return false;
  a.cleanPng = cleanPng;
  a.createdAt = Date.now();
  g.__djsPreviewAssets!.set(previewId, a);
  return true;
}
