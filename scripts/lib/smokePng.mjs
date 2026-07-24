import { randomBytes } from "crypto";
import sharp from "sharp";

/** 미리보기 할당량(SAME_IMAGE) 회피용 — 실행마다 다른 2×2 PNG */
export async function uniqueSmokePngDataUrl() {
  const [r, g, b] = randomBytes(3);
  const buf = await sharp({
    create: {
      width: 2,
      height: 2,
      channels: 3,
      background: { r, g, b },
    },
  })
    .png()
    .toBuffer();
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export function uniqueDeviceId(prefix = "smoke") {
  return `${prefix}_${Date.now()}_${randomBytes(4).toString("hex")}`;
}
