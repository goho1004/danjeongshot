import { NextResponse } from "next/server";
import {
  abuseConfigPublic,
  issueChallengeToken,
  turnstileConfigured,
} from "@/lib/abuseSignals";

/**
 * 경계 구간(일 200+)에서 미리보기 재시도용 챌린지 토큰.
 * 클라이언트는 waitMs 대기 후 토큰을 /api/generate 에 첨부.
 */
export async function GET() {
  const issued = issueChallengeToken();
  return NextResponse.json({
    ok: true,
    ...issued,
    turnstile: turnstileConfigured(),
    turnstileSiteKey: turnstileConfigured()
      ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
      : null,
    abuse: abuseConfigPublic(),
    notice: "잠시만 기다려 주세요. 자동으로 다시 시도합니다.",
  });
}
