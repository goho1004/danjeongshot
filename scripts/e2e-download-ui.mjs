/**
 * E2E: API로 paid 세션 준비 → /make?paid=1 복원 → 받기 → 파일로 저장 → 레이아웃 단계 확인
 */
import { chromium } from "playwright";
import { uniqueDeviceId, uniqueSmokePngDataUrl } from "./lib/smokePng.mjs";
import { maintHeaders } from "./maint/checks/prepPaid.mjs";

const BASE = process.env.SMOKE_BASE || "https://danjeongshot.vercel.app";

async function prepPaid() {
  if (process.env.SMOKE_SESSION) {
    return JSON.parse(process.env.SMOKE_SESSION);
  }
  const imageBase64 = await uniqueSmokePngDataUrl();
  const gen = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-djs-device": uniqueDeviceId("e2e_ui"),
      ...maintHeaders(),
    },
    body: JSON.stringify({
      stage: "preview",
      imageBase64,
      purposeId: "resume",
      subjectLook: "as_photo",
      subjectSeason: "as_photo",
    }),
  });
  const g = await gen.json();
  if (!gen.ok) throw new Error(`generate: ${g.error || gen.status}`);

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

  const pay = await fetch(`${BASE}/api/checkout/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: c.orderId, orderTicket: c.orderTicket }),
  });
  const p = await pay.json();
  if (!pay.ok) throw new Error(`complete: ${p.error || pay.status}`);

  return {
    orderId: c.orderId,
    unlockToken: p.unlockToken,
    orderTicket: c.orderTicket,
    previewAssetId: g.previewAssetId,
    previewVault: g.previewVault,
    mock: !!g.mock,
  };
}

async function main() {
  const paid = await prepPaid();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await page.addInitScript(() => {
    try {
      delete window.showSaveFilePicker;
    } catch {
      /* ignore */
    }
    Object.defineProperty(window, "showSaveFilePicker", {
      value: undefined,
      configurable: true,
    });
  });

  const downloads = [];
  page.on("download", (d) => {
    downloads.push(d.suggestedFilename());
  });

  await page.goto(`${BASE}/make`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(async (data) => {
    const heavyKey = `restore_${data.orderId}`;
    const openDb = () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open("djs_session_v1", 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("blobs", "readwrite");
      tx.objectStore("blobs").put(
        JSON.stringify({
          previewVault: data.previewVault,
          selfie: null,
          shotVaults: { e2e1: data.previewVault },
        }),
        heavyKey
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    sessionStorage.setItem(
      "djs_restore_paid",
      JSON.stringify({
        v: 2,
        heavyKey,
        paid: true,
        orderId: data.orderId,
        unlockToken: data.unlockToken,
        orderTicket: data.orderTicket,
        packId: "basic",
        purposeId: "resume",
        previewAssetId: data.previewAssetId,
        selectedShotId: "e2e1",
        subjectLook: "as_photo",
        subjectSeason: "as_photo",
        shots: [{ id: "e2e1", imageUrl: "", unlocked: false }],
      })
    );
  }, paid);
  await page.goto(`${BASE}/make?paid=1`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);

  const receive = page.getByRole("button", { name: /이 컷 받기/ });
  if ((await receive.count()) === 0) {
    const snippet = await page.evaluate(() => document.body.innerText.slice(0, 400));
    console.error("no receive button", snippet);
    await browser.close();
    process.exit(1);
  }

  const [maybeDl] = await Promise.all([
    page.waitForEvent("download", { timeout: 25000 }).catch(() => null),
    receive.click(),
  ]);
  await page.waitForTimeout(1500);
  if (maybeDl) downloads.push(maybeDl.suggestedFilename());

  const saveBtn = page.getByRole("button", { name: /파일로 저장/ });
  const hasSave = (await saveBtn.count()) > 0;
  let secondOk = false;
  if (hasSave) {
    const before = downloads.length;
    const [dl2] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
      saveBtn.click(),
    ]);
    secondOk = !!dl2 || downloads.length > before;
    if (dl2) downloads.push(dl2.suggestedFilename());
  }

  await page.waitForTimeout(500);
  const afterSave = await page.evaluate(() => ({
    hasLayoutStep: !!Array.from(document.querySelectorAll("p,h2")).find((el) =>
      (el.textContent || "").includes("8. 인화용 레이아웃")
    ),
  }));

  await browser.close();

  if (!afterSave.hasLayoutStep) {
    console.error("E2E_FAIL: layout step not visible", { secondOk, downloads });
    process.exit(2);
  }
  if (!secondOk && downloads.length === 0) {
    console.error("E2E_FAIL: no download event");
    process.exit(2);
  }
  console.log("E2E_PASS", JSON.stringify({ secondOk, downloads, hasLayoutStep: afterSave.hasLayoutStep }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
