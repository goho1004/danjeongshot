# 단정샷 유지보수 · 모듈분리 · 디버그 정리

human_title: 단정샷 유지보수·모듈분리 (2026-07-24)

> 사이트: https://danjeongshot.vercel.app  
> 코드: `D:\Memento\projects\danjeongshot`  
> 정본 문서: `docs/MAINTENANCE.md`  
> 상태: **BETA OPEN** (사업자 전) · 결제=sandbox · 실생성 `MOCK_GENERATE=0` · **maint:gate GREEN** (2026-08-04)

**BETA Done:** 베타 뱃지·푸터 고지·체크아웃 시뮬레이션 · pay-first 실생성·PNG 다운로드 · 링크 공유 가능.  
**초대 문장:** `docs/BETA_INVITE.md`  
**다음(베타 후):** 사업자·통신판매 기재 · 토스 라이브 · 커스텀 도메인.  
**동결:** `docs/BETA_FREEZE.md` (라대리·전자책·하네스 확장 ✗)

---

## 0. 한 줄로

셀카 → 결제 → 첫 컷 → **받기 한 패널**(`PaidDonePanel`: 사진에 저장 → 플러스면 인화용).
고칠 때 어디 파일을 열면 되는지, 아래 §3 표만 보면 됩니다.

---

## 1. 이번에 고친 디버깅 (뭐가 문제였나)

| 증상 | 원인 | 조치 | 지금 |
| --- | --- | --- | --- |
| 크롬 다운로드 안 됨 | 저장 타이밍·제스처 | 받기=파일 준비, 저장=별도 클릭 | 동작 확인됨 |
| Safari 「다운로드 잠금」 | iOS JSON POST 한도 | iOS는 항상 multipart vault | API 검증 GREEN |
| 레이아웃 오류 | 비동기 후 자동 저장 | 준비 → 「레이아웃 저장」2단계 | E2E GREEN |
| 흐름이 헷갈림 | 1800줄 한 파일에 단계 혼재 | 단계별 UI + 상태기계 | 받기→저장→레이아웃 |
| 워터마크 안 보임 | opacity 0.11 | 머리/목 0.20, 코너 0.24 + CSS 패턴 | watermark GREEN |
| 디버그 잡음 | djsDebug·debug-log | 전부 제거 | check-debug 0건 |

결제 후 화면에 워터마크가 없는 건 **정상**입니다. 워터마크는 미리보기(결제 전)만입니다.

---

## 2. 모듈 분리 (어디에 뭐가 있나)

예전에는 `MakeStudio.tsx` 한 파일이 약 1800줄이었습니다.
지금은 오케스트레이터가 약 250줄이고, 나머지는 역할별로 나뉘어 있습니다.

### 화면 흐름

1. 용도·업로드 (`PurposeUploadStep`)
2. 미리보기 + 워터마크 (`PreviewStep`)
3. 결제 (`CheckoutStep`)
4. 받기 한 패널 (`PaidDonePanel`) — 사진에 저장 → (플러스) 인화용 사진에 저장
5. 「다른 방법」접기: 이메일·다시만들기·규격·추가컷


### 폴더 지도

| 폴더 | 하는 일 |
| --- | --- |
| `src/components/make/` | 화면 조립·단계 UI |
| `src/hooks/make/` | 상태·생성·결제·받기·레이아웃 로직 |
| `src/lib/download/` | 클린 PNG 받기·파일 저장 |
| `src/lib/flow/` | 지금 몇 단계인지 판정 |
| `src/lib/make/types.ts` | Shot·세션 키 타입 |
| `scripts/maint/` | 점검 게이트 CLI |

### 훅 5개

| 훅 | 역할 |
| --- | --- |
| `useMakeStudioState` | shots, paid, order, layout 플래그 |
| `useGenerate` | 미리보기 / 다시만들기 / A/S |
| `useCheckout` | sandbox·토스·세션 저장 |
| `useDownload` | 받기·파일로 저장·savedOnce |
| `useLayoutDownload` | 레이아웃 준비·저장 |

---

## 3. 버그 나면 이 파일 (모듈 맵)

| 증상 | 열 파일 |
| --- | --- |
| Safari 잠금·받기 실패 | `src/lib/download/fetchClean.ts` · `src/app/api/download/route.ts` |
| 파일로 저장이 안 됨 | `src/lib/download/savePng.ts` |
| 단계가 꼬임 | `src/lib/flow/makeFlow.ts` · `src/components/make/steps/*` |
| 받기/저장 버튼 | `useDownload.ts` · `PaidDonePanel` |
| 레이아웃 오류 | `useLayoutDownload.ts` · `PaidDonePanel` · `photoSheet.ts` |
| 워터마크 | `src/lib/watermark.ts` · `WatermarkFrame.tsx` |
| 결제 | `useCheckout.ts` · `src/app/api/checkout*` |
| 미리보기 생성 | `useGenerate.ts` · `src/app/api/generate` |
| 결제 후 복원 | `useSessionRestore.ts` · `sessionHeavy.ts` |

---

## 4. 일상 유지보수 (5분)

프로젝트 폴더에서:

```bash
cd D:\Memento\projects\danjeongshot
npm run maint:gate -- --base https://danjeongshot.vercel.app
```

기대 결과: `"GREEN": true`, `failures: []`.

| 명령 | 무엇을 봄 |
| --- | --- |
| `maint:gate` | 전체 (권장) |
| `maint:health` | 페이지 200, 미인증 다운로드 거부 |
| `maint:download-loop` | 결제→클린 PNG API |
| `maint:watermark` | 미리보기에 워터마크 흔적 |
| `maint:safari-multipart` | iOS UA multipart 200 |
| `maint:flow-e2e` | 받기→저장→레이아웃 UI |
| `maint:check-debug` | 디버그 잔여 0건 |
| `maint:loop` | gate 실패 시 exit 1 |
| `watchdog:cday` | C-Day 카운트다운·주간 필수 |
| `watchdog:cday:gate` | 카운트다운 + maint:gate |

배포 후:

```bash
npm run build
npx vercel --prod --yes
npm run maint:gate -- --base https://danjeongshot.vercel.app
```

> 게이트가 generate를 여러 번 치면 IP 한도에 걸립니다.  
> Vercel·로컬에 `MAINT_SMOKE_SECRET`이 있어야 gate가 안정적으로 돕니다.

---

## 5. 장애 대응 (증상 → 조치)

| 증상 | 원인 후보 | 조치 |
| --- | --- | --- |
| API 410 세션 만료 | vault 서명 키 불일치 | Vercel `PREVIEW_QUOTA_SECRET` 통일 후 다시 만들기 |
| API 403 UNLOCK_FAIL | 미결제·다른 기기 | 같은 기기·브라우저에서 재결제 |
| Safari 잠금 | multipart 미사용 | `fetchClean.ts` iOS multipart 확인 |
| API OK인데 파일 없음 | 브라우저 차단 | 팝업 허용, 「링크를 눌러 저장」 |
| 레이아웃 준비 실패 | 이미지 URL 만료 | PNG 저장 후 다시 레이아웃 |
| 미리보기 한도 | 같은 IP·같은 사진 | 다른 셀카, 또는 결제 후 다시 만들기 |

---

## 6. 환경 변수 (자주 만지는 것만)

| 키 | 역할 |
| --- | --- |
| `GEMINI_API_KEY` | 실생성 |
| `MOCK_GENERATE` | `1`=목업, `0`=실생성 |
| `PAYMENT_MODE` | `sandbox` (현재) 또는 `toss` |
| `PREVIEW_QUOTA_SECRET` | vault 서명. 인스턴스마다 같아야 함 |
| `MAINT_SMOKE_SECRET` | maint gate용 한도 우회 |
| `UPSTASH_REDIS_REST_URL` | 생성 캡 공유(동시접속). Production·Preview 설정됨 |
| `UPSTASH_REDIS_REST_TOKEN` | 위와 쌍. **값 문서에 적지 말 것** |
| `NEXT_PUBLIC_BIZ_*` | 푸터 사업자 |

키가 바뀌면 다운로드가 410으로 깨집니다. Vercel Production 값을 함부로 바꾸지 마세요.

### 6-A. Upstash (동시접속 캡) — 2026-08-02

- **역할:** `/api/generate` 분당·일일 캡을 Vercel 인스턴스끼리 공유. 없으면 서버마다 따로 셈.
- **유료 필수 ✗** · 무료 Redis면 베타 충분.
- **상태:** Vercel Production/Preview에 URL·TOKEN 넣음 · 배포 반영됨.
- **임시 DB Claim (필수):**  
  https://upstash.com/start-redis/console/a940c466-3503-4c7c-ad88-c6c8cdcfc8ab  
  → 로그인 후 **Claim** 안 하면 **약 3일 후 만료**. Claim 하면 유지.
- **코드:** `src/lib/generateGate.ts` · `src/lib/durableQuota.ts`
- **실패 UX:** API 원문 금지 → 「사진관이 바빠요」 (`userFacingErrors.ts`)

---

## 7. 남은 일 (사람이 할 일)

자동 게이트는 GREEN입니다. 아래는 회장님 눈으로 한 번씩만 보면 됩니다.

1. 크롬: 업로드 → 결제 → 첫 컷 → 사진에 저장 → (플러스) 인화용
2. Safari(아이폰): 같은 경로, 「다운로드 잠금」 없는지
3. 결제 전 미리보기에서 워터마크(단정)가 보이는지
4. 푸터 사업자·부가세 문구 확인
5. 관공서·여권 「가능」 문구가 없는지

토스 실키·사업자 실번호 전환은 **이번 범위 밖**입니다. 지금은 sandbox 유지.

---

## 8. 에이전트·스킬 (Cursor)

| 스킬 | 언제 |
| --- | --- |
| `danjeongshot-maint` | 유지보수 진입 |
| `danjeongshot-ship-gate` | 출고 전 |
| `reliable-file-download` | 브라우저 저장 이슈 |
| `agency-payments-billing-engineer` | PG·토스 |

라우트: engineering → notion-chapter-push · lane:biz

---

## 9. 출고 체크리스트

1. `npm run build` 성공
2. `maint:gate` GREEN (prod)
3. `maint:check-debug` 0건
4. 크롬·Safari 수동 1회
5. 미리보기 워터마크 확인
6. 푸터·금지 카피 확인
