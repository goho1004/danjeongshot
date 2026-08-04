/**

 * 의도적 이스터에그 — 3컷 중 1슬롯만 희소 보너스.

 * 이상함 = 워터마크 오버레이 (프롬프트로 사진 내용 바꾸지 않음).

 * 정본: docs/EASTER_EGG.md

 */



export type EasterDayKind = "normal" | "season" | "scarce" | "fun";

/** glyph = 기호·숫자 · animal = 퍼니 희소일 마크 (소품이 아닌 워터마크 스타일) */

export type EasterVariant = "glyph" | "animal";



export type ScarceDate = {

  /** MM-DD */

  md: string;

  kind: "scarce" | "fun";

  label: string;

};



export type SeasonWeek = { startMd: string; endMd: string; label: string };



/** 연간 희소일 플레이스홀더 — env EASTER_SCARCE_DATES 로 덮어쓰기 */

export const DEFAULT_SCARCE_DATES: ScarceDate[] = [

  { md: "04-01", kind: "fun", label: "만우절" },

  { md: "03-02", kind: "scarce", label: "봄 취업 희소일" },

  { md: "09-01", kind: "scarce", label: "신학기 희소일" },

  { md: "11-20", kind: "scarce", label: "수능 다음날" },

];



export const DEFAULT_SEASON_WEEKS: SeasonWeek[] = [

  { startMd: "02-24", endMd: "03-09", label: "봄 취업시즌" },

  { startMd: "08-25", endMd: "09-07", label: "신학기" },

];



/** 구간별 기본 확률 (표 중앙값) */

export const EASTER_PROB: Record<EasterDayKind, number> = {

  normal: 0.01,

  season: 0.075,

  scarce: 0.4,

  fun: 0.4,

};



export const PREVIEW_SHOT_COUNT = 3;



function padMd(month: number, day: number): string {

  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

}



function mdToOrdinal(md: string): number {

  const [m, d] = md.split("-").map((x) => Number(x));

  return m * 100 + d;

}



function inSeasonWeek(md: string, weeks: SeasonWeek[]): boolean {

  const o = mdToOrdinal(md);

  return weeks.some((w) => {

    const a = mdToOrdinal(w.startMd);

    const b = mdToOrdinal(w.endMd);

    return o >= a && o <= b;

  });

}



/** `04-01:fun,11-20:scarce` */

export function parseScarceDatesEnv(raw: string | undefined): ScarceDate[] | null {

  if (!raw?.trim()) return null;

  const out: ScarceDate[] = [];

  for (const part of raw.split(",")) {

    const [md, kindRaw] = part.trim().split(":");

    if (!md || !/^\d{2}-\d{2}$/.test(md)) continue;

    const kind = kindRaw === "fun" ? "fun" : "scarce";

    out.push({ md, kind, label: md });

  }

  return out.length ? out : null;

}



export function getScarceDates(): ScarceDate[] {

  return parseScarceDatesEnv(process.env.EASTER_SCARCE_DATES) ?? DEFAULT_SCARCE_DATES;

}



export function resolveDayKind(

  date: Date = new Date(),

  scarceDates: ScarceDate[] = getScarceDates(),

  seasonWeeks: SeasonWeek[] = DEFAULT_SEASON_WEEKS

): { kind: EasterDayKind; scarceLabel?: string } {

  const md = padMd(date.getMonth() + 1, date.getDate());

  const hit = scarceDates.find((d) => d.md === md);

  if (hit) return { kind: hit.kind, scarceLabel: hit.label };

  if (inSeasonWeek(md, seasonWeeks)) return { kind: "season" };

  return { kind: "normal" };

}



export function easterProbability(kind: EasterDayKind): number {

  const envKey =

    kind === "normal"

      ? process.env.EASTER_PROB_NORMAL

      : kind === "season"

        ? process.env.EASTER_PROB_SEASON

        : process.env.EASTER_PROB_SCARCE;

  if (envKey != null && envKey !== "") {

    const n = Number(envKey);

    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;

  }

  return EASTER_PROB[kind];

}



export type EasterRoll = {

  hit: boolean;

  /** 0..PREVIEW_SHOT_COUNT-1 when hit */

  slot: number | null;

  kind: EasterDayKind;

  variant: EasterVariant | null;

  scarceLabel?: string;

  probability: number;

};



/**

 * 3컷 중 최대 1슬롯만 이스터.

 * EASTER_EGG_OFF=1 / optOut → 미당첨.

 * EASTER_EGG_FORCE=1 → 항상 당첨 (기본 슬롯 2).

 */

export function rollEasterSlot(opts?: {

  date?: Date;

  optOut?: boolean;

  shotCount?: number;

  random?: () => number;

}): EasterRoll {

  const shotCount = opts?.shotCount ?? PREVIEW_SHOT_COUNT;

  const rnd = opts?.random ?? Math.random;

  const { kind, scarceLabel } = resolveDayKind(opts?.date);

  const probability = easterProbability(kind);



  if (opts?.optOut || process.env.EASTER_EGG_OFF === "1") {

    return { hit: false, slot: null, kind, variant: null, scarceLabel, probability };

  }



  const force = process.env.EASTER_EGG_FORCE === "1";

  const hit = force || rnd() < probability;

  if (!hit) {

    return { hit: false, slot: null, kind, variant: null, scarceLabel, probability };

  }



  const slot = force

    ? Math.min(2, shotCount - 1)

    : Math.floor(rnd() * shotCount);

  const variant: EasterVariant = kind === "fun" ? "animal" : "glyph";

  return { hit: true, slot, kind, variant, scarceLabel, probability };

}



/** 기본 선택 = 비이스터 첫 컷 */

export function preferCleanShotIndex(easterFlags: boolean[]): number {

  const i = easterFlags.findIndex((e) => !e);

  return i >= 0 ? i : 0;

}



/**

 * 희소 워터마크 SVG (얼굴 중앙 비움 · 모서리·어깨 쪽).

 * sharp composite용 — 제거 = 클린 PNG(vault) 재제공.

 */

export function easterWatermarkSvg(

  width: number,

  height: number,

  variant: EasterVariant

): Buffer {

  const unit = Math.min(width, height);

  const big = Math.max(18, Math.round(unit * 0.055));

  const mid = Math.max(14, Math.round(unit * 0.038));

  const tiny = Math.max(11, Math.round(unit * 0.028));



  // 얼굴·중앙 비움 — 우상단·좌하단·우하단만

  const spots =

    variant === "animal"

      ? [

          {

            x: Math.round(width * 0.86),

            y: Math.round(height * 0.1),

            rot: -12,

            lines: [

              { t: "?", s: big, o: 0.42 },

              { t: "※ · 稀", s: tiny, o: 0.28 },

            ],

          },

          {

            x: Math.round(width * 0.14),

            y: Math.round(height * 0.9),

            rot: 8,

            lines: [

              { t: "◈ ? ◈", s: mid, o: 0.32 },

              { t: "fun mark", s: tiny, o: 0.22 },

            ],

          },

        ]

      : [

          {

            x: Math.round(width * 0.88),

            y: Math.round(height * 0.09),

            rot: -16,

            lines: [

              { t: "⌬Ξʔ", s: big, o: 0.38 },

              { t: "7·13·?", s: tiny, o: 0.26 },

            ],

          },

          {

            x: Math.round(width * 0.12),

            y: Math.round(height * 0.88),

            rot: 11,

            lines: [

              { t: "∴∵⌁", s: mid, o: 0.34 },

              { t: "稀 · ?", s: tiny, o: 0.24 },

            ],

          },

          {

            x: Math.round(width * 0.82),

            y: Math.round(height * 0.92),

            rot: -6,

            lines: [{ t: "?", s: mid, o: 0.3 }],

          },

        ];



  const marks = spots

    .map((s) => {

      const texts = s.lines

        .map(

          (ln, i) =>

            `<text x="${s.x}" y="${s.y + i * (ln.s * 1.05)}" font-size="${ln.s}" opacity="${ln.o}">${escapeXml(

              ln.t

            )}</text>`

        )

        .join("");

      return `<g fill="#1a2e28" font-family="ui-monospace,Consolas,monospace" font-weight="600"

     text-anchor="middle" transform="rotate(${s.rot} ${s.x} ${s.y})">${texts}</g>`;

    })

    .join("\n");



  const corner = Math.max(9, Math.round(tiny * 0.85));

  const svg = `<?xml version="1.0" encoding="UTF-8"?>

<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">

${marks}

  <text x="${width - 10}" y="${height - 8}" text-anchor="end" fill="#1a2e28" opacity="0.2"

        font-family="ui-monospace,Consolas,monospace" font-size="${corner}" font-weight="500">稀</text>

</svg>`;

  return Buffer.from(svg);

}



function escapeXml(s: string): string {

  return s

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;");

}



export const EASTER_BADGE = "희소";

export const EASTER_LABEL = "보너스 · 희소";

export const EASTER_UPSELL =

  "희소 워터마크 컷이에요. 제출·이력서용은 단정 컷을 골라 주세요. (워터마크 제거는 추후 제공)";


