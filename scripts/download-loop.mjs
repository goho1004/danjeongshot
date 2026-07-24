/**
 * Red-capable download seam test (diagnosing-bugs Phase 1).
 * Asserts: paid unlock + binary PNG bytes (API).
 * SMOKE_SESSION env set → generate 생략 (gate 공용 세션)
 */
import { createPaidSession } from "./maint/checks/prepPaid.mjs";

const BASE = process.env.SMOKE_BASE || "https://danjeongshot.vercel.app";

async function main() {
  let session = null;
  if (process.env.SMOKE_SESSION) {
    session = JSON.parse(process.env.SMOKE_SESSION);
  } else {
    session = await createPaidSession(BASE);
  }

  const dl = await fetch(`${BASE}/api/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "image/png" },
    body: JSON.stringify({
      orderId: session.orderId,
      unlockToken: session.unlockToken,
      previewVault: session.previewVault,
      format: "binary",
      mode: "primary",
    }),
  });
  const buf = Buffer.from(await dl.arrayBuffer());
  const ctype = dl.headers.get("content-type") || "";
  if (!dl.ok) throw new Error("RED download status " + dl.status);
  if (!ctype.includes("image/png")) throw new Error("RED ctype " + ctype);
  if (buf.length < 50 || buf[0] !== 0x89 || buf[1] !== 0x50) {
    throw new Error("RED not png bytes=" + buf.length);
  }

  // Guard: unauth download must fail
  const bad = await fetch(`${BASE}/api/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "image/png" },
    body: JSON.stringify({
      orderId: session.orderId,
      unlockToken: "bogus",
      previewVault: session.previewVault,
      format: "binary",
    }),
  });
  if (bad.ok) throw new Error("RED unauth download should fail");

  console.log(
    JSON.stringify({
      GREEN: true,
      mode: session.mode || "sandbox",
      bytes: buf.length,
      unauthStatus: bad.status,
    })
  );
}

main().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
