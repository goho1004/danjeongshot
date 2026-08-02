/**
 * 대리점코드 마스터 — 정산 필수 항목
 * 정본 필드: docs/AGENT_MASTER_FIELDS.md
 * 데이터: data/agents.json (없으면 example)
 */

import { readFileSync, existsSync } from "fs";
import path from "path";

export type AgentType = "corp" | "indiv";
export type AgentStatus = "active" | "paused" | "closed";
export type TaxMode = "invoice" | "withhold";
export type PayoutCycle = "monthly" | "weekly" | "daily";
export type HoldBase = "last_period" | "avg_n";
export type RefundLag = "same" | "next";
export type RecruitChannel = "carrot" | "sns" | "b2b" | "school" | "other";
/** accruing=분할 가맹비 충당중(유보) · converted=가맹비 확정 */
export type FranchiseFeeStatus = "accruing" | "converted";

/** 정산에 필요한 대리점 한 행 */
export type Agent = {
  code: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  ratePct: number;
  taxMode: TaxMode;
  payoutCycle: PayoutCycle;
  holdCapPct: number;
  holdTargetPct: number;
  holdBase: HoldBase;
  holdBaseN: number;
  refundLag: RefundLag;
  contact: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  /** corp */
  bizNo?: string;
  bizName?: string;
  bizCeo?: string;
  bizAddress?: string;
  taxEmail?: string;
  /** indiv */
  legalName?: string;
  residentId?: string;
  withholdNote?: string;
  issuedAt?: string;
  contractAt?: string;
  recruitChannel?: RecruitChannel;
  marketNote?: string;
  minPayoutKrw: number;
  holdBalanceKrw: number;
  /** 분할 가맹비 — docs/AGENT_MASTER_FIELDS.md */
  franchiseFeeStatus?: FranchiseFeeStatus;
  franchiseFeeTargetKrw?: number;
  franchiseFeeConvertedAt?: string;
  franchiseFeeRecognizedKrw?: number;
  opsRefundBufferKrw?: number;
  franchiseFeeMaxMonths?: number;
  notes?: string;
};

export type AgentFile = {
  holdDefaults?: {
    holdCapPct: number;
    holdTargetPct: number;
    holdBase: HoldBase;
    holdBaseN: number;
    franchiseFeeMaxMonths?: number;
  };
  agents: Agent[];
};

/** 주문에 고정하는 스냅샷 (마스터 변경 소급 ✗) */
export type AgentOrderSnapshot = {
  partnerCode: string;
  ratePctSnapshot: number;
  agentTypeSnapshot: AgentType;
  taxModeSnapshot: TaxMode;
  payoutCycleSnapshot: PayoutCycle;
  holdCapPctSnapshot: number;
  holdTargetPctSnapshot: number;
  refundLagSnapshot: RefundLag;
};

const REQUIRED_COMMON: (keyof Agent)[] = [
  "code",
  "name",
  "type",
  "status",
  "ratePct",
  "taxMode",
  "payoutCycle",
  "holdCapPct",
  "holdTargetPct",
  "holdBase",
  "holdBaseN",
  "refundLag",
  "contact",
  "bankName",
  "bankAccount",
  "bankHolder",
  "minPayoutKrw",
];

function dataPath(name: string): string {
  return path.join(process.cwd(), "data", name);
}

let cached: AgentFile | null = null;

export function loadAgentFile(): AgentFile {
  if (cached) return cached;
  const primary = dataPath("agents.json");
  const fallback = dataPath("agents.example.json");
  const file = existsSync(primary) ? primary : fallback;
  const raw = readFileSync(file, "utf8");
  cached = JSON.parse(raw) as AgentFile;
  return cached;
}

/** 테스트·핫리로드용 */
export function clearAgentCache(): void {
  cached = null;
}

export function getAgent(code: string): Agent | null {
  const c = String(code || "")
    .trim()
    .toUpperCase();
  if (!c) return null;
  const hit = loadAgentFile().agents.find(
    (a) => a.code.trim().toUpperCase() === c && a.status === "active"
  );
  return hit ?? null;
}

/** 정산 가능 여부 — 필수 칸 + 타입별 세무/계좌 */
export function agentSettlementReady(a: Agent): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const k of REQUIRED_COMMON) {
    const v = a[k];
    if (v === undefined || v === null || v === "") missing.push(String(k));
  }
  if (!(a.ratePct > 0 && a.ratePct <= 100)) missing.push("ratePct");
  if (a.type === "corp") {
    for (const k of ["bizNo", "bizName", "bizCeo", "taxEmail"] as const) {
      if (!a[k]?.trim()) missing.push(k);
    }
    if (a.taxMode !== "invoice") missing.push("taxMode(invoice)");
  }
  if (a.type === "indiv") {
    for (const k of ["legalName", "residentId"] as const) {
      if (!a[k]?.trim()) missing.push(k);
    }
    if (a.taxMode !== "withhold") missing.push("taxMode(withhold)");
  }
  if (!a.bankName?.trim() || !a.bankAccount?.trim() || !a.bankHolder?.trim()) {
    // already in REQUIRED_COMMON but keep explicit
  }
  return { ok: missing.length === 0, missing };
}

export function snapshotFromAgent(a: Agent): AgentOrderSnapshot {
  return {
    partnerCode: a.code,
    ratePctSnapshot: a.ratePct,
    agentTypeSnapshot: a.type,
    taxModeSnapshot: a.taxMode,
    payoutCycleSnapshot: a.payoutCycle,
    holdCapPctSnapshot: a.holdCapPct,
    holdTargetPctSnapshot: a.holdTargetPct,
    refundLagSnapshot: a.refundLag,
  };
}

/** 쿼리/입력 코드 정규화 */
export function normalizePartnerCode(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 32);
}
