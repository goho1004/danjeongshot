# 증명사진 -단정- 유지보수 지침서

> 대상: https://danjeongshot.vercel.app · 코드 `D:\Memento\projects\danjeongshot`  
> 갱신: 2026-07-24

## 1. 한 줄 요약

셀카 → AI 단정 PNG(워터마크 미리보기) → 결제 → 클린 PNG 다운로드.  
관공서·여권 제출용 **아님**. 받은 뒤 환불 어려움.

## 2. 일상 점검 (5분)

```bash
cd D:\Memento\projects\danjeongshot
npm run maint:gate              # 전체 게이트 (권장)
# 또는 개별:
npm run maint:health
npm run maint:download-loop
npm run maint:watermark
npm run maint:safari-multipart
npm run maint:flow-e2e
```

| 명령 | 기대 |
|------|------|
| `maint:gate` | `{ "GREEN": true, "failures": [] }` |
| `maint:loop` | gate 실패 시 exit 1 (CI·수동 루프) |
| `watchdog:cday` | C-Day(2026-09-01) 카운트다운·주간 필수·체크리스트 |
| `watchdog:cday:gate` | 위 + `maint:gate` (실패 시 exit 1) |
| `launch:day` | C-Day 플레이북 경로 안내 (`LAUNCH_DAY_PLAYBOOK.md` · 스킬 `danjeongshot-launch`) |
| `maint:health` | `/` `/make` 200, checkout POST 가능 |
| `maint:download-loop` | `{"GREEN":true,...}` |
| `maint:watermark` | 미리보기 PNG에 워터마크 존재 |
| `maint:safari-multipart` | iOS UA multipart 다운로드 200 |
| `maint:flow-e2e` | Playwright UI: 받기→저장→레이아웃 |
| `maint:smoke` | generate→checkout→complete→download |
| `maint:check-debug` | 디버그 계측 잔여 0건 |

프로덕션 검증 시:

```bash
npm run maint:gate -- --base https://danjeongshot.vercel.app
```

실패 시 → §6 장애 대응 · §8 모듈 맵.

## 3. 환경 변수

로컬: `.env.local` · 프로덕션: Vercel Project → Settings → Environment Variables.

| 키 | 역할 |
|----|------|
| `GEMINI_API_KEY` | 실생성 |
| `MOCK_GENERATE` | `1`=목업 · `0`=실생성 |
| `PAYMENT_MODE` | `sandbox` \| `toss` |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 토스 클라이언트 |
| `TOSS_SECRET_KEY` | 토스 시크릿 (서버만) |
| `NEXT_PUBLIC_SITE_URL` | 사이트 URL |
| `PREVIEW_QUOTA_SECRET` | vault/주문 서명 (인스턴스 간 동일해야 함) |
| `MAINT_SMOKE_SECRET` | maint gate용 — `x-djs-maint-smoke` 헤더와 일치 시 generate 한도 생략 |
| `NEXT_PUBLIC_BIZ_*` | 푸터 사업자·부가세 표기 |

**필수:** Vercel에 `PREVIEW_QUOTA_SECRET`(또는 고정 `GEMINI_API_KEY`)를 **전 환경 동일**하게. 키가 바뀌면 vault unseal 실패 → 다운로드 410.

## 4. 배포

```bash
npm run build
npx vercel --prod --yes
npm run maint:gate -- --base https://danjeongshot.vercel.app
```

배포 후 브라우저: `/make` 강력 새로고침 → 결제 → 「이 컷 받기」→ 「파일로 저장」→ 「레이아웃 저장」.

## 5. 결제 (PG)

### sandbox (현재 기본)

1. `/api/checkout` → 주문 생성  
2. `/api/checkout/complete` → 즉시 paid  
3. `/api/download` `format=binary` → PNG

### toss

`.env` / Vercel:

```
PAYMENT_MODE=toss
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...
TOSS_SECRET_KEY=test_sk_...
```

흐름: checkout → 토스 창 → `/make/payment/success` → `/api/checkout/confirm` → 복원.

**주의 (payments skill):** 리다이렉트만 믿지 말 것. confirm API 성공이 진실. 라이브 전 웹훅·사업자등록·통신판매 신고.

## 6. 장애 대응

### 다운로드 안 됨

| 증상 | 원인 | 조치 |
|------|------|------|
| API 410 / 세션 만료 | vault 서명 키 불일치·만료 | `PREVIEW_QUOTA_SECRET` 통일, 다시 만들기 |
| API 403 UNLOCK_FAIL | 미결제·토큰 오류 | 같은 기기에서 재결제 |
| Safari 「다운로드 잠금」 | JSON POST 한도 | `lib/download/fetchClean.ts` multipart 경로 확인 |
| API는 되는데 파일 없음 | 브라우저 저장 차단 | 팝업 허용 · `<a download>` · share 폴백 |
| 레이아웃 준비 오류 | blob URL 만료·이미지 로드 | PNG 저장 후 재시도 · `hooks/make/useLayoutDownload.ts` |

검증:

```bash
SMOKE_BASE=https://danjeongshot.vercel.app npm run maint:gate
```

### 결제 실패

- sandbox: `/api/checkout/complete` 응답·orderTicket 확인  
- toss: successUrl 쿼리 `paymentKey,orderId,amount` → confirm · 금액=주문금액

### 생성 실패 / 한도

- `MOCK_GENERATE` · Gemini 키 · 미리보기 일일 한도  
- `npm run abuse-sim` (어뷰징 시뮬)

## 7. 금지·카피

- 여권·관공서·민원 **가능** 클레임 ✗  
- 앱 설치 CTA ✗  
- 간판: **증명사진 -단정-** · **1분 완성**  
- 워터마크: 머리카락·목 근처 2곳, 작게·흐리게 (결제 전만)

## 8. 모듈 맵 (버그 → 파일)

| 증상·영역 | 수정 위치 |
|-----------|-----------|
| 다운로드·Safari multipart | `src/lib/download/fetchClean.ts`, `src/app/api/download/route.ts` |
| 파일 저장 (picker/share/anchor) | `src/lib/download/savePng.ts` |
| 결제 후 흐름 단계 | `src/lib/flow/makeFlow.ts`, `src/components/make/steps/*` |
| 받기/저장 UI | `PaidDonePanel`, `hooks/make/useDownload.ts` |
| 레이아웃 | `hooks/make/useLayoutDownload.ts`, `src/lib/photoSheet.ts`, `PaidDonePanel` |
| 워터마크 | `src/lib/watermark.ts`, `WatermarkFrame.tsx` |
| 결제 | `hooks/make/useCheckout.ts`, `src/app/api/checkout*` |
| 미리보기 생성 | `hooks/make/useGenerate.ts`, `src/app/api/generate` |
| 세션 복원 | `hooks/make/useSessionRestore.ts`, `src/lib/sessionHeavy.ts` |
| 오케스트레이터 | `src/components/make/MakeStudio.tsx` (~250줄) |

### 디렉터리

```
src/components/make/       UI 단계 + MakeStudio
src/hooks/make/            상태·생성·결제·다운·레이아웃
src/lib/download/          fetchClean, savePng, bytes
src/lib/flow/              makeFlow 상태기계
src/lib/make/types.ts      Shot, session keys
src/app/api/download       클린 PNG (binary·multipart)
scripts/maint/             유지보수 CLI (gate·checks)
docs/MAINTENANCE.md        본 문서
```

## 9. 에이전트용

Cursor 스킬:

- `danjeongshot-maint` — 유지보수 진입  
- `reliable-file-download` — 브라우저 저장  
- `danjeongshot-ship-gate` — 출고 게이트  
- `agency-payments-billing-engineer` — PG 원칙  

출고 전 디버그 계측 잔여 확인:

```bash
npm run maint:check-debug   # count: 0 기대
```

## 10. 체크리스트 (출고 전)

- [ ] `npm run build` 성공  
- [ ] `maint:gate` GREEN (prod)  
- [ ] `maint:check-debug` 0건  
- [ ] 브라우저: 업로드→결제→받기→저장→레이아웃  
- [ ] 크롬·Safari 각 1회, 미리보기 워터마크 확인  
- [ ] 푸터 사업자/부가세 문구 확인  
- [ ] 관공서 OK 문구 없음  
- [ ] toss 전환 시 테스트 키로 1회 승인 성공  
