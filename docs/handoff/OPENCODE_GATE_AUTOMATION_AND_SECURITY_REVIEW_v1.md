# OpenCode — (A) maint:gate 자동정기점검+텔레그램 알림 (B) 전체 보안 리뷰

> **Cursor Gate** · 선시공 OK · **완성 전 보고 ✗**
> **모델:** `opencode/muse-spark-1.3-contributor-free` (기본) · B에서 로직 버그 깊게 걸리면 Sonnet으로 승격
> **워크스페이스:** `D:\Memento\projects\danjeongshot`
> **Production:** `https://danjeongshot.vercel.app`
> **배경:** 오늘 Upstash(DB) 연결 복구 중 결제 로직 버그 2개(교차검증 없이 통과됐던 것)를 추가로 발견·수정함
> (커밋 `0a76e9e` replication-lag SoT 오신뢰, `36cf7f1` 구토큰 재사용 무제한 재생성).
> 회장님 지시: "코딩 크로스체크 꼭 해야겠네" → (A) 상시 자동감시 + (B) 전체 보안 리뷰 1회.

---

## 한 줄

**(A)** `maint:gate`를 스케줄로 자동 돌리고 실패하면 텔레그램으로 알림.
**(B)** 결제/주문/생성 API 전체를 "오늘 발견한 버그 클래스" 기준으로 교차검증 리뷰 → 발견표 문서화 (즉시 광범위 수정 ✗, 승인 후).

**실결제 ✗** · maint 헤더·mock만. 시크릿·키 값 **보고·커밋 ✗**.

---

## In / Out (공통)

### In
1. (A) 스케줄 자동 점검 + 실패 시 텔레그램 알림 배선
2. (B) 결제·주문·생성·다운로드 API 전수 리뷰 → 발견표 문서
3. (B) 발견 중 **오늘과 같은 클래스**(신뢰 경계 오류·토큰 재사용·레이스) 버그는 최소 diff로 즉시 수정 가능 — 그 외는 표만
4. 끝 보고 = 아래 §D 표 채움

### Out
- narrative_core · Tier0 · wiki 정본
- Gemini/Toss/Upstash/Telegram **값** 출력·커밋·handoff 평문 — 이름·존재 여부만
- 실결제·실키 폭주 generate
- Critical/High 아닌 발견 항목의 즉시 수정 (표에 남기고 승인 대기)
- 대규모 리팩터·UX 변경·모델 교체
- 새 유료 서비스 가입(모니터링 SaaS 등) — GitHub Actions(무료 티어)만 사용

---

## A. maint:gate 자동 정기 점검 + 텔레그램 알림

### 이미 있는 재료 (재사용, 새로 안 만듦)
- `npm run maint:gate -- --base https://danjeongshot.vercel.app` — 이미 존재
- `scripts/lib/telegram-notify.mjs` `notifyWatchdogTelegram(text)` — Bot API 직접, 이미 존재 (와치독이 씀)
- 필요 env(이름만, 값 ✗): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WATCHDOG_CHAT_ID`, `MAINT_SMOKE_SECRET` — 로컬 `.env.local`엔 텔레그램 2개가 **아직 없음** (회장 손으로 나중에 채워도 됨, 없으면 알림 skip만 되고 에러는 안 남)

### 할 일 (최소 diff)
1. `scripts/maint/gate-notify.mjs` 신설 (기존 파일 수정 금지, 새 파일만):
   - `runGate(base)` 실행 → `GREEN:false`면 `notifyWatchdogTelegram()`로 실패 요약(실패 체크 이름만, 값 ✗) 전송
   - `flow-e2e` 단독 실패는 **기존에 스킵 합의된 항목** — 알림 문구에서 "flow-e2e만 FAIL"이면 경고 낮춤(별도 톤) 처리
   - exit code: GREEN이면 0, 아니면 1 (CI 실패로 잡히게)
2. `.github/workflows/maint-gate-cron.yml` 신설:
   - `schedule: cron` 하루 3~4회 (예: `0 */6 * * *`) + `workflow_dispatch`(수동 실행 버튼)
   - `npm ci` → `node scripts/maint/gate-notify.mjs --base https://danjeongshot.vercel.app`
   - GitHub repo Secrets로 `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WATCHDOG_CHAT_ID`, `MAINT_SMOKE_SECRET` 참조 (**Secrets 설정 자체는 회장 손 · GitHub repo Settings → Secrets → Actions** — OpenCode는 워크플로 파일만 만들고 "Secrets 3개 등록 필요"라고 보고)
3. `package.json`에 `"maint:gate:notify": "node scripts/maint/gate-notify.mjs"` 스크립트 한 줄 추가 (로컬 수동 테스트용)

### 검증
```powershell
node scripts/maint/gate-notify.mjs --base https://danjeongshot.vercel.app
# GREEN이면: 콘솔에만 OK, 텔레그램 무전송
# RED로 일부러 테스트하려면 --base에 존재하지 않는 프리뷰 URL 넣어서 1회 확인 (실결제 아님, 그냥 404류)
```
GitHub Actions는 push 후 `workflow_dispatch`로 1회 수동 실행 → Actions 탭에서 성공/실패 로그만 확인 (시크릿 값 노출 안 되는지 로그에서 확인).

---

## B. 결제/생성 API 전체 보안·교차검증 리뷰

### 리뷰 기준 (오늘 발견한 버그 2개를 "이런 걸 찾아라"의 예시로 사용)

1. **신뢰 경계 오류** — 예: "DB(Redis)가 항상 최신"이라고 가정하고 서명된 토큰의 주장을 무시한 곳이 또 있는가
   → 오늘 예: `src/lib/orderDurable.ts` `resolveOrderDurable`
2. **토큰/키 재사용 검증 누락** — 결제 전/구버전 토큰이 결제 후 상태에서도 그대로 통하는 곳이 또 있는가 (redo·asv·download·layout 등 다른 스테이지도 같은 클래스 확인)
   → 오늘 예: `src/lib/orderPaid.ts` `resolvePaidOrder`
3. **레이스/리플레이** — 동시 요청 2개가 같은 orderId·같은 claim 키를 동시에 타면 카운터가 중복 소진되거나 우회되는가 (`markRedoDurable`, `markAsvDurable`, `kvSetNx` claim 로직)
4. **IDOR** — orderId만 알면(추측·유출) 다른 사람 주문 상태를 조회/변경할 수 있는가 (unlockToken 없이 orderId만으로 되는 API가 있는가)
5. **입력 검증** — `imageBase64`, `purposeId`, `amountKrw` 등 클라이언트 값을 서버가 그대로 신뢰하는 지점 (특히 결제 금액 — 클라이언트가 보낸 amount를 서버가 재검증하는지)
6. **비밀 노출** — 에러 응답·로그(`generateCallLog`, `console.*`)에 토큰·키·개인정보 원문이 찍히는 지점
7. **Rate limit / 남용** — `stage=preview` 재호출 외에도 `/api/checkout`(주문 생성) 자체를 무제한 반복 호출해서 리소스 소모시킬 수 있는지
8. **의존성** — `npm audit` 결과 High/Critical 있는지 (버전 업은 제안만, 즉시 업그레이드 ✗ — breaking 가능성)

### 봐야 할 파일 (우선순위)
```
src/lib/orderDurable.ts        src/lib/orderPaid.ts       src/lib/orders.ts
src/lib/upstashKv.ts           src/lib/generateCallLog.ts src/lib/maintSmoke.ts
src/app/api/checkout/route.ts  src/app/api/checkout/complete/route.ts
src/app/api/checkout/confirm/route.ts
src/app/api/generate/route.ts  src/app/api/download/route.ts
src/app/api/ops/generate-log/route.ts
scripts/abuse-sim.mjs (기존 어뷰징 시뮬레이션 참고 — 중복 조사 방지)
docs/CONCURRENCY.md (기존에 문서화된 동시성 가정 — 이것과 실제 코드 어긋난 곳 찾기)
```

### 산출물
`docs/handoff/SECURITY_REVIEW_FINDINGS_v1.md` 1개 파일:

```markdown
## 보안 리뷰 발견표 (OpenCode YYYY-MM-DD)

| # | 파일:라인 | 클래스(위 1~8) | 심각도 | 설명 (1~2줄) | 재현 방법 | 제안 조치 | 상태 |
|---|-----------|----------------|--------|--------------|-----------|-----------|------|
| 1 | | | Critical/High/Med/Low | | | | 수정함/표만 |

## 요약
- Critical: n건 · High: n건 · Med: n건 · Low: n건
- 즉시 수정한 것(최소 diff): 커밋 sha 목록
- 승인 대기(표만 남김): # 번호 목록
- npm audit: High/Critical n건 (버전 제안만, 별도 표)
```

**즉시 수정 허용 범위:** 클래스 1·2(신뢰 경계·토큰 재사용) + 재현 100% 확실 + diff 10줄 이내만.
그 외(레이스 타이밍 의존, IDOR 넓은 리팩터 필요, rate limit 신설)는 **표만 남기고 코드 건드리지 않음** — 회장 승인 후 별도 작업.

### 검증 (수정한 항목만)
```powershell
npm run maint:gate -- --base https://danjeongshot.vercel.app   # GREEN 유지 확인
```

---

## C. 공통 주의

- 시크릿 실값은 어떤 파일·커밋·보고에도 쓰지 않음 (이름·존재 여부만)
- GitHub Actions Secrets 등록은 **회장 손** (repo Settings → Secrets and variables → Actions) — OpenCode는 "필요한 Secret 이름 3개" 표로만 요청
- 막히면 즉시 멈추고 이유 1줄 보고 (계속 시도 ✗)

---

## D. 끝 보고 (반드시 채움)

```markdown
## GATE AUTOMATION + SECURITY REVIEW 결과

### A. 자동 점검
| 항목 | 결과 |
|------|------|
| gate-notify.mjs | 생성됨 / 경로 |
| GH Actions workflow | 생성됨 / 경로 / cron 주기 |
| 로컬 테스트 (GREEN 경로) | PASS/FAIL |
| 필요 Secrets (등록은 회장) | TELEGRAM_BOT_TOKEN, TELEGRAM_WATCHDOG_CHAT_ID, MAINT_SMOKE_SECRET |

### B. 보안 리뷰
| 항목 | 결과 |
|------|------|
| 리뷰 파일 수 | n |
| 발견 건수 (Critical/High/Med/Low) | |
| 즉시 수정 (커밋 sha) | |
| 승인 대기 항목 | # 목록 (SECURITY_REVIEW_FINDINGS_v1.md 참조) |
| npm audit | High/Critical n건 |
| maint:gate (수정 후) | GREEN 유지 여부 |

### BLOCKER (있으면)
- …
```

---

## OpenCode 실행

```powershell
opencode run --dir D:\Memento\projects\danjeongshot --auto `
  -m "opencode/muse-spark-1.3-contributor-free" `
  "docs/handoff/OPENCODE_GATE_AUTOMATION_AND_SECURITY_REVIEW_v1.md 전문 읽고 A→B 순서로 실행. A: gate-notify.mjs + GH Actions 워크플로 신설(시크릿 값 ✗, 이름만 요청). B: 결제/생성 API 전체를 §B 기준으로 리뷰 → SECURITY_REVIEW_FINDINGS_v1.md 작성. 클래스1·2 + 재현확실 + diff10줄 이내만 즉시수정, 나머지는 표만. 수정 후 maint:gate GREEN 유지 확인. 끝 보고는 §D 표만."
```

Desktop: 이 파일만 열고 Muse 1.3. 로직 버그가 깊거나 막히면 Sonnet으로 승격 요청.

---

## 참고
- 일상 게이트: `docs/MAINTENANCE.md` §2
- 오늘 버그 상세: `docs/handoff/OPENCODE_FULL_SMOKE_ERROR_SIM_v1.md` (하단 "결과 (Cursor 2026-09-13 21:00 KST)")
- 동시성/Upstash 가정: `docs/CONCURRENCY.md`
- 기존 어뷰징 시뮬: `scripts/abuse-sim.mjs`
