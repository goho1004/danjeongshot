"use client";

import { useEffect, useRef, useState } from "react";
import {
  destroyTossOrderWidgets,
  formatTossError,
  mountTossOrderWidgets,
  requestTossOrderPayment,
  resetTossWidgetsDom,
  updateTossAmount,
  type TossWidgetsHandle,
} from "@/lib/tossClient";

/** Strict Mode에서 동시 마운트 방지 */
let mountSeq = 0;

/**
 * 주문서형 결제 UI 마운트.
 * CheckoutStep의 #djs-toss-methods / #djs-toss-agreement 필요.
 */
export function useTossOrderWidgets(opts: {
  enabled: boolean;
  amountKrw: number;
  customerKey: string;
}) {
  const handleRef = useRef<TossWidgetsHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);

  useEffect(() => {
    if (!opts.enabled) {
      setReady(false);
      setMountError(null);
      return;
    }

    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim();
    if (!clientKey) {
      setMountError("결제 클라이언트 키가 없습니다. (.env.local)");
      return;
    }

    const mySeq = ++mountSeq;
    let cancelled = false;
    setReady(false);
    setMountError(null);

    const run = async () => {
      // DOM 페인트 + Strict Mode 첫 cleanup 여유
      await new Promise((r) => setTimeout(r, 120));
      if (cancelled || mySeq !== mountSeq) return;

      try {
        await destroyTossOrderWidgets(handleRef.current);
        handleRef.current = null;
        if (cancelled || mySeq !== mountSeq) return;

        const handle = await mountTossOrderWidgets({
          clientKey,
          customerKey: opts.customerKey,
          amountKrw: opts.amountKrw,
        });

        if (cancelled || mySeq !== mountSeq) {
          await destroyTossOrderWidgets(handle);
          await resetTossWidgetsDom();
          return;
        }

        handleRef.current = handle;
        setReady(true);
        setMountError(null);
      } catch (e) {
        if (cancelled || mySeq !== mountSeq) return;
        console.error("[toss widgets mount]", e);
        setMountError(
          formatTossError(
            e,
            "결제 UI를 불러오지 못했습니다. 광고차단을 끄고 새로고침해 보세요."
          )
        );
        setReady(false);
        await resetTossWidgetsDom();
      }
    };

    void run();

    return () => {
      cancelled = true;
      const h = handleRef.current;
      handleRef.current = null;
      setReady(false);
      void (async () => {
        await destroyTossOrderWidgets(h);
        await resetTossWidgetsDom();
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.enabled, opts.customerKey]);

  useEffect(() => {
    const h = handleRef.current;
    if (!h || !opts.enabled || !ready) return;
    void updateTossAmount(h.widgets, opts.amountKrw).catch((e) => {
      console.warn("[toss setAmount]", e);
    });
  }, [opts.amountKrw, opts.enabled, ready]);

  const requestPayment = async (input: {
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
  }) => {
    const h = handleRef.current;
    if (!h) {
      throw new Error("결제수단 UI가 아직 준비되지 않았습니다.");
    }
    try {
      await requestTossOrderPayment(h.widgets, input);
    } catch (e) {
      throw new Error(
        formatTossError(e, "결제 요청에 실패했습니다. 다시 시도해 주세요.")
      );
    }
  };

  return { ready, mountError, requestPayment };
}
