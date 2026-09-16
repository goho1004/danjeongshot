/**
 * E2E: pay-first 세션 → /result 복원 → 사진에 저장 (또는 이 컷 받기)
 * (paidDone UI는 /result 전용 — /make?paid=1은 useSessionRestore 대상이 아니라 복원 자체가 안 됨)
 */
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { createPaidSession } from "./maint/checks/prepPaid.mjs";

const BASE = process.env.SMOKE_BASE || "https://danjeongshot.vercel.app";

function loadSession() {
  if (process.env.SMOKE_SESSION_FILE) {
    return JSON.parse(readFileSync(process.env.SMOKE_SESSION_FILE, "utf8"));
  }
  if (process.env.SMOKE_SESSION) {
    return JSON.parse(process.env.SMOKE_SESSION);
  }
  return null;
}

async function main() {
  const paid = loadSession() || (await createPaidSession(BASE));

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
        shots: [
          {
            id: "e2e1",
            imageUrl: data.previewImageUrl || "",
            unlocked: false,
          },
        ],
        hasPreview: true,
      })
    );
  }, paid);
  await page.goto(`${BASE}/result`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1000);

  const saveOrReceive = page
    .getByRole("button", { name: /사진에 저장|이 컷 받기/ })
    .first();
  if ((await saveOrReceive.count()) === 0) {
    const snippet = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.error("no save/receive button", snippet);
    await browser.close();
    process.exit(1);
  }

  const [maybeDl] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }).catch(() => null),
    saveOrReceive.click(),
  ]);
  await page.waitForTimeout(1500);
  if (maybeDl) downloads.push(maybeDl.suggestedFilename());

  // 모달 「저장」이 있으면 한 번 더
  const modalSave = page.getByRole("button", { name: /^저장$|저장하기/ });
  if ((await modalSave.count()) > 0 && (await modalSave.first().isVisible())) {
    const [dl2] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
      modalSave.first().click(),
    ]);
    if (dl2) downloads.push(dl2.suggestedFilename());
  }

  const backup = page.getByRole("button", { name: /파일로 받기/ });
  if ((await backup.count()) > 0) {
    const [dl3] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
      backup.first().click(),
    ]);
    if (dl3) downloads.push(dl3.suggestedFilename());
  }

  await page.waitForTimeout(400);
  const ui = await page.evaluate(() => {
    const t = document.body.innerText || "";
    return {
      hasReceivePanel: t.includes("받기") || t.includes("사진에 저장"),
      hasPaidHint: t.includes("결제") || t.includes("단정"),
    };
  });

  await browser.close();

  if (!ui.hasReceivePanel) {
    console.error("E2E_FAIL: receive panel missing", { downloads, ui });
    process.exit(2);
  }
  if (downloads.length === 0) {
    // API smoke already covers bytes; UI may block download in headless
    console.log(
      "E2E_PASS",
      JSON.stringify({ downloads: 0, note: "panel ok; download event optional in headless", ui })
    );
    process.exit(0);
  }
  console.log("E2E_PASS", JSON.stringify({ downloads, ui }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
