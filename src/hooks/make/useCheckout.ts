"use client";

import { useRouter } from "next/navigation";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { CHECKOUT_SESSION_KEY, RESTORE_PAID_KEY } from "@/lib/make/types";
import type { PackId } from "@/lib/purposes";
import type { MakeStudioState } from "@/hooks/make/useMakeStudioState";

export function useCheckout(
  state: MakeStudioState,
  deviceFp: string,
  purposeId: string,
  subjectLook: string,
  subjectSeason: string
) {
  const router = useRouter();
  const {
    selfie,
    packId,
    partnerCode,
    shots,
    selectedShotId,
    previewVault,
    previewAssetId,
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

  const goResult = (orderId: string) => {
    const q = orderId ? `?session=${encodeURIComponent(orderId)}` : "";
    router.push(`/result${q}`);
  };

  const checkout = async () => {
    if (!selfie) {
      fail("checkout", "셀카를 먼저 업로드해 주세요.");
      return;
    }
    clearFail();
    setPaying(true);
    try {
      try {
        const { clearRestorePaid } = await import("@/lib/sessionHeavy");
        await clearRestorePaid(RESTORE_PAID_KEY);
      } catch {
        /* ignore */
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purposeId,
          packId,
          previewAssetId,
          previewVault,
          partnerCode: partnerCode || undefined,
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
          previewVault: previewVault,
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

      if (data.mode === "portone") {
        const { requestPayment } = await import("@/lib/payment");
        const portoneRes = await requestPayment({
          orderId: String(data.orderId),
          orderName: String(data.orderName || "증명사진 -단정-"),
          amount: Number(data.amountKrw),
        });
        if (portoneRes && "code" in portoneRes && portoneRes.code != null) {
          fail(
            "checkout",
            (portoneRes as { message?: string }).message ||
              "결제가 취소되었거나 실패했습니다."
          );
          return;
        }
        // 브라우저 결제 성공 → 기존 complete로 unlock 발급 (서버 포트원 웹훅은 후속)
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
      try {
        const { persistRestorePaid } = await import("@/lib/sessionHeavy");
        await persistRestorePaid(RESTORE_PAID_KEY, {
          v: 2,
          paid: true,
          orderId: String(data.orderId || paidData.orderId || ""),
          unlockToken: paidData.unlockToken as string,
          orderTicket: (data.orderTicket as string) || paidData.unlockToken,
          amountKrw: paidData.amountKrw ?? data.amountKrw,
          packId: (paidData.packId as PackId) || packId,
          includeLayout: (paidData.packId || packId) === "plus",
          layoutPaidSizeIds: Array.isArray(paidData.layoutPaidSizeIds)
            ? paidData.layoutPaidSizeIds.map(String)
            : [],
          redoUsed: paidData.redoUsed ?? 0,
          asvUsed: paidData.asvUsed ?? 0,
          purposeId,
          previewAssetId,
          previewVault,
          shots,
          selectedShotId,
          subjectLook,
          subjectSeason,
          selfie,
        });
      } catch {
        /* ignore — /result restore best-effort */
      }
      goResult(String(data.orderId || paidData.orderId || ""));
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
