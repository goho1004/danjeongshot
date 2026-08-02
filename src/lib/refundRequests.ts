/**
 * 환불 요청 접수 (자동 환불 ✗ · 관리자 승인 후 처리).
 * 인메모리 — 서버리스 cold start 시 유실 가능. 운영 시 DB/시트 연동 예정.
 */

export type RefundRequestStatus = "pending" | "approved" | "rejected";

export type RefundRequest = {
  id: string;
  orderId: string;
  reason: string;
  status: RefundRequestStatus;
  createdAt: number;
  note?: string;
};

const g = globalThis as unknown as {
  __djsRefundReqs?: Map<string, RefundRequest>;
};

function store() {
  if (!g.__djsRefundReqs) g.__djsRefundReqs = new Map();
  return g.__djsRefundReqs;
}

export function createRefundRequest(
  orderId: string,
  reason: string
): RefundRequest {
  const id = `rf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const req: RefundRequest = {
    id,
    orderId,
    reason: reason.slice(0, 500),
    status: "pending",
    createdAt: Date.now(),
  };
  store().set(id, req);
  console.info("[refund-request]", {
    id,
    orderId,
    reason: reason.slice(0, 200),
  });
  return req;
}

export function listPendingRefunds(): RefundRequest[] {
  return Array.from(store().values())
    .filter((r) => r.status === "pending")
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getRefundRequest(id: string): RefundRequest | undefined {
  return store().get(id);
}
