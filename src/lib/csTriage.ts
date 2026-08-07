/**
 * 단정샷 자동 CS — 의도 분류 + 표준 응답 + 액션 힌트
 * 사람 CS는 이 로직 결과를 그대로 붙여넣거나, 에스컬레이션만 처리.
 */

export type CsIntent =
  | "refund_after_download"
  | "refund_before_download"
  | "quality_likeness"
  | "watermark_confusion"
  | "gov_id_rejected"
  | "kiosk_how"
  | "payment_fail"
  | "duplicate_charge"
  | "download_fail"
  | "regen_request"
  | "delete_data"
  | "abuse_threat"
  | "general"
  | "unknown";

export type CsAction =
  | "auto_reply"
  | "offer_regen"
  | "check_order_refund"
  | "escalate_human"
  | "escalate_urgent"
  | "link_legal";

export type TriageResult = {
  intent: CsIntent;
  confidence: "high" | "medium" | "low";
  /** 고객에게 바로 보낼 문구 */
  reply: string;
  /** 상담원용 한 줄 */
  agentNote: string;
  actions: CsAction[];
  /** 정책상 환불 가능 추정 (주문 상태와 AND) */
  refundHint: "deny" | "maybe" | "likely" | "n/a";
  links: { label: string; href: string }[];
  /** 환불·중요만 와치독(업무폰) SMS — escalate_human만으로는 false */
  notifyWatchdog: boolean;
};

/** 환불건·urgent만 업무폰 보고. 일반 escalate_human · FAQ는 자동답만. */
export function shouldNotifyWatchdog(triage: Pick<TriageResult, "intent" | "actions">): boolean {
  if (triage.actions.includes("escalate_urgent")) return true;
  if (triage.intent === "abuse_threat") return true;
  if (
    triage.intent === "refund_after_download" ||
    triage.intent === "refund_before_download" ||
    triage.intent === "duplicate_charge"
  ) {
    return true;
  }
  return false;
}

function withNotifyFlag(
  triage: Omit<TriageResult, "notifyWatchdog">
): TriageResult {
  return { ...triage, notifyWatchdog: shouldNotifyWatchdog(triage) };
}

type Rule = {
  intent: CsIntent;
  confidence: TriageResult["confidence"];
  keywords: string[];
  refundHint: TriageResult["refundHint"];
  actions: CsAction[];
  reply: string;
  agentNote: string;
};

const LEGAL = {
  refund: "/legal/refund",
  terms: "/legal/terms",
  privacy: "/legal/privacy",
  help: "/help",
  make: "/make?resume=1",
} as const;

const RULES: Rule[] = [
  {
    intent: "abuse_threat",
    confidence: "high",
    keywords: ["고소", "소송", "신고할", "공정위", " consumeraffairs", "변호사", "경찰"],
    refundHint: "n/a",
    actions: ["escalate_urgent", "link_legal"],
    reply:
      "불편을 드려 죄송합니다. 주문번호와 상황을 남겨 주시면 운영자가 확인 후 연락드리겠습니다. 환불·청약철회는 고지된 정책(다운로드 후 불가 등)을 따릅니다. 정책: /legal/refund",
    agentNote: "위협·분쟁 톤 → 즉시 사람. 감정 대응 금지, 사실·정책만.",
  },
  {
    intent: "duplicate_charge",
    confidence: "high",
    keywords: ["중복결제", "두 번 결제", "이중결제", "두번결제", "결제 두", "잘못 결제"],
    refundHint: "likely",
    actions: ["escalate_human", "check_order_refund"],
    reply:
      "중복 결제가 의심되면 주문번호(ord_…)와 결제 시각·금액을 보내 주세요. 확인되는 즉시 샌드박스/실결제 기준으로 환불 처리합니다.",
    agentNote: "PG 내역 대조 후 환불. 다운로드 여부와 무관하게 중복분은 환불.",
  },
  {
    intent: "gov_id_rejected",
    confidence: "high",
    keywords: ["여권", "주민등록", "면허", "관공서", "반려", "신분증", "비자"],
    refundHint: "deny",
    actions: ["auto_reply", "link_legal"],
    reply:
      "단정샷은 관공서·여권·신분증 제출용을 보장하지 않습니다. 결제 전에도 안내·동의 항목에 포함되어 있으며, 반려를 이유로 한 환불은 어렵습니다. 이력서·링크드인 등 민간용으로만 이용해 주세요. → /legal/refund",
    agentNote: "환불 거절 정답. 공감 한 줄 + 정책 링크. 예외 금지.",
  },
  {
    intent: "refund_after_download",
    confidence: "high",
    keywords: ["다운로드 했는데", "받았는데 환불", "저장했는데", "다운받", "환불해", "돈 돌려", "환불"],
    refundHint: "deny",
    actions: ["auto_reply", "offer_regen", "link_legal"],
    reply:
      "다운로드 후에는 환불이 어렵습니다. 품질이 아쉬우셨다면 다음에 다시 이용하실 때 결제 직후 「다시 만들기」·「A/S 서비스」와 더 밝은 정면 셀카로 받아 주세요. (이미 다운로드한 주문은 재생성도 불가합니다.) 촬영 팁: /help#shoot-tips · 정책: /legal/refund",
    agentNote: "환불 → A/S·팁 유도. downloaded면 redo 불가 고지.",
  },
  {
    intent: "refund_before_download",
    confidence: "medium",
    keywords: ["아직 다운", "다운로드 안", "안 받았", "결제만", "자동 환불"],
    refundHint: "maybe",
    actions: ["offer_regen", "auto_reply"],
    reply:
      "다운로드하지 않으셨다고 자동 환불되지는 않아요. 먼저 만들기에서 「이 컷 받기」로 받아 보시고, 아쉬우면 다시 만들기·A/S를 이용해 주세요. (/make?resume=1) 시스템 오류로 정말 못 받으신 경우만 주문번호·사유를 남겨 주시면 운영자가 검토 후 승인 시에만 환불합니다. 팁: /help#shoot-tips",
    agentNote: "미다운로드≠자동환불. 받기·A/S 유도 → 사유+관리자승인.",
  },
  {
    intent: "quality_likeness",
    confidence: "high",
    keywords: [
      "안 닮",
      "안닮",
      "닮지",
      "불만",
      "분위기",
      "이상해",
      "못생겼",
      "별로",
      "마음에 안",
      "과보정",
      "어색",
      "꽝",
    ],
    refundHint: "deny",
    actions: ["offer_regen", "auto_reply"],
    reply:
      "불편을 드려 죄송합니다. 환불보다 A/S로 한 번 더 다시 만들어 드릴게요. 마음에 들지 않았던 결과 사진(또는 더 밝은 정면 셀카)을 카톡으로 보내 주시면 확인 후 다시 만들어 카톡으로 보내 드립니다. 잘 나오는 법: /help#shoot-tips",
    agentNote: "카톡 A/S: 수신→옆창 Gemini 재생성→카톡 전달. 환불 ✗ · TG ✗",
  },
  {
    intent: "regen_request",
    confidence: "high",
    keywords: ["재생성", "다시 만들", "한 번 더", "다시 뽑"],
    refundHint: "n/a",
    actions: ["offer_regen", "auto_reply"],
    reply:
      "결제 후 「마음에 안 들어요 → 다시 만들기」1회, 그래도 아쉬우면 「A/S 서비스」1회가 있습니다. 주문번호로 가능 여부를 확인해 드릴게요. (다운로드 후에는 불가)",
    agentNote: "redoUsed/asvUsed 확인. UI에서 분기.",
  },
  {
    intent: "watermark_confusion",
    confidence: "high",
    keywords: ["워터마크", "미리보기", "글자 남아", "단정샷 PREVIEW", "지워지지"],
    refundHint: "n/a",
    actions: ["auto_reply"],
    reply:
      "지금은 결제 후 첫 컷에 워터마크를 넣지 않습니다. 화면에 글자가 보이면 새로고침 후 「이 컷 받기」로 PNG를 저장해 주세요. 예전 미리보기 화면을 보고 계신 경우일 수 있어요.",
    agentNote: "pay-first · 워터마크 폐지 후 안내.",
  },
  {
    intent: "download_fail",
    confidence: "high",
    keywords: ["다운로드 안돼", "다운이 안", "저장 안", "파일 없어", "버튼 안", "어디 저장", "못 찾"],
    refundHint: "maybe",
    actions: ["auto_reply", "escalate_human"],
    reply:
      "다른 브라우저·시크릿 모드에서 다시 시도해 보시고, 만들기에서 「이메일로 받기」로 메일함에 PNG를 받아 보세요. 주문번호를 남겨 주시면 확인합니다. 결제 후 다운로드·이메일 전 오류가 확인되면 재시도 또는 환불을 도와드립니다. 인화: /print",
    agentNote: "기기/브라우저 이슈 흔함. 이메일 전달 유도 · 재발급 또는 환불.",
  },
  {
    intent: "kiosk_how",
    confidence: "high",
    keywords: [
      "키오스크",
      "인화",
      "편의점",
      "뽑",
      "4x6",
      "4×6",
      "레이아웃",
      "인쇄",
      "프린팅박스",
      "포토박스",
      "사진인화",
      "인화안내",
      "프박",
    ],
    refundHint: "n/a",
    actions: ["auto_reply"],
    reply:
      "실물 배송은 없습니다. 인화용 레이아웃 PNG를 받은 뒤 프린팅박스에서 용지 4×6으로 출력하세요. 위치: https://printingbox.kr/store · 쿠폰·이벤트: https://printingbox.kr/ · 안내: /print . 폰에서 파일을 못 찾으면 만들기 「이메일로 받기」. 인화비·기기 품질은 매장·프린팅박스 영역입니다.",
    agentNote: "배송·지정 키오스크 약속 금지. 프린팅박스·/print·이메일 유도.",
  },
  {
    intent: "payment_fail",
    confidence: "high",
    keywords: ["결제 실패", "결제 안", "카드 거절", "결제오류", "샌드박스"],
    refundHint: "n/a",
    actions: ["auto_reply", "escalate_human"],
    reply:
      "결제 오류 메시지와 시각을 알려 주세요. 현재는 샌드박스 결제가 포함되어 있을 수 있어요. 금액이 출금만 되고 주문이 없다면 주문번호/승인번호를 주시면 확인합니다.",
    agentNote: "실 PG 전: 샌드박스 안내. 출금만 있으면 긴급.",
  },
  {
    intent: "delete_data",
    confidence: "high",
    keywords: ["삭제", "개인정보", "지워", "저장했냐", "유출"],
    refundHint: "n/a",
    actions: ["auto_reply", "link_legal"],
    reply:
      "원본·결과 이미지를 서버에 상시 저장하지 않는 것이 원칙입니다. 주문·다운로드 시각 등 결제 분쟁용 메타는 남을 수 있어요. 상세: /legal/privacy",
    agentNote: "정책 고지. 삭제 요청 시 주문 메타만 검토.",
  },
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function triageCsMessage(message: string): TriageResult {
  const t = normalize(message);
  if (!t) {
    return withNotifyFlag({
      intent: "unknown",
      confidence: "low",
      reply: "문의 내용을 조금만 더 적어 주세요. 주문번호(ord_…)가 있으면 함께 부탁드립니다.",
      agentNote: "빈 메시지",
      actions: ["auto_reply"],
      refundHint: "n/a",
      links: [{ label: "도움말", href: LEGAL.help }],
    });
  }

  for (const rule of RULES) {
    if (rule.keywords.some((k) => t.includes(k.toLowerCase()))) {
      return withNotifyFlag({
        intent: rule.intent,
        confidence: rule.confidence,
        reply: rule.reply,
        agentNote: rule.agentNote,
        actions: rule.actions,
        refundHint: rule.refundHint,
        links: buildLinks(rule.actions),
      });
    }
  }

  return withNotifyFlag({
    intent: "general",
    confidence: "low",
    reply:
      "문의해 주셔서 감사합니다. 주문번호와 함께 상황을 적어 주시면 확인하겠습니다. 자주 묻는 내용: 환불(/legal/refund), 인화(키오스크 자가), 워터마크(다운로드 시 제거).",
    agentNote: "미분류 → FAQ 유도. 반복 시 사람.",
    actions: ["auto_reply", "link_legal"],
    refundHint: "n/a",
    links: [
      { label: "환불 정책", href: LEGAL.refund },
      { label: "도움말", href: LEGAL.help },
    ],
  });
}

function buildLinks(actions: CsAction[]): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];
  if (actions.includes("link_legal") || actions.includes("offer_regen")) {
    links.push({ label: "환불·청약철회", href: LEGAL.refund });
  }
  links.push({ label: "도움말", href: LEGAL.help });
  return links;
}

/** 주문 상태를 붙인 최종 환불 판정 */
export function resolveRefundWithOrder(
  triage: TriageResult,
  order: {
    paid: boolean;
    downloadedAt: number | null;
    redoUsed: number;
    asvUsed: number;
  } | null
): TriageResult {
  if (!order) return triage;

  const orderTag = `paid=${order.paid} downloaded=${!!order.downloadedAt} redo=${order.redoUsed} asv=${order.asvUsed}`;

  if (triage.refundHint === "deny" || triage.intent === "gov_id_rejected") {
    return withNotifyFlag({
      ...triage,
      agentNote: `${triage.agentNote} | order: ${orderTag}`,
    });
  }

  if (order.downloadedAt && (triage.intent === "refund_before_download" || triage.intent.includes("refund"))) {
    return withNotifyFlag({
      ...triage,
      intent: "refund_after_download",
      confidence: "high",
      refundHint: "deny",
      actions: ["auto_reply", "link_legal"],
      reply:
        "주문 기록상 이미 클린 PNG 다운로드(제공 개시)가 확인되어 환불이 불가합니다. → /legal/refund",
      agentNote: `자동 정정: downloadedAt → 환불 거절. ${orderTag}`,
      links: [
        { label: "환불 정책", href: LEGAL.refund },
        { label: "도움말", href: LEGAL.help },
      ],
    });
  }

  if (!order.downloadedAt && order.paid && triage.refundHint === "maybe") {
    return withNotifyFlag({
      ...triage,
      refundHint: "maybe",
      actions: ["offer_regen", "auto_reply", "escalate_human"],
      reply:
        triage.reply ||
        "미다운로드는 자동 환불이 아닙니다. 「이 컷 받기」·다시 만들기를 먼저 이용해 주세요. (/make?resume=1) 오류로 제공이 불가할 때만 사유를 남겨 주시면 운영자 승인 후 환불합니다.",
      agentNote: `${triage.agentNote} | 미다운로드·결제됨 → 받기 유도 · 자동환불 ✗ · 승인제`,
    });
  }

  if (triage.actions.includes("offer_regen")) {
    if (triage.intent === "quality_likeness" || triage.intent === "regen_request") {
      return withNotifyFlag({
        ...triage,
        agentNote: `${triage.agentNote} | ${orderTag} · 카톡 A/S 경로`,
      });
    }
    if (order.redoUsed < 1) {
      return withNotifyFlag({
        ...triage,
        reply:
          "환불 대신 만들기 화면에서 「마음에 안 들어요 · 다시 만들어 볼게요」를 눌러 주세요. (다운로드 전)",
        agentNote: `${triage.agentNote} | redo 가능`,
      });
    }
    if (order.asvUsed < 1) {
      return withNotifyFlag({
        ...triage,
        reply:
          "재생성은 이미 쓰셨네요. 「A/S 서비스로 한 번 더」를 이용해 주세요. (다운로드 전)",
        agentNote: `${triage.agentNote} | asv 가능`,
      });
    }
    return withNotifyFlag({
      ...triage,
      reply:
        triage.reply +
        " 재생성·A/S를 모두 사용하셨습니다. 남은 컷을 받아 가 주세요. 추가 환불은 어렵습니다.",
      agentNote: `${triage.agentNote} | redo+asv 소진`,
      actions: triage.actions.filter((a) => a !== "offer_regen").concat("auto_reply"),
    });
  }

  return withNotifyFlag({
    ...triage,
    agentNote: `${triage.agentNote} | order: ${orderTag}`,
  });
}

export const CS_FAQ = [
  {
    q: "첫 컷이 안 열려요 / 결제",
    a: "무료 미리보기는 없습니다. 팩을 고르고 결제한 뒤 「4. 첫 컷 보기」가 활성화됩니다. 결제 후 만든 컷은 워터마크 없이 확인하고, PNG는 「이 컷 받기」로 저장합니다.",
  },
  {
    q: "결제는 했는데 화면에 워터마크가 있어요",
    a: "지금은 결제 후 첫 컷에 워터마크를 넣지 않습니다. 「이 컷 받기」로 PNG를 저장해 주세요. 미다운로드는 자동 환불이 아닙니다.",
  },
  {
    q: "다운로드 안 하면 자동 환불인가요?",
    a: "아니요. 자동 환불되지 않습니다. 먼저 「이 컷 받기」·다시 만들기·A/S를 이용해 주세요. 환불은 사유 제출 후 운영자 승인 시에만 됩니다.",
  },
  {
    q: "환불해 주세요",
    a: "품질 불만은 환불보다 「이 컷 받기」·「다시 만들기」·「A/S」를 먼저 이용해 주세요. 다운로드 후에는 환불이 불가합니다. 오류·중복결제만 사유를 남기시면 운영자가 검토·승인 후 환불합니다.",
  },
  {
    q: "안 닮아요 / 마음에 안 들어요",
    a: "A/S로 한 번 더 다시 만들어 드립니다. 아쉬운 결과 사진(또는 더 밝은 셀카)을 카톡으로 보내 주시면 확인 후 카톡으로 보내 드려요. /help#shoot-tips",
  },
  {
    q: "어떻게 찍어야 잘 나오나요?",
    a: "밝게·정면·얼굴 크게·필터 OFF. 다시 뽑을 때는 같은 장 반복보다 다른 밝은 셀카가 유리합니다. 상세는 도움말 「잘 나오는 팁」.",
  },
  {
    q: "여권·관공서에 제출해도 되나요?",
    a: "아니요. 보장하지 않으며 반려 시 환불 사유가 되지 않습니다.",
  },
  {
    q: "인화본 배송해 주세요",
    a: "배송하지 않습니다. 레이아웃 PNG를 키오스크·사진관에서 직접 출력하세요.",
  },
] as const;
