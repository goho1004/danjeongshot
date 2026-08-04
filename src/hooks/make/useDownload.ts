"use client";

import { b64ToBytes, bytesToBlob } from "@/lib/download/bytes";
import { fetchCleanPng } from "@/lib/download/fetchClean";
import { saveHowMessage, savePngBlob, savePngFromBase64 } from "@/lib/download/savePng";
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

  const download = async (): Promise<boolean> => {
    if (!paid || !orderId || !unlockToken || downloading) {
      if (!paid) fail("download", "결제 완료 후 받을 수 있어요.");
      else if (!orderId || !unlockToken) {
        fail("download", "주문 정보가 없습니다. 다시 결제해 주세요.");
      }
      return false;
    }
    const shot =
      (downloaded && primaryShotId && shots.find((s) => s.id === primaryShotId)) ||
      selectedShot;
    if (!shot) {
      fail("download", "받을 컷을 먼저 골라 주세요.");
      return false;
    }
    const vault = shot.vault || previewVault;
    if (!vault && !previewAssetId) {
      fail("download", "미리보기 세션이 없습니다. 다시 만들기 후 받아 주세요.");
      return false;
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
        easter: !!shot.easter,
        easterVariant: shot.easterVariant,
      });

      if (!result.ok) {
        fail("download", result.error);
        return false;
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
      // savedOnce는 성공 시에만 true — 재받기/공유 취소로 false로 되돌리지 않음
      // (false로 풀면 플러스 「인화용 사진에 저장」이 사라짐)

      // 같은 클릭에서 공유 시트(사진에 저장)까지 시도
      try {
        const how = await savePngBlob(result.blob, filename);
        setSavedOnce(true);
        setDownloadOk(saveHowMessage(how, "png"));
        return true;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          setDownloadOk("저장을 취소했어요. 「사진에 저장」을 다시 누르거나 이메일로 받으세요.");
        } else {
          setDownloadOk("파일이 준비됐어요. 「사진에 저장」또는 이메일로 받으세요.");
        }
        return false;
      }
    } catch (e) {
      fail(
        "download",
        e instanceof Error && e.message
          ? `받기 중 오류: ${e.message.slice(0, 80)}`
          : "다운로드 중 오류가 발생했습니다. 다시 시도해 주세요."
      );
      return false;
    } finally {
      setDownloading(false);
    }
  };

  const saveReadyFile = async (): Promise<boolean> => {
    if (!saveReady) return false;
    clearFail();
    try {
      const how = await savePngBlob(saveReady.blob, saveReady.filename);
      setSavedOnce(true);
      setDownloadOk(saveHowMessage(how, "png"));
      return true;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setDownloadOk("저장을 취소했어요. 「사진에 저장」을 다시 누르거나 이메일로 받으세요.");
        return false;
      }
      setDownloadOk("자동 저장이 막혔어요. 「사진에 저장」또는 이메일을 이용해 주세요.");
      return false;
    }
  };

  const downloadExtra = async (shot: Shot): Promise<boolean> => {
    const slot = `extra:${shot.id}`;
    if (!paid || !orderId || !unlockToken || !downloaded || extraBusyId) return false;
    if (!shot.vault) {
      fail(slot, "이 컷의 파일이 없습니다. 다시 만들기를 이용해 주세요.");
      return false;
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
          easter: !!shot.easter,
          easterVariant: shot.easterVariant,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        fail(slot, data.error || "추가 컷 처리에 실패했습니다.");
        return false;
      }
      if (typeof data.unlockToken === "string") setUnlockToken(data.unlockToken);
      setExtraPaidIds((ids) => (ids.includes(shot.id) ? ids : [...ids, shot.id]));
      const b64 = data.cleanBase64 as string | undefined;
      if (!b64) {
        fail(slot, "클린 이미지를 받지 못했습니다. 다시 시도해 주세요.");
        return false;
      }
      applyCleanToShot(
        shot.id,
        b64,
        typeof data.previewVault === "string" ? data.previewVault : undefined
      );
      try {
        const how = await savePngFromBase64(b64, `danjeongshot-extra-${shot.id.slice(-6)}.png`);
        if (how === "tab") {
          fail(slot, "새 탭에서 열렸어요. 이미지를 길게 눌러 저장해 주세요.");
          return false;
        }
        return true;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return false;
        fail(slot, "추가 컷 저장이 막혔어요. 다시 시도해 주세요.");
        return false;
      }
    } catch {
      fail(slot, "추가 컷 처리 중 오류가 발생했습니다.");
      return false;
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
        easter: !!shot.easter,
        easterVariant: shot.easterVariant,
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
