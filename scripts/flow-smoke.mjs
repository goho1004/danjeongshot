/**
 * ?꾩껜 ?뚮줈???ㅻえ??留ㅽ듃由?뒪
 * BASE_URL=... MOCK_GENERATE=1 沅뚯옣
 * node scripts/flow-smoke.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const sharp = require("sharp");

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";

async function pngDataUrl(seed = 0) {
  // ?쒕뱶留덈떎 ?쎌???諛붽퓭 ?숈씪 ?대?吏 荑쇳꽣(429)瑜??쇳븿
  const r = 100 + (seed * 37) % 120;
  const g = 90 + (seed * 53) % 130;
  const b = 80 + (seed * 19) % 140;
  const png = await sharp({
    create: {
      width: 400 + (seed % 7),
      height: 520 + (seed % 5),
      channels: 3,
      background: { r, g, b },
    },
  })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

function assert(steps, step, ok, extra = {}) {
  steps.push({ step, ok, ...extra });
  if (!ok) {
    console.log(JSON.stringify({ ok: false, steps }, null, 2));
    process.exit(1);
  }
}

async function clearMemory() {
  const res = await fetch(`${BASE}/api/test/clear-memory`, { method: "POST" });
  const j = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, ...j };
}

async function preview(imageBase64, device) {
  const gen = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-djs-device": device,
    },
    body: JSON.stringify({ stage: "preview", purposeId: "resume", imageBase64 }),
  });
  const j = await gen.json();
  return { res: gen, j };
}

async function checkout(opts) {
  const co = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      purposeId: "resume",
      includeLayout: false,
      ...opts,
    }),
  });
  return { res: co, j: await co.json() };
}

async function complete(orderId, orderTicket) {
  const pay = await fetch(`${BASE}/api/checkout/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, orderTicket }),
  });
  return { res: pay, j: await pay.json() };
}

async function regen(stage, { imageBase64, orderId, unlockToken }) {
  const r = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stage,
      purposeId: "resume",
      imageBase64,
      orderId,
      unlockToken,
    }),
  });
  return { res: r, j: await r.json() };
}

async function download({ orderId, unlockToken, previewVault }) {
  const r = await fetch(`${BASE}/api/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, unlockToken, previewVault }),
  });
  return { res: r, j: await r.json() };
}

/** A: preview ??checkout ??complete ??download (no redo) */
async function caseDirectDownload(imageBase64, steps) {
  const device = `smoke_direct_${Date.now()}`;
  const { res: gRes, j: g } = await preview(imageBase64, device);
  assert(steps, "A.generate", gRes.ok && !!g.previewVault, {
    status: gRes.status,
    err: g.error,
  });

  const { res: cRes, j: c } = await checkout({
    previewAssetId: g.previewAssetId,
    previewVault: g.previewVault,
  });
  assert(steps, "A.checkout", cRes.ok && !!c.orderId && !!c.orderTicket, {
    status: cRes.status,
    err: c.error,
  });

  const { res: pRes, j: p } = await complete(c.orderId, c.orderTicket);
  assert(steps, "A.complete", pRes.ok && !!p.unlockToken, {
    status: pRes.status,
    err: p.error,
  });

  const { res: dRes, j: d } = await download({
    orderId: c.orderId,
    unlockToken: p.unlockToken,
    previewVault: g.previewVault,
  });
  assert(steps, "A.download", dRes.ok && !!d.cleanBase64 && !!d.unlockToken, {
    status: dRes.status,
    err: d.error,
  });
}

/** B: preview ??pay ??redo ??download */
async function caseRedoDownload(imageBase64, steps) {
  const device = `smoke_redo_${Date.now()}`;
  const { res: gRes, j: g } = await preview(imageBase64, device);
  assert(steps, "B.generate", gRes.ok && !!g.previewVault, {
    status: gRes.status,
    err: g.error,
  });

  const { res: cRes, j: c } = await checkout({
    previewAssetId: g.previewAssetId,
    previewVault: g.previewVault,
  });
  assert(steps, "B.checkout", cRes.ok && !!c.orderId, {
    status: cRes.status,
    err: c.error,
  });

  const { res: pRes, j: p } = await complete(c.orderId, c.orderTicket);
  assert(steps, "B.complete", pRes.ok && !!p.unlockToken, {
    status: pRes.status,
    err: p.error,
  });

  let unlockToken = p.unlockToken;
  let previewVault = g.previewVault;

  const { res: rRes, j: r } = await regen("redo", {
    imageBase64,
    orderId: c.orderId,
    unlockToken,
  });
  assert(steps, "B.redo", rRes.ok && !!r.shot?.imageUrl && !!r.unlockToken && !!r.previewVault, {
    status: rRes.status,
    err: r.error,
    redoUsed: r.redoUsed,
  });
  unlockToken = r.unlockToken;
  previewVault = r.previewVault;

  const { res: dRes, j: d } = await download({
    orderId: c.orderId,
    unlockToken,
    previewVault,
  });
  assert(steps, "B.download", dRes.ok && !!d.cleanBase64, {
    status: dRes.status,
    err: d.error,
  });
}

/** C: preview ??pay ??redo ??asv ??download ??download again */
async function caseRedoAsvRedownload(imageBase64, steps) {
  const device = `smoke_asv_${Date.now()}`;
  const { res: gRes, j: g } = await preview(imageBase64, device);
  assert(steps, "C.generate", gRes.ok && !!g.previewVault, {
    status: gRes.status,
    err: g.error,
  });

  const { res: cRes, j: c } = await checkout({
    previewAssetId: g.previewAssetId,
    previewVault: g.previewVault,
  });
  assert(steps, "C.checkout", cRes.ok && !!c.orderId, {
    status: cRes.status,
    err: c.error,
  });

  const { res: pRes, j: p } = await complete(c.orderId, c.orderTicket);
  assert(steps, "C.complete", pRes.ok && !!p.unlockToken, {
    status: pRes.status,
    err: p.error,
  });

  let unlockToken = p.unlockToken;
  let previewVault = g.previewVault;

  const { res: rRes, j: r } = await regen("redo", {
    imageBase64,
    orderId: c.orderId,
    unlockToken,
  });
  assert(steps, "C.redo", rRes.ok && !!r.unlockToken && !!r.previewVault, {
    status: rRes.status,
    err: r.error,
  });
  unlockToken = r.unlockToken;
  previewVault = r.previewVault;

  const { res: aRes, j: a } = await regen("asv", {
    imageBase64,
    orderId: c.orderId,
    unlockToken,
  });
  assert(steps, "C.asv", aRes.ok && !!a.unlockToken && !!a.previewVault, {
    status: aRes.status,
    err: a.error,
    asvUsed: a.asvUsed,
  });
  unlockToken = a.unlockToken;
  previewVault = a.previewVault;

  const { res: dRes, j: d } = await download({
    orderId: c.orderId,
    unlockToken,
    previewVault,
  });
  assert(steps, "C.download", dRes.ok && !!d.cleanBase64 && !!d.unlockToken, {
    status: dRes.status,
    err: d.error,
  });

  // ?ㅼ떆 諛쏄린 ???묐떟 ?좏겙 + vault 媛깆떊
  const { res: d2Res, j: d2 } = await download({
    orderId: c.orderId,
    unlockToken: d.unlockToken,
    previewVault: d.previewVault || previewVault,
  });
  assert(steps, "C.download_again", d2Res.ok && !!d2.cleanBase64, {
    status: d2Res.status,
    err: d2.error,
  });
}

/** D: checkout with vault only (no memory asset id reliance) + clear memory */
async function caseVaultOnlyCheckout(imageBase64, steps) {
  const device = `smoke_vault_${Date.now()}`;
  const { res: gRes, j: g } = await preview(imageBase64, device);
  assert(steps, "D.generate", gRes.ok && !!g.previewVault, {
    status: gRes.status,
    err: g.error,
  });

  const cleared = await clearMemory();
  assert(steps, "D.clear_memory", cleared.ok, {
    status: cleared.status,
    err: cleared.error,
  });

  // previewAssetId ?놁씠 vault留?
  const { res: cRes, j: c } = await checkout({
    previewVault: g.previewVault,
  });
  assert(steps, "D.checkout_vault_only", cRes.ok && !!c.orderId && !!c.orderTicket, {
    status: cRes.status,
    err: c.error,
  });

  // complete??orderTicket留?(硫붾え由?鍮꾩슫 ?ㅻ씪???곗폆?쇰줈 蹂듭썝)
  const cleared2 = await clearMemory();
  assert(steps, "D.clear_before_complete", cleared2.ok, { status: cleared2.status });

  const { res: pRes, j: p } = await complete(c.orderId, c.orderTicket);
  assert(steps, "D.complete_ticket_only", pRes.ok && !!p.unlockToken, {
    status: pRes.status,
    err: p.error,
  });

  const cleared3 = await clearMemory();
  assert(steps, "D.clear_before_download", cleared3.ok, { status: cleared3.status });

  const { res: dRes, j: d } = await download({
    orderId: c.orderId,
    unlockToken: p.unlockToken,
    previewVault: g.previewVault,
  });
  assert(steps, "D.download_after_cold", dRes.ok && !!d.cleanBase64, {
    status: dRes.status,
    err: d.error,
    code: d.code,
  });
}

/** E: fail paths ??unpaid, bad token */
async function caseFailPaths(imageBase64, steps) {
  const device = `smoke_fail_${Date.now()}`;
  const { res: gRes, j: g } = await preview(imageBase64, device);
  assert(steps, "E.generate", gRes.ok && !!g.previewVault, {
    status: gRes.status,
    err: g.error,
  });

  const { res: cRes, j: c } = await checkout({
    previewAssetId: g.previewAssetId,
    previewVault: g.previewVault,
  });
  assert(steps, "E.checkout", cRes.ok && !!c.orderId, {
    status: cRes.status,
    err: c.error,
  });

  // unpaid download (complete ??
  const unpaid = await download({
    orderId: c.orderId,
    unlockToken: c.orderTicket,
    previewVault: g.previewVault,
  });
  assert(steps, "E.unpaid_download", unpaid.res.status === 403, {
    status: unpaid.res.status,
    err: unpaid.j.error,
  });

  const { res: pRes, j: p } = await complete(c.orderId, c.orderTicket);
  assert(steps, "E.complete", pRes.ok && !!p.unlockToken, {
    status: pRes.status,
    err: p.error,
  });

  const bad = await download({
    orderId: c.orderId,
    unlockToken: "not-a-real-token",
    previewVault: g.previewVault,
  });
  assert(steps, "E.bad_token", bad.res.status === 403, {
    status: bad.res.status,
    err: bad.j.error,
  });

  // expired / missing vault after memory clear
  const cleared = await clearMemory();
  assert(steps, "E.clear", cleared.ok, { status: cleared.status });
  const expired = await download({
    orderId: c.orderId,
    unlockToken: p.unlockToken,
    previewVault: "",
  });
  assert(
    steps,
    "E.expired_vault",
    expired.res.status === 410 || expired.res.status === 404,
    {
      status: expired.res.status,
      err: expired.j.error,
      code: expired.j.code,
    }
  );
}

async function main() {
  const steps = [];
  const t = Date.now();

  console.log(`flow-smoke @ ${BASE}`);

  await caseDirectDownload(await pngDataUrl(t + 1), steps);
  await caseRedoDownload(await pngDataUrl(t + 2), steps);
  await caseRedoAsvRedownload(await pngDataUrl(t + 3), steps);
  await caseVaultOnlyCheckout(await pngDataUrl(t + 4), steps);
  await caseFailPaths(await pngDataUrl(t + 5), steps);

  console.log(JSON.stringify({ ok: true, cases: steps.length, steps }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

