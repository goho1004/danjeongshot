# 20260917 MAINT_SMOKE_TAG — 게이트 스모크 ≠ 사람 컷 구분

> 발주: `docs/handoff/OPENCODE_DANJEONG_MAINT_SMOKE_TAG_v1.md` · 시공: OpenCode · Vercel 배포 ✗ (Cursor)

## 바꾼 파일

- `src/lib/geminiBillGate.ts`
  - `BillLogEntry` += `via?: string` (maint 자동이면 `"maint_smoke"`)
  - `MAINT_SMOKE_VIA`, `withMaintTicketPrefix()` 신설 (중복 `maint:` 방지)
  - `openGeminiTicket(opts.via)` → `ticket_open`/`http_start`/`http_ok`/`http_fail`/`pause_block`/`nokey_block`/`budget_block` 전 이벤트 `meta`에 `via` 포함
- `src/lib/generateCallLog.ts`
  - `GenerateLogEntry` += `via?: string`
  - `summarizeGenerateLogs()` += `byVia` 집계
- `src/app/api/generate/route.ts`
  - `isMaintSmokeRequest(req)` 판별 → `maintVia = "maint_smoke" | undefined`
  - `genLogCtx`에 `via` 포함 → 모든 `noteGen`(=generate-log + product-event 병합) 기록에 전파
  - 티켓 ID: `withMaintTicketPrefix()` 적용 → `maint:preview:<orderId>` / `maint:redo:<orderId>` / `maint:asv:<orderId>`
  - 티켓에 `stage`/`orderPrefix`/`purposeId`/`actorHash`(해시만)/`via` 함께 전달
- `scripts/lib/smokePng.mjs`
  - `uniqueSmokePngDataUrl()`: 2×2 단색점 → **384×288 PNG + `MAINT` / `SMOKE xxxx` / `auto-test not a person` 문구**
  - 실행마다 배경색·노이즈 42 rect·스트라이프·접미(`randomBytes 2B`) 변경 → SAME_IMAGE 회피 유지
  - 실측: ~13–14KB, `pngMagic OK`, `4096B prefix diff OK`, sharp metadata `384×288 png`

## 샘플 ticketId

- 사람: `preview:ord_abc123…`, `redo:ord_abc123…`, `asv:ord_abc123…`
- maint 자동: `maint:preview:ord_abc123…`, `maint:redo:ord_abc123…`, `maint:asv:ord_abc123…`

## Studio/장부에서 구분하는 법 3줄

1. 장부: `/api/ops/bill-log`·`/api/ops/generate-log`에서 `via == "maint_smoke"` → maint 자동 (uaClass만 보지 말 것).
2. 티켓: `ticketId`가 `maint:preview:`/`maint:redo:`/`maint:asv:`로 시작 → maint 자동 (`maint:` 접두).
3. Studio: 원본 입력 이미지에 크게 `MAINT` / `SMOKE xxxx` 글자 → 사람 셀피 아님 (출력물이 아닌 입력 칸 기준).

## 게이트 유지 확인

- `npx tsc --noEmit`: PASS (출력 없음)
- `uniqueSmokePngDataUrl()` 2회 생성: bytes ~13831, pngMagic true, prefix diff true, 384×288
- `prepPaid` / `maint:gate` / download-loop / watermark 경로 무변경 (smokePng export 시그니처 동일)
- Gemini 호출 차단 변경 없음 (실발사 유지 — 태깅·이미지로만 구분)
- 시크릿 값 출력 없음 (헤더 비교만, 로그에 원문 없음)

## Section H

- via 태그: done
- ticket `maint:` 접두: done
- smoke PNG 문구: done
- branch: opencode/maint-smoke-tag-20260917
- commit: 3da369887ed33b2ab3fa36877638c8065d94fc5a
- 증거: docs/evidence/audit/20260917_MAINT_SMOKE_TAG.md
- 막힘: none
- 배포: Cursor
