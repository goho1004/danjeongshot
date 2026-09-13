# OPENCODE_DANJEONG_UX_LAUNCH_v1 — 단정 마무리·런칭 UX 설계 발주

> **발주:** 2026-09-13 · **회장님** → **OpenCode**  
> **Gate:** Cursor  
> **제품:** 단정샷 (`D:\Memento\projects\danjeongshot`) · https://danjeongshot.vercel.app  
> **일정:** **마무리 → 런칭** · **촬영자 다음 주** 투입  
> **톤:** 꼼꼼 · 벤치마크 · 유저흐름 전체 매끄럽게 · 시공 전 **설계 MD 먼저**

---

## 0. 한 줄

단정을 **런칭 가능한 흐름**으로 다듬는다.  
특히 **파일 받는 법** · **옵션 선택**(지금 흐름 나쁨) → **마무리(결제·완료·수령)** 까지  
인터넷에 **잘 된 기존 서비스**를 찾아 비교한 뒤, **단정 전용 유저흐름 설계**를 제출한다.

### 0-HARD (회장님 · 2026-09-13)

```text
유저에게 이것저것 묻지 마.
₩9,900 / ₩14,900 선택 → 결제 원클릭.
디폴트 = 원클릭. 세심 옵션 = 찾는 사람만(접힘).
```

---

## 0-A. 작업 디렉터리 (HARD · 이거 때문에 헤맴 ✗)

```text
정본 경로: D:\Memento\projects\danjeongshot
산출:     D:\Memento\projects\danjeongshot\docs\handoff\
발주:     ...\docs\handoff\OPENCODE_DANJEONG_UX_LAUNCH_v1.md
사이트:   https://danjeongshot.vercel.app
```

| ✗ 하지 말 것 | ○ 할 것 |
|--------------|---------|
| `E:\Documents\Default Project` 에서 찾기 | OpenCode **cwd / 프로젝트 루트**를 `D:\Memento\projects\danjeongshot` 로 연다 |
| Default Project에 단정 없다고 FAIL | `cd /d D:\Memento\projects\danjeongshot` 후 `dir` · `src` 확인 |
| 새 폴더에 임의 복제 | D: 정본만 읽고 씀 |

PowerShell 확인:

```powershell
cd D:\Memento\projects\danjeongshot
dir
Test-Path .\src
Test-Path .\docs\handoff\OPENCODE_DANJEONG_UX_LAUNCH_v1.md
```

셋 다 보이면 그다음 분석 시작.

---

## 1. 역할

| 누가 | 무엇 |
|------|------|
| **OpenCode** | 분석 · 벤치마크 · **UX/플로우 설계 MD** · (Gate 후) 시공 |
| **Cursor** | Gate · 채택 · ship-gate |
| **회장님** | 방향 · 촬영자 일정 · 최종 go |
| Claude/Hermes | 본 발주 **아님** (손=OpenCode) |

---

## 2. 반드시 할 일

### A. 현황 꼼꼼 분석 (코드·화면·카피)

1. `D:\Memento\projects\danjeongshot` 클론/열기 · `src/` 주문·업로드·옵션 UI 추적  
2. 실제 유저 시나리오 1인칭으로 밟기 (모바일 우선)  
3. **아픈 곳 목록** — 특히:
   - **파일 받는 법** (업로드·드래그·카메라·용량·포맷·미리보기·재업로드)
   - **옵션 선택** (상품·배경·장수·규격·가격 연동 · 선택이 안 읽히거나 튕김)
   - **마무리** (장바구니/결제·완료 화면·다운로드·안내·CS)
4. 기존 문서 참고(덮어쓰지 말고 인용):  
   `docs/PIPELINE.md` · `docs/LAUNCH_*` · `docs/FLOW_*.md` · 스킬 `danjeongshot-launch` / `danjeongshot-ship-gate`

### B. 인터넷 벤치마크 (잘 된 서비스)

**유사 카테고리**에서 흐름이 매끄러운 곳을 **3~7곳** 찾아 표로 정리.

후보 축 (예 · 그대로 복제 ✗):

- 증명/여권/프로필 사진 웹 (국내·해외)
- 인화·포토북·캔버스 커스텀 (파일↑ → 옵션 → 결제)
- AI 보정·배경  Remover/프로필 생성 SaaS
- 토스·카카오 등 **모바일 결제·완료** UX가 좋은 커머스

각 서비스마다:

| 항목 | 적을 것 |
|------|---------|
| 이름·URL | |
| 파일 받기 | 어떤 UX가 좋은지 1~3줄 |
| 옵션 선택 | 어떤 UX가 좋은지 1~3줄 |
| 마무리 | 결제·완료·수령 안내 |
| 단정에 빌릴 점 | **구체적으로** |
| 단정에 안 맞음 | 여권 공인·과장 카피 등 |

### C. 단정 유저흐름 설계 (산출 본체)

**한 장의 설계 MD**로 제출:

`docs/handoff/DANJEONG_UX_FLOW_DESIGN_v1.md` (이 이름 권장)

포함 필수:

1. **As-Is** 흐름도 (지금) — 막히는 지점 표시  
2. **To-Be** 흐름도 (런칭용) — 한 화면/한 결정 원칙  
3. **파일 받기** 상세 시방 (포맷·용량·미리보기·실패 복구·모바일)  
4. **옵션 선택** 상세 시방 (정보 구조·기본값·가격 연동·되돌리기)  
5. **마무리** (결제 전 요약 · 완료 · 파일/안내 수령 · CS 입구)  
6. **촬영자 다음 주** 대비 — 사람 손 구간 vs 자동 구간 경계  
7. **우선순위** P0(런칭 전 필수) / P1 / P2  
8. **금지** 재확인: 여권·관공서 공인 카피 ✗ · 시크릿 채팅 평문 ✗

창의 OK · **베끼기만 ✗** · 단정 브랜드(단정·2C·국내)에 맞게 번역.

---

## 3. 성공 기준

| | |
|--|--|
| 분석 | As-Is 막힘 **파일받기·옵션**이 근거(경로·화면)와 함께 적힘 |
| 벤치 | 잘 된 서비스 **≥3** · 단정에 옮길 점 명확 |
| 설계 | To-Be가 **처음부터 끝까지** 한 호흡으로 읽힘 |
| 런칭 | P0만 해도 촬영자 다음 주 전에 **손볼 목록**이 고정됨 |
| Gate | Cursor가 설계 MD 읽고 PASS/고치기 가능 |

---

## 4. Out (하지 말 것)

- 설계 없이 대규모 UI 리팩터부터 ✗  
- Product Hunt/해외 바이럴을 주채널로 강제 ✗  
- 여권·관공서 **공인** 암시 카피 ✗  
- 토스 라이브 키·시크릿을 MD/채팅에 붙이기 ✗  
- Hermes/Claude에게 떠넘기기 ✗  
- 마을·메멘토 서사 오염 ✗

---

## 5. 작업 순서 (권장)

```text
1) 현황 클릭·코드 추적 (파일받기·옵션·마무리)
2) 벤치마크 표
3) To-Be 흐름 + P0/P1/P2
4) docs/handoff/DANJEONG_UX_FLOW_DESIGN_v1.md 제출
5) 회장님/Cursor Gate
6) Gate PASS 후 → OpenCode 시공 (별 발주 또는 CONTINUE)
```

---

## 6. 보고 형식 (끝 메시지)

```text
PASS/FAIL danjeong UX design
경로: docs/handoff/DANJEONG_UX_FLOW_DESIGN_v1.md
P0: (3~7개 한 줄씩)
회장 손: 사이트에서 파일받기→옵션→마무리 1회 클릭
촬영자: 다음 주 · 사람 구간 경계 명시 여부 O/X
```

---

## 7. 핀

```text
OpenCode. 단정 마무리·런칭.
**cwd 필수:** D:\Memento\projects\danjeongshot  (E:\Documents\Default Project ✗)
꼼꼼 분석 + 잘 된 인터넷 서비스 벤치 → 유저흐름 전체 설계.
특히 파일받는법 · 옵션선택(흐름 나쁨) · 마무리.
촬영자 다음 주. 설계 MD 먼저. Gate=Cursor.
정본: D:\Memento\projects\danjeongshot\docs\handoff\OPENCODE_DANJEONG_UX_LAUNCH_v1.md
```
