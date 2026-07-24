/**
 * 인메모리 스토어 접근 — 테스트/스모크용 클리어 포함.
 * 프로덕션에서는 MOCK_GENERATE=1 일 때만 clear 허용.
 */

import type { Order } from "@/lib/orders";
import type { PreviewAsset } from "@/lib/previewAssets";

type Store = {
  orders: Map<string, Order>;
  assets: Map<string, PreviewAsset>;
};

function maps(): Store {
  const g = globalThis as unknown as {
    __djsOrders?: Map<string, Order>;
    __djsPreviewAssets?: Map<string, PreviewAsset>;
  };
  if (!g.__djsOrders) g.__djsOrders = new Map();
  if (!g.__djsPreviewAssets) g.__djsPreviewAssets = new Map();
  return { orders: g.__djsOrders, assets: g.__djsPreviewAssets };
}

/** 서버리스 cold start 시뮬레이션 — 메모리 Map 비우기 */
export function clearRuntimeMaps(): { orders: number; assets: number } {
  const { orders, assets } = maps();
  const counts = { orders: orders.size, assets: assets.size };
  orders.clear();
  assets.clear();
  return counts;
}

export function runtimeStoreSize(): { orders: number; assets: number } {
  const { orders, assets } = maps();
  return { orders: orders.size, assets: assets.size };
}
