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
    " Keep the subject's apparent gender presentation exactly as in the photo. Never masculinize a woman or feminize a man. Clothing must match that presentation — never put a woman in a men's suit or necktie.",
  woman:
    " The subject is a woman. Keep her clearly female: feminine facial structure, hair, and proportions. Professional attire for a Korean woman: neat blouse, soft knit, or light women's blazer — NOT a men's suit, NOT a necktie, NOT masculine tailoring.",
  man:
    " The subject is a man. Keep him clearly male. Professional attire may be a clean shirt, sweater, or men's blazer if needed — subtle, not flashy.",
};

const SEASON_PROMPT: Record<SubjectSeasonId, string> = {
  as_photo:
    " Keep the subject's apparent age, skin texture, and wrinkles exactly as photographed. Do not youthify or age them.",
  young:
    " Keep a young-adult age feel (roughly early career). Do not make them look middle-aged or elderly. Still the same person.",
  mid:
    " Keep a mature mid-career age feel. Slight maturity is fine; do not turn them into a teenager or a very elderly person.",
  elder:
    " The subject is older / senior. Preserve gray hair, soft wrinkles, and age. Do NOT rejuvenate into a young face. Do NOT put them in a young man's suit look.",
};

export const PURPOSES: Purpose[] = [
  {
    id: "resume",
    title: "이력서·취업",
    blurb: "흰·회색 배경으로, 사람인·잡코리아에 올리기 좋게",
    cta: "이력서로 시작",
    bgDefault: "white",
    prompt:
      "Professional Korean resume headshot. Soft even studio lighting. Plain pure white or very light gray background. Only tidy clothing if the outfit is too casual — keep changes subtle and gender-appropriate. Preserve the person's exact facial identity, skin texture, hairline, age cues, and proportions. No beauty filter, no skin smoothing, no face reshape, no makeup enhancement, no gender swap. Natural skin. Photorealistic. Neutral calm expression.",
  },
  {
    id: "linkedin",
    title: "링크드인·프로필",
    blurb: "단정한 캐주얼, 부담 없이 믿을 만한 인상",
    cta: "프로필로 시작",
    bgDefault: "gray",
    prompt:
      "Professional LinkedIn-style headshot. Soft natural studio light. Solid light gray backdrop. Smart casual clothing appropriate to the subject's gender — restrained, not flashy. Preserve exact facial identity, age, and natural skin texture. No beauty filter, no skin smoothing, no face reshape, no gender swap. Photorealistic. Friendly but professional expression.",
  },
  {
    id: "sheet",
    title: "인화용 레이아웃",
    blurb: "4×6 타일 PNG · 키오스크에서 직접 뽑을 때 (배송 없음)",
    cta: "인화용으로 시작",
    bgDefault: "white",
    prompt:
      "ID-style portrait for photo-lab print tiling (not government passport claim). Front-facing, even lighting, plain white background, head and upper shoulders. Preserve exact facial identity, gender presentation, and age. No beauty filter. Photorealistic.",
  },
];

export function getPurpose(id: string): Purpose | undefined {
  return PURPOSES.find((p) => p.id === id);
}

export const IDENTITY_SUFFIX =
  " Critical: same person as the photo — same gender presentation, same age band, same face. Do not beautify, idealize, gender-swap, or dress a woman in men's formalwear.";

/** 결제 후 추가 컷용 — 같은 lite, 각도·조명만 미세 변형 (프로 모델 아님) */
export const STUDIO_VARIANT_HINTS = [
  " Slightly different soft key light from camera-left. Keep framing head-and-shoulders. Same identity, gender, and age.",
  " Slightly higher camera angle, still professional. Even softer fill. Same identity, no beautify, no gender swap.",
] as const;

export function buildPrompt(
  purposeId: string,
  variantIndex?: number,
  subject?: { look?: SubjectLookId; season?: SubjectSeasonId }
): string {
  const p = getPurpose(purposeId) ?? PURPOSES[0];
  const look = subject?.look ?? "as_photo";
  const season = subject?.season ?? "as_photo";
  let base =
    p.prompt + IDENTITY_SUFFIX + LOOK_PROMPT[look] + SEASON_PROMPT[season];
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
    tagline: "이력서·링크드인에 올릴 단정 PNG 한 장",
    bullets: [
      "워터마크 없는 PNG 1장",
      "마음에 안 들면 다시 만들기 1회 · A/S 1회",
      "인화가 필요하면 받은 뒤 규격별로 추가",
    ],
  },
  {
    id: "plus",
    name: "플러스",
    priceKrw: PRICE.packPlusKrw,
    tagline: "제출용 PNG + 자주 쓰는 인화 규격 2종",
    bullets: [
      "기본 구성 전부",
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
  "1분 완성",
  "받은 뒤에는 환불이 어려워요",
  "올린 사진·결과물은 저장하지 않아요",
  "여권·관공서 제출용은 아니에요",
] as const;

/** 시장 포지션 — 홈·도움말용 (과장·시안 물량전 ✗) */
export const POSITIONING = {
  oneLiner: "셀카 올리면 약 1분. 후보를 잔뜩 고르는 대신, 닮은 한 장.",
  vsStudio: "스튜디오·헤어메이크 전에 바로 쓸 수 있는 단정 증명사진이에요.",
  vsCrowd: "후보 사진을 많이 고르는 서비스가 아닙니다. 미리 보고, 한 장을 받습니다.",
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
  "미리보기가 괜찮다면 기본·플러스 중 골라 결제해 주세요. 받은 뒤에는 환불이 어렵습니다.",
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
