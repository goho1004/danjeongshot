# OpenCode — 단정 maint-gate CI `download-loop` RED 수정

> **Cursor Gate** · 선시공 OK · **완성 전 보고 ✗**
> **모델:** `opencode/muse-spark-1.3-contributor-free` (기본) · 막히면 Sonnet
> **워크스페이스:** `D:\Memento\projects\danjeongshot`
> **Prod:** `https://danjeongshot.vercel.app`
> **회장 확정:** 텔레그램 Secrets **지우지 말 것** — 와치독 수신 = 배선 정상. 문제는 Secrets가 아니라 **gate 체크 download-loop**.

---

## 현상 (확정)

| 시각(KST) | 알림 |
|-----------|------|
| 22:20 | `gate RED … failures=download-loop,flow-e2e` |
| 22:26 | 동일 (Actions 재실행 후도 동일) |

- GitHub Secrets 3개 정상 존재·주입됨: `MAINT_SMOKE_SECRET`, `TELEGRAM_BOT_TOKEN`(단정워치독 VPGgemini_bot), `TELEGRAM_WATCHDOG_CHAT_ID`
- `notify:sent` — 텔레그램 **정상**. Secrets 재등록·삭제 **Out**.
- `flow-e2e` = 기존 합의 SKIP(셀렉터). 단독이면 경고 톤만. 지금은 **download-loop도 FAIL**이라 진짜 RED.
- 로컬 `npm run maint:gate`에서는 이전에 download-loop **GREEN**이었음 → **CI(ubuntu Actions) vs 로컬** 차이 또는 **gate 안에서 세션 재사용/경합** 의심.

최근 run 예: `https://github.com/goho1004/danjeongshot/actions/runs/34759811588`  
로그에 GATE 요약 JSON만 있고 **download-loop의 stderr/output이 안 보임** → 원인 파악 전에 로그부터 보강 가능.

---

## In

1. **원인 확정** (값·시크릿 출력 ✗): CI에서 download-loop가 왜 깨지는지 1줄.
2. **최소 diff 수정** → Actions에서 `download-loop` GREEN.
3. `gate-notify` / `runDownloadLoop` 실패 시 **짧은 원인 문자열**(status·code·메시지 앞 120자, 토큰·vault ✗)이 Actions 로그·(선택)텔레그램에 나오게.
4. `flow-e2e`는 고치지 않음(합의 SKIP). **onlyE2e면 exit 0 + 텔레그램 무전송**으로 바꿔 6시간마다 스팸 방지 권장(회장 지시와 맞음).
5. 끝 보고 = 아래 §D.

## Out

- Telegram / MAINT Secrets **삭제·재발급·값 출력·커밋**
- Option A(추가컷 실결제) · 원일 작업
- narrative_core · Tier0
- flow-e2e Playwright 대규모 고침
- 브라우저로 단정 사이트 헤매기(가능하면 CLI/`gh run`만)

---

## 조사 순서 (강제)

1. `scripts/download-loop.mjs` · `scripts/maint/checks/run-scripts.mjs` · `scripts/maint/gate.mjs` · `prepPaid.mjs` 읽기.
2. **가설 우선순위**
   - A. `SMOKE_SESSION` JSON(특히 `previewVault` base64)이 **spawn env에 너무 커서** CI에서 truncate/실패
   - B. gate가 만든 session을 download보다 **watermark/safari가 먼저 쓰는 건 아님**(순서는 download가 앞) — 다만 **같은 order 이중 download** 또는 vault 만료
   - C. CI만 `MAINT_SMOKE_SECRET` 불일치 → complete/generate는 통과하는데 download만 실패하는지 확인(payment-integrity·prep는 GREEN이면 secret OK)
   - D. spawnSync `maxBuffer` / encoding / cwd
3. 재현:
   ```powershell
   cd D:\Memento\projects\danjeongshot
   npm run maint:gate -- --base https://danjeongshot.vercel.app
   # download-loop 체크의 output 필드 전체를 로그에 남기도록  temporarily 보강 후 원인 확보
   ```
4. 수정 후:
   ```powershell
   gh workflow run maint-gate-cron.yml --ref master
   gh run watch   # failures에 download-loop 없어야 함
   ```
   onlyE2e만 남으면: exit 0 · 텔레그램 안 감 · Actions ✅ 기대.

---

## 수정 가이드 (최소)

- **원인 A(유력):** session을 env로 넘기지 말고 temp 파일/`stdin`/게이트 프로세스 내 직접 `fetch`로 download 검증. 또는 vault 없이 assetId 경로.
- `runDownloadLoop` 반환에 `detail`/`output` 앞부분을 gate-notify JSON에 포함(시크릿·토큰 redact).
- `gate-notify.mjs`: `onlyE2e === true` → `process.exit(0)` + notify skip (문구만 콘솔).

---

## D. 끝 보고

```markdown
## download-loop CI FIX 결과
| 항목 | 결과 |
|------|------|
| 원인 1줄 | |
| diff 파일 | |
| 로컬 gate download-loop | GREEN/RED |
| Actions run URL | |
| failures (수정 후) | (download-loop 없어야 함) |
| onlyE2e exit0 | 적용/미적용 |
| 텔레그램 Secrets | 손대지 않음 (확인) |
```

---

## OpenCode 실행

```powershell
opencode run --dir D:\Memento\projects\danjeongshot --auto `
  -m "opencode/muse-spark-1.3-contributor-free" `
  -f "D:\Memento\projects\danjeongshot\docs\handoff\OPENCODE_DOWNLOAD_LOOP_CI_FIX_v1.md" `
  "위 파일대로 download-loop CI RED 원인 확정·최소수정. Telegram Secrets 삭제·재등록·값출력 금지. flow-e2e는 SKIP 유지, onlyE2e면 exit0+알림skip 권장. Actions 재실행으로 download-loop GREEN 확인 후 §D만 보고."
```

Desktop: 이 파일만 · Muse 1.3.
