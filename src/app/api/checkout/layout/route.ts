import { NextRequest, NextResponse } from "next/server";
import {
  claimFreeLayout,
  markLayoutSinglePaid,
  markLayoutPackPaid,
  canAccessLayoutSize,
  resolveOrder,
} from "@/lib/orders";
import { PRICE } from "@/lib/purposes";
import { PRINT_SIZES } from "@/lib/photoSheet";

/**
 * 인화 레이아웃 게이트 (샌드박스).
 * mode:
 *  - free   : 첫 1종 무료
 *  - single : 개별 ₩2000
 *  - pack   : 전 사이즈 ₩5000
 * PNG는 클라이언트 생성.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const orderId = String(body.orderId ?? "");
  const unlockToken = String(body.unlockToken ?? "");
  const printSizeId = String(body.printSizeId ?? "");
  const mode = String(body.mode ?? "single") as "free" | "single" | "pack";

  if (!orderId || !unlockToken) {
    return NextResponse.json({ error: "주문 정보가 필요합니다." }, { status: 400 });
  }
  if (mode !== "pack" && !printSizeId) {
    return NextResponse.json({ error: "레이아웃 사이즈를 지정해 주세요." }, { status: 400 });
  }
  if (printSizeId && !PRINT_SIZES.some((s) => s.id === printSizeId)) {
    return NextResponse.json({ error: "알 수 없는 레이아웃 사이즈입니다." }, { status: 400 });
  }

  const order = resolveOrder(orderId, unlockToken);
  if (!order || !order.paid) {
    return NextResponse.json({ error: "결제 확인 후 이용할 수 있습니다." }, { status: 403 });
  }
  if (!order.downloadedAt) {
    return NextResponse.json(
      {
        error: "먼저 사진을 받아 주세요. 그다음 인화용 레이아웃을 받을 수 있어요.",
        code: "PRIMARY_FIRST",
      },
      { status: 400 }
    );
  }

  if (mode === "pack") {
    if (order.layoutPackPaid) {
      return NextResponse.json({
        ok: true,
        alreadyPaid: true,
        mode: "pack",
        unlockToken: order.unlockToken,
        amountKrw: 0,
        layoutPackPaid: true,
        layoutFreeUsed: order.layoutFreeUsed,
        layoutPaidSizeIds: order.layoutPaidSizeIds,
      });
    }
    const updated = markLayoutPackPaid(orderId, unlockToken);
    if (!updated) {
      return NextResponse.json({ error: "패키지 결제에 실패했습니다." }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      mode: "pack",
      unlockToken: updated.unlockToken,
      amountKrw: PRICE.layoutPackKrw,
      layoutPackPaid: true,
      layoutFreeUsed: updated.layoutFreeUsed,
      layoutPaidSizeIds: updated.layoutPaidSizeIds,
      notice: `레이아웃 전체 패키지 ₩${PRICE.layoutPackKrw.toLocaleString("ko-KR")} (샌드박스)`,
    });
  }

  if (canAccessLayoutSize(order, printSizeId)) {
    return NextResponse.json({
      ok: true,
      alreadyPaid: true,
      mode,
      printSizeId,
      unlockToken: order.unlockToken,
      amountKrw: 0,
      layoutPackPaid: order.layoutPackPaid,
      layoutFreeUsed: order.layoutFreeUsed,
      layoutPaidSizeIds: order.layoutPaidSizeIds,
    });
  }

  if (mode === "free") {
    if (order.layoutFreeUsed) {
      return NextResponse.json(
        {
          error: "무료 레이아웃은 이미 사용했어요. 추가 사이즈는 개별 또는 패키지로 받아 주세요.",
          code: "FREE_USED",
        },
        { status: 402 }
      );
    }
    const updated = claimFreeLayout(orderId, unlockToken, printSizeId);
    if (!updated) {
      return NextResponse.json({ error: "무료 레이아웃 처리에 실패했습니다." }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      mode: "free",
      printSizeId,
      unlockToken: updated.unlockToken,
      amountKrw: 0,
      layoutPackPaid: updated.layoutPackPaid,
      layoutFreeUsed: updated.layoutFreeUsed,
      layoutPaidSizeIds: updated.layoutPaidSizeIds,
      notice: "첫 레이아웃 무료로 드렸어요.",
    });
  }

  // single
  const updated = markLayoutSinglePaid(orderId, unlockToken, printSizeId);
  if (!updated) {
    return NextResponse.json({ error: "레이아웃 결제에 실패했습니다." }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    mode: "single",
    printSizeId,
    unlockToken: updated.unlockToken,
    amountKrw: PRICE.extraLayoutKrw,
    layoutPackPaid: updated.layoutPackPaid,
    layoutFreeUsed: updated.layoutFreeUsed,
    layoutPaidSizeIds: updated.layoutPaidSizeIds,
    notice: `레이아웃 ₩${PRICE.extraLayoutKrw.toLocaleString("ko-KR")} (샌드박스)`,
  });
}
