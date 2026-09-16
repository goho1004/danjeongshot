# UI_ABUSE_CHECK — 2026-09-16b (Claude precheck-patch)

## U1. 원클릭 결제 HARD 유지

- 코드 변경 없음(이번 세션 CheckoutStep 결제 트리거 로직 미수정) — `CLAUDE_DANJEONG_UX_P0_v1` 기준 유지 여부는 재감사하지 않음(범위 밖).

## U2. 액션 CTA 연타 = 1회

- **generate(preview/redo/asv):** 서버 `claimPreviewGenerate`(inflight) + 클라 `busyKind` 가드 — 변경 없음, `maint:payment-integrity`의 `pre-pay-generate-blocked`/`stale-token-blocked`/`session-flush-stale-blocked` 로컬 재실행으로 정상 동작 재확인(전부 OK).
- **checkout:** 이번 세션에서 처음으로 rate limit 신설(분당 10·시간당 10 IP) — 연타 자체를 막는 건 아니지만(정상 1회 클릭엔 영향 없음) 스크립트형 연타·대량 생성은 이제 서버에서도 차단됨. `FINDINGS.md` #4 참조.
- **checkout/complete, checkout/confirm의 재제출(뒤로가기 등):** `alreadyPaid` 분기가 존재해 이미 "1회만 실제 처리, 이후는 조회성 응답"으로 설계되어 있었음 — 이번 세션은 그 조회성 응답이 **소지 증명 없이도 나가던 것**을 막았을 뿐, 재제출 자체의 멱등성(idempotency) 설계는 원래도 맞았음.

## U3. 여권·관공서·앱스토어 CTA·과장 카피

- 이번 세션 재감사 안 함(RESULTS 20260916 G7에서 "여권·관공서 = 부정 고지(OK)" 이미 확인됨, 관련 파일 변경 없음).
- **부수 확인:** `checkout/extra`, `checkout/layout`의 결제 문구가 실제로 "무료"라고 명시하는지 직접 코드로 재확인함 — 과장·오인 표현 없음(`FINDINGS.md` High#1).

## U4. 에러/503/pause 시 사용자 문구

- `generateGate.ts`가 `STUDIO_BUSY`/`STUDIO_WAIT`(둘 다 `@/lib/userFacingErrors`) 사용 — 기술 스택·스택트레이스 노출 없음. 코드 변경 없음, 재확인만.
- 이번 세션이 새로 추가한 에러 응답들(`TICKET_REQUIRED`, `TOSS_MODE_REQUIRES_CONFIRM`, `CHECKOUT_RATE_LIMIT`, proto/agents `forbidden`)도 전부 한국어 사용자 문구 또는(운영자 전용 라우트인 proto/agents·forbidden 한정) 일반 오류 문자열로 스택/내부 경로 노출 없음.

## U5. 모바일 1뷰포트 · 로딩/실패 복구 경로

- **이번 세션에서 시각적으로 테스트하지 않음** — Playwright는 headless 기본 뷰포트로만 flow-e2e를 돌렸고, 모바일 뷰포트·실제 화면 확인은 하지 않음. 코드 리뷰만으로는 확인 불가한 항목이라 "테스트함"이라 주장하지 않음. 필요하면 별도 시각 확인(브라우저/스크린샷) 세션으로 넘겨야 함.

## X1. preview·checkout rate / abuse-sim 한도

- generate: 기존 다층 제한(IP분/IP시/기기시/전역분/전역일) 변경 없음, 유지 확인.
- **checkout: 신설**(분당 10 · 시간당 60, IP 기준, in-memory 폴백 — Upstash 있으면 인스턴스 공유). `FINDINGS.md` #4.
- `abuse-sim.mjs`는 의도적으로 헤더 없이 어뷰징을 시뮬레이션하는 스크립트라 이번 변경으로 건드리지 않음(막히는 게 정상 동작).

## X2. IDOR — orderId만으로 상태 변경/조회

- **개선:** `checkout/confirm`·`checkout/complete`의 `alreadyPaid` 응답이 더 이상 orderId 단독으로 unlockToken을 내주지 않음(`FINDINGS.md` #3).
- **개선:** `proto/agents` GET(대리점 재무 데이터 조회)·POST(원장 시드/삭제)가 더 이상 무인증 접근 가능하지 않음(`FINDINGS.md` #2).
- `refund` GET(orderId만으로 상태 조회, SECURITY_REVIEW #6)은 원 발견표대로 변경 없음 — 개인정보·이미지 노출이 없어 이번 세션의 "명확한 P0" 기준에는 못 미친다고 판단.

## X3. 로그에 prompt/image/api_key

- `geminiBillGate.ts`(Cursor의 신규 파일) 직접 확인: `BillLogEntry`에 `actorHash`(sha256 앞 12자)만 있고 원문 device/ip 없음, `prompt`/`rawBase64`/`apiKey` 필드 없음 — 기존 컨벤션(RESULTS 20260916 S3 PASS) 그대로 유지됨.

## X4. maint/ops 라우트 시크릿 헤더

- 기존 `ops/*` 라우트는 변경 없음(이미 `isMaintSmokeRequest` 적용).
- **신규로 같은 컨벤션에 편입:** `proto/agents` GET/POST(`FINDINGS.md` #2).

## X5/X6. SECURITY_REVIEW_FINDINGS_v1 Critical/High 잔여

- `FINDINGS.md`의 "High — 검토했으나 변경 없음" 및 "Med/Low — 원 발견표 그대로" 절 참조. Critical 0건 유지. High#1은 근거 명시 후 수용, Med#2는 이번 세션에서 패치, Med#5도 이번 세션에서 패치, 나머지 Med/Low는 원 표 유지.
