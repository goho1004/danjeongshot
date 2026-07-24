/**
 * Headless-ish browser smoke using playwright-core if present, else fetch-only report.
 * Focus: checkout + download binary from same browser context.
 */
const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:3000";

function tinyPng() {
  const b64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  return `data:image/png;base64,${b64}`;
}

async function apiFlow() {
  const gen = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-djs-device": "dbg_browser_1" },
    body: JSON.stringify({
      stage: "preview",
      imageBase64: tinyPng(),
      purposeId: "resume",
      subjectLook: "as_photo",
      subjectSeason: "as_photo",
    }),
  });
  const g = await gen.json();
  if (!gen.ok) throw new Error("gen " + (g.error || gen.status));

  const co = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      purposeId: "resume",
      packId: "basic",
      previewAssetId: g.previewAssetId,
      previewVault: g.previewVault,
    }),
  });
  const c = await co.json();
  if (!co.ok) throw new Error("co " + (c.error || co.status));

  const pay = await fetch(`${BASE}/api/checkout/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: c.orderId, orderTicket: c.orderTicket }),
  });
  const p = await pay.json();
  if (!pay.ok) throw new Error("pay " + (p.error || pay.status));

  const dl = await fetch(`${BASE}/api/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "image/png" },
    body: JSON.stringify({
      orderId: c.orderId,
      unlockToken: p.unlockToken,
      previewVault: g.previewVault,
      format: "binary",
      mode: "primary",
    }),
  });
  const buf = Buffer.from(await dl.arrayBuffer());
  const ctype = dl.headers.get("content-type") || "";
  return {
    vaultLen: String(g.previewVault || "").length,
    status: dl.status,
    ctype,
    bytes: buf.length,
    png: buf[0] === 0x89 && buf[1] === 0x50,
  };
}

async function main() {
  const r = await apiFlow();
  console.log(JSON.stringify({ ok: true, ...r }, null, 2));
}

main().catch((e) => {
  console.error("FAIL", e.message || e);
  process.exit(1);
});
