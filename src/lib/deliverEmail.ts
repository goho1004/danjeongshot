/**
 * PNG 이메일 전달 — Resend API.
 * RESEND_API_KEY 없으면 mock(로컬) · 주문 markDownloaded는 호출측에서.
 * 상시 보관 ✗ · 메일에 PNG 첨부(수신함 TTL은 메일 사업자).
 */

import { BRAND } from "@/lib/brand";
import { PRINTING_BOX, PRINT_GUIDE } from "@/lib/printingBox";

export type DeliverKind = "clean" | "layout";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidDeliverEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

export function deliverFromAddress(): string {
  return (
    process.env.DELIVER_FROM?.trim() ||
    process.env.NEXT_PUBLIC_BIZ_EMAIL?.trim() ||
    "단정샷 <onboarding@resend.dev>"
  );
}

export function deliverTtlHours(): number {
  const n = Number(process.env.DELIVER_TTL_HOURS || 48);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 168) : 48;
}

export async function sendPngByEmail(input: {
  to: string;
  png: Buffer;
  filename: string;
  kind: DeliverKind;
  orderId: string;
  siteUrl: string;
}): Promise<{ ok: true; mock?: boolean } | { ok: false; error: string }> {
  const to = input.to.trim().toLowerCase();
  if (!isValidDeliverEmail(to)) {
    return { ok: false, error: "이메일 주소를 확인해 주세요." };
  }
  if (!input.png.length || input.png.length > 12_000_000) {
    return { ok: false, error: "파일 크기가 너무 크거나 비어 있어요." };
  }

  const ttl = deliverTtlHours();
  const kindLabel = input.kind === "layout" ? "인화용 레이아웃" : "단정 PNG";
  const printPath = `${input.siteUrl.replace(/\/$/, "")}${PRINT_GUIDE.path}`;
  const subject = `[${BRAND.short}] ${kindLabel} 도착 · ${input.orderId.slice(-8)}`;
  const html = `
    <p><strong>${BRAND.sign}</strong>에서 요청하신 <strong>${kindLabel}</strong>을 첨부했습니다.</p>
    <p>폰에서 파일을 못 찾을 때 · <strong>이 메일함</strong>에서 열어 저장한 뒤
      <a href="${PRINTING_BOX.homeUrl}">${PRINTING_BOX.name}</a>에 올려 인화하세요.</p>
    <p>
      <a href="${PRINTING_BOX.storeUrl}">${PRINTING_BOX.name} 위치 찾기</a>
      · <a href="${printPath}">${PRINT_GUIDE.label}</a>
      · <a href="${PRINTING_BOX.homeUrl}">쿠폰·이벤트</a>
    </p>
    <p style="color:#666;font-size:12px">주문 ${input.orderId} · 발송용이며 서버에 상시 보관하지 않습니다.
      메일 보관은 약 ${ttl}시간 내 다운로드를 권장합니다. 여권·관공서용 아님.</p>
  `;

  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.info("[deliver/email] mock (no RESEND_API_KEY)", {
      to,
      filename: input.filename,
      bytes: input.png.length,
      orderId: input.orderId,
    });
    return { ok: true, mock: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: deliverFromAddress(),
      to: [to],
      subject,
      html,
      attachments: [
        {
          filename: input.filename,
          content: input.png.toString("base64"),
        },
      ],
    }),
  });

  if (!res.ok) {
    let detail = `발송 실패 (${res.status})`;
    try {
      const j = (await res.json()) as { message?: string };
      if (j.message) detail = j.message.slice(0, 160);
    } catch {
      /* ignore */
    }
    return { ok: false, error: detail };
  }
  return { ok: true };
}
