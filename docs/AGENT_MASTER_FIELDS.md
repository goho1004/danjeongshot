# 대리점코드 마스터 — 정산 필수 항목 (잠금 2026-08-02)

> 한 코드 = 한 대리점 행. **정산에 필요한 칸이 비면 자동정산 불가.**  
> 기계 스키마: [`../../data/agents.example.json`](../../data/agents.example.json) · 타입: `src/lib/agents.ts`

---

## 필수 항목 (코드 발급 시 채움)

| 필드 | 키 | 설명 | 예 |
|------|-----|------|-----|
| 대리점코드 | `code` | URL·QR 키 · 유일 | `DJS-A001` |
| 표시명 | `name` | 장부·정산서 표기 | `○○인력 강남` |
| 타입 | `type` | `corp` 법인 / `indiv` 개인 | `corp` |
| 상태 | `status` | `active` / `paused` / `closed` | `active` |
| 인센율(%) | `ratePct` | 결제액 대비 · 코드별 | `45` |
| 세무 | `taxMode` | `invoice` 세금계산서 / `withhold` 원천 | `invoice` |
| 지급주기 | `payoutCycle` | `monthly` / `weekly` / `daily` | `monthly` |
| 당기유보상한(%) | `holdCapPct` | 기본 **5** · GMV 대비 | `5` |
| 가맹비목표(%) | `holdTargetPct` | 기본 **20** · 기준월GMV 대비 (=분할 가맹비 목표) | `20` |
| 기준GMV방식 | `holdBase` | `last_period` / `avg_n` · 정본 **직전 3개월 평균** | `avg_n` |
| 기준GMV창 | `holdBaseN` | avg_n일 때 N · 월 기준이면 **3** | `3` |
| 환불감주기 | `refundLag` | `same` 당기 / `next` 다음주기 | `next` |
| 가맹비상태 | `franchiseFeeStatus` | `accruing` 충당중 / `converted` 확정 | `accruing` |
| 가맹비목표액(원) | `franchiseFeeTargetKrw` | 런타임 · 기준월GMV×holdTargetPct | |
| 가맹비확정일 | `franchiseFeeConvertedAt` | `converted` 시 ISO | |
| 가맹비확정액(원) | `franchiseFeeRecognizedKrw` | 전환 시 입금 확정액 | |
| 운영환불버퍼(원) | `opsRefundBufferKrw` | 전환 후 별도 · 기본 0 | `0` |
| 충당최장개월 | `franchiseFeeMaxMonths` | 기본 **12** | `12` |
| 연락 | `contact` | 담당·전화·메일 | |
| 정산계좌은행 | `bankName` | 이체용 | |
| 정산계좌번호 | `bankAccount` | 이체용 | |
| 예금주 | `bankHolder` | 이체용 | |

## 법인(`corp`) 추가 필수

| 필드 | 키 | 설명 |
|------|-----|------|
| 사업자등록번호 | `bizNo` | 세금계산서 |
| 상호 | `bizName` | |
| 대표자 | `bizCeo` | |
| 사업장주소 | `bizAddress` | |
| 계산서이메일 | `taxEmail` | |

## 개인(`indiv`) 추가 필수

| 필드 | 키 | 설명 |
|------|-----|------|
| 주민등록번호(또는 식별) | `residentId` | 원천 · **암호화 저장** · 대장 최소 노출 |
| 실명 | `legalName` | 원천·이체 일치 |
| 원천세율메모 | `withholdNote` | 예: 사업소득 3.3% (세무 확정 후) |

## 운영·감사 (권장 · 정산 안정용)

| 필드 | 키 | 설명 |
|------|-----|------|
| 발급일 | `issuedAt` | ISO |
| 계약일 | `contractAt` | |
| 모집채널 | `recruitChannel` | `carrot` / `sns` / `b2b` / `school` / `other` |
| 타깃메모 | `marketNote` | 인력/학원/지역 등 |
| 최소지급액 | `minPayoutKrw` | 미달 이월 · 예 30000 |
| 유보잔고(원) | `holdBalanceKrw` | 런타임 · `accruing` 때 충전 · 정산 엔진이 갱신 |
| 비고 | `notes` | |

### 분할 가맹비 상태머신 (잠금 2026-08-02)

```text
무자본 시작 → franchiseFeeStatus=accruing
당기유보 = min(GMV×holdCapPct, 목표 − holdBalance)   # 환불 상계 우선
잔고 ≥ franchiseFeeTargetKrw (또는 기준월GMV×20%)
  → status=converted · franchiseFeeRecognizedKrw=잔고 · holdBalance→0(또는 버퍼 분리)
  → 반환청구권 소멸 (계약 고지)
이후 opsRefundBufferKrw 만 환불 상계
```

## 주문 스냅샷 (결제 confirm 시 코드에서 복사)

결제 시점 값을 주문에 고정 — 이후 마스터 율 변경이 과거 건에 소급 ✗.

| 주문 필드 | 출처 |
|-----------|------|
| `partnerCode` | `code` |
| `ratePctSnapshot` | `ratePct` |
| `agentTypeSnapshot` | `type` |
| `taxModeSnapshot` | `taxMode` |
| `payoutCycleSnapshot` | `payoutCycle` |

## 정산서 한 줄에 쓰는 식

```text
GMV(코드·기간) × ratePctSnapshot = 인센
if franchiseFeeStatus=accruing:
  당기유보 = min(GMV×holdCapPct, 가맹비목표 − holdBalance)
else:
  당기유보 = 0  # 운영버퍼 상계만
지급액 = 인센 − 당기유보 − 환불상계(+next lag)
세무 = taxMode (invoice | withhold)
이체 = bank*
```

---

*부모: [`MARKETPLACE.md`](MARKETPLACE.md) · [`MARKETING_CHANNEL.md`](MARKETING_CHANNEL.md)*
