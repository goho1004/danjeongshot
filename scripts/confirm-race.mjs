/**
 * `npm run maint:confirm-race` — SMOKE_BASE 필요.
 * 실제 HTTP 라우트 경쟁 시험 — /api/checkout/confirm 동시 N건.
 * 완료 기준: 승인 실행(confirmed) 1건 · 나머지는 진행 중/재생 · paid 주문 1건.
 */
const BASE = process.env.SMOKE_BASE || "http://localhost:3111";
const N = Number(process.env.RACE_N || "20");
// 서버가 살아 있는 동안 저장소가 유지되므로 실행마다 새 결제키를 쓴다
const RUN = `${Date.now().toString(36)}`;

async function newOrder() {
  const res = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purposeId: "resume", packId: "basic" }),
  });
  if (!res.ok) throw new Error(`checkout ${res.status}`);
  return res.json();
}

async function confirm(order, paymentKey) {
  const res = await fetch(`${BASE}/api/checkout/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentKey,
      orderId: order.orderId,
      amount: order.amountKrw,
      orderTicket: order.orderTicket,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return {
    status: res.status,
    outcome: data.outcome ?? (data.alreadyPaid ? "alreadyPaid" : undefined),
    code: data.code,
    ok: res.ok,
  };
}

function tally(list, key) {
  const m = {};
  for (const r of list) {
    const k = r[key] ?? "-";
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

const out = {};

// 1) 같은 paymentKey 동시 N건
{
  const order = await newOrder();
  const results = await Promise.all(
    Array.from({ length: N }, () => confirm(order, `pk_same_${RUN}`))
  );
  const confirmed = results.filter((r) => r.outcome === "confirmed").length;
  const replayed = results.filter((r) => r.outcome === "replayed").length;
  out.sameKeyConcurrent = {
    n: N,
    confirmed,
    replayed,
    byCode: tally(results, "code"),
    byStatus: tally(results, "status"),
    pass: confirmed === 1,
  };

  // 2) 그 뒤 순차 5회 = 전부 replayed (새로고침·뒤로가기)
  const after = [];
  for (let i = 0; i < 5; i++) after.push(await confirm(order, `pk_same_${RUN}`));
  out.sequentialAfter = {
    outcomes: after.map((r) => r.outcome ?? r.code),
    pass: after.every((r) => r.outcome === "replayed" || r.outcome === "alreadyPaid"),
  };

  // 3) 같은 주문에 다른 결제키 → 거부
  const other = await confirm(order, `pk_other_${RUN}`);
  out.otherKeySameOrder = {
    status: other.status,
    code: other.code,
    pass: !other.ok,
  };
}

// 4) 서로 다른 주문은 서로를 막지 않는다
{
  const orders = await Promise.all([newOrder(), newOrder(), newOrder()]);
  const results = await Promise.all(
    orders.map((o, i) => confirm(o, `pk_multi_${i}_${RUN}`))
  );
  out.distinctOrders = {
    outcomes: results.map((r) => r.outcome ?? r.code),
    pass: results.every((r) => r.outcome === "confirmed"),
  };
}

// 5) 한 결제키를 다른 주문에 재사용 → 거부
{
  const [a, b] = await Promise.all([newOrder(), newOrder()]);
  const key = `pk_reuse_${RUN}`;
  const first = await confirm(a, key);
  const second = await confirm(b, key);
  out.keyReuseAcrossOrders = {
    first: first.outcome ?? first.code,
    second: second.code,
    secondStatus: second.status,
    pass: first.outcome === "confirmed" && !second.ok,
  };
}

out.ALL_PASS = Object.values(out).every((v) => v === true || v?.pass !== false);
console.log(JSON.stringify(out, null, 1));
process.exit(out.ALL_PASS ? 0 : 1);
