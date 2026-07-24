"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ShootTips from "@/components/ShootTips";
import PurposeUploadStep from "@/components/make/steps/PurposeUploadStep";
import PreviewStep from "@/components/make/steps/PreviewStep";
import CheckoutStep from "@/components/make/steps/CheckoutStep";
import PostPayFetchStep from "@/components/make/steps/PostPayFetchStep";
import PostPaySaveStep from "@/components/make/steps/PostPaySaveStep";
import PostSaveLayoutStep from "@/components/make/steps/PostSaveLayoutStep";
import { useMakeStudioState } from "@/hooks/make/useMakeStudioState";
import { useSessionRestore } from "@/hooks/make/useSessionRestore";
import { useGenerate } from "@/hooks/make/useGenerate";
import { useCheckout } from "@/hooks/make/useCheckout";
import { useDownload } from "@/hooks/make/useDownload";
import { useLayoutDownload } from "@/hooks/make/useLayoutDownload";
import { resolveMakeFlowStep } from "@/lib/flow/makeFlow";
import { generatePhotoSheet, getPrintSize } from "@/lib/photoSheet";
import {
  ASV_LOADING_LINES,
  LOADING_LINES,
  PAY_NUDGE_LINES,
  PURPOSES,
  REDO_LOADING_LINES,
  TRUST_CHIPS,
  type PurposeId,
} from "@/lib/purposes";

export default function MakeStudio() {
  const params = useSearchParams();
  const initialRaw = (params.get("purpose") as PurposeId) || "resume";
  const initialPurpose = PURPOSES.some((p) => p.id === initialRaw) ? initialRaw : "resume";

  const state = useMakeStudioState(initialPurpose);
  useSessionRestore(state);

  const deviceFp = useMemo(() => {
    if (typeof window === "undefined") return "";
    const key = "djs_device_fp";
    let v = localStorage.getItem(key);
    if (!v) {
      v = `d_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(key, v);
    }
    return v;
  }, []);

  const { onFile, processFile, generate, onRegenFile, runPaidRegen } = useGenerate(
    state,
    deviceFp,
    state.purposeId,
    state.subjectLook,
    state.subjectSeason
  );
  const { checkout } = useCheckout(
    state,
    deviceFp,
    state.purposeId,
    state.subjectLook,
    state.subjectSeason
  );
  const { download, saveReadyFile, downloadExtra } = useDownload(state, state.purposeId);
  const { downloadLayout, redownloadOwnedLayout, saveLayoutReadyFile } =
    useLayoutDownload(state);

  const [loadingIdx, setLoadingIdx] = useState(0);
  const [nudgeIdx] = useState(() => Math.floor(Math.random() * PAY_NUDGE_LINES.length));

  const lines =
    state.busyKind === "asv"
      ? ASV_LOADING_LINES
      : state.busyKind === "redo"
        ? REDO_LOADING_LINES
        : LOADING_LINES;

  useEffect(() => {
    if (!state.busyKind) return;
    setLoadingIdx(0);
    const t = setInterval(() => {
      setLoadingIdx((i) => (i + 1) % lines.length);
    }, 2600);
    return () => clearInterval(t);
  }, [state.busyKind, lines.length]);

  useEffect(() => {
    if (!state.includeLayout || !state.selectedUrl || !state.downloaded) {
      if (!state.downloaded) {
        state.setLayoutUrl(null);
      }
      return;
    }
    let cancelled = false;
    state.setLayoutBusy(true);
    generatePhotoSheet(state.selectedUrl, getPrintSize(state.printSizeId))
      .then((sheet) => {
        if (cancelled) return;
        state.setLayoutUrl(sheet.dataUrl);
      })
      .catch(() => {
        if (!cancelled) {
          state.setLayoutUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) state.setLayoutBusy(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mirror original deps
  }, [state.includeLayout, state.selectedUrl, state.printSizeId, state.downloaded]);

  const flowStep = resolveMakeFlowStep({
    hasPreview: state.hasPreview,
    paid: state.paid,
    downloaded: state.downloaded,
    savedOnce: state.savedOnce,
  });

  return (
    <div className="mt-8 space-y-8">
      <div className="flex flex-wrap gap-2">
        {TRUST_CHIPS.map((c) => (
          <span
            key={c}
            className="rounded-md border border-ink-100 bg-white/80 px-2.5 py-1 text-xs text-ink-500"
          >
            {c}
          </span>
        ))}
      </div>

      <PurposeUploadStep
        purposeId={state.purposeId}
        setPurposeId={state.setPurposeId}
        setPackId={state.setPackId}
        subjectLook={state.subjectLook}
        setSubjectLook={state.setSubjectLook}
        subjectSeason={state.subjectSeason}
        setSubjectSeason={state.setSubjectSeason}
        selfie={state.selfie}
        inputRef={state.inputRef}
        onFile={onFile}
        processFile={processFile}
        error={state.error}
        errorAt={state.errorAt}
        hasPreview={state.hasPreview}
        paid={state.paid}
        packId={state.packId}
        packBullets={state.pack.bullets}
        busyKind={state.busyKind}
        generate={generate}
        previewLeft={state.previewLeft}
        loadingLines={lines}
        loadingIdx={loadingIdx}
      />

      {state.hasPreview && (
        <PreviewStep
          shots={state.shots}
          selectedShotId={state.selectedShotId}
          setSelectedShotId={state.setSelectedShotId}
          setPreviewVault={state.setPreviewVault}
          mock={state.mock}
        />
      )}

      {flowStep === "preview" && (
        <CheckoutStep
          nudgeIdx={nudgeIdx}
          packId={state.packId}
          setPackId={state.setPackId}
          packBullets={state.pack.bullets}
          packName={state.pack.name}
          packTagline={state.pack.tagline}
          amount={state.amount}
          checkout={checkout}
          paying={state.paying}
          busyKind={state.busyKind}
          error={state.error}
          errorAt={state.errorAt}
        />
      )}

      {flowStep === "paidFetch" && (
        <PostPayFetchStep
          busyKind={state.busyKind}
          loadingLines={lines}
          loadingIdx={loadingIdx}
          download={download}
          downloading={state.downloading}
          selectedUrl={state.selectedUrl}
          redoUsed={state.redoUsed}
          asvUsed={state.asvUsed}
          regenSelfie={state.regenSelfie}
          setRegenSelfie={state.setRegenSelfie}
          regenInputRef={state.regenInputRef}
          onRegenFile={onRegenFile}
          runPaidRegen={runPaidRegen}
          error={state.error}
          errorAt={state.errorAt}
        />
      )}

      {flowStep === "paidSave" && (
        <PostPaySaveStep
          downloadOk={state.downloadOk}
          error={state.error}
          errorAt={state.errorAt}
          saveReady={state.saveReady}
          saveReadyFile={saveReadyFile}
          setSavedOnce={state.setSavedOnce}
          setDownloadOk={state.setDownloadOk}
          download={download}
          downloading={state.downloading}
        />
      )}

      {flowStep === "postSave" && (
        <PostSaveLayoutStep
          downloadOk={state.downloadOk}
          error={state.error}
          errorAt={state.errorAt}
          download={download}
          downloading={state.downloading}
          extraBusyId={state.extraBusyId}
          layoutBuying={state.layoutBuying}
          saveReady={state.saveReady}
          saveReadyFile={saveReadyFile}
          primaryShotId={state.primaryShotId}
          packId={state.packId}
          layoutSaveReady={state.layoutSaveReady}
          saveLayoutReadyFile={saveLayoutReadyFile}
          layoutPackPaid={state.layoutPackPaid}
          layoutPaidSizeIds={state.layoutPaidSizeIds}
          shots={state.shots}
          redownloadOwnedLayout={redownloadOwnedLayout}
          layoutOffer={state.layoutOffer}
          layoutFreeUsed={state.layoutFreeUsed}
          layoutRemainingCount={state.layoutRemainingCount}
          downloadLayout={downloadLayout}
          setLayoutSkippedIds={state.setLayoutSkippedIds}
          extraShots={state.extraShots}
          extraPaidIds={state.extraPaidIds}
          downloadExtra={downloadExtra}
        />
      )}

      <section
        id="kiosk-guide"
        className="rounded-2xl border border-ink-100 bg-white/70 p-5 text-sm text-ink-700"
      >
        <h2 className="font-display text-lg font-semibold text-ink-950">키오스크 안내</h2>
        <p className="mt-2 text-xs text-ink-500">
          배송은 없어요. 레이아웃 PNG를 받아 편의점·사진관 4×6으로 뽑으세요.
        </p>
      </section>

      <div id="shoot-tips-full">
        <ShootTips />
      </div>
    </div>
  );
}
