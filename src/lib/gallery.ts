/** 갤러리 샘플 — public/gallery 이미지 경로. 실사 교체 시 beforeSrc/afterSrc만 바꾸면 됨. */

import type { PurposeId } from "@/lib/purposes";

export type GalleryLook = "woman" | "man";
export type GallerySeason = "young" | "mid" | "elder";

export type GalleryItem = {
  id: string;
  purposeId: PurposeId;
  look: GalleryLook;
  season: GallerySeason;
  title: string;
  note: string;
  beforeSrc: string;
  afterSrc: string;
};

export const GALLERY_TABS: { id: PurposeId | "all"; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "resume", label: "이력서" },
  { id: "linkedin", label: "링크드인" },
  { id: "sheet", label: "인화" },
];

/** 전후 9세트 — SVG 플레이스홀더. 실제 동의 셀카 결과로 교체 권장. */
export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "resume-w-young",
    purposeId: "resume",
    look: "woman",
    season: "young",
    title: "이력서 · 여성 · 젊은 인상",
    note: "흰 배경 · 단정한 블라우스 톤",
    beforeSrc: "/gallery/resume-w-young-before.svg",
    afterSrc: "/gallery/resume-w-young-after.svg",
  },
  {
    id: "resume-m-mid",
    purposeId: "resume",
    look: "man",
    season: "mid",
    title: "이력서 · 남성 · 중년",
    note: "밝은 회색 배경 · 담백한 셔츠",
    beforeSrc: "/gallery/resume-m-mid-before.svg",
    afterSrc: "/gallery/resume-m-mid-after.svg",
  },
  {
    id: "resume-w-mid",
    purposeId: "resume",
    look: "woman",
    season: "mid",
    title: "이력서 · 여성 · 중년",
    note: "과한 보정 없이 단정하게",
    beforeSrc: "/gallery/resume-w-mid-before.svg",
    afterSrc: "/gallery/resume-w-mid-after.svg",
  },
  {
    id: "li-m-young",
    purposeId: "linkedin",
    look: "man",
    season: "young",
    title: "링크드인 · 남성 · 젊은 인상",
    note: "캐주얼 단정 · 프로필용",
    beforeSrc: "/gallery/li-m-young-before.svg",
    afterSrc: "/gallery/li-m-young-after.svg",
  },
  {
    id: "li-w-young",
    purposeId: "linkedin",
    look: "woman",
    season: "young",
    title: "링크드인 · 여성 · 젊은 인상",
    note: "부드러운 니트 톤",
    beforeSrc: "/gallery/li-w-young-before.svg",
    afterSrc: "/gallery/li-w-young-after.svg",
  },
  {
    id: "li-m-elder",
    purposeId: "linkedin",
    look: "man",
    season: "elder",
    title: "링크드인 · 남성 · 연세",
    note: "연령을 존중하는 단정함",
    beforeSrc: "/gallery/li-m-elder-before.svg",
    afterSrc: "/gallery/li-m-elder-after.svg",
  },
  {
    id: "sheet-w-mid",
    purposeId: "sheet",
    look: "woman",
    season: "mid",
    title: "인화 · 여성 · 중년",
    note: "4×6 타일에도 잘 맞는 구도",
    beforeSrc: "/gallery/sheet-w-mid-before.svg",
    afterSrc: "/gallery/sheet-w-mid-after.svg",
  },
  {
    id: "sheet-m-young",
    purposeId: "sheet",
    look: "man",
    season: "young",
    title: "인화 · 남성 · 젊은 인상",
    note: "반명함·증명 칸에 쓰기 좋게",
    beforeSrc: "/gallery/sheet-m-young-before.svg",
    afterSrc: "/gallery/sheet-m-young-after.svg",
  },
  {
    id: "sheet-w-elder",
    purposeId: "sheet",
    look: "woman",
    season: "elder",
    title: "인화 · 여성 · 연세",
    note: "종이로 낼 때도 단정하게",
    beforeSrc: "/gallery/sheet-w-elder-before.svg",
    afterSrc: "/gallery/sheet-w-elder-after.svg",
  },
];
