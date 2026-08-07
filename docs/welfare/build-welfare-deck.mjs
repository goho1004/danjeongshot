/**
 * 영정사진 복지 일괄 · 민·관 공용 제안 덱
 * pptx + brochure tokens + FLOW/PROPOSAL
 * Run: node docs/welfare/build-welfare-deck.mjs
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

/** Quiet memorial studio — brand studio green, not cream/purple */
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
  accent: "8B6914",
  warn: "6B3A3A",
};

const URL = "https://danjeongshot.vercel.app";
const EMAIL = "support@danjeongshot.com";

function addBg(s, color) {
  s.addShape("rect", { x: 0, y: 0, w: 10, h: 5.625, fill: { color } });
}

function footer(s, page, total) {
  s.addText("단정샷 · 영정복지 제안 · 협의용", {
    x: 0.4,
    y: 5.28,
    w: 7,
    h: 0.25,
    fontSize: 10,
    fontFace: "Arial",
    color: C.ink300,
    margin: 0,
  });
  s.addText(`${page} / ${total}`, {
    x: 8.6,
    y: 5.28,
    w: 1,
    h: 0.25,
    fontSize: 10,
    fontFace: "Arial",
    color: C.ink300,
    align: "right",
    margin: 0,
  });
}

function eyebrow(s, text, x = 0.45, y = 0.28) {
  s.addText(text, {
    x,
    y,
    w: 9,
    h: 0.28,
    fontSize: 11,
    fontFace: "Arial",
    color: C.studio,
    bold: true,
    charSpacing: 2,
    margin: 0,
  });
}

async function assets() {
  fs.mkdirSync(OUT, { recursive: true });
  const qrPath = path.join(OUT, "qr-welfare.png");
  await QRCode.toFile(qrPath, URL, {
    type: "png",
    width: 480,
    margin: 1,
    color: { dark: "#0A0E14", light: "#FFFFFF" },
  });

  const elderSvg = path.join(GALLERY, "li-m-elder-after.svg");
  const elderPng = path.join(OUT, "visual-elder.png");
  if (fs.existsSync(elderSvg)) {
    await sharp(elderSvg).resize(720, 900, { fit: "contain", background: "#E8F4F1" }).png().toFile(elderPng);
  }

  // Flow diagram as PNG (공통 척추)
  const flowSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="1600" height="280" xmlns="http://www.w3.org/2000/svg">
  <rect width="1600" height="280" fill="#F2F4F7"/>
  ${["자격", "동의", "접수", "제작", "검수", "인화·액자", "전달", "실적"]
    .map((t, i) => {
      const x = 30 + i * 195;
      const fill = i === 5 ? "#0D5C4D" : i === 3 ? "#084038" : "#FFFFFF";
      const tc = i === 5 || i === 3 ? "#FFFFFF" : "#0A0E14";
      const arrow =
        i < 7
          ? `<path d="M${x + 155} 140 L${x + 185} 140" stroke="#A8B0BD" stroke-width="3" fill="none"/>
             <path d="M${x + 178} 132 L${x + 190} 140 L${x + 178} 148" fill="#A8B0BD"/>`
          : "";
      return `<rect x="${x}" y="90" width="145" height="100" rx="10" fill="${fill}" stroke="#C5E6DE" stroke-width="2"/>
        <text x="${x + 72}" y="148" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="${tc}">${t}</text>
        ${arrow}`;
    })
    .join("")}
</svg>`);
  const flowPng = path.join(OUT, "flow-spine.png");
  await sharp(flowSvg).png().toFile(flowPng);

  return { qrPath, elderPng: fs.existsSync(elderPng) ? elderPng : null, flowPng };
}

async function build() {
  const { qrPath, elderPng, flowPng } = await assets();
  const TOTAL = 11;
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "danjeongshot";
  pres.title = "영정사진 복지 일괄 지원 — 민·관 제안";
  pres.subject = "시·도 복지과 · 협력업체 · CSR";

  // —— 1 Cover ——
  {
    const s = pres.addSlide();
    addBg(s, C.studioDeep);
    s.addShape("rect", { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color: C.studioSoft } });
    s.addText("민 · 관 공용 제안서", {
      x: 0.55,
      y: 1.1,
      w: 6,
      h: 0.35,
      fontSize: 14,
      fontFace: "Arial",
      color: C.studioSoft,
      charSpacing: 3,
      margin: 0,
    });
    s.addText("영정사진 복지\n일괄 지원 사업", {
      x: 0.55,
      y: 1.55,
      w: 6.5,
      h: 1.6,
      fontSize: 40,
      fontFace: "Georgia",
      color: C.white,
      margin: 0,
      bold: true,
    });
    s.addText("생성 → 인화 → 액자까지. 시·도·복지기금·협력 CSR.", {
      x: 0.55,
      y: 3.35,
      w: 6.5,
      h: 0.4,
      fontSize: 16,
      fontFace: "Arial",
      color: C.studioMist,
      margin: 0,
    });
    s.addText("단정샷 (danjeongshot)  ·  2026-08-07  ·  협의용 · 확정 전", {
      x: 0.55,
      y: 4.85,
      w: 7,
      h: 0.3,
      fontSize: 12,
      fontFace: "Arial",
      color: C.ink300,
      margin: 0,
    });
    if (elderPng) {
      s.addImage({ path: elderPng, x: 7.15, y: 0.85, w: 2.4, h: 3.0 });
    }
  }

  // —— 2 Why / public stats ——
  {
    const s = pres.addSlide();
    addBg(s, C.paper);
    eyebrow(s, "WHY  ·  객관 지표 (국가통계)");
    s.addText("고령·사망 규모가 복지 수요의 바닥입니다", {
      x: 0.45,
      y: 0.55,
      w: 9,
      h: 0.45,
      fontSize: 24,
      fontFace: "Georgia",
      color: C.ink,
      margin: 0,
    });

    const stats = [
      { n: "35.9만", l: "2024 사망자 수", s: "통계청 사망원인통계" },
      { n: "980명", l: "1일 평균 사망", s: "동일 · 연환산" },
      { n: "19.5%", l: "65세+ 인구 비중", s: "2024 인구주택총조사" },
      { n: "54.1%", l: "80세+ 사망 비중", s: "2024 사망원인통계" },
    ];
    stats.forEach((st, i) => {
      const x = 0.45 + (i % 4) * 2.35;
      s.addShape("roundRect", {
        x,
        y: 1.25,
        w: 2.2,
        h: 2.35,
        fill: { color: C.white },
        shadow: { type: "outer", color: "000000", blur: 8, offset: 2, opacity: 0.08 },
        rectRadius: 0.08,
      });
      s.addText(st.n, {
        x,
        y: 1.55,
        w: 2.2,
        h: 0.7,
        fontSize: 28,
        fontFace: "Georgia",
        color: C.studioDeep,
        align: "center",
        bold: true,
        margin: 0,
      });
      s.addText(st.l, {
        x: x + 0.1,
        y: 2.35,
        w: 2.0,
        h: 0.55,
        fontSize: 13,
        fontFace: "Arial",
        color: C.ink700,
        align: "center",
        margin: 0,
      });
      s.addText(st.s, {
        x: x + 0.1,
        y: 3.05,
        w: 2.0,
        h: 0.35,
        fontSize: 10,
        fontFace: "Arial",
        color: C.ink500,
        align: "center",
        margin: 0,
      });
    });
    s.addText(
      "출처: 통계청·정책브리핑. 영정 수요 ≠ 전체 사망. 복지 대상 비율·예산은 지자체 협의. 여권·관공서 공인 주장 ✗.",
      {
        x: 0.45,
        y: 3.85,
        w: 9.1,
        h: 0.55,
        fontSize: 12,
        fontFace: "Arial",
        color: C.ink500,
        margin: 0,
      }
    );
    s.addShape("roundRect", {
      x: 0.45,
      y: 4.4,
      w: 9.1,
      h: 0.7,
      fill: { color: C.studioMist },
      rectRadius: 0.06,
    });
    s.addText(
      "현장 문제: 촬영·인화·액자 비용 · 이동·예약 부담 · 급히 구한 저품질 · 산발 지원·정산 난이도",
      {
        x: 0.6,
        y: 4.55,
        w: 8.8,
        h: 0.4,
        fontSize: 13,
        fontFace: "Arial",
        color: C.studioDeep,
        margin: 0,
      }
    );
    footer(s, 2, TOTAL);
  }

  // —— 3 Solution package ——
  {
    const s = pres.addSlide();
    addBg(s, C.paper);
    eyebrow(s, "SOLUTION  ·  일괄 패키지");
    s.addText("디지털만 주지 않습니다. 프린트와 액자까지.", {
      x: 0.45,
      y: 0.55,
      w: 9,
      h: 0.4,
      fontSize: 22,
      fontFace: "Georgia",
      color: C.ink,
      margin: 0,
    });
    const steps = [
      { t: "01 생성", d: "단정샷 웹\n영정용 초상" },
      { t: "02 인화", d: "관례 규격\n협력 인화" },
      { t: "03 액자", d: "기본 액자\n장착·납품" },
      { t: "04 전달", d: "대상·가족\n담당 수령" },
    ];
    steps.forEach((st, i) => {
      const x = 0.45 + i * 2.35;
      s.addShape("roundRect", {
        x,
        y: 1.2,
        w: 2.2,
        h: 2.1,
        fill: { color: i === 0 ? C.studioDeep : C.white },
        rectRadius: 0.08,
      });
      s.addText(st.t, {
        x,
        y: 1.45,
        w: 2.2,
        h: 0.4,
        fontSize: 16,
        fontFace: "Arial",
        color: i === 0 ? C.studioSoft : C.studio,
        align: "center",
        bold: true,
        margin: 0,
      });
      s.addText(st.d, {
        x: x + 0.15,
        y: 2.1,
        w: 1.9,
        h: 0.9,
        fontSize: 15,
        fontFace: "Arial",
        color: i === 0 ? C.white : C.ink700,
        align: "center",
        margin: 0,
      });
    });
    s.addTable(
      [
        [
          { text: "구분", options: { bold: true, fill: { color: C.studioDeep }, color: C.white } },
          { text: "관 (공공)", options: { bold: true, fill: { color: C.studioDeep }, color: C.white } },
          { text: "민 (협력·CSR)", options: { bold: true, fill: { color: C.studioDeep }, color: C.white } },
        ],
        ["역할", "정책·대상·예산·감독", "인화·액자·물류·단가 지원"],
        ["재원", "시·도·복지기금", "CSR·현물·할인"],
        ["산출", "실적·민원 대응", "품질·납기"],
      ],
      {
        x: 0.45,
        y: 3.5,
        w: 9.1,
        colW: [1.6, 3.75, 3.75],
        border: [{ pt: 0.5, color: C.paperDeep }],
        fontFace: "Arial",
        fontSize: 12,
        color: C.ink700,
        align: "left",
        valign: "middle",
      }
    );
    footer(s, 3, TOTAL);
  }

  // —— 4 Spine flow image ——
  {
    const s = pres.addSlide();
    addBg(s, C.paper);
    eyebrow(s, "PROCESS  ·  공통 척추");
    s.addText("모든 접수 채널이 같은 제작→전달을 탑니다", {
      x: 0.45,
      y: 0.55,
      w: 9,
      h: 0.35,
      fontSize: 22,
      fontFace: "Georgia",
      color: C.ink,
      margin: 0,
    });
    s.addImage({ path: flowPng, x: 0.35, y: 1.15, w: 9.3, h: 1.65 });
    s.addTable(
      [
        [
          { text: "단계", options: { bold: true, fill: { color: C.studioMist } } },
          { text: "산출", options: { bold: true, fill: { color: C.studioMist } } },
          { text: "잠금", options: { bold: true, fill: { color: C.studioMist } } },
        ],
        ["자격·동의", "바우처·동의서", "중복·목적외 사용 ✗"],
        ["제작·검수", "영정 PNG·승인", "잘못된 인물·톤 차단"],
        ["인화·액자·전달", "1인 1세트·수령", "BOM 단일 · 실적 집계"],
      ],
      {
        x: 0.45,
        y: 3.05,
        w: 9.1,
        colW: [2.2, 3.4, 3.5],
        border: [{ pt: 0.5, color: C.paperDeep }],
        fontFace: "Arial",
        fontSize: 12,
        color: C.ink700,
        valign: "middle",
      }
    );
    footer(s, 4, TOTAL);
  }

  // —— 5 Channels A–D ——
  {
    const s = pres.addSlide();
    addBg(s, C.paper);
    eyebrow(s, "CHANNELS  ·  접수 4축");
    s.addText("본인 · 단체 · 복지사 · 확장 자원", {
      x: 0.45,
      y: 0.52,
      w: 9,
      h: 0.35,
      fontSize: 22,
      fontFace: "Georgia",
      color: C.ink,
      margin: 0,
    });
    const ch = [
      { k: "A", t: "본인 촬영", d: "바우처·셀카\n택배·읍면동 픽업", c: C.studioDeep },
      { k: "B", t: "단체 일괄", d: "복지관 배치\n일괄 수령·배분", c: C.studio },
      { k: "C", t: "복지사", d: "방문·대리\n기존 사진 허용", c: "0A4A40" },
      { k: "D", t: "확장", d: "주민센터·요양\n돌봄·CSR·인화점", c: C.ink700 },
    ];
    ch.forEach((c, i) => {
      const x = 0.4 + i * 2.4;
      s.addShape("roundRect", {
        x,
        y: 1.05,
        w: 2.25,
        h: 2.55,
        fill: { color: C.white },
        rectRadius: 0.08,
      });
      s.addShape("roundRect", {
        x: x + 0.15,
        y: 1.25,
        w: 0.55,
        h: 0.55,
        fill: { color: c.c },
        rectRadius: 0.08,
      });
      s.addText(c.k, {
        x: x + 0.15,
        y: 1.32,
        w: 0.55,
        h: 0.4,
        fontSize: 18,
        fontFace: "Arial",
        color: C.white,
        align: "center",
        bold: true,
        margin: 0,
      });
      s.addText(c.t, {
        x: x + 0.15,
        y: 1.95,
        w: 1.95,
        h: 0.35,
        fontSize: 15,
        fontFace: "Arial",
        color: C.ink,
        bold: true,
        margin: 0,
      });
      s.addText(c.d, {
        x: x + 0.15,
        y: 2.4,
        w: 1.95,
        h: 0.9,
        fontSize: 13,
        fontFace: "Arial",
        color: C.ink500,
        margin: 0,
      });
    });
    s.addText(
      "시범: A+B+C 우선 · D는 거점(D1 읍면동·D3 요양)만. 장례·상조는 안내만(끼워팔기 ✗).",
      {
        x: 0.45,
        y: 3.85,
        w: 9.1,
        h: 0.35,
        fontSize: 13,
        fontFace: "Arial",
        color: C.ink700,
        margin: 0,
      }
    );
    s.addTable(
      [
        [
          { text: "D 자원 예", options: { bold: true, fill: { color: C.studioMist } } },
          { text: "역할", options: { bold: true, fill: { color: C.studioMist } } },
        ],
        ["읍면동·경로당·요양원", "창구·집단·시설 일괄"],
        ["방문돌봄·자원봉사·종교 CSR", "현장 보조·현물"],
        ["지역 사진관·인화·액자 업체", "난건 백업·전달 거점"],
      ],
      {
        x: 0.45,
        y: 4.25,
        w: 9.1,
        colW: [4.0, 5.1],
        border: [{ pt: 0.5, color: C.paperDeep }],
        fontFace: "Arial",
        fontSize: 11,
        color: C.ink700,
        valign: "middle",
      }
    );
    footer(s, 5, TOTAL);
  }

  // —— 6 Metrics / KPIs + charts ——
  {
    const s = pres.addSlide();
    addBg(s, C.paper);
    eyebrow(s, "METRICS  ·  객관·운영 지표");
    s.addText("국가 수요 지표 + 시범 KPI (목표·협의)", {
      x: 0.45,
      y: 0.5,
      w: 5.5,
      h: 0.35,
      fontSize: 20,
      fontFace: "Georgia",
      color: C.ink,
      margin: 0,
    });

    s.addChart(pres._chartType.bar, [
      { name: "목표 비중", labels: ["A 본인", "B 단체", "C 복지사"], values: [30, 50, 20] },
    ], {
      x: 0.35,
      y: 1.0,
      w: 4.6,
      h: 2.6,
      showTitle: true,
      title: "시범 채널 구성 목표(%)",
      titleFontSize: 12,
      titleColor: C.ink700,
      titleFontFace: "Arial",
      chartColors: [C.studioDeep],
      showValue: true,
      dataLabelPosition: "outEnd",
      dataLabelColor: C.ink700,
      dataLabelFontSize: 11,
      catAxisLabelColor: C.ink500,
      valAxisLabelColor: C.ink300,
      valGridLine: { color: C.paperDeep, size: 0.5 },
      catGridLine: { style: "none" },
      showLegend: false,
      barGrouping: "clustered",
      valAxisMaxValue: 60,
    });

    s.addChart(pres._chartType.doughnut, [
      {
        name: "재원",
        labels: ["시", "도", "복지기금", "CSR"],
        values: [40, 25, 20, 15],
      },
    ], {
      x: 5.2,
      y: 1.0,
      w: 4.4,
      h: 2.6,
      showTitle: true,
      title: "재원 조합 예시(협의)",
      titleFontSize: 12,
      titleColor: C.ink700,
      titleFontFace: "Arial",
      chartColors: [C.studioDeep, C.studio, "8B6914", C.ink500],
      showPercent: true,
      showLegend: true,
      legendPos: "b",
    });

    s.addTable(
      [
        [
          { text: "KPI", options: { bold: true, fill: { color: C.studioDeep }, color: C.white } },
          { text: "정의", options: { bold: true, fill: { color: C.studioDeep }, color: C.white } },
          { text: "시범 목표", options: { bold: true, fill: { color: C.studioDeep }, color: C.white } },
        ],
        ["수령완료율", "delivered / 발주", "≥ 95%"],
        ["리드타임", "접수→수령 일수", "≤ 7영업일 (협의)"],
        ["재작업률", "검수 반려·재생성", "≤ 8%"],
        ["만족(간단)", "가족·담당 5점", "≥ 4.2"],
        ["단가", "1세트(생성+인화+액자)", "BOM 확정 후 공개"],
      ],
      {
        x: 0.45,
        y: 3.75,
        w: 9.1,
        colW: [1.8, 4.0, 3.3],
        border: [{ pt: 0.5, color: C.paperDeep }],
        fontFace: "Arial",
        fontSize: 11,
        color: C.ink700,
        valign: "middle",
      }
    );
    footer(s, 6, TOTAL);
  }

  // —— 7 Process time comparison ——
  {
    const s = pres.addSlide();
    addBg(s, C.paper);
    eyebrow(s, "COMPARISON  ·  접근성");
    s.addText("현장 부담을 줄이는 쪽이 복지입니다", {
      x: 0.45,
      y: 0.55,
      w: 9,
      h: 0.4,
      fontSize: 22,
      fontFace: "Georgia",
      color: C.ink,
      margin: 0,
    });
    s.addChart(pres._chartType.bar, [
      {
        name: "분",
        labels: ["스튜디오 방문·촬영(왕복 포함·대략)", "단정 웹 생성(제품 기준)"],
        values: [120, 1],
      },
    ], {
      x: 0.5,
      y: 1.1,
      w: 9.0,
      h: 2.8,
      barDir: "bar",
      showTitle: true,
      title: "전형적 소요(분) · 개념 비교 — 생성 단계",
      titleFontSize: 12,
      titleColor: C.ink700,
      chartColors: [C.studio],
      showValue: true,
      dataLabelPosition: "outEnd",
      dataLabelColor: C.ink700,
      catAxisLabelColor: C.ink700,
      valAxisLabelColor: C.ink300,
      valGridLine: { color: C.paperDeep, size: 0.5 },
      catGridLine: { style: "none" },
      showLegend: false,
      valAxisMaxValue: 140,
    });
    s.addText(
      "스튜디오 120분은 왕복·대기 포함한 개념치. 단정 ~1분은 생성 단계(인화·액자·배송 별도). 여권·신분증용 보장 ✗.",
      {
        x: 0.45,
        y: 4.15,
        w: 9.1,
        h: 0.5,
        fontSize: 12,
        fontFace: "Arial",
        color: C.ink500,
        margin: 0,
      }
    );
    footer(s, 7, TOTAL);
  }

  // —— 8 Funding & partners ——
  {
    const s = pres.addSlide();
    addBg(s, C.paper);
    eyebrow(s, "FUNDING  ·  민·관 재원");
    s.addText("시 · 도 · 복지기금 + 뜻있는 협력", {
      x: 0.45,
      y: 0.55,
      w: 9,
      h: 0.35,
      fontSize: 22,
      fontFace: "Georgia",
      color: C.ink,
      margin: 0,
    });
    const boxes = [
      { t: "시 예산", d: "기초 시범\n본예산·대상" },
      { t: "도 매칭", d: "광역 확대\n비율 협의" },
      { t: "복지기금", d: "취약·긴급\n물량 보완" },
      { t: "민 CSR", d: "인화·액자\n현물·단가" },
    ];
    boxes.forEach((b, i) => {
      const x = 0.45 + i * 2.35;
      s.addShape("roundRect", {
        x,
        y: 1.15,
        w: 2.2,
        h: 1.7,
        fill: { color: i === 3 ? C.studioDeep : C.white },
        rectRadius: 0.08,
      });
      s.addText(b.t, {
        x,
        y: 1.35,
        w: 2.2,
        h: 0.4,
        fontSize: 16,
        fontFace: "Arial",
        color: i === 3 ? C.studioSoft : C.studioDeep,
        align: "center",
        bold: true,
        margin: 0,
      });
      s.addText(b.d, {
        x: x + 0.15,
        y: 1.9,
        w: 1.9,
        h: 0.7,
        fontSize: 13,
        fontFace: "Arial",
        color: i === 3 ? C.white : C.ink700,
        align: "center",
        margin: 0,
      });
    });
    s.addTable(
      [
        [
          { text: "주체", options: { bold: true, fill: { color: C.studioMist } } },
          { text: "하는 일", options: { bold: true, fill: { color: C.studioMist } } },
        ],
        ["시·도 복지과", "자격·예산·감독·실적 보고"],
        ["단정샷", "생성 시스템·안내·품질·정산 협력"],
        ["인화·액자 협력", "출력·장착·물류·픽업 거점"],
        ["지역구 의원", "민심·정책 공감 (행정 결재와 분리)"],
      ],
      {
        x: 0.45,
        y: 3.15,
        w: 9.1,
        colW: [2.4, 6.7],
        border: [{ pt: 0.5, color: C.paperDeep }],
        fontFace: "Arial",
        fontSize: 12,
        color: C.ink700,
        valign: "middle",
      }
    );
    footer(s, 8, TOTAL);
  }

  // —— 9 Pilot ——
  {
    const s = pres.addSlide();
    addBg(s, C.paper);
    eyebrow(s, "PILOT  ·  시범");
    s.addText("작게 돌려 보고, 숫자로 확대합니다", {
      x: 0.45,
      y: 0.55,
      w: 9,
      h: 0.35,
      fontSize: 22,
      fontFace: "Georgia",
      color: C.ink,
      margin: 0,
    });
    s.addTable(
      [
        [
          { text: "항목", options: { bold: true, fill: { color: C.studioDeep }, color: C.white } },
          { text: "제안", options: { bold: true, fill: { color: C.studioDeep }, color: C.white } },
        ],
        ["기간", "3개월 (협의)"],
        ["채널", "B 단체 일괄 + A 희망자 → C 난건"],
        ["산출", "1인 1세트 (원본+인화+액자)"],
        ["평가", "수령률·리드타임·재작업·만족·단가"],
        ["이후", "본예산·광역·D 거점 확대"],
      ],
      {
        x: 0.45,
        y: 1.15,
        w: 5.5,
        colW: [1.5, 4.0],
        border: [{ pt: 0.5, color: C.paperDeep }],
        fontFace: "Arial",
        fontSize: 13,
        color: C.ink700,
        valign: "middle",
      }
    );
    s.addShape("roundRect", {
      x: 6.2,
      y: 1.15,
      w: 3.35,
      h: 3.35,
      fill: { color: C.studioDeep },
      rectRadius: 0.1,
    });
    s.addText("협의 요청", {
      x: 6.4,
      y: 1.4,
      w: 3,
      h: 0.35,
      fontSize: 16,
      fontFace: "Arial",
      color: C.studioSoft,
      bold: true,
      margin: 0,
    });
    const asks = [
      "1. 담당·연락처",
      "2. 시범 인원·자격",
      "3. 재원 조합",
      "4. BOM·단가",
      "5. 협력·CSR 범위",
      "6. 동의·검수 절차",
    ];
    asks.forEach((a, i) => {
      s.addText(a, {
        x: 6.4,
        y: 1.9 + i * 0.35,
        w: 3,
        h: 0.32,
        fontSize: 13,
        fontFace: "Arial",
        color: C.white,
        margin: 0,
      });
    });
    footer(s, 9, TOTAL);
  }

  // —— 10 Guardrails ——
  {
    const s = pres.addSlide();
    addBg(s, C.paper);
    eyebrow(s, "GUARDRAILS  ·  준수");
    s.addText("존엄과 신뢰를 지키는 선", {
      x: 0.45,
      y: 0.55,
      w: 9,
      h: 0.35,
      fontSize: 22,
      fontFace: "Georgia",
      color: C.ink,
      margin: 0,
    });
    const guards = [
      { t: "개인정보·초상", d: "동의서 · 목적 외 사용·무단 홍보 금지 · 보관·삭제 합의" },
      { t: "제품 경계", d: "영정·복지 레인 · 여권·신분증·관공서 제출용 보장 ✗" },
      { t: "상업 가드", d: "장례·상조 안내만 · 끼워팔기 ✗ · 확정 전 시명·제휴 표기 ✗" },
      { t: "문서 성격", d: "제안·협의용 · 예산·계약·공고는 별도 확정 절차" },
    ];
    guards.forEach((g, i) => {
      const y = 1.15 + i * 0.85;
      s.addShape("roundRect", {
        x: 0.45,
        y,
        w: 9.1,
        h: 0.75,
        fill: { color: C.white },
        rectRadius: 0.06,
      });
      s.addShape("rect", { x: 0.45, y, w: 0.12, h: 0.75, fill: { color: C.studio } });
      s.addText(g.t, {
        x: 0.8,
        y: y + 0.1,
        w: 8.5,
        h: 0.28,
        fontSize: 14,
        fontFace: "Arial",
        color: C.studioDeep,
        bold: true,
        margin: 0,
      });
      s.addText(g.d, {
        x: 0.8,
        y: y + 0.38,
        w: 8.5,
        h: 0.28,
        fontSize: 13,
        fontFace: "Arial",
        color: C.ink700,
        margin: 0,
      });
    });
    footer(s, 10, TOTAL);
  }

  // —— 11 Close ——
  {
    const s = pres.addSlide();
    addBg(s, C.studioDeep);
    s.addShape("rect", { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color: C.studioSoft } });
    s.addText("다음 한 걸음", {
      x: 0.55,
      y: 1.2,
      w: 6,
      h: 0.4,
      fontSize: 14,
      fontFace: "Arial",
      color: C.studioSoft,
      charSpacing: 2,
      margin: 0,
    });
    s.addText("시·도 복지과와\n함께 시범을 엽니다.", {
      x: 0.55,
      y: 1.7,
      w: 6.2,
      h: 1.3,
      fontSize: 32,
      fontFace: "Georgia",
      color: C.white,
      margin: 0,
    });
    s.addText(`${URL}\n${EMAIL}`, {
      x: 0.55,
      y: 3.3,
      w: 5.5,
      h: 0.7,
      fontSize: 16,
      fontFace: "Arial",
      color: C.studioMist,
      margin: 0,
    });
    s.addImage({ path: qrPath, x: 7.35, y: 1.8, w: 1.9, h: 1.9 });
    s.addText("단정샷", {
      x: 7.35,
      y: 3.85,
      w: 1.9,
      h: 0.3,
      fontSize: 12,
      fontFace: "Arial",
      color: C.ink300,
      align: "center",
      margin: 0,
    });
  }

  const fullPath = path.join(OUT, "danjeongshot-welfare-proposal.pptx");
  const slimPath = path.join(OUT, "danjeongshot-welfare-proposal-notion.pptx");
  await pres.writeFile({ fileName: fullPath });

  // Notion slim: same deck (already light — no heavy gallery); copy
  fs.copyFileSync(fullPath, slimPath);

  console.log("wrote", fullPath);
  console.log("wrote", slimPath);
  return { fullPath, slimPath };
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
