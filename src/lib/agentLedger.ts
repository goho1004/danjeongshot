/**
 * 프로토타입 정산 원장 — 메모리 (+ 선택 Upstash는 추후)
 */

export type LedgerEvent = {
  id: string;
  orderId: string;
  partnerCode: string;
  amountKrw: number;
  ratePct: number;
  agentType: "corp" | "indiv";
  taxMode: "invoice" | "withhold";
  paidAt: number;
  refundedAt?: number | null;
  refundKrw?: number;
};

const g = globalThis as unknown as { __djsAgentLedger?: LedgerEvent[] };
if (!g.__djsAgentLedger) g.__djsAgentLedger = [];

export function appendLedger(ev: LedgerEvent): void {
  const list = g.__djsAgentLedger!;
  if (list.some((x) => x.orderId === ev.orderId && !x.refundedAt)) return;
  list.push(ev);
}

export function listLedger(partnerCode?: string): LedgerEvent[] {
  const all = g.__djsAgentLedger!;
  if (!partnerCode) return [...all];
  const c = partnerCode.toUpperCase();
  return all.filter((e) => e.partnerCode.toUpperCase() === c);
}

export function clearLedger(): void {
  g.__djsAgentLedger = [];
}

export function seedLedger(events: LedgerEvent[]): void {
  g.__djsAgentLedger = [...events];
}

export function sumGmv(events: LedgerEvent[]): number {
  return events.reduce((s, e) => {
    if (e.refundedAt) return s - (e.refundKrw || e.amountKrw);
    return s + e.amountKrw;
  }, 0);
}
