/**
 * Client-side 4×6" print layout tiles. Not a gov ID / shipping service.
 */

export interface PrintSize {
  id: string;
  label: string;
  widthCm: number;
  heightCm: number;
  note: string;
}

/** 기본: 반명함 — 이력서·원서에 가장 흔함 */
export const DEFAULT_PRINT_SIZE_ID = "banmyeongham";

export const PRINT_SIZES: PrintSize[] = [
  {
    id: "banmyeongham",
    label: "반명함 3×4cm",
    widthCm: 3,
    heightCm: 4,
    note: "이력서·원서 첨부용 (기본)",
  },
  {
    id: "jeungmyeong",
    label: "증명 3.5×4.5cm",
    widthCm: 3.5,
    heightCm: 4.5,
    note: "일반 증명 규격 (관공서 제출용 아님)",
  },
  {
    id: "small",
    label: "소형 2.5×3cm",
    widthCm: 2.5,
    heightCm: 3,
    note: "작은 칸·다량 타일 · 전체 맞춤(잘림 없음)",
  },
  {
    id: "myeongham",
    label: "명함판 5×7cm",
    widthCm: 5,
    heightCm: 7,
    note: "큰 인화·포트폴리오",
  },
  {
    id: "square",
    label: "정사각 4×4cm",
    widthCm: 4,
    heightCm: 4,
    note: "정사각 컷 · 전체 맞춤(잘림 없음)",
  },
];

export function getPrintSize(id: string): PrintSize {
  return PRINT_SIZES.find((s) => s.id === id) ?? PRINT_SIZES[0];
}

/** 진행형 권유 순서 — 한 번에 하나씩 */
export const LAYOUT_UPSELL_ORDER: string[] = [
  "banmyeongham",
  "jeungmyeong",
  "myeongham",
  "square",
  "small",
];

export function nextLayoutOffer(unlockedIds: string[], packPaid: boolean): PrintSize | null {
  if (packPaid) return null;
  const nextId = LAYOUT_UPSELL_ORDER.find((id) => !unlockedIds.includes(id));
  return nextId ? getPrintSize(nextId) : null;
}

const DPI = 300;
const CM_PER_INCH = 2.54;
const cmToPx = (cm: number) => Math.round((cm / CM_PER_INCH) * DPI);

/** 4×6" sheet geometry (same math as generatePhotoSheet) */
export const SHEET_W_IN = 4;
export const SHEET_H_IN = 6;

export function getSheetGrid(size: PrintSize): {
  cols: number;
  rows: number;
  count: number;
  cellWCm: number;
  cellHCm: number;
} {
  const sheetWCm = SHEET_W_IN * CM_PER_INCH;
  const sheetHCm = SHEET_H_IN * CM_PER_INCH;
  const gapCm = 0.2;
  const cols = Math.max(1, Math.floor((sheetWCm + gapCm) / (size.widthCm + gapCm)));
  const rows = Math.max(1, Math.floor((sheetHCm + gapCm) / (size.heightCm + gapCm)));
  return {
    cols,
    rows,
    count: cols * rows,
    cellWCm: size.widthCm,
    cellHCm: size.heightCm,
  };
}

/**
 * 정사각·소형 등은 칸 비율이 3:4 원본과 달라 cover 시 얼굴이 잘림.
 * → 전체 보이게 contain. 그 외는 cover + 상단 가중(머리 쪽 유지).
 */
function fitModeFor(size: PrintSize): "contain" | "cover-top" {
  if (size.id === "square" || size.id === "small") return "contain";
  return "cover-top";
}

function drawFittedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  cellW: number,
  cellH: number,
  mode: "contain" | "cover-top"
) {
  if (mode === "contain") {
    const scale = Math.min(cellW / img.width, cellH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = x + (cellW - dw) / 2;
    const dy = y + (cellH - dh) / 2;
    ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
    return;
  }

  const srcRatio = img.width / img.height;
  const cellRatio = cellW / cellH;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (srcRatio > cellRatio) {
    // 좌우 크롭 · 중앙
    sw = img.height * cellRatio;
    sx = (img.width - sw) / 2;
  } else {
    // 상하 크롭 · 상단 가중(얼굴·머리 쪽)
    sh = img.width / cellRatio;
    const maxSy = Math.max(0, img.height - sh);
    sy = maxSy * 0.12;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, cellW, cellH);
}

export function generatePhotoSheet(
  imageUrl: string,
  size: PrintSize
): Promise<{ dataUrl: string; count: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      try {
        const sheetW = SHEET_W_IN * DPI;
        const sheetH = SHEET_H_IN * DPI;
        const cellW = cmToPx(size.widthCm);
        const cellH = cmToPx(size.heightCm);
        const gap = Math.round((0.2 / CM_PER_INCH) * DPI);
        const cols = Math.max(1, Math.floor((sheetW + gap) / (cellW + gap)));
        const rows = Math.max(1, Math.floor((sheetH + gap) / (cellH + gap)));
        const gridW = cols * cellW + (cols - 1) * gap;
        const gridH = rows * cellH + (rows - 1) * gap;
        const offsetX = Math.round((sheetW - gridW) / 2);
        const offsetY = Math.round((sheetH - gridH) / 2);
        const mode = fitModeFor(size);

        const canvas = document.createElement("canvas");
        canvas.width = sheetW;
        canvas.height = sheetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sheetW, sheetH);

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = offsetX + c * (cellW + gap);
            const y = offsetY + r * (cellH + gap);
            // 칸 배경 (contain 여백용)
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(x, y, cellW, cellH);
            drawFittedImage(ctx, img, x, y, cellW, cellH, mode);
            ctx.strokeStyle = "#dddddd";
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
          }
        }

        // footer hint (tiny)
        ctx.fillStyle = "#999999";
        ctx.font = `${Math.round(DPI * 0.08)}px sans-serif`;
        ctx.fillText(
          `단정샷 인화용 레이아웃 · ${size.label} · 관공서용 아님`,
          Math.round(DPI * 0.15),
          sheetH - Math.round(DPI * 0.12)
        );

        resolve({ dataUrl: canvas.toDataURL("image/png"), count: cols * rows });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("이미지 로드 실패"));
    img.src = imageUrl;
  });
}
