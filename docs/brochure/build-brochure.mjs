/**
 * B2B brochure — Neutral Exposure (canvas-design + frontend-design + pptx)
 * Run: node docs/brochure/build-brochure.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pptxgen from "pptxgenjs";
import QRCode from "qrcode";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT = __dirname;
const GALLERY = path.join(ROOT, "public", "gallery");

/** Brand tokens — cool paper studio (not cream/terracotta, not purple) */
const C = {
  paper: "F2F4F7",
  paperDeep: "E4E9EF",
  white: "FFFFFF",
  ink: "0A0E14",
  ink700: "2C3544",
  ink500: "5C6778",
  ink300: "A8B0BD",
  studio: "0D5C4D",
  studioDeep: "084038",
  studioMist: "E8F4F1",
  studioSoft: "C5E6DE",
};

const URL = "https://danjeongshot.vercel.app";
const MAKE = "https://danjeongshot.vercel.app/make";
const EMAIL = "support@danjeongshot.com";
const A4 = { name: "A4", width: 8.27, height: 11.69 };

const img = (n) => path.join(GALLERY, n);
const SLIM = path.join(OUT, "_slim");

function assertImages() {
  for (const n of [
    "real-w-mid-before.png",
    "real-w-mid-after.png",
    "real-m-mid-before.png",
    "real-m-mid-after.png",
  ]) {
    if (!fs.existsSync(img(n))) throw new Error(`missing ${n}`);
  }
}

/** Notion single_part 한도 대비 PPTX 슬림 이미지 */
async function slimGallery() {
  fs.mkdirSync(SLIM, { recursive: true });
  const names = [
    "real-w-mid-before.png",
    "real-w-mid-after.png",
    "real-m-mid-before.png",
    "real-m-mid-after.png",
  ];
  const out = {};
  for (const n of names) {
    const dest = path.join(SLIM, n);
    await sharp(img(n))
      .resize(720, 900, { fit: "cover" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(dest.replace(/\.png$/i, ".jpg"));
    out[n] = dest.replace(/\.png$/i, ".jpg");
  }
  return out;
}

async function makeQr(filePath) {
  await QRCode.toFile(filePath, URL, {
    type: "png",
    width: 640,
    margin: 1,
    color: { dark: "#0A0E14", light: "#FFFFFF" },
  });
}

/** Cover PNG for Notion — visual-first leave-behind */
async function makeCoverPng(outPath) {
  const W = 1240;
  const H = 1754; // A4-ish @150dpi
  const afterW = await sharp(img("real-w-mid-after.png"))
    .resize(520, 650, { fit: "cover" })
    .png()
    .toBuffer();
  const afterM = await sharp(img("real-m-mid-after.png"))
    .resize(520, 650, { fit: "cover" })
    .png()
    .toBuffer();

  const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#F2F4F7"/>
  <rect x="0" y="0" width="18" height="${H}" fill="#0D5C4D"/>
  <text x="72" y="120" font-family="Georgia, serif" font-size="28" fill="#084038" letter-spacing="4">증명사진 -단정-</text>
  <text x="72" y="168" font-family="Arial, sans-serif" font-size="16" fill="#5C6778" letter-spacing="3">BETA  ·  B2B</text>
  <text x="72" y="320" font-family="Georgia, serif" font-size="64" fill="#0A0E14">약 1분.</text>
  <text x="72" y="400" font-family="Georgia, serif" font-size="36" fill="#2C3544">구직자 이력서 사진.</text>
  <text x="72" y="470" font-family="Arial, sans-serif" font-size="20" fill="#5C6778">인력아웃소싱 임원 미팅용</text>
  <rect x="72" y="520" width="120" height="4" fill="#0D5C4D"/>
  <text x="72" y="1620" font-family="Arial, sans-serif" font-size="18" fill="#0D5C4D">danjeongshot.vercel.app</text>
  <text x="72" y="1670" font-family="Arial, sans-serif" font-size="14" fill="#A8B0BD">Neutral Exposure  ·  여권·관공서용 아님</text>
</svg>`);

  await sharp({
    create: { width: W, height: H, channels: 3, background: "#F2F4F7" },
  })
    .composite([
      { input: svg, top: 0, left: 0 },
      { input: afterW, top: 560, left: 100 },
      { input: afterM, top: 560, left: 640 },
    ])
    .png()
    .toFile(outPath);
}

function addFooter(slide, y = 11.2) {
  slide.addText("증명사진 -단정-  ·  danjeongshot.vercel.app", {
    x: 0.5,
    y,
    w: 7.3,
    h: 0.25,
    fontSize: 9,
    color: C.ink300,
    fontFace: "Arial",
    margin: 0,
  });
}

async function buildBrochure(qrPath, photoMap, outName) {
  const pres = new pptxgen();
  pres.defineLayout(A4);
  pres.layout = "A4";
  pres.author = "단정샷";
  pres.title = "증명사진 -단정- B2B 브로슈어";
  pres.subject = "Neutral Exposure";

  // ——— PAGE 1: photo-led ———
  {
    const s = pres.addSlide();
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 0, w: 8.27, h: 11.69,
      fill: { color: C.paper }, line: { color: C.paper },
    });
    // left studio aperture bar
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 0, w: 0.14, h: 11.69,
      fill: { color: C.studio }, line: { color: C.studio },
    });

    s.addText("증명사진 -단정-", {
      x: 0.55, y: 0.4, w: 5.5, h: 0.4,
      fontSize: 14, color: C.studio, fontFace: "Georgia", bold: true, margin: 0,
    });
    s.addText("BETA  ·  인력아웃소싱 임원용", {
      x: 0.55, y: 0.8, w: 5.5, h: 0.28,
      fontSize: 11, color: C.ink500, fontFace: "Arial", charSpacing: 2, margin: 0,
    });

    // Signature: time
    s.addText("약 1분.", {
      x: 0.55, y: 1.35, w: 7.2, h: 0.85,
      fontSize: 54, color: C.ink, fontFace: "Georgia", margin: 0,
    });
    s.addText("구직자·이직자 이력서 사진.", {
      x: 0.55, y: 2.2, w: 7.2, h: 0.45,
      fontSize: 22, color: C.ink700, fontFace: "Georgia", margin: 0,
    });
    s.addText("셀카만 올리면 단정한 PNG 한 장. 현장에서 링크·QR로 바로 안내.", {
      x: 0.55, y: 2.75, w: 7.2, h: 0.4,
      fontSize: 12, color: C.ink500, fontFace: "Arial", margin: 0,
    });

    // Full-width photo strip: 4 frames
    const frames = [
      { p: photoMap["real-w-mid-before.png"], cap: "BEFORE" },
      { p: photoMap["real-w-mid-after.png"], cap: "AFTER" },
      { p: photoMap["real-m-mid-before.png"], cap: "BEFORE" },
      { p: photoMap["real-m-mid-after.png"], cap: "AFTER" },
    ];
    const fw = 1.7;
    const fh = 2.15;
    const y0 = 3.4;
    frames.forEach((f, i) => {
      const x = 0.55 + i * (fw + 0.12);
      s.addImage({ path: f.p, x, y: y0, w: fw, h: fh });
      s.addText(f.cap, {
        x, y: y0 + fh + 0.06, w: fw, h: 0.22,
        fontSize: 9,
        color: f.cap === "AFTER" ? C.studio : C.ink300,
        fontFace: "Arial",
        bold: f.cap === "AFTER",
        align: "center",
        margin: 0,
      });
    });

    // Three quiet claims — not cards with shadows; hairline rule rows
    const claims = [
      { k: "속도", v: "약 1분. 스튜디오 예약·이동 없이." },
      { k: "단정", v: "이력서·링크드인용. 나처럼 보이는 한 장." },
      { k: "배포", v: "링크·QR만. 지점·상담원이 하향 안내." },
    ];
    claims.forEach((c, i) => {
      const y = 6.05 + i * 0.7;
      s.addShape(pres.shapes.RECTANGLE, {
        x: 0.55, y, w: 7.2, h: 0.02,
        fill: { color: C.paperDeep }, line: { color: C.paperDeep },
      });
      s.addText(c.k, {
        x: 0.55, y: y + 0.15, w: 1.2, h: 0.4,
        fontSize: 14, color: C.studioDeep, fontFace: "Georgia", bold: true, margin: 0,
      });
      s.addText(c.v, {
        x: 1.9, y: y + 0.18, w: 5.7, h: 0.35,
        fontSize: 13, color: C.ink700, fontFace: "Arial", margin: 0,
      });
    });

    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.55, y: 8.2, w: 7.2, h: 0.02,
      fill: { color: C.paperDeep }, line: { color: C.paperDeep },
    });

    // Quiet thesis band
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.55, y: 8.5, w: 7.2, h: 2.0,
      fill: { color: C.studioDeep }, line: { color: C.studioDeep },
    });
    s.addText("한 장.", {
      x: 0.85, y: 8.75, w: 6.6, h: 0.45,
      fontSize: 28, color: C.white, fontFace: "Georgia", margin: 0,
    });
    s.addText(
      "후보를 잔뜩 고르는 서비스가 아닙니다.\n결제 후, 닮은 단정 증명사진 한 장을 받습니다.",
      {
        x: 0.85, y: 9.35, w: 6.6, h: 0.8,
        fontSize: 14, color: C.studioSoft, fontFace: "Arial", margin: 0,
      }
    );

    addFooter(s);
  }

  // ——— PAGE 2: process + price + CTA ———
  {
    const s = pres.addSlide();
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 0, w: 8.27, h: 11.69,
      fill: { color: C.paper }, line: { color: C.paper },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 0, w: 0.14, h: 11.69,
      fill: { color: C.studio }, line: { color: C.studio },
    });

    s.addText("이용", {
      x: 0.55, y: 0.4, w: 7.2, h: 0.5,
      fontSize: 28, color: C.ink, fontFace: "Georgia", margin: 0,
    });

    const steps = [
      "용도 고르고 셀카 업로드",
      "기본·플러스 결제",
      "워터마크 없는 PNG 수령",
    ];
    steps.forEach((t, i) => {
      const y = 1.15 + i * 0.75;
      s.addText(String(i + 1).padStart(2, "0"), {
        x: 0.55, y, w: 0.7, h: 0.45,
        fontSize: 20, color: C.studio, fontFace: "Georgia", bold: true, margin: 0,
      });
      s.addText(t, {
        x: 1.4, y: y + 0.05, w: 6.2, h: 0.4,
        fontSize: 16, color: C.ink, fontFace: "Arial", margin: 0,
      });
      if (i < steps.length - 1) {
        s.addShape(pres.shapes.RECTANGLE, {
          x: 0.55, y: y + 0.55, w: 7.2, h: 0.015,
          fill: { color: C.paperDeep }, line: { color: C.paperDeep },
        });
      }
    });

    s.addText("소비자가", {
      x: 0.55, y: 3.6, w: 7.2, h: 0.35,
      fontSize: 14, color: C.ink500, fontFace: "Arial", bold: true, margin: 0,
    });

    // Two price columns without card chrome
    const packs = [
      { name: "기본", price: "₩9,900", line: "이력서·링크드인 PNG 1장" },
      { name: "플러스", price: "₩14,900", line: "PNG + 반명함·증명 인화" },
    ];
    packs.forEach((pk, i) => {
      const x = 0.55 + i * 3.7;
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 4.05, w: 3.45, h: 1.55,
        fill: { color: C.white }, line: { color: C.paperDeep, pt: 1 },
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 4.05, w: 3.45, h: 0.08,
        fill: { color: i === 1 ? C.studio : C.ink300 },
        line: { color: i === 1 ? C.studio : C.ink300 },
      });
      s.addText(pk.name, {
        x: x + 0.25, y: 4.3, w: 3, h: 0.28,
        fontSize: 12, color: C.studio, fontFace: "Arial", bold: true, margin: 0,
      });
      s.addText(pk.price, {
        x: x + 0.25, y: 4.65, w: 3, h: 0.4,
        fontSize: 24, color: C.ink, fontFace: "Georgia", margin: 0,
      });
      s.addText(pk.line, {
        x: x + 0.25, y: 5.15, w: 3, h: 0.28,
        fontSize: 11, color: C.ink500, fontFace: "Arial", margin: 0,
      });
    });

    s.addText("B2B 법인·채널 단가는 협의.", {
      x: 0.55, y: 5.85, w: 7.2, h: 0.3,
      fontSize: 13, color: C.studioDeep, fontFace: "Arial", bold: true, margin: 0,
    });

    s.addText("고지", {
      x: 0.55, y: 6.35, w: 7.2, h: 0.3,
      fontSize: 12, color: C.ink500, fontFace: "Arial", bold: true, margin: 0,
    });
    s.addText(
      [
        { text: "여권·신분증·관공서 제출용은 만들거나 보장하지 않습니다.", options: { breakLine: true } },
        { text: "올린 사진·결과물은 저장하지 않습니다.", options: { breakLine: true } },
        { text: "베타 · 사업자 등록 전일 수 있습니다.", options: { breakLine: false } },
      ],
      {
        x: 0.55, y: 6.7, w: 7.2, h: 0.9,
        fontSize: 12, color: C.ink700, fontFace: "Arial", paraSpaceAfter: 4, margin: 0,
      }
    );

    // CTA block
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.55, y: 7.9, w: 7.2, h: 2.55,
      fill: { color: C.ink }, line: { color: C.ink },
    });
    s.addText("웹에서 바로", {
      x: 0.85, y: 8.15, w: 4.5, h: 0.28,
      fontSize: 11, color: C.studioSoft, fontFace: "Arial", bold: true, margin: 0,
    });
    s.addText("danjeongshot.vercel.app", {
      x: 0.85, y: 8.55, w: 4.7, h: 0.4,
      fontSize: 18, color: C.white, fontFace: "Georgia", margin: 0,
    });
    s.addText("만들기  " + MAKE.replace("https://", ""), {
      x: 0.85, y: 9.1, w: 4.7, h: 0.28,
      fontSize: 11, color: C.ink300, fontFace: "Arial", margin: 0,
    });
    s.addText("문의  " + EMAIL, {
      x: 0.85, y: 9.55, w: 4.7, h: 0.28,
      fontSize: 12, color: C.white, fontFace: "Arial", margin: 0,
    });
    s.addImage({ path: qrPath, x: 6.0, y: 8.25, w: 1.45, h: 1.45 });
    s.addText("SCAN", {
      x: 6.0, y: 9.8, w: 1.45, h: 0.25,
      fontSize: 10, color: C.ink300, fontFace: "Arial", align: "center", margin: 0,
    });

    addFooter(s);
  }

  const out = path.join(OUT, outName);
  await pres.writeFile({ fileName: out });
  return out;
}

async function buildPartnerSheet() {
  const pres = new pptxgen();
  pres.defineLayout(A4);
  pres.layout = "A4";
  pres.author = "단정샷";
  pres.title = "파트너 정산 초안";

  const s = pres.addSlide();
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 8.27, h: 11.69,
    fill: { color: C.paper }, line: { color: C.paper },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.14, h: 11.69,
    fill: { color: C.studioDeep }, line: { color: C.studioDeep },
  });

  s.addText("INTERNAL  ·  선택 배포", {
    x: 0.55, y: 0.4, w: 7.2, h: 0.28,
    fontSize: 11, color: C.studioDeep, fontFace: "Arial", bold: true, charSpacing: 2, margin: 0,
  });
  s.addText("파트너 정산 초안", {
    x: 0.55, y: 0.85, w: 7.2, h: 0.55,
    fontSize: 30, color: C.ink, fontFace: "Georgia", margin: 0,
  });
  s.addText("미확정 · 협의  ·  증명사진 -단정-", {
    x: 0.55, y: 1.45, w: 7.2, h: 0.3,
    fontSize: 13, color: C.ink500, fontFace: "Arial", margin: 0,
  });

  s.addText("임원 미팅  →  하향 안내  →  추적 코드 집계  →  월 정산", {
    x: 0.55, y: 2.05, w: 7.2, h: 0.45,
    fontSize: 13, color: C.ink700, fontFace: "Arial", margin: 0,
  });

  s.addTable(
    [
      [
        { text: "유형", options: { fill: { color: C.studioDeep }, color: C.white, bold: true } },
        { text: "율", options: { fill: { color: C.studioDeep }, color: C.white, bold: true } },
        { text: "비고", options: { fill: { color: C.studioDeep }, color: C.white, bold: true } },
      ],
      ["사장·임원급 인센", "10~20%", "개인 라인 귀속"],
      ["법인 B2B 채널 마진", "40~50%", "업체 정산"],
      ["동시 풀스택", "불가", "택1 또는 쪼개기"],
    ],
    {
      x: 0.55, y: 2.7, w: 7.2,
      colW: [2.8, 1.4, 3.0],
      border: [
        { pt: 0.5, color: C.paperDeep },
        { pt: 0.5, color: C.paperDeep },
        { pt: 0.5, color: C.paperDeep },
        { pt: 0.5, color: C.paperDeep },
      ],
      fontFace: "Arial",
      fontSize: 12,
      color: C.ink,
      align: "left",
      valign: "middle",
    }
  );

  const notes = [
    ["추적", "업체·지점·담당자별 링크/코드로 결제·컷 수 집계"],
    ["정산", "합의 주기(월 등) · 세금계산서·원천은 사업자 등록 후"],
    ["할인", "학내·쇼츠 할인과 스택하지 않음"],
  ];
  notes.forEach((n, i) => {
    const y = 5.0 + i * 0.95;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.55, y, w: 7.2, h: 0.02,
      fill: { color: C.paperDeep }, line: { color: C.paperDeep },
    });
    s.addText(n[0], {
      x: 0.55, y: y + 0.2, w: 1.3, h: 0.45,
      fontSize: 13, color: C.studio, fontFace: "Georgia", bold: true, margin: 0,
    });
    s.addText(n[1], {
      x: 2.0, y: y + 0.22, w: 5.6, h: 0.45,
      fontSize: 13, color: C.ink700, fontFace: "Arial", margin: 0,
    });
  });

  s.addText("일반 브로슈어와 분리 배포. 확정 전 협의용.", {
    x: 0.55, y: 8.2, w: 7.2, h: 0.35,
    fontSize: 12, color: C.ink500, fontFace: "Arial", margin: 0,
  });
  s.addText(EMAIL + "  ·  " + URL.replace("https://", ""), {
    x: 0.55, y: 8.7, w: 7.2, h: 0.3,
    fontSize: 13, color: C.ink, fontFace: "Arial", margin: 0,
  });

  addFooter(s);

  const out = path.join(OUT, "danjeongshot-b2b-partner-sheet.pptx");
  await pres.writeFile({ fileName: out });
  return out;
}

assertImages();
const qrPath = path.join(OUT, "qr-danjeongshot.png");
const coverPath = path.join(OUT, "cover-neutral-exposure.png");
await makeQr(qrPath);
await makeCoverPng(coverPath);
const fullMap = {
  "real-w-mid-before.png": img("real-w-mid-before.png"),
  "real-w-mid-after.png": img("real-w-mid-after.png"),
  "real-m-mid-before.png": img("real-m-mid-before.png"),
  "real-m-mid-after.png": img("real-m-mid-after.png"),
};
const slim = await slimGallery();
// 로컬 정본 = 풀해상도 · Notion 업로드용 = 슬림
const brochureFull = await buildBrochure(
  qrPath,
  fullMap,
  "danjeongshot-b2b-brochure.pptx"
);
const brochureNotion = await buildBrochure(
  qrPath,
  slim,
  "danjeongshot-b2b-brochure-notion.pptx"
);
const partner = await buildPartnerSheet();
console.log(
  "wrote LOCAL full",
  brochureFull,
  `bytes=${fs.statSync(brochureFull).size}`
);
console.log(
  "wrote Notion slim",
  brochureNotion,
  `bytes=${fs.statSync(brochureNotion).size}`
);
console.log("wrote", partner);
console.log("cover", coverPath);
console.log("qr", qrPath);
