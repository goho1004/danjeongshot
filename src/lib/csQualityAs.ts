/**
 * CS 대응 1단계 — 상대 톤 맞춤 1·2차 → 카톡 사진 → 반영 생성 → 단정 마무리.
 * 멘트 본문: csMentPool 선별.
 */
import type { CsIntent } from "./csTriage";
import { getMentById } from "./csMentPool";

export function isQualityAsIntent(intent: CsIntent): boolean {
  return intent === "quality_likeness" || intent === "regen_request";
}

export function buildQualityAsFirstReply(orderId?: string): string {
  const base = getMentById("qa1_standard")!.body;
  const ord = orderId?.trim() ? `\n(주문번호: ${orderId.trim()})` : "";
  return base + ord;
}

export function buildQualityAsDeliveryReply(): string {
  return getMentById("qa2_full")!.body;
}

export function buildQualityAsCaption(): string {
  return getMentById("qa2_caption")!.body;
}

export const QUALITY_AS_SOP = [
  "1차: 상대 톤에 맞는 멘트 선별 → 카톡 (환불보다 A/S)",
  "고객: 불만족 사진을 카톡에 올려 달라고 요청 → 수신",
  "옆창 Gemini: 수신 사진 + 요구를 반영해 재생성",
  "2차: 결과 PNG 카톡 붙여넣기 + 단정·신뢰 마무리 멘트",
  "주문 redo/asv 사용 여부 메모 (해당 시)",
] as const;

export function buildGeminiSidePrompt(hints?: {
  purpose?: string;
  pack?: string;
  note?: string;
}): string {
  const lines = [
    "단정샷 CS 1단계 A/S 재생성.",
    "첨부: 고객 카톡 불만족 결과 또는 새 셀카.",
    "고객 요구를 반영할 것 (닮음·밝기·자연스러움·배경 등).",
    "증명사진·배경 단색·정면·자연스러운 보정.",
    hints?.purpose ? `용도: ${hints.purpose}` : "용도: (고객 주문과 동일하게)",
    hints?.pack ? `팩: ${hints.pack}` : "",
    hints?.note ? `메모: ${hints.note}` : "",
    "출력: PNG 1컷 · 워터마크 없음.",
  ];
  return lines.filter(Boolean).join("\n");
}
