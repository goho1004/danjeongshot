/**
 * 인화 파트너 — 프린팅박스 (인핸즈와 동일 패턴: 결과 PNG → 프박 인화)
 * 단정은 배송·전용 연동 ✗ · 링크·안내만.
 */

export const PRINTING_BOX = {
  name: "프린팅박스",
  /** 공식 웹 */
  homeUrl: "https://printingbox.kr/",
  /** 내 주변 기기 찾기 (인핸즈 ‘여기를 클릭해서…’와 동일 역할) */
  storeUrl: "https://printingbox.kr/store",
  /** 앱 (선택) */
  androidUrl:
    "https://play.google.com/store/apps/details?id=com.devnicolas.printingbox&hl=ko",
  iosUrl: "https://apps.apple.com/kr/app/printingbox/id6469260130",
  supportPhone: "1600-5942",
} as const;

/** 단정 인화 레이아웃 → 프박에서 고를 용지 */
export const PRINTING_BOX_PAPER = {
  sizeLabel: "4×6",
  tip: "단정 인화용 레이아웃 PNG는 이미 4×6에 타일이 깔려 있어요. 프박에서는 「사진 인화 · 4×6」으로 출력하세요. 증명사진 자동배치를 다시 쓰면 이중 타일이 됩니다.",
} as const;
