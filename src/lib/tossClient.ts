/**
 * 토스페이먼츠 v2 주문서형
 * @see https://docs.tosspayments.com/guides/v2/payment-widget/integration
 */
import {
  loadTossPayments,
  clearTossPayments,
  ANONYMOUS,
  type TossPaymentsWidgets,
  type WidgetAgreementWidget,
  type WidgetPaymentMethodWidget,
} from "@tosspayments/tosspayments-sdk";

export const TOSS_METHOD_SELECTOR = "#djs-toss-methods";
export const TOSS_AGREE_SELECTOR = "#djs-toss-agreement";

export function toTossCustomerKey(raw: string | null | undefined): string {
  const s = (raw || "").trim();
  if (!s) return ANONYMOUS;
  const key = /^[a-zA-Z0-9_-]{1,46}$/.test(s) ? `djs_${s}` : s;
  if (
    key.length >= 2 &&
    key.length <= 50 &&
    /[a-zA-Z0-9]/.test(key) &&
    /[-_=.@]/.test(key)
  ) {
    return key;
  }
  return ANONYMOUS;
}

export type TossWidgetsHandle = {
  widgets: TossPaymentsWidgets;
  methods: WidgetPaymentMethodWidget;
  agreement: WidgetAgreementWidget;
};

export function formatTossError(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object") return fallback;
  const e = err as { code?: string; message?: string; name?: string };
  const code = e.code || e.name || "";
  const msg = e.message || fallback;
  if (code && !msg.includes(code)) return `${msg} (${code})`;
  return msg;
}

async function waitForSelector(selector: string, timeoutMs = 5000): Promise<HTMLElement> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector(selector);
    if (el instanceof HTMLElement) return el;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw new Error(
    `결제 UI 영역(${selector})을 찾지 못했습니다. 페이지를 새로고침해 주세요.`
  );
}

function clearContainer(selector: string) {
  const el = document.querySelector(selector);
  if (el) el.innerHTML = "";
}

/** React Strict Mode 이중 마운트·잔존 위젯 정리 */
export async function resetTossWidgetsDom() {
  try {
    clearTossPayments();
  } catch {
    /* ignore */
  }
  clearContainer(TOSS_METHOD_SELECTOR);
  clearContainer(TOSS_AGREE_SELECTOR);
  await new Promise((r) => setTimeout(r, 50));
}

export async function destroyTossOrderWidgets(handle: TossWidgetsHandle | null) {
  if (!handle) return;
  try {
    await handle.methods.destroy();
  } catch {
    /* ignore */
  }
  try {
    await handle.agreement.destroy();
  } catch {
    /* ignore */
  }
}

export async function mountTossOrderWidgets(input: {
  clientKey: string;
  customerKey: string;
  amountKrw: number;
}): Promise<TossWidgetsHandle> {
  if (!Number.isFinite(input.amountKrw) || input.amountKrw <= 0) {
    throw new Error(`결제 금액이 올바르지 않습니다. (${input.amountKrw})`);
  }

  await waitForSelector(TOSS_METHOD_SELECTOR);
  await waitForSelector(TOSS_AGREE_SELECTOR);
  await resetTossWidgetsDom();

  const tossPayments = await loadTossPayments(input.clientKey);
  // 비회원 — customerKey 이슈 회피
  const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });

  await widgets.setAmount({
    currency: "KRW",
    value: Math.round(input.amountKrw),
  });

  let methods: WidgetPaymentMethodWidget;
  try {
    methods = await widgets.renderPaymentMethods({
      selector: TOSS_METHOD_SELECTOR,
      variantKey: "DEFAULT",
    });
  } catch (e) {
    // variantKey 미설정 상점·docs 키 폴백
    try {
      methods = await widgets.renderPaymentMethods({
        selector: TOSS_METHOD_SELECTOR,
      });
    } catch (e2) {
      throw new Error(
        formatTossError(
          e2,
          formatTossError(e, "결제수단 UI를 그리지 못했습니다.")
        )
      );
    }
  }

  let agreement: WidgetAgreementWidget;
  try {
    agreement = await widgets.renderAgreement({
      selector: TOSS_AGREE_SELECTOR,
      variantKey: "AGREEMENT",
    });
  } catch (e) {
    try {
      agreement = await widgets.renderAgreement({
        selector: TOSS_AGREE_SELECTOR,
      });
    } catch (e2) {
      try {
        await methods.destroy();
      } catch {
        /* ignore */
      }
      throw new Error(
        formatTossError(
          e2,
          formatTossError(e, "약관 UI를 그리지 못했습니다.")
        )
      );
    }
  }

  return { widgets, methods, agreement };
}

export async function updateTossAmount(
  widgets: TossPaymentsWidgets,
  amountKrw: number
) {
  await widgets.setAmount({
    currency: "KRW",
    value: Math.round(amountKrw),
  });
}

export async function requestTossOrderPayment(
  widgets: TossPaymentsWidgets,
  input: {
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
  }
) {
  await widgets.requestPayment({
    orderId: input.orderId,
    orderName: input.orderName,
    successUrl: input.successUrl,
    failUrl: input.failUrl,
  });
}
