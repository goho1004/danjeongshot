/**
 * 사용자에게 보이는 문구 — 모델명·API·스택·영문 원문 절대 노출 금지.
 */

export const STUDIO_BUSY =
  "지금 사진관이 조금 바빠요. 잠시만 기다려 주세요.";

export const STUDIO_WAIT =
  "손님이 많아요. 잠시 후 다시 눌러 주세요.";

export const STUDIO_RETRY =
  "조명을 다시 맞추는 중이에요. 잠깐 뒤 한 번 더 눌러 주세요.";

const LEAK_RE =
  /gemini|google|genai|api[_ -]?key|quota|rate.?limit|429|503|401|403|404|500|model@|flash-lite|interactions\.|stack|ECONN|ENOTFOUND|fetch failed|base64|token|unlock|ord_/i;

/** 서버·클라이언트가 사용자에게 보여줄 안전한 한 줄 */
export function toUserFacingGenerateError(
  raw: unknown,
  kind: "busy" | "wait" | "retry" | "generic" = "busy"
): string {
  const fallback =
    kind === "wait" ? STUDIO_WAIT : kind === "retry" ? STUDIO_RETRY : STUDIO_BUSY;

  if (typeof raw !== "string" || !raw.trim()) return fallback;
  const t = raw.trim();

  // 이미 우리가 쓴 안전한 문구면 통과
  if (
    t === STUDIO_BUSY ||
    t === STUDIO_WAIT ||
    t === STUDIO_RETRY ||
    t.includes("사진관이") ||
    t.includes("손님이 많") ||
    t.includes("조명을 다시")
  ) {
    return t.slice(0, 120);
  }

  // 허용된 제품 UX 문구 (결제·업로드 등)
  if (
    /셀카|결제|팩을 고르|다시 만들|A\/S|8MB|이미지 파일|주문/.test(t) &&
    !LEAK_RE.test(t)
  ) {
    return t.slice(0, 160);
  }

  if (LEAK_RE.test(t) || /[A-Za-z]{12,}/.test(t) || t.includes("{") || t.includes("http")) {
    return fallback;
  }

  // 짧은은 한글 안내만
  if (/^[가-힣0-9\s.,·…!?~\-「」『』()]+$/.test(t) && t.length <= 80) {
    return t;
  }

  return fallback;
}
