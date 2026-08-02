"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ShootTips from "@/components/ShootTips";
import { PRINT_GUIDE, PRINTING_BOX } from "@/lib/printingBox";
import PurposeUploadStep from "@/components/make/steps/PurposeUploadStep";
import PreviewStep from "@/components/make/steps/PreviewStep";
import CheckoutStep from "@/components/make/steps/CheckoutStep";
import FirstCutButton from "@/components/make/steps/FirstCutButton";
import PostPayFetchStep from "@/components/make/steps/PostPayFetchStep";
import PostPaySaveStep from "@/components/make/steps/PostPaySaveStep";
import PostSaveLayoutStep from "@/components/make/steps/PostSaveLayoutStep";
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

export default function MakeStudio() {
  const params = useSearchParams();
  const initialRaw = (params.get("purpose") as PurposeId) || "resume";
  const initialPurpose = PURPOSES.some((p) => p.id === initialRaw) ? initialRaw : "resume";

  const state = useMakeStudioState(initialPurpose);
  useSessionRestore(state);
  usePersistPaidSession(state);

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
    hasSelfie: !!state.selfie,
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

      {/* 결제창을 초록 버튼보다 위에 — 보이던 그 카드 */}
      {!state.paid && (
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
      )}

      {!state.hasPreview && (
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
          subjectLook={state.subjectLook}
          extraPresetIds={state.extraPresetIds}
          toggleExtraPreset={state.toggleExtraPreset}
          extraCustom={state.extraCustom}
          setExtraCustom={state.setExtraCustom}
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
        className="rounded-2xl border-2 border-ink-900 bg-ink-950 p-5 text-sm text-white"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-studio-soft">
          {PRINT_GUIDE.label}
        </p>
        <h2 className="mt-1 font-display text-lg font-semibold text-white">
          {PRINTING_BOX.name}에서 4×6 인화
        </h2>
        <p className="mt-2 text-xs text-ink-300">
          배송은 없어요. 레이아웃 PNG를 업로드한 뒤 인쇄코드로 근처 기기에서 뽑으세요.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={PRINTING_BOX.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-full bg-studio-soft px-4 py-2 text-xs font-semibold text-ink-950 hover:bg-white"
          >
            {PRINTING_BOX.name} 위치 찾기 →
          </a>
          <Link
            href={PRINT_GUIDE.path}
            className="inline-flex rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white hover:border-white"
          >
            {PRINT_GUIDE.label} 자세히 →
          </Link>
        </div>
      </section>

      <div id="shoot-tips-full">
        <ShootTips />
      </div>
    </div>
  );
}
