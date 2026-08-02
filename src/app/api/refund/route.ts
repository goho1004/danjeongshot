import { NextRequest, NextResponse } from "next/server";
import {
  ASV_LIMIT,
  REDO_LIMIT,
  getOrder,
  refundEligibility,
} from "@/lib/orders";
import { createRefundRequest } from "@/lib/refundRequests";

/**
 * 환불 요청 접수.
 * - 미다운로드 ≠ 자동 환불
 * - 품질·변심 → 다운로드·다시만들기·A/S 유도
 * - 환불은 사유 제출 → pending → 관리자 승인 후에만 실환불 (여기선 자동 markRefunded 안 함)
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const orderId = String(body.orderId ?? "").trim();
  const reasonRaw = String(body.reason ?? "").trim();
  const reason = reasonRaw.toLowerCase();

  if (!orderId) {
    return NextResponse.json({ error: "주문번호를 입력해 주세요." }, { status: 400 });
  }
  if (reasonRaw.length < 8) {
    return NextResponse.json(
      {
        error: "환불 사유를 조금만 더 적어 주세요. (상황·오류 메시지 등)",
        code: "REASON_REQUIRED",
        hint: "짧게라도 괜찮아요. 예: 결제 후 첫 컷 버튼이 안 열려요.",
      },
      { status: 400 }
    );
  }

  const order = getOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  const qualityOrChange =
    /마음에|안.?닮|별로|이상|어색|환불|변심|다시|재생성|품질|못생겼/.test(reason);

  // 1) 다운로드 전 + A/S 여유 → 환불 접수 대신 받기·A/S 유도
  if (
    order.paid &&
    !order.downloadedAt &&
    (order.redoUsed < REDO_LIMIT || order.asvUsed < ASV_LIMIT)
  ) {
    const next =
      order.redoUsed < REDO_LIMIT
        ? "만들기에서 「마음에 안 들어요 · 다시 만들어 볼게요」를 먼저 써 보시고, 마음에 드는 컷이 나오면 「이 컷 받기」로 저장해 주세요."
        : "「A/S로 한 번 더」를 써 보신 뒤, 괜찮은 컷을 「이 컷 받기」로 받아 주세요. (할인권·인화팩 등 보상은 추후 안내 예정)";

    return NextResponse.json(
      {
        error: "아직 받으실 수 있는 컷이 있어요. 환불보다 먼저 받기·다시 만들기를 권합니다.",
        code: "REDIRECT_TO_DOWNLOAD_OR_ASV",
        hint: next,
        tipsUrl: "/help#shoot-tips",
        makeUrl: "/make?resume=1",
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
        hint: "이미 받아 가신 주문은 환불이 어렵습니다. 다음에 결제 직후 다시 만들기·A/S를 이용해 주세요.",
      },
      { status: 403 }
    );
  }

  // 2) A/S 소진·미다운로드·품질만 → 그래도 다운로드 유도 (자동 환불 ✗)
  if (qualityOrChange && !/오류|에러|중복|두.?번|시스템|장애|결제.?오류/.test(reason)) {
    return NextResponse.json(
      {
        error:
          "품질·변심만으로는 바로 환불되지 않아요. 남은 컷을 「이 컷 받기」로 받아 보시거나, 사유와 함께 검토 요청을 남겨 주세요.",
        code: "PREFER_DOWNLOAD",
        hint: "받기 어려우신 기술 문제라면 주문번호·화면 상황을 적어 다시 요청해 주세요. /make?resume=1",
        makeUrl: "/make?resume=1",
      },
      { status: 403 }
    );
  }

  // 3) 접수만 — 관리자 승인 전 자동 환불 없음
  const request = createRefundRequest(orderId, reasonRaw);

  return NextResponse.json({
    ok: true,
    orderId,
    requestId: request.id,
    status: "pending",
    refunded: false,
    message:
      "환불 요청을 접수했습니다. 자동 환불은 되지 않으며, 운영자가 사유를 확인한 뒤 승인되면 환불됩니다. 기다려 주셔서 감사합니다.",
  });
}

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId") ?? "";
  const elig = refundEligibility(orderId);
  const order = getOrder(orderId);
  return NextResponse.json({
    ...elig,
    autoRefund: false,
    asvAvailable: order
      ? !order.downloadedAt &&
        order.paid &&
        (order.redoUsed < REDO_LIMIT || order.asvUsed < ASV_LIMIT)
      : false,
    tip: "미다운로드는 자동 환불이 아닙니다. 먼저 「이 컷 받기」·다시 만들기를 이용해 주세요. 환불은 사유 제출 후 관리자 승인제입니다. /legal/refund",
  });
}
