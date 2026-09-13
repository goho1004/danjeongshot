# 단정샷 — CS 채널 · 멘트풀 · 와치독

> 갱신: 2026-08-07 · **CS 대응 1단계 잠금** · 멘트풀 선별 · 영정복지 제안 병행

## 한 줄

- **CS 1단계** = 상대 톤 맞춤 1·2차 → 불만 사진 카톡 요청 → 요구 반영 생성 → 카톡 붙여넣기 → 단정·신뢰 마무리  
- **환불** = **시스템 결함에 따른 제품 미전달**만 · 품질은 별도(A/S) · 생성 성공=제공개시 · 상세 `/legal/refund`  
- **와치독** = 텔레그램 단방향 · 환불·urgent만 · Hermes ✗ · 솔라피 ✗

## 잠금 — CS 대응 1단계

```
문의 → triage
  → 상대 톤에 맞는 1차 멘트(풀 선별) 카톡
  → 불만족 사진을 카톡에 올려 달라고 요청
  → 옆창 Gemini: 요구 반영 재생성
  → PNG + 2차 멘트(단정·신뢰 마무리) 카톡 붙여넣기
```

- 자동 카톡 API ✗ · 솔라피 ✗ · 품질건 TG ✗  
- 코드: `CS_STAGE1_LOCKED` · `csMentPool.ts` · `csQualityAs.ts` · 스킬 `danjeongshot-cs-quality-as`

## 멘트풀 (선별)

정본: [`src/lib/csMentPool.ts`](../src/lib/csMentPool.ts) · 연구: [`CS_MENT_RESEARCH.md`](CS_MENT_RESEARCH.md)

| lane | 용도 | 대응 축 |
|------|------|---------|
| `quality_as_1st/2nd` | CS 1단계 | 표준·화남톤·짧게·안닮·분위기 · 캡션·단정마무리·피드백·종결 |
| `refund_deny/maybe` | 환불 | 거절·공감·A/S제안 · 미다운·resume · 중복 |
| `gov_id` 등 | 정책·안내 | 각 이슈 2~3변 |

운영: `/ops/cs` → 분류 → **언제(when)·톤** 보고 라디오 선별 → 카톡.  
새 상황 = 연구 노트에 한 줄 + `CS_MENT_POOL` 추가.

### 카톡 CS

쓰는 카카오톡이면 됩니다. CS 채널 없어도 **나와의 채팅/테스트방**으로 연습 가능.  
정식 채널은 사업자 후.

| 단계 | 하는 일 |
|------|---------|
| **CS 1단계** | 위 잠금 플로우 (톤 맞춤 → 사진 → 생성 → 단정 마무리) |
| 환불·urgent | **텔레그램** 업무 알림 |

## 텔레그램 와치독 (알림만)

env:

```
TELEGRAM_BOT_TOKEN=
TELEGRAM_WATCHDOG_CHAT_ID=
OPS_CS_TOKEN=          # 프로덕션 수동 보고
CS_CONTACT_PHONE=      # CS 표시용(선택)
```

| 도구 | 방향 |
|------|------|
| `npm run watchdog:cday:notify` | → TG |
| `POST /api/cs/triage` (환불·urgent) | → TG |
| `POST /api/cs/notify` | → TG (수동) |
| 스킬 `danjeongshot-watchdog-notify` | → TG |

**양방향(폰→Cursor 지시) = 보류.**  
**헤르메스 텔레그램**은 메멘토/에이전트 통로로 유지 · 단정 와치독 Bot과 섞지 말 것.

### Bot 준비 (사람 1회)

1. Telegram `@BotFather` → `/newbot` → 토큰  
2. 본인(또는 업무 그룹)에 봇 시작 → `chat_id` 확인  
3. `.env.local` / Vercel에 위 env

## 결제 승인 후 세션 유실 (동시접속·cold)

코드: `ORDER_TICKET_REQUIRED` · `ORDER_NOT_FOUND` · `MARK_PAID_FAILED`  
정본: [`CONCURRENCY.md`](CONCURRENCY.md)

1. 사용자 화면 주문번호(`ord_…`) 확보  
2. Toss에서 해당 orderId 승인 여부 확인  
3. 승인 + 제품 미전달 → 시스템 결함 · 환불 또는 수동 복구  
4. triage `refund_*` / `duplicate_charge` → TG

## 보고 조건 (`notifyWatchdog`)

**TG 전송:** `refund_*` · `duplicate_charge` · `abuse_threat` / `escalate_urgent`  
**자동답만:** 그 외 FAQ·품질·키오스크 등

## 2단계 (나중)

- [ ] 카카오 채널·알림톡 — 고객향  
- [ ] TG 양방향 — 필요 시만  
- [ ] Hermes와 단정 Bot **분리** 유지

## 관련 제안 (동시 커밋)

- 영정복지: `docs/PROPOSAL_영정복지_*` · `docs/FLOW_영정복지_*` · `docs/welfare/`
