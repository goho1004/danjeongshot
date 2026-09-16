# CLAUDE_DANJEONG_LAUNCH_PRECHECK_v1 — 단정 런칭전 점검·조정

> **발주:** 회장 2026-09-16 · 「단정을 시켜보자 · API호출문제부터 전반 버그·UI·어뷰징 · 런칭전 점검과 조정」  
> **시공:** **Claude Code** (`claude --bg` · 코딩·패치) — Desktop/채팅 Claude ✗ (설계·드롭 레인)  
> **Gate:** Cursor (채택·배포·실키·pause 해제)  
> **cwd:** `D:\Memento\projects\danjeongshot`  
> **부모:** `docs/LAUNCH_PREFLIGHT_CHECKLIST.md` · `docs/evidence/preflight/20260916/RESULTS.md`  
> **스킬:** `danjeongshot-launch` · `gemini-bill-gate` · `danjeongshot-ship-gate` · `action-once` · `outsource-to-claude`  
> **완성 전 중간보고 ✗ · 끝 = Section H만**

---

## 0. 레인 (LOCK)

| 누가 | 무엇을 |
|------|--------|
| **Claude Code** | API/과금 재검증 · 버그·UI·어뷰징 세밀 점검 · **코드 패치** · 증거 MD |
| **Claude Desktop** | 본 발주 ✗ |
| **Cursor** | Gate · `maint:gate` · pause OFF 승인 후 재측정 · Vercel env |
| **OpenCode** | **원일 팩만** (본 발주 ✗) — 끝나면 별도 「원일 UX/UI 시뮬」 발주 예정 |
| **회장님** | STUDIO_PAUSE 해제 · 실PG · 실키 |

**클로드 금지:** Tier0 / `narrative_core` · 실결제 키 채팅 노출 · pause OFF를 혼자 결정 · Drive 미러 대량.

---

## 1. 배경 (이미 아는 것)

- **과금 사고:** 1클릭 ×3~×6 (`PREVIEW_SHOT_COUNT=3` + 이중 POST + Promise.all)  
- **조치 일부:** gate 단일화 · SHOT=1 · claim/inflight · `STUDIO_PAUSE`  
- **1차 Preflight:** **NO-GO** — pause 때문에 B8(1요청=1과금) 실측 불가 · gate RED  
- 증거: `docs/evidence/preflight/20260916/RESULTS.md`

본 발주 = **그 위의 세밀 재검 + 조정안 + (승인된) 패치**.

---

## 2. 우선순위 (LOCK)

```
① API·과금 (Gemini)     ← 맨 앞
② 버그·회귀 (결제·토큰·더블클릭)
③ UI/UX 런칭면 (원클릭·연타·카피)
④ 어뷰징·보안 (rate·IDOR·로그 PII)
⑤ Gate 재실행 준비 목록 (Cursor가 돌림)
```

---

## 3. In — 세밀 점검표

### 3-A. API·과금 (P0 · 최우선)

| # | 할 일 | Done-when |
|---|--------|-----------|
| A1 | `PREVIEW_SHOT_COUNT === 1` 전경로 확인 | 상수·env·이스터에그 우회 ✗ |
| A2 | Gemini HTTP = `geminiBillGate` **단일 출구** | `rg GoogleGenAI` / `@google/genai` → gate만 |
| A3 | generate 라우트 SDK 직접 호출 0 | app 라우트 전수 |
| A4 | 티켓 `hardMax≤3` · 기본 maxCalls=1 | 코드+주석 |
| A5 | 이중 POST / 연타 → **1회만** (`action-once` + claim) | UI busy + 서버 claim |
| A6 | preview / extra / layout / regen **각각** 과금 배수 표 | 호출 스택 1페이지 |
| A7 | bill 로그 스키마 · callIndex · ops bill-log | 키·경로 · 민감값 ✗ |
| A8 | pause·`PREVIEW_EMERGENCY` 킬스위치 문서화 | ON/OFF 절차 3줄 |
| A9 | **pause OFF 전제** 1클릭=1과금 실측 계획 | Cursor Gate용 절차서 (실측은 Gate) |

### 3-B. 버그·회귀

| # | 할 일 |
|---|--------|
| B1 | 결제 SoT / replication-lag 오신뢰 재발 ✗ |
| B2 | 구토큰·paid 토큰으로 무제한 재생성 ✗ |
| B3 | claim TTL · 동시 탭 · 뒤로가기 재제출 |
| B4 | download vault · `PREVIEW_QUOTA_SECRET` 불일치 → 410 |
| B5 | `MOCK_GENERATE` 프로덕션 0 확인 방법 |
| B6 | 금액 클라 신뢰 ✗ · 서버 재검증 |
| B7 | 셀카 가이드·업로드·보정 플로우 깨짐 (최근 SelfieFrameGuide 등) |

### 3-C. UI/UX (런칭면 · 시뮬 수준)

| # | 할 일 |
|---|--------|
| U1 | 원클릭 결제 HARD 유지 (`CLAUDE_DANJEONG_UX_P0_v1`) |
| U2 | 모든 **액션 CTA 연타=1회** (생성·결제·다운로드·재생) |
| U3 | 여권·관공서·앱스토어 CTA · 과장 카피 ✗ |
| U4 | 에러/503/pause 시 사용자 문구 (기술 스택 노출 ✗) |
| U5 | 모바일 1뷰포트 · 로딩·실패 복구 경로 |
| U6 | (선택) Playwright/수동 시나리오 5개 체크리스트 |

### 3-D. 어뷰징·보안

| # | 할 일 |
|---|--------|
| X1 | preview·checkout rate / abuse-sim 한도 |
| X2 | IDOR: orderId만으로 상태변경 ✗ |
| X3 | 로그에 prompt/image/api_key ✗ |
| X4 | maint/ops 시크릿 헤더 |
| X5 | `SECURITY_REVIEW_FINDINGS_v1` Critical/High 잔여 → 패치안 또는 수용 근거 |
| X6 | High#1 extra/layout 실과금 경로 확정 |

---

## 4. Out

- OpenCode 원일 급여/근태 시공 ✗ (병렬 레인)  
- STUDIO_PAUSE 무단 OFF · Production 실키 스위치 ✗  
- Product Hunt / 대량광고 채널 강제 ✗  
- narrative / Kapasi 정본 쓰기 ✗  
- 「전부 다시 설계」장문 ✗ — **구멍·패치·증거**

---

## 5. 산출물 (골수)

1. `docs/evidence/preflight/20260916b/` (또는 당일 폴더)  
   - `API_CALL_MAP.md` — 화면별 Gemini/과금 호출 맵  
   - `FINDINGS.md` — 심각도 P0/P1 · 재현 · 패치  
   - `UI_ABUSE_CHECK.md` — 연타·어뷰징·카피  
2. **승인된 P0만** 코드 패치 (미승인은 표만)  
3. Section H (아래)

---

## 6. Cursor Gate가 이어서 할 일 (클로드 Out)

```
pause OFF(회장) → maint:health → maint:payment-integrity → maint:gate
→ B8 1클릭=1과금 실측 → Go/No-Go 갱신
```

---

## 7. 다음 발주 (예약 · 이번 ✗)

원일 OpenCode 팩 **Section H PASS 후**:  
`CLAUDE_WONIL_UX_UI_SIM_v1` — 근로자앱·관리자 **UX/UI 시뮬 · 버그 · UI 세밀 검사**.

---

## Muse / Claude Code 복붙

```
cwd: D:\Memento\projects\danjeongshot
Read and follow ONLY: docs/handoff/CLAUDE_DANJEONG_LAUNCH_PRECHECK_v1.md
Also read: docs/LAUNCH_PREFLIGHT_CHECKLIST.md · docs/evidence/preflight/20260916/RESULTS.md
Priority: API/billing first, then bugs, UI, abuse. Patch clear P0 holes. No mid-report. End with Section H.
Out: pause OFF alone, real keys in chat, Wonil OpenCode work, narrative_core.
```

### Cursor 발주 (표준)

```powershell
cd D:\Memento\projects\danjeongshot
claude --bg --effort max --model sonnet -n "danjeong-precheck" "Read and follow ONLY: docs/handoff/CLAUDE_DANJEONG_LAUNCH_PRECHECK_v1.md Also: docs/LAUNCH_PREFLIGHT_CHECKLIST.md and docs/evidence/preflight/20260916/RESULTS.md Priority API/billing then bugs UI abuse. Patch clear P0. No mid-report. End Section H. Out: pause OFF alone, secrets in chat, Wonil OpenCode, narrative_core."
```

---

## H (끝 보고 템플릿)

- API 단일출구: <Y/N · 예외 파일>
- SHOT_COUNT=1: <Y/N>
- 연타/이중POST 가드: <어디>
- 과금 맵: <경로>
- Findings P0/P1 건수: <n/n>
- 패치 커밋/파일: <목록 또는 none>
- SECURITY High 잔여: <목록>
- 권고 Go/No-Go: < · 블로커>
- 막힘: <정확히>
- 증거 폴더: <path>
