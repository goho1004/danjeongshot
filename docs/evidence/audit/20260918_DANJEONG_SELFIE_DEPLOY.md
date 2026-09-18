# 20260918 DANJEONG SELFIE DEPLOY 증거 (원일 셀카 포팅 → prod 배포)

> 발주: `docs/handoff/CLAUDE_DANJEONG_SELFIE_DEPLOY_v1.md` (회장 2026-09-18 17:54 · Cursor Gate)
> 시공: Claude · 대상 `feat/wonil-selfie-port`(코드 `d7cd61e` · 증거 `362f22f`) → prod `master`
> Out 준수: 결제·`/api/generate`·billGate·claim 로직 미변경(이번 세션 코드 diff 0) · 원일 저장소 미접근 · 비밀 미노출 · force-push 없음(순수 fast-forward)

## 1. 배포 방법

- **관례 확인:** git 히스토리상 기존 배포는 전부 `master` 푸시 → Vercel GitHub 연동 자동 빌드/배포(`0176bdb` "Vercel Git 재연결 후 master 배포를 트리거한다", `d91e7b8` "Vercel 재배포: generate-log 라우트 반영을 트리거한다" 등이 선례). 로컬 `vercel` CLI는 미설치·미인증(`npx vercel` 실행 시 패키지 다운로드 확인 단계에서 취소됨) — CLI 직접 배포는 정본 경로 아님, git push가 정본.
- **사전 확인:** `git fetch origin` 후 로컬 `master` == `origin/master` == `8c60339`, `master`가 `feat/wonil-selfie-port`의 조상(ancestor)임을 `git merge-base --is-ancestor`로 검증 → **순수 fast-forward**, 분기 없음.
- **실행:** `git push origin feat/wonil-selfie-port:master` → `8c60339..362f22f master -> master`. 워크트리 체크아웃 전환 없이 원격 ref만 이동시켰으므로, 이 워크트리에 있던 무관 Cursor WIP(§3)는 전혀 건드리지 않음.
- **코드 변경: 없음.** 이번 세션은 이미 감사된 커밋(`d7cd61e`+`362f22f`, 증거 `20260918_DANJEONG_WONIL_SELFIE_PORT.md`)을 master로 fast-forward 했을 뿐 — 신규 diff 0줄.

## 2. 배포 검증

| # | 기준 | 결과 |
|---|------|------|
| 1 | GitHub commit status (Vercel) | PASS — 앱 코드 배포(`362f22f`) `state: success`; 증거 문서 커밋으로 트리거된 후속 자동 재배포(`7aa265a`)도 `state: success` — 두 빌드 모두 확인 |
| 2 | `/make` 페이지 200 | PASS — `curl -sS -o /dev/null -w "%{http_code}" https://danjeongshot.vercel.app/make` → `200` (두 배포 각각 재확인) |
| 3 | `/make` 새 문구 존재 | PASS (정정 후 재검증 — 아래 메모) |
| 4 | 에러 마커 부재 | PASS — `Application error` / `__next_error__` 미검출(2회 모두). `500` 문자열 1건 검출됐으나 문맥 확인 결과 전부 무관(`text-ink-500`, `font-weight:500`, Google Fonts `wght@…;500;…` 등 CSS/폰트 토큰) — 실제 5xx 아님 |

**방법론 정정 메모(투명성 기록):** 최초 검증은 raw HTML을 curl로 받아 `grep -o "얼굴을 원 안에 맞춰 주세요" "$OUT" | head -1 && echo FOUND`로 확인했는데, 이 명령은 **셸 버그로 오탐(false positive)** 이었음 — 파이프의 종료코드는 마지막 명령(`head`)의 것이라 grep이 실패해도 `head`가 0을 반환해 항상 "FOUND"가 출력됨. 게다가 `/make`는 셀카 단계가 `BAILOUT_TO_CLIENT_SIDE_RENDERING`로 클라이언트 전용 렌더링되는 구조라 raw HTML엔 애초에 "로딩…" 폴백만 있고 새 문구는 들어있지 않음(구조상 당연 — 배포 성공 여부와 무관). 재검증: `/make`가 참조하는 공유 JS 청크(`972`·`859`·`662`·`641`·`117-...js`)를 직접 fetch하여 `641-47a80ceeab73b91d.js` 안에서 "얼굴을 원 안에 맞춰 주세요" 리터럴을 `grep -l`(파이프 없이 직접 종료코드 사용, 오탐 구조 아님)로 확인 → 실제 배포된 클라이언트 번들에 신규 카피 포함 확인, 진짜 PASS.

**미검증(명시):** 실제 카메라 하드웨어·라이브 비디오·셔터 촬영 결과물의 프로덕션 환경 육안 확인은 헤드리스 세션 한계로 미실시. 코드 레벨 카메라 계약(밝기 임계값·거울반전·플래시 등)은 포팅 단계에서 이미 `20260918_DANJEONG_WONIL_SELFIE_PORT.md` §4에서 PASS 처리됨 — 이번 세션은 배포 자체(빌드·라우팅·정적 마크업 반영)만 검증. 사람의 모바일 실기 확인 권장.

## 3. Out 준수 확인

| 금지 항목 | 확인 |
|---|---|
| 결제·generate·billGate·claim 로직 추가 변경 | 미해당 — 코드 diff 0 (git push만 수행, 파일 add/commit 없음) |
| 원일 레포 쓰기 | 미해당 — `D:\Memento_Wonil` 접근 없음 |
| site_config/.env 비밀 평문 노출 | 미해당 — 본 문서·로그에 시크릿 없음 (`.vercel/project.json`은 projectId/orgId/projectName만, 시크릿 아님) |
| 회장 승인 없는 force-push main 파괴 | 미해당 — 순수 fast-forward(`8c60339..362f22f`), 히스토리 재작성·강제 없음. 이번 배포 자체가 회장 발주서(승인) 대상 행위 |

**워크트리 무관 WIP 미혼입 확인:** `git status`상 14개 파일이 "modified"로 표시되나 `git diff --stat` 실측 시 실제 콘텐츠 변경은 `docs/evidence/watchdog/log-watchdog-last.txt`·`log-watchdog-state.json` 2건뿐(watchdog 스크립트가 계속 갱신하는 라이브 상태 파일, 무관 축). 나머지 12개(`geminiBillGate.ts` 포함)는 CRLF 정규화 경고만 있고 실제 diff 0 — master/feat 브랜치 간 해당 blob 동일(포팅 증거 MD §3에서도 이미 동일하게 확인됨). 이번 배포는 git push(ref 이동)만 수행했으므로 이 워크트리 dirty 상태는 배포 대상에 애초에 포함되지 않음.

## Section H (끝 보고)

- In 1 (대상 확인: `feat/wonil-selfie-port` 코드 `d7cd61e`·증거 `362f22f`): done
- In 2 (배포: master fast-forward push → Vercel prod, 정본 경로): done (§1)
- In 3 (`/make` 스모크: 페이지 200·새 문구): done — PASS (§2)
- In 4 (Section H — SHA·URL·롤백): 본 섹션
- Out 위반: 없음 (§3)
- branch: `feat/wonil-selfie-port` → `master`로 fast-forward
- commit SHA: 앱 코드 `362f22f74f69147a377ed249a6a92bdbc673272f`(`362f22f` = `d7cd61e` 포팅 코드 + 포팅 증거, diff 0으로 배포) — 부모/이전 프로덕션 `8c60339`. master 최종 HEAD는 `7aa265a`(본 증거 MD 자체를 커밋하며 발생한 후속 docs-only 재배포 — 앱 코드 diff 없음, 빌드도 `success`)
- 배포 URL: https://danjeongshot.vercel.app (Vercel 배포 상세 `362f22f`: https://vercel.com/gracoa/danjeongshot/AvtkNSZkiwF9v53avZe3hejvjeGV · `7aa265a`는 동일 앱 코드의 후속 자동 재배포, GitHub commit status로 `success` 확인)
- 롤백 한 줄: Vercel 대시보드 → 이전 프로덕션 배포(`8c60339`)를 **Promote to Production**(git 히스토리 불변, 즉시 복구) — 코드까지 되돌리려면 `git revert 362f22f d7cd61e` 후 push(정방향, force 불요); 브랜치 자체 폐기는 `git branch -D feat/wonil-selfie-port`(단, master는 이미 배포됐으므로 프로덕션 롤백엔 불충분 — 위 두 방법 중 하나 필요)
- 막힘: 카메라 실기(라이브 비디오/셔터 결과물) 육안 확인은 이번에도 헤드리스 한계로 미실시(§2)

## 4. 산출물

- 배포: `master@362f22f` → https://danjeongshot.vercel.app (완료)
- 본 증거 MD: `docs/evidence/audit/20260918_DANJEONG_SELFIE_DEPLOY.md`
- 일지: `개발중/danjeongshot/일지/2026-09-18.md` append (Memento 저장소, danjeongshot 저장소와 별개)
