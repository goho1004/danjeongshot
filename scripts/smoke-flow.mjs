/**
 * 로컬 스모크: mock 생성 → 결제 → 바이너리 다운로드
 * 사용: node scripts/smoke-flow.mjs  (dev 서버 떠 있는 상태에서)
 */
const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:3000";

function tinyPngDataUrl() {
  // 1x1 png
  const b64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  return `data:image/png;base64,${b64}`;
}

async function main() {
  const gen = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-djs-device": "smoke_device_1" },
    body: JSON.stringify({
      stage: "preview",
      imageBase64: tinyPngDataUrl(),
      purposeId: "resume",
      subjectLook: "as_photo",
      subjectSeason: "as_photo",
    }),
  });
  const g = await gen.json();
  if (!gen.ok) throw new Error(`generate: ${g.error || gen.status}`);
  console.log("generate ok", { mock: g.mock, asset: g.previewAssetId, vault: !!g.previewVault });

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
  if (!co.ok) throw new Error(`checkout: ${c.error || co.status}`);
  console.log("checkout ok", { mode: c.mode, orderId: c.orderId, amount: c.amountKrw });

  const pay = await fetch(`${BASE}/api/checkout/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: c.orderId, orderTicket: c.orderTicket }),
  });
  const p = await pay.json();
  if (!pay.ok) throw new Error(`complete: ${p.error || pay.status}`);
  console.log("paid ok", { unlock: !!p.unlockToken });

  const dl = await fetch(`${BASE}/api/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify({
      orderId: c.orderId,
      unlockToken: p.unlockToken,
      previewVault: g.previewVault,
      format: "binary",
      mode: "primary",
    }),
  });
  const ctype = dl.headers.get("content-type") || "";
  const buf = Buffer.from(await dl.arrayBuffer());
  if (!dl.ok) {
    throw new Error(`download: ${buf.toString("utf8").slice(0, 200)}`);
  }
  console.log("download ok", {
    ctype,
    bytes: buf.length,
    pngMagic: buf[0] === 0x89 && buf[1] === 0x50,
  });
  console.log("SMOKE_PASS");
}

main().catch((e) => {
  console.error("SMOKE_FAIL", e.message || e);
  process.exit(1);
});
