# 20260917 DOUBLE_CALL + CODE HEALTH AUDIT (AUDIT ONLY — no patch)

> 발주: `docs/handoff/OPENCODE_DANJEONG_BUG_AUDIT_ONLY_v1.md` · 시공 OpenCode · 고치기/패치/PR 모두 ✗
> 워크스페이스 `D:\Memento\projects\danjeongshot` · 브랜치 `master` (20260916b precheck 병합본, HEAD `229f84e` 부근)
> 관측: AI Studio `DanJoung Gemini` 로그에 같은 분 Interactions 2줄(또는 여러 줄), 예 `9/16 06:08`, 프롬프트 `Professional Korean resume headshot…`, 모델 `gemini-3.1-flash-lite-image`, 200, I/O ~1450/~1450
> 방법: 읽기만. 소스 수정 0. `narrative_core`·시크릿 값 출력 0. 아래 줄번호는 현재 master 실측.

---

## 1. 이중(다중)콜 원인 판정표 — 확정 / 유력 / 기각

### 1.1 한 줄 결론 (상세는 표)

- 현재 master에서 **정상 1클릭(첫 컷 1회) = Gemini HTTP 1회 = Studio Interactions 기대 1줄**. 코드상 `PREVIEW_SHOT_COUNT=1` + `ticket{maxCalls:1}` + 순차 1회 호출로 고정됨.
- 회장 관측(같은 분 N줄)은 **현재 master 단일 preview 1클릭의 코드 버그로 재현 불가**. 가장 설득력 있는 해석은 (a) 과거 3컷 코드 시점 로그이거나, (b) `preview + redo + asv` 같은 **정상 다단계가 같은 분에 찍힌 것**이거나, (c) **주문이 다른 재클릭/재결제**이거나, (d) **Studio 목록 집계 착시** 중 하나. 코드·로그 join 없이는 단정 불가이므로 아래를 확정/유력/기각으로 분리한다.
- 진짜로 현재 master에 남은 **과금 2배 지출 가능 코드 경로**는 preview 이중POST가 아니라 **`redo/asv의 check-then-act 역전 레이스**(Gemini 호출 후 mark, §3 P0-1) + **Upstash fail-open 시 claim 무력화**(§3 P0-2)뿐이다.

### 1.2 판정표

| # | 가설 | 판정 | 근거 (파일·줄) | 비고 |
|---|------|------|----------------|------|
| A | 구 `PREVIEW_SHOT_COUNT=3` + `Promise.all` N연발이 같은 분 3줄을 만들었다 | **확정(과거분)** / 현재분은 **기각** | `src/lib/easterEgg.ts:81` 현재 `=1` 하드코드, env 오버라이드 경로 없음. `src/app/api/generate/route.ts:485` `slotMeta` 길이는 1, `:551-555` 명시 `순차 1컷 — Promise.all N연발 ✗` + `slotMeta.slice(0,1)`로 1회만 `callLite`. `docs/LAUNCH_PREFLIGHT_CHECKLIST.md:39` 사고메모 “과거 1클릭 ×3~×6 (`SHOT_COUNT=3` + `Promise.all` + 이중 POST)”. `docs/handoff/CLAUDE_DANJEONG_LAUNCH_PRECHECK_v1.md:29` 동일. `docs/evidence/preflight/20260916/RESULTS.md:16` B1 PASS SHOT=1 | 9/16 06:08 로그가 패치·배포 전旧배포에서 찍혔으면 설명됨. 현재 master에서는 코드상 재현 불가. 배포시각 대조 필요(§2). |
| B | 같은 티켓에서 `callLite1K`가 2회 발사됐다 (서버 루프 버그) | **기각** | `src/lib/geminiBillGate.ts:289-293` `maxCalls=min(req,hard≤3)`, `:339-353` `spent>=maxCalls→budget_block` HTTP 미발사, `:355` `spent+=1` 후 `:358-368` `http_start` 1회. `route.ts:522-525` preview `openGeminiTicket({ticketId:preview:orderId,maxCalls:1})`, `:553-555` 루프 1회. `:623-638` redo/asv 동일 1회. 티켓 재사용 없음(요청당 신규 티켓) | 동일 `ticketId`에 `http_start≥2`면 `summarizeBillAbuse`가 `MULTI_HTTP_SAME_TICKET`으로 잡음 (`geminiBillGate.ts:216-227`). `/api/ops/bill-log`에서 해당 분 `multiHttpTickets` 확인이 검증법 |
| C | `interactions.create` 1회가 Studio에 2줄로 보인다 (SDK/표시 문제, 실제 HTTP 1회) | **유력(표시 가설, 미확정)** | `src/lib/geminiBillGate.ts:372-387` `ai.interactions.create({model,input:[text,image],response_format:{type:image,aspect_ratio:3:4,image_size:1K}})` 단일 await. 전수 `rg GoogleGenAI\|@google/genai src` → 이 파일 1곳만 (`docs/evidence/preflight/20260916b/API_CALL_MAP.md:3` 재확인). HTTP 재시도·루프 없음 | Studio가 request/response, input/output, 또는 image+text 파트를 각각 1줄로 펼치면 1 HTTP가 N줄처럼 보임. 코드로 부정도肯定도 불가. `bill-log http_start` 1건 vs Studio N줄 대조가 유일한 확정법. 토큰 ~1450/~1450 동일은 1회 호출의 in/out일 수도 있음 |
| D | 클라 이중 submit (더블클릭·연타·StrictMode 리마운트) | **기각(현재 master preview 한정)** — redo/asv는 별도 §3 P0-1 | `src/hooks/make/useGenerate.ts:78-80` `inflightRef+busyKind` 가드, `:231-232` redo/asv 동일. `src/components/make/steps/FirstCutButton.tsx:26-33` `canClick=paid&&selfie&&!busyKind` + `disabled`. 결제 후 자동 generate 없음: `src/hooks/make/useCheckout.ts:195`는 `goResult()` 이동만, `src/app/make/payment/success/page.tsx:73-116`은 `confirm` 후 `router.replace(/result)`만, `src/components/make/MakeStudio.tsx:274-285`는 `FirstCutButton` 수동 클릭. `src/app/layout.tsx`에 `<StrictMode>` 없음(dev 중복마운트 가설 기각, prod도 해당 없음) | 서버가 이중POST를 받아도 `route.ts:268-274` `claimPreviewGenerate` 120s + `:248-267` `CUT_ALREADY 409`로 2번째 HTTP 차단. 클라 가드+서버 claim 이중벽. 단 redo/asv는 claim 없음 → P0-1로 분리 |
| E | 결제 후 자동 generate / success 페이지 재호출 / resume 복원 루프가 1결제에 N발 | **기각** | 위 D와 동일 파일. `payment/success`는 `/api/checkout/confirm`만 호출, `/api/generate` 호출 0. `useSessionRestore.ts:18-24`는 `/make?resume=1·/result`에서 복원만, generate 발사 없음. `usePersistPaidSession`은 persist만 | “결제 1번에 생성 2번” 자동경로 없음 |
| F | preview→redo→asv 정상 3단계가 같은 분에 N줄로 찍혔다 (사양 내 과금) | **유력(가장 Dawson한 현행 설명)** | `route.ts:623-626` redo/asv도 `openGeminiTicket({ticketId:stage:orderId,maxCalls:1})` + `:634-638` 1회 호출. `API_CALL_MAP.md:13-15` “돈 나가는 경로는 preview/redo/asv 세 곳뿐, 전부 1회”. `orders.ts:58-59` `REDO_LIMIT=1,ASV_LIMIT=1`, `canRunRedo/canRunAsv:489-525` 순서 강제(redo 후 asv). 합법 최대 1주문당 3 HTTP | 프롬프트가 베이스 동일+`variantIndex`만 달라 토큰이 ~1450/~1450로 거의 동일하게 보임. Studio에서 분 단위 그룹핑하면 “같은 분 2~3줄” 정상. stage 구분 없이 세면 오해. `generate-log stage`별 카운트로 검증 가능 |
| G | 서로 다른 orderId의 재결제/재시도가 같은 분에 찍혔다 (사용자·테스트 연타) | **유력** | `src/app/api/checkout/route.ts:29-50` 주문 생성은 rate-limit만(분10/시간60), 결제 유료화 없음(sandbox). `useCheckout.ts:78-84` checkout 가드는 있으나 주문 N개 생성 자체는 막지 않음. preview claim·CUT_ALREADY는 orderId 스코프(`orderDurable.ts:33-35,197-215`)라 주문이 다르면 각각 1 HTTP 정상 | 같은 프롬프트·같은 토큰량으로 N줄이 찍히는 자연스러운 경우. Studio만 보고 “이중” 단정 불가, `bill-log orderPrefix`/`generate-log orderPrefix`로 order 분리 필요 |
| H | 실패 재시도·새로고침이 같은 티켓/주문으로 재발사 | **기각(preview)** / redo/asv는 P0-1 참조 | preview: `claimPreviewGenerate` TTL 120s(`orderDurable.ts:37`) 실패해도 해제 없음 → 재시도는 `PREVIEW_INFLIGHT 429`로 HTTP 미발사(UX 문제이지 과금 문제 아님). 성공 후 재시도는 `CUT_ALREADY 409`(`route.ts:248-267`). `useGenerate.ts:104-112,256-261` 실패 시 `fail()` 후 리턴, 자동 재시도 없음 | preview 재시도로 2배 과금 불가. 반대로 “실패 후 120초 재시도 불가”는 P1 UX 버그로 §3에 기록 |
| I | 구 pre-pay 토큰 재사용 무제한 preview가 N줄을 만들었다 | **확정(과거분)** / 현재분 **기각** | `src/lib/orderPaid.ts:10-22` 현재 pre-pay 토큰 재사용 차단(`!fromToken.paid→null`). 경위 `docs/handoff/OPENCODE_FULL_SMOKE_ERROR_SIM_v1.md:235` “원래 구멍, `36cf7f1`에서 차단”. `FINDINGS.md` payment-integrity ALL OK | 9/16 06:08 이전 배포면 가능, 현재 master는 불가 |
| J | free-correct / mock / extra / layout 경로가 Gemini를 쐈다 | **기각** | repo 전수 `free-correct|freeCorrect` 무매치(본 감사 `grep`). `route.ts:496-519,608-621` mock 분기는 `noteGen(geminiCalls:0)` 후 로컬 sharp, HTTP 0. `checkout/extra/route.ts`·`checkout/layout`은 `previewVault clean PNG 재사용/클라 합성`, Gemini 호출 0 (`API_CALL_MAP.md:16-20`) | 과금 배수 대상 아님. extra/layout은 “결제문구 있으나 실청구 없음” 별개 이슈(§3 P1-1) |
| K | Vercel/브라우저 네트워크 재전송이 서버에서 2회 처리됐다 | **낮음(기각에 가까움)** | preview는 `kvSetNx` 원자 claim(`upstashKv.ts:121-135`, `orderDurable.ts:197-215`)으로 2번째는 429. 단 Upstash 없음/오류 시 `null→메모리 Map` 폴백(`:208-214`)이라 멀티인스턴스에서 무력화 → §3 P0-2로 승격 기록. 단일 인스턴스·Upstash 정상 시 기각 | Upstash 장애 시간대와 Studio 다중줄 시간대 대조가 검증법 |

### 1.3 Cursor 가설 3종 재검증 결과

- 구 `PREVIEW_SHOT_COUNT=3`: 과거원인으로 확정, 현재 master 원인이 아님(§A).
- 연타: preview는 클라+서버 이중벽으로 기각, redo/asv 레이스만 잔존(P0-1).
- Studio 목록 착시: 코드로 반증 불가, 유력 가설로 유지. 확정에는 `bill-log http_start` vs Studio 줄수 join이 필수.

---

## 2. 재현 시나리오 — 클릭 1회당 기대 Studio 줄 수

### 2.1 현재 master (HEAD `229f84e` 부근, SHOT=1)

| 시나리오 | 서버 `/api/generate` POST 수 | Gemini HTTP (`http_start`) | Studio Interactions 기대 | 서버 로그 기대 |
|---|---|---|---|---|
| `/result`에서 “컷 만들기” 1클릭 → 성공 | 1 | 1 | **1** | `bill-log: ticket_open,http_start,http_ok` 1세트. `generate-log: stage=preview geminiCalls=1 geminiOk=1 ok=true` |
| 같은 주문으로 “컷 만들기” 연타(더블클릭) | 1~2 POST 도착 가능 | **1** (2번째는 `budget_block` 아닌 `PREVIEW_INFLIGHT`/`CUT_ALREADY`로 HTTP 전 차단) | **1** | 2번째는 `generate-log code=PREVIEW_INFLIGHT` 또는 `CUT_ALREADY`, `billed:false` |
| 성공 후 새로고침·재클릭(같은 orderId) | POST는 감 | 0 | 0 추가 | `409 CUT_ALREADY`, `generate-log code=CUT_ALREADY geminiCalls=0` |
| 실패(EMPTY/PROVIDER) 후 120초 내 재클릭 | POST는 감 | 0 | 0 추가 | `429 PREVIEW_INFLIGHT` (claim 미해제 — UX 버그 P1-2) |
| “다시 만들기”(redo) 1클릭 → 성공 | 1 | 1 | **1 추가** (주문 누적 2) | `ticket redo:orderId http_start/ok` |
| redo 후 “한 번 더”(asv) 1클릭 → 성공 | 1 | 1 | **1 추가** (주문 누적 3) | `ticket asv:orderId http_start/ok` |
| 1주문 풀코스(preview+redo+asv) | 3 | 3 | **3 (정상)** | stage별 3세트. Studio 분 단위 합산 시 “같은 분 3줄”로 보일 수 있음 |
| sandbox 재결제(새 orderId) 후 첫 컷 | 1/주문 | 1/주문 | 주문 수만큼 증가 (정상) | `orderPrefix`가 다름으로 구분 |

### 2.2 구코드 (사고메모 기준, 현재 아님)

- `SHOT_COUNT=3` + `Promise.all` + 이중POST 시절: 1클릭 → 최대 3(HTTP 병렬) × 이중POST 2 = **최대 ~6줄** (`docs/LAUNCH_PREFLIGHT_CHECKLIST.md:39`, `CLAUDE_DANJEONG_LAUNCH_PRECHECK_v1.md:29`).
- pre-pay 토큰 재사용 시절(`36cf7f1` 이전): 같은 구토큰으로 preview 무제한 재발사 가능 → 분당 N줄 가능.
- 현재 master와 혼동 금지. 9/16 06:08 로그의 배포 버전 확인이 선행 검증이다: Vercel 배포 커밋시각 vs `SHOT=1` 반영 커밋(`aeff0bf` 계열·`c07b8f0`·`5555d57` 라인) 대조, 그리고 같은 분 `bill-log orderPrefix/stage/ticketId` 분리.

### 2.3 확정용 join 쿼리 (코드 수정 없이 dashboard·log로)

1. Studio 다중줄 분(`YYYY-MM-DDTHH:MM`)을 특정 → `/api/ops/bill-log`에서 동분 `http_start`件수·`ticketId`·`orderPrefix`·`stage` 분리. `http_start==1`인데 Studio==N이면 표시가설(C) 확정. `http_start==N`이면 실제 N발, `orderPrefix` 동일+stage 동일이면 이중(버그), stage 분산이면 정상(F), prefix 분산이면 재주문(G).
2. `summarizeBillAbuse(...).multiHttpTickets`에 해당 `ticketId` 존재 여부 → 동일티켓 2발(B) 여부.
3. `/api/ops/generate-log`에서 동분 `geminiCalls` 합 vs `http`件수 → 구 3컷 잔재 여부.

---

## 3. 전체 코딩 문제 지도 — P0/P1/P2 (이번 Out: 고치지 말 것)

> “고치지 말 것” — 권고 주인만 §4에. 패치 본문 없음(발주 Out 준수).

### P0 (과금·결제·데이터 무결성에 직결)

| ID | 파일 | 한 줄 증상 |
|----|------|------------|
| P0-1 | `src/app/api/generate/route.ts:277-296,326-342,623-647` + `src/lib/orderDurable.ts:162-191` + `src/lib/orders.ts:489-532` | redo/asv가 Gemini 호출 **후**에 `markRedo/AsvDurable` — 동시 2 POST가 둘 다 `canRun` 통과 후 각각 HTTP 1발씩 쏘고 뒤늦게 1승1패. preview의 `claimPreviewGenerate` 사전방벽이 redo/asv에 없음. 2배 과금 가능 유일 현행 경로 |
| P0-2 | `src/lib/orderDurable.ts:197-215` + `src/lib/upstashKv.ts:121-135` | Upstash 없음/오류 시 `kvSetNx→null→프로세스 메모리 Map` 폴백 — Vercel 멀티인스턴스에서 preview claim·redo/asv claim 모두 무력화, 이중 HTTP 가능. fail-open 설계. `CONCURRENCY.md` 기지한계로 문서화됐다는 기술도 있으나(구 `FINDINGS.md` Med/Low #4) 과금 직결이므로 P0 유지 |
| P0-3 | `src/lib/orders.ts:64-70` + `src/lib/orderDurable.ts:86-119` | 봉인키 폴백 체인 `PREVIEW_QUOTA_SECRET→GEMINI_API_KEY→"danjeongshot-dev-order-secret"` — prod 키 미설정 시 전 인스턴스 공통 dev키로 `unlockToken/orderTicket/previewVault` 위조 가능. 현재 prod 설정됨이라 미발현이나 한 줄 오기입으로 결제·생성 전멸 |

### P1 (높음 — UX·신뢰·운영 직결, 과금 간접)

| ID | 파일 | 한 줄 증상 |
|----|------|------------|
| P1-1 | `src/app/api/checkout/extra/route.ts:40-63,105-119`, `src/app/api/checkout/layout/*`, `src/lib/purposes.ts PRICE` | extra/layout이 Toss 승인 없이 entitlement 부여 — 문구는 Option B 정직화(`489f05f`, `FINDINGS.md High#1`)이나 실청구 0. 런칭 시 Option A/B 제품결정 미확정이면 정산·표시 리스크 |
| P1-2 | `src/lib/orderDurable.ts:33-38,197-215`, `src/app/api/generate/route.ts:268-274` | preview claim 120s 실패해도 해제 없음 — Gemini 일시실패 후 120초 재시도 불가(`PREVIEW_INFLIGHT 429`). 과금Less, 이탈직결 |
| P1-3 | `src/app/api/generate/route.ts:66,179,213-220` + `src/lib/generateCallLog.ts:86-117` | `genLogCtx` 모듈 전역 가변 — 동시 요청 간 `purposeId/orderPrefix/look` 뒤섞여 장부 오기재. 과금역산·CS 추적 오염 |
| P1-4 | `src/lib/previewAssets.ts:1-79` | 클린 PNG 서버보관이 프로세스 메모리 6h TTL만 — 콜드스타트·멀티인스턴스에서 `PREVIEW_EXPIRED 410`·재다운로드 실패. vault 있으면 회피되나 UX 불안정 |
| P1-5 | `src/lib/orders.ts:252-274`, `src/lib/orderDurable.ts:86-119` | 메모리+Upstash+토큰 3원 SoT 병합(stale 토큰 방어·paid 토큰신뢰 등 분기 복잡) — 복제지연·cold 조합에서 `402 pay-required 오탐↔무제한` 경계 오동작 이력(`0a76e9e,70d3ad9,36cf7f1,d932b63`). 현재는 막혀 있으나 회귀 여지 큼 |
| P1-6 | `src/app/api/generate/route.ts:590-599,665-674` + `src/lib/generateCallLog.ts:179-204` | `geminiCalls: PREVIEW_SHOT_COUNT` 하드기재(성공/실패 무관 상수) — 실제 `http_start`와乖離 시 과금역산(`sumGeminiCalls`) 왜곡. 현재는 1이라 일치하나 상수-실측 분리 안 됨 |
| P1-7 | `src/hooks/make/useCheckout.ts:95-160`, `src/app/api/checkout/complete/route.ts:15-24` | sandbox `complete`가 클라에서만 호출되는 관행 의존 — 라우트 자체는 toss모드 게이트로 막혔으나(`6bccd62`) sandbox prod 병행 시 무료 paid 남발 구조 그대로. `PAYMENT_MODE` 전환 실수 1줄로 유료/무료 뒤집힘 |

### P2 (중·낮 — 보안·로그·부채, 수용 또는 별도 결정 필요)

| ID | 파일 | 한 줄 증상 |
|----|------|------------|
| P2-1 | `src/app/api/refund/route.ts:61-90` + `src/lib/orders.ts:448-487` | refund 조회·안내가 orderId만으로 상태 노출(`paid/downloadedAt/redo·asv`) — 64bit 난수+민감정보 없음이라 Low 수용(`SECURITY_REVIEW #6`, `FINDINGS.md` Med/Low)이나 토큰 요구로 닫는 결정 남음 |
| P2-2 | `src/app/api/generate/route.ts:69-101`, `src/lib/generateCallLog.ts:106-117`, `src/lib/upstashKv.ts:137-151` | 장부 이중화(bill-log+generate-log+product-event) + Upstash 실패 시 메모리 분기 — 인스턴스별 분열로 감사 join 어려움. `void recordBillEvent(ticket_open)`(`geminiBillGate.ts:302`) fire-and-forget 유실 가능. Vercel `await` 원칙은 `noteGen`에만 적용 |
| P2-3 | `src/lib/orders.ts:503-532`, `docs/evidence/preflight/20260916b/FINDINGS.md:62` | `markRedo/Asv durable 반환값 버림` 좁은 레이스 — P0-1의 하위 표현, counters SoT가 Redis이나 메모리 선반영과 어긋날 수 있음 |
| P2-4 | `src/lib/easterEgg.ts:237-289` | `rollEasterSlot` 주석 “3컷 중” 잔재 + `EASTER_EGG_FORCE=1` 시 `slot=min(2,shotCount-1)` — SHOT=1에서 force 슬롯 0이 아닌 잔재식. 기능 무해이나 다음 수정 시 오해 유발 |
| P2-5 | `src/app/api/checkout/route.ts:26-50`, `src/lib/generateGate.ts:13-20` | checkout 분10/시간60·generate 분4/시간20·글로벌 분30/일500이 env 산재 — 과다/과소 조정 시 과금·가용성 직결이나 현재값 근거 문서 없음 |
| P2-6 | `src/components/make/MakeStudio.tsx:84-91`, `src/hooks/make/useSessionRestore.ts:18-24` | `/make?resume=1` vs `/result?session=` 이중 복원계약 — e2e가 `?paid=1` 구계약으로 RED였던 전례(`FINDINGS.md` P0-1). 계약 문서화 없이 또 어긋날 부채 |
| P2-7 | `package.json` 간접 (`FINDINGS.md:62` npm audit 인용) | `next(Critical, 플래그)·sharp/postcss/nanoid(High)` — breaking 검토 필요, 이번 Out 제외 |

### PII·권한 메모 (지도 부록, 등급 외)

- 로그 PII: `geminiBillGate.ts:99-109,111-151` 해시·prefix·바이트수만, 프롬프트·이미지·키 미기록. `generateCallLog.ts:25-48` 메타만. `upstashKv.ts:20-30` 값 로깅 없음. 양호.
- 저장 PII: 셀피 원본 영속 저장 없음(요청 바디만 경유). 클린 PNG는 `previewAssets.ts` 메모리 6h + `previewVault` 봉인토큰(클라 경유)으로만 전달, Upstash 주문 JSON(`orderDurable.ts:45-51`)은 `unlockToken 제외·이미지 없음` 7일 TTL. 양호하나 메모리 잔존 6h·vault 탈취 시 클린 노출은 설계상 수용.
- 권한: `checkout/complete` toss게이트+`alreadyPaid TICKET_REQUIRED`(`complete:16-24,49-59`, `confirm:77-87`)는 `6bccd62`로 폐쇄 확인. `proto/agents` maint 게이트도 동일. 잔여는 P2-1 refund 무인증만.

---

## 4. 권고만 — 다음 시공 주인 한 줄 (패치 본문 없음)

- P0-1 redo/asv 사전 claim: Cursor (generate 레인, `claimPreviewGenerate` 패턴을 redo/asv로 확장 + `finishPaidSingle` 선mark 구조).
- P0-2 Upstash fail-open: Cursor + 회장 (fail-closed 전환 여부 제품결정, single-flight/DB원자화는 Cursor).
- P0-3 봉인키 폴백 제거·기동검증: Cursor (부팅 시 키 없으면 fail-fast).
- P1-1 extra/layout 실연동 여부: 회장 제품결정 → Cursor/Claude (Option A면 Toss Billing 별도 작업).
- P1-2 preview claim 실패해제·재시도 UX: Cursor.
- P1-3 `genLogCtx` 요청스코프화: Claude (log 레인).
- P1-4 previewAsset 영속화(Upstash S3/R2 또는 vault 단일화): Cursor.
- P1-5 SoT 단순화·회귀테스트: Claude (order 레인) + Cursor gate.
- P1-6 `geminiCalls` 실측 기재: Claude (log 레인).
- P1-7 sandbox/toss 전환 가드: 회장 결정 + Cursor.
- P2 일괄: Claude (보안·로그·문구 레인), P2-7 의존성 breaking은 회장 승인 후 Cursor.
- Studio 이중줄 확정 join (§2.3): Cursor Gate (prod `bill-log`+`generate-log`+Studio 시각 대조 1회). 결과 나오기 전 단정·시공 금지.

---

## 5. 읽은 증거·범위

- 발주서 본문 + `docs/evidence/preflight/20260916b/{FINDINGS,RESULTS,API_CALL_MAP}.md`, `src/lib/geminiBillGate.ts`, `src/app/api/generate/route.ts`, `src/hooks/make/useGenerate.ts`, `src/lib/easterEgg.ts` 전수 읽기.
- 추가 읽기(쓰기 없음): `orderDurable.ts`, `orders.ts`, `orderPaid.ts`, `generateGate.ts`, `generateCallLog.ts`, `upstashKv.ts`, `checkout/{route,complete/route,confirm/route,extra/route}.ts`, `download/route.ts`, `MakeStudio.tsx`, `useCheckout.ts`, `payment/success/page.tsx`, `FirstCutButton.tsx`, `previewAssets.ts`, `app/layout.tsx`.
- 실행: `grep` 읽기 검색 + `git log --oneline -20` 읽기만. `head` 파이프 실패는 PowerShell 호환 문제로 조사 중단(판정에 영향 없음).

*Patch: NONE — 본 파일 1건 생성 외 코드·env·커밋·배포 없음.*
