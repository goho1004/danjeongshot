# API_CALL_MAP — 20260916b (Claude Code precheck)

> 범위: 화면별 Gemini 호출·과금 경로 + 결제 라우트 전수. 코드 근거는 이 워크트리(=체크아웃 당시 pending WIP 포함 현재 상태) 기준.
> 대응: `docs/handoff/CLAUDE_DANJEONG_LAUNCH_PRECHECK_v1.md` §3-A (A1-A9)

## A2/A3 — Gemini HTTP 단일 출구

```
rg "GoogleGenAI|@google/genai" src
→ src/lib/geminiBillGate.ts  (1개 파일만)
```

`src/app/generate` 등 라우트에서 SDK 직접 호출 0건. 전부 `openGeminiTicket()` → `ticket.callLite1K()` 경유.

## A1 — PREVIEW_SHOT_COUNT

- `src/lib/easterEgg.ts:81` → `export const PREVIEW_SHOT_COUNT = 1;` (상수, env 오버라이드 경로 없음)
- `src/app/api/generate/route.ts:485,553` — `slotMeta`는 `PREVIEW_SHOT_COUNT` 길이로 만들되, 실제 Gemini 호출 루프는 `slotMeta.slice(0, 1)`로 **하드코딩 1건**만 순회 (이중 안전장치 — 상수를 실수로 올려도 호출 루프 자체가 1개만 돎).
- 이스터에그 우회 경로 없음: `rollEasterSlot()`은 워터마크 슬롯 선택만 담당, Gemini 호출 횟수에 관여하지 않음(워터마크는 sharp 합성이지 별도 생성 호출이 아님).

## A4 — 티켓 hardMax·기본 maxCalls

`src/lib/geminiBillGate.ts`
```ts
export function hardMaxCallsPerTicket(): number {
  const n = Number(process.env.GEMINI_HARD_MAX_CALLS_PER_TICKET ?? "1");
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), 3);   // 상한 3 하드코딩
}
```
`generate/route.ts`가 매번 `openGeminiTicket({ ticketId, maxCalls: 1 })`로 명시 호출 (preview/redo/asv 전부). 티켓 내부에서 `spent >= maxCalls`면 `BUDGET` 코드로 HTTP 차단.

## A5 — 이중 POST·연타 가드 (레이어별)

| 레이어 | 파일 | 메커니즘 |
|---|---|---|
| UI ref | `src/hooks/make/useGenerate.ts` | `inflightRef`(useRef, state 아님 — 배칭 지연 면역) 를 `generate()`·`runPaidRegen()` 이 **공유** — preview/redo/asv 어느 쪽도 동시에 하나만 |
| UI ref | `src/hooks/make/useCheckout.ts` | `checkoutInFlightRef` 동일 패턴 |
| UI disabled | `FirstCutButton.tsx`/`RegenPanel.tsx`/`CheckoutStep.tsx` | `disabled={!!busyKind}` / `payDisabled` |
| 서버 claim | `src/lib/orderDurable.ts: claimPreviewGenerate()` | Upstash `SETNX`(TTL 120s), 원자적 — 서버리스 인스턴스 간에도 유효 |
| 서버 상태 | `generate/route.ts` preview 분기 | `order.cutDeliveredAt` 있으면 즉시 `CUT_ALREADY`(409), Gemini 호출 전 차단 |
| 서버 claim(redo/asv) | `orderDurable.ts: markRedoDurable/markAsvDurable` | Upstash `SETNX` 클레임 선점 후에만 실제 마킹 (Upstash 없으면 메모리 카운터만 — §FINDINGS Med#4 기지) |

## A6 — 플로우별 과금 배수표

| 플로우 | 엔드포인트 | Gemini 호출 | 실결제(Toss) 호출 | 비고 |
|---|---|---|---|---|
| 첫 컷(preview) | `POST /api/generate {stage:"preview"}` | **최대 1** (ticket maxCalls=1, 루프 slice(0,1)) | — | pay-first, `resolvePaidOrder` 통과해야 진입 |
| 다시 만들기(redo) | `POST /api/generate {stage:"redo"}` | **최대 1** | — | `REDO_LIMIT=1`, Upstash claim |
| 한 번 더(asv) | `POST /api/generate {stage:"asv"}` | **최대 1** | — | `ASV_LIMIT=1`, redo 소진 후에만 |
| 팩 결제(sandbox) | `POST /api/checkout` → `POST /api/checkout/complete` | 0 | 0 (샌드박스, 실PG 미호출) | **패치 전에는 mode=toss여도 complete가 통과됨 — FINDINGS P0-1** |
| 팩 결제(toss) | `POST /api/checkout` → 토스 위젯 → `POST /api/checkout/confirm` | 0 | 1 (`confirmTossPayment`, amount는 서버 주문금액 고정) | idempotent(ALREADY_PROCESSED_PAYMENT → ok 처리) |
| 추가 컷 | `POST /api/checkout/extra` | 0 | 0 (실결제 미연동 — 의도적, Option B 문구정직화 완료) | `markExtraShotPaid`만, PG 호출 없음 |
| 레이아웃(개별/패키지) | `POST /api/checkout/layout` | 0 | 0 (동일) | `markLayoutSinglePaid`/`markLayoutPackPaid` |

**결론:** 이미지 생성 경로(A1-A5)는 "1클릭=1과금" 설계가 코드상 다중 레이어로 보강되어 있음. 결제 경로의 진짜 구멍은 Gemini 과금이 아니라 **`checkout/complete`가 결제모드를 안 가려서 생기는 매출 우회**였음 (아래 FINDINGS 참조, 패치 완료).

## A7 — 과금 영속 로그

- `src/lib/geminiBillGate.ts` — `BillLogEntry`: ts/product/event/ticketId/stage/orderPrefix(8자)/purposeId/actorHash(sha256 12자)/callIndex/maxCalls/spent/ms/code/model/pngBytes/imageBytesIn/billed. **이미지·프롬프트·API 키 없음.**
- 저장: Upstash 링버퍼 `djs:billgate:v1` (+ 메모리 폴백), `BILL_LOG_MAX`(기본 500, 최대 5000).
- 조회: `GET /api/ops/bill-log` — `isMaintSmokeRequest` 로 `x-djs-maint-smoke` 헤더 필수(403 without). `summarizeBillAbuse()`가 멀티히트/버스트/예산차단 등 어뷰징 플래그 자동 산출.
- 별도 generate 콜로그(`GET /api/ops/generate-log`, `GET /api/ops/product-analytics`)도 동일 헤더로 보호, PII/프롬프트/이미지 없음(§FINDINGS X3 PASS).

## A8 — pause/킬스위치 (3줄)

```
ON  (긴급정지): Vercel env PREVIEW_EMERGENCY=1 (또는 "true") 설정 → redeploy 불필요, 다음 요청부터 즉시 적용
효과: /api/generate 최상단 + geminiBillGate.callLite1K + gatePaidGenerate 3곳에서 즉시 503 STUDIO_BUSY, Gemini HTTP 발사 자체가 안 됨
OFF (해제): PREVIEW_EMERGENCY 값 제거(또는 0) → 이후 maint:gate 재실행으로 확인 (Cursor 소관, 본 리포트 Out)
```
`.env.example:25`에 1줄 주석으로 이미 문서화됨. `MAINTENANCE.md` §6에 장애대응 표 존재.

## A9 — pause-OFF 전제 1클릭=1과금 실측 절차 (Cursor Gate용 — 실행은 Out)

```
1) Vercel Production: PREVIEW_EMERGENCY 제거(0) → redeploy 불요, 즉시 반영
2) npm run maint:gate -- --base https://danjeongshot.vercel.app   (GREEN 기대)
3) npm run maint:payment-integrity -- --base https://danjeongshot.vercel.app
4) 브라우저로 /make 1회 실제 클릭(첫 컷) → 아래 두 소스가 서로 맞는지 대조:
   a. Google AI Studio → Interactions 카운트 +1
   b. GET /api/ops/bill-log (x-djs-maint-smoke 헤더) → 방금 ticketId에 http_start:1, http_ok:1, 동일 ticket 재호출 없음(MULTI_HTTP_SAME_TICKET 플래그 없어야 함)
5) 연타 재현: 같은 화면에서 "컷 만들기" 2회 연속 클릭 → 두 번째는 PREVIEW_INFLIGHT(429) 확인, Interactions는 여전히 +1만
```
