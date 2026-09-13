## 보안 리뷰 발견표 (OpenCode 2026-09-13)

> 범위: 결제/주문/생성/다운로드 API + lib. 기준 §B 1~8. 실결제 ✗·값 ✗.
> 리뷰 파일 20개: `orderDurable.ts` `orderPaid.ts` `orders.ts` `upstashKv.ts` `generateCallLog.ts`
> `maintSmoke.ts` `checkout/route.ts` `checkout/complete/route.ts` `checkout/confirm/route.ts`
> `checkout/extra/route.ts` `checkout/layout/route.ts` `generate/route.ts` `download/route.ts`
> `deliver/email/route.ts` `refund/route.ts` `generateGate.ts` `purposes.ts`(parse부)
> `refundRequests.ts` `download/fetchClean.ts` `abuse-sim.mjs`(스킴) `CONCURRENCY.md`.

| # | 파일:라인 | 클래스 | 심각도 | 설명 (1~2줄) | 재현 방법 | 제안 조치 | 상태 |
|---|-----------|--------|--------|--------------|-----------|-----------|------|
| 1 | `checkout/extra/route.ts:42-49`, `checkout/layout/route.ts:64-77,122-125` | 5·비즈니스 | High | 추가컷·레이아웃 "결제"가 샌드박스 표시뿐. paymentKey·Toss 승인 호출 전무 — toss 실결제 모드에서도 실제 과금 없이 entitlement 부여. UI는 ₩2,000/₩5,000 결제 흐름 표시. | paid 주문 토큰으로 POST `/api/checkout/extra` → `ok:true`, 토스 대시보드 무청구 대조 | Toss Billing 결제→confirm 검증 후 mark, 또는 유료화 전까지 UI 과금 문구 제거 | 문구 정직화 완료 (실결제 연동은 Option A로 별도 대기) |
| 2 | `checkout/confirm/route.ts:77-90` | 2 | Med | `alreadyPaid` 분기가 paymentKey Toss 재검증 없이 fresh unlockToken 발급. orderId+공개금액만 알면 paid 주문 토큰 채굴 → redo/asv 소진·download 잠금 등 griefing. orderId 64bit 난수라 단독 악용도는 Low. | paid orderId+amount로 paymentKey 가짜 confirm → `alreadyPaid`+`unlockToken` 반환 | alreadyPaid여도 confirm 통과분만 토큰 발급, 또는 토큰 미반환 | 표만 |
| 3 | `orders.ts:489-524`, `download/route.ts:101`, `deliver/email/route.ts:74` | 2 | Med | `36cf7f1`이 preview만 차단. redo/asv/download/extra/layout/email은 `resolveOrder`(메모리+토큰)라 동일 인스턴스에서는 pre-pay 토큰으로 paid 권한 통과. 카운터 한도 내(redo·asv 각 1회)라 무제한 과금 구멍은 아님. | 결제 전 토큰 보관→결제→같은 인스턴스로 redo/download (affinity 필요, 100% 아님) | `canRunRedo/Asv`·`verifyUnlock`에 post-pay 토큰검사(36cf7f1 패턴 헬퍼화) | 표만 |
| 4 | `orderDurable.ts:150-178` | 3 | Med | Upstash 장애 시 claim=`null` fail-open → 인스턴스별 메모리 mark로 redo/asv 1회 한도 우회. ENOTFOUND 장애 실전 경험 있음. `CONCURRENCY.md` §한계에 기재된 기지(known). | Upstash 차단 상태에서 병렬 redo | 장애 시 생성 503 fail-closed(가용성 절충) 또는 공유 에러카운터 | 표만 |
| 5 | `checkout/route.ts` 전체 | 7 | Med | 주문 생성 무제한 — generate와 달리 IP/기기 게이트 없음. 대량 POST 시 Upstash SET 적재(7일 TTL) + complete 스팸 토대. | `/api/checkout` 반복 POST → 200 남발 | checkout에 `durableIncr` 게이트 신설 | 표만 |
| 6 | `refund/route.ts:110-123`, `orders.ts:454,535` | 4 | Low | 주문 상태 조회가 orderId만으로 무인증 — paid/downloadedAt/redo·asv 카운터 노출. ID 64bit 난수 + 이미지·개인정보 없음. | GET `/api/refund?orderId=…` | 토큰 요구 또는 공개안내 유지(제품 결정) | 표만 |
| 7 | `download/route.ts:166`, `extra/route.ts:98`, `email/route.ts:152` | 비즈니스 | Low | `easterStrip`(클린 반환)이 클라이언트 플래그 하나로 통과 — "향후 업셀"인데 결제 게이트 없음. 이스터=보너스·제출 비권장이라 실해 낮음. | easter vault+`easterStrip:true` → 클린 PNG | 유료화 시 entitlement 검사, 당장은 유지/플래그 제거 결정 | 표만 |
| 8 | `orders.ts:64-70` | 1·6 | Low | 봉인키 `PREVIEW_QUOTA_SECRET`→`GEMINI_API_KEY` 폴백, 둘 다 없으면 공개 기본값 → 전원 부재 시 paid 토큰 위조 가능. 현재 Prod는 키 설정이라 미발현. | 양쪽 env 제거한 환경에서 토큰 위조 (운영 재현 안 함) | Prod 폴백 금지(fail-closed) + 봉인 전용키 분리 | 표만 |
| 9 | `orderDurable.ts:154,171` | 위생 | Low | `markRedo/AsvDurable`이 `resolveOrderDurable` 반환 버림. 현재 뒤단 `markRedo`가 재검증이라 안전하나, 클레임 선점 후 실패 시 클레임만 소진(정당 사용자 잠김 가능, 레이스 한정). | 동시 다운로드+redo 경합 (좁음) | resolve null이면 클레임 전 return (2줄) | 표만 |

## 검증済 양호 (문제없음 확인)

- `confirm/route.ts:64-75,92-104`: 금액 서버대조 + Toss 승인(신규결제 경로).
- `checkout/route.ts`: 금액 서버계산, 클라이언트 amount 무시 (E10 실측).
- `purposes.ts:36-44,191-210`: look/season 화이트리스트, extra sanitize.
- `orderPaid.ts` + preview 게이트: pre-pay 토큰 무제한 생성 차단 (36cf7f1).
- Upstash 정상 시 claim 원자성 (`kvSetNx`), Redis 카운터 SoT.
- 로그·응답에 토큰·키·개인정보 원문 없음 (`console.*` 전수 점검).
- generate 다층 rate limit (IP분·IP시·기기·글로벌) — maint 스모크 우회 포함.

## 요약

- Critical: 0건 · High: 1건(#1) · Med: 4건(#2–#5) · Low: 4건(#6–#9)
- 즉시 수정한 것(최소 diff): 없음 — #3은 클래스2이나 재현 100% 아님(affinity 의존), #9는 영향 레이스 한정. 기준(클래스1·2+재현확실+10줄) 충족 항목 없음.
- 승인 대기(표만 남김): #1–#9 전부 (`#1` 우선 — 실과금 없이 entitlement, 수익 직결)
- npm audit: High 3건 + Critical 1건 (별도 표 아래, 버전 제안만)
- `maint:gate` (B 수정 없음 → A4 실측 유지): RED·`failures=["flow-e2e"]`·onlyE2e

### npm audit (2026-09-13, `--omit=dev`)

| 패키지 | 설치 | 심각도 | 내용 | 제안 (적용 ✗) |
|--------|------|--------|------|---------------|
| next | 14.2.35 | Critical(rollup) | audit DB 범위신고 묶음. 14.2.35는 14.x 최신 패치이나 플래그 잔류 | 14.x 유지, 15 승격은 breaking 검토 후 별도 |
| sharp | 0.35.3 | High | `<0.35.4` | `0.35.4` 패치 (breaking 낮음) |
| postcss | 8.5.22 | High | `<=8.5.22` | `8.5.23+` 패치 |
| nanoid | 3.3.16 (전이) | High | `<3.3.18`, size-zero 루프 | 상위 패키지 경유 `3.3.18` |
