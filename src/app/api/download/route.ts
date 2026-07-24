import { NextRequest, NextResponse } from "next/server";
import {
  markDownloaded,
  resolveOrder,
  verifyUnlock,
  canDownloadExtraShot,
} from "@/lib/orders";
import { getCleanForDownload, storePreviewAsset, bindPreviewToOrder } from "@/lib/previewAssets";
import { sealPreviewVault, unsealPreviewVault } from "@/lib/previewVault";

type DlBody = {
  orderId?: string;
  unlockToken?: string;
  previewVault?: string;
  shotId?: string;
  mode?: string;
  format?: string;
};

/** Safari 등 대용량 JSON POST 한도 회피 — multipart vault 지원 */
async function parseDownloadBody(req: NextRequest): Promise<{
  body: DlBody;
  previewVault: string;
  transport: "json" | "multipart";
}> {
  const ctype = req.headers.get("content-type") || "";
  if (ctype.includes("multipart/form-data")) {
    const form = await req.formData();
    let meta: DlBody = {};
    const metaRaw = form.get("meta");
    if (typeof metaRaw === "string") {
      try {
        meta = JSON.parse(metaRaw) as DlBody;
      } catch {
        meta = {};
      }
    }
    let previewVault = typeof meta.previewVault === "string" ? meta.previewVault : "";
    const vaultPart = form.get("vault");
    if (typeof vaultPart === "string" && vaultPart.length > previewVault.length) {
      previewVault = vaultPart;
    } else if (vaultPart && typeof vaultPart === "object" && "text" in vaultPart) {
      const t = await (vaultPart as Blob).text();
      if (t) previewVault = t;
    }
    return { body: meta, previewVault, transport: "multipart" };
  }
  const body = (await req.json()) as DlBody;
  return {
    body,
    previewVault: String(body.previewVault ?? ""),
    transport: "json",
  };
}

/**
 * 결제 확인 후 클린 PNG.
 * format=binary → image/png 직접 (JSON base64 팽창·용량 한도 회피)
 */
export async function POST(req: NextRequest) {
  let parsed: Awaited<ReturnType<typeof parseDownloadBody>>;
  try {
    parsed = await parseDownloadBody(req);
  } catch {
    return NextResponse.json(
      { error: "요청을 읽지 못했습니다. 다시 시도해 주세요.", code: "BAD_BODY" },
      { status: 400 }
    );
  }

  const { body, previewVault, transport } = parsed;
  const orderId = String(body.orderId ?? "");
  const unlockToken = String(body.unlockToken ?? "");
  const shotId = String(body.shotId ?? "");
  const mode = String(body.mode ?? "primary"); // primary | extra | again
  const wantBinary =
    body.format === "binary" ||
    (req.headers.get("accept") || "").includes("image/png");

  if (!verifyUnlock(orderId, unlockToken)) {
    return NextResponse.json(
      {
        error: "결제 확인이 필요합니다. 같은 기기·브라우저에서 다시 결제해 주세요.",
        code: "UNLOCK_FAIL",
      },
      { status: 403 }
    );
  }

  const order = resolveOrder(orderId, unlockToken);
  if (!order?.previewAssetId && !previewVault) {
    return NextResponse.json(
      { error: "다운로드할 이미지가 없습니다. 다시 만들기 후 시도해 주세요.", code: "NO_IMAGE" },
      { status: 404 }
    );
  }

  if (mode === "extra") {
    if (!shotId) {
      return NextResponse.json({ error: "추가 컷을 지정해 주세요." }, { status: 400 });
    }
    if (!canDownloadExtraShot(orderId, unlockToken, shotId)) {
      return NextResponse.json(
        {
          error: "추가 컷은 결제 후 받을 수 있어요.",
          code: "EXTRA_NOT_PAID",
        },
        { status: 402 }
      );
    }
  }

  let clean: Buffer | null = null;
  if (previewVault) {
    const opened = unsealPreviewVault(previewVault);
    if (opened) {
      const assetId = order?.previewAssetId || `prv_${shotId || "dl"}`;
      const asset = storePreviewAsset({
        cleanPng: opened.cleanPng,
        purposeId: order?.purposeId || opened.purposeId,
        id: assetId,
      });
      if (order) bindPreviewToOrder(asset.id, orderId);
      clean = asset.cleanPng;
    }
  }
  if (!clean && order?.previewAssetId) {
    clean = getCleanForDownload(order.previewAssetId, orderId);
  }
  if (!clean) {
    return NextResponse.json(
      {
        error: "세션이 만료되었습니다. 다시 만들기 후 받아 주세요.",
        code: "PREVIEW_EXPIRED",
      },
      { status: 410 }
    );
  }

  let marked = order;
  if (mode === "primary" || mode === "again") {
    const m = markDownloaded(orderId, unlockToken);
    if (!m) {
      return NextResponse.json({ error: "주문 확인 실패" }, { status: 403 });
    }
    marked = m;
  } else {
    marked = resolveOrder(orderId, unlockToken) || order!;
  }

  if (wantBinary) {
    return new NextResponse(new Uint8Array(clean), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="danjeongshot.png"`,
        "Cache-Control": "no-store",
        "X-Djs-Unlock-Token": marked.unlockToken,
        "X-Djs-Downloaded-At": String(marked.downloadedAt ?? ""),
        "X-Djs-Preview-Asset": marked.previewAssetId || "",
        "X-Djs-Transport": transport,
        "X-Djs-Notice": mode === "extra" ? "extra" : "clean",
      },
    });
  }

  const nextVault = previewVault
    ? null
    : sealPreviewVault({
        cleanPng: clean,
        purposeId: marked.purposeId,
      });

  return NextResponse.json({
    ok: true,
    unlocked: true,
    downloadedAt: marked.downloadedAt,
    unlockToken: marked.unlockToken,
    previewVault: nextVault,
    previewAssetId: marked.previewAssetId,
    mimeType: "image/png",
    cleanBase64: clean.toString("base64"),
    notice:
      mode === "extra"
        ? "추가 컷을 드렸습니다."
        : "클린 이미지를 드렸습니다. 미리보기 워터마크는 다운로드본에 없습니다.",
  });
}
