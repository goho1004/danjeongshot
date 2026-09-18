# 20260918 DANJEONG SELFIE SPEED ARTIFACT 증거 (캠 기동 속도 + 원일 아티팩 이식 → prod 배포)

> 발주: `docs/handoff/CLAUDE_DANJEONG_SELFIE_SPEED_ARTIFACT_v1.md` (회장 2026-09-18 18:33 · Cursor Gate)
> 숲 팩: `forest_pack_djs_speed.md` (`CODING_FOREST §10`, 공식) 선독 후 시공
> 시공: Claude · 기준 `master(822ef5f)` → 브랜치 `feat/wonil-selfie-port`에 이어서 커밋 `022a3ea` → master fast-forward
> Out 준수: 결제·`/api/generate`·billGate·claim·원일 코드 미변경(diff는 `src/components/make/SelfieCapture.tsx` 1개 파일만) · 원일 저장소 쓰기 없음(read-only) · setTimeout식 가짜 속도 없음(전부 실제 상태 전이로 구동) · 비밀·대용량 바이너리 없음

## 회장 메시지 (그대로)

1. 단정 좋아 — 근데 팝업 후 카메라 활성화가 엄청 느림. 원일은 바로 올라온다 → 코드 비교하라.
2. 화면 아티팩도 원일이 더 고급 → 원일 아티팩을 가져와.
3. (맥락) 메멘토 먹이기 공식 사용.

## 1. 바꾼 파일 · 한 줄 이유

| 파일 | 변경 | 한 줄 이유 |
|------|------|------------|
| `src/components/make/SelfieCapture.tsx` | 수정 | `mode`에 `"opening"` 추가해 스테이지 노출을 `getUserMedia` 완료 이전으로 당기고(기동 체감), `face-guide` 비네트·셔터/배지 비율·헤딩 타이포를 원일 톤으로 이식(아티팩) |

`PurposeUploadStep.tsx`·`MakeStudio.tsx`·`useGenerate.ts`·`useMakeStudioState.ts`·`/api/generate`·billGate·claim·Toss/checkout·원일 저장소 — **미수정**.

## A. 코드 비교 (필수 · 원일 `worker.html` cam vs 단정 `SelfieCapture`)

| 축 | 원일 `worker.html` (읽기 전용 정본) | 단정 `SelfieCapture.tsx` — 수정 전 | 단정 — 수정 후 |
|---|---|---|---|
| **호출 시점** | `go("cam")`(L1028-1033)이 `startCam()`을 **await 없이** 호출한 직후, **같은 동기 틱**에 `el.hidden = el.dataset.scr !== name`로 `.ap-cam` 전체(스테이지·링·가이드·셔터)를 즉시 노출(L1031-1033). `getUserMedia`는 그 뒤 비동기로 눈에 안 보이게 진행 | `handleZoneClick`(구 L181-189)이 `await startCam()` — **스테이지 자체가 `mode==="live"`일 때만 마운트되는 조건부 렌더**(구 L276)라, `getUserMedia` 프라미스가 풀리기 전까지 화면에 **아무 변화 없음** | `handleZoneClick`이 `setMode("opening")`을 **동기로 먼저 세팅**(클릭 즉시 커밋) → 스테이지 JSX를 `mode==="live"\|\|"opening"` 조건으로 확장해 **같은 틱에 노출**, `startCam()`은 그 뒤 `void ...then()`으로 병행 |
| **마운트 비용** | 정적 HTML, `hidden` 속성 토글 1줄 — 마운트 비용 사실상 0 | React 조건부 분기 마운트가 **프라미스 resolve 이후**에만 처음 실행 — 마운트와 카메라 초기화가 **직렬** | 마운트은 클릭 즉시(스트림 없이 먼저) 일어나고 카메라 초기화는 **병렬**로 진행 — 사용자는 빈 스테이지가 아니라 "이미 완성된 부스"를 먼저 봄 |
| **video 자체 노출** | `v.hidden = true`로 시작, `srcObject` 대입 직후(L1185-1186) `hidden=false` — 스테이지 chrome과 별도로 늦게 노출 | `<video>`가 스테이지와 **한 몸**이라 분리 노출 개념 자체가 없었음(스테이지=video 마운트 시점) | `<video>`는 항상 마운트하되 `camReady(mode==="live")`까지 `opacity-0`로 페이드(신규 L311-313) — 원일의 "chrome 먼저, feed 나중" 계약을 React에서 동일 재현 |
| **추가 비동기 홉** | 없음 — `srcObject` 대입은 `await getUserMedia` 직후 동기 | `requestAnimationFrame(() => { srcObject 대입 ... })`(구 L103-110) — resolve 이후 **rAF 1틱을 추가로 대기**한 뒤에야 재생 시작 | rAF 래퍼 제거, `await getUserMedia` 직후 곧바로 `v.srcObject`/`play()`(신규 L104-109) — 원일과 동일하게 홉 0 |
| **constraints** | `{ video: { facingMode: "user" }, audio: false }`(L1184) | 동일 `{ video: { facingMode: "user" }, audio: false }`(구 L97-100) | 변경 없음 — constraints는 원래부터 동일, 속도 차이의 원인이 아니었음 |
| **권한 프롬프트·폴백** | 실패 시 `ap-cam-msg` 텍스트 교체 + 배지를 "앨범에서 고르기"로(L1190-1192), 명시적 화면 전환 없음 | 실패 시 `setMode("unsupported")` → 다음 렌더에서 idle 타일로 복귀 + `inputRef.current?.click()`(구 L112-115, 187-188) | 동일 유지 — `mode==="unsupported"`는 풀스크린 분기(`live\|\|opening`) 밖이라 자동으로 작은 타일로 복귀 후 앨범 폴백. 권한 모델 자체는 원일과 단정이 이미 동등(둘 다 동일 API, 거부 시 즉시 폴백) |
| **왜 원일이 빠르게 "느껴지는가" (한 줄)** | 실제 `getUserMedia` 지연 시간은 원일·단정이 (동일 API·동일 constraints이므로) **사실상 동일**함 — 차이는 하드웨어 속도가 아니라 **그 지연 시간 동안 화면에 무엇이 보이는가**였음. 원일은 지연 내내 "이미 완성된 스테이지"를 보여주고, 단정(수정 전)은 지연 내내 **아무것도 안 바뀐 화면**을 보여주다 완료 순간 전체 UI가 팝업하듯 등장 — 이게 "느리다"는 체감의 실체 | — | — |
| **단정에 적용한 최소 변경** | — | — | 상태값 1개 추가(`"opening"`), 조건부 렌더 경계 1곳 확장, rAF 홉 제거, video만 opacity로 분리 노출. `getUserMedia` 호출 자체·constraints·권한 로직은 전부 그대로 — "실제로 더 빠르게" 만든 게 아니라 **원일과 동일하게 "체감 지연을 화면 뒤로 숨김"** |

## 2. 아티팩 이식 상세 (In C)

| 원일 요소 | 원일 계약 | 단정 반영 |
|---|---|---|
| `.face-guide` 비네트 | `radial-gradient(ellipse 38% 46% at 50% 42%, transparent 62%, rgba(18,36,58,.45) 63%)` + `::after`로 "정면을 봐주세요" 캡션(worker.html L29-32) | 동일 계약의 타원 스포트라이트를 단정 스테이지에 신규 추가(신규 L315-323, `radial-gradient(ellipse 40% 48% at 50% 42%, transparent 62%, rgba(3,8,16,0.55) 63%)`) — 캡션은 단정이 이미 스테이지 아래 2줄 헤딩("얼굴을 원 안에 맞춰 주세요" / "정면 · 어깨까지 · 밝게")으로 동일 정보를 전달 중이라 인라인 캡션은 **의도적으로 생략**(중복 텍스트로 인한 잡음 방지 — 단정 톤 옷 입히기, 통째 복붙 아님) |
| `.ring` / `.ring2` | `border:2.5px dashed rgba(255,255,255,.46)` / `inset:-16px;border:1px solid rgba(64,144,240,.34)`(worker.html L114-117) | 단정은 이미 동일 계약의 이중 링(`border-dashed border-white/45` + `border-studio-soft/30`)을 원일 포팅 세션(17:15)에서 이식 완료 — 이번 세션 변경 없음, 유지만 확인 |
| `.ap-shutter` | `86px/66px` 원, `border:4.5px solid #fff`(worker.html L122-124) — 244px 스테이지 대비 굵고 큰 비율 | 단정 풀스크린 스테이지(`min(82vw,60vh)`, 원일보다 훨씬 큼) 기준으로 `h-16/w-16`·`border-[3px]`(얇음)이던 것을 `h-20/w-20`·`border-[4px]` + `shadow-lg shadow-black/40`으로 확대(신규 L346-349) — 더 큰 캔버스에 맞는 비율과 그림자 깊이감 |
| 밝기 배지 | `.ap-bright` 굵은 배지, 상태색 2종(worker.html L118-121) | 기존 배지 유지 + `shadow-lg shadow-black/30` 추가로 입체감(신규 L326-328) |
| 헤딩 타이포 계층 | 메인 `21px/800`, 서브 `14.5px`(worker.html L416-417) | 메인 `15px/semibold`→`19px/extrabold`, 서브 `12px`→`13px`(신규 L335-338) — 풀스크린 스테이지 크기에 맞는 위계 강화 |

## 3. 검증

| # | 기준 | 결과 |
|---|------|------|
| 1 | `npx tsc --noEmit` | PASS — 오류 0 |
| 2 | `npm run build` | PASS — 34/34 정적 페이지, `/make` 포함, lint+타입체크 통과, `✓ Compiled successfully` |
| 3 | 커밋 범위 | PASS — `git diff --cached --stat` 커밋 전 확인, `SelfieCapture.tsx` 1개 파일만(41 insertions, 22 deletions). 무관 Cursor WIP(bill-log·geminiBillGate·analyticsMeta·watchdog 등 13개 파일)는 `git status --short`로 식별 후 전부 미포함 |
| 4 | fast-forward 가능성 | PASS — `git merge-base --is-ancestor origin/master HEAD` 확인 후 `git push origin feat/wonil-selfie-port:master` — `822ef5f..022a3ea`, force 없는 순수 FF |
| 5 | prod 배포 (Vercel) | PASS — `curl .../commits/022a3ea/status` → `state: success`, `"Deployment has completed"` |
| 6 | prod `/make` 200 | PASS — `curl -o /dev/null -w "%{http_code}"` → `200` (0.07s) |
| 7 | prod JS 청크에 신규 코드 반영 | PASS — `/make`가 참조하는 `/_next/static/chunks/641-4a8cec6d7c67bb90.js`를 직접 fetch, 아래 리터럴 전부 확인: `radial-gradient(ellipse 40% 48% at 50% 42%, transparent 62%, rgba(3,8,16,0.55) 63%)`(정확히 일치), `extrabold`, `shadow-black`, `얼굴을 원 안에 맞춰` 텍스트, `"opening"` 리터럴(5회 출현 — 타입/두 호출부/조건부 렌더/파생값과 정합), `webkitAudioContext`(이전 세션 셔터음 기능 존속 확인 겸 올바른 번들 대상 확인) |

**미검증(명시, 이전 세션들과 동일한 헤드리스 한계):** 실기 모바일에서 (a) 클릭→스테이지 노출까지의 체감 지연이 실제로 원일과 동등하게 느껴지는지 육안 타이밍 비교, (b) `face-guide` 비네트·확대된 셔터의 실제 시각적 고급감, (c) 저사양 기기에서의 rAF 홉 제거 효과 체감. 코드 경로상 "스테이지 마운트가 `getUserMedia` 완료를 기다리지 않는다"는 것은 §A에서 라인 단위로 정적 확인했고 이것이 체감 속도의 구조적 원인이었음을 원일과의 코드 대조로 논증했으나, **실기 스톱워치 비교는 헤드리스 세션 한계로 미실시 — 회장 실기 확인 권장**.

## 4. Out 준수 확인

| 금지 항목 | 확인 |
|---|---|
| 원일 코드 수정 | 미해당 — `D:\Memento_Wonil` 쓰기 없음. 이번 세션 읽기 2회(CSS 규칙 L100-134, HTML 마크업 L400-429, JS L1160-1235) — 전부 read-only, `Read`/`Grep` 도구만 사용 |
| 결제/생성/장부 | 미해당 — 커밋 파일은 `SelfieCapture.tsx` 1개뿐(§3-3) |
| "일단 setTimeout으로 가림" 식 가짜 속도 | 미해당 — 신규 `opening` 상태는 실제 `getUserMedia` 진행 상태를 반영하는 진짜 상태 전이이지 타이머 눈속임이 아님. `video` opacity 전환도 `camReady`(=`mode==="live"`, 스트림 실제 도착) 기준 — 고정 딜레이 없음 |
| 비밀·대용량 바이너리 | 미해당 — 텍스트 diff만, 신규 에셋 없음 |
| 회장 승인 없는 force-push·파괴적 작업 | 미해당 — 순수 fast-forward(`822ef5f..022a3ea`), 히스토리 재작성 없음. 배포 자체가 이번 발주서의 승인 대상 행위("끝 조건"에 prod 배포 명시) |

**무관 워크트리 WIP 미혼입 확인:** 세션 시작 시 `git status --short`에서 14개 파일이 dirty(전부 기존 Cursor WIP — 이전 세 세션의 증거 MD에서도 동일하게 기록된 무관 축)였음. `git add`는 `src/components/make/SelfieCapture.tsx` 하나만 명시 지정, 커밋 전 스테이징 내용을 재확인 후 커밋.

## Section H (끝 보고)

- 비교표 (§A): done — 원일 `go("cam")`이 `startCam()`을 기다리지 않고 스테이지를 동기 노출하는 반면, 단정은 스테이지 마운트 자체가 `getUserMedia` resolve에 종속되어 있었던 것이 근본 원인. 라인 단위 대조 완료
- 기동 체감 개선 (In B): done — `mode="opening"`을 클릭과 동시에 동기 세팅해 스테이지·링·가이드·셔터를 즉시 노출, `video`만 스트림 도착까지 페이드. `requestAnimationFrame` 홉도 제거해 resolve 직후 곧바로 재생 시작(§A, §2)
- 아티팩 원일급 (In C): done — `face-guide` 비네트 신규 이식(원일에 없던 걸 만든 게 아니라 있는데 단정에 빠져있던 요소), 셔터/배지 비율·그림자, 헤딩 타이포 계층 강화(§2) — 기존 밝기 배지/거울반전/플래시 로직은 불변
- 배포 + 롤백 한 줄 (In D): done — 아래
- Out 위반: 없음 (§4)
- branch: `feat/wonil-selfie-port` → `master` fast-forward
- commit SHA: `022a3ea8d550be7a87138416c05ca1add3f87152`(`022a3ea`) — 부모/직전 프로덕션 `822ef5f7ea8930ada554c536e572808e24fda11f`(`822ef5f`)
- 배포 URL: https://danjeongshot.vercel.app (Vercel 배포 상세: https://vercel.com/gracoa/danjeongshot/4zZ3mBbf84HkZ8QhczvuPgxyqquW)
- 롤백 한 줄: Vercel 대시보드 → 이전 프로덕션 배포(`822ef5f`)를 **Promote to Production**(즉시 복구, git 히스토리 불변) — 코드까지 되돌리려면 `git revert 022a3ea && git push origin master`(기존 파일 1개 수정뿐이라 revert 한 줄로 충분, 신규 파일 없어 checkout+rm 불요)
- 막힘: 실기 모바일 체감 속도·시각 비교는 헤드리스 세션 한계로 미실시 — §3 명시, 회장 확인 권장

## 5. 산출물

- 코드 커밋: `022a3ea` (브랜치 `feat/wonil-selfie-port` → `master`)
- 본 증거 MD: `docs/evidence/audit/20260918_DANJEONG_SELFIE_SPEED_ARTIFACT.md`
- 일지: `개발중/danjeongshot/일지/2026-09-18.md` append (Memento 저장소, danjeongshot 저장소와 별개)
