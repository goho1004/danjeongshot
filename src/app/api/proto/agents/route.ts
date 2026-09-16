import { NextRequest, NextResponse } from "next/server";
import {
  agentSettlementReady,
  loadAgentFile,
  type Agent,
} from "@/lib/agents";
import {
  clearLedger,
  listLedger,
  seedLedger,
  sumGmv,
  type LedgerEvent,
} from "@/lib/agentLedger";
import { computeSettlement } from "@/lib/settlementMath";
import { randomBytes } from "crypto";
import { isMaintSmokeRequest } from "@/lib/maintSmoke";

export const runtime = "nodejs";

function publicAgent(a: Agent) {
  const ready = agentSettlementReady(a);
  return {
    code: a.code,
    name: a.name,
    type: a.type,
    status: a.status,
    ratePct: a.ratePct,
    taxMode: a.taxMode,
    payoutCycle: a.payoutCycle,
    holdCapPct: a.holdCapPct,
    holdTargetPct: a.holdTargetPct,
    refundLag: a.refundLag,
    recruitChannel: a.recruitChannel,
    marketNote: a.marketNote,
    holdBalanceKrw: a.holdBalanceKrw,
    minPayoutKrw: a.minPayoutKrw,
    settlementReady: ready.ok,
    missingFields: ready.missing,
    makeUrl: `https://danjeongshot.vercel.app/make?partner=${a.code}`,
  };
}

/** GET — 5대리점 + 원장 요약 + 정산 미리보기. 대리점 재무데이터라 maint 헤더 필수. */
export async function GET(req: NextRequest) {
  if (!isMaintSmokeRequest(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const file = loadAgentFile();
  const agents = file.agents.map((a) => {
    const events = listLedger(a.code);
    const gmv = sumGmv(events);
    const line = computeSettlement({
      gmvKrw: gmv,
      ratePct: a.ratePct,
      holdCapPct: a.holdCapPct,
      holdTargetPct: a.holdTargetPct,
      holdBalanceKrw: a.holdBalanceKrw,
      baseGmvKrw: gmv || 297_000,
      refundKrw: 0,
    });
    return {
      ...publicAgent(a),
      period: {
        orderCount: events.filter((e) => !e.refundedAt).length,
        ...line,
      },
    };
  });

  return NextResponse.json({
    proto: true,
    agents,
    ledgerTotal: listLedger().length,
  });
}

/** POST action=seed|clear — 원장 시드/삭제. 파괴적 쓰기라 maint 헤더 필수(운영에선 seed/clear 자체를 안 씀). */
export async function POST(req: NextRequest) {
  if (!isMaintSmokeRequest(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "seed");

  if (action === "clear") {
    clearLedger();
    return NextResponse.json({ ok: true, cleared: true });
  }

  const file = loadAgentFile();
  const perAgent = Math.min(50, Math.max(1, Number(body.ordersPerAgent) || 10));
  const unit = Number(body.amountKrw) || 9900;
  const events: LedgerEvent[] = [];
  const now = Date.now();

  for (const a of file.agents) {
    for (let i = 0; i < perAgent; i++) {
      events.push({
        id: `led_seed_${a.code}_${i}_${randomBytes(3).toString("hex")}`,
        orderId: `ord_seed_${a.code}_${i}_${randomBytes(3).toString("hex")}`,
        partnerCode: a.code,
        amountKrw: unit,
        ratePct: a.ratePct,
        agentType: a.type,
        taxMode: a.taxMode,
        paidAt: now - i * 3600_000,
      });
    }
  }
  seedLedger(events);

  return NextResponse.json({
    ok: true,
    seeded: events.length,
    agents: file.agents.length,
    ordersPerAgent: perAgent,
    amountKrw: unit,
  });
}
