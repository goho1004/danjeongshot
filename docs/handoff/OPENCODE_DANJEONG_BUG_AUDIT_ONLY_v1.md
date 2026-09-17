# OPENCODE_DANJEONG_BUG_AUDIT_ONLY_v1 — 버그·코딩 문제 정밀 파악 (고치지 말 것)

> **발주:** 회장 2026-09-17 10:47  
> **시공:** OpenCode · **고치기 ✗ · 패치 ✗ · PR ✗**  
> **산출:** 보고 MD만 · 끝 = Section H  
> **모델:** `opencode/muse-spark-1.3-contributor-free` (기본) · 로직 깊으면 Sonnet  
> **워크스페이스:** `D:\Memento\projects\danjeongshot` (현재 `master` = precheck-b2 병합본)

---

## 한 줄

Google AI Studio에서 **같은 분에 Interactions가 2줄(또는 여러 줄)** 찍힌다.  
**정밀 원인** + **생성·과금·클라 경로 전체 코딩 문제 지도**만. **손대지 마라.**

---

## 회장 관측 (증거)

- Studio: https://aistudio.google.com/logs · 프로젝트 DanJoung Gemini  
- 예: 9/16 06:08 같은 분 **다수 줄** · 프롬프트 `Professional Korean resume headshot…`  
- 모델 `gemini-3.1-flash-lite-image` · 200 · Input/Output 토큰 ~1450/~1450  
- Cursor 가설(참고만·검증 대상): 구 `PREVIEW_SHOT_COUNT=3` / 연타 / Studio 목록 착시 — **확정하지 말고 코드·로그로 재검증**

참고 증거(읽기만):
- `docs/evidence/preflight/20260916b/FINDINGS.md` · `RESULTS.md` · `API_CALL_MAP.md`
- `src/lib/geminiBillGate.ts` · `src/app/api/generate/route.ts` · `src/hooks/make/useGenerate.ts`
- `src/lib/easterEgg.ts` (`PREVIEW_SHOT_COUNT`)

---

## In (조사)

1. **이중(다중) Gemini 호출** — 한 유저 액션당 Studio/Interactions가 N줄인 이유  
   - 서버: `openGeminiTicket` / `callLite1K` / `PREVIEW_SHOT_COUNT` / redo·asv·free-correct  
   - 클라: 이중 submit · React Strict Mode · 재시도 · 결제 후 자동 generate  
   - SDK: `interactions.create`가 로그 2줄로 보이는지 vs 실제 HTTP 2회  
2. **과금 게이트 구멍** — ticket 우회 · 라우트 직호출 · mock/force 경로  
3. **전체 코딩 문제 지도** (생성 레인 중심, 넓게 훑되 우선순위)  
   - 레이스 · 이중POST · 로그 유실 · 권한 · PII 저장 여부  
   - “지금 master에 남은 기술부채” Top 목록

## Out

- **코드 수정 · 커밋 · 배포 · env 변경** ✗  
- 단정 외 원일/Frappe 시공 ✗  
- narrative_core · 시크릿 값 출력 ✗  
- “고치면 된다”만 적고 원인 생략 ✗

---

## 산출물 (필수)

`docs/evidence/audit/20260917_DOUBLE_CALL_AND_CODE_HEALTH.md`

포함:
1. **이중콜 원인** — 확정 / 유력 / 기각 표 (증거 파일·줄번호)  
2. **재현 시나리오** — 클릭 1회당 기대 Studio 줄 수 (구코드 vs 현재 master)  
3. **전체 코딩 문제 지도** — P0/P1/P2 · 파일 · 한 줄 증상 · 고치지 말 것(이번 Out)  
4. **권고만** — 다음에 누가(Cursor/Claude) 고칠지 한 줄씩 · **패치 본문 ✗**

---

## Section H (끝 보고)

- 이중콜 판정: <확정 원인 한 줄>  
- 현재 master 1클릭 기대 Interactions: <N>  
- P0/P1/P2 건수: <n/n/n>  
- 보고서 경로: <path>  
- 막힘: <없으면 none>  
- **패치 여부: NONE (강제)**

---

## OpenCode 실행

```powershell
cd D:\Memento\projects\danjeongshot
opencode run --dir D:\Memento\projects\danjeongshot --auto `
  -m "opencode/muse-spark-1.3-contributor-free" `
  "Read and follow ONLY: docs/handoff/OPENCODE_DANJEONG_BUG_AUDIT_ONLY_v1.md AUDIT ONLY. Do NOT edit source. Write report to docs/evidence/audit/20260917_DOUBLE_CALL_AND_CODE_HEALTH.md End Section H. Patch=NONE."
```
