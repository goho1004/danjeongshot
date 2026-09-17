# Claim fail-closed 메모 (P0-2) — 2026-09-17

유료 generate 사전 claim(`preview`/`redo`/`asv`)과 `mark*Durable` 1회 소진 표시는
Upstash NX 원자 연산에 의존한다. Upstash 미설정·오류(`kvSetNx === null`) 시
**메모리 Map 폴백(fail-open)을 하지 않고 `503 STORE_UNAVAILABLE`로 닫는다.**

이유 1줄: Vercel은 멀티 인스턴스라 프로세스 메모리가 서로 안 보여서,
문이 고장 났을 때 열어 두면(fail-open) 동시 2 POST가 Gemini를 2번 쏘고
과금만 남는다. 열쇠(Upstash)가 없으면 문을 닫는다(fail-closed).

예외 1줄: `MOCK_GENERATE=1`(로컬/테스트)일 때만 메모리 폴백 허용 —
mock은 Gemini를 쏘지 않으므로 과금 리스크가 없다. prod 가정은 Upstash 필수.
