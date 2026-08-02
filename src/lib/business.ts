/** 전자상거래·세무 표기용 사업자 정보 (env로 채움) */

export type BusinessInfo = {
  tradeName: string;
  /** 개인사업자 | 법인 | 미등록 */
  entityType: string;
  ceo: string;
  bizNo: string;
  mailOrderNo: string;
  address: string;
  email: string;
  phone: string;
  /** 부가세 안내 */
  vatNote: string;
  /** 세금계산서·현금영수증 안내 */
  taxInvoiceNote: string;
};

function env(key: string, fallback = ""): string {
  if (typeof process === "undefined") return fallback;
  return (process.env[key] || "").trim() || fallback;
}

/** 미등록이면 빈 칸 — 푸터에서 베타 고지로 묶음 */
export function getBusinessInfo(): BusinessInfo {
  return {
    tradeName: env("NEXT_PUBLIC_BIZ_TRADE_NAME", "증명사진 -단정-"),
    entityType: env("NEXT_PUBLIC_BIZ_ENTITY_TYPE", "개인사업자(예정)"),
    ceo: env("NEXT_PUBLIC_BIZ_CEO"),
    bizNo: env("NEXT_PUBLIC_BIZ_NO"),
    mailOrderNo: env("NEXT_PUBLIC_BIZ_MAIL_ORDER_NO"),
    address: env("NEXT_PUBLIC_BIZ_ADDRESS"),
    email: env("NEXT_PUBLIC_BIZ_EMAIL", "support@danjeongshot.com"),
    phone: env("NEXT_PUBLIC_BIZ_PHONE"),
    vatNote: env(
      "NEXT_PUBLIC_BIZ_VAT_NOTE",
      "표시 금액은 부가세(10%) 포함 예정입니다. 사업자 등록 후 과세 매출을 신고합니다."
    ),
    taxInvoiceNote: env(
      "NEXT_PUBLIC_BIZ_TAX_INVOICE_NOTE",
      "세금계산서·현금영수증은 사업자등록 완료 후 발행합니다."
    ),
  };
}

export function bizField(value: string, emptyLabel = "등록 후 기재"): string {
  return value.trim() || emptyLabel;
}

/** 사업자 핵심 칸이 비어 있으면 베타(등록 전) */
export function isBizPreRegistration(b: BusinessInfo = getBusinessInfo()): boolean {
  return !b.bizNo.trim() || !b.mailOrderNo.trim();
}
