/**
 * ?ㅻえ?ш? ?듦낵???뚭퉴吏 ?ъ떆??(理쒕? N??
 * BASE_URL=... node scripts/flow-loop.mjs
 */
import { spawn } from "child_process";

const MAX = Number(process.env.FLOW_LOOP_MAX || "5");
const BASE = process.env.BASE_URL || "http://127.0.0.1:3011";

function runOnce() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/flow-smoke.mjs"], {
      env: { ...process.env, BASE_URL: BASE },
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let out = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      out += d.toString();
    });
    child.on("close", (code) => resolve({ code, out }));
  });
}

(async () => {
  for (let i = 1; i <= MAX; i++) {
    console.log(`\n=== loop ${i}/${MAX} @ ${BASE} ===`);
    const { code, out } = await runOnce();
    console.log(out.slice(-2000));
    if (code === 0) {
      console.log(`PASS on attempt ${i}`);
      process.exit(0);
    }
    console.log(`FAIL attempt ${i}, retry??);
  }
  console.error(`FAILED after ${MAX} attempts`);
  process.exit(1);
})();

