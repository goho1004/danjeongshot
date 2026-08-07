# 단정샷 — C-Day 런칭 데이 플레이북

> **원본 스킬:** [Gingiris `startup-launch`](https://github.com/Gingiris-1031/gingiris-skills/tree/main/skills/startup-launch) (MIT · @WeiYipei)  
> **이식:** 2026-08-07 · 단정샷 C-Day **2026-09-01 (월) KST**  
> **일정·체크리스트 정본:** [`LAUNCH_DDAY.md`](LAUNCH_DDAY.md)  
> **오프라인:** [`WATCHDOG_OFFLINE_RUNBOOK.md`](WATCHDOG_OFFLINE_RUNBOOK.md)  
> **에이전트 스킬:** `danjeongshot-launch`  
> **사이트:** https://danjeongshot.vercel.app

단정의 런칭은 Product Hunt 이벤트가 아닙니다. **실PG·사업자 푸터·실결제 1건**이 C 완료입니다. 채널은 국내 2C(당근·카톡·소수 초대) 우선입니다.

---

## 0. 매일 (C-Day 전)

```powershell
cd D:\Memento\projects\danjeongshot
npm run watchdog:cday
# 아침 게이트(권장)
npm run watchdog:cday:gate
```

| 출력 | 의미 |
| --- | --- |
| D-n | 9/1까지 남은 날 |
| Wn | 주간 테마·필수 |
| gate | GREEN이어야 스위치 |

Gmail 자동 발송은 **아직 없음**. 장애·게이트·환불·urgent는 **텔레그램 알림** (`docs/CS_CHANNEL.md` · `npm run watchdog:cday:notify` · 스킬 `danjeongshot-watchdog-notify`). CS 일반은 **카톡 자동답** (`/ops/cs`). Hermes TG와 분리.


---

## 1. T-12h (8/31 저녁 ~ 9/1 새벽) — 최종 점검

Gingiris T-12h를 단정 항목에 맞춘 것입니다.

| ☐ | 점검 | 명령·위치 |
| --- | --- | --- |
| ☐ | 프로덕션 응답 | `npm run maint:health` 또는 브라우저 |
| ☐ | `maint:gate` GREEN | `npm run watchdog:cday:gate` |
| ☐ | 결제 **리허설** (아직 sandbox여도 경로 확인) | `/make` → 결제 UI |
| ☐ | 랜딩·legal·갤러리 링크 | 사이트 클릭 |
| ☐ | 카피 2인(또는 본인+에이전트) 검수 | 여권·공인 문구 ✗ |
| ☐ | CS 메일/전화 수신 | C4 |
| ☐ | 역할: 누가 env 스위치 / 누가 실카드 / 누가 스크린샷 | 사람 |
| ☐ | 롤백 한 줄 숙지 | `PAYMENT_MODE=sandbox` |
| ☐ | C1–C19 중 미완료 **블로커만** 표시 | `LAUNCH_DDAY.md` |

**Readiness (Gingiris 변형):** 외부 사용자 10명이 “만족하며 계속 쓰는” 상태는 B에서 이상적입니다. 미달이어도 **서류·PG가 준비되면 C-Day는 밀지 않습니다** (정본 잠금).

---

## 2. Hour 0 (9/1 오전) — 스위치

권장 시각: **09:00–11:00 KST** (와치독·사람 모두 깨어 있는 창).

| 순서 | 행동 | 담당 |
| --- | --- | --- |
| 0 | `watchdog:cday:gate` → GREEN 확인 | 에이전트/본인 |
| 1 | Vercel Production: 라이브 키 + `PAYMENT_MODE=toss` + `NEXT_PUBLIC_BIZ_*` | **사람만** (키 채팅 ✗) |
| 2 | Redeploy / `npx vercel --prod` | 사람 |
| 3 | 실카드 **소액 1건** → PNG 저장 | 사람 |
| 4 | 푸터 사업자·통판 스크린샷 | 사람 |
| 5 | 증거 폴더 | `docs/evidence/c-day/` |

Hour 0에서 **하지 않는 것:** 대량 광고, QR 살포, PH/HN 강제, 대리 실정산 확대.

### 채널 순서 (단정 · Hour 0~1)

| 순서 | 채널 | 액션 |
| --- | --- | --- |
| 1 | 사이트 | 라이브 확인 · 베타 고지 정리 여부 |
| 2 | CS | 메일/전화 수신 테스트 1회 |
| 3 | 카톡/지인 | 소수 초대 링크 (C23: 실PG 후 규모) |
| 4 | 당근비즈 | 프로필 URL만 · 대량광고 ✗ |
| — | PH / HN | **주채널 아님** (선택·후순위) |

---

## 3. Hours 1–6 — 실시간

| ☐ | 할 일 |
| --- | --- |
| ☐ | 30분마다: 사이트 200 · 결제 에러 로그 |
| ☐ | CS 문의 15분 내 응답(가능 범위) |
| ☐ | 첫 실결제 증거 파일명·시각 기록 |
| ☐ | 이상 시 → §5 위기표 |

---

## 4. Hours 6–24 — 2차 파도 (작게)

| ☐ | 할 일 |
| --- | --- |
| ☐ | 초대 받은 사람 피드백 3줄 백로그 |
| ☐ | 당근·오픈채팅은 **안내만** 확대 |
| ☐ | KOL·유료는 C 안정 후 (비범위 유지 가능) |

---

## 5. T+72h — 모멘텀 · 정리

| Day | 할 일 |
| --- | --- |
| D+1 | 사용자 후기·장애 유무 · 환불 1경로 재확인 |
| D+2 | “정식 전환 메모” 1장 (무엇 바뀌었는지) |
| D+3 | B 개선 중 C에 안 넣은 것 백로그로 이관 |
| — | 증거: `docs/evidence/c-day/` 보관 |

---

## 6. 위기 대응 (Gingiris crisis → 단정)

| 시나리오 | 대응 | 시한 |
| --- | --- | --- |
| 사이트 다운 | Vercel 롤백 · 상태 공지(카톡) | 5분 |
| 결제 장애 | `PAYMENT_MODE=sandbox` · 베타 고지 복구 | 즉시 |
| gate FAIL | **스위치 금지** · maint 로그 | — |
| 부정/과한 클레임 | 카피 수정 · ship-gate | 15분 |
| 악성 리뷰 | 사실만 1회 답 · 감정적 논쟁 ✗ | 필요 시 |

---

## 7. 트래픽 산수 (Gingiris 교훈 · 단정 축소판)

런칭을 기분으로 잡지 않습니다.

1. **당일 목표 방문/결제**를 숫자로 적습니다 (예: 실결제 1건 + 방문 N).  
2. 채널별 몫을 나눕니다 (카톡 / 당근 / 기타).  
3. **하루 하나의 목표** — 결제 스위치 날에는 “바이럴”과 목표를 섞지 않습니다.  
4. 전환이 병목입니다. 트래픽만 키우지 않습니다 (정본: 실PG 전 대량 유입 ✗).

---

## 8. 스킬·명령 맵

| 상황 | 스킬·명령 |
| --- | --- |
| 당일 순서 | 이 문서 · `danjeongshot-launch` |
| 카운트다운 | `npm run watchdog:cday` |
| 사이트 건강 | `danjeongshot-maint` · `watchdog:cday:gate` |
| 출고 금지어 | `danjeongshot-ship-gate` |
| 주간·서류 | `LAUNCH_DDAY.md` · `WATCHDOG_OFFLINE_RUNBOOK.md` |

---

## 9. Attribution

Hour-by-hour structure, crisis table pattern, sequencing / readiness ideas adapted from  
**Gingiris Skills — `startup-launch`**  
https://github.com/Gingiris-1031/gingiris-skills/tree/main/skills/startup-launch  

Danjeongshot locks: C-Day 2026-09-01, Toss live PG, `maint:gate`, KR 2C channels, no passport claims.
