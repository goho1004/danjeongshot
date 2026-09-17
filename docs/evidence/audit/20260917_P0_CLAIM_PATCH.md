# 20260917 P0 CLAIM PATCH 증거 (P0-1 redo/asv 선claim + P0-2 fail-closed)

> 발주: `docs/handoff/OPENCODE_DANJEONG_P0_CLAIM_PATCH_v1.md` · 시공 OpenCode · 기준 `master(229f84e)` → 브랜치 `fix/p0-redo-asv-claim`
> Out 준수: Studio UI·결제 Option A·P1/P2·Vercel env 변경 없음. 배포 없음(Cursor/회장). 시크릿 값 출력 없음.

## 1. 바꾼 파일 · 한 줄 이유

| 파일 | 변경 | 한 줄 이유 |
|------|------|------------|
| `src/lib/orderDurable.ts` | `claimRedoGenerate` / `claimAsvGenerate` 추가 (`djs:claim:redogen/asvgen:<id>`, TTL 120s) + `GenerateClaim` 3치(`ok`/`inflight`/`unavailable`) + `claimPreviewGenerate` 동일 3치로 변경 | P0-1: redo/asv도 preview처럼 Gemini 발사 **전** 원자 선점. 단기 inflight키를 1회 소진키(`redo/asvClaimKey`, 7일)와 분리해 이중 mark·영구잠금 없음 |
| `src/lib/orderDurable.ts` | `kvSetNx === null` 시 메모리 Map 폴백 삭제(공개 경로) · `markRedo/AsvDurable`도 `null`이면 진행 중단 | P0-2: Upstash 없/오류면 fail-open 금지 → fail-closed. 메모리 폴백은 `MOCK_GENERATE=1`일 때만(아래 예외 1줄) |
| `src/app/api/generate/route.ts` | `canRun*` 통과·traffic 게이트 후, mock·`callLite1K` **전**에 redo/asv claim. `inflight → 429 REDO_INFLIGHT/ASV_INFLIGHT`, `unavailable → 503 STORE_UNAVAILABLE`. preview claim도 `unavailable → 503 STORE_UNAVAILABLE` 분기 | P0-1 선claim 배선 + P0-2 503 명시 코드. 에러 본문은 기존 `STUDIO_BUSY` 톤 유지(스택·키 노출 없음) |
| `docs/CLAIM_FAIL_CLOSED.md` | 신규 1파일 | P0-2 요구의 fail-open→fail-closed 이유 메모 |
| 본 파일 | 신규 | 패치 증거 + Section H |

예외 1줄: `MOCK_GENERATE=1`(로컬/테스트, 기존 테스트 훅 관례 `api/test/clear-memory`와 동일)일 때만
메모리 폴백 허용 — mock은 Gemini를 쏘지 않으므로 과금 리스크 없음. prod 가정은 Upstash 필수.

## 2. 동시 2 POST 기대 동작 (Gemini HTTP 최대 1회)

- redo 동시 2 POST(동일 orderId): 둘 다 `canRunRedo` 통과 가능 → 선착 1건만 claim `ok` → Gemini 1회.
  패자는 `REDO_INFLIGHT` 429, HTTP 미발사. asv·preview 동일(각 stage 독립 키).
- 정당 순차 사용(redo 1회 후 asv)은 `canRun*`(순서·1회 한도)가 먼저 걸러내므로 claim과 충돌 없음.
- claim TTL 120s·실패해도 해제 없음 — preview 기존 정책과 동일, 과금 방지가 UX보다 우선(재시도 120초 대기는 P1-2로 이미 기록된 감수 사항).

## 3. fail-closed 동작

- Upstash 미설정·HTTP/네트워크 오류(`kvSetNx === null`) + `MOCK_GENERATE≠1`:
  claim 3종 전부 `unavailable` → route에서 **503 `STORE_UNAVAILABLE`** + Gemini 미발사.
  `markRedo/AsvDurable`도 `null` 반환(메모리 카운터 미증가) — 사후 처리로 과금이 새지 않음.
- `MOCK_GENERATE=1`: 메모리 폴백으로 기존 로컬 플로우(`maint:gate` 등) 그대로 동작.

## 4. 검증

- `npx tsc --noEmit` — 클린(출력 0).
- 동시성 시뮬레이션(실제 컴파일된 `orderDurable.js` + 원자 NX를 흉내 낸 fetch 스텁, Gemini 호출 없음):
  - Sim A/A2/A3: redo·asv·preview 각각 동시 2 claim → 정확히 1 `ok` + 1 `inflight` — PASS.
  - Sim B: Upstash creds 제거·mock 없음 → redo·preview 모두 `unavailable` — PASS.
  - Sim C: `markRedoDurable` (Upstash 없음·mock 없음) → `null` 반환 + `redoUsed` 0 유지 — PASS.
  - Sim D: `MOCK_GENERATE=1` → 메모리 폴백, 동시 2 claim 중 1승1패 — PASS.
  - 심 스크립트·컴파일 산출물은 실행 후 삭제(레포 잔류 없음).
- `npm run lint` 미실행: `next lint` 대화형 확인 가능성이 있어 비파괴 `tsc`로 대체(프로젝트 관례 중 하나).

## Section H (끝 보고)

- P0-1: done
- P0-2: done
- branch: fix/p0-redo-asv-claim
- commit: 1662412355ebdb06e954a99ceaac3c182a7d8d13
- 증거 MD: docs/evidence/audit/20260917_P0_CLAIM_PATCH.md
- 막힘: none
- 배포: Cursor (OpenCode 배포 ✗)
