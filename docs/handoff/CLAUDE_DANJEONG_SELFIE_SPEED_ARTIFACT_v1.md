# CLAUDE_DANJEONG_SELFIE_SPEED_ARTIFACT_v1 — 캠 기동 속도 + 원일 아티팩

> **발주:** 회장 2026-09-18 18:33 · Cursor Gate  
> **시공:** Claude · Cursor 코딩 ✗  
> **숲 팩 (공식):** `forest_pack.py --project danjeongshot` 선독 후 손  
> **중간보고 ✗ · 끝 = 비교표 + 패치 + prod 배포 + Section H**

---

## 회장 메시지 (그대로)

1. 단정 **좋아** — 근데 팝업 후 **카메라 활성화가 엄청 느림**. 원일은 **바로** 올라온다 → **코드 비교**하라.  
2. **화면 아티팩도 원일이 더 고급** → **원일 아티팩을 가져와**.  
3. (맥락) 메멘토 먹이기 **공식 사용**.

원일 쓰기 ✗ · 읽기만 (`D:\Memento_Wonil\admin\worker.html` cam).

---

## 이 패치가 건드리는 축

`단정 Studio 셀카 촬영 UX` (기동 지연 · 비주얼 아티팩)  
**안 건드림:** 결제·generate·billGate·claim · 원일 저장소

---

## In

### A · 코드 비교 (필수 · H에 표)
원일 `worker.html` cam vs 단정 `SelfieCapture`(및 풀스크린 오버레이):
- `getUserMedia` 호출 시점 (팝업 연 직후 vs 지연)
- constraints (`facingMode` / width·height / 불필요 await)
- React 마운트·이펙트 체인·상태 전이로 인한 이중 대기
- 권한 프롬프트·폴백 앨범 타이밍
- **왜 원일이 빠른지 한 줄** + 단정에 적용할 최소 변경

### B · 기동 빠르게
- 팝업/오버레이 표시와 **동시에** 캠 스트림 요청 (가능하면 미리 warm)
- 불필요한 직렬 await·큰 리렌더·무거운 이펙트 제거
- 목표 체감: 원일에 가깝게 **바로** 프리뷰

### C · 원일 아티팩 이식 (고급감)
원일 cam UI에서 가져올 것 (계약 복제 · 단정 톤 옷):
- stage / ring / ring2 / face-guide / 밝기 배지 / 셔터 버튼 비율·그림자·타이포 계층
- 플래시·거울 미리보기 등 **이미 있는 것**은 원일 비주얼에 더 맞추기
- 통째 CSS 복붙으로 단정 브랜드 붕괴 ✗ — **아티팩·레이아웃 고급감**이 목표

### D · 배포 + 롤백 한 줄 H

## Out

- 원일 코드 수정  
- 결제/생성/장부  
- “일단 setTimeout으로 가림” 식 가짜 속도  
- 비밀·대용량 바이너리 남발

---

## 산출

`docs/evidence/audit/20260918_DANJEONG_SELFIE_SPEED_ARTIFACT.md`  
일지 append · 비교표 필수

## 끝 조건

비교표 + 기동 체감 개선 + 아티팩 원일급 + prod 배포 + H
