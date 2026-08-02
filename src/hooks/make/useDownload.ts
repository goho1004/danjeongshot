"use client";

import { b64ToBytes, bytesToBlob } from "@/lib/download/bytes";
import { fetchCleanPng } from "@/lib/download/fetchClean";
import { savePngBlob, savePngFromBase64 } from "@/lib/download/savePng";
import type { Shot } from "@/lib/make/types";
import type { MakeStudioState } from "@/hooks/make/useMakeStudioState";

export function useDownload(state: MakeStudioState, purposeId: string) {
  const {
    paid,
    orderId,
    unlockToken,
    downloading,
    downloaded,
    primaryShotId,
    shots,
    selectedShot,
    previewVault,
    previewAssetId,
    saveReady,
    clearFail,
    fail,
    setDownloading,
    setDownloadOk,
    setSaveReady,
    setSavedOnce,
    setUnlockToken,
    setPreviewVault,
    setShots,
    setSelectedShotId,
    setDownloaded,
    setPrimaryShotId,
    extraBusyId,
    setExtraBusyId,
    setExtraPaidIds,
  } = state;

  const applyCleanToShot = (shotId: string, cleanBase64: string, nextVault?: string) => {
    const objectUrl = URL.createObjectURL(bytesToBlob(b64ToBytes(cleanBase64)));
    setShots((prev) =>
      prev.map((s) =>
        s.id === shotId
          ? { ...s, imageUrl: objectUrl, unlocked: true, vault: nextVault ?? s.vault }
          : s
      )
    );
    setSelectedShotId(shotId);
    return objectUrl;
  };

  const download = async () => {
    if (!paid || !orderId || !unlockToken || downloading) {
      if (!paid) fail("download", "결제 완료 후 받을 수 있어요.");
      else if (!orderId || !unlockToken) {
        fail("download", "주문 정보가 없습니다. 다시 결제해 주세요.");
      }
      return;
    }
    const shot =
      (downloaded && primaryShotId && shots.find((s) => s.id === primaryShotId)) ||
      selectedShot;
    if (!shot) {
      fail("download", "받을 컷을 먼저 골라 주세요.");
      return;
    }
    const vault = shot.vault || previewVault;
    if (!vault && !previewAssetId) {
      fail("download", "미리보기 세션이 없습니다. 다시 만들기 후 받아 주세요.");
      return;
    }
    clearFail();
    setDownloadOk(null);
    setDownloading(true);
    setSaveReady(null);
    const filename = `danjeongshot-${purposeId}.png`;

    try {
      const result = await fetchCleanPng({
        orderId,
        unlockToken,
        vault: vault || "",
        previewAssetId,
        shotId: shot.id,
        mode: downloaded ? "again" : "primary",
      });

      if (!result.ok) {
        fail("download", result.error);
        return;
      }

      if (result.unlockToken) setUnlockToken(result.unlockToken);

      const objectUrl = URL.createObjectURL(result.blob);
      setShots((prev) =>
        prev.map((s) =>
          s.id === shot.id
            ? { ...s, imageUrl: objectUrl, unlocked: true, vault: vault ?? s.vault }
            : s
        )
      );
      setSelectedShotId(shot.id);
      if (!downloaded) {
        setDownloaded(true);
        setPrimaryShotId(shot.id);
      }

      setSaveReady({ blob: result.blob, filename, url: objectUrl });
      setSavedOnce(false);

      // 같은 클릭 흐름에서 저장까지 시도 — 막히면 「파일로 저장」으로 이어감
      try {
        const how = await savePngBlob(result.blob, filename);
        setSavedOnce(true);
        if (how === "tab") {
          setDownloadOk(
            "새 탭에서 열렸어요. 이미지를 길게 눌러 저장한 뒤, 필요하면 아래 「파일로 저장」도 써 주세요."
          );
        } else if (how === "share") {
          setDownloadOk("공유·저장했어요. 아래에서 인화용 레이아웃을 받을 수 있어요.");
        } else {
          setDownloadOk("저장을 요청했어요. 다운로드 폴더를 확인한 뒤 인화로 이어 가세요.");
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          setDownloadOk("저장을 취소했어요. 아래 「파일로 저장」을 다시 눌러 주세요.");
        } else {
          setDownloadOk("파일이 준비됐어요. 아래 「파일로 저장」을 눌러 주세요.");
        }
      }
    } catch (e) {
      fail(
        "download",
        e instanceof Error && e.message
          ? `받기 중 오류: ${e.message.slice(0, 80)}`
          : "다운로드 중 오류가 발생했습니다. 다시 시도해 주세요."
      );
    } finally {
      setDownloading(false);
    }
  };

  const saveReadyFile = async () => {
    if (!saveReady) return;
    clearFail();
    try {
      const how = await savePngBlob(saveReady.blob, saveReady.filename);
      setSavedOnce(true);
      if (how === "tab") {
        setDownloadOk("새 탭에서 열렸어요. 이미지를 길게 눌러 저장한 뒤 아래 인화로 이어 가세요.");
      } else if (how === "share") {
        setDownloadOk("공유·저장했어요. 아래에서 인화용 레이아웃을 받을 수 있어요.");
      } else {
        setDownloadOk("저장을 요청했어요. 다운로드 폴더를 확인한 뒤 인화 레이아웃으로 이어 가세요.");
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setDownloadOk("저장을 취소했어요. 다시 「파일로 저장」을 눌러 주세요.");
        return;
      }
      setDownloadOk("자동 저장이 막혔어요. 「링크를 눌러 저장」을 이용해 주세요.");
    }
  };

  const downloadExtra = async (shot: Shot) => {
    const slot = `extra:${shot.id}`;
    if (!paid || !orderId || !unlockToken || !downloaded || extraBusyId) return;
    if (!shot.vault) {
      fail(slot, "이 컷의 파일이 없습니다. 다시 만들기를 이용해 주세요.");
      return;
    }
    setExtraBusyId(shot.id);
    clearFail();
    try {
      const res = await fetch("/api/checkout/extra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          unlockToken,
          shotId: shot.id,
          previewVault: shot.vault,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        fail(slot, data.error || "추가 컷 처리에 실패했습니다.");
        return;
      }
      if (typeof data.unlockToken === "string") setUnlockToken(data.unlockToken);
      setExtraPaidIds((ids) => (ids.includes(shot.id) ? ids : [...ids, shot.id]));
      const b64 = data.cleanBase64 as string | undefined;
      if (!b64) {
        fail(slot, "클린 이미지를 받지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      applyCleanToShot(
        shot.id,
        b64,
        typeof data.previewVault === "string" ? data.previewVault : undefined
      );
      const how = await savePngFromBase64(b64, `danjeongshot-extra-${shot.id.slice(-6)}.png`);
      if (how === "tab") {
        fail(slot, "새 탭에서 열렸어요. 이미지를 길게 눌러 저장해 주세요.");
      }
    } catch {
      fail(slot, "추가 컷 처리 중 오류가 발생했습니다.");
    } finally {
      setExtraBusyId(null);
    }
  };

  const deliverCleanByEmail = async (email: string) => {
    if (!paid || !orderId || !unlockToken) {
      return { ok: false, message: "결제·주문 정보가 없습니다." };
    }
    const shot =
      (downloaded && primaryShotId && shots.find((s) => s.id === primaryShotId)) ||
      selectedShot;
    if (!shot) {
      return { ok: false, message: "받을 컷을 먼저 골라 주세요." };
    }
    const vault = shot.vault || previewVault;
    if (!vault && !previewAssetId) {
      return { ok: false, message: "미리보기 세션이 없습니다. 다시 만들기 후 받아 주세요." };
    }

    const filename = `danjeongshot-${purposeId}.png`;
    const res = await fetch("/api/deliver/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        unlockToken,
        email,
        kind: "clean",
        previewVault: vault || undefined,
        shotId: shot.id,
        mode: downloaded ? "again" : "primary",
        filename,
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      notice?: string;
      unlockToken?: string;
    };
    if (!res.ok) {
      return { ok: false, message: data.error || "이메일 발송에 실패했습니다." };
    }
    if (typeof data.unlockToken === "string") setUnlockToken(data.unlockToken);
    if (!downloaded) {
      setDownloaded(true);
      setPrimaryShotId(shot.id);
      setSavedOnce(true);
    }
    setDownloadOk(data.notice || "이메일로 보냈어요.");
    return { ok: true, message: data.notice || "이메일로 보냈어요." };
  };

  return { download, saveReadyFile, downloadExtra, applyCleanToShot, deliverCleanByEmail };
}
