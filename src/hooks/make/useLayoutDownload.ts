"use client";

import {
  DEFAULT_PRINT_SIZE_ID,
  generatePhotoSheet,
  getPrintSize,
} from "@/lib/photoSheet";
import { savePngBlob } from "@/lib/download/savePng";
import type { Shot } from "@/lib/make/types";
import type { MakeStudioState } from "@/hooks/make/useMakeStudioState";

export function useLayoutDownload(state: MakeStudioState) {
  const {
    paid,
    orderId,
    unlockToken,
    downloaded,
    savedOnce,
    layoutBuying,
    printSizeId,
    primaryShotId,
    extraPaidIds,
    layoutPackPaid,
    layoutPaidSizeIds,
    layoutSaveReady,
    clearFail,
    fail,
    setLayoutBuying,
    setLayoutSaveReady,
    setUnlockToken,
    setLayoutFreeUsed,
    setLayoutPackPaid,
    setLayoutPaidSizeIds,
    setPrintSizeId,
    setLayoutUrl,
    setDownloadOk,
  } = state;

  const downloadLayout = async (
    shot: Shot,
    mode: "free" | "single" | "pack",
    sizeId?: string
  ) => {
    const slot = "layout";
    if (!paid || !orderId || !unlockToken || !downloaded || layoutBuying) return;
    if (!savedOnce) {
      fail(slot, "먼저 위 「파일로 저장」으로 PNG를 저장해 주세요.");
      return;
    }
    if (!shot.unlocked && shot.id !== primaryShotId && !extraPaidIds.includes(shot.id)) {
      fail(slot, "먼저 이 컷 PNG를 받아 주세요.");
      return;
    }
    const targetId = sizeId || printSizeId;
    const size = getPrintSize(targetId);
    setLayoutBuying(true);
    clearFail();
    setLayoutSaveReady(null);
    try {
      const payRes = await fetch("/api/checkout/layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          unlockToken,
          printSizeId: mode === "pack" ? undefined : size.id,
          mode,
        }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) {
        fail(slot, payData.error || "레이아웃 처리에 실패했습니다.");
        return;
      }
      if (typeof payData.unlockToken === "string") setUnlockToken(payData.unlockToken);
      if (typeof payData.layoutFreeUsed === "boolean") setLayoutFreeUsed(payData.layoutFreeUsed);
      if (typeof payData.layoutPackPaid === "boolean") setLayoutPackPaid(payData.layoutPackPaid);
      if (Array.isArray(payData.layoutPaidSizeIds)) {
        setLayoutPaidSizeIds(payData.layoutPaidSizeIds.map(String));
      }

      const downloadSize =
        mode === "pack" ? getPrintSize(targetId || DEFAULT_PRINT_SIZE_ID) : size;
      setPrintSizeId(downloadSize.id);

      if (!shot.imageUrl) {
        throw new Error("이미지 URL 없음");
      }

      const sheet = await generatePhotoSheet(shot.imageUrl, downloadSize);
      setLayoutUrl(sheet.dataUrl);
      const res = await fetch(sheet.dataUrl);
      const blob = await res.blob();
      const filename = `danjeongshot-layout-${downloadSize.id}.png`;
      const url = URL.createObjectURL(blob);
      setLayoutSaveReady({
        blob,
        filename,
        url,
        label: downloadSize.label,
      });
      setDownloadOk(`${downloadSize.label} 레이아웃이 준비됐어요. 「레이아웃 저장」을 눌러 주세요.`);
    } catch (e) {
      const msg =
        e instanceof Error && e.message.includes("이미지 로드")
          ? "이미지를 불러오지 못했어요. PNG를 다시 받은 뒤 시도해 주세요."
          : e instanceof Error && e.message
            ? `레이아웃 준비 실패: ${e.message.slice(0, 80)}`
            : "레이아웃 준비 중 오류가 발생했습니다.";
      fail(slot, msg);
    } finally {
      setLayoutBuying(false);
    }
  };

  const redownloadOwnedLayout = async (shot: Shot, sizeId: string) => {
    const slot = "layout";
    if (layoutBuying) return;
    if (!layoutPackPaid && !layoutPaidSizeIds.includes(sizeId)) {
      fail(slot, "아직 열리지 않은 레이아웃이에요.");
      return;
    }
    setLayoutBuying(true);
    clearFail();
    setLayoutSaveReady(null);
    try {
      const size = getPrintSize(sizeId);
      setPrintSizeId(size.id);
      const sheet = await generatePhotoSheet(shot.imageUrl, size);
      setLayoutUrl(sheet.dataUrl);
      const res = await fetch(sheet.dataUrl);
      const blob = await res.blob();
      const filename = `danjeongshot-layout-${size.id}.png`;
      const url = URL.createObjectURL(blob);
      setLayoutSaveReady({ blob, filename, url, label: size.label });
      setDownloadOk(`${size.label} 레이아웃 준비됨 · 「레이아웃 저장」을 눌러 주세요.`);
    } catch (e) {
      fail(
        slot,
        e instanceof Error && e.message
          ? `레이아웃 준비 실패: ${e.message.slice(0, 80)}`
          : "레이아웃 준비 중 오류가 발생했습니다."
      );
    } finally {
      setLayoutBuying(false);
    }
  };

  const saveLayoutReadyFile = async () => {
    if (!layoutSaveReady) return;
    clearFail();
    try {
      const how = await savePngBlob(layoutSaveReady.blob, layoutSaveReady.filename);
      if (how === "tab") {
        setDownloadOk("레이아웃을 새 탭에서 열었어요. 길게 눌러 저장해 주세요.");
      } else {
        setDownloadOk(`${layoutSaveReady.label} 레이아웃 저장을 요청했어요.`);
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setDownloadOk("레이아웃 자동 저장이 막혔어요. 아래 링크를 눌러 주세요.");
    }
  };

  return { downloadLayout, redownloadOwnedLayout, saveLayoutReadyFile };
}
