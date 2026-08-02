# 대리점·어필리에이트 — 가져다 쓸 것 조사 (2026-08-02)

> 목적: 단정 **대리점코드 정산**에 재사용 가능한 GitHub/서비스 후보.  
> 결론 한 줄: **추적·커미션 엔진은 OSS 참고 · 한국 세무(계산서/원천)·토스 결제는 직접 붙임.**

---

## 1. 단정에 필요한 것 vs OSS가 주는 것

| 단정 필요 | OSS 보통 | 갭 |
|-----------|----------|-----|
| `?partner=` 귀속 | ○ ref/code | 작음 |
| 코드별 인센율 | ○ | 작음 |
| 유보 램프 5%→20% | △ 홀드 일수 정도 | **커스텀** |
| 법인 세금계산서 / 개인 원천 | ✗~△ (미·EU 위주) | **직접** |
| 토스페이먼츠 결제 연동 | ✗ (Stripe/Paddle 위주) | **직접** |
| 당근·학원 B2B 마스터 칸 | ✗ | **우리 스키마** |

→ **통째 교체보다**: 스키마·정산 루프·어드민 UX만 베끼고, 결제는 지금 토스 유지.

---

## 2. GitHub / OSS 후보 (우선순)

### A. 가장 쓸 만함 (참고·부분 이식)

| 프로젝트 | 라이선스 | 스택 | 쓸 점 | 비고 |
|----------|----------|------|-------|------|
| **[OpenPartner](https://github.com/getcoherence/openpartner)** | MIT | Docker · Postgres · Stripe Connect | 클릭→이벤트→커미션→지급 **원장**, holdback days(환불 창), CSV보내기 | Stripe 전제 · 한국 세무 ✗ |
| **[Refferq](https://github.com/Refferq/Refferq)** | (사이트: OSS) | **Next.js 15** · Prisma · PG | 파트너별 커스텀 율 · 지급 스케줄 · 어드민/포털 · `?ref=` | 스택이 단정과 가까움 |
| **[RefearnApp](https://github.com/ZAK123DSFDF/refearnapp)** | AGPL-3.0 | Next · Drizzle · **Upstash Redis** · CF Edge | SaaS 어필리에이트 · CSV/PayPal 지급 | AGPL이면 **파생 공개 의무** 주의 |
| **[RefRef](https://github.com/amicalhq/refref)** | AGPL-3.0 | Next · Drizzle | 추천·어필리에이트 포털 · 수동/자동 승인 | AGPL |
| **[numok](https://github.com/dfg-ar/numok)** | MIT | PHP · MySQL · Stripe | Rewardful 대체 단순본 | PHP · 단정 Next와 이질 |

### B. 상용 (호스티드 · 빠른 파일럿)

| 서비스 | 쓸 점 | 단정 적합성 |
|--------|-------|-------------|
| **Rewardful / FirstPromoter / Tolt** | Stripe 구독 어필리에이트 | 토스·한국 세무 ✗ |
| **Affonso** | 다 PSP · 세금 양식(W-8/W-9) · 다국어 포털 | EU/글로벌 SaaS용 · 토스·원천 ✗ |
| **링크프라이스 등 KR CPA 네트워크** | 국내 퍼블리셔 | B2B 대리점·우리 마스터와 결이 다름 |

---

## 3. 추천 가져가기 전략

```text
1) 지금: 우리 agents 마스터 + 주문 스냅샷 + 정산 수학(유보 램프) 직접
2) 참고: OpenPartner 데이터 모델(Click/Event/Commission/Payout) · Refferq Next 어드민 UX
3) 붙이지 말 것: Stripe Connect 전제 통째 이식 · AGPL을 프로덕트에 섞기(법무 전)
4) P1: 정산서 CSV/엑셀 내보내기 (Refearn 패턴) → 이체는 수기/뱅킹
5) P2: 토스 지급대행 등 KR 페이아웃 조사 후 연동
```

**OpenPartner가 특히 맞는 아이디어**  
- 환불 창에 맞춘 **holdback days** (우리 유보 램프와 개념 근접)  
- 커미션 **수정=새 row** (감사 원장)  
- 전부 export 가능  

**Refferq가 맞는 점**  
- Next.js · 파트너별 rate · payout schedule UI  

---

## 4. 단정 결정 (초안)

| 결정 | 내용 |
|------|------|
| OSS 통째 셀프호스트 | **보류** — 토스·세무·유보램프 커스텀이 본체 |
| 가져올 것 | 원장 패턴 · 어드민 화면 구조 · CSV 정산서 |
| 우리 정본 | [`AGENT_MASTER_FIELDS.md`](AGENT_MASTER_FIELDS.md) · [`MARKETPLACE.md`](MARKETPLACE.md) |

---

## 5. 링크

- OpenPartner: https://github.com/getcoherence/openpartner  
- Refferq: https://github.com/Refferq/Refferq · https://refferq.com/  
- RefearnApp: https://github.com/ZAK123DSFDF/refearnapp  
- RefRef: https://github.com/amicalhq/refref  
- numok: https://github.com/dfg-ar/numok  

---

## 6. 한국 세무·대리점 정산 (2026-08-02 追記)

> 기존 §2는 Stripe/글로벌 OSS. 여기만 **국내 세무·지급** 후보. OSS와 중복 ✗.

### 후보 맵

| 후보 | 유형 | 단정에 맞는 점 | 갭 |
|------|------|----------------|-----|
| **포트원 파트너정산** | 정산 SaaS | 수수료 정책·원천 3.3%·세금계산서(역/정)·지급·내역서 | 플랫폼/중개 전제 · 요금·연동비용 · 유보램프(GMV%)는 커스텀 검증 필요 |
| **팝빌 / 바로빌** | 세금계산서·홈택스 API | 법인 계산서 발행·국세청 전송만 외주 | 커미션·유보·원천 신고 본체 ✗ |
| **솜운(Somoon)** | 추천·제휴 SaaS | 링크·전환·보상·원천·현금지급 | 단정 agents/토스 스키마와 별 레인 · B2B 마스터 칸 ✗ |
| **링크디(카페24)** | 자사몰 어필리 | 파트너별 율·정산목록 | 카페24 전제 · 단정 Next 자사몰 ✗ |
| **더존·세무사랑** | 세무/회계 SW | 신고·기장(세무사 측) | **대리점 수수료 엔진 ✗** · 정산 CSV 넘기면 충분 |
| **태그바이 등** | 인플루언서 정산 | 원천·대량이체 패턴 참고 | 체험단/원고료 결 · 대리코드 GMV와 결 다름 |

### “상품 2개면 쉽다” — 조건부 동의

| 쉬운 쪽 (SKU) | 어려운 쪽 (본체) |
|---------------|------------------|
| 기본 ₩9,900 · 플러스 ₩14,900 가격표 | 코드별 인센율(15~25% / B2B 40~50%) |
| 주문→커미션 산식 단순 | 법인=세금계산서 / 개인=원천 분기 |
| | 유보 당기≤GMV5% → 장기20% 램프 |
| | 정산주기·환불 회수·토스 결제 스냅샷 |

→ **SKU 수는 난이도 결정자가 아님.** 세무 분기·유보·코드 정책이 본체.

### 단정 현실 권고 (3줄)

1. **직접 최소 구축** (권고): agents 마스터 + 주문 귀속 + 정산원장 + CSV → 이체 수기. OSS는 원장 패턴만.  
2. **세금계산서 API만 외주**: 파트너·월정산 건수가 늘면 팝빌/바로빌. 원천은 당분간 세무사+엑셀/홈택스.  
3. **통째 대리점ERP / 포트원**: 초기·파일럿 **보류**. 파트너 수십+·지급 자동화·전자금융 이슈가 커질 때 재평가.  

