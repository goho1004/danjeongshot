import { NextRequest, NextResponse } from "next/server";
import {
  ASV_LIMIT,
  REDO_LIMIT,
  getOrder,
  markRefunded,
  refundEligibility,
} from "@/lib/orders";

/**
 * 환불 요청.
 * 품질·변심 → A/S 유도 (redo/asv 남아 있으면 환불 거절).
 * 다운로드 후 → 환불 불가.
 * 오류·중복결제 등만 제한적 환불.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const orderId = String(body.orderId ?? "");
  const reason = String(body.reason ?? "").toLowerCase();

  const order = getOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  const qualityOrChange =
    /마음에|안.?닮|별로|이상|어색|환불|변심|다시|재생성|품질|못생겼/.test(reason) ||
    reason.trim() === "";

  // 다운로드 전 + A/S 여유 있으면 환불 대신 A/S
  if (
    order.paid &&
    !order.downloadedAt &&
    qualityOrChange &&
    (order.redoUsed < REDO_LIMIT || order.asvUsed < ASV_LIMIT)
  ) {
    const next =
      order.redoUsed < REDO_LIMIT
        ? "만들기 화면에서 「마음에 안 들어요 · 다시 만들어 볼게요」를 눌러 주세요. 다른 셀카도 올릴 수 있어요."
        : "만들기 화면에서 「A/S 서비스로 한 번 더」를 이용해 주세요. 더 밝은 정면 셀카로 바꾸면 결과가 나아지는 경우가 많습니다.";

    return NextResponse.json(
      {
        error: "품질·변심 환불 대신 A/S를 먼저 이용해 주세요.",
        code: "REDIRECT_TO_ASV",
        hint: next,
        tipsUrl: "/help#shoot-tips",
        makeUrl: "/make",
        redoUsed: order.redoUsed,
        asvUsed: order.asvUsed,
      },
      { status: 403 }
    );
  }

  const elig = refundEligibility(orderId);
  if (!elig.ok) {
    return NextResponse.json(
      {
        error: elig.reason,
        code: "REFUND_DENIED_AFTER_DOWNLOAD",
        downloadedAt: elig.downloadedAt,
        hint: "이미 다운로드하셨습니다. 다음엔 결제 직후 A/S·다른 셀카로 받아 주세요. 촬영 팁: /help#shoot-tips",
      },
      { status: 403 }
    );
  }

  // A/S 소진 + 미다운로드 + 품질만 → 여전히 A/S 메시지 (환불 거절, 오류 아닌 경우)
  if (qualityOrChange && !/오류|에러|중복|두.?번|시스템|장애/.test(reason)) {
    return NextResponse.json(
      {
        error: "재생성·A/S를 모두 사용하셨거나, 품질 변심만으로는 환불이 어렵습니다. 남은 컷을 받아 가 주세요.",
        code: "REFUND_DENIED_USE_ASV",
        hint: "촬영 팁: /help#shoot-tips · 정책: /legal/refund",
      },
      { status: 403 }
    );
  }

  console.info("[refund]", { orderId, reason: reason.slice(0, 200) });
  markRefunded(orderId);

  return NextResponse.json({
    ok: true,
    orderId,
    refunded: true,
    mode: "sandbox",
    message: "샌드박스 환불 처리되었습니다. (실결제 연동 시 PG 환불으로 교체)",
  });
}

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId") ?? "";
  const elig = refundEligibility(orderId);
  const order = getOrder(orderId);
  return NextResponse.json({
    ...elig,
    asvAvailable: order
      ? !order.downloadedAt &&
        order.paid &&
        (order.redoUsed < REDO_LIMIT || order.asvUsed < ASV_LIMIT)
      : false,
    tip: "품질 불만은 환불보다 A/S·다른 셀카를 권합니다. /help#shoot-tips",
  });
}
