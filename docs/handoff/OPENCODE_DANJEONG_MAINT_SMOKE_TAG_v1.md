# OPENCODE_DANJEONG_MAINT_SMOKE_TAG_v1 — 게이트 스모크 ≠ 사람 컷 구분

> **발주:** 회장 2026-09-17 11:38  
> **배경:** prod bill-log/Studio에 **2×2 PNG 스모크**가 사람 컷처럼 보임. 회장 실컷은 Studio에 원본+생성 함께 저장. 11:20대 `imgIn=96`·`ua=unknown` = `maint:gate`/`prepPaid` 자동.  
> **시공:** OpenCode · 패치 ○ · 브랜치+푸시 ○ · **Vercel 배포 ✗**(Cursor)  
> **모델:** `opencode/muse-spark-1.3-contributor-free` · 막히면 Sonnet  
> **워크스페이스:** `D:\Memento\projects\danjeongshot` · `master` 최신

---

## 한 줄

자동 스크립트(Gemini 실발사)가 **장부·티켓·(가능하면 Studio 입력 이미지)**에서 사람 컷과 **한눈에 구분**되게 하라.

---

## In

### 1) 장부 태그 (필수)

- `x-djs-maint-smoke` = `MAINT_SMOKE_SECRET` 유효 시 (`src/lib/maintSmoke.ts` 이미 있음):
  - `geminiBillGate` / `recordBillEvent` 경로에 **`via: "maint_smoke"`** (또는 동등 필드) 기록
  - `ticketId` 접두: **`maint:`** 예) `maint:preview:ord_…` / `maint:redo:ord_…`  
    (기존 `preview:`/`redo:`/`asv:` 앞)
  - `generateCallLog`에도 동일 `via` (또는 `source`) · `uaClass`만으로  suff 하지 말 것

### 2) 스모크 입력 이미지 (필수 · Studio 육안)

- `scripts/lib/smokePng.mjs` `uniqueSmokePngDataUrl`: 2×2 점 대신  
  **작은 PNG에 읽히는 글자** (예: `MAINT` / `SMOKE`) + 실행마다 색·노이즈 달라 SAME_IMAGE 회피 유지.  
- 목표: Google AI Studio Interactions에서 **원본 칸이 ‘사람 셀피’가 아님**이 즉시 보임.  
- 파일 크기 과대 ✗ (수십~수백 KB 이내).

### 3) 게이트 유지 (필수)

- `prepPaid` / `maint:gate` / download-loop / watermark 경로 **깨지 말 것**
- 로컬: `tsc` 또는 프로젝트 관례 체크
- 가능하면 `MOCK_GENERATE=1` 로컬 gate 또는 스모크 1회

### 4) 증거

`docs/evidence/audit/20260917_MAINT_SMOKE_TAG.md`  
- 바꾼 파일 · 샘플 ticketId · Studio/장부에서 구분하는 법 3줄

## Out

- Gemini 호출 자체를 prod gate에서 끄기 ✗ (지금은 실발사 필요 — **태깅·이미지**로 구분)
- P0 claim / 결제 / UX 대규모 ✗
- narrative_core · 시크릿 값 출력 ✗
- Vercel env·배포 ✗

---

## Section H

- via 태그: <done|blocked>
- ticket `maint:` 접두: <done|blocked>
- smoke PNG 문구: <done|blocked>
- branch: <name>
- commit: <sha>
- 증거: <path>
- 막힘: <없으면 none>
- 배포: Cursor

---

## OpenCode 실행

```powershell
cd D:\Memento\projects\danjeongshot
opencode run --dir D:\Memento\projects\danjeongshot --auto `
  -m "opencode/muse-spark-1.3-contributor-free" `
  "Read and follow ONLY: docs/handoff/OPENCODE_DANJEONG_MAINT_SMOKE_TAG_v1.md Tag maint smoke in bill/gen logs + readable SMOKE png. Branch+push. Evidence MD. Section H. No Vercel deploy. No secrets."
```
