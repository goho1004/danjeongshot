/**
 * 서버리스에서도 클린본을 넘기기 위한 암호화 vault.
 * 클라이언트는 해독 불가 opaque 문자열만 들고, checkout 때 서버로 반환.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

function key(): Buffer {
  const s =
    process.env.PREVIEW_QUOTA_SECRET?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    "danjeongshot-dev-preview-quota";
  return createHash("sha256").update(s).digest();
}

export type VaultPayload = {
  v: 1;
  purposeId: string;
  /** base64 png */
  png: string;
  createdAt: number;
};

export function sealPreviewVault(input: {
  cleanPng: Buffer;
  purposeId: string;
}): string {
  const payload: VaultPayload = {
    v: 1,
    purposeId: input.purposeId,
    png: input.cleanPng.toString("base64"),
    createdAt: Date.now(),
  };
  const plain = Buffer.from(JSON.stringify(payload), "utf8");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function unsealPreviewVault(vault: string): {
  cleanPng: Buffer;
  purposeId: string;
  createdAt: number;
} | null {
  try {
    if (!vault || vault.length < 32 || vault.length > 12_000_000) return null;
    const buf = Buffer.from(vault, "base64url");
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    const data = JSON.parse(plain.toString("utf8")) as VaultPayload;
    if (data.v !== 1 || !data.png || !data.purposeId) return null;
    // 6시간
    if (Date.now() - (data.createdAt || 0) > 1000 * 60 * 60 * 6) return null;
    return {
      cleanPng: Buffer.from(data.png, "base64"),
      purposeId: data.purposeId,
      createdAt: data.createdAt,
    };
  } catch {
    return null;
  }
}
