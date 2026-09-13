# CLAUDE_DANJEONG_UX_P0_v1 — 단정 UX P0 시공 발주

> **GO:** 2026-09-13 · 회장님 「시작!」 · **시공: Claude** · **Gate: Cursor**  
> **cwd:** `D:\Memento\projects\danjeongshot`  
> **설계:** `docs/handoff/DANJEONG_UX_FLOW_DESIGN_v1.md` — **§0 HARD만 나침반** (Step0~7 마법사로 늘리기 ✗)

---

## HARD (어기면 FAIL)

```text
유저에게 이것저것 묻지 마.
₩9,900 / ₩14,900 선택 → 결제 원클릭.
디폴트 = 원클릭. 세심 옵션 = 「더 맞추기」접힘만.
```

---

## P0 (이 발주만 · 끝내고 보고)

1. **업로드 먼저** (또는 최소: 옵션 전부 접고 업로드가 주인공)  
   - `PurposeUploadStep`: look/season/`ExtraPromptFields` → **「더 맞추기」`<details>`/아코디언 기본 접힘**  
   - 디폴트 유지: `as_photo` 등 (기존 state 기본값)  
   - 「다시 올리기」버튼 + 용량/포맷 한 줄 안내

2. **팩 2카드 + 결제 원클릭**  
   - 메인 결정 = 기본 ₩9,900 / 플러스 ₩14,900  
   - 팩 고른 뒤 **추가 설문 ✗** → `CheckoutStep` CTA 「₩N 결제」가 주인공  
   - 약관 5문장 → **핵심 1문장 + 「약관」링크 접힘**

3. **완료 원클릭** (`PaidDonePanel`)  
   - 1순위: **이 컷 저장**  
   - 플러스: **인화용 저장** 바로  
   - 업셀·메일·regen·추가컷 = **「다른 방법」접힘** (저장 전엔 안 펼침)

4. Preview: 희소 업셀 문구는 저장 전 단계에 **약하게/제거** · 고른 뒤 저장으로 이어지는 CTA 1개

---

## Out

- worker / GPS / PWA / role badge ✗  
- 여권·공인 카피 ✗ · 시크릿 ✗  
- 상태머신 전면 교체 ✗ (`makeFlow` 유지)  
- 설계 MD 장문 재작성 ✗ · **코드 시공**  
- Plan mode · 회장에게 질문 연쇄 ✗ · 초안·창의 OK

---

## 완료 보고 (끝 메시지만)

```text
PASS/FAIL danjeong UX P0
경로: (수정 파일 목록)
원클릭: 팩→결제 / 더맞추기 접힘 / 완료 저장 접힘 여부
회장 손: /make 한 번 클릭 스모크
```
