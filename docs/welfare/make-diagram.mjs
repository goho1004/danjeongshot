import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "diagram-logic-flow.png");
const steps = ["자격", "동의", "접수", "제작", "검수", "인화·액자", "전달", "실적"];
const w = 1400;
const h = 320;
let boxes = "";
steps.forEach((t, i) => {
  const x = 40 + i * 168;
  const fill = i === 5 ? "#0D5C4D" : i === 3 ? "#084038" : "#FFFFFF";
  const tc = i === 5 || i === 3 ? "#FFFFFF" : "#0A0E14";
  boxes += `<rect x="${x}" y="100" width="148" height="88" rx="8" fill="${fill}" stroke="#C5E6DE" stroke-width="2"/>`;
  boxes += `<text x="${x + 74}" y="152" text-anchor="middle" font-family="Malgun Gothic, Arial" font-size="18" font-weight="700" fill="${tc}">${t}</text>`;
  if (i < 7) {
    boxes += `<path d="M${x + 152} 144 L${x + 164} 144" stroke="#5C6778" stroke-width="2"/>`;
    boxes += `<path d="M${x + 158} 138 L${x + 168} 144 L${x + 158} 150" fill="#5C6778"/>`;
  }
});
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#F2F4F7"/>
  <text x="40" y="48" font-family="Malgun Gothic, Arial" font-size="20" fill="#084038" font-weight="700">영정 일괄지원 · 공통 흐름</text>
  <text x="40" y="78" font-family="Malgun Gothic, Arial" font-size="13" fill="#5C6778">모든 접수 채널(A~C)이 같은 척추를 탄다</text>
  ${boxes}
  <text x="40" y="250" font-family="Malgun Gothic, Arial" font-size="12" fill="#5C6778">단정샷 초안계획서 부도 · 협의용</text>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile(out);
console.log("wrote", out);
