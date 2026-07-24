#!/usr/bin/env node
/** Health check — pages + download guard */
export async function runHealth(base) {
  const paths = ["/", "/make", "/gallery", "/help"];
  const pages = [];
  for (const p of paths) {
    try {
      const res = await fetch(`${base}${p}`, { redirect: "follow" });
      pages.push({ path: p, status: res.status, ok: res.status >= 200 && res.status < 400 });
    } catch (e) {
      pages.push({ path: p, status: 0, ok: false, error: String(e.message || e) });
    }
  }
  let downloadUnauth = { status: 0, ok: false };
  try {
    const res = await fetch(`${base}/api/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: "x", unlockToken: "y" }),
    });
    downloadUnauth = { status: res.status, ok: res.status === 403 || res.status === 400 };
  } catch (e) {
    downloadUnauth = { status: 0, ok: false, error: String(e.message || e) };
  }
  const ok = pages.every((x) => x.ok) && downloadUnauth.ok;
  return { name: "health", ok, base, pages, downloadUnauth };
}
