# 20260918 DANJEONG SELFIE FULLSCREEN 증거 (회장 실사용 피드백 → 풀스크린 오버레이 + 셔터음 → prod 배포)

> 발주: `docs/handoff/CLAUDE_DANJEONG_SELFIE_FULLSCREEN_v1.md` (회장 2026-09-18 18:07 · Cursor Gate)
> 시공: Claude · 기준 `master(9534551)` (형제 세션이 이미 원일 포팅 배포·검증방법론 정정까지 끝내둔 상태) → 브랜치 `feat/wonil-selfie-port`에 이어서 커밋 `cfabbce` → master fast-forward
> Out 준수: 결제·`/api/generate`·billGate·claim·원일 코드 미변경(diff는 `src/components/make/SelfieCapture.tsx` 1개 파일만) · 원일 저장소 쓰기 없음(정본 확인용 read-only grep 1회만, 아래 §4) · 비밀 미노출 · force-push 없음(순수 fast-forward)

## 회장 피드백 3항 (그대로)

1. 단정 촬영박스가 너무 작아
2. 셔터음도 없음
3. 검은색 가이드 화면이 팝업으로 크게 화면 꽉 채워

## 0. 시작 시점 상태 확인 (동시 세션 메모, 투명성 기록)

세션 착수 후 `git fetch` 시 로컬 `feat/wonil-selfie-port`가 이미 `9534551`(= `origin/master`)로 관찰됨. `git reflog`로 원인 확인 결과 버그·충돌이 아니라, 같은 리포에서 떠 있던 형제 백그라운드 세션 2개(`ListAgents`로 확인 — `danjeong-wonil-selfie-port`, `danjeong-selfie-deploy`, 각각 세션 착수 56분/23분 전 시작)가 원일 cam UX 포팅(`d7cd61e`→`362f22f`) 및 그 prod 배포·배포검증 방법론 정정(`9534551` — "raw HTML로 새 문구 확인"이 `BAILOUT_TO_CLIENT_SIDE_RENDERING` 구조상 항상 실패하니 JS 청크를 직접 fetch해 확인해야 한다는 정정. 본 세션이 §3에서 독자적으로 마주친 것과 동일한 함정을 그쪽이 먼저 발견·정정해 둔 것)까지 이미 완료해 둔 상태였음. `ListAgents`로 두 세션 모두 idle임을 확인한 뒤 그 위에 이어서 작업 — 되돌리기·충돌 없음.

## 1. 바꾼 파일 · 한 줄 이유

| 파일 | 변경 | 한 줄 이유 |
|------|------|------------|
| `src/components/make/SelfieCapture.tsx` | 수정 | `mode==="live"`(실제 촬영 중) 구간을 기존 `max-w-[220px]` 인라인 박스에서 `fixed inset-0 z-50` 풀스크린 오버레이로 분리(원 가이드 `min(82vw,60vh)`로 확대) + 셔터 시점 Web Audio 합성 셔터음(`playShutterSound`, 무음/자동재생 차단 시 `navigator.vibrate` 폴백) 추가 |

`PurposeUploadStep.tsx`·`MakeStudio.tsx`·`useGenerate.ts`·`useMakeStudioState.ts`·`/api/generate`·billGate·claim·Toss/checkout·원일 저장소 — **미수정** (grep으로 다른 호출부 없음 확인, props 계약(`selfie`/`inputRef`/`onFile`/`onCapture`/`onClear`) 그대로 재사용).

## 2. 구조 변경 요지

- 기존: `selfie` 유무로만 분기 — 있으면 작은 미리보기 박스, 없으면 idle/live/unsupported 공용의 작은 인라인 박스(`max-w-[220px]`, 라이브 비디오도 그 안에서 재생).
- 변경: 분기를 3단으로 재구성 — ①`selfie` 있음(작은 미리보기 박스, 기존과 100% 동일) ②`selfie` 없고 `mode==="live"`(신규 — 풀스크린 오버레이) ③`selfie` 없고 idle/unsupported(기존과 100% 동일한 작은 진입 타일, 문구도 불변).
- `mode==="live"`는 실제 카메라 스트림이 켜진 상태와 정확히 일치 — 셔터를 누르면 `onCapture`→상위에서 `selfie`가 set되고, 렌더 분기에서 ①이 ②보다 먼저 체크되므로 풀스크린 종료를 위한 별도 상태 없이 자동으로 작은 미리보기 박스로 복귀함(기존 로직을 그대로 활용, 신규 상태 변수 추가 없음). "다시 찍기"는 `onClear()+startCam()`으로 `mode`를 다시 `"live"`로 되돌려 풀스크린을 재진입(카메라 앱의 통상 동작과 동일). "뒤로"는 `stopCam()+setMode("idle")+onClear()` — 오버레이 종료 후 idle 타일로 복귀.
- 회장 요구("닫기/뒤로/다시 찍기로 오버레이 해제") 충족을 위해, 라이브 촬영 중에도 이탈 가능하도록 오버레이 우상단에 명시적 "뒤로" 버튼을 신규 추가(기존 코드엔 라이브 중 이탈 버튼 자체가 없었음 — 촬영하거나 새로고침하는 수밖에 없던 상태). ESC 키 처리·바디 스크롤 잠금은 이 리포에 이미 있는 `DownloadPreviewModal.tsx`의 풀스크린 모달 컨벤션(`fixed inset-0 z-50`, `document.body.style.overflow` lock, Escape → close)을 그대로 재사용 — 신규 패턴 도입 없음.
- 셔터음: 외부 음원 파일 없이 `AudioContext` 오실레이터 2회 블립(1900→1100Hz "클릭" + 1300→500Hz "클랙")으로 합성 — Out 항목("큰 외부 음원 라이선스 문제") 회피. `AudioContext` 미지원/생성 실패/자동재생 차단 시 `navigator.vibrate(35)` 폴백, 두 경우 모두 기존 `flash()` 시각 피드백은 항상 별도로 먼저 실행됨(셔터 함수 내 flash()·playShutterSound() 모두 무조건 호출, 사운드 성패와 무관).
- 밝기 배지(`sampleBright`, lum≥60 임계값)·거울 반전 캡처(`translate+scale(-1,1)`)·플래시 펄스·다시 찍기/뒤로 버튼의 **로직은 1바이트도 변경 없음** — 배치 위치·크기만 풀스크린 컨테이너에 맞게 재조정.

## 3. 검증

| # | 기준 | 결과 |
|---|------|------|
| 1 | `npx tsc --noEmit` | PASS — 오류 0 |
| 2 | `npm run build` | PASS — 34/34 정적 페이지, `/make` 포함, 타입체크 포함 통과 |
| 3 | 로컬 `next start` 스모크 방법론 | HTTP 200 확인. 단, raw HTML엔 `BAILOUT_TO_CLIENT_SIDE_RENDERING`로 "로딩…" 폴백만 있고 신규 문구 없음 — **배포 전 origin master(`9534551`, 내 변경 이전) 기준 라이브 prod에서도 동일 마커 1건 확인**하여 이것이 내 변경의 회귀가 아니라 `MakeStudio`의 기존 `useSearchParams()` 정적 프리렌더 한계(변경 이전부터 있던 기존 구조, §0에서 언급한 형제 세션 `9534551` 정정과 동일 원인)임을 먼저 확인함. 이후 raw HTML 대신 **JS 청크를 직접 fetch해 문자열 검증**(파이프+head 오탐 없이 `grep -l`로 직접 종료코드 사용 — 형제 세션이 `9534551`에서 정정해 둔 것과 동일 방법론)으로 전환 |
| 4 | prod 배포 후 GitHub commit status (Vercel) | PASS — `gh api repos/goho1004/danjeongshot/commits/cfabbce/status` → `state: success`, `"Deployment has completed"` |
| 5 | prod `/make` 200 · 에러 마커 부재 | PASS — `curl -sS -o /dev/null -w "%{http_code}"` → `200`; `Application error`/`__next_error__` 미검출 |
| 6 | prod JS 청크에 신규 코드 포함 | PASS — 배포 후 `/make`가 참조하는 `/_next/static/chunks/641-6232b5377530c7d1.js`를 직접 fetch, `webkitAudioContext`·`얼굴을 원 안에 맞춰 주세요`·`셔터` 3개 리터럴 모두 확인 |
| 7 | prod CSS에 풀스크린 원 가이드 크기·안전영역 패딩 반영 | PASS — `/_next/static/css/72480044714c993d.css`에서 `min(82vw,60vh)`(원 가이드 크기) 및 `safe-area-inset`(노치 대응 패딩) 확인 |

**미검증(명시, 이전 두 세션과 동일한 한계):** 실제 모바일 기기에서 (a) 풀스크린 오버레이의 실제 시각적 크기·레이아웃(노치/안전영역 포함), (b) 셔터음이 실제로 들리는지(기기 무음 모드·브라우저별 자동재생 정책은 기종·OS마다 편차가 큼), (c) 무음/차단 시 진동 폴백 동작, (d) 라이브 비디오·밝기 배지·거울 반전 촬영 결과물 육안 확인은 헤드리스 CLI 세션 한계로 미실시. **회장 실기(모바일) 확인 권장** — 셔터음은 첫 상호작용(셔터 탭 그 자체) 안에서 `AudioContext`를 생성/재생하므로 이론상 대부분 브라우저의 자동재생 정책을 통과하나, 100% 보장은 실기 확인만 가능.

## 4. Out 준수 확인

| 금지 항목 | 확인 |
|---|---|
| 결제·generate·billGate·claim 로직 변경 | 미해당 — 커밋에 포함된 파일은 `SelfieCapture.tsx` 1개뿐(커밋 전 `git diff --cached --stat`로 확인) |
| 원일 코드 수정 | 미해당 — `D:\Memento_Wonil` 쓰기 없음. 읽기는 1회 있었음: `worker.html`의 cam 관련 CSS 셀렉터(`.ap-cam .stage` 등)를 read-only grep으로 확인 — 원일 자체 스테이지가 `244px` 고정(풀스크린 아님)임을 알게 되어, "원일처럼"이 크기가 아니라 어두운 배경·원 가이드·셔터 등 시각 계약을 뜻함을 확정하고 회장의 명시적 "풀스크린" 요구를 그 크기 제약 없이 그대로 따름. 정본을 읽기 전용으로 참조하는 것은 두 선행 증거 MD(`20260918_DANJEONG_WONIL_SELFIE_PORT.md`)에서도 이미 동일하게 허용·기록된 패턴 |
| 큰 외부 음원 라이선스 문제 | 미해당 — 셔터음은 Web Audio 오실레이터로 즉석 합성, 외부 에셋·라이선스 없음 |
| 비밀 커밋 | 미해당 — 본 문서·커밋에 시크릿 없음 |
| 회장 승인 없는 force-push·파괴적 작업 | 미해당 — 순수 fast-forward(`9534551..cfabbce`), 히스토리 재작성 없음. 이번 배포 자체가 회장 발주서(승인) 대상 행위 |

**무관 워크트리 WIP 미혼입 확인:** 커밋 전 `git status --short`상 14개 파일이 dirty했음(Cursor의 결제 로그/analytics/watchdog 관련 미커밋 WIP — 이전 세션들의 증거 문서에서도 동일하게 "무관 축"으로 기록됨). `git add`는 `src/components/make/SelfieCapture.tsx` 하나만 명시 지정했고, 커밋 전 `git diff --cached --stat`로 스테이징 내용이 정확히 그 1개 파일뿐임을 확인한 뒤 커밋함.

## Section H (끝 보고)

- 회장 요구 1 (촬영박스 크기): done — 라이브 촬영 구간을 풀스크린 오버레이(`min(82vw,60vh)` 원 가이드)로 교체 (§2, §3-6·7)
- 회장 요구 2 (셔터음): done — Web Audio 합성 셔터음 + 진동 폴백, 무음원 라이선스 이슈 없음 (§2, §3-6)
- 회장 요구 3 (검은 가이드 풀스크린 팝업): done — `mode==="live"` 전체가 `fixed inset-0 z-50` 오버레이(원일 스타일 어두운 배경+원 가이드, 뷰포트 대부분 차지) (§2, §3-6·7)
- 유지 항목(밝기 배지/거울반전/플래시/다시 찍기/뒤로): done — 로직 전부 불변, "뒤로"는 라이브 중에도 노출되도록 신규 추가(§2) — 기존 요구보다 한 단계 더 지킴(원래 라이브 중엔 이탈 버튼이 없었음)
- 배포: done — `feat/wonil-selfie-port` → `master` fast-forward, Vercel prod (§3-4·5)
- Out 위반: 없음 (§4)
- branch: `feat/wonil-selfie-port` → `master`로 fast-forward
- commit SHA: `cfabbce159d6b0675637f4ed1ffd48943f732112` (`cfabbce`) — 부모/직전 프로덕션 `9534551`
- 배포 URL: https://danjeongshot.vercel.app (Vercel 배포 상세: https://vercel.com/gracoa/danjeongshot/3ZxHSh59WDiQ2yx3fTWYqao1NqCL)
- 롤백 한 줄: Vercel 대시보드 → 이전 프로덕션 배포(`9534551`)를 **Promote to Production**(git 히스토리 불변, 즉시 복구) — 코드까지 되돌리려면 `git revert cfabbce` 후 push(정방향, force 불요; 이번 커밋은 기존 파일 1개 수정뿐이라 revert 한 줄로 충분, 신규 파일 checkout+rm 불요)
- 막힘: 모바일 실기(풀스크린 레이아웃 육안·셔터음 청취·진동) 확인은 헤드리스 세션 한계로 미실시 — §3 명시, 회장 확인 권장

## 5. 산출물

- 코드 커밋: `cfabbce` (브랜치 `feat/wonil-selfie-port` → `master`)
- 본 증거 MD: `docs/evidence/audit/20260918_DANJEONG_SELFIE_FULLSCREEN.md`
- 일지: `개발중/danjeongshot/일지/2026-09-18.md` append (Memento 저장소, danjeongshot 저장소와 별개)
