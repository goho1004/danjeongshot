"use client";

import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { CHECKOUT_SESSION_KEY } from "@/lib/make/types";
import type { PackId } from "@/lib/purposes";
import type { MakeStudioState } from "@/hooks/make/useMakeStudioState";

export function useCheckout(
  state: MakeStudioState,
  deviceFp: string,
  purposeId: string,
  subjectLook: string,
  subjectSeason: string
) {
  const {
    hasPreview,
    selectedUrl,
    selectedShot,
    previewVault,
    previewAssetId,
    packId,
    shots,
    selectedShotId,
    selfie,
    orderTicket,
    clearFail,
    fail,
    setPaying,
    setPreviewAssetId,
    setOrderTicket,
    setPackId,
    setLayoutPaidSizeIds,
    setLayoutFreeUsed,
    setOrderId,
    setUnlockToken,
    setRedoUsed,
    setAsvUsed,
    setPaid,
  } = state;

  const checkout = async () => {
    if (!selectedUrl && !hasPreview) {
      fail("checkout", "미리보기를 먼저 확인해 주세요.");
      return;
    }
    if (!previewVault && !previewAssetId && !selectedShot?.vault) {
      fail("checkout", "미리보기 세션이 없습니다. 첫 컷을 다시 만들어 주세요.");
      return;
    }
    clearFail();
    setPaying(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purposeId,
          packId,
          previewAssetId,
          previewVault: selectedShot?.vault || previewVault,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        fail("checkout", data.error || "결제 생성 실패");
        return;
      }
      if (typeof data.previewAssetId === "string") setPreviewAssetId(data.previewAssetId);
      if (typeof data.orderTicket === "string") setOrderTicket(data.orderTicket);
      if (data.packId === "plus" || data.packId === "basic") setPackId(data.packId);
      if (Array.isArray(data.layoutPaidSizeIds)) {
        setLayoutPaidSizeIds(data.layoutPaidSizeIds.map(String));
        setLayoutFreeUsed(data.layoutPaidSizeIds.length > 0);
      }
      setOrderId(data.orderId);

      if (data.mode === "toss" && data.clientKey) {
        const { persistCheckoutSession } = await import("@/lib/sessionHeavy");
        await persistCheckoutSession(CHECKOUT_SESSION_KEY, {
          orderId: data.orderId as string,
          orderTicket: (data.orderTicket as string) || "",
          amountKrw: data.amountKrw as number,
          packId: (data.packId as PackId) || packId,
          purposeId,
          previewAssetId: (data.previewAssetId as string) || previewAssetId,
          previewVault: selectedShot?.vault || previewVault,
          shots,
          selectedShotId,
          subjectLook,
          subjectSeason,
          selfie,
        });
        const toss = await loadTossPayments(String(data.clientKey));
        const customerKey =
          deviceFp && /^[a-zA-Z0-9_-]{2,50}$/.test(deviceFp)
            ? deviceFp
            : `djs_${Date.now().toString(36)}`;
        await toss.payment({ customerKey }).requestPayment({
          method: "CARD",
          amount: { currency: "KRW", value: Number(data.amountKrw) },
          orderId: String(data.orderId),
          orderName: String(data.orderName || "증명사진 -단정-"),
          successUrl: `${window.location.origin}/make/payment/success`,
          failUrl: `${window.location.origin}/make/payment/fail`,
        });
        return;
      }

      const pay = await fetch("/api/checkout/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: data.orderId,
          orderTicket: data.orderTicket || orderTicket,
        }),
      });
      const paidData = await pay.json();
      if (!pay.ok) {
        fail("checkout", paidData.error || "결제 완료 실패");
        return;
      }
      setUnlockToken(paidData.unlockToken);
      if (typeof paidData.redoUsed === "number") setRedoUsed(paidData.redoUsed);
      if (typeof paidData.asvUsed === "number") setAsvUsed(paidData.asvUsed);
      if (paidData.packId === "plus" || paidData.packId === "basic") setPackId(paidData.packId);
      if (Array.isArray(paidData.layoutPaidSizeIds)) {
        setLayoutPaidSizeIds(paidData.layoutPaidSizeIds.map(String));
        setLayoutFreeUsed(paidData.layoutPaidSizeIds.length > 0);
      }
      setPaid(true);
    } catch (e) {
      fail(
        "checkout",
        e instanceof Error && e.message
          ? e.message
          : "결제 처리 중 오류가 발생했습니다. 다시 시도해 주세요."
      );
    } finally {
      setPaying(false);
    }
  };

  return { checkout };
}
