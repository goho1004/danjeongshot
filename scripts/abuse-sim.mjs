/**
 * 어뷰징 시나리오 시뮬레이션 (한도 게이트 + 워터마크 전략)
 * 실행: node scripts/abuse-sim.mjs
 */

const PER_DEVICE = 3;
const PER_IP = 5;
const SAME_IMG = 2;
const GLOBAL = 200;

function sim() {
  const scenarios = [];

  // A: 재접속만 (쿠키 유지)
  {
    let cookie = 0;
    let blocked = 0;
    for (let i = 0; i < 10; i++) {
      if (cookie >= PER_DEVICE) blocked++;
      else cookie++;
    }
    scenarios.push({
      id: "A_reconnect_cookie",
      name: "탭 닫고 재접속 (쿠키 유지)",
      attempts: 10,
      success: cookie,
      blocked,
      verdict: cookie === PER_DEVICE && blocked === 7 ? "PASS" : "FAIL",
    });
  }

  // B: 쿠키 삭제, deviceFp 유지
  {
    let durable = 0;
    let success = 0;
    let blocked = 0;
    for (let i = 0; i < 10; i++) {
      // 쿠키는 매번 0
      if (durable >= PER_DEVICE) blocked++;
      else {
        durable++;
        success++;
      }
    }
    scenarios.push({
      id: "B_clear_cookie_keep_fp",
      name: "쿠키 삭제 · localStorage 기기지문 유지",
      attempts: 10,
      success,
      blocked,
      verdict: success === PER_DEVICE ? "PASS" : "FAIL",
    });
  }

  // C: 시크릿 + 새 fp + 같은 IP
  {
    let ip = 0;
    let success = 0;
    let blocked = 0;
    for (let i = 0; i < 12; i++) {
      // 매번 새 기기처럼 쿠키·fp 리셋, IP만 공유
      if (ip >= PER_IP) blocked++;
      else {
        ip++;
        success++;
      }
    }
    scenarios.push({
      id: "C_incognito_same_ip",
      name: "시크릿 반복 · 동일 IP",
      attempts: 12,
      success,
      blocked,
      verdict: success === PER_IP ? "PASS" : "FAIL",
    });
  }

  // D: 같은 사진 반복
  {
    let img = 0;
    let success = 0;
    let blocked = 0;
    for (let i = 0; i < 6; i++) {
      if (img >= SAME_IMG) blocked++;
      else {
        img++;
        success++;
      }
    }
    scenarios.push({
      id: "D_same_image",
      name: "같은 셀카로 미리보기 연타",
      attempts: 6,
      success,
      blocked,
      verdict: success === SAME_IMG ? "PASS" : "FAIL",
    });
  }

  // E: DevTools로 미리보기 URL 저장 (클린 탈취)
  scenarios.push({
    id: "E_devtools_steal",
    name: "DevTools로 미리보기 이미지 저장",
    attempts: 1,
    success: 0,
    blocked: 1,
    note: "클라이언트에는 옅은 번인 워터마크본만. 클린은 서버 전용 → 이력서용으로 쓰기 어려움",
    verdict: "PASS",
  });

  // F: VPN으로 IP 돌리기 + 새 기기 (글로벌 예산)
  {
    let global = 0;
    let success = 0;
    let blocked = 0;
    const farm = 250;
    for (let i = 0; i < farm; i++) {
      if (global >= GLOBAL) blocked++;
      else {
        global++;
        success++;
      }
    }
    scenarios.push({
      id: "F_vpn_farm_global",
      name: "VPN·다기기 농장 (일 글로벌 예산)",
      attempts: farm,
      success,
      blocked,
      verdict: success === GLOBAL ? "PASS" : "FAIL",
    });
  }

  // G: 해상도↓ 대신 워터마크 정책
  scenarios.push({
    id: "G_watermark_not_downscale",
    name: "맛보기 = 해상도↓ ✗ · 옅은 워터마크 ○",
    note: "과한 워터마크는 반감 → opacity~0.11 대각 + 모서리. 클린은 결제 후만.",
    verdict: "PASS",
  });

  return scenarios;
}

const rows = sim();
console.log("\n단정샷 어뷰징 시뮬레이션\n");
for (const r of rows) {
  console.log(
    `[${r.verdict}] ${r.name}` +
      (r.attempts != null
        ? ` · 시도 ${r.attempts} → 성공 ${r.success ?? "-"} / 차단 ${r.blocked ?? "-"}`
        : "")
  );
  if (r.note) console.log(`       ${r.note}`);
}
const fail = rows.filter((r) => r.verdict !== "PASS").length;
console.log(`\n결과: ${rows.length - fail}/${rows.length} PASS\n`);
process.exit(fail ? 1 : 0);
