# OpenCode — 추가컷/레이아웃 "결제" 문구 vs 실제 미과금 정합 (보안리뷰 #1)

> **Cursor Gate** · 선시공 OK · **완성 전 보고 ✗**
> **모델:** `opencode/muse-spark-1.3-contributor-free` (기본) · 결제코드라 로직 판단 애매하면 Sonnet 승격
> **워크스페이스:** `D:\Memento\projects\danjeongshot`
> **근거:** `docs/handoff/SECURITY_REVIEW_FINDINGS_v1.md` #1 (High)
> **판단:** 진짜 결제(토스 위젯 2차 결제) 통합은 "간단"이 아님 → 지금은 Option B만 실행, Option A는 표만 남기고 대기.

---

## 현재 상황 (코드 확인됨)

- `src/app/api/checkout/extra/route.ts`, `src/app/api/checkout/layout/route.ts`: 주석에 이미 `"샌드박스 결제"`라고 명시 — **실제 토스 paymentKey·confirm 호출이 전혀 없음**. 클릭 즉시 `mark...Paid` 처리.
- 그런데 프런트(`PaidDonePanel.tsx`)는 버튼에 `₩2,000 · 결제·저장`, `₩5,000 · 미리보기·결제` 라고 **실제 결제인 것처럼 표시**.
- 실제로는 아무도 이 추가컷/레이아웃으로 돈을 낸 적 없음(1원도 안 걷힘) — 매출 유출이라기보다 "문구가 거짓"인 상태.

## 옵션 (양자택일, 지금 결정 안 함)

| | 내용 | 난이도 | 지금 실행 여부 |
|---|---|---|---|
| **A. 진짜 결제** | 추가컷/레이아웃도 토스 위젯을 한 번 더 띄워서 실결제 → confirm → mark. 프런트에 새 결제 위젯 흐름 추가 필요(현재는 fetch 1번으로 끝나는 구조). | 중~대 (신규 결제경로, 별도 QA 필요) | **✗ 지금 안 함** — 아래 "B-완료 후 표만 추가"로 대기 |
| **B. 문구 정직화** | 실제로 안 걷는 돈이면 "결제" 단어를 빼고 정직하게 무료/보너스로 표시. 백엔드 로직(무료로 준다는 사실) 자체는 안 바꿈 — 문구·라벨만 현실과 맞춤. | 소 (문구·라벨 수정, 10줄 내외) | **✅ 지금 실행** |

---

## 할 일 (B만, 최소 diff)

1. `src/components/make/steps/PaidDonePanel.tsx`
   - `₩{PRICE.extraShotKrw...} · 결제·저장` / `· 미리보기·결제` 류 라벨에서 **"결제" 단어 제거**, 실제 동작(무료 제공)에 맞게 `무료 보너스 · 저장` 또는 `추가로 받기` 등 정직한 라벨로 교체.
   - `extraLayoutKrw`/`extraShotKrw` 가격 표기 자체를 지울지, 아니면 "(정식 결제는 준비 중)" 같은 안내를 붙일지는 카피 톤 유지 선에서 재량 — 단, **결제가 일어난다는 인상은 절대 남기지 않을 것**.
2. `src/app/api/checkout/extra/route.ts`, `src/app/api/checkout/layout/route.ts`
   - 응답 `notice` 문자열의 `"(샌드박스 결제 완료)"` 류 표현도 동일하게 정직화(예: `"추가 컷 무료 제공 · 다운로드 준비됨"`).
   - **로직(승인/카운터/캐시 처리)은 절대 안 건드림** — 문자열만.
3. `docs/handoff/SECURITY_REVIEW_FINDINGS_v1.md` #1 행의 "상태" 컬럼을 `표만` → `문구 정직화 완료 (실결제 연동은 Option A로 별도 대기)`로 갱신.

## 하지 말 것 (Out)
- 토스 위젯/2차 결제 흐름 신규 구축(Option A) — 이건 별도 작업으로 회장 승인 후.
- `markExtraShotPaid`/`canDownloadExtraShot` 등 로직 변경.
- 가격 정책 자체 변경(₩2,000/₩5,000 유지, 표기만 정직화).

## 검증
```powershell
npm run maint:gate -- --base https://danjeongshot.vercel.app   # GREEN(flow-e2e 제외) 유지 확인
```
그리고 로컬/프리뷰에서 `/make` 결제 후 화면 캡처 1장 — "결제" 단어가 남아있지 않은지 육안 확인.

## 끝 보고 (짧게)
- 변경 파일 목록 + 커밋 sha
- `maint:gate` 결과 (RED면 즉시 원복하고 이유 1줄)
- Option A(진짜 결제 통합)는 여전히 승인 대기 상태임을 1줄로 재확인

---

## OpenCode 실행

```powershell
opencode run --dir D:\Memento --auto `
  -m "opencode/muse-spark-1.3-contributor-free" `
  -f "D:\Memento\projects\danjeongshot\docs\handoff\OPENCODE_EXTRA_LAYOUT_PRICING_HONESTY_v1.md" `
  "위 파일대로 Option B만 실행(문구 정직화). Option A(진짜 결제)는 코드 손대지 말고 표에만 대기 상태 유지. 끝나면 maint:gate 결과 + 변경 파일 목록만 보고."
```
