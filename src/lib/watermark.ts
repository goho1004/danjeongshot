/**
 * 결제 전 미리보기용 — 옅은 서버 번인 워터마크.
 * 머리카락 근처·목 근처 두 곳, 작게·흐리게 (얼굴 중앙은 비움).
 */

import sharp from "sharp";

export type Watermarked = {
  previewDataUrl: string;
  cleanPng: Buffer;
};

function subtleOverlaySvg(width: number, height: number): Buffer {
  const font = Math.max(12, Math.round(Math.min(width, height) * 0.028));
  const sub = Math.max(9, Math.round(font * 0.55));
  // 머리카락 쪽 (상단 ~18%), 목·어깨 쪽 (~62%)
  const spots = [
    { x: Math.round(width * 0.72), y: Math.round(height * 0.18), rot: -18 },
    { x: Math.round(width * 0.28), y: Math.round(height * 0.62), rot: 14 },
  ];
  const marks = spots
    .map(
      (s) => `
  <g opacity="0.14" fill="#0f4a3f" font-family="system-ui,sans-serif" font-weight="600"
     text-anchor="middle" transform="rotate(${s.rot} ${s.x} ${s.y})">
    <text x="${s.x}" y="${s.y}" font-size="${font}">단정</text>
    <text x="${s.x}" y="${s.y + font * 0.95}" font-size="${sub}">PREVIEW</text>
  </g>`
    )
    .join("");
  const corner = Math.max(9, Math.round(font * 0.5));
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
${marks}
  <text x="${width - 12}" y="${height - 10}" text-anchor="end" fill="#0f4a3f" opacity="0.16"
        font-family="system-ui,sans-serif" font-size="${corner}" font-weight="500">증명사진 · 단정</text>
</svg>`;
  return Buffer.from(svg);
}

export async function burnSubtleWatermark(
  input: Buffer | string,
  mimeHint?: string
): Promise<Watermarked> {
  let buf: Buffer;
  if (typeof input === "string") {
    const raw = input.includes("base64,") ? input.split("base64,")[1] : input;
    buf = Buffer.from(raw, "base64");
  } else {
    buf = input;
  }

  const meta = await sharp(buf, { failOn: "none" }).metadata();
  const width = meta.width || 768;
  const height = meta.height || 1024;

  const cleanPng = await sharp(buf, { failOn: "none" }).png().toBuffer();

  const marked = await sharp(cleanPng)
    .composite([{ input: subtleOverlaySvg(width, height), top: 0, left: 0 }])
    .png()
    .toBuffer();

  void mimeHint;
  return {
    cleanPng,
    previewDataUrl: `data:image/png;base64,${marked.toString("base64")}`,
  };
}
