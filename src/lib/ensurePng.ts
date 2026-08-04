/** Gemini 등이 JPEG를 줘도 vault·다운로드는 PNG로 통일 */
import sharp from "sharp";

export async function ensurePngBuffer(buf: Buffer): Promise<Buffer> {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return buf;
  }
  return sharp(buf, { failOn: "none" }).png().toBuffer();
}
