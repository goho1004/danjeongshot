# 20260918 DANJEONG SELFIE SCROLL FIX 증거 (촬영 후 스크롤 복구 마무리 → prod 배포)

> 발주: `docs/handoff/CLAUDE_DANJEONG_SELFIE_SCROLL_FINISH_v1.md` (회장 2026-09-18 20:04 · Cursor Gate)
> 숲 팩: `forest_pack_djs_scroll.md`(`CODING_FOREST §10`, mode=patch) 선독 후 시공
> 시공: Claude · 기준 `master(1dd91ce)` → 브랜치 `feat/wonil-selfie-port`에 이어서 커밋 `e9754ae` → master fast-forward
> Out 준수: 결제·`/api/generate`·billGate·장부 미변경(diff는 `SelfieCapture.tsx` 1개 파일만) · 원일 저장소 접근 없음(이번 세션 읽기/쓰기 0회) · "스크롤 대신 버튼만"으로 회피 없음(신규 버튼 없음, 실제 `overflow` 복구) · 비밀·대용량 바이너리 없음

## 회장 메시지 (그대로)

단정 셀피 잘 됐는데 촬영 후 스크롤이 안 됨. 마무리 잘하라.

## 1. 바꾼 파일 · 한 줄 이유

| 파일 | 변경 | 한 줄 이유 |
|------|------|------------|
| `src/components/make/SelfieCapture.tsx` | 수정 | 스크롤 잠금 `useEffect`의 dependency를 `mode` 단독에서 `overlayOpen`(`=!selfie && (mode==="live"\|\|"opening")`)으로 교체 — 실제 풀스크린 오버레이 렌더 조건과 잠금 조건을 일치시켜, 셔터 직후 영구 잠금 회귀를 제거 |

`PurposeUploadStep.tsx`(부모)·`MakeStudio.tsx`·결제·`/api/generate`·billGate·원일 저장소 — **미수정**(부모는 구조 확인차 읽기만, 원일은 열람도 0회).

## A. 원인 분석 (버그의 실체)

렌더 분기 순서(수정 전·후 동일, `SelfieCapture.tsx` L248 / L283): `if (selfie) return <미리보기 타일>` 이 `if (mode==="live"||"opening") return <풀스크린 오버레이>` 보다 **먼저** 체크된다. 즉 오버레이가 실제로 화면에 있는지는 `mode`만으로 결정되지 않고 `!selfie && (mode==="live"||"opening")`로 결정된다. 그런데 수정 전 잠금 effect(구 L129-141)는 `mode`만 dependency로 봤다.

| 트리거 | `mode` 전이 | `selfie` 전이 | 수정 전 잠금 상태 | 수정 후(`overlayOpen`) |
|---|---|---|---|---|
| 셔터 클릭 → `onCapture` | **안 바뀜**(계속 `"live"`) | `null`→문자열(확정) | **버그: 영구히 안 풀림** — `mode`가 그대로라 effect dependency 불변, cleanup(=복구)이 아예 호출 안 됨 | `!selfie`가 false로 전환 → `overlayOpen` false → cleanup 실행, 정상 복구 |
| 다시 찍기(`handleRetake`) | `"live"`→`"opening"`(동일 이벤트 핸들러 내 동기 배치) | 문자열→`null`(동일 배치) | 계속 잠김(의도된 동작) | `true` 유지 — 깜빡임 없이 계속 잠김(회귀 규칙 "촬영 중 잠금 유지" 충족) |
| 뒤로(`handleBack`, 오버레이 상단 버튼·미리보기 타일 공용) | `"live"`/`"opening"`→`"idle"` | (미리보기 경로는 이미 문자열)→`null` | 정상 복구 — `mode` 전이가 있었으므로 **우연히** 작동 | `false` → 정상 복구(결과 동일, 조건은 더 명시적) |
| `getUserMedia` 실패(`startCam` catch) | `"opening"`→`"unsupported"` | `null` 유지 | 정상 복구 — `selfie`가 애초에 `null`이라 `mode` 변화가 곧 오버레이 변화와 일치, 버그 없었음 | `false` → 정상 복구 |
| unmount | — | — | 정상 복구 — React는 dependency 값과 무관하게 unmount 시 cleanup을 항상 실행 | 동일(원래도 안전했던 경로) |

**한 줄 요약:** `mode`와 "오버레이가 실제로 화면에 보이는가"는 서로 다른 두 조건이었다. 두 조건이 같이 움직이는 경로(뒤로·에러)에서는 우연히 맞았고, `selfie`만 바뀌고 `mode`는 그대로인 유일한 경로(셔터 캡처)에서만 어긋나 회장이 본 회귀로 드러났다. "cleanup이 없다"가 아니라 "**dependency가 안 바뀌어 cleanup이 호출 자체가 안 된다**"가 정확한 병명.

## B. 발주 In-2 종료 경로 6개 커버리지

| # | 발주 In-2 항목 | 커버 방식 |
|---|---|---|
| 1 | 셔터 후 미리보기 | `overlayOpen`이 `selfie` truthy 순간 `false`로 전환 → cleanup이 진입 시 캡처해둔 `prevOverflow`로 복구(§A 1행) |
| 2 | 다시 찍기 | `onClear()`+`setMode("opening")`이 한 핸들러 안에서 동시 커밋 → `overlayOpen`은 `true`→`true`로 변화 없음, 복구 불필요한 채 잠금 유지(§A 2행) |
| 3 | 뒤로 | `handleBack`이 `setMode("idle")`+`onClear()` 동시 호출 → `overlayOpen` false, 복구(§A 3행) |
| 4 | 확정 | 코드상 별도 "확정" 버튼은 없음 — 셔터로 찍은 즉시가 곧 확정이고 미리보기 타일 자체가 확정 UI("다시 찍기"/"뒤로"만 존재). 1번과 동일 경로로 이미 커버됨. 상위 `PurposeUploadStep.tsx` 확인 결과 이 단계 다음("더 맞추기"/다음 스텝) 진행 시점엔 이미 `selfie`가 확정돼 있어 `overlayOpen`은 이미 `false` — 이후 어떤 위저드 전환이 오든 잠금 상태와 무관 |
| 5 | unmount | `useEffect` cleanup은 React가 dependency와 무관하게 unmount 시 항상 실행(§A 5행). `PurposeUploadStep.tsx` 확인 결과 위저드 흐름 중 `SelfieCapture` 자체가 언마운트되는 지점은 없음(항상 마운트 유지, 내부 분기만 전환) — 그래도 방어적으로 안전 |
| 6 | 에러(`getUserMedia` 거부/미지원) | `mode`→`"unsupported"`, `selfie`는 `null` 유지 → `overlayOpen` false, 복구. 이 경로는 수정 전에도 이미 정상이었음(§A 4행) |

**회귀 확인(촬영 중엔 잠금 유지 · 닫힌 뒤엔 문서·`/make` 스크롤 O):** 코드 경로 정적 추적으로 6개 항목 전부 확인(위 표). **실기 브라우저에서 손가락/휠로 스크롤해 보는 육안 확인은 헤드리스 세션 한계로 미실시** — 이전 세 세션과 동일한 한계, 회장 실기 확인 권장.

## 2. 검증

| # | 기준 | 결과 |
|---|------|------|
| 1 | `npx tsc --noEmit` | PASS — 오류 0 |
| 2 | `npm run build` | PASS — `✓ Compiled successfully`, 34/34 정적 페이지(`/make` 포함), exit 0 |
| 3 | 커밋 범위 | PASS — `git diff --stat`로 `SelfieCapture.tsx` 1개 파일만 확인(10 insertions, 3 deletions). 무관 Cursor WIP 13개 파일(`bill-log`·`geminiBillGate`·`analyticsMeta`·watchdog 등) + 기존 handoff MD 3개(untracked) + 루트의 `fast-forward`라는 이름의 정체불명 1단어 파일(이전 세션 셸 리다이렉트 잔여물로 추정, 이번 태스크와 무관해 손대지 않음) — `git status --short`로 전부 식별 후 미포함. `git add`는 대상 파일 1개만 명시 지정 |
| 4 | fast-forward 가능성 | PASS — `git fetch origin master` 후 `git merge-base --is-ancestor origin/master HEAD`로 확인, `git push origin feat/wonil-selfie-port:master` → `1dd91ce..e9754ae`, force 없는 순수 FF |
| 5 | prod 배포(Vercel, GitHub commit status) | PASS — `api.github.com/repos/goho1004/danjeongshot/commits/e9754ae/status` → `state: success`, `"Deployment has completed"`(5회 폴링·약 50초 소요 후 success) |
| 6 | prod `/make` 200 · 에러 마커 부재 | PASS — `curl -o /dev/null -w %{http_code}` → `200`(0.81s), `Application error`/`__next_error__` 미검출 |
| 7 | prod JS 번들에 **수정된 로직 자체**가 반영됐는지(단순 "청크가 새로 배포됨" 이상의 증명) | PASS — 이번 diff는 새 UI 문구가 없는 순수 로직 변경이라 카피 grep으로는 증명 불가 → 로컬 빌드 산출물에서 수정 로직의 정확한 minified 지문 `let j=!t&&("live"===o\|\|"opening"===o)`(=`overlayOpen=!selfie&&(mode==="live"\|\|"opening")`의 압축형)을 먼저 확보 → `/make`가 참조하는 9개 청크 중 안정 문자열("얼굴을 원 안에 맞춰")로 `641-7a6e9742f7d47322.js`가 SelfieCapture 포함 청크임을 특정 → 해당 청크에서 위 지문을 `grep -qF`로 재확인, 존재 확인(PASS). chunk id는 로컬(`54-...`)과 prod(`641-...`)가 빌드 환경 차이로 다르게 채번됐으나(웹팩 청크 ID는 콘텐츠 해시만 결정적이고 번호 자체는 비결정적) 지문 내용물은 정확히 일치 |

**미검증(명시, 이전 세션들과 동일한 헤드리스 한계):** 실기 모바일/데스크톱 브라우저에서 촬영→캡처→미리보기 후 실제 손가락/휠 스크롤이 복구되는지의 육안 확인. 코드 경로상 모든 종료 지점에서 `overlayOpen`이 렌더 조건과 정확히 일치함을 정적으로 추적했고(§A·§B), 그 압축된 로직이 실제 prod 번들에 바이트 단위로 존재함을 확인했으나(§2-7), "사용자가 실제로 스크롤할 수 있는지" 자체는 헤드리스 세션 한계로 실기 미실시 — 회장 실기 확인 권장.

## 3. Out 준수 확인

| 금지 항목 | 확인 |
|---|---|
| 결제·`/api/generate`·billGate·장부 로직 변경 | 미해당 — 커밋 파일은 `SelfieCapture.tsx` 1개뿐(§2-3) |
| 원일 저장소 쓰기(또는 읽기) | 미해당 — 이번 세션 `D:\Memento_Wonil` 접근 0회(파일 상단 주석에 과거 세션이 남긴 참조 문구만 이미 존재, 이번엔 열람조차 안 함) |
| "스크롤 대신 버튼만"으로 회피 | 미해당 — 새 버튼/UI 추가 없음(diff는 effect 1개의 조건식·dependency 배열 교체 + 주석뿐), 실제 `document.body.style.overflow` 복구로 해결 |
| 비밀·대용량 바이너리 | 미해당 — 텍스트 diff만, 신규 에셋 없음 |
| 회장 승인 없는 force-push·파괴적 작업 | 미해당 — 순수 fast-forward(`1dd91ce..e9754ae`), 히스토리 재작성 없음. 배포 자체가 이번 발주서 승인 대상 행위("끝 = 수정+prod 배포+Section H"로 명시) |

**무관 워크트리 WIP 미혼입 확인:** 세션 시작 시 14개 파일 dirty(기존 Cursor WIP, 이전 세 세션과 동일 축) + handoff MD 3개 신규 untracked + 루트 `fast-forward`(정체불명 1단어 파일) 확인. `git add`는 대상 파일 1개만 명시 지정, 커밋 전 `git status --short`로 스테이징 내용 재확인 완료.

## Section H (끝 보고)

- 증상 원인 확인(§A): done — `mode`와 "오버레이 실제 노출 여부"가 서로 다른 두 조건이었음(`selfie`가 렌더 분기에서 `mode`보다 먼저 체크됨). 셔터 캡처가 유일하게 두 조건이 어긋나는 경로였고, 그게 회장이 본 회귀
- 종료 경로 6개 전부 복구(In 2): done — `overlayOpen` 단일 파생값으로 잠금 조건을 렌더 조건과 통일, 6개 항목 코드 경로 추적 완료(§B)
- `useEffect` cleanup으로 보장(In 3): done — 원래도 cleanup 함수 자체는 있었음(병명은 "cleanup 없음"이 아니라 "dependency 불변으로 cleanup 미호출"), 이번 수정으로 dependency가 실제 노출 여부와 정확히 일치해 모든 종료 지점에서 호출됨
- 회귀(촬영 중 잠금 유지 · 닫힌 뒤 스크롤 O)(In 4): done — 정적 경로 추적 완료(§B), 실기 육안 확인은 헤드리스 한계로 미실시(§2 명시)
- 배포 + 롤백 한 줄(In 5): done — 아래
- Out 위반: 없음(§3)
- branch: `feat/wonil-selfie-port` → `master` fast-forward
- commit SHA: `e9754aed0565bb87ffe83507dec99fa5f821e224`(`e9754ae`) — 부모/직전 프로덕션 `1dd91ced53c84440644760978bac2ee2d581ea2f`(`1dd91ce`)
- 배포 URL: https://danjeongshot.vercel.app (Vercel 배포 상세: https://vercel.com/gracoa/danjeongshot/6hAFuSvFCBXC2bnjaTH8AE1hQvDh)
- 롤백 한 줄: Vercel 대시보드 → 이전 프로덕션 배포(`1dd91ce`)를 **Promote to Production**(즉시 복구, git 히스토리 불변) — 코드까지 되돌리려면 `git revert e9754ae && git push origin master`(기존 파일 1개 수정뿐이라 revert 한 줄로 충분, 신규 파일 없어 checkout+rm 불요)
- 막힘: 실기 스크롤 육안 확인은 헤드리스 세션 한계로 미실시 — §2 명시, 회장 확인 권장

## 4. 산출물

- 코드 커밋: `e9754ae` (브랜치 `feat/wonil-selfie-port` → `master`)
- 본 증거 MD: `docs/evidence/audit/20260918_DANJEONG_SELFIE_SCROLL_FIX.md`
- 일지: `개발중/danjeongshot/일지/2026-09-18.md` append (Memento 저장소, danjeongshot 저장소와 별개)
