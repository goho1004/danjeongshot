"use client";

import { ChangeEvent, useRef } from "react";
import { newShotId, type Shot } from "@/lib/make/types";
import type { MakeStudioState } from "@/hooks/make/useMakeStudioState";
import {
  scheduleSmoothScrollAfterRegen,
  smoothScrollToRegenTarget,
} from "@/lib/smoothScroll";
import {
  STUDIO_BUSY,
  STUDIO_RETRY,
  toUserFacingGenerateError,
} from "@/lib/userFacingErrors";

export function useGenerate(
  state: MakeStudioState,
  deviceFp: string,
  purposeId: string,
  subjectLook: string,
  subjectSeason: string
) {
  const inflightRef = useRef(false);
  const {
    selfie,
    setSelfie,
    regenSelfie,
    setRegenSelfie,
    setBusyKind,
    clearFail,
    fail,
    setShots,
    setSelectedShotId,
    resetOrderState,
    setMock,
    setPreviewLeft,
    setPreviewAssetId,
    setPreviewVault,
    orderId,
    unlockToken,
    setUnlockToken,
    setRedoUsed,
    setAsvUsed,
  } = state;

  const processFile = (file: File) => {
    clearFail();
    setShots([]);
    setSelectedShotId(null);
    resetOrderState();
    if (!file.type.startsWith("image/")) {
      fail("upload", "이미지 파일만 가능합니다.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      fail("upload", "8MB 이하만 업로드 가능합니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSelfie(String(reader.result));
    reader.readAsDataURL(file);
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const generate = async () => {
    if (!selfie) {
      fail("generate", "셀카를 먼저 업로드하세요.");
      return;
    }
    if (!state.paid || !orderId || !unlockToken) {
      fail("generate", "팩을 고르고 결제한 뒤 첫 컷을 볼 수 있어요.");
      return;
    }
    if (inflightRef.current || state.busyKind) return;
    inflightRef.current = true;
    setBusyKind("preview");
    clearFail();
    setShots([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-djs-device": deviceFp,
        },
          body: JSON.stringify({
            stage: "preview",
            imageBase64: selfie,
            purposeId,
            subjectLook,
            subjectSeason,
            extraPresetIds: state.extraPresetIds,
            extraCustom: state.extraCustom,
            orderId,
            unlockToken,
          }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const kind =
          res.status === 429 || data.code?.startsWith?.("GEN_") ? "wait" : "busy";
        fail(
          "generate",
          toUserFacingGenerateError(data.error, kind as "wait" | "busy")
        );
        return;
      }
      setMock(Boolean(data.mock));
      if (typeof data.previewLeft === "number") setPreviewLeft(data.previewLeft);
      if (typeof data.previewAssetId === "string") setPreviewAssetId(data.previewAssetId);
      if (typeof data.unlockToken === "string") setUnlockToken(data.unlockToken);

      type ApiShot = {
        imageUrl?: string;
        imageUrlClean?: string;
        timeSec?: string;
        label?: string;
        easter?: boolean;
        easterVariant?: "glyph" | "animal";
        previewVault?: string;
      };

      const apiShots: ApiShot[] = Array.isArray(data.shots) ? data.shots : [];
      if (apiShots.length > 0) {
        const built: Shot[] = apiShots
          .filter((s) => !!s.imageUrl)
          .map((s, i) => {
            const vault =
              typeof s.previewVault === "string"
                ? s.previewVault
                : i ===
                      (typeof data.selectedIndex === "number"
                        ? data.selectedIndex
                        : 0) && typeof data.previewVault === "string"
                  ? (data.previewVault as string)
                  : null;
            return {
              id: newShotId(),
              imageUrl: s.imageUrl as string,
              imageUrlClean:
                typeof s.imageUrlClean === "string" ? s.imageUrlClean : undefined,
              label: s.label || (s.easter ? "보너스 · 희소" : `컷 ${i + 1}`),
              timeSec: s.timeSec,
              vault,
              unlocked: true,
              easter: !!s.easter,
              easterVariant: s.easterVariant,
            };
          });
        if (!built.length) {
          fail("generate", STUDIO_RETRY);
          return;
        }
        const preferIdx =
          typeof data.selectedIndex === "number" &&
          data.selectedIndex >= 0 &&
          data.selectedIndex < built.length
            ? data.selectedIndex
            : built.findIndex((s) => !s.easter);
        const sel = preferIdx >= 0 ? preferIdx : 0;
        const vault = built[sel]?.vault;
        if (vault) setPreviewVault(vault);
        else if (typeof data.previewVault === "string") {
          setPreviewVault(data.previewVault as string);
        }
        setShots(built);
        setSelectedShotId(built[sel]?.id ?? null);
        return;
      }

      const vault =
        typeof data.previewVault === "string" ? (data.previewVault as string) : null;
      if (vault) setPreviewVault(vault);
      const url =
        (data.preview?.imageUrl as string | undefined) ||
        (data.shot?.imageUrl as string | undefined);
      if (!url) {
        fail("generate", STUDIO_RETRY);
        return;
      }
      const id = newShotId();
      const shot: Shot = {
        id,
        imageUrl: url,
        label: data.preview?.label || data.shot?.label || "첫 컷",
        timeSec: data.preview?.timeSec || data.shot?.timeSec,
        vault,
        unlocked: true,
        easter: !!(data.shot?.easter || data.preview?.easter),
      };
      setShots([shot]);
      setSelectedShotId(id);
    } catch {
      fail("generate", STUDIO_BUSY);
    } finally {
      inflightRef.current = false;
      setBusyKind(null);
    }
  };

  const onRegenFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      fail("regenFile", "이미지 파일만 가능합니다.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      fail("regenFile", "8MB 이하만 업로드 가능합니다.");
      return;
    }
    clearFail();
    const reader = new FileReader();
    reader.onload = () => setRegenSelfie(String(reader.result));
    reader.readAsDataURL(file);
  };

  const runPaidRegen = async (stage: "redo" | "asv") => {
    const source = regenSelfie || selfie;
    if (!source || !orderId || !unlockToken) return;
    if (state.downloaded) {
      fail(stage, "이미 사진을 받으셨어요. 다시 만들기는 받기 전에만 가능해요.");
      return;
    }
    if (inflightRef.current || state.busyKind) return;
    inflightRef.current = true;
    smoothScrollToRegenTarget("start");
    state.setBusyKind(stage);
    clearFail();
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-djs-device": deviceFp,
        },
        body: JSON.stringify({
          stage,
          imageBase64: source,
          purposeId,
          subjectLook,
          subjectSeason,
          extraPresetIds: state.extraPresetIds,
          extraCustom: state.extraCustom,
          orderId,
          unlockToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const kind =
          res.status === 429 || data.code?.startsWith?.("GEN_") ? "wait" : "busy";
        fail(stage, toUserFacingGenerateError(data.error, kind as "wait" | "busy"));
        return;
      }
      const url = data.shot?.imageUrl as string | undefined;
      if (!url) {
        fail(stage, STUDIO_RETRY);
        return;
      }
      const vault =
        typeof data.previewVault === "string" ? (data.previewVault as string) : null;
      if (vault) setPreviewVault(vault);
      if (typeof data.unlockToken === "string") setUnlockToken(data.unlockToken);
      if (typeof data.previewAssetId === "string") setPreviewAssetId(data.previewAssetId);
      if (typeof data.redoUsed === "number") setRedoUsed(data.redoUsed);
      if (typeof data.asvUsed === "number") setAsvUsed(data.asvUsed);
      const id = newShotId();
      const shot: Shot = {
        id,
        imageUrl: url,
        label: data.shot?.label || (stage === "redo" ? "다시 만든 컷" : "추가 컷"),
        timeSec: data.shot?.timeSec,
        vault,
        unlocked: false,
      };
      state.setShots((prev) => [...prev, shot]);
      setSelectedShotId(id);
      scheduleSmoothScrollAfterRegen();
      if (regenSelfie) setSelfie(regenSelfie);
      if (typeof data.redoUsed !== "number" && stage === "redo") setRedoUsed((n) => n + 1);
      if (typeof data.asvUsed !== "number" && stage === "asv") setAsvUsed((n) => n + 1);
    } catch {
      fail(stage, STUDIO_BUSY);
    } finally {
      inflightRef.current = false;
      state.setBusyKind(null);
    }
  };

  return { processFile, onFile, generate, onRegenFile, runPaidRegen };
}
