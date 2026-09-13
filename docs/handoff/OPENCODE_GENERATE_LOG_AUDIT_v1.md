# OpenCode AUDIT — 단정 generate 장부 + A/S (Gate)

> **Cursor Gate** · 선시공 OK · **완성 전 보고 ✗**  
> **모델:** `opencode/muse-spark-1.3-contributor-free` (뼈·검수) · 깊으면 Sonnet/Opus 환류  
> **워크스페이스:** `D:\Memento\projects\danjeongshot`  
> **Production:** `https://danjeongshot.vercel.app` · 커밋 **`3599dd6`** (Vercel Ready)

---

## 한 줄

**3장 미리보기 + 다시생성 2회** 했는데 `/api/ops/generate-log`가 **entries 0** · 받기 전 **A/S UI**도 배포 전엔 안 보였음.  
**원인 확정 + 최소 수정 + 스모크 증거**만. 리팩터 ✗.

---

## 증상 (회장 실측)

| 항목 | 관측 |
|------|------|
| 미리보기 | 3장 정상 |
| 재생성 | 2회 (redo/asv 혼합 가능) |
| 결제 | 플러스 ₩14,900 진행 |
| 장부 | `GET /api/ops/generate-log` → **entries []**, sums geminiCalls **0** |
| 배포 | `3599dd6` — `await noteGen` + 받기 전 `RegenPanel` |

---

## 이미 한 것 (재시공 ✗)

1. **`noteGen` void → `await`** — Vercel freeze 시 Upstash LPUSH 유실 가설  
   - `src/app/api/generate/route.ts`
2. **받기 전 A/S** — `PaidDonePanel` `awaitingPhoto` 블록에 `RegenPanel`  
   - `src/components/make/steps/PaidDonePanel.tsx`
3. **GEMINI 키** — DanJoung 전용 키로 Vercel Production·Preview 교체 (별건)

---

## 의심 후보 (우선순위)

1. **타이밍** — 3+2회가 `3599dd6` **배포 전** (06:25 UTC ≈ 15:25 KST) → 구 `void noteGen`이라 **복구 불가**
2. **Upstash LIST 쓰기 실패** — `kvSet`(주문)은 되는데 `kvLpush`/`kvLrange`만 깨짐  
   - `src/lib/upstashKv.ts` REST body 형식 · `kvLpush`가 HTTP 200만 보고 **실패 은폐**
3. **`appendGenerateLog` 폴백** — LPUSH false → **인스턴스 메모리** → 다른 요청에서 LRANGE = 빈 배열
4. **경로 미호출** — redo/asv가 `/api/generate` 안 타고 UI만 갱신 (unlikely — 2회 성공했다면 API 탔을 것)

---

## 점검 파일 (primary)

| 파일 | 볼 것 |
|------|--------|
| `src/lib/generateCallLog.ts` | KEY `djs:genlog:v1`, append/list, TTL 필터 |
| `src/lib/upstashKv.ts` | `kvLpush`, `kvLtrim`, `kvLrange`, `runCommand` |
| `src/app/api/generate/route.ts` | `await noteGen` 모든 exit · stage preview/redo/asv |
| `src/app/api/ops/generate-log/route.ts` | maint 헤더 게이트 |
| `src/lib/maintSmoke.ts` | `MAINT_SMOKE_SECRET` |
| `src/hooks/make/useGenerate.ts` | `runPaidRegen` → POST body `stage` |
| `src/components/make/steps/PaidDonePanel.tsx` | 받기 전 `RegenPanel` 노출 |
| `src/components/make/steps/RegenPanel.tsx` | `downloaded` 잠금 |

---

## 실행 — Gate 스모크 (시크릿 **값 적지 마**)

```powershell
cd D:\Memento\projects\danjeongshot

# 1) 장부 조회 (로컬 .env.local 의 MAINT_SMOKE_SECRET 사용)
$secret = ((Get-Content .env.local | Where-Object { $_ -match '^MAINT_SMOKE_SECRET=' }) -replace '^MAINT_SMOKE_SECRET=','').Trim()
Invoke-RestMethod -Uri "https://danjeongshot.vercel.app/api/ops/generate-log?limit=50" `
  -Headers @{ "x-djs-maint-smoke" = $secret } | ConvertTo-Json -Depth 6

# 2) maint gate (선택)
npm run maint:gate -- --base https://danjeongshot.vercel.app

# 3) Git 배포 SHA
git log -1 --oneline
gh api repos/goho1004/danjeongshot/deployments --jq ".[0] | {sha: .sha[0:7], env: .environment, created: .created_at}"
```

**기대 (배포 후 신규 1판):**

| HTTP | stage | geminiCalls | geminiOk |
|------|-------|-------------|----------|
| 1 | preview | 3 | 3 |
| 1 | redo | 1 | 1 |
| 1 | asv | 1 | 1 |

3+2 세션 합계: **HTTP 3건**, **geminiCalls 합 5** (preview 3 + redo 1 + asv 1).

---

## 시공 과제 (허용 범위)

### A. 진단 (필수)

- [ ] `3599dd6`에 `await noteGen` **6곳** 실제 있는지 `git show 3599dd6:src/app/api/generate/route.ts`  
- [ ] Prod `generate-log` **배포 후** smoke 1회 → entries ≥1 여부  
- [ ] Upstash: `kvLpush` 후 `kvLrange` **같 프로세스/원격**에서 1건 round-trip 테스트  
  - 실패 시 `runCommand` 응답 body·result 로깅 **ops 전용** (1파일 이내)  
- [ ] 실패해도 generate **200 유지** (장부는 부가)

### B. 수정 (필요할 때만 · 최소 diff)

- `kvLpush`: `result`가 양의 정수인지 검증  
- `appendGenerateLog`: push 실패 시 **console.warn 1줄** (키·프롬프트 ✗)  
- (선택) `GET /api/ops/generate-log`에 `storeOk: boolean` — LPUSH self-test, maint 헤더만

### C. UI (이미 3599dd6)

- [ ] `/make` 결제 후 **받기 전** 「다시 만들기」「한 번 더」 보이는지  
- [ ] **받은 후** 잠금 문구

---

## Out (하지 말 것)

- narrative_core · Tier0 정본 쓰기  
- Gemini 키·토큰·`.env` 값 커밋·handoff에 평문  
- Flash Image / Pro 모델 교체  
- 대규모 refactor · unrelated UX  
- **회장님 Prod 실결제** 스모크 (Gate가 mock/maint로 대체)

---

## 끝 보고 형식 (골수 표)

```markdown
## generate-log AUDIT

| 항목 | 결과 |
|------|------|
| Prod SHA | **3599dd6** (06:25 UTC) · `await noteGen` 6곳 확인 |
| generate-log entries (배포 전) | **[]** · sums geminiCalls **0** (3+2회 포함, 복구 불가) |
| generate-log entries (배포 후) | **[]** — 배포 후 신규 generate smoke **미실행** |
| Upstash LPUSH→LRANGE | **FAIL 의심** → `kvLpush` result 검증 + `storeOk` probe 추가 (다음 배포 후 확인) |
| 원인 (1줄) | 배포 전 `void noteGen` 유실 + `kvLpush`가 HTTP 200만 보고 성공 처리 |
| diff 파일 | `upstashKv.ts`, `generateCallLog.ts`, `generate-log/route.ts` |
| A/S UI (받기 전) | 코드 **PASS** (`PaidDonePanel` 499–521) · 실기 재확인 권장 |

### 다음 구멍
- 배포 후 `storeOk:true` + 컷 1회 → entries≥1 확인
- `storeOk:false`면 Upstash REST 응답 형식 추가 조사
```

---

## OpenCode 실행 예

```powershell
# Desktop: 이 파일만 열고 Muse 1.3
opencode run --dir D:\Memento\projects\danjeongshot --auto `
  -m "opencode/muse-spark-1.3-contributor-free" `
  "docs/handoff/OPENCODE_GENERATE_LOG_AUDIT_v1.md 전문 읽고 AUDIT 표 채워. 수정은 Upstash LIST만 최소 diff."
```

---

## 참고 좌표

- 장부 설계: `docs/MAINTENANCE.md` §8 generate 호출 장부  
- 이전 Gate 메모: `docs/handoff/OPENCODE_CONTINUE.md` (9/2 Gemini 스파이크)  
- Gemini 과금 논쟁: Lite Image 1K ≈ $0.0336/장 · preview 3병렬 ≈ ₩140/HTTP
