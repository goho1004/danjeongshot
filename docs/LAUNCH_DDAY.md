# 단정샷 — C단계(정식·실PG) 디데이 · 스케줄

> **잠금일:** 2026-08-05  
> **기준:** **C-Day = 2026-09-01 (월)** · 정식(실PG·사업자 기재)  
> **B단계:** 진행 중 · 개선점 수집 (공개 푸시·초대는 병행, C를 앞지르지 않음)  
> **와치독:** `npm run watchdog:cday` · (선택) Cursor Automation 매일 09:00 KST  
> **당일 플레이북:** [`LAUNCH_DAY_PLAYBOOK.md`](LAUNCH_DAY_PLAYBOOK.md) (Gingiris `startup-launch` 이식) · 스킬 `danjeongshot-launch`  
> **런칭 전 전수:** [`LAUNCH_PREFLIGHT_CHECKLIST.md`](LAUNCH_PREFLIGHT_CHECKLIST.md) · 증거 `docs/evidence/preflight/`  
> **사이트:** https://danjeongshot.vercel.app  
> **백업:** GitHub tag `v1.0`

---

## 0. 단계 정의

| 단계 | 한 줄 | 지금 |
| --- | --- | --- |
| A | 베타 가동 (sandbox·링크) | **완료** · gate GREEN |
| B | 개선 수집 + 소수 초대·당근 | **진행 중** |
| **C** | **정식** — 사업자·통판·토스 라이브·푸터 실기재 | **디데이 2026-09-01** |

**C 완료 =** 실결제 1건 성공 + 푸터에 사업자·통판 번호 + `PAYMENT_MODE=toss` 프로덕션 + `maint:gate` GREEN + 베타 고지 정리.

---

## 1. C-Day까지 캘린더 (오늘 8/5 → 9/1 = **27일**)

| 주 | 날짜 | 테마 | 필수 산출 |
| --- | --- | --- | --- |
| **W0** | 8/5~8/10 | B 개선 수집 · C 서류 착수 | 개선 백로그 1장 · 사업자 신청 **접수** |
| **W1** | 8/11~8/17 | 사업자 진행 · 통판 준비 | 사업자등록증(또는 접수번호) · 통판 서류 체크 |
| **W2** | 8/18~8/24 | 토스 라이브 계약 · env 초안 | 토스 라이브 키 발급(보관) · Vercel env **초안만** (스위치 ✗) |
| **W3** | 8/25~8/31 | C-1 리허설 | 푸터 실값 스테이징 · gate · 결제 리허설 체크리스트 |
| **C-Day** | **9/1 (월)** | **Go live** | 라이브 스위치 · 실결제 1건 · 공지 |

와치독은 **매일** D-카운트다운 + 이번 주 필수 항목 + (옵션) `maint:gate`를 찍는다.

---

## 2. C단계 필요 목록 (꼼꼼)

### 2-1. 법·사업 (사람 · 병목)

| # | 항목 | 왜 필요 | Done |
| --- | --- | --- | --- |
| C1 | **개인사업자(또는 법인) 등록** | 실매출·세금·PG 계약 | ☐ |
| C2 | **통신판매업 신고** | 전자상거래 푸터·광고 전제 | ☐ |
| C3 | 상호·대표·주소·연락처 **확정 문자열** | `NEXT_PUBLIC_BIZ_*` | ☐ |
| C4 | 고객센터 메일/전화 **실제 수신** | CS·환불 | ☐ |
| C5 | 환불·청약철회 문구 vs 실운영 정합 | `/legal/refund` | ☐ |

### 2-2. 결제 (토스 라이브)

| # | 항목 | 왜 필요 | Done |
| --- | --- | --- | --- |
| C6 | 토스페이먼츠 **라이브** 계약·사업자 연동 | 실카드 | ☐ |
| C7 | `TOSS_SECRET_KEY` · `NEXT_PUBLIC_TOSS_CLIENT_KEY` **라이브** | Vercel Production | ☐ |
| C8 | `PAYMENT_MODE=toss` (프로덕션) | sandbox 종료 | ☐ |
| C9 | confirm API = 진실 · 리다이렉트만 믿지 않음 | 이미 코드 있음 · 라이브 검증 | ☐ |
| C10 | **실결제 1건** (소액) → PNG 받기·저장 E2E | C 완료 증거 | ☐ |
| C11 | 웹훅(필요 시) · 실패·취소 경로 1회 | 운영 | ☐ |
| C12 | 수수료·부가세 가정 (≈3.74%) 마진 메모 | 가격 유지 여부 | ☐ |

### 2-3. 제품·사이트

| # | 항목 | 왜 필요 | Done |
| --- | --- | --- | --- |
| C13 | 푸터 **사업자·통판 번호** 노출 | 법무·신뢰 | ☐ |
| C14 | 베타 뱃지/「시뮬레이션」고지 **정리** | 정식 톤 | ☐ |
| C15 | `MOCK_GENERATE=0` 유지 · 쿼터·abuse 한도 점검 | 실트래픽 | ☐ |
| C16 | `PREVIEW_QUOTA_SECRET` 전 환경 동일 | 다운로드 410 방지 | ☐ |
| C17 | 이용약관·개인정보·환불 페이지 최종 검수 | `/legal/*` | ☐ |
| C18 | 여권·관공서 아님 · 앱 CTA 없음 재확인 | ship 금지어 | ☐ |
| C19 | `maint:gate` GREEN (C-Day 아침) | 와치독 | ☐ |
| C20 | (선택) 커스텀 도메인 | 브랜드 · C와 동시 또는 +7일 | ☐ |

### 2-4. 채널 (C를 막지 않는 선)

| # | 항목 | 비고 | Done |
| --- | --- | --- | --- |
| C21 | 당근비즈 프로필 (B에서 진행) | 대량광고 ✗ · URL만 | ☐ |
| C22 | B 개선점 백로그 → C 전 반영분 확정 | 8/25까지 컷오프 | ☐ |
| C23 | 초대·B2B는 **실PG 후** 규모 확대 | 그 전엔 소수 | ☐ |

### 2-5. 명시적 비범위 (C-Day에 안 넣음)

- 숏폼 10편 대량 · 앱스토어 · QR 살포  
- 대리점 실정산 자동화 · 글로벌 영문/JP 론칭  
- 라대리/크몽/전자책 (동결)

---

## 3. 주간 Done 기준

| 주 | 그 주 끝나기 전 Done |
| --- | --- |
| W0 | 개선 백로그 공유 · **사업자 신청 접수** |
| W1 | 사업자등록증 또는 명확한 대기 사유 · 통판 체크리스트 |
| W2 | 토스 라이브 키 확보(미적용) · Vercel env 초안 PR/메모 |
| W3 | C-1: 스테이징/프리뷰에서 푸터 실값 · gate GREEN · 라이브 전환 런북 1쪽 |
| C-Day | Production `PAYMENT_MODE=toss` · 실결제 1건 · 공지 |

---

## 4. C-Day 당일 런북

상세(시간표·위기·채널): **[`LAUNCH_DAY_PLAYBOOK.md`](LAUNCH_DAY_PLAYBOOK.md)**

1. `npm run watchdog:cday -- --gate` → GREEN  
2. Vercel Production env: 라이브 키 + `PAYMENT_MODE=toss` + `NEXT_PUBLIC_BIZ_*`  
3. `npx vercel --prod` (또는 대시보드 Redeploy)  
4. 실카드 소액 1건 → 첫 컷 → 사진에 저장  
5. 푸터·약관 스크린샷 보관 (`docs/evidence/c-day/` 권장)  
6. 실패 시: `PAYMENT_MODE=sandbox` 롤백 · 베타 고지 복구

---

## 5. B단계와의 관계

- B = **개선 모으는 중** → 와치독에 「이번 주 개선 메모」칸만 유지.  
- C 일정은 B 때문에 **밀지 않음**. 서류가 늦으면 C-Day만 재잠금.  
- B에서 나온 UI/카피 개선은 **8/25 컷오프** 후 C 안정화만.

---

## 6. 와치독 명령

```powershell
cd D:\Memento\projects\danjeongshot
npm run watchdog:cday
npm run watchdog:cday -- --gate
```

매일 09:00(KST) Cursor Automation 또는 작업 스케줄러로 동일 명령.
