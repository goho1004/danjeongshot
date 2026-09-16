# UI_ABUSE_CHECK — 20260916b (Claude Code precheck)

> 방법: 코드 리딩 시뮬레이션(정적) — 실브라우저 클릭·모바일 뷰포트 실측은 Out(Cursor/사람 몫). Playwright 미실행.

## U1 — 원클릭 결제 HARD (`CLAUDE_DANJEONG_UX_P0_v1.md` 대조)

| 원 요구 | 현재 코드 | 결과 |
|---|---|---|
| 업로드가 주인공, 세부옵션은 접힘 기본 | `PurposeUploadStep.tsx` — look/season/`ExtraPromptFields`가 `<details>` 아코디언(기본 닫힘) 안 | PASS |
| 팩 2카드 → 결제 원클릭, 추가 설문 ✗ | `CheckoutStep.tsx` — `PackPicker`(basic/plus) + 금액 + 단일 `결제하기` 버튼, 약관은 `<details>` 요약 1문장 + 링크 | PASS |
| 완료 화면도 원클릭(저장 우선), 업셀은 접힘 | `PaidDonePanel.tsx` grep 결과 "결제 CTA는 펼침·이메일/재생은 접힘" 주석 확인 | PASS (표면 확인, 상세 전문 미독) |

## U2 — 액션 CTA 연타=1회 (생성·결제·다운로드·재생)

| CTA | 파일 | 가드 |
|---|---|---|
| 첫 컷 생성 | `useGenerate.ts: generate()` | `inflightRef`(ref, state아님) + `busyKind` 이중 가드, 서버 `claimPreviewGenerate`(Upstash SETNX) + `cutDeliveredAt` 체크 |
| 다시만들기/A·S | `useGenerate.ts: runPaidRegen()` | 위와 **동일 `inflightRef` 공유** — preview 생성 중엔 redo도 못 누름(전역 1개 inflight) + 서버 `markRedoDurable/markAsvDurable`(Upstash SETNX claim) |
| 결제 | `useCheckout.ts: checkout()` | `checkoutInFlightRef` 동일 패턴 |
| 다운로드 | `orders.ts markDownloaded` + `download/route.ts` | `verifyUnlock` 통과 후 처리, 재호출해도 `downloadedAt` 최초 1회만 세팅(멱등) |

전부 **ref 기반**(React state 배칭 지연에 안전) + **서버측 원자 claim** 이중 방어. PASS.

## U3 — 여권·관공서·앱스토어 CTA·과장 카피

```
rg "여권|관공서|민원|앱\s*설치|App Store|앱스토어" src --glob "*.tsx"
```
전수 9건 — 전부 **부정 고지**("여권·관공서 제출용은 아닙니다" 류, `SiteFooter`/`page.tsx`/`GalleryView`/`legal/*`/`print/page.tsx`) 또는 인화 파트너(`PRINTING_BOX`, 3자 앱) 안내. 단정샷 자체 앱 설치를 유도하는 CTA 0건. **PASS.**

## U4 — 에러/503/pause 사용자 문구 (기술 스택 노출 ✗)

`src/lib/userFacingErrors.ts` — `toUserFacingGenerateError()`:
- 허용 리스트(결제·업로드 등 안전한 한글 문구)와 `LEAK_RE`(gemini/google/api_key/quota/429/503/stack/token/ord_ 등) 이중 필터.
- LEAK_RE 매치·영문 12자+연속·`{`·`http` 포함 시 무조건 fallback(사진관 바쁨 등 안전 문구)으로 치환.
- `generate/route.ts`·`useGenerate.ts` 전 에러 경로가 이 함수를 통과. **PASS.**
- pause 중(`PREVIEW_EMERGENCY=1`) 응답도 동일하게 `STUDIO_BUSY`("사진관이 조금 바빠요") — 503 코드만 있고 원인 텍스트 노출 없음.

## U5 — 모바일 1뷰포트

정적 코드 근거만(실기기 미실측):
- 전 스텝 컴포넌트가 Tailwind 반응형(`sm:grid-cols-3` 등) + 고정 최대폭(`max-w-[220px]`, `max-w-5xl`) 사용.
- 폰트 크기 `text-[11px]`~`text-2xl` 스케일로 좁은 화면 대비.
- **한계: 실기기/Chrome DevTools 뷰포트 스크린샷 미실행** — 이 세션은 headless 백그라운드라 브라우저 구동 불가. Cursor 쪽 `maint:flow-e2e`(Playwright) 또는 사람 육안 확인 필요.

## U6 — Playwright 5개 시나리오

**미실행**(선택 항목, `maint:flow-e2e`가 이미 기존 게이트에 존재 — 중복 구현 안 함). 기존 `scripts/maint/checks` 산하 flow-e2e가 받기→저장→레이아웃 흐름을 커버 중(`MAINTENANCE.md` §2 표).

---

## X1 — preview·checkout rate / abuse-sim 한도

`src/lib/generateGate.ts: gatePaidGenerate()` — 5단 게이트, 전부 `durableIncr`(Upstash 원자 카운터, 없으면 메모리):
1. IP·분당 (`GENERATE_PER_IP_MINUTE`, 기본 4)
2. IP·시간당 (`GENERATE_RATE_LIMIT`, 기본 20)
3. 기기·시간당 (`GENERATE_PER_DEVICE_HOUR`, 기본 12)
4. 전역·분당 (`GENERATE_GLOBAL_MINUTE`, 기본 30)
5. 전역·일일 (`DAILY_GEN_BUDGET`, 기본 500, 0=끔)

`npm run abuse-sim` 스크립트 존재(`scripts/abuse-sim.mjs`, 이번 세션 미실행 — 로컬 서버 기동 필요, Out). **`/api/checkout`은 이 게이트 대상이 아님**(기존 리뷰 Med#5, 표만 유지 — 결제 자체가 아니라 "주문 레코드 생성" 스팸 한정, 과금과 무관).

## X2 — IDOR (orderId만으로 상태변경)

| 라우트 | 필요 인증 | 결과 |
|---|---|---|
| `download`, `deliver/email`, `checkout/extra`, `checkout/layout`, `generate` | orderId **+** unlockToken(서명 토큰, AES-256-GCM) | 상태변경 불가 — PASS |
| `refund` GET | orderId만 | **상태변경 없음**(읽기전용 — paid/downloadedAt/redoUsed/asvUsed 노출, 기존 Low#6 유지) |
| `cs/triage` POST | orderId만 | 상태변경은 없으나 **알림 발사** 가능 — 신규 P1-2 |
| `proto/agents` GET/POST | **패치 전: 없음** → 패치 후: maint 헤더 | **패치 전엔 대리점 재무데이터 열람 + 원장 clear/seed 가능 — P0-2, 패치 완료** |

## X3 — 로그에 prompt/image/api_key

- `geminiBillGate.ts BillLogEntry`, `generateCallLog.ts GenerateLogEntry` 필드 전수 확인 — 이미지·프롬프트 원문·API 키 필드 없음. `orderPrefix`는 8자만, `actorHash`는 sha256 12자 절단.
- `console.*` 호출 전수(오늘 읽은 파일 범위) — 에러 메시지만, 키/토큰 값 원문 출력 없음(`geminiBillGate.ts` provider 에러도 `.slice(0,240)`로 자름).
- **PASS.**

## X4 — maint/ops 라우트 시크릿 헤더

`isMaintSmokeRequest`(`x-djs-maint-smoke` = `MAINT_SMOKE_SECRET`) 게이트 확인:

| 라우트 | 패치 전 | 패치 후 |
|---|---|---|
| `GET /api/ops/bill-log` | 있음 | 있음 |
| `GET /api/ops/generate-log` | 있음 | 있음 |
| `GET /api/ops/product-analytics` | 있음 | 있음 |
| `POST /api/cs/notify` | `OPS_CS_TOKEN` 별도 게이트(prod 필수, fail-closed) | 있음 |
| `GET/POST /api/proto/agents` | **없음 — P0-2** | **있음(이번 세션 패치)** |
| `POST /api/test/clear-memory` | `MOCK_GENERATE==="1"` 아니면 404(자가차단) | 동일 |
| `POST /api/cs/triage` | 없음 | 없음 — **P1-2, 표만** |

## X5/X6 — SECURITY_REVIEW_FINDINGS_v1 Critical/High 잔여

Critical 0 유지. High#1 — `FINDINGS.md` 참조: **Option B(문구 정직화) 배포 확인·코드 근거 확보, Option A는 승인 대기 유지**(회장 결정 사항, 이번 세션 코드 변경 없음). 이걸로 X5·X6 요구(패치안 또는 수용 근거)는 **수용 근거 확보로 충족** — Option A 착수는 별도 승인 필요.
