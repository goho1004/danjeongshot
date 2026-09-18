# 20260918 DANJEONG WONIL SELFIE PORT 증거 (원일 셀카 UX → 단정 포팅)

> 발주: `docs/handoff/CLAUDE_DANJEONG_WONIL_SELFIE_PORT_v1.md` (회장 2026-09-18 17:15 · Cursor Gate)
> 시공: Claude · 기준 `master(8c60339)` → 브랜치 `feat/wonil-selfie-port`
> 정본(읽기 전용): `D:\Memento_Wonil\admin\worker.html` cam 구간 — **쓰기 없음, 확인 완료**
> Out 준수: 결제·`/api/generate`·billGate·claim·maint 스모크·원일 저장소 변경 없음.
> GATE ADD(회장 추가 지시, 이번 턴) 반영: (1) 다시 찍기/뒤로 명시 게이트, (2) 롤백 절차 — 아래 각 섹션.

## 1. 바꾼 파일 · 한 줄 이유

| 파일 | 변경 | 한 줄 이유 |
|------|------|------------|
| `src/components/make/SelfieCapture.tsx` | 신규 | 원일 cam 계약(검정 스테이지·원 가이드·`sampleBright` lum≥60·셔터·거울반전 저장·플래시·재촬영) 이식. 상태는 `idle/live/unsupported` 3치 + `selfie` 유무로 preview 분기 |
| `src/components/make/SelfieFrameGuide.tsx` | 삭제 | 정적 프레임 전용 컴포넌트. 유일 사용처(`PurposeUploadStep`)를 `SelfieCapture`로 교체하며 대체됨 (삭제 전 repo 전역 grep으로 참조 0건 확인) |
| `src/components/make/steps/PurposeUploadStep.tsx` | 수정 | 업로드 드롭존 내부를 `SelfieCapture`로 교체, `onClearSelfie` prop 추가(뒤로 게이트 배선). 기존 "다시 올리기" 버튼·드래그드롭·InlineError·용도/분위기 UI는 그대로 |
| `src/components/make/MakeStudio.tsx` | 수정(1줄) | `onClearSelfie={() => state.setSelfie(null)}` prop 배선 — 상태 setter 자체는 `useMakeStudioState.ts` 기존 것, 새 로직 없음 |

`useGenerate.ts` · `useMakeStudioState.ts` · `/api/generate` · billGate · claim · Toss/checkout — **미수정** (읽기만, grep으로 `processFile`/`selfie` 계약 확인 후 그대로 재사용).

## 2. GATE ADD (1) — 다시 찍기 + 뒤로, 결제·생성 전 unset

- Preview 상태(`selfie` 확정 후) 오버레이에 **다시 찍기**(`onClear()` → 즉시 `startCam()` 재진입) / **뒤로**(`stopCam()` + `onClear()`, idle로 복귀) 버튼 2개.
- `onClear` → `PurposeUploadStep.onClearSelfie` → `state.setSelfie(null)` — 실제로 셀카 state를 **unset**함 (파일 재선택 유도가 아니라 값 자체를 지움).
- 이 버튼은 `PurposeUploadStep`이 렌더되는 동안(용도 선택~결제 전 단계)에만 존재 — `CheckoutStep`·`generate()`는 `state.selfie` 값을 그대로 읽어가는 별도 축이라 이 UI 자체가 결제/생성 로직에 개입하지 않음. 기존 "다시 올리기" 버튼과 동일한 노출 조건 유지(추가 게이팅 없음 = Out 항목인 결제 로직 변경을 피함).

## 3. GATE ADD (2) — 앱 롤백 (Chairman이 싫으면 버릴 수 있게)

- 베이스라인: `master@8c60339` (이번 브랜치의 부모 커밋, `git log`로 확인됨 — 위와 동일).
- 브랜치: `feat/wonil-selfie-port` (master에서 분기, master에는 아직 병합/영향 없음).
- 커밋: `d7cd61e` — 아래 4개 파일만 포함(스테이징 시 `git status --short`로 무관 파일 미포함 확인: `docs/GEMINI_BILL_GATE.md`·`geminiBillGate.ts`·`analyticsMeta.ts`·`productEventLog.ts`·`bill-log`/`product-analytics` route·watchdog 스크립트 등 **기존에 이미 master 작업트리에 있던 Cursor 미커밋 변경분은 이번 커밋에 전혀 포함되지 않음** — 결제/생성/장부 축과 섞임 없음).

**되돌리기 한 줄(정확한 형태 — 신규 파일 1개 포함이라 `checkout`만으로는 안 되고 `rm` 병기 필요):**

```bash
cd D:/Memento/projects/danjeongshot
git checkout master -- src/components/make/SelfieFrameGuide.tsx src/components/make/steps/PurposeUploadStep.tsx src/components/make/MakeStudio.tsx
git rm src/components/make/SelfieCapture.tsx
```

위 2줄 실행 시 4개 파일이 `master@8c60339` 상태로 정확히 복원됨(스테이징까지; 커밋은 별도).
더 간단한 대안: 이 브랜치를 그냥 병합하지 않고 버림 — `git checkout master && git branch -D feat/wonil-selfie-port` (master는 애초에 손댄 적이 없으므로 이걸로 충분).
본 증거 MD(`docs/evidence/audit/20260918_...md`)는 별도 커밋(§5)이라 위 되돌리기 대상에서 제외 — 시도 기록은 남기고 코드만 되돌리는 것을 기본으로 함. 증거까지 지우고 싶다면 그 커밋도 `git revert`/`git rm` 대상에 추가하면 됨.

## 4. 검증

| # | 기준 | 결과 |
|---|------|------|
| 1 | 촬영 화면: 어두운 배경 + 원 가이드 눈에 띔 | PASS — `bg-ink-950` 스테이지 + `ring`(dashed) + `ring2`(studio-soft) 원형 가이드, 원일 `.ap-cam .stage/.ring/.ring2` 계약과 동일 구조 |
| 2 | 라이브 밝기 배지 갱신 (또는 미지원 시 명확 폴백) | PASS(코드 계약) — `sampleBright` 900ms 폴링, `lum>=60` 동일 임계값·동일 공식(0.299R+0.587G+0.114B), 배지 문구 원일과 동일 계열("✓ 밝기 좋습니다" / "더 밝은 곳으로 이동해주세요"). 미지원/거부 시 "카메라를 켤 수 없어요 · 앨범에서 골라 주세요" + 자동 앨범 폴백 |
| 3 | 셔터 촬영 → 미리보기 거울 방향 일관 · 플래시 피드백 | PASS(코드 계약) — 저장 시 `translate+scale(-1,1)`로 거울을 캔버스에 구워서 저장(원일과 동일 계약), 플래시는 흰 오버레이 opacity 0→0.85→0 |
| 4 | 미리보기에서 다시 찍기/뒤로 → 재촬영 가능 | PASS — §2 참조 |
| 5 | 기존 file drop/앨범 경로 회귀 ✗ · generate 전 selfie state 정상 | PASS — 드래그드롭 핸들러 유지(`onCapture`로 동일 `processFile` 재사용), 기존 "다시 올리기" 버튼 미변경, `state.selfie`/`processFile` 계약 미변경(파일 크기·MIME 검증 로직 그대로) |

**로컬 실행 결과**
- `npx tsc --noEmit` — 클린(오류 0).
- `npm run build` — 성공, 34/34 정적 페이지 생성(`/make` 포함), 타입체크 포함 통과.
- `npm run lint` 미실행: `next lint`가 루트 ESLint 설정 부재로 대화형 설정 마법사를 띄움(레포에 `.eslintrc*`가 node_modules 밖에 없음) — 기존 프로젝트 관례(`20260917_P0_CLAIM_PATCH.md` §4에 동일 사유로 기록됨)대로 비파괴 `tsc`로 대체.
- 헤드리스 SSR 스모크: `npm run dev` 기동 → `curl localhost:3000/make` → **HTTP 200**, 응답 HTML에 새 문구("얼굴을 원 안에 맞춰 주세요") 포함·`Application error`/`__next_error__` 마커 없음 확인 후 서버 종료.
- **미검증(명시)**: 실제 카메라 하드웨어·권한 프롬프트·라이브 비디오 화면·밝기 배지의 실측 정확도·셔터 촬영 결과물 육안 확인은 이 세션(헤드리스 CLI, 카메라 없음)에서 직접 조작 불가. 브라우저(모바일 전면 카메라 포함)에서의 수동 확인이 필요함 — Gate 승인 전 사람 확인 권장.

## 5. 산출물

- 코드 커밋: `d7cd61e` (브랜치 `feat/wonil-selfie-port`)
- 본 증거 MD: `docs/evidence/audit/20260918_DANJEONG_WONIL_SELFIE_PORT.md` (별도 커밋 예정, §3 참고)
- 일지: `개발중/danjeongshot/일지/2026-09-18.md` append (Memento 저장소, danjeongshot 저장소와 별개 — 위 롤백 대상 아님)

## Section H (끝 보고)

- In 4항(그래픽·밝기·셔터세트·되돌리기): done
- GATE ADD (1) 다시 찍기/뒤로 명시 게이트: done
- GATE ADD (2) 롤백 절차: done (§3)
- Out 위반: 없음 (결제·생성·billGate·claim·원일 저장소 미수정, 무관 Cursor WIP 미혼입)
- branch: `feat/wonil-selfie-port`
- commit: `d7cd61e` (baseline `master@8c60339`)
- 증거 MD: `docs/evidence/audit/20260918_DANJEONG_WONIL_SELFIE_PORT.md`
- 막힘: 카메라 실기 확인은 헤드리스 세션 한계로 미실시 (§4 명시)
- 배포: 대기 (Gate 승인 전 미배포 · master 미병합)
