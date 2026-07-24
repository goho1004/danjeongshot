# 단정샷 (danjeongshot)

급할 때, 나처럼 보이는 단정 프사 — **웹 Primary** MVP.

ProShot/Danny 자료는 **참고만**. 브랜드·카피·용도(이력서/링크드인/시트)·관공서 아님 고지는 단정샷 시방서 기준.

## 빠른 시작

```bash
cd D:\Memento\projects\danjeongshot
copy .env.example .env.local
npm install
npm run dev
```

- http://localhost:3000 — 랜딩
- http://localhost:3000/make — 업로드→생성→샌드박스 결제→다운로드

`MOCK_GENERATE=1`(기본)이면 Gemini 키 없이 플로우 테스트.  
실생성: `.env.local`에 `GEMINI_API_KEY=` 넣고 `MOCK_GENERATE=0`.

## 유지보수

지침서: [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md)

```bash
npm run maint:health          # 프로덕션 헬스
npm run maint:download-loop   # 결제→다운로드 API (GREEN 필수)
npm run maint:smoke           # 전체 스모크
npm run maint:env-check       # 로컬 env
npm run maint:check-debug     # 임시 디버그 계측 잔여
```

배포: `npx vercel --prod --yes` 후 `npm run maint:download-loop`

## 구현 순서 (진행)

1. ✅ 제작 — 랜딩 + 메이크 플로우 + MOCK/실생성 API + 결제 샌드박스 스텁
2. ✅ Vercel 배포 — https://danjeongshot.vercel.app
3. ✅ 토스 연동 코드 — `PAYMENT_MODE=toss` + `NEXT_PUBLIC_TOSS_CLIENT_KEY` + `TOSS_SECRET_KEY`
4. 도메인 연결
5. 라이브 결제 · 사업자·통신판매 번호 푸터 env 채우기

## 잠금

- 여권·민원 OK 클레임 ✗
- 앱 설치 CTA ✗
- CAC 가드레일 ≤ ₩7,000 (마케팅)
