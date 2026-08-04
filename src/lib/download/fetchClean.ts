import { b64ToBytes, bytesToBlob } from "@/lib/download/bytes";

export type DownloadMode = "primary" | "again" | "extra";

export type FetchCleanInput = {
  orderId: string;
  unlockToken: string;
  vault: string;
  previewAssetId?: string | null;
  shotId: string;
  mode: DownloadMode;
  easter?: boolean;
  easterVariant?: "glyph" | "animal";
  /** 워터마크 제거(클린) — 향후 업셀 */
  easterStrip?: boolean;
};

export type FetchCleanResult =
  | {
      ok: true;
      blob: Blob;
      unlockToken?: string;
      transport: "json" | "multipart";
    }
  | {
      ok: false;
      status: number;
      error: string;
      code?: string;
      transport: "json" | "multipart";
    };

function shouldUseMultipart(vaultStr: string): boolean {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  return isIOS || vaultStr.length > 400_000;
}

export async function fetchCleanPng(input: FetchCleanInput): Promise<FetchCleanResult> {
  const vaultStr = input.vault || "";
  const useMultipart = shouldUseMultipart(vaultStr);

  const meta = {
    orderId: input.orderId,
    unlockToken: input.unlockToken,
    shotId: input.shotId,
    mode: input.mode,
    format: "binary",
    ...(input.easter
      ? {
          easter: true,
          easterVariant: input.easterVariant || "glyph",
          easterStrip: input.easterStrip === true,
        }
      : {}),
  };

  let res: Response;
  if (useMultipart) {
    const fd = new FormData();
    fd.append("meta", JSON.stringify(meta));
    if (vaultStr) {
      fd.append(
        "vault",
        new Blob([vaultStr], { type: "application/octet-stream" }),
        "vault.bin"
      );
    }
    res = await fetch("/api/download", {
      method: "POST",
      headers: { Accept: "image/png" },
      body: fd,
    });
  } else {
    res = await fetch("/api/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify({ ...meta, previewVault: vaultStr || undefined }),
    });
  }

  const transport = useMultipart ? "multipart" : "json";
  const ctype = res.headers.get("content-type") || "";

  if (!res.ok) {
    let errMsg = `받기 실패 (${res.status})`;
    let code: string | undefined;
    try {
      const data = await res.json();
      errMsg = data.error || errMsg;
      code = data.code;
    } catch {
      /* ignore */
    }
    if (code === "UNLOCK_FAIL") {
      errMsg =
        "결제 확인이 필요합니다. 같은 기기·브라우저에서 다시 결제해 주세요.";
    }
    return { ok: false, status: res.status, error: errMsg, code, transport };
  }

  const nextToken = res.headers.get("X-Djs-Unlock-Token") || undefined;

  if (ctype.includes("image/png") || ctype.includes("octet-stream")) {
    const blob = await res.blob();
    return { ok: true, blob, unlockToken: nextToken, transport };
  }

  const data = await res.json();
  const b64 = data.cleanBase64 as string | undefined;
  if (!b64) {
    return {
      ok: false,
      status: 500,
      error: "클린 이미지를 받지 못했습니다.",
      transport,
    };
  }
  return {
    ok: true,
    blob: bytesToBlob(b64ToBytes(b64)),
    unlockToken: (data.unlockToken as string) || nextToken,
    transport,
  };
}
