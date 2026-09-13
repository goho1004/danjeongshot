# OpenCode — 전체 스모크 + 오류 시뮬레이션 (Gate)

> **Cursor Gate** · 선시공 OK · **완성 전 보고 ✗**  
> **모델:** `opencode/muse-spark-1.3-contributor-free` (뼈·검수) · 구멍 깊으면 Sonnet  
> **워크스페이스:** `D:\Memento\projects\danjeongshot`  
> **Production:** `https://danjeongshot.vercel.app`  
> **선행 커밋:** `b72076a` (LPUSH 검증 · `storeOk` probe) · 그전 `3599dd6` (await noteGen · 받기 전 A/S)

---

## 한 줄

**Prod 전체 게이트 스모크 + 결제/생성/다운로드 오류 시뮬레이션**으로 GREEN/RED를 표로 확정.  
**실결제 ✗** · maint 헤더·mock만. 시크릿·키 값 **보고·커밋 ✗**.

**막힌 골수 (이미 관측):**  
`GET /api/ops/generate-log` → `storeOk=false` · `entries=[]` · `mode=upstash`  
→ Upstash LIST(LPUSH)가 Prod에서 실패 중. **스모크 중 1순위로 재확인·원인 확정.**

---

## In / Out

### In
1. `npm run maint:gate -- --base https://danjeongshot.vercel.app` → GREEN/failures 전부  
2. generate-log `storeOk` + entries (배포 SHA 일치 확인)  
3. 오류 시뮬레이션 표 (아래 §B) — HTTP 기대 코드·메시지만  
4. 실패 시 **최소 diff** (Upstash REST / generate-log만) · 재스모크  
5. 끝 보고 = 골수 표 (이 문서 하단)

### Out
- narrative_core · Tier0 · wiki 정본  
- Gemini/Toss/Upstash **값** 출력·커밋·handoff 평문  
- 실결제·실키 폭주 generate (한도·비용)  
- Flash Image/Pro 모델 교체 · UX 대규모 리팩터  
- My First Project 키 삭제 (회장 손 · AI Studio UI)

---

## A. 전체 스모크 (순서 고정)

```powershell
cd D:\Memento\projects\danjeongshot

# 0) 좌표
git log -1 --oneline
gh api repos/goho1004/danjeongshot/commits/$(git rev-parse HEAD)/status --jq "{state, statuses: [.statuses[]? | {context, state, description}]}"

# 1) 게이트 (권장 한 방)
npm run maint:gate -- --base https://danjeongshot.vercel.app

# 2) 개별 (gate 실패 시 쪼개기)
npm run maint:health -- --base https://danjeongshot.vercel.app
npm run maint:env-check -- --base https://danjeongshot.vercel.app
npm run maint:payment-integrity -- --base https://danjeongshot.vercel.app
npm run maint:smoke -- --base https://danjeongshot.vercel.app
npm run maint:download-loop -- --base https://danjeongshot.vercel.app
npm run maint:watermark -- --base https://danjeongshot.vercel.app
npm run maint:safari-multipart -- --base https://danjeongshot.vercel.app
# Playwright (선택 · 로컬 브라우저)
npm run maint:flow-e2e -- --base https://danjeongshot.vercel.app

# 3) generate 장부 (시크릿 값 출력 ✗)
$secret = ((Get-Content .env.local | Where-Object { $_ -match '^MAINT_SMOKE_SECRET=' }) -replace '^MAINT_SMOKE_SECRET=','').Trim()
Invoke-RestMethod -Uri "https://danjeongshot.vercel.app/api/ops/generate-log?limit=20" `
  -Headers @{ "x-djs-maint-smoke" = $secret } |
  Select-Object mode, storeOk, @{n='n';e={$_.entries.Count}}, sums
```

**기대**

| 단계 | PASS |
|------|------|
| Vercel SHA | HEAD ≈ Prod Ready |
| `maint:gate` | `GREEN: true`, `failures: []` |
| generate-log | `storeOk: true` · (컷 후) entries ≥1 · preview geminiCalls=3 |
| smoke | generate→checkout→download 경로 OK |

**지금 FAIL로 열어 둘 것:** `storeOk:false` → §C.

---

## B. 오류 검사 시뮬레이션 (실결제 ✗)

각 케이스는 **요청 1회 · 기대 status · 바디에 시크릿 없음**.  
`x-djs-maint-smoke`은 게이트 우회용 — **오류 케이스에는 일부러 빼거나 잘못된 값**을 써라.

| # | 시나리오 | 방법 | 기대 |
|---|----------|------|------|
| E1 | generate-log 무권한 | GET `/api/ops/generate-log` 헤더 없음 | **403** `forbidden` |
| E2 | generate-log 틀린 시크릿 | 헤더 `x-djs-maint-smoke: wrong` | **403** |
| E3 | 결제 전 generate | POST `/api/generate` stage=preview · order/token 없음·가짜 | **402** (pay-first — 실측 정정 2026-09-13, 문서 구표기 403 폐기) |
| E4 | 이미지 누락 | POST generate · body에 imageBase64 ✗ | **400** |
| E5 | 이미지 과대 | 12MB+ base64 (가능하면) | **400** |
| E6 | 잘못된 purposeId | 없는 용도 | **400** |
| E7 | redo without paid/unlock | stage=redo · 가짜 orderId/token | **403** |
| E8 | asv without redo | 가능하면 order 상태만 조작(메모리/테스트 API) | **403** 또는 gate 메시지 |
| E9 | download 무토큰 | GET/POST download 인증 실패 | **401/403/410** 중 문서화된 것 |
| E10 | checkout 금액 조작 | 클라이언트 amount ≠ 서버 pack | **거절** (payment-integrity) |
| E11 | MOCK_GENERATE=0인데 키 없음 | (로컬만 · Prod ✗) | mock/STUDIO_BUSY 분기 문서화 |
| E12 | storeOk probe | GET generate-log (정상 시크릿) | **`storeOk:true`** ← 현재 **false** = BLOCKER |

구현 힌트: `scripts/maint/` · `maint:payment-integrity` · `src/lib/maintSmoke.ts` · `src/app/api/generate/route.ts` 게이트 분기.

**시뮬 스크립트 (선택 · 새로 만들면 `scripts/maint/error-sim.mjs` 한 파일만 · 최소)**

```text
for each E1–E12:
  call → assert status ∈ expected
  print PASS/FAIL line (no secrets)
exit 1 if any FAIL
```

---

## C. storeOk=false 골수 (우선 수정)

### 증상
- `mode: "upstash"` (creds 있음)
- `storeOk: false` (`probeGenLogStore` = LPUSH→LRANGE 실패)
- `entries: []` (실 generate도 장부 안 남음)

### 의심 (코드)
1. `src/lib/upstashKv.ts` `runCommand` — Upstash REST가 **배열 파이프라인** / **단일 커맨드** 응답 형식 불일치  
2. `kvLpush` result 타입 (number vs string `"1"`) — `b72076a`에서 number 검증 추가됨 · string이면 여전히 false  
3. Production `UPSTASH_REDIS_REST_*` 가 Preview와 다르거나 권한 제한  
4. LIST 명령 비활성/구형 엔드포인트

### 허용 수정 (최소)
| 파일 | 할 일 |
|------|--------|
| `src/lib/upstashKv.ts` | REST 응답 파싱 보강 · LPUSH result `Number(x)>0` · 실패 시 **status/result typeof만** warn (토큰 ✗) |
| `src/lib/generateCallLog.ts` | `probeGenLogStore` / append 경로 |
| `src/app/api/ops/generate-log/route.ts` | (이미) `storeOk` 노출 |

### 검증
1. 배포 후 `storeOk:true`  
2. maint smoke generate 1회 → entries ≥1 · stage preview · geminiCalls 3  
3. `maint:gate` GREEN

---

## D. UI 스모크 (브라우저 · 실결제 ✗면 스킵 가능)

| 단계 | 기대 |
|------|------|
| `/make` 로드 | 200 · 팩 ₩/플러스 |
| 결제 후 3컷 | 받기 전 **다시 만들기 / 한 번 더** 보임 (`PaidDonePanel`) |
| 받은 후 | RegenPanel 잠금 문구 |
| A/S·redo | `/api/generate` stage 호출 (Network) |

실결제 돌리지 말고 — **코드 경로 + maint smoke**로 대체. 회장이 이미 ₩14900 돌린 건 참고만.

---

## E. 끝 보고 (골수 표 — 반드시 채움)

```markdown
## FULL SMOKE + ERROR SIM

| 항목 | 결과 |
|------|------|
| Prod SHA | |
| maint:gate | GREEN / RED + failures 요약 |
| generate-log storeOk | true / false |
| generate-log entries (smoke 후) | n= · sums.geminiCalls= |
| E1–E12 | PASS n / FAIL n (실패 ID만) |
| storeOk 원인 (1줄) | |
| diff 파일 | (없으면 `diff 없음`) |
| 재배포 후 gate | GREEN / 대기 |

### BLOCKER
- …

### 다음 구멍
- …
```

---

## 결과 (OpenCode 2026-09-13) — BLOCKER 확정

| 항목 | 결과 |
|------|------|
| Prod SHA | `1485fba` (HEAD 일치) |
| maint:gate | RED — `payment-integrity` FAIL (나머지 GREEN) |
| generate-log storeOk | **false** · `lpush:network:ENOTFOUND` |
| E1–E12 | PASS 9 / FAIL 1(E12) / SKIP 2 |
| **원인** | **Vercel Production `UPSTASH_REDIS_REST_URL` DNS 미해결(ENOTFOUND)** — Upstash 전 명령 실패 → 장부 0 + payment-integrity 402 동반 |

**BLOCKER (회장 손 · 값 공유 ✗):**
Vercel Dashboard → `danjeongshot` → Settings → Environment Variables (**Production**) →
`UPSTASH_REDIS_REST_URL` · `UPSTASH_REDIS_REST_TOKEN` 을 **Upstash 콘솔 현재값**으로 교체 → Redeploy.
(Preview는 정상 동작 — Production만 stale/오타 호스트로 추정)

교체 후 재확인:
```powershell
npm run maint:gate -- --base https://danjeongshot.vercel.app   # GREEN 기대
$secret = ((Get-Content .env.local | ? { $_ -match '^MAINT_SMOKE_SECRET=' }) -replace '^MAINT_SMOKE_SECRET=','').Trim()
Invoke-RestMethod https://danjeongshot.vercel.app/api/ops/generate-log?limit=5 -Headers @{ "x-djs-maint-smoke"=$secret } | Select mode,storeOk
```

---

## Gate GO (회장 2026-09-13) — 전부 실행

| 확인 | 답 |
|------|-----|
| 재배포 | **허용** — diff 후 push → Vercel Ready까지 · 재스모크 |
| E5 12MB · E11 로컬키 · flow-e2e | **스킵 OK** (표에 SKIP 표기) |
| Vercel env Upstash | **이름·존재 여부만** (URL/TOKEN **값 ✗**) |
| 실결제 · 키 평문 | **✗** |

한 줄 주문: **A→B→C 전부 · storeOk=false면 Upstash LIST만 고쳐 push·배포·재스모크 · E 표만 보고.**

## OpenCode 실행

```powershell
opencode run --dir D:\Memento\projects\danjeongshot --auto `
  -m "opencode/muse-spark-1.3-contributor-free" `
  "docs/handoff/OPENCODE_FULL_SMOKE_ERROR_SIM_v1.md 전문 + Gate GO. A→B→C 전부 실행. E5/E11/flow-e2e SKIP. storeOk=false면 Upstash LIST만 최소 diff→push→배포→재스모크. Vercel env는 Upstash 키 존재만. 시크릿 값 ✗. 끝 보고 표만."
```

Desktop: **이 파일만** 열고 Muse 1.3.

---

## 참고

- 일상 게이트: `docs/MAINTENANCE.md` §2  
- 장부 AUDIT: `docs/handoff/OPENCODE_GENERATE_LOG_AUDIT_v1.md`  
- 동시성/Upstash: `docs/CONCURRENCY.md`  
- 원가: Lite Image 1K ≈ $0.0336 · preview×3 ≈ ₩140/HTTP (실키 폭주 ✗)
