# Preflight Evidence — 2026-09-16b (pause OFF 재측정 + Claude precheck-patch)

> Base: `https://danjeongshot.vercel.app` (Cursor 재측정용) · 로컬 샌드박스(`http://127.0.0.1:3000`, 본 세션 검증용)
> Cursor: `PREVIEW_EMERGENCY` **제거** · `geminiBillGate` 빌드 패치 · prod redeploy
> Claude: `CLAUDE_DANJEONG_LAUNCH_PRECHECK_v1.md` precheck+patch (`danjeong-precheck-patch`)

## 판정 (Claude 세션 종료 시점): **조건부 GO 후보** — flow-e2e 블로커 해소, 잔여는 인간 결정 항목만

| 항목 | Cursor 재측정 (prod) | Claude 로컬 검증 (sandbox) |
|------|----------------------|------------------------------|
| HEALTH | GREEN | GREEN |
| prep-session | OK | OK |
| payment-integrity | ALL OK · post-pay-generate `mock:false` | ALL OK (checkout/pre-pay-blocked/complete/token-rotated/post-pay-generate/stale-token-blocked/session-flush-blocked 전부 OK) |
| download-loop / watermark / safari-multipart | OK | OK |
| **maint:gate** | RED · `failures: ["flow-e2e"]`만 | **GREEN · `failures: []`** (flow-e2e 포함 전체 통과) |
| B8 실측 | generate 경로 열림(mock:false asset 발급) | 로컬은 mock:true라 실측 대상 아님(Cursor 담당 유지) |

## 이번 세션(Claude) 패치 — `FINDINGS.md` 상세

1. **flow-e2e 블로커 해소** — `scripts/e2e-download-ui.mjs`가 앱이 읽지 않는 `?paid=1`을 쓰고 있었음(실제 계약은 `?resume=1`). 1줄 수정 → 로컬 `E2E_PASS`.
2. **checkout/complete + proto/agents 무인증 재도입** — 이전 Claude 세션(worktree `danjeong-precheck-20260916b`, `aa106a3`)이 찾아 고친 P0가 master에 병합되지 않아 라이브 코드가 여전히 취약했음. 재적용.
3. **alreadyPaid 토큰 오라클** (`checkout/confirm` + `checkout/complete`) — orderId만으로 unlockToken 유출 가능하던 것을 소지증명(orderTicket 서명 검증)으로 막음.
4. **checkout rate limit 신설** — `durableIncr` 기반 IP당 분당10·시간당60. 연동 스크립트(`prepPaid.mjs`/`payment-integrity.mjs`/`smoke-flow.mjs`) 3곳도 maint 헤더 빠져 있던 것 같이 수정(자기차단 방지).

전부 `next build` 클린(34/34) + 로컬 `npm run maint:gate` GREEN으로 검증. 프로덕션 재측정은 하지 않음(Cursor Gate 담당 — 레인 분리).

## 남은 블로커 (사람/Cursor 담당 — Claude Out)

1. **B8 실측(prod)** — pause 해제 상태에서 1클릭 → Gemini Interactions 1건 실측 (Cursor Gate).
2. **High#1 extra/layout 실토스연동 여부 확정** — 현재는 Option B(문구 정직화)로 이미 배포·수용됨. Option A(실연동)로 갈지는 회장/Cursor 제품 결정 — 코드는 건드리지 않음(`FINDINGS.md` High#1).
3. **C-법·C-PG** (`LAUNCH_DDAY.md` C1–C12) — 사람 체크, 본 런 미실행.
4. **maint:gate를 prod base로 재실행**하여 flow-e2e 패치가 실제 배포 후에도 GREEN인지 확인 (Cursor Gate).

## 통과한 것 (유지)

- 과금 출구 단일화 · SHOT=1 · 이중제출 가드 · pause 킬스위치 — 변경 없이 유지 확인.
- health GREEN · checkout/complete/token rotate OK.
- 금액 서버 진실.
- **신규:** flow-e2e GREEN(로컬) · checkout IDOR 2건 폐쇄 · checkout rate limit.

## 다음 한 방 (Cursor)

```powershell
cd D:\Memento\projects\danjeongshot
git fetch origin
git log --oneline origin/master..origin/worktree-danjeong-precheck-b2   # 이번 세션 브랜치 확인
# 병합/배포 판단 후:
npm run maint:gate -- --base https://danjeongshot.vercel.app
npm run maint:payment-integrity -- --base https://danjeongshot.vercel.app
# /make 프리뷰 1회 → Google AI Studio Interactions + /api/ops/bill-log
```
