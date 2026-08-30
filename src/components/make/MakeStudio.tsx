"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PurposeUploadStep from "@/components/make/steps/PurposeUploadStep";
import PreviewStep from "@/components/make/steps/PreviewStep";
import CheckoutStep from "@/components/make/steps/CheckoutStep";
import FirstCutButton from "@/components/make/steps/FirstCutButton";
import PaidDonePanel from "@/components/make/steps/PaidDonePanel";
import { useMakeStudioState } from "@/hooks/make/useMakeStudioState";
import { useSessionRestore } from "@/hooks/make/useSessionRestore";
import { usePersistPaidSession } from "@/hooks/make/usePersistPaidSession";
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

export type MakeStudioVariant = "make" | "result";

export default function MakeStudio({ variant = "make" }: { variant?: MakeStudioVariant }) {
  const params = useSearchParams();
  const router = useRouter();
  const initialRaw = (params.get("purpose") as PurposeId) || "resume";
  const initialPurpose = PURPOSES.some((p) => p.id === initialRaw) ? initialRaw : "resume";

  const state = useMakeStudioState(initialPurpose);
  const [layoutSavedOnce, setLayoutSavedOnce] = useState(false);
  useSessionRestore(state, { setLayoutSavedOnce });
  usePersistPaidSession(state, { layoutSavedOnce });

  useEffect(() => {
    const raw =
      params.get("partner") ||
      params.get("partnerCode") ||
      params.get("ref") ||
      "";
    const code = raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
    if (!code) return;
    state.setPartnerCode(code);
    try {
      localStorage.setItem("djs_partner", code);
    } catch {
      /* ignore */
    }
  }, [params, state.setPartnerCode]);

  useEffect(() => {
    if (state.partnerCode) return;
    try {
      const saved = localStorage.getItem("djs_partner");
      if (saved) state.setPartnerCode(saved);
    } catch {
      /* ignore */
    }
  }, [state.partnerCode, state.setPartnerCode]);

  // /make 에서 이미 결제된 세션이면 /result 로 보냄
  useEffect(() => {
    if (variant !== "make") return;
    if (!state.paid) return;
    const sid = state.orderId ? `?session=${encodeURIComponent(state.orderId)}` : "";
    router.replace(`/result${sid}`);
  }, [variant, state.paid, state.orderId, router]);

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
  const { download, saveReadyFile, downloadExtra, deliverCleanByEmail } = useDownload(
    state,
    state.purposeId
  );
  const {
    downloadLayout,
    redownloadOwnedLayout,
    prepareAndSaveDefaultLayout,
    deliverLayoutByEmail,
  } = useLayoutDownload(state);

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
    const wantsPrintPreview = state.includeLayout || state.savedOnce;
    if (!wantsPrintPreview || !state.selectedUrl || !state.downloaded) {
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
  }, [
    state.includeLayout,
    state.savedOnce,
    state.selectedUrl,
    state.printSizeId,
    state.downloaded,
  ]);

  const flowStep = resolveMakeFlowStep({
    hasSelfie: !!state.selfie,
    hasPreview: state.hasPreview,
    paid: state.paid,
    downloaded: state.downloaded,
    savedOnce: state.savedOnce,
  });

  if (variant === "make") {
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
          extraPresetIds={state.extraPresetIds}
          toggleExtraPreset={state.toggleExtraPreset}
          extraCustom={state.extraCustom}
          setExtraCustom={state.setExtraCustom}
          selfie={state.selfie}
          inputRef={state.inputRef}
          onFile={onFile}
          processFile={processFile}
          error={state.error}
          errorAt={state.errorAt}
        />

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
          hasSelfie={!!state.selfie}
          paymentMode={
            process.env.NEXT_PUBLIC_PAYMENT_MODE === "toss" ? "toss" : "sandbox"
          }
        />
      </div>
    );
  }

  // variant === "result"
  return (
    <div className="mt-8 space-y-8">
      {!state.paid && (
        <div className="rounded-xl border border-ink-100 bg-white/90 p-5 text-sm text-ink-600">
          <p>결제 정보가 없습니다. 만들기에서 다시 결제해 주세요.</p>
          <button
            type="button"
            className="mt-4 text-sm font-semibold text-studio underline"
            onClick={() => router.push("/make")}
          >
            만들기로 돌아가기
          </button>
        </div>
      )}

      {state.paid && !state.hasPreview && (
        <FirstCutButton
          paid={state.paid}
          selfie={!!state.selfie}
          busyKind={state.busyKind}
          generate={generate}
          error={state.error}
          errorAt={state.errorAt}
          loadingLines={lines}
          loadingIdx={loadingIdx}
        />
      )}

      {state.hasPreview && (
        <PreviewStep
          shots={state.shots}
          selectedShotId={state.selectedShotId}
          setSelectedShotId={state.setSelectedShotId}
          setPreviewVault={state.setPreviewVault}
          mock={state.mock}
          selfie={state.selfie}
        />
      )}

      {flowStep === "paidDone" && (
        <PaidDonePanel
          packId={state.packId}
          includeLayout={state.includeLayout}
          downloaded={state.downloaded}
          savedOnce={state.savedOnce}
          setSavedOnce={state.setSavedOnce}
          layoutSavedOnce={layoutSavedOnce}
          setLayoutSavedOnce={setLayoutSavedOnce}
          downloadOk={state.downloadOk}
          setDownloadOk={state.setDownloadOk}
          error={state.error}
          errorAt={state.errorAt}
          busyKind={state.busyKind}
          loadingLines={lines}
          loadingIdx={loadingIdx}
          downloading={state.downloading}
          layoutBuying={state.layoutBuying}
          extraBusyId={state.extraBusyId}
          selectedUrl={state.selectedUrl}
          saveReady={state.saveReady}
          layoutSaveReady={state.layoutSaveReady}
          layoutUrl={state.layoutUrl}
          layoutBusy={state.layoutBusy}
          primaryShotId={state.primaryShotId}
          shots={state.shots}
          selectedShotId={state.selectedShotId}
          setSelectedShotId={state.setSelectedShotId}
          setPreviewVault={state.setPreviewVault}
          download={download}
          saveReadyFile={saveReadyFile}
          prepareAndSaveDefaultLayout={prepareAndSaveDefaultLayout}
          deliverCleanByEmail={deliverCleanByEmail}
          deliverLayoutByEmail={deliverLayoutByEmail}
          redoUsed={state.redoUsed}
          asvUsed={state.asvUsed}
          regenSelfie={state.regenSelfie}
          setRegenSelfie={state.setRegenSelfie}
          regenInputRef={state.regenInputRef}
          onRegenFile={onRegenFile}
          runPaidRegen={runPaidRegen}
          subjectLook={state.subjectLook}
          extraPresetIds={state.extraPresetIds}
          toggleExtraPreset={state.toggleExtraPreset}
          extraCustom={state.extraCustom}
          setExtraCustom={state.setExtraCustom}
          layoutOffer={state.layoutOffer}
          layoutFreeUsed={state.layoutFreeUsed}
          layoutRemainingCount={state.layoutRemainingCount}
          layoutPackPaid={state.layoutPackPaid}
          layoutPaidSizeIds={state.layoutPaidSizeIds}
          downloadLayout={downloadLayout}
          redownloadOwnedLayout={redownloadOwnedLayout}
          setLayoutSkippedIds={state.setLayoutSkippedIds}
          extraShots={state.extraShots}
          extraPaidIds={state.extraPaidIds}
          downloadExtra={downloadExtra}
        />
      )}
    </div>
  );
}
