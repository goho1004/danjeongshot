/**
 * 주문 — 메모리 캐시 + 서명된 unlockToken(서버리스 인스턴스 간 전달).
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import type { PackId } from "@/lib/purposes";
import type {
  AgentType,
  PayoutCycle,
  RefundLag,
  TaxMode,
} from "@/lib/agents";
import { appendLedger } from "@/lib/agentLedger";

export type { PackId };

export type Order = {
  id: string;
  purposeId: string;
  packId: PackId;
  includeSheet: boolean;
  amountKrw: number;
  paid: boolean;
  unlockToken: string;
  createdAt: number;
  previewAssetId: string | null;
  /** 결제 후 컷이 클라이언트에 전달된 시각(화면 열람·캡처 가능 시점) */
  cutDeliveredAt: number | null;
  downloadedAt: number | null;
  /** 제공 개시 채널 · 이메일 발송 포함 */
  deliverChannel: "download" | "email" | null;
  redoUsed: number;
  asvUsed: number;
  /** 팩 포함 1장 이후, 추가로 결제한 컷 id */
  extraPaidShotIds: string[];
  /** 인화 레이아웃 첫 1종 무료 사용 여부 */
  layoutFreeUsed: boolean;
  /** 개별 결제한(또는 팩 포함) 레이아웃 사이즈 id */
  layoutPaidSizeIds: string[];
  /** 전 사이즈 패키지 결제 */
  layoutPackPaid: boolean;
  /** 대리점 귀속 (결제 시점 스냅샷) */
  partnerCode: string | null;
  ratePctSnapshot: number | null;
  agentTypeSnapshot: AgentType | null;
  taxModeSnapshot: TaxMode | null;
  payoutCycleSnapshot: PayoutCycle | null;
  holdCapPctSnapshot: number | null;
  holdTargetPctSnapshot: number | null;
  refundLagSnapshot: RefundLag | null;
};

export const REDO_LIMIT = 1;
export const ASV_LIMIT = 1;

const g = globalThis as unknown as { __djsOrders?: Map<string, Order> };
if (!g.__djsOrders) g.__djsOrders = new Map();

function secretKey(): Buffer {
  const s =
    process.env.PREVIEW_QUOTA_SECRET?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    "danjeongshot-dev-order-secret";
  return createHash("sha256").update(`order:${s}`).digest();
}

type SealBody = {
  v: 8;
  id: string;
  purposeId: string;
  packId: PackId;
  includeSheet: boolean;
  amountKrw: number;
  paid: boolean;
  createdAt: number;
  previewAssetId: string | null;
  cutDeliveredAt: number | null;
  downloadedAt: number | null;
  deliverChannel: "download" | "email" | null;
  redoUsed: number;
  asvUsed: number;
  extraPaidShotIds: string[];
  layoutFreeUsed: boolean;
  layoutPaidSizeIds: string[];
  layoutPackPaid: boolean;
  partnerCode: string | null;
  ratePctSnapshot: number | null;
  agentTypeSnapshot: AgentType | null;
  taxModeSnapshot: TaxMode | null;
  payoutCycleSnapshot: PayoutCycle | null;
  holdCapPctSnapshot: number | null;
  holdTargetPctSnapshot: number | null;
  refundLagSnapshot: RefundLag | null;
};

function normalizePackId(
  data: { packId?: string; amountKrw?: number; includeSheet?: boolean }
): PackId {
  if (data.packId === "plus" || data.packId === "basic") return data.packId;
  if (Number(data.amountKrw) >= 14000 || data.includeSheet) return "plus";
  return "basic";
}

function sealPayload(o: Omit<Order, "unlockToken">): string {
  const body: SealBody = {
    v: 8,
    id: o.id,
    purposeId: o.purposeId,
    packId: o.packId === "plus" ? "plus" : "basic",
    includeSheet: !!o.includeSheet,
    amountKrw: o.amountKrw,
    paid: o.paid,
    createdAt: o.createdAt,
    previewAssetId: o.previewAssetId,
    cutDeliveredAt: o.cutDeliveredAt ?? null,
    downloadedAt: o.downloadedAt,
    deliverChannel: o.deliverChannel ?? null,
    redoUsed: o.redoUsed,
    asvUsed: o.asvUsed,
    extraPaidShotIds: o.extraPaidShotIds ?? [],
    layoutFreeUsed: !!o.layoutFreeUsed,
    layoutPaidSizeIds: o.layoutPaidSizeIds ?? [],
    layoutPackPaid: !!o.layoutPackPaid,
    partnerCode: o.partnerCode ?? null,
    ratePctSnapshot: o.ratePctSnapshot ?? null,
    agentTypeSnapshot: o.agentTypeSnapshot ?? null,
    taxModeSnapshot: o.taxModeSnapshot ?? null,
    payoutCycleSnapshot: o.payoutCycleSnapshot ?? null,
    holdCapPctSnapshot: o.holdCapPctSnapshot ?? null,
    holdTargetPctSnapshot: o.holdTargetPctSnapshot ?? null,
    refundLagSnapshot: o.refundLagSnapshot ?? null,
  };
  const plain = Buffer.from(JSON.stringify(body), "utf8");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

function normalizeLayoutFields(data: Record<string, unknown>): {
  layoutFreeUsed: boolean;
  layoutPaidSizeIds: string[];
  layoutPackPaid: boolean;
} {
  const pack = !!data.layoutPackPaid;
  const free = !!data.layoutFreeUsed;
  let sizes: string[] = Array.isArray(data.layoutPaidSizeIds)
    ? data.layoutPaidSizeIds.map(String)
    : [];
  // v3 호환: layoutPaidKeys "shot:size" → size
  if (!sizes.length && Array.isArray(data.layoutPaidKeys)) {
    sizes = data.layoutPaidKeys.map((k) => {
      const s = String(k);
      const i = s.lastIndexOf(":");
      return i >= 0 ? s.slice(i + 1) : s;
    });
  }
  return {
    layoutFreeUsed: free || sizes.length > 0,
    layoutPaidSizeIds: Array.from(new Set(sizes)),
    layoutPackPaid: pack,
  };
}

export function unsealOrder(token: string): Order | null {
  try {
    if (!token || token.length < 40 || token.length > 12000) return null;
    const buf = Buffer.from(token, "base64url");
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", secretKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    const data = JSON.parse(plain.toString("utf8")) as SealBody & {
      v: number;
      layoutPaidKeys?: string[];
    };
    if (data.v < 1 || data.v > 8 || !data.id) return null;
    if (Date.now() - (data.createdAt || 0) > 1000 * 60 * 60 * 24 * 7) return null;
    const layout = normalizeLayoutFields(data as unknown as Record<string, unknown>);
    const legacy = data as SealBody & {
      cutDeliveredAt?: number | null;
      deliverChannel?: "download" | "email" | null;
      partnerCode?: string | null;
      ratePctSnapshot?: number | null;
      agentTypeSnapshot?: AgentType | null;
      taxModeSnapshot?: TaxMode | null;
      payoutCycleSnapshot?: PayoutCycle | null;
      holdCapPctSnapshot?: number | null;
      holdTargetPctSnapshot?: number | null;
      refundLagSnapshot?: RefundLag | null;
    };
    const base: Omit<Order, "unlockToken"> = {
      id: data.id,
      purposeId: data.purposeId,
      packId: normalizePackId(data),
      includeSheet: !!data.includeSheet,
      amountKrw: Number(data.amountKrw) || 0,
      paid: !!data.paid,
      createdAt: data.createdAt,
      previewAssetId: data.previewAssetId ?? null,
      cutDeliveredAt: legacy.cutDeliveredAt ?? null,
      downloadedAt: data.downloadedAt ?? null,
      deliverChannel: legacy.deliverChannel ?? null,
      redoUsed: Number(data.redoUsed) || 0,
      asvUsed: Number(data.asvUsed) || 0,
      extraPaidShotIds: Array.isArray(data.extraPaidShotIds)
        ? data.extraPaidShotIds.map(String)
        : [],
      ...layout,
      partnerCode: legacy.partnerCode ?? null,
      ratePctSnapshot:
        legacy.ratePctSnapshot != null ? Number(legacy.ratePctSnapshot) : null,
      agentTypeSnapshot: legacy.agentTypeSnapshot ?? null,
      taxModeSnapshot: legacy.taxModeSnapshot ?? null,
      payoutCycleSnapshot: legacy.payoutCycleSnapshot ?? null,
      holdCapPctSnapshot:
        legacy.holdCapPctSnapshot != null
          ? Number(legacy.holdCapPctSnapshot)
          : null,
      holdTargetPctSnapshot:
        legacy.holdTargetPctSnapshot != null
          ? Number(legacy.holdTargetPctSnapshot)
          : null,
      refundLagSnapshot: legacy.refundLagSnapshot ?? null,
    };
    return { ...base, unlockToken: token };
  } catch {
    return null;
  }
}

function cache(order: Order): Order {
  const sealed = sealPayload({
    ...order,
    extraPaidShotIds: order.extraPaidShotIds ?? [],
    layoutPaidSizeIds: order.layoutPaidSizeIds ?? [],
  });
  const next = { ...order, unlockToken: sealed };
  g.__djsOrders!.set(next.id, next);
  return next;
}

export function resolveOrder(orderId: string, token: string): Order | null {
  const fromToken = unsealOrder(token);
  if (fromToken && fromToken.id === orderId) {
    const mem = g.__djsOrders!.get(orderId);
    // Redis·직전 갱신으로 메모리가 앞서면 stale 토큰으로 되돌리지 않음
    if (
      mem &&
      mem.id === orderId &&
      (mem.paid ||
        mem.redoUsed > fromToken.redoUsed ||
        mem.asvUsed > fromToken.asvUsed ||
        (!!mem.downloadedAt && !fromToken.downloadedAt) ||
        mem.layoutPaidSizeIds.length > fromToken.layoutPaidSizeIds.length)
    ) {
      return mem;
    }
    g.__djsOrders!.set(fromToken.id, fromToken);
    return fromToken;
  }
  const mem = g.__djsOrders!.get(orderId);
  if (mem && mem.unlockToken === token) return mem;
  return null;
}

export function createSandboxOrder(input: {
  purposeId: string;
  packId: PackId;
  includeSheet: boolean;
  amountKrw: number;
  previewAssetId?: string | null;
  layoutPaidSizeIds?: string[];
  layoutFreeUsed?: boolean;
  partnerCode?: string | null;
  ratePctSnapshot?: number | null;
  agentTypeSnapshot?: AgentType | null;
  taxModeSnapshot?: TaxMode | null;
  payoutCycleSnapshot?: PayoutCycle | null;
  holdCapPctSnapshot?: number | null;
  holdTargetPctSnapshot?: number | null;
  refundLagSnapshot?: RefundLag | null;
}): Order {
  const id = `ord_${randomBytes(8).toString("hex")}`;
  const packId = input.packId === "plus" ? "plus" : "basic";
  const included = input.layoutPaidSizeIds ?? [];
  const base: Omit<Order, "unlockToken"> = {
    id,
    purposeId: input.purposeId,
    packId,
    includeSheet: input.includeSheet,
    amountKrw: input.amountKrw,
    paid: false,
    createdAt: Date.now(),
    previewAssetId: input.previewAssetId ?? null,
    cutDeliveredAt: null,
    downloadedAt: null,
    deliverChannel: null,
    redoUsed: 0,
    asvUsed: 0,
    extraPaidShotIds: [],
    layoutFreeUsed: !!input.layoutFreeUsed || included.length > 0,
    layoutPaidSizeIds: [...included],
    layoutPackPaid: false,
    partnerCode: input.partnerCode ?? null,
    ratePctSnapshot: input.ratePctSnapshot ?? null,
    agentTypeSnapshot: input.agentTypeSnapshot ?? null,
    taxModeSnapshot: input.taxModeSnapshot ?? null,
    payoutCycleSnapshot: input.payoutCycleSnapshot ?? null,
    holdCapPctSnapshot: input.holdCapPctSnapshot ?? null,
    holdTargetPctSnapshot: input.holdTargetPctSnapshot ?? null,
    refundLagSnapshot: input.refundLagSnapshot ?? null,
  };
  return cache({ ...base, unlockToken: "" });
}

export function getOrder(id: string): Order | undefined {
  return g.__djsOrders!.get(id);
}

export function putOrder(order: Order): Order {
  return cache(order);
}

export function markPaid(id: string, ticket?: string): Order | undefined {
  let o = g.__djsOrders!.get(id);
  if (!o && ticket) o = unsealOrder(ticket) ?? undefined;
  if (!o || o.id !== id) return undefined;
  const wasPaid = o.paid;
  o.paid = true;
  const next = cache(o);
  if (!wasPaid && next.partnerCode && next.ratePctSnapshot != null) {
    appendLedger({
      id: `led_${next.id}`,
      orderId: next.id,
      partnerCode: next.partnerCode,
      amountKrw: next.amountKrw,
      ratePct: next.ratePctSnapshot,
      agentType: next.agentTypeSnapshot || "indiv",
      taxMode: next.taxModeSnapshot || "withhold",
      paidAt: Date.now(),
    });
  }
  return next;
}

export function verifyUnlock(orderId: string, token: string): boolean {
  const o = resolveOrder(orderId, token);
  return !!o && o.paid;
}

export function markDownloaded(
  orderId: string,
  token: string,
  channel: "download" | "email" = "download"
): Order | null {
  const o = resolveOrder(orderId, token);
  if (!o || !o.paid) return null;
  if (!o.downloadedAt) o.downloadedAt = Date.now();
  if (!o.deliverChannel) o.deliverChannel = channel;
  return cache(o);
}

/** 추가 컷 결제 (샌드박스) */
export function markExtraShotPaid(
  orderId: string,
  token: string,
  shotId: string
): Order | null {
  const o = resolveOrder(orderId, token);
  if (!o || !o.paid) return null;
  if (!o.downloadedAt) return null;
  if (!o.extraPaidShotIds.includes(shotId)) {
    o.extraPaidShotIds = [...o.extraPaidShotIds, shotId];
  }
  return cache(o);
}

export function canDownloadExtraShot(
  orderId: string,
  token: string,
  shotId: string
): boolean {
  const o = resolveOrder(orderId, token);
  return !!o && o.paid && o.extraPaidShotIds.includes(shotId);
}

export function canAccessLayoutSize(order: Order, printSizeId: string): boolean {
  if (order.layoutPackPaid) return true;
  return order.layoutPaidSizeIds.includes(printSizeId);
}

/** 첫 레이아웃 1종 무료 */
export function claimFreeLayout(
  orderId: string,
  token: string,
  printSizeId: string
): Order | null {
  const o = resolveOrder(orderId, token);
  if (!o || !o.paid || !o.downloadedAt) return null;
  if (canAccessLayoutSize(o, printSizeId)) return cache(o);
  if (o.layoutFreeUsed) return null;
  o.layoutFreeUsed = true;
  o.layoutPaidSizeIds = [...o.layoutPaidSizeIds, printSizeId];
  return cache(o);
}

/** 개별 레이아웃 결제 ₩2000 */
export function markLayoutSinglePaid(
  orderId: string,
  token: string,
  printSizeId: string
): Order | null {
  const o = resolveOrder(orderId, token);
  if (!o || !o.paid || !o.downloadedAt) return null;
  if (!o.layoutPaidSizeIds.includes(printSizeId)) {
    o.layoutPaidSizeIds = [...o.layoutPaidSizeIds, printSizeId];
  }
  o.layoutFreeUsed = true;
  return cache(o);
}

/** 전 사이즈 패키지 ₩5000 */
export function markLayoutPackPaid(orderId: string, token: string): Order | null {
  const o = resolveOrder(orderId, token);
  if (!o || !o.paid || !o.downloadedAt) return null;
  o.layoutPackPaid = true;
  o.layoutFreeUsed = true;
  return cache(o);
}

export function markCutDelivered(orderId: string, token: string): Order | null {
  const o = resolveOrder(orderId, token);
  if (!o || !o.paid) return null;
  if (!o.cutDeliveredAt) o.cutDeliveredAt = Date.now();
  return cache(o);
}

export function refundEligibility(orderId: string, token?: string): {
  ok: boolean;
  reason: string;
  downloadedAt: number | null;
  cutDeliveredAt: number | null;
} {
  const o = (token && resolveOrder(orderId, token)) || g.__djsOrders!.get(orderId);
  if (!o) {
    return {
      ok: false,
      reason: "주문을 찾을 수 없습니다.",
      downloadedAt: null,
      cutDeliveredAt: null,
    };
  }
  if (!o.paid) {
    return {
      ok: false,
      reason: "결제되지 않은 주문입니다.",
      downloadedAt: null,
      cutDeliveredAt: null,
    };
  }
  if (o.downloadedAt) {
    return {
      ok: false,
      reason:
        "이미 다운로드하셨습니다. 품질이 아쉬우면 결제 후 다시 만들기를 이용해 주세요.",
      downloadedAt: o.downloadedAt,
      cutDeliveredAt: o.cutDeliveredAt,
    };
  }
  return {
    ok: true,
    reason:
      "다운로드 전 · 자동 환불 아님 · 화면 캡처·저장으로 이용 후 환불 청구는 어뷰징으로 거절될 수 있음 · 시스템 오류만 사유 제출·관리자 승인",
    downloadedAt: null,
    cutDeliveredAt: o.cutDeliveredAt,
  };
}

export function canRunRedo(orderId: string, token: string): { ok: boolean; reason?: string; order?: Order } {
  const o = resolveOrder(orderId, token);
  if (!o || !o.paid) {
    return { ok: false, reason: "결제 확인 후 다시 만들 수 있습니다." };
  }
  if (o.downloadedAt) {
    return { ok: false, reason: "이미 다운로드하셨습니다. 재생성은 다운로드 전에만 가능합니다." };
  }
  if (o.redoUsed >= REDO_LIMIT) {
    return { ok: false, reason: "결제 후 재생성은 1회까지입니다. 한 번 더 봐 주세요를 이용해 주세요." };
  }
  return { ok: true, order: o };
}

export function markRedo(orderId: string, token: string): Order | null {
  const gate = canRunRedo(orderId, token);
  if (!gate.ok || !gate.order) return null;
  gate.order.redoUsed += 1;
  return cache(gate.order);
}

export function canRunAsv(orderId: string, token: string): { ok: boolean; reason?: string; order?: Order } {
  const o = resolveOrder(orderId, token);
  if (!o || !o.paid) {
    return { ok: false, reason: "결제 확인 후 다시 만들 수 있습니다." };
  }
  if (o.downloadedAt) {
    return { ok: false, reason: "이미 다운로드하셨습니다. 추가 다시 만들기는 다운로드 전에만 가능합니다." };
  }
  if (o.redoUsed < REDO_LIMIT) {
    return { ok: false, reason: "먼저 「다시 만들기」를 이용해 주세요." };
  }
  if (o.asvUsed >= ASV_LIMIT) {
    return { ok: false, reason: "추가 다시 만들기는 주문당 1회입니다." };
  }
  return { ok: true, order: o };
}

export function markAsv(orderId: string, token: string): Order | null {
  const gate = canRunAsv(orderId, token);
  if (!gate.ok || !gate.order) return null;
  gate.order.asvUsed += 1;
  return cache(gate.order);
}

export function markRefunded(orderId: string, token?: string): Order | undefined {
  const o = (token && resolveOrder(orderId, token)) || g.__djsOrders!.get(orderId);
  if (!o) return undefined;
  o.paid = false;
  return cache(o);
}
