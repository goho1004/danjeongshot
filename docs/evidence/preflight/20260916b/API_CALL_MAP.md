# API_CALL_MAP — 화면별 Gemini/과금 호출 맵 (2026-09-16b, Claude precheck-patch)

> 단일 출구 확인: `rg "GoogleGenAI|@google/genai" src` → **`src/lib/geminiBillGate.ts` 1곳만**.
> generate 계열 라우트에 SDK 직접 호출 0건 (app 라우트 전수 확인).

## 화면 → API → Gemini 호출 여부

| 화면/액션 | API | Gemini HTTP? | 게이트 | 과금 배수 |
|-----------|-----|--------------|--------|-----------|
| 만들기 진입 · 주문 생성 | `POST /api/checkout` | ✗ | `durableIncr` rate limit (신설, 본 세션) | 0 |
| 샌드박스 즉시결제 | `POST /api/checkout/complete` | ✗ | toss 모드 시 maint-smoke 필수 (본 세션 재도입) | 0 |
| 토스 결제승인 | `POST /api/checkout/confirm` | ✗ (Toss confirm API만) | 서버 금액대조 + Toss 승인 | 0 |
| **첫 컷 생성 (preview)** | `POST /api/generate` `stage=preview` | **1회** | `openGeminiTicket({maxCalls:1})` → `hardMaxCallsPerTicket()` ≤3 클램프 | **1** |
| 다시 만들기 (redo) | `POST /api/generate` `stage=redo` | **1회** | 신규 티켓, 동일 클램프 | **1** |
| A/S (asv) | `POST /api/generate` `stage=asv` | **1회** | 신규 티켓, 동일 클램프 | **1** |
| 추가 컷 (extra) | `POST /api/checkout/extra` | ✗ (이미 생성된 previewVault의 clean PNG 재사용) | `order.paid` + `downloadedAt` 필요 | 0 (실과금 ✗ · 문구 "무료 제공") |
| 인화 레이아웃 (layout) | `POST /api/checkout/layout` | ✗ (클라이언트 `photoSheet.ts`로 PNG 합성) | `order.paid` + `downloadedAt` 필요 | 0 (실과금 ✗ · 문구 "정식 결제 준비 중·지금은 무료") |
| 사진 받기(다운로드) | `POST /api/download` | ✗ | unlockToken 검증 | 0 |

**결론:** Gemini에 실제로 돈이 나가는 경로는 `preview`/`redo`/`asv` 세 곳뿐이며 전부 `geminiBillGate.openGeminiTicket().callLite1K()` 단일 함수를 거친다. `extra`/`checkout/layout`은 Gemini를 호출하지 않으므로 "과금 배수" 문제의 대상이 아니고, 대신 **"결제 문구는 있는데 실제 청구가 없다"**는 별개의 비즈니스 정직성 문제(SECURITY_REVIEW #1)다 — `FINDINGS.md` 참조.

## 티켓 · 클램프

- `hardMaxCallsPerTicket()` = `min(floor(GEMINI_HARD_MAX_CALLS_PER_TICKET ?? 1), 3)` — env를 999로 잘못 넣어도 하드 3 초과 불가.
- `openGeminiTicket({ maxCalls: 1, ... })` — 라우트는 항상 1을 요청, 게이트가 추가로 클램프.
- 티켓당 `callLite1K()` 두 번째 호출 시도 시 `spent >= maxCalls` → `budget_block` (HTTP 미발사, `billed:false`).
- 이중 POST/연타: `PostPayFetchStep`/`PaidDonePanel` 등 UI `busyKind` 가드 + 서버 `claimPreviewGenerate`(inflight) — 본 세션에서 코드 변경 없음, 기존 통과 유지(재확인 안 함 — RESULTS 20260916 B5 PASS 근거 유지).

## PREVIEW_SHOT_COUNT

- `src/lib/easterEgg.ts:81` — `PREVIEW_SHOT_COUNT = 1` (하드코드 상수, env 오버라이드 경로 없음). 이스터에그 분기도 컷 수를 늘리지 않음 (별도 워터마크 변형만, Gemini 재호출 없음).

## 킬스위치

- `PREVIEW_EMERGENCY=1|true` → `geminiBillGate.isGeminiBillingPaused()` → 모든 `callLite1K()` 즉시 `pause_block`(HTTP 미발사) + `generateGate.gatePaidGenerate()`에서도 동일 변수로 즉시 503 `STUDIO_PAUSE`.
- 현재 상태: Cursor가 Vercel Production에서 **제거**(본 세션 확인 대상 아님 — Cursor 담당, "Out" 항목이라 재설정 ✗).
- ON/OFF 절차(A8, 3줄): ① Vercel Production 환경변수에 `PREVIEW_EMERGENCY=1` 추가+redeploy = 즉시 정지. ② 값 삭제(또는 `0`)+redeploy = 해제. ③ 해제 직후 `maint:gate` 재실행으로 확인 (본 세션은 로컬 샌드박스에서만 재현·확인, prod 스위치는 Cursor/회장 담당).
