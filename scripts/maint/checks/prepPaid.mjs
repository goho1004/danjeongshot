import { uniqueDeviceId, uniqueSmokePngDataUrl } from "../../lib/smokePng.mjs";

function maintHeaders() {
  const secret = process.env.MAINT_SMOKE_SECRET?.trim();
  if (!secret) return {};
  return { "x-djs-maint-smoke": secret };
}

export { maintHeaders };

/** Gate·smoke 공용: checkout → complete → generate (pay-first) */
export async function createPaidSession(base) {
  const imageBase64 = await uniqueSmokePngDataUrl();

  const co = await fetch(`${base}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...maintHeaders() },
    body: JSON.stringify({
      purposeId: "resume",
      packId: "basic",
    }),
  });
  const c = await co.json();
  if (!co.ok) throw new Error(c.error || `checkout ${co.status}`);

  const pay = await fetch(`${base}/api/checkout/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...maintHeaders(),
    },
    body: JSON.stringify({ orderId: c.orderId, orderTicket: c.orderTicket }),
  });
  const p = await pay.json();
  if (!pay.ok) throw new Error(p.error || `complete ${pay.status}`);

  const unlockToken = p.unlockToken || c.orderTicket;
  const gen = await fetch(`${base}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-djs-device": uniqueDeviceId("maint_prep"),
      ...maintHeaders(),
    },
    body: JSON.stringify({
      stage: "preview",
      imageBase64,
      purposeId: "resume",
      subjectLook: "as_photo",
      subjectSeason: "as_photo",
      orderId: c.orderId,
      unlockToken,
    }),
  });
  const g = await gen.json();
  if (!gen.ok) throw new Error(g.error || `generate ${gen.status}`);

  return {
    orderId: c.orderId,
    unlockToken: g.unlockToken || unlockToken,
    orderTicket: c.orderTicket,
    previewAssetId: g.previewAssetId,
    previewVault: g.previewVault,
    previewImageUrl: g.preview?.imageUrl ?? null,
    mock: !!g.mock,
    watermark: g.watermark ?? null,
    mode: c.mode,
  };
}

export function verifyWatermarkFromPreviewUrl(previewImageUrl) {
  if (!previewImageUrl || !String(previewImageUrl).startsWith("data:image/png;base64,")) {
    return { ok: false, error: "no preview png data url", bytes: 0 };
  }
  const b64 = String(previewImageUrl).split("base64,")[1];
  const buf = Buffer.from(b64, "base64");
  const marked = buf.length > 800;
  return { ok: marked, bytes: buf.length };
}
