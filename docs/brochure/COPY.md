# 단정샷 B2B 브로슈어 카피 정본

> 갱신: 2026-08-02 · 임원 미팅용 · 인센율은 본문 비노출  
> 디자인: **Neutral Exposure** (`PHILOSOPHY.md`) · canvas-design + frontend-design + pptx  
> 산출: `danjeongshot-b2b-brochure.pptx`(로컬 풀해상) · `danjeongshot-b2b-brochure-notion.pptx`(업로드용) · `danjeongshot-b2b-partner-sheet.pptx` · `cover-neutral-exposure.png`  
> Notion: `push_danjeongshot_brochure_notion.py` → 비즈·계약

## 브랜드

| 키 | 문구 |
|----|------|
| 간판 | 증명사진 -단정- |
| 베타 | 베타 |
| 속도 | 약 1분 |
| URL | https://danjeongshot.vercel.app |
| 만들기 | https://danjeongshot.vercel.app/make |
| 문의 | support@danjeongshot.com |

## 면 1 (앞) — 가치 · 전후

**헤드라인:** 구직자·이직자 이력서 사진, 약 1분.

**서브:** 셀카만 올리면 단정한 PNG 한 장. 인력아웃소싱·채용 현장에서 바로 안내할 수 있습니다.

**가치 3점**

1. **속도** — 약 1분. 스튜디오 예약·이동 없이.
2. **단정** — 이력서·링크드인용. 나처럼 보이는 한 장.
3. **현장 배포** — 링크·QR만 전달. 지점·상담원이 바로 안내.

**이미지:** `public/gallery/real-w-mid-*` · `public/gallery/real-m-mid-*` (Before / After)

## 면 2 (뒤) — 이용 · 가격 · CTA

**이용 3스텝**

1. 용도 고르고 셀카 업로드  
2. 기본·플러스 결제  
3. 워터마크 없는 PNG 수령

**소비자가 (참고)**

| 팩 | 가격 | 한 줄 |
|----|------|-------|
| 기본 | ₩9,900 | 이력서·링크드인 PNG 1장 |
| 플러스 | ₩14,900 | PNG + 반명함·증명 인화 레이아웃 |

**B2B:** 법인·채널 단가는 협의.

**고지 (필수)**

- 여권·신분증·관공서 제출용은 만들거나 보장하지 않습니다.
- 올린 사진·결과물은 저장하지 않습니다.
- 베타 · 사업자 등록 전일 수 있습니다.

**CTA:** 웹에서 바로 → danjeongshot.vercel.app

## 파트너 시트 (선택 배포 · 인센만)

**헤드:** 파트너 정산 초안 (미확정 · 협의)

**흐름:** 임원 미팅 → 조직 하향 안내 → 추적 코드별 집계 → 월 정산

| 유형 | 율(결제액) | 비고 |
|------|------------|------|
| 사장·임원급 인센 | 10~20% | 개인 라인 귀속 |
| 법인 B2B 채널 마진 | 40~50% | 업체 정산 |
| 동시 풀스택 | ✗ | 택1 또는 법인 마진 내 쪼개기 |

## PDF

이 PC에 LibreOffice/PowerPoint 미설치 → PDF 미생성.  
변환 예: LibreOffice 설치 후

```bash
soffice --headless --convert-to pdf --outdir docs/brochure docs/brochure/danjeongshot-b2b-brochure.pptx
soffice --headless --convert-to pdf --outdir docs/brochure docs/brochure/danjeongshot-b2b-partner-sheet.pptx
```

## 재생성

```bash
node docs/brochure/build-brochure.mjs
```

(필요: `pptxgenjs`, `qrcode` — 로컬 `node_modules`에 있으면 됨)

## 금지항

- 여권·민원·관공서 OK 암시 ✗  
- 인센율을 일반 브로슈어에 노출 ✗  
- QR 무작위 살포 권유 ✗  
- 앱스토어 CTA ✗  
