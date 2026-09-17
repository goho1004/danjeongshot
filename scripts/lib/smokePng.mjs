import { randomBytes } from "crypto";
import sharp from "sharp";

function randInt(max) {
  return Math.floor(Math.random() * max);
}

/**
 * maint 자동 스모크 입력 이미지 — 사람 셀프와 육안 구분용.
 * - 작은 PNG에 읽히는 글자 "MAINT" / "SMOKE xxxx" (Studio 원본 칸에서 즉시 구분)
 * - 실행마다 배경색·노이즈·접미가 달라 SAME_IMAGE 회피 유지
 * - 수십KB 이내 (12MB 제한 대비 여유)
 */
export async function uniqueSmokePngDataUrl() {
  const W = 384;
  const H = 288;
  const [r, g, b] = randomBytes(3);
  const suffix = randomBytes(2).toString("hex").toUpperCase();
  const bg = `rgb(${r},${g},${b})`;
  // 글자 대비 확보 — 배경 밝으면 검정, 어두우면 흰색
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const fg = luminance > 0.6 ? "#111111" : "#ffffff";
  const accent = luminance > 0.6 ? "#0f4a3f" : "#ffe45e";

  let noise = "";
  for (let i = 0; i < 42; i++) {
    const nx = randInt(W);
    const ny = randInt(H);
    const nw = 2 + randInt(26);
    const nh = 2 + randInt(14);
    const nr = randInt(256);
    const ng = randInt(256);
    const nb = randInt(256);
    const op = (0.25 + Math.random() * 0.5).toFixed(2);
    noise += `<rect x="${nx}" y="${ny}" width="${nw}" height="${nh}" fill="rgb(${nr},${ng},${nb})" opacity="${op}"/>`;
  }
  // 대각선 스트라이프 1개 — 실행마다 각도·위치 변동
  const stripeY = randInt(H);
  noise += `<rect x="-40" y="${stripeY}" width="${W + 80}" height="14" fill="${accent}" opacity="0.35" transform="rotate(${
    -18 + randInt(36)
  } ${W / 2} ${H / 2})"/>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<rect width="100%" height="100%" fill="${bg}"/>` +
    noise +
    `<rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="none" stroke="${fg}" stroke-width="4"/>` +
    `<text x="50%" y="42%" text-anchor="middle" font-family="sans-serif" font-size="64" font-weight="bold" fill="${fg}">MAINT</text>` +
    `<text x="50%" y="64%" text-anchor="middle" font-family="sans-serif" font-size="40" font-weight="bold" fill="${fg}">SMOKE ${suffix}</text>` +
    `<text x="50%" y="80%" text-anchor="middle" font-family="sans-serif" font-size="20" fill="${fg}">auto-test not a person</text>` +
    `</svg>`;

  try {
    const buf = await sharp(Buffer.from(svg)).png().toBuffer();
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    // SVG 렌더 실패 시 폴백 — 큰 단색 + 노이즈 (텍스트 없이도 사람 아님은 덜 명확)
    const [fr, fg2, fb] = randomBytes(3);
    const buf = await sharp({
      create: {
        width: W,
        height: H,
        channels: 3,
        background: { r: fr, g: fg2, b: fb },
      },
    })
      .png()
      .toBuffer();
    return `data:image/png;base64,${buf.toString("base64")}`;
  }
}

export function uniqueDeviceId(prefix = "smoke") {
  return `${prefix}_${Date.now()}_${randomBytes(4).toString("hex")}`;
}
