# FINDINGS — 20260916b (Claude Code precheck)

> 실행: Claude Code (`claude --bg`) · 격리 워크트리 `.claude/worktrees/danjeong-precheck-20260916b`
> 기준 상태: 세션 시작 시점 shared checkout의 pending WIP(uncommitted, `geminiBillGate.ts`/`SelfieFrameGuide.tsx`/ops 3라우트 포함) 그대로 이식 후 그 위에서 점검.
> 검증 방법: 코드 리딩 + `npm run build`(실제 프로덕션 빌드, 로컬) — Vercel·실배포·pause OFF는 Out.

## 요약

| 심각도 | 건수 | 패치 |
|---|---|---|
| **P0** | 5 (3건은 동일 파일 build-blocking 결함 묶음) | **전부 패치 완료, 이 세션에서** |
| P1 | 3 | 표만 (승인 대기) |
| 기존 보안리뷰 잔여 (Med/Low) | 9건 중 8건 | 변동 없음 — 표만 유지 (재확인만) |
| 기존 보안리뷰 High#1 | 1건 | **해소 확인** (Option B 배포 확인, Option A는 여전히 승인대기로 유지) |

---

## P0-0 · `geminiBillGate.ts` 빌드 자체가 깨져 있었음 (신규 발견)

**심각도:** P0 — billing-critical 파일이 `npm run build`를 통과하지 못함. 이 상태 그대로면 pending WIP는 **배포 자체가 불가능**(Vercel도 동일하게 build 단계에서 실패).

- **원인 1 (문법 오류, 빌드 전체 중단):** `recordBillEvent()`의 `billed: partial.billed ?? partial.event === "http_start" || partial.event === "http_ok"` — `??`와 `||`를 괄호 없이 섞음. Next.js SWC 파서가 `Syntax Error`로 **컴파일 자체를 거부**(`next build` 즉시 실패, webpack 단계).
- **원인 2 (타입 오류):** `listBillLogs()`에서 `kvLrange()`(반환 타입 `string[] | null`)의 결과를 null 체크 없이 바로 `.map()` — `next build`의 타입체크 단계에서 실패.
- **원인 3 (타입 오류 ×2):** `summarizeBillAbuse()`에서 `[...map.entries()]` 스프레드가 tsconfig에 명시적 `target` 부재로 `--downlevelIteration` 요구 오류 발생 — `next build` 타입체크 단계 실패.

**재현:** 패치 전 상태에서 `npm run build` → `Failed to compile` (3회 반복, 매번 다른 지점에서 실패 — 스택 순서: 문법오류 → null오류 → iterator오류).

**패치:** `src/lib/geminiBillGate.ts` 4곳 — ① `??`/`||` 괄호로 분리(런타임 동작은 기존과 동일: 유일하게 override 안 되는 `http_ok` 경로는 모든 호출부가 이미 `billed:true`를 명시 전달하므로 두 해석 모두 결과 동일 — 순수 컴파일 오류 수정, 로직 변경 없음). ② `raw ?? []`로 null 가드. ③④ `[...x.entries()]` → `Array.from(x.entries())` (tsconfig `target` 등 프로젝트 전역 설정은 건드리지 않음 — 최소 diff).

**검증:** 패치 후 `npm run build` → **`✓ Compiled successfully` + 34/34 페이지 생성 GREEN** (아래 RESULTS.md 참조 — 실제 빌드 로그 확인).

**프로세스 관찰 (P1로 별도 기재):** `scripts/maint/gate.mjs`는 실행 중인 서버에 HTTP만 쏘는 스모크 체크이며 **`npm run build`(또는 `tsc --noEmit`)를 내부에서 실행하지 않음** — 그래서 이 빌드-차단급 결함이 `maint:gate` GREEN/RESULTS.md B1-B7 PASS 판정과 공존할 수 있었음(그 판정들은 이미 배포된 구버전 서버 또는 `next dev` 대상이었지, 이 pending WIP의 `npm run build` 자체를 검증한 적이 없음). 재발 방지책은 P1-3 참조.

---

## P0-1 · `checkout/complete` 가 실결제(toss) 모드에서도 무료로 paid를 발급

**파일:** `src/app/api/checkout/complete/route.ts`
**클래스:** 2 (결제 무결성) · **재현 확실** · **매출 직결**

**설명:** 이 라우트는 주석부터 "샌드박스 즉시 결제 완료"라 명시하고 `MAINTENANCE.md §5`도 sandbox 전용 경로로 문서화하지만, 코드에는 `getPaymentMode()` 체크가 전혀 없었음. `POST {orderId, orderTicket}`만 있으면 결제모드와 무관하게 `markPaidDurable()`로 즉시 `paid:true` 부여.

프런트(`useCheckout.ts`)는 `mode==="toss"`일 때 이 라우트를 호출하지 않고 토스 위젯 경로로 분기하지만, 이건 **클라이언트 라우팅일 뿐 서버 인가가 아님** — API를 직접 두드리면 우회 가능.

**재현:**
```
POST /api/checkout          → {orderId, orderTicket, mode:"toss", ...}
POST /api/checkout/complete → {orderId, orderTicket}   (토스 결제창 생략)
→ (패치 전) paid:true, unlockToken 발급, 이후 /api/generate 정상 통과 — 0원 결제
```
`scripts/maint/checks/payment-integrity.mjs`의 자체 "complete" 체크(성공 = PASS)가 사실상 이 우회를 매번 검증해 온 셈 — smoke가 exploit과 동일 경로.

**패치:** `getPaymentMode() === "toss"`이고 `isMaintSmokeRequest(req)`(기존 `MAINT_SMOKE_SECRET`/`x-djs-maint-smoke` 패턴 그대로 재사용)가 아니면 403 `TOSS_MODE_REQUIRES_CONFIRM`. sandbox 모드(현재 기본값)에서는 동작 무변화 — 회귀 없음. maint smoke 스크립트들은 이미 `maintHeaders()`로 해당 헤더를 보내고 있어 내부 검증 경로는 그대로 유지됨(`payment-integrity.mjs` 주석이 애초에 이 동작을 전제로 쓰여 있었음 — "toss prod: MAINT_SMOKE_SECRET … complete 생략(샌드박스)").

**영향 범위:** 현재 `PAYMENT_MODE=sandbox`(기본)라 지금 당장 금전 피해는 없음. 그러나 이 코드가 이대로 `PAYMENT_MODE=toss`(C-Day 전환, `LAUNCH_DDAY.md` C8)로 배포됐다면 **결제 전수 우회**가 가능했음 — 출시 전에 반드시 필요한 수정이었음.

---

## P0-2 · `/api/proto/agents` 무인증 — 대리점 재무데이터 열람 + 원장(ledger) 파괴적 쓰기

**파일:** `src/app/api/proto/agents/route.ts` (+ 페이지 `src/app/proto/agents/page.tsx`)
**클래스:** 1·2 (인증 부재 + 데이터 무결성) · **재현 확실** · **가장 큰 blast radius**

**설명:** `GET`은 모든 대리점(파트너)의 수수료율·정산주기·보류잔액·GMV·정산 계산 결과를 인증 없이 반환. `POST`는 `action=seed`(기본값 — action 생략 시에도 실행됨)로 대리점당 가짜 ₩9,900 주문을 **실제 원장**(`agentLedger.ts` — `orders.ts markPaid()`가 실결제 건에도 쓰는 바로 그 원장)에 주입하거나, `action=clear`로 **원장 전체를 삭제**. 페이지(`/proto/agents`)는 로그인·비밀번호·시크릿 헤더 등 어떤 게이트도 없이 "시드"·"원장 비움" 버튼을 그대로 노출 — URL만 알면 누구나 클릭 가능.

**재현:**
```
GET  /api/proto/agents                        → (패치 전) 200, 전 대리점 재무데이터
POST /api/proto/agents {"action":"clear"}      → (패치 전) 200, {ok:true, cleared:true} — 원장 전삭제
POST /api/proto/agents {"action":"seed", ...}  → (패치 전) 200 — 가짜 정산 데이터 주입
```

**패치:** GET·POST 모두 `isMaintSmokeRequest(req)` 게이트 추가(다른 `ops/*` 라우트와 동일 컨벤션) — 헤더 없으면 403. 페이지 UI 자체는 건드리지 않음(헤더 없는 브라우저 fetch는 이제 403을 받고 빈 상태로 표시됨 — 내부 도구이므로 UI 재설계는 범위 밖).

**영향 범위:** 이 원장이 실제 파트너 정산·지급 계산의 SoT이므로, launch 전 발견 못 했다면 "정산 데이터가 이유 없이 사라지거나 부풀려지는" 형태로 나타났을 High~Critical급 사고 후보. `checkout/complete` 건과 달리 sandbox/toss 모드와 무관하게 **지금 이 순간도** (배포되면) 공개 상태였을 것.

---

## P1 (표만 — 미승인·미패치)

### P1-1 · 업로드 용량 안내 문구 불일치
`src/components/make/steps/PurposeUploadStep.tsx:114` "JPG·PNG·HEIC · **20MB** 이하" vs 실제 검증 `src/hooks/make/useGenerate.ts` `file.size > 8 * 1024 * 1024`(8MB) 및 서버 `generate/route.ts`의 `imageBase64.length > 12_000_000` (≈8-9MB 원본 상당). 15MB짜리 사진을 올리는 사용자는 라벨을 믿었다가 "8MB 이하만 업로드 가능합니다" 에러로 혼란. 금전·보안 영향 없음, 10초 카피 수정 건. **패치 안 함**(P0 아님 — 승인 후 라벨을 8MB 또는 서버 실제 상한에 맞춰 수정 권장).

### P1-2 · `POST /api/cs/triage` 무인증 + 레이트리밋 없음
형제 라우트 `cs/notify`는 `OPS_CS_TOKEN`(프로덕션 필수, 미설정 시 fail-closed)으로 보호되는데 `cs/triage`는 아무 게이트 없음. `orderId`만으로 paid/downloadedAt/redoUsed/asvUsed 열람 가능(§X2와 동급 Low — PII·이미지 없음, refund GET과 동일 노출수준) + `triage.notifyWatchdog`가 true인 메시지를 보내면 **인증 없이 내부 운영 텔레그램으로 알림 발사** 가능 — 레이트리밋 없어 스팸/알림피로 유발 가능(자금·데이터 훼손 아님, 운영 방해 수준). `/ops/cs` 내부 페이지에서만 쓰이는 걸로 보여 공개 CS 위젯은 아닌 듯. **권장:** `cs/notify`와 동일한 `OPS_CS_TOKEN` 게이트 또는 최소 `durableIncr` 레이트리밋 추가. **패치 안 함**(P0 임계 아님).

### P1-3 · `maint:gate`에 실제 빌드 검증 단계 없음
위 P0-0 참조. `scripts/maint/gate.mjs`는 실행 중인 서버에 대한 HTTP 스모크만 수행 — `npm run build`/`tsc --noEmit`을 부르지 않음. 로컬 pending 변경분이 빌드조차 안 되는 상태로 며칠씩 방치될 수 있는 구조. **권장:** `maint:gate`(또는 별도 `maint:typecheck`)에 `npm run build` 또는 최소 `npx tsc --noEmit` 단계 추가. **패치 안 함**(도구 자체 변경은 이번 발주 범위 밖 — Cursor/승인 판단).

---

## 기존 `SECURITY_REVIEW_FINDINGS_v1.md` (2026-09-13, 9건) 재확인

코드 재열람으로 교차검증만 수행, 재현 재실측은 안 함(변경 없다고 판단되는 항목은 그대로 유지).

| # | 원 심각도 | 재확인 결과 |
|---|---|---|
| **#1** High — extra/layout 무과금 entitlement | **Option B(문구 정직화) 배포 확인.** `checkout/extra`·`checkout/layout` 응답 notice가 "무료 제공"/"지금은 무료"로 정직하게 표기, `PaidDonePanel.tsx`에서 "결제" 단어 제거 확인(grep — 잔여 2건 모두 "추가 결제 **없음**"류 정직 문구·코드주석). **Option A(실토스 2차결제)는 여전히 승인 대기** — 의도적 보류, 이번 세션 미변경. |
| #2 | Med — confirm alreadyPaid 재검증 없이 토큰 재발급 | 변동 없음, 코드 동일. 표만 유지. |
| #3 | Med — redo/asv pre-pay 토큰 우회 가능성(affinity 의존) | 변동 없음. 카운터 한도(각 1회) 내라 무제한 과금 구멍 아님. 표만 유지. |
| #4 | Med — Upstash 장애 시 fail-open | 변동 없음. 표만 유지. |
| #5 | Med — `/api/checkout` 자체는 rate gate 없음(주문 생성 스팸 가능,과금과 무관) | 변동 없음. 표만 유지. |
| #6 | Low — refund GET 무인증 정보열람(paid/downloadedAt 등) | 변동 없음. 표만 유지. |
| #7 | Low — `easterStrip` 결제게이트 없음 | 변동 없음. 표만 유지. |
| #8 | Low — `PREVIEW_QUOTA_SECRET` 부재 시 하드코드 폴백 | 변동 없음(현재 prod는 `GEMINI_API_KEY` 필수라 미발현). 표만 유지. |
| #9 | Low — `markRedo/AsvDurable` 클레임 실패 시 처리 | 변동 없음. 표만 유지. |

npm audit(2026-09-13 표): Critical 1(next/rollup, 14.x 유지 권장) · High 3(sharp/postcss/nanoid) — 이번 세션 재실행 안 함(범위 밖, 변경 근거 없음).

---

## PASS 확인 (코드 근거, 회귀 없음)

- A1-A5, A7, A8: `API_CALL_MAP.md` 참조 — 전부 코드상 PASS.
- B6(금액 서버신뢰), B7(SelfieFrameGuide는 순수 프레젠테이션, 업로드 로직 무변경) — PASS.
- X1(다층 rate limit), X3(로그 스키마 PII 없음), X4(ops 라우트 시크릿 헤더 — `bill-log`/`generate-log`/`product-analytics` 3곳 모두 확인) — PASS.
- U1(원클릭 하드룰 — `CLAUDE_DANJEONG_UX_P0_v1.md` 대조), U2(연타 가드 — `inflightRef` 공유), U3(여권·관공서·앱설치 카피 전수 grep, 전부 부정 고지 또는 무관한 3자 파트너 링크) — PASS.
