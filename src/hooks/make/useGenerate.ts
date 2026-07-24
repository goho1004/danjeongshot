"use client";

import { ChangeEvent } from "react";
import { newShotId, type Shot } from "@/lib/make/types";
import type { MakeStudioState } from "@/hooks/make/useMakeStudioState";

export function useGenerate(
  state: MakeStudioState,
  deviceFp: string,
  purposeId: string,
  subjectLook: string,
  subjectSeason: string
) {
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
    setBusyKind("preview");
    clearFail();
    setShots([]);
    resetOrderState();
    try {
      const postGenerate = async (extra?: {
        challengeToken?: string;
        turnstileToken?: string;
      }) =>
        fetch("/api/generate", {
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
            ...extra,
          }),
        });

      let res = await postGenerate();
      let data = await res.json();

      if (!res.ok && data.code === "CHALLENGE_REQUIRED") {
        const ch = await fetch("/api/preview/challenge");
        const chal = await ch.json();
        if (!ch.ok || !chal.token) {
          throw new Error(data.error || "확인에 실패했습니다.");
        }
        await new Promise((r) => setTimeout(r, Number(chal.waitMs) || 1600));
        res = await postGenerate({ challengeToken: chal.token });
        data = await res.json();
      }

      if (!res.ok) throw new Error(data.error || "생성 실패");
      const url = data.preview?.imageUrl as string | undefined;
      if (!url) throw new Error("미리보기 없음");
      setMock(Boolean(data.mock));
      if (typeof data.previewLeft === "number") setPreviewLeft(data.previewLeft);
      if (typeof data.previewAssetId === "string") setPreviewAssetId(data.previewAssetId);
      const vault =
        typeof data.previewVault === "string" ? (data.previewVault as string) : null;
      if (vault) setPreviewVault(vault);
      const id = newShotId();
      const shot: Shot = {
        id,
        imageUrl: url,
        label: data.preview?.label || "첫 컷",
        timeSec: data.preview?.timeSec,
        vault,
        unlocked: false,
      };
      setShots([shot]);
      setSelectedShotId(id);
    } catch (e) {
      fail("generate", e instanceof Error ? e.message : "생성 오류");
    } finally {
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
    state.setBusyKind(stage);
    clearFail();
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage,
          imageBase64: source,
          purposeId,
          subjectLook,
          subjectSeason,
          orderId,
          unlockToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        fail(stage, data.error || "다시 만들기에 실패했습니다.");
        return;
      }
      const url = data.shot?.imageUrl as string | undefined;
      if (!url) {
        fail(stage, "새 컷이 없습니다.");
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
      if (regenSelfie) setSelfie(regenSelfie);
      if (typeof data.redoUsed !== "number" && stage === "redo") setRedoUsed((n) => n + 1);
      if (typeof data.asvUsed !== "number" && stage === "asv") setAsvUsed((n) => n + 1);
    } catch {
      fail(stage, "다시 만들기에 실패했습니다. 기존 컷은 받으실 수 있어요.");
    } finally {
      state.setBusyKind(null);
    }
  };

  return { processFile, onFile, generate, onRegenFile, runPaidRegen };
}
