/** 웹 간판·브랜드 카피 */

import packageJson from "../../package.json";

/** package.json version — 푸터·배포 표기 */
export const APP_VERSION = packageJson.version as string;

export const BRAND = {
  /** 헤더·히어로·푸터 간판 */
  sign: "증명사진 -단정-",
  /** 짧은 표기 (워터마크·뱃지) */
  short: "단정",
  /** 서비스 정식명 (약관·주문명) */
  legal: "단정샷",
  /** 속도 약속 */
  speed: "약 1분",
  tagline: "급할 때, 나처럼 보이는 단정 증명사진",
  /** 베타 뱃지·고지 */
  beta: "베타",
  betaNote: "사업자 등록 전 베타입니다. 결제·사업자 표기는 준비 중이에요.",
} as const;
