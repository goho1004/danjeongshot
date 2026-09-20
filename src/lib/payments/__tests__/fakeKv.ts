/**
 * 테스트용 Redis — **진짜 Redis 명령 의미만** 구현한다 (GET / SET EX / SET NX EX / DEL).
 *
 * 결제 저장소 로직을 가짜로 대신 구현하지 않는 것이 핵심이다: 여기 있는 것은
 * 원시 명령 네 개뿐이고, claim/markPaid 의 판단은 전부 `UpstashPaymentStore` 가 한다.
 * 각 명령은 원자적(await 없는 동기 구간)이지만 명령 **사이**에는 다른 호출이 끼어든다 —
 * 그래서 동시 콜백 시험이 실제 경합을 재현한다.
 */

import type { PaymentKv } from "../upstashStore";

type Row = { value: string; expiresAt: number };

export class FakeKv implements PaymentKv {
  rows = new Map<string, Row>();
  /** 명령 호출 로그 — 왕복 횟수 확인용 */
  calls: string[] = [];
  /** null 을 돌려줄 명령 수(저장소 장애 시뮬레이션) */
  failSetNx = 0;

  constructor(private now: () => number) {}

  private live(key: string): Row | null {
    const r = this.rows.get(key);
    if (!r) return null;
    if (r.expiresAt <= this.now()) {
      this.rows.delete(key);
      return null;
    }
    return r;
  }

  async get(key: string): Promise<string | null> {
    await Promise.resolve();
    this.calls.push(`GET ${key}`);
    return this.live(key)?.value ?? null;
  }

  async set(key: string, value: string, exSec: number): Promise<boolean> {
    await Promise.resolve();
    this.calls.push(`SET ${key}`);
    this.rows.set(key, { value, expiresAt: this.now() + exSec * 1000 });
    return true;
  }

  async setNx(key: string, value: string, exSec: number): Promise<boolean | null> {
    await Promise.resolve();
    this.calls.push(`SETNX ${key}`);
    if (this.failSetNx > 0) {
      this.failSetNx--;
      return null;
    }
    if (this.live(key)) return false;
    this.rows.set(key, { value, expiresAt: this.now() + exSec * 1000 });
    return true;
  }

  async del(key: string): Promise<void> {
    await Promise.resolve();
    this.calls.push(`DEL ${key}`);
    this.rows.delete(key);
  }
}
