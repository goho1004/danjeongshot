# Preflight Evidence — 2026-09-16

> Base: `https://danjeongshot.vercel.app`  
> Runner: Cursor · 체크리스트 `docs/LAUNCH_PREFLIGHT_CHECKLIST.md`

## 판정: **NO-GO** (의도적 STUDIO_PAUSE + 잔여 Med/High)

게이트 RED는 버그라기보다 **프리뷰 비상정지(`PREVIEW_EMERGENCY` / STUDIO_PAUSE)** 가 켜진 상태에서 maint가 generate를 못 통과한 것. 런칭 Go 전엔 pause **해제 후** gate 재실행 필수.

---

## P0 과금/API

| # | 결과 | 증거 |
|---|------|------|
| B1 | **PASS** | `PREVIEW_SHOT_COUNT = 1` (`easterEgg.ts:81`) |
| B2 | **PASS** | `GoogleGenAI` / `@google/genai` = `geminiBillGate.ts`만 |
| B3 | **PASS** | `src/app` SDK 직접 ✗ |
| B4 | **PASS** | `hardMaxCallsPerTicket` 기본 1 · `Math.min` 클램프 |
| B5 | **PASS** | UI `inflightRef` + `claimPreviewGenerate` → `PREVIEW_INFLIGHT` |
| B6 | **PASS (켜짐)** | `PREVIEW_EMERGENCY` → `STUDIO_PAUSE` 동작 확인 (gate/payment도 503) |
| B7 | **PASS (코드)** | Upstash `djs:billgate:v1` + `/api/ops/bill-log` 존재 |
| B8 | **BLOCKED** | pause 중 실측 1요청=1과금 불가 · pause 해제 후 필수 |

## P0 버그·결제

| # | 결과 | 증거 |
|---|------|------|
| P1–P3 | **코드 OK** · 회귀 실측은 pause로 일부 스킵 | claim/inflight 존재 |
| P4 | **부분** | 로컬 env에 `PREVIEW_QUOTA_SECRET` 이름 미확인 · Prod는 MAINTENANCE 문서 기준 |
| P5 | **사람** | Vercel `MOCK_GENERATE` 값 확인 필요 |
| P6 | **PASS** | checkout `packAmountKrw` 서버계산 · confirm `expectedAmount` 대조 |
| payment-integrity | **FAIL (pause)** | checkout/complete/token-rotated **OK** · generate 계열 전부 `STUDIO_PAUSE` 503 |

## P0 보안

| # | 결과 | 비고 |
|---|------|------|
| S1 | **NO-GO 요소** | Critical 0 · High #1(extra/layout 실과금) 문구완화됨·실연동 대기 · Med #2–#5 표만 |
| S2–S4 | **양호/기지** | 직전 리뷰 검증済 유지 · 로그에 key 값 출력 ✗ (변수명만) |
| S5 | **표** | npm audit: Critical 1(next 플래그) · High 3(nanoid/postcss/sharp) — 즉시 업 ✗ |
| S6 | **기지** | checkout rate limit 없음 = Med #5 |

## P0 게이트

| # | 결과 |
|---|------|
| G1 health | **GREEN** (`/` `/make` `/gallery` `/help` 200 · download unauth 403) |
| G4 maint:gate | **RED** · `failures: ["prep-session"]` · STUDIO_BUSY/PAUSE 메시지 |
| G7 카피 | 여권·관공서 = **부정 고지** (OK) · `/print` App Store = 인쇄박스 파트너 (앱설치 CTA ✗로 해석, 육안 유지) |

---

## 블로커 (런칭 전 필수)

1. **`PREVIEW_EMERGENCY` OFF** 후 `maint:gate` GREEN 재확인  
2. **B8** 실측: 1클릭 → Gemini Interactions **1** (Studio/ bill-log)  
3. **High #1** extra/layout: 실토스 연동 **또는** 유료 UI 완전 차단 중 택1 확정  
4. **C-법·C-PG** (LAUNCH_DDAY C1–C12) 사람 체크 — 본 런은 미실행  
5. (권장) Med #2 alreadyPaid 토큰 · #5 checkout rate — 승인 후 패치

## 통과한 것 (유지)

- 과금 출구 단일화 · SHOT=1 · 이중제출 가드 · pause 킬스위치 실동작  
- health GREEN · checkout/complete/token rotate OK  
- 금액 서버 진실

## 다음 한 방

```powershell
# 1) Vercel Production: PREVIEW_EMERGENCY 제거/0 후 redeploy
# 2)
cd D:\Memento\projects\danjeongshot
npm run maint:gate -- --base https://danjeongshot.vercel.app
npm run maint:payment-integrity -- --base https://danjeongshot.vercel.app
# 3) /make 프리뷰 1회 → Google AI Studio Interactions + /api/ops/bill-log
```
