# Preflight Evidence — 20260916b (Claude Code 재검증)

> Runner: Claude Code (`claude --bg`, effort max) · 격리 워크트리 `.claude/worktrees/danjeong-precheck-20260916b`
> 지시서: `docs/handoff/CLAUDE_DANJEONG_LAUNCH_PRECHECK_v1.md`
> 부모 증거: `docs/evidence/preflight/20260916/RESULTS.md`(Cursor 1차, NO-GO)
> 상세: `API_CALL_MAP.md` · `FINDINGS.md` · `UI_ABUSE_CHECK.md` (동일 폴더)

## 핵심 요지

1차(20260916) NO-GO 사유는 "의도적 STUDIO_PAUSE로 B8 미실측"이었음 — 이번 재검증은 그 위에서 **코드 레벨 재검증 + 실제 `npm run build`**까지 수행했고, pause와 무관한 **신규 P0 3건**(동일 파일 묶음 1건 + 별도 2건)을 발견·패치함. 그중 하나(`geminiBillGate.ts` 빌드 실패)는 **pause를 껐어도 애초에 배포 자체가 안 됐을** 결함이라, 1차 NO-GO 사유와 별개로 이번 재검증이 아니었으면 C-Day 배포 시도 자체가 실패했을 것.

## 이번 세션 패치 (전부 완료, 커밋 `aa106a3`)

| # | 파일 | 문제 | 패치 |
|---|---|---|---|
| P0-0 | `src/lib/geminiBillGate.ts` | `npm run build` 전체 실패(문법오류 1 + 타입오류 3) | 4곳 최소 diff 수정, 빌드 GREEN 재확인 |
| P0-1 | `src/app/api/checkout/complete/route.ts` | 실결제(toss) 모드에서도 무료 paid 발급 가능(서버 인가 부재) | `getPaymentMode()==="toss"` 시 maint 헤더 없으면 403 |
| P0-2 | `src/app/api/proto/agents/route.ts` | 대리점 재무데이터 무인증 열람 + 원장 clear/seed 무인증 쓰기 | GET/POST 모두 `isMaintSmokeRequest` 게이트 |

패치 전/후 모두 `npm run build` 실행 확인 — 패치 전 3연속 실패(각기 다른 지점), 패치 후 **`✓ Compiled successfully`, 34/34 페이지 생성**.

## 체크리스트 대조 (`LAUNCH_PREFLIGHT_CHECKLIST.md` P0 — 과금·API)

| # | 항목 | 20260916(1차) | 20260916b(이번) |
|---|---|---|---|
| B1 `SHOT_COUNT=1` | PASS | **PASS 유지** (+ 호출 루프 자체가 `slice(0,1)` 이중 하드코딩 확인) |
| B2 Gemini HTTP 단일출구 | PASS | **PASS 유지** (`rg` 재확인, geminiBillGate.ts 1파일) |
| B3 SDK 직접호출 0 | PASS | **PASS 유지** |
| B4 hardMax≤3 | PASS | **PASS 유지** |
| B5 이중POST 차단 | PASS | **PASS 유지** (+ UI ref/서버 claim 코드 근거 추가 확보) |
| B6 pause 킬스위치 | PASS(켜짐) | **PASS**(문서화 3줄 확보, 이번엔 안 건드림 — Out) |
| B7 영속 로그 | PASS(코드) | **PASS 유지** |
| B8 1요청=1과금 실측 | BLOCKED(pause) | **여전히 Out**(pause OFF는 Cursor Gate 소관) — 단, 실측 절차서를 `API_CALL_MAP.md` A9에 구체화 |

## Section H

- **API 단일출구:** Y — `src/lib/geminiBillGate.ts` 1개 파일만 (`GoogleGenAI`/`@google/genai` 전수 rg 확인, 예외 파일 없음)
- **SHOT_COUNT=1:** Y — `easterEgg.ts:81` 상수 + `generate/route.ts` 호출 루프 `slice(0,1)` 이중 고정, 이스터에그는 워터마크 슬롯 선택일 뿐 호출횟수 무관
- **연타/이중POST 가드:** UI `inflightRef`(useGenerate·useCheckout, ref 공유) + 서버 Upstash `SETNX` claim(`claimPreviewGenerate`/`markRedoDurable`/`markAsvDurable`/`markPaidDurable`) — 이중 레이어
- **과금 맵:** `docs/evidence/preflight/20260916b/API_CALL_MAP.md`
- **Findings P0/P1 건수:** 5 / 3 (P0 전부 패치 완료 · P1 전부 표만, 미승인)
- **패치 커밋/파일:** `aa106a3` — `src/lib/geminiBillGate.ts`, `src/app/api/checkout/complete/route.ts`, `src/app/api/proto/agents/route.ts` (브랜치 `worktree-danjeong-precheck-20260916b`)
- **SECURITY High 잔여:** 0건 — 기존 High#1(extra/layout 무과금)은 Option B(문구 정직화) 배포 확인으로 해소, Option A(실토스 연동)는 승인 대기 상태 유지(수용 근거 확보, 코드 변경 없음). Med 4건·Low 4건은 전부 기존과 동일하게 표만 유지(재확인만, 신규 패치 없음)
- **권고 Go/No-Go:** **조건부 NO-GO** — 이번 세션이 찾은 API/billing P0 3건은 전부 해소했으나, 1차 NO-GO의 원 블로커(① pause OFF 후 B8 실측 ② C-법·C-PG 사람 체크 ③ Med#2·#5 승인 여부)는 이번 범위 밖(Out)이라 그대로 남음. **이번 재검증으로 "pause만 끄면 Go"라는 가정 자체가 틀렸다는 게 확인됨** — pause를 껐어도 이 브랜치 이전 상태로는 배포가 build 단계에서 실패했을 것. 지금 이 브랜치(커밋 `aa106a3`)를 채택하면 빌드는 GREEN이고 나머지는 1차와 동일한 순서(pause OFF → maint:gate → payment-integrity → B8 실측)로 진행 가능.
- **막힘:** 없음 — 발견한 모든 P0는 이번 세션 권한 내에서 패치 완료. pause OFF·실키·실PG·Vercel env는 애초 Out이라 막힌 게 아니라 범위 밖.
- **증거 폴더:** `docs/evidence/preflight/20260916b/`

## Cursor Gate 다음 순서 (변경 없음, 이 브랜치 기준으로)

```powershell
# 0) 이 브랜치/커밋 채택 여부 먼저 결정 (worktree-danjeong-precheck-20260916b, aa106a3 포함)
# 1) Vercel Production: PREVIEW_EMERGENCY 제거(0) → redeploy
cd D:\Memento\projects\danjeongshot
npm run maint:gate -- --base https://danjeongshot.vercel.app
npm run maint:payment-integrity -- --base https://danjeongshot.vercel.app
# 2) /make 프리뷰 1회 → Google AI Studio Interactions + /api/ops/bill-log 대조 (API_CALL_MAP.md A9 절차)
# 3) (권장, P1) maint:gate에 `npm run build` 단계 추가 검토 — 이번에 build-blocking 결함이 HTTP 스모크만으로는 안 잡혔음
```

---

## 재개 메모 — Windows 재부팅 후 (2026-09-16, 이어서 재검증)

재부팅으로 이전 세션이 이 워크트리에서 중단됐다가 재개. 코드 변경 없이 아래만 추가 수행:

- 워크트리 락이 재부팅 전 PID(20560) 기준으로 남아있었음 — 재부팅 후 그 PID가 무관한 프로세스로 재사용된 걸 확인하고 `git worktree unlock`으로 정상 해제(강제 종료 아님).
- 중단된 셸 명령이 남긴 0바이트 파일 5개(`REDO_LIMIT)`·`b.n`·`httpOk`·`maxCalls)`·`{,`) 삭제 — 실작업물 아님.
- `npm run build` 재실행(재부팅 후 첫 빌드) → **동일하게 GREEN, 34/34 페이지**, 드리프트 없음.
- 독립 재검증: 커밋 `aa106a3` 3파일 diff 전문 재검토 · `isMaintSmokeRequest`/`getPaymentMode` 정의 확인 · `payment-integrity.mjs`가 `complete` 호출에 이미 `maintHeaders()`를 보내는지 확인(패치로 인한 회귀 없음) · `/proto/agents` 페이지가 클라이언트 `fetch`만 쓰는지 확인(SSR 우회 경로 없음, API 게이트로 충분) · `SelfieFrameGuide.tsx` 전문 확인(props로 받은 `selfieUrl` 렌더만, 업로드 로직 없음, B7과 일치) — 전부 이전 세션 결론과 일치.
- **판정·Section H 변동 없음**(위 내용 그대로 유효). 브랜치가 로컬에만 있어 재부팅 시 유실 위험이 있었으므로 origin에 push.

---

## 재개 메모 2 — 새 세션(PC 2회 재사망 후), 신규 코드변경 없이 독립 재검증만 (2026-09-16b, 3차)

새 세션·새 컨텍스트로 재개(`docs/handoff/CLAUDE_DANJEONG_LAUNCH_PRECHECK_v1.md` 원 지시서만 보고 착수, 위 기존 결론은 몰랐던 상태에서 shared checkout의 dirty state → 기존 `worktree-danjeong-precheck-20260916b`(origin push 확인됨)를 발견해 그 위에서 이어감). 아래는 이번 세션이 **독립적으로 처음부터 재확인**한 것 — 코드 변경 없음(신규 P0 없었음):

- `git merge-base --is-ancestor master HEAD` → OK, master(6157b13)에서 유실된 커밋 없음.
- `npm run build` 재실행(3번째) → **동일 GREEN, 34/34 페이지**.
- P0 패치 3곳 grep 재확인: `checkout/complete/route.ts`의 `getPaymentMode()==="toss" && !isMaintSmokeRequest(req)`, `proto/agents/route.ts` GET(45행)·POST(79행) 양쪽 `isMaintSmokeRequest` 게이트 — 전부 존재.
- **B4 재판정: 부분(1차 20260916) → PASS로 승격.** `previewVault.ts`/`previewQuota.ts`/`orders.ts`/`abuseSignals.ts` 4곳 모두 `PREVIEW_QUOTA_SECRET → GEMINI_API_KEY → 하드코드` 동일 폴백 체인(기존 보안리뷰 Low#8과 동일 근거, 신규 아님) — 배포 단일 인스턴스 내에서는 자체 일관. 실제 불일치 시나리오는 시크릿 로테이션 중 6시간 이내 vault뿐이며, `download/route.ts:134-159`가 `unsealPreviewVault` 실패 시 `order.previewAssetId` 스토어로 자동 폴백 후, 그것도 없으면 깨끗한 410 `PREVIEW_EXPIRED`("세션이 만료되었습니다. 다시 만들기 후 받아 주세요")로 안전 종료 확인 — 내부정보 노출 없음, 재현 경로 있음.
- B1/B2 회귀 점검: `generate/route.ts`(이번 WIP에서 245줄 최대폭 변경분) 재열람 — `resolvePaidOrder`(preview, 236행) · `resolveOrderDurable`+`canRunRedo`/`canRunAsv`(redo/asv, 278-337행) 전부 `order?.paid` 체크 유지, pre-pay 토큰 통과 경로 없음. `36cf7f1`/`0a76e9e`/`70d3ad9` 패턴 회귀 없음.
- `docs/handoff/SECURITY_REVIEW_FINDINGS_v1.md` 원본(2026-09-13, OpenCode, 9건) 직접 재열람 후 위 FINDINGS.md 표와 1:1 대조 — 상태 문구까지 정확히 일치(#1 Option B 완료 표기 포함), drift 없음.
- `package-lock.json`이 `git status`에 M으로 뜨지만 `git diff`는 완전 공백 — Windows `core.autocrlf=true` 라인엔딩 아티팩트로 판단(실콘텐츠 변경 아님), 커밋 안 함.
- shared checkout(`D:\Memento\projects\danjeongshot`, master) 쪽에 남아있던 uncommitted 변경분은 이 워크트리 브랜치의 베이스 커밋(`5555d57`)에 이미 전량 반영되어 있음을 diff로 확인 — shared checkout 쪽은 건드리지 않고 그대로 둠(다른 세션 소유 가능성).

**판정·Section H 재확인 결과: 변동 없음.** 이번 세션 발견 신규 P0 = 0건(전량 이전 세션이 이미 처리). 유일한 갱신은 B4 부분→PASS.
