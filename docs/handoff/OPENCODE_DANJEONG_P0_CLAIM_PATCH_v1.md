# OPENCODE_DANJEONG_P0_CLAIM_PATCH_v1 — redo/asv 선claim + Upstash fail-closed

> **발주:** 회장 2026-09-17 · Cursor Gate 타당성 통과 후  
> **근거:** `docs/evidence/audit/20260917_DOUBLE_CALL_AND_CODE_HEALTH.md` + `20260917_OPENCODE_AUDIT_VALIDATION.md`  
> **시공:** OpenCode · **패치 ○ · PR ○(또는 브랜치+푸시)**  
> **모델:** `opencode/muse-spark-1.3-contributor-free` · 막히면 Sonnet  
> **워크스페이스:** `D:\Memento\projects\danjeongshot` · 기준 `master`

---

## 한 줄

**P0-1:** redo/asv도 preview처럼 **Gemini 호출 전에** 원자 claim.  
**P0-2:** Upstash 없/오류 시 메모리 폴백(fail-open) 금지 → **503 fail-closed** (유료 경로).

---

## In

### P0-1 (필수)

1. `src/app/api/generate/route.ts`  
   - `stage===redo|asv`일 때: `canRun*` 통과 후, **`callLite1K` / mock 생성 전**에 claim.  
   - claim 실패 → HTTP **안 쏨** · 적절한 4xx/429 (`REDO_INFLIGHT`/`ASV_INFLIGHT` 또는 기존 403 톤과 일관).  
   - 성공 시에만 Gemini → 기존 `finishPaidSingle` → `markRedoDurable`/`markAsvDurable`.
2. `src/lib/orderDurable.ts`  
   - preview의 `claimPreviewGenerate` 패턴을 redo/asv용으로 확장 **또는**  
     `markRedoDurable`/`markAsvDurable`의 `kvSetNx`를 **호출 전 단계로 분리**한 `claimRedoGenerate` / `claimAsvGenerate` 추가.  
   - 이중 mark·이중 claim으로 데드락/영구잠금 만들지 말 것. TTL·실패 해제 정책은 preview와 맞추되, **과금 방지가 UX보다 우선**.
3. 동시 2 POST 시나리오: 기대 = Gemini HTTP **최대 1회**.

### P0-2 (필수 · 회장 방향 = fail-closed)

1. `claimPreviewGenerate` / redo·asv claim / (해당 시) paid claim 경로에서  
   `kvSetNx === null`(Upstash 미설정·오류)일 때 **메모리 Map 폴백 금지**.  
2. 유료 generate 경로에서는 `null` → **503** + 명확 `code`(예: `STORE_UNAVAILABLE`) · Gemini **미발사**.  
3. 로컬/테스트에 Upstash 없을 수 있음 → `MOCK_GENERATE=1` 또는 기존 테스트 훅만 예외 허용(문서 1줄). prod 가정은 Upstash 필수.
4. `docs/`에 짧은 메모 1파일 OK: fail-open → fail-closed 이유.

### 검증 (필수)

- 관련 단위/스크립트가 있으면 실행. 최소: 변경 파일 타입체크 또는 `npm run lint`/`tsc` 중 프로젝트 관례.  
- 가능하면 concurrent redo 2회 시뮬레이션(테스트 또는 스크립트) — Gemini mock.  
- **시크릿·키 값 출력 ✗**.

## Out

- Studio UI·결제 Option A · extra/layout 실연동 ✗  
- P1/P2 일괄 청소 ✗ (이번 범위 밖)  
- narrative_core · 원일/Frappe ✗  
- `PREVIEW_SHOT_COUNT` 다시 올리기 ✗  
- Vercel env 직접 변경 ✗ (코드만; 배포는 Cursor/회장)

---

## 산출

1. 코드 패치 (최소 diff)  
2. 브랜치 `fix/p0-redo-asv-claim` (또는 동등) + push  
3. 증거: `docs/evidence/audit/20260917_P0_CLAIM_PATCH.md`  
   - 바꾼 파일·한 줄 이유  
   - 동시 2POST 기대 동작  
   - fail-closed 동작  
4. Section H (아래)

## Section H (끝 보고)

- P0-1: <done|blocked>  
- P0-2: <done|blocked>  
- branch: <name>  
- commit: <sha>  
- 증거 MD: <path>  
- 막힘: <없으면 none>  
- 배포: Cursor (OpenCode 배포 ✗)

---

## OpenCode 실행

```powershell
cd D:\Memento\projects\danjeongshot
opencode run --dir D:\Memento\projects\danjeongshot --auto `
  -m "opencode/muse-spark-1.3-contributor-free" `
  "Read and follow ONLY: docs/handoff/OPENCODE_DANJEONG_P0_CLAIM_PATCH_v1.md Patch P0-1 and P0-2. Write evidence docs/evidence/audit/20260917_P0_CLAIM_PATCH.md End Section H. No Vercel deploy. No secrets in output."
```
