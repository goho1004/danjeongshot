/**
 * 결제·토큰 무결성 시뮬레이션
 *
 * 잡는 버그 클래스:
 * - 결제 전 generate 허용
 * - complete 후 unlockToken 미갱신 (stale token)
 * - paid=true + pre-pay token 조합 (pagehide flush 시나리오)
 *
 * toss prod: MAINT_SMOKE_SECRET + x-djs-maint-smoke 로 complete 생략(샌드박스)
 */
import { uniqueDeviceId, uniqueSmokePngDataUrl } from "../../lib/smokePng.mjs";
import { maintHeaders } from "./prepPaid.mjs";

async function checkout(base) {
  const res = await fetch(`${base}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purposeId: "resume", packId: "basic" }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function complete(base, orderId, orderTicket) {
  const res = await fetch(`${base}/api/checkout/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...maintHeaders(),
    },
    body: JSON.stringify({ orderId, orderTicket }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function generate(base, { orderId, unlockToken, imageBase64 }) {
  const res = await fetch(`${base}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-djs-device": uniqueDeviceId("pay_integrity"),
      ...maintHeaders(),
    },
    body: JSON.stringify({
      stage: "preview",
      imageBase64,
      purposeId: "resume",
      subjectLook: "as_photo",
      subjectSeason: "as_photo",
      orderId,
      unlockToken,
    }),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, data };
}

/** pagehide flush: paid=true 로 저장됐지만 unlockToken 은 pre-pay */
function simulateStaleSessionStorage(prePayToken, orderId) {
  return {
    v: 2,
    paid: true,
    orderId,
    unlockToken: prePayToken,
    orderTicket: prePayToken,
  };
}

export async function runPaymentIntegrity(base) {
  const checks = [];
  const imageBase64 = await uniqueSmokePngDataUrl();

  const co = await checkout(base);
  checks.push({
    name: "checkout",
    ok: co.ok,
    detail: co.ok ? { mode: co.data.mode, orderId: co.data.orderId } : co.data,
  });
  if (!co.ok) {
    return { name: "payment-integrity", ok: false, checks };
  }

  const { orderId, orderTicket: prePayToken } = co.data;

  const preGen = await generate(base, {
    orderId,
    unlockToken: prePayToken,
    imageBase64,
  });
  checks.push({
    name: "pre-pay-generate-blocked",
    ok: preGen.status === 402 && preGen.data?.code === "PAY_REQUIRED",
    detail: { status: preGen.status, code: preGen.data?.code },
  });

  const cp = await complete(base, orderId, prePayToken);
  checks.push({
    name: "complete",
    ok: cp.ok,
    detail: cp.ok ? { orderId: cp.data.orderId } : cp.data,
  });
  if (!cp.ok) {
    return { name: "payment-integrity", ok: false, checks };
  }

  const postPayToken = cp.data.unlockToken;
  checks.push({
    name: "token-rotated",
    ok: Boolean(postPayToken && postPayToken !== prePayToken),
    detail: {
      preLen: prePayToken?.length ?? 0,
      postLen: postPayToken?.length ?? 0,
      same: postPayToken === prePayToken,
    },
  });

  const postGen = await generate(base, {
    orderId,
    unlockToken: postPayToken,
    imageBase64,
  });
  checks.push({
    name: "post-pay-generate-ok",
    ok: postGen.ok,
    detail: postGen.ok
      ? { mock: postGen.data.mock, asset: postGen.data.previewAssetId }
      : { status: postGen.status, error: postGen.data?.error },
  });

  const staleGen = await generate(base, {
    orderId,
    unlockToken: prePayToken,
    imageBase64,
  });
  checks.push({
    name: "stale-token-blocked",
    ok: staleGen.status === 402 && staleGen.data?.code === "PAY_REQUIRED",
    detail: { status: staleGen.status, code: staleGen.data?.code },
  });

  const staleSession = simulateStaleSessionStorage(prePayToken, orderId);
  const flushGen = await generate(base, {
    orderId: staleSession.orderId,
    unlockToken: staleSession.unlockToken,
    imageBase64,
  });
  checks.push({
    name: "session-flush-stale-blocked",
    ok: flushGen.status === 402 && flushGen.data?.code === "PAY_REQUIRED",
    detail: {
      scenario: "paid=true client + pre-pay unlockToken (pagehide race)",
      status: flushGen.status,
    },
  });

  const ok = checks.every((c) => c.ok);
  return { name: "payment-integrity", ok, checks };
}
