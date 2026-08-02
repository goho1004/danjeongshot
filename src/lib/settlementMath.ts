/**
 * 유보 램프 · 정산 수학 (프로토타입)
 * 당기유보 = min(GMV×holdCap%, 목표잔고 − 현재잔고)
 */

export type SettlementInput = {
  gmvKrw: number;
  ratePct: number;
  holdCapPct: number;
  holdTargetPct: number;
  /** 직전까지의 유보 잔고 */
  holdBalanceKrw: number;
  /** 목표 산정용 기준 GMV (avg 등) — 없으면 당기 GMV */
  baseGmvKrw?: number;
  refundKrw?: number;
};

export type SettlementLine = {
  gmvKrw: number;
  incentKrw: number;
  targetHoldKrw: number;
  holdGapKrw: number;
  periodHoldKrw: number;
  refundKrw: number;
  payoutKrw: number;
  nextHoldBalanceKrw: number;
};

export function computeSettlement(input: SettlementInput): SettlementLine {
  const gmv = Math.max(0, Math.round(input.gmvKrw));
  const rate = Math.min(100, Math.max(0, input.ratePct));
  const cap = Math.min(100, Math.max(0, input.holdCapPct));
  const targetPct = Math.min(100, Math.max(0, input.holdTargetPct));
  const bal = Math.max(0, Math.round(input.holdBalanceKrw));
  const base = Math.max(0, Math.round(input.baseGmvKrw ?? gmv));
  const refund = Math.max(0, Math.round(input.refundKrw ?? 0));

  const incentKrw = Math.round((gmv * rate) / 100);
  const targetHoldKrw = Math.round((base * targetPct) / 100);
  const holdGapKrw = Math.max(0, targetHoldKrw - bal);
  const capHold = Math.round((gmv * cap) / 100);
  const periodHoldKrw = Math.min(capHold, holdGapKrw);

  let payoutKrw = incentKrw - periodHoldKrw - refund;
  if (payoutKrw < 0) payoutKrw = 0;

  const nextHoldBalanceKrw = Math.max(0, bal + periodHoldKrw - refund);

  return {
    gmvKrw: gmv,
    incentKrw,
    targetHoldKrw,
    holdGapKrw,
    periodHoldKrw,
    refundKrw: refund,
    payoutKrw,
    nextHoldBalanceKrw,
  };
}
