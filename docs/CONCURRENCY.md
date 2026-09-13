# 동시 다중접속 · 주문 SoT

> 갱신: 2026-09-01 · 프로드 Upstash 확인 후 durable 주문 경로 추가

## 프로드 확인 (verify)

| Env | Production | Preview | 역할 |
|-----|------------|---------|------|
| `UPSTASH_REDIS_REST_URL` | 있음 | 있음 | Redis REST |
| `UPSTASH_REDIS_REST_TOKEN` | 있음 | 있음 | Redis REST |

→ [`durableQuota`](../src/lib/durableQuota.ts) 생성 게이트는 **인스턴스 공유**.  
→ [`orderDurable`](../src/lib/orderDurable.ts) 주문 JSON·paid/redo/asv claim도 동일 Upstash 사용.

## 동작 요약

| 키 | 용도 |
|----|------|
| `djs:ord:{orderId}` | 주문 SoT (7일 TTL) |
| `djs:claim:paid:{id}` | markPaid SETNX |
| `djs:claim:redo:{id}` | redo 1회 원자 claim |
| `djs:claim:asv:{id}` | asv 1회 원자 claim |

클라 `orderTicket`(봉인 토큰)은 **보조**. confirm 시 Redis → ticket unseal 순.

## ticket 유실 (CS)

증상: 결제 완료 후 `/make/payment/success`에서  
`ORDER_TICKET_REQUIRED` / `ORDER_NOT_FOUND` / `MARK_PAID_FAILED`

사용자 화면: 주문번호 + [/legal/refund](https://danjeongshot.vercel.app/legal/refund) 안내.

CS ([CS_CHANNEL.md](CS_CHANNEL.md)):

1. 주문번호(`ord_…`)·결제 시각·테스트/라이브 여부 확인  
2. Toss 대시보드에서 해당 `orderId` 승인 여부 확인  
3. 승인됐는데 제품 미전달 = **시스템 결함** → 환불 또는 수동 resume 검토  
4. triage: `refund_*` / `duplicate_charge` → 텔레그램 와치독

## 한계 (남은 것)

- Upstash 장애 시 claim은 fail-open(메모리만) → 병렬 redo 레이스 재발 가능  
- agentLedger·previewAssets는 여전히 인스턴스 로컬  
- 정본 DB(Postgres 등)는 아직 없음
