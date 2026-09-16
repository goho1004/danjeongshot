# FINDINGS — 2026-09-16b (Claude precheck-patch)

> 대상: `CLAUDE_DANJEONG_LAUNCH_PRECHECK_v1.md` 우선순위(① 과금 ② 버그 ③ UI ④ 어뷰징).
> 표기: **패치함** = 이번 세션 코드 수정 + 로컬 검증. **수용(변경없음)** = 검토했으나 별도 결정/스코프 필요.

## P0 — 패치함

### 1. flow-e2e 블로커 — stale URL 파라미터 (버그)

- **파일:** `scripts/e2e-download-ui.mjs:97`
- **증상:** `maint:gate`가 `flow-e2e`만 RED. 스크립트가 `${BASE}/make?paid=1`로 이동하는데, 앱은 `?paid=1`을 어디서도 읽지 않음(`rg "paid=1|get(\"paid\")" src` 무매치). 실제 계약은 `useSessionRestore.ts`가 명시하듯 `/make?resume=1` 또는 `/result`뿐 — CS 카피·환불 라우트·SiteFooter 등 앱 전역이 이미 `/make?resume=1`을 표준으로 씀. `enabled=false`라 세션 복원 자체가 안 일어나서 "save/receive 버튼 없음"으로 실패.
- **재현(수정 전):** 로컬 서버에서 스크립트 실행 → `no save/receive button` stderr, exit 1.
- **패치:** `?paid=1` → `?resume=1` (1줄).
- **검증:** 로컬 샌드박스(`MOCK_GENERATE=1`)에서 `node scripts/e2e-download-ui.mjs` → `E2E_PASS`. `npm run maint:gate`(로컬) 전체 **GREEN**, `failures: []`.
- **결론:** 앱 버그가 아니라 스모크 스크립트가 구 계약을 참조. 프로덕션 사용자 플로우는 원래부터 정상이었을 가능성이 높음(카피/CS 문서가 전부 `resume=1` 기준) — 다만 이 스크립트가 유일한 자동 회귀 검증이었으므로 그동안 진짜 UI 회귀가 있었어도 못 잡았을 위험은 있었음.

### 2. checkout/complete 무료 paid 부여 + proto/agents 무인증 (보안 — 이전 세션 패치가 병합 안 됨)

- **파일:** `src/app/api/checkout/complete/route.ts`, `src/app/api/proto/agents/route.ts`
- **경위:** 이전 Claude precheck 세션(worktree `danjeong-precheck-20260916b`, commit `aa106a3`)이 이미 이 두 구멍을 찾아 고쳤으나, **그 worktree 브랜치가 master에 병합되지 않은 채 방치**되어 master(=현재 라이브 코드)는 여전히 취약한 상태였음. 이번 세션에서 master의 현재 작업 상태를 기준으로 동일 수정을 재적용.
- **2-a. checkout/complete:** `PAYMENT_MODE=toss` 전환 후에도 이 라우트는 `getPaymentMode()`를 전혀 확인하지 않고 누구나 `{orderId, orderTicket}`만 보내면 `paid:true`를 무료로 부여. 클라이언트는 샌드박스에서만 이 라우트를 부르지만 그건 라우팅일 뿐 인가가 아님 — API 자체가 열려 있으면 실결제 전환 즉시 무료 결제 우회가 생김.
  - **패치:** `getPaymentMode()==="toss" && !isMaintSmokeRequest(req)` → 403. 샌드박스 모드(현재)는 동작 무변화.
- **2-b. proto/agents:** `GET`(대리점 커미션·정산 데이터 전체 노출)과 `POST action=seed|clear`(가짜 결제 주입 / 원장 전체 삭제)에 인증이 전혀 없었고, `/proto/agents` 페이지에 "시드"/"원장 비움" 버튼이 그대로 연결되어 있었음.
  - **패치:** 둘 다 `isMaintSmokeRequest` 게이트 추가 (`ops/*` 라우트와 동일 컨벤션).
  - **트레이드오프(수용):** `/proto/agents` 페이지는 브라우저에서 직접 열면 이제 GET도 403 — 대리점 운영자가 이 화면을 실제로 봐야 한다면 admin 세션 인증으로 별도 교체가 필요함. "proto"(프로토타입) 경로이고 파괴적 시드/삭제 버튼이 무인증으로 열려 있던 게 더 큰 위험이라 판단해 그대로 잠금.
- **검증:** 로컬 서버 curl — 헤더 없이 GET `/api/proto/agents` → `403`; 헤더 포함 → `200`. `next build` 34/34 클린.

### 3. alreadyPaid 응답이 orderId만으로 unlockToken을 내줌 (보안 — SECURITY_REVIEW #2 확장)

- **파일:** `src/app/api/checkout/confirm/route.ts`, `src/app/api/checkout/complete/route.ts` (두 곳 모두 동일 패턴 — `confirm`만 원 발견표에 있었고 `complete`는 이번에 추가로 발견)
- **문제:** `order.paid`가 이미 true면, 호출자가 유효한 `orderTicket`을 갖고 있는지 검증하지 않고 바로 `unlockToken`을 응답에 포함. `orderId`는 64bit 난수라 무작위 추측은 어렵지만, 로그·리퍼러·URL 등으로 orderId만 새어나가도 그 주문의 unlockToken(진짜 비밀)을 오라클처럼 받아갈 수 있음 — redo/asv 소진, 다운로드 등 타인 주문 그리핑 가능.
- **패치:** `alreadyPaid` 분기 진입 조건에 `orderTicket && unsealOrder(orderTicket)?.id === orderId` 소지 증명 추가. 실패 시 403 `TICKET_REQUIRED`. 정상 클라이언트는 successUrl에서 항상 orderTicket을 같이 보내므로(코드 주석·`csTriage.ts` 등에서 확인) 무변화.
- **검증(로컬):** 티켓 포함 최초 결제 → 200. 이후 `{orderId}`만(티켓 없이) 재호출 → **403 TICKET_REQUIRED**(수정 전이면 200+토큰 유출). 유효 티켓으로 재호출 → 200 `alreadyPaid:true`(정상 흐름 무변화).

### 4. checkout에 rate limit 없음 (SECURITY_REVIEW #5)

- **파일:** `src/app/api/checkout/route.ts`
- **문제:** `/api/generate`와 달리 `/api/checkout`은 아무 제한이 없어 대량 POST로 Upstash에 주문을 무제한 적재(7일 TTL) 가능 — `complete` 스팸의 토대.
- **패치:** `generateGate.ts`와 동일한 `durableIncr` 패턴으로 IP당 분당 10 / 시간당 60 (env `CHECKOUT_PER_IP_MINUTE`/`CHECKOUT_PER_IP_HOUR`로 조정 가능) 신설. `isMaintSmokeRequest`는 우회(운영 게이트 스크립트가 막히면 안 됨).
- **부수 발견:** 이 게이트를 넣고 보니 `prepPaid.mjs`/`payment-integrity.mjs`/`smoke-flow.mjs`의 `checkout()` 호출이 (같은 파일의 `complete`/`generate` 호출과 달리) maint 헤더를 안 보내고 있었음 — 반복 실행 시 자기 자신이 새 제한에 걸릴 뻔함. 세 파일 모두 헤더 추가로 같이 수정(같은 함수 내 기존 패턴과 동일하게 맞춘 것 — 새 컨벤션 도입 아님).
- **검증(로컬):** `/api/checkout` 연속 12회 POST → 처음 10개 `200`, 11·12번째 `429`. 이후 `maint:gate` 전체 재실행 GREEN(자기 차단 없음 확인).

## High — 검토했으나 변경 없음 (수용, 근거 명시)

### High#1 — extra/layout 실결제 없이 entitlement 부여

- **파일:** `checkout/extra/route.ts`, `checkout/layout/route.ts`
- **현재 상태 재확인:** 두 라우트 모두 Toss 승인 호출이 없고 무조건 entitlement를 준다는 원 발견은 여전히 사실. 다만 **문구는 이미 정직화되어 있음**(커밋 `489f05f`, master에 이미 반영·이번 세션 이전): `notice`가 `"추가 컷 무료 제공"`, `"레이아웃 ₩N (정식 결제 준비 중 · 지금은 무료)"`처럼 **명시적으로 "무료"라고 밝힘** — 결제된 것처럼 속이는 문구는 없음. `amountKrw`는 향후 가격 표시용으로만 응답에 실림.
- **판단:** 이건 "버그"가 아니라 제품 결정(Option A 실토스연동 vs Option B 문구정직화) 사안이고, 이미 Option B가 선택·배포되어 있음. Option A(실제 Toss Billing 연동)는 PG 승인 플로우·가격 정책 변경을 동반하는 별도 기능 작업이라 이번 "명확한 P0 구멍 패치" 세션 범위를 벗어남 — 코드를 더 건드리지 않고 **현상 유지 + 근거 기록**으로 처리.
- **남은 결정(회장/Cursor):** 런칭 시점에 Option A로 갈지, 계속 "무료 보너스"로 유지할지 확정 필요. 후자라면 이 표는 그대로 닫아도 됨.

## Med/Low — 원 발견표 그대로 (SECURITY_REVIEW_FINDINGS_v1.md 참조, 변경 없음)

| # | 요약 | 이번 세션 판단 |
|---|------|------|
| #3 | pre-pay 토큰으로 redo/asv/download 인스턴스 어피니티 우회 가능성 | 재현 100% 아님(어피니티 의존) · 카운터 한도 내 · 변경 없음 |
| #4 | Upstash 장애 시 fail-open | `CONCURRENCY.md`에 기지 한계로 문서화됨 · 가용성 트레이드오프라 제품 결정 필요 · 변경 없음 |
| #6 | refund 조회 무인증(orderId만) | 개인정보·이미지 없음, 제품 결정 사안 · 변경 없음 |
| #7 | easter strip 클라 플래그로 통과 | 보너스 성격, 실해 낮음 · 변경 없음 |
| #8 | 봉인키 폴백 체인 | 현재 prod 키 설정되어 미발현 · 변경 없음 |
| #9 | markRedo/Asv durable 반환값 버림 | 좁은 레이스 · 변경 없음 |
| npm audit | next(Critical, 플래그) · sharp/postcss/nanoid(High) | breaking 검토 필요, 표만 유지 |

## 요약

- 이번 세션 패치: **4건** (flow-e2e 스크립트 1줄, checkout/complete 인가 재도입, proto/agents 인가 재도입, alreadyPaid 토큰 오라클 2곳, checkout rate limit 1곳 + 연동 스크립트 3곳) — 파일 8개, +78/-8줄.
- 전부 로컬 샌드박스(`MOCK_GENERATE=1`, `PAYMENT_MODE=sandbox`)에서 `next build` 클린 + `npm run maint:gate` **GREEN**(`failures: []`, flow-e2e 포함)으로 검증.
- 프로덕션 라이브 재측정(pause OFF 후 B8 1클릭=1과금 실측, `maint:gate --base https://danjeongshot.vercel.app`)은 레인 분리 원칙상 Cursor Gate 담당 — 이번 세션에서 실행하지 않음.
