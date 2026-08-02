"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type AgentRow = {
  code: string;
  name: string;
  type: string;
  ratePct: number;
  taxMode: string;
  payoutCycle: string;
  holdCapPct: number;
  holdTargetPct: number;
  holdBalanceKrw: number;
  marketNote?: string;
  recruitChannel?: string;
  settlementReady: boolean;
  missingFields: string[];
  makeUrl: string;
  period: {
    orderCount: number;
    gmvKrw: number;
    incentKrw: number;
    periodHoldKrw: number;
    payoutKrw: number;
    targetHoldKrw: number;
    nextHoldBalanceKrw: number;
  };
};

function won(n: number) {
  return `₩${n.toLocaleString("ko-KR")}`;
}

export default function ProtoAgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/proto/agents");
    const data = await res.json();
    setAgents(data.agents || []);
    setLedgerTotal(data.ledgerTotal || 0);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const seed = async (ordersPerAgent = 10) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/proto/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed", ordersPerAgent, amountKrw: 9900 }),
      });
      const data = await res.json();
      setMsg(`시드 ${data.seeded}건 (대리점당 ${ordersPerAgent} · ₩9,900)`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await fetch("/api/proto/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
      setMsg("원장 비움");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <p className="text-sm font-medium text-studio-deep">프로토타입 · 자동정산</p>
        <h1 className="mt-2 font-display text-3xl text-ink-950 md:text-4xl">
          대리점 5곳 정산
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-500">
          마스터 5코드 · 유보 램프(당기≤5% · 목표20%) · 시드 결제 원장.
          실이체·세금계산서는 미연결. 만들기 링크에{" "}
          <code className="text-ink-700">?partner=</code> 붙이면 주문 귀속.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => seed(10)}
            className="rounded-full bg-studio px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            시드 10건×5
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => seed(30)}
            className="rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-800 disabled:opacity-50"
          >
            시드 30건×5
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => clear()}
            className="rounded-full border border-ink-200 px-5 py-2.5 text-sm font-medium text-ink-500 disabled:opacity-50"
          >
            원장 초기화
          </button>
          <Link href="/make" className="text-sm font-semibold text-studio underline-offset-4 hover:underline">
            /make
          </Link>
          <span className="text-xs text-ink-400">원장 {ledgerTotal}건</span>
        </div>
        {msg && <p className="mt-3 text-sm text-studio-deep">{msg}</p>}

        <ul className="mt-10 space-y-6">
          {agents.map((a) => (
            <li
              key={a.code}
              className="border border-ink-100 bg-white p-5 shadow-soft md:p-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-studio">{a.code}</p>
                  <h2 className="mt-1 font-display text-xl text-ink-950">{a.name}</h2>
                  <p className="mt-1 text-xs text-ink-500">
                    {a.type === "corp" ? "법인" : "개인"} · {a.ratePct}% ·{" "}
                    {a.taxMode === "invoice" ? "세금계산서" : "원천"} · {a.payoutCycle}
                    {a.marketNote ? ` · ${a.marketNote}` : ""}
                  </p>
                </div>
                <a
                  href={`/make?partner=${a.code}`}
                  className="text-sm font-semibold text-studio underline-offset-4 hover:underline"
                >
                  만들기 링크 →
                </a>
              </div>

              {!a.settlementReady && (
                <p className="mt-3 text-xs text-red-700">
                  정산 칸 부족: {a.missingFields.join(", ")}
                </p>
              )}

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div>
                  <dt className="text-xs text-ink-400">건수</dt>
                  <dd className="font-semibold">{a.period.orderCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">GMV</dt>
                  <dd className="font-semibold">{won(a.period.gmvKrw)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">인센</dt>
                  <dd className="font-semibold">{won(a.period.incentKrw)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">당기 유보</dt>
                  <dd className="font-semibold">{won(a.period.periodHoldKrw)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">실지급(예상)</dt>
                  <dd className="font-semibold text-studio-deep">
                    {won(a.period.payoutKrw)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">유보잔고→다음</dt>
                  <dd className="font-semibold">
                    {won(a.holdBalanceKrw)} → {won(a.period.nextHoldBalanceKrw)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">목표 유보(20%)</dt>
                  <dd className="font-semibold">{won(a.period.targetHoldKrw)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">유보상한</dt>
                  <dd className="font-semibold">{a.holdCapPct}%</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <p className="mt-12 text-xs text-ink-400">
          데이터: <code>data/agents.example.json</code> · API:{" "}
          <code>/api/proto/agents</code> · 정본:{" "}
          <code>docs/AGENT_MASTER_FIELDS.md</code>
        </p>
      </div>
    </div>
  );
}
