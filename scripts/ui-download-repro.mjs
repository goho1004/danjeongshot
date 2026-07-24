/**
 * Browser download gesture experiments → writes NDJSON to .cursor/debug-0acea6.log
 * Hypotheses:
 *   F: window.open before a.download steals gesture → no download event
 *   G: a.download after await still works without window.open
 */
import { chromium } from "playwright";
import { appendFileSync, mkdirSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const logPath = join(__dir, "..", ".cursor", "debug-0acea6.log");
if (!existsSync(dirname(logPath))) mkdirSync(dirname(logPath), { recursive: true });
writeFileSync(logPath, "");

function log(hypothesisId, message, data) {
  const line = JSON.stringify({
    sessionId: "0acea6",
    hypothesisId,
    location: "scripts/ui-download-repro.mjs",
    message,
    data,
    timestamp: Date.now(),
    runId: "browser-repro",
  });
  appendFileSync(logPath, line + "\n");
  console.log(line);
}

const TINY =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function trial(name, fn) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await page.goto("https://danjeongshot.vercel.app/make", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  let gotDownload = false;
  let downloadName = null;
  page.on("download", async (d) => {
    gotDownload = true;
    downloadName = d.suggestedFilename();
  });
  try {
    await fn(page);
    await page.waitForTimeout(2500);
  } catch (e) {
    log("X", name + " threw", { err: String(e.message || e).slice(0, 200) });
  }
  await browser.close();
  log(name.startsWith("F") ? "F" : "G", name + " result", {
    gotDownload,
    downloadName,
  });
  return gotDownload;
}

async function main() {
  // F: open blank tab THEN after delay click <a download>
  const f = await trial("F_open_then_anchor", async (page) => {
    await page.evaluate(async (b64) => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/png" });
      const pending = window.open("about:blank", "_blank");
      await new Promise((r) => setTimeout(r, 800)); // like await fetch
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "f-test.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (pending && !pending.closed) {
        try {
          pending.location.href = url;
        } catch {}
      }
    }, TINY);
  });

  // G: after delay ONLY <a download> (no window.open)
  const g = await trial("G_anchor_only_after_await", async (page) => {
    await page.evaluate(async (b64) => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/png" });
      await new Promise((r) => setTimeout(r, 800));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "g-test.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, TINY);
  });

  // H: sync click path (no await) — control
  const h = await trial("H_anchor_sync", async (page) => {
    await page.evaluate((b64) => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "h-test.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, TINY);
  });

  // I: real API binary → blob → a.download (no window.open)
  const i = await trial("I_real_api_binary_anchor", async (page) => {
    await page.evaluate(async () => {
      const png =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      const gen = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-djs-device": "ui_repro_1",
        },
        body: JSON.stringify({
          stage: "preview",
          imageBase64: png,
          purposeId: "resume",
          subjectLook: "as_photo",
          subjectSeason: "as_photo",
        }),
      });
      const g = await gen.json();
      if (!gen.ok) throw new Error("gen " + (g.error || gen.status));
      const co = await fetch("/api/checkout", {
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
      const pay = await fetch("/api/checkout/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: c.orderId, orderTicket: c.orderTicket }),
      });
      const p = await pay.json();
      if (!pay.ok) throw new Error("pay " + (p.error || pay.status));
      const dl = await fetch("/api/download", {
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
      if (!dl.ok) throw new Error("dl " + dl.status);
      const blob = await dl.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "danjeongshot-ui.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.__djsUiRepro = { bytes: blob.size, ctype: blob.type };
    });
    const meta = await page.evaluate(() => window.__djsUiRepro);
    log("I", "api meta", meta || {});
  });

  log("SUM", "summary", { F_openThen: f, G_anchorAfterAwait: g, H_sync: h, I_api: i });
  console.log("LOG", logPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
