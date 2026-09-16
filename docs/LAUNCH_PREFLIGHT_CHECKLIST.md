# 단정샷 — 런칭 전 전체 체크리스트 (Preflight)

> **잠금:** 2026-09-16 · **상태:** ACTIVE  
> **한 줄:** C-Day 스위치 전에 **과금 · 버그패치 · 보안 · 게이트 · 법·PG**를 한 장에서 통과시킨다.  
> **사이트:** https://danjeongshot.vercel.app  
> **짝:** `LAUNCH_DDAY.md`(C1–C23) · `LAUNCH_DAY_PLAYBOOK.md`(당일) · `GEMINI_BILL_GATE.md` · `SECURITY_REVIEW_FINDINGS_v1.md`  
> **스킬:** `danjeongshot-launch` · `danjeongshot-ship-gate` · `gemini-bill-gate`  
> **증거:** `docs/evidence/preflight/YYYYMMDD/`

**Go 조건:** P0 전부 PASS · `maint:gate` GREEN · 과금 배수 검증 PASS · Critical/High 미해결 0.

---

## 0. 실행 순서 (잠금)

```
① 과금/API (Gemini) → ② 버그패치 회귀 → ③ 보안점검
→ ④ maint:gate / ship-gate → ⑤ 법·PG·카피 (C1–C23)
→ ⑥ 증거 폴더 · Go/No-Go
```

사람만: 실키·실결제·Vercel Production env 스위치.

---

## P0 — 과금 · API (2026-09-16 사고 반영)

| # | 항목 | 검증 | Done |
|---|------|------|------|
| B1 | `PREVIEW_SHOT_COUNT` **= 1** (런칭 기본) | `rg "PREVIEW_SHOT_COUNT" src/lib/easterEgg.ts` | ☐ |
| B2 | 과금 HTTP = `geminiBillGate.ts` **만** | `rg GoogleGenAI src` → gate 파일만 | ☐ |
| B3 | generate 라우트 SDK 직접 ✗ | `rg "new GoogleGenAI\|@google/genai" src/app` | ☐ |
| B4 | 티켓 `hardMax ≤ 3` · 기본 maxCalls=1 | gate 상수 / env | ☐ |
| B5 | 이중 POST 차단 (inflight / claim) | `claimPreviewGenerate` · UI inflight | ☐ |
| B6 | `PREVIEW_EMERGENCY` / pause 경로 | env 또는 early STUDIO_PAUSE | ☐ |
| B7 | 영속 로그 · ops bill-log | Upstash key · `/api/ops/bill-log` | ☐ |
| B8 | 1요청 ≈ 1 Gemini (실측 또는 smoke) | 로그 callIndex / Google AI Studio | ☐ |

**사고 메모:** 과거 1클릭 **×3~×6** (`SHOT_COUNT=3` + `Promise.all` + 이중 POST). 런칭 전 배수 재발 ✗.

---

## P0 — 버그패치 회귀

| # | 항목 | 검증 | Done |
|---|------|------|------|
| P1 | 결제 SoT / replication-lag 오신뢰 재발 ✗ | `orderDurable` · confirm 경로 | ☐ |
| P2 | 구토큰 재사용 → 무제한 재생성 ✗ | `orderPaid` · paid 토큰 스테이지 | ☐ |
| P3 | preview claim TTL · 동시 더블클릭 | `claimPreviewGenerate` | ☐ |
| P4 | download vault · `PREVIEW_QUOTA_SECRET` 전환경 동일 | env-check · 410 방지 | ☐ |
| P5 | `MOCK_GENERATE=0` 프로덕션 | Vercel Production (이름만) | ☐ |
| P6 | 금액 클라이언트 신뢰 ✗ | checkout amount 서버 재검증 | ☐ |

---

## P0 — 보안점검

| # | 항목 | 검증 | Done |
|---|------|------|------|
| S1 | 직전 보안 발견표 Critical/High = 0 미해결 | `SECURITY_REVIEW_FINDINGS_v1.md` | ☐ |
| S2 | IDOR: orderId만으로 상태변경 ✗ | unlockToken 없는 쓰기 API | ☐ |
| S3 | 로그에 prompt/image/api_key ✗ | billgate · generateCallLog | ☐ |
| S4 | maint / ops 라우트 시크릿 헤더 | `MAINT_SMOKE_SECRET` | ☐ |
| S5 | `npm audit` High/Critical 목록 | 표만 · 즉시 업 ✗ (breaking) | ☐ |
| S6 | rate / abuse (checkout·preview) | `abuse-sim` 또는 문서 한도 | ☐ |

---

## P0 — 게이트 · 스모크

| # | 항목 | 명령 | Done |
|---|------|------|------|
| G1 | health | `npm run maint:health -- --base https://danjeongshot.vercel.app` | ☐ |
| G2 | env-check (이름·존재) | `npm run maint:env-check` | ☐ |
| G3 | payment-integrity | `npm run maint:payment-integrity -- --base …` | ☐ |
| G4 | **maint:gate GREEN** | `npm run maint:gate -- --base https://danjeongshot.vercel.app` | ☐ |
| G5 | (선택) gate:notify | `npm run maint:gate:notify` | ☐ |
| G6 | ship-gate / 금지어 | `python scripts/ship_gate.py` (배치 있으면) | ☐ |
| G7 | 여권·관공서·앱 CTA ✗ | 랜딩·legal·카피 육안 | ☐ |

---

## P0 — 법·PG·카피 (요약 · 상세는 LAUNCH_DDAY)

| # | 항목 | Done |
|---|------|------|
| C-법 | C1–C5 사업자·통판·CS·환불 | ☐ |
| C-PG | C6–C12 토스 라이브·실결제 1건 | ☐ |
| C-사이트 | C13–C20 푸터·베타고지·legal·gate | ☐ |
| C-채널 | C21–C23 초대·당근 · 대량광고 ✗ | ☐ |

---

## P1 — 운영 (런칭 직후 가능)

| # | 항목 | Done |
|---|------|------|
| O1 | morning Gemini 로그 체크 (단정+원일) | ☐ |
| O2 | maint-gate cron + TG 알림 Secrets | ☐ |
| O3 | CS 채널·환불 시나리오 1회 | ☐ |
| O4 | 롤백 한 줄: `PAYMENT_MODE=sandbox` | ☐ |

---

## 실행 로그 (에이전트 채움)

| 시각(KST) | 실행자 | 결과 요약 |
|-----------|--------|-----------|
| 2026-09-16 ~10:15 | Cursor | 1차 전수 · **NO-GO** · 상세 `evidence/preflight/20260916/RESULTS.md` |
| 2026-09-16 (b) | Claude Code (`claude --bg`) | 재검증 · API/billing P0 3건 발견·패치(`geminiBillGate.ts` 빌드 실패, `checkout/complete` 결제우회, `proto/agents` 무인증 원장쓰기) · **조건부 NO-GO**(1차 블로커 ①pause②C-법PG③Med승인 은 Out이라 잔존) · 상세 `evidence/preflight/20260916b/RESULTS.md` · 커밋 `aa106a3`(브랜치 `worktree-danjeong-precheck-20260916b`) |

### Go / No-Go

| | |
|--|--|
| **판정** | **NO-GO** |
| **블로커** | ① STUDIO_PAUSE로 gate RED ② B8 실측 미완 ③ High#1 extra/layout 실과금 미확정 ④ C-법·PG 미체크 |
| **증거 경로** | `docs/evidence/preflight/20260916/` |

### 1차 채점 (코드·원격)

| 구역 | PASS | FAIL/BLOCK | 비고 |
|------|------|------------|------|
| 과금 B1–B7 | 7 | B8 blocked | pause 중 |
| 결제 무결성 | checkout·token OK | generate 계열 FAIL | STUDIO_PAUSE |
| health | GREEN | — | |
| maint:gate | — | RED prep-session | pause |
| 보안 표 | Crit 0 | High1·Med4 잔여 | Findings v1 |
| npm audit | — | C1+H3 | 표만 |

---

## 빠른 명령 묶음

```powershell
cd D:\Memento\projects\danjeongshot
$BASE = "https://danjeongshot.vercel.app"

# 과금 출구
rg "GoogleGenAI|@google/genai" src --glob "*.ts" --glob "*.tsx"
rg "PREVIEW_SHOT_COUNT\s*=" src/lib/easterEgg.ts

# 게이트
npm run maint:health -- --base $BASE
npm run maint:gate -- --base $BASE
npm run maint:payment-integrity -- --base $BASE
npm audit --omit=dev 2>$null | Select-Object -First 40

# 와치독
npm run watchdog:cday:gate
```
