/** 단정샷 용도·프롬프트 — 여권/뷰티/네컷 제외 */

export type PurposeId = "resume" | "linkedin" | "sheet";

export interface Purpose {
  id: PurposeId;
  title: string;
  blurb: string;
  cta: string;
  prompt: string;
  bgDefault: "white" | "gray";
}

/** 사진 속 분 — UI는 사람 말, 프롬프트는 성별·연령대 고정용 */
export type SubjectLookId = "as_photo" | "woman" | "man";
export type SubjectSeasonId = "as_photo" | "young" | "mid" | "elder";

export type SubjectOption = {
  id: string;
  label: string;
  hint: string;
};

export const SUBJECT_LOOKS: SubjectOption[] = [
  { id: "as_photo", label: "사진 그대로", hint: "보이는 모습 유지" },
  { id: "woman", label: "여성분", hint: "단정한 여성 프로필로" },
  { id: "man", label: "남성분", hint: "단정한 남성 프로필로" },
];

export const SUBJECT_SEASONS: SubjectOption[] = [
  { id: "as_photo", label: "사진 그대로", hint: "주름·피부 결도 유지" },
  { id: "young", label: "젊은 인상", hint: "사회 초년에 가깝게" },
  { id: "mid", label: "중년", hint: "직장인·장년의 단정함" },
  { id: "elder", label: "연세 드신 분", hint: "흰머리·주름을 존중해서" },
];
export function parseSubjectLook(raw: unknown): SubjectLookId {
  if (raw === "woman" || raw === "man" || raw === "as_photo") return raw;
  return "as_photo";
}

export function parseSubjectSeason(raw: unknown): SubjectSeasonId {
  if (raw === "young" || raw === "mid" || raw === "elder" || raw === "as_photo") return raw;
  return "as_photo";
}

const LOOK_PROMPT: Record<SubjectLookId, string> = {
  as_photo:
    " Gender lock: match the photo's gender presentation exactly. If she reads as a woman (including short hair or senior), keep her female — do not masculinize. Outfit must match: women get blouse / soft knit / women's jacket; never a men's suit, necktie, or masculine padded shoulders.",
  woman:
    " Gender lock (binding): SHE is a woman — use she/her. Keep clearly female face, hair, and body cues. Outfit must be feminine professional Korean attire: collared blouse, soft knit, cardigan, women's blazer with soft lapels, or women's two-piece (jacket + skirt/pants). Forbidden: men's dark suit, necktie, bow tie, men's dress shirt alone, masculine boxy tailoring, short male haircut.",
  man:
    " Gender lock (binding): HE is a man — use he/him. Keep clearly male. Outfit may be a clean shirt, sweater, or men's blazer — subtle, not flashy.",
};

const SEASON_PROMPT: Record<SubjectSeasonId, string> = {
  as_photo:
    " Keep the subject's apparent age, skin texture, and wrinkles exactly as photographed. Do not youthify or age them.",
  young:
    " Keep a young-adult age feel (roughly early career). Do not make them look middle-aged or elderly. Still the same person.",
  mid:
    " Keep a mature mid-career age feel. Slight maturity is fine; do not turn them into a teenager or a very elderly person.",
  elder:
    " Age lock: older / senior. Preserve gray or white hair, soft wrinkles, and age. Do NOT rejuvenate. For a senior woman, prefer soft blouse or knit — never default to a young male business-suit look.",
};

/** woman + elder 조합 — 라이트 모델의 ‘노인=남성 정장’ 편향 차단 */
const WOMAN_ELDER_LOCK =
  " Hard case (binding): elderly Korean woman headshot. She remains an older woman. Clothing: soft-colored blouse and/or women's jacket / cardigan / women's two-piece. Absolutely forbidden: navy or black men's suit, necktie, masculine shoulder pads, male haircut, male facial structure.";

export const PURPOSES: Purpose[] = [
  {
    id: "resume",
    title: "이력서·취업",
    blurb: "흰·회색 배경으로, 사람인·잡코리아에 올리기 좋게",
    cta: "이력서로 시작",
    bgDefault: "white",
    prompt:
      "Professional Korean resume headshot. Soft even studio lighting. Plain pure white or very light gray background. Tidy clothing only if too casual — prefer blouse/knit for women, shirt for men; do NOT default everyone to a dark men's suit. Preserve exact facial identity, skin texture, hairline, age cues, and proportions. No beauty filter, no skin smoothing, no face reshape, no makeup enhancement, no gender swap. Natural skin. Photorealistic. Neutral calm expression.",
  },
  {
    id: "linkedin",
    title: "링크드인·프로필",
    blurb: "단정한 캐주얼, 부담 없이 믿을 만한 인상",
    cta: "프로필로 시작",
    bgDefault: "gray",
    prompt:
      "Professional LinkedIn-style headshot. Soft natural studio light. Solid light gray backdrop. Smart casual by gender: women — blouse, soft knit, or light women's blazer; men — shirt or sweater. Never force a men's suit+tie. Preserve exact facial identity, age, and natural skin texture. No beauty filter, no skin smoothing, no face reshape, no gender swap. Photorealistic. Friendly but professional expression.",
  },
  {
    id: "sheet",
    title: "인화용 레이아웃",
    blurb: "4×6 타일 PNG · 키오스크에서 직접 뽑을 때 (배송 없음)",
    cta: "인화용으로 시작",
    bgDefault: "white",
    prompt:
      "ID-style portrait for photo-lab print tiling (not government passport claim). Front-facing, even lighting, plain white background, head and upper shoulders. Preserve exact facial identity, gender presentation, and age. Clothing gender-appropriate — never put a woman in a men's suit. No beauty filter. Photorealistic.",
  },
];

export function getPurpose(id: string): Purpose | undefined {
  return PURPOSES.find((p) => p.id === id);
}

export const IDENTITY_SUFFIX =
  " Critical: same person as the photo — same gender presentation, same age band, same face. Do not beautify, idealize, or gender-swap. Never dress a woman (including elderly women) in men's formalwear, necktie, or masculine suit.";

/** 전 용도·리젠 공통 — 고급·실키 톤 (현장 검증 문구) */
const TONE_GUIDANCE =
  " Tone: 고급스러운톤+전체적으로 실키한톤+밝고 화사한톤 (luxurious tone + overall silky tone + bright, fresh/radiant tone).";

/** 전 용도·리젠 공통 — 얼굴 그림자 제거 + 부드러운 조명 */
const LIGHTING_GUIDANCE =
  " Lighting: 얼굴그림자 없게, 부드러운 조명 (no face shadows, soft lighting).";

/** 결제 후 추가 컷용 — 같은 lite, 각도·조명만 미세 변형 (프로 모델 아님) */
export const STUDIO_VARIANT_HINTS = [
  " Slightly different soft key light from camera-left. Keep framing head-and-shoulders. Same identity, gender, age, and clothing gender rules.",
  " Slightly higher camera angle, still professional. Even softer fill. Same identity — no beautify, no gender swap, no men's suit on a woman.",
] as const;

/** attire = 의상(단일 선택), misc = 기타(복수 가능) */
export type ExtraPresetGroup = "attire" | "misc";

export type ExtraPromptPreset = {
  id: string;
  label: string;
  text: string;
  group: ExtraPresetGroup;
  /** 이 look일 때 숨김 (예: 여성분 → 수염) */
  hideForLooks?: SubjectLookId[];
};

/** 만들기 2번 아래 — 짧은 추가 요청 (프리셋 + 직접입력) */
export const EXTRA_PROMPT_PRESETS: ExtraPromptPreset[] = [
  {
    id: "blouse",
    label: "블라우스",
    text: "Wear a neat women's blouse (soft collar, soft tone).",
    group: "attire",
  },
  {
    id: "twopiece",
    label: "여성 투피스",
    text: "Wear a women's two-piece (soft jacket with skirt or trousers).",
    group: "attire",
  },
  {
    id: "dress",
    label: "단정 원피스",
    text: "Wear a neat dress or one-piece top (feminine, professional).",
    group: "attire",
  },
  {
    id: "glasses",
    label: "안경 유지",
    text: "Keep glasses if present in the photo.",
    group: "misc",
  },
  {
    id: "smile",
    label: "미소 살짝",
    text: "Keep a natural slight smile.",
    group: "misc",
  },
  {
    id: "no_tie",
    label: "넥타이 없음",
    text: "No necktie. Women: blouse or women's jacket only.",
    group: "misc",
  },
  {
    id: "keep_beard",
    label: "수염 유지",
    text: "Keep natural facial hair / beard shadow; do not erase.",
    group: "misc",
    hideForLooks: ["woman"],
  },
  {
    id: "hair",
    label: "머리 정돈만",
    text: "Do not change hairstyle; only light tidy.",
    group: "misc",
  },
];

export const EXTRA_PROMPT_MAX = 120;

const PRESET_BY_ID = new Map(EXTRA_PROMPT_PRESETS.map((p) => [p.id, p]));

/** 직접입력만 길이 제한. 프리셋은 잘리지 않음. */
export function sanitizeExtraPrompt(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const t = raw.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!t) return "";
  return t.slice(0, EXTRA_PROMPT_MAX);
}

export function parseExtraPresetIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  let attirePicked: string | null = null;
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const p = PRESET_BY_ID.get(item);
    if (!p) continue;
    if (p.group === "attire") {
      attirePicked = p.id;
      continue;
    }
    if (!ids.includes(p.id)) ids.push(p.id);
  }
  if (attirePicked) ids.unshift(attirePicked);
  return ids;
}

/** 프리셋 전문 + 직접입력(최대 120자). 프리셋은 truncate 하지 않음. */
export function composeExtraPrompt(
  presetIds: unknown,
  custom?: unknown
): string {
  const ids = parseExtraPresetIds(presetIds);
  const fromPresets = ids
    .map((id) => PRESET_BY_ID.get(id)?.text)
    .filter((t): t is string => Boolean(t))
    .join(" ");
  const customPart = sanitizeExtraPrompt(custom);
  return [fromPresets, customPart].filter(Boolean).join(" ").trim();
}

/** 의상 칩은 하나만 — 토글 시 다른 attire 제거 */
export function toggleExtraPresetId(
  prev: string[],
  id: string
): string[] {
  const p = PRESET_BY_ID.get(id);
  if (!p) return prev;
  if (prev.includes(id)) return prev.filter((x) => x !== id);
  if (p.group === "attire") {
    return [
      id,
      ...prev.filter((x) => PRESET_BY_ID.get(x)?.group !== "attire"),
    ];
  }
  return [...prev, id];
}

export function visibleExtraPresets(look: SubjectLookId): ExtraPromptPreset[] {
  return EXTRA_PROMPT_PRESETS.filter(
    (p) => !p.hideForLooks?.includes(look)
  );
}

export function buildPrompt(
  purposeId: string,
  variantIndex?: number,
  subject?: {
    look?: SubjectLookId;
    season?: SubjectSeasonId;
    /** 이미 composeExtraPrompt 된 문자열, 또는 레거시 한 줄 */
    extra?: string;
    extraPresetIds?: string[];
    extraCustom?: string;
  }
): string {
  const p = getPurpose(purposeId) ?? PURPOSES[0];
  const look = subject?.look ?? "as_photo";
  const season = subject?.season ?? "as_photo";
  let base =
    p.prompt +
    IDENTITY_SUFFIX +
    TONE_GUIDANCE +
    LIGHTING_GUIDANCE +
    LOOK_PROMPT[look] +
    SEASON_PROMPT[season];
  if (look === "woman" && season === "elder") {
    base += WOMAN_ELDER_LOCK;
  }
  const hasStructuredExtra =
    (subject?.extraPresetIds?.length ?? 0) > 0 ||
    Boolean(subject?.extraCustom?.trim());
  const extra = hasStructuredExtra
    ? composeExtraPrompt(subject?.extraPresetIds, subject?.extraCustom)
    : typeof subject?.extra === "string"
      ? subject.extra.trim().slice(0, 600)
      : "";
  if (extra) {
    // 의상 추가요청은 secondary로 두면 라이트가 무시하고 남성 정장으로 회귀함
    base +=
      ` User attire/style request (binding for clothing only — never change identity, gender, age, or face): ${extra}`;
  }
  // 모델은 끝문장을 더 잘 따름 — 성별·의상 금지를 마지막에 한 번 더
  if (look === "woman" || look === "as_photo") {
    base +=
      " Final check: if the subject is a woman, output must show a woman in feminine professional clothes — never a men's suit or necktie.";
  }
  if (variantIndex === undefined || variantIndex < 0) return base;
  const hint = STUDIO_VARIANT_HINTS[variantIndex % STUDIO_VARIANT_HINTS.length];
  return base + hint;
}

/** 보수적 포지션: 시안 수십 장·무료툴과 붙지 않음. 한 장 + 필요할 때 인화. */
export type PackId = "basic" | "plus";

/** 플러스팩에 포함되는 인화 규격 (반명함·증명) */
export const PLUS_LAYOUT_SIZE_IDS = ["banmyeongham", "jeungmyeong"] as const;

export const PRICE = {
  /** @deprecated 기본팩과 동일 — 신규 코드는 packBasicKrw / getPack */
  packKrw: 9900,
  packBasicKrw: 9900,
  packPlusKrw: 14900,
  /** @deprecated */
  layoutAddonKrw: 0,
  /** 팩 포함 1장 이후, 다른 생성 컷 추가 다운로드 */
  extraShotKrw: 5000,
  /** 인화 레이아웃 · 기본팩 첫 1종 무료 이후 개별 */
  extraLayoutKrw: 2000,
  /** 인화 레이아웃 · 전 사이즈 패키지 */
  layoutPackKrw: 5000,
} as const;

export const PACKS: {
  id: PackId;
  name: string;
  priceKrw: number;
  tagline: string;
  bullets: string[];
  recommended?: boolean;
}[] = [
  {
    id: "basic",
    name: "기본",
    priceKrw: PRICE.packBasicKrw,
    tagline: "3컷 중 골라 받는 단정 PNG 한 장",
    bullets: [
      "결제 후 3컷 생성 · 마음에 드는 1장 선택",
      "워터마크 없는 PNG",
      "마음에 안 들면 다시 만들기 1회 · A/S 1회",
      "인화가 필요하면 받은 뒤 규격별로 추가",
    ],
  },
  {
    id: "plus",
    name: "플러스",
    priceKrw: PRICE.packPlusKrw,
    tagline: "3컷 선택 + 자주 쓰는 인화 규격 2종",
    bullets: [
      "기본과 동일 · 3컷 중 1장 선택",
      "반명함·증명 인화 레이아웃 포함",
      "키오스크에서 바로 뽑을 타일 PNG",
    ],
    recommended: true,
  },
];

export function getPack(id: string | null | undefined) {
  return PACKS.find((p) => p.id === id) ?? PACKS[0];
}

export function packAmountKrw(id: PackId): number {
  return id === "plus" ? PRICE.packPlusKrw : PRICE.packBasicKrw;
}

/** @deprecated use layoutAddonKrw */
export const sheetAddonKrw = 0;

export const TRUST_CHIPS = [
  "베타 · 약 1분",
  "받은 뒤에는 환불이 어려워요",
  "올린 사진·결과물은 저장하지 않아요",
  "여권·관공서 제출용은 아니에요",
] as const;

/** 시장 포지션 — 홈·도움말용 (과장·시안 물량전 ✗) */
export const POSITIONING = {
  oneLiner: "셀카 올리면 약 1분. 후보를 잔뜩 고르는 대신, 닮은 한 장.",
  vsStudio: "스튜디오·헤어메이크 전에 바로 쓸 수 있는 단정 증명사진이에요.",
  vsCrowd: "후보 사진을 많이 고르는 서비스가 아닙니다. 결제 후 닮은 한 장을 받습니다.",
  notFor: "여권·신분증·관공서 제출용은 만들거나 보장하지 않습니다.",
} as const;

export const LOADING_LINES = [
  "조명을 맞추고 있어요.",
  "단정한 각도를 찾는 중이에요.",
  "과한 보정은 빼고, 닮은 표정만 살리는 중.",
  "스튜디오 분위기만 살짝 빌릴게요.",
  "오늘 바로 올릴 수 있게 다듬는 중이에요.",
  "거울 앞에서 한 번 더 고르는 기분으로.",
] as const;

export const PAY_NUDGE_LINES = [
  "팩을 고르고 결제하면 첫 컷이 열립니다. 받은 뒤에는 환불이 어렵습니다.",
  "한 장이면 기본, 인화까지면 플러스예요. 마음에 안 들면 결제 후 다시 만들기·A/S가 있어요.",
  "후보를 잔뜩 고르는 구성은 아니에요. 닮은 한 장, 필요할 때만 인화 규격입니다.",
] as const;

export const REDO_LOADING_LINES = [
  "알겠어요. 다시 살펴보고, 더 단정한 장으로 잡아 볼게요.",
  "말씀해 주신 만큼, 조명과 각도를 바꿔 같은 분의 다른 컷을 만드는 중이에요.",
  "과한 보정은 넣지 않아요. 닮은 표정만 다시 살리는 중이에요.",
  "원본 셀카를 다시 읽고, 배경과 옷차림만 조용히 정리하고 있어요.",
  "조금만 기다려 주세요. 급하신 마음에 맞춰 한 장을 다시 고르는 중이에요.",
  "첫 컷이 아쉬우셨다면, 이번엔 더 차분한 분위기로 맞춰 볼게요.",
] as const;

export const ASV_LOADING_LINES = [
  "한 번 더 정성을 들일게요. 마지막 서비스 컷이에요.",
  "기다려 주셔서 감사해요. 같은 분, 분위기만 살짝 다르게 잡는 중이에요.",
  "조명·구도를 다시 맞춰, 가장 단정한 장으로 다듬고 있어요.",
  "거의 다 됐어요. 이번 컷이 마음에 드시길 바랍니다.",
  "마지막으로 한 번만 더 — 닮음과 단정함을 함께 챙기는 중이에요.",
] as const;
export const SHOOT_TIPS = [
  {
    title: "밝게",
    detail: "창가나 정면 조명이 좋아요. 얼굴에 그림자·역광이 있으면 결과가 흔들리기 쉽습니다.",
  },
  {
    title: "정면·거리",
    detail: "카메라 눈높이에서, 팔 길이만큼 떨어져 찍어 주세요. 너무 가까우면 얼굴이 늘어져 보입니다.",
  },
  {
    title: "얼굴 크게",
    detail: "어깨 위쪽이 잘 들어오게. 전신·단체·옆모습은 피해주세요.",
  },
  {
    title: "표정·안경",
    detail: "무표정이나 살짝 미소. 선글라스·모자·마스크는 벗고, 안경 반사는 줄여 주세요.",
  },
  {
    title: "배경·필터",
    detail: "단순한 배경이 잘 나옵니다. 뷰티 필터가 강한 원본은 닮음이 깨지기 쉬워요.",
  },
  {
    title: "다시 뽑을 때",
    detail: "같은 장만 반복하기보다, 더 밝은 정면 셀카로 바꿔 올리면 나아지는 경우가 많아요.",
  },
] as const;
