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
};

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
  make: "/make",
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
    keywords: ["아직 다운", "다운로드 안", "안 받았", "결제만"],
    refundHint: "maybe",
    actions: ["offer_regen", "auto_reply"],
    reply:
      "환불보다 먼저 「다시 만들기」또는 「A/S 서비스」를 권합니다. 다른 밝은 셀카로 올려 다시 뽑으면 만족도가 높아지는 경우가 많아요. 만들기 화면에서 바로 가능합니다. 시스템 오류로 아예 못 받으신 경우만 주문번호로 환불을 검토합니다. 팁: /help#shoot-tips",
    agentNote: "변심·품질 환불 → A/S 우선. 오류만 환불.",
  },
  {
    intent: "quality_likeness",
    confidence: "high",
    keywords: ["안 닮", "닮지", "이상해", "못생겼", "별로", "마음에 안", "과보정", "어색"],
    refundHint: "deny",
    actions: ["offer_regen", "auto_reply"],
    reply:
      "환불 대신 A/S로 도와드릴게요. 결제 후 「마음에 안 들어요 → 다시 만들기」→ 필요하면 「A/S 서비스」, 가능하면 더 밝은 정면 셀카로 바꿔 올려 주세요. 잘 나오는 법: /help#shoot-tips",
    agentNote: "환불 ✗ · A/S + 촬영 팁.",
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
      "화면에는 다운로드 직전까지 워터마크가 남아 있어요. 「PNG 다운로드」를 누르시면 워터마크 없는 파일이 저장됩니다. 결제만으로는 화면 워터마크가 바로 사라지지 않습니다.",
    agentNote: "정상 동작 설명. 버그 아님.",
  },
  {
    intent: "download_fail",
    confidence: "high",
    keywords: ["다운로드 안돼", "다운이 안", "저장 안", "파일 없어", "버튼 안"],
    refundHint: "maybe",
    actions: ["auto_reply", "escalate_human"],
    reply:
      "다른 브라우저·시크릿 모드에서 다시 시도해 보시고, 주문번호를 남겨 주세요. 결제 후 다운로드 전 오류가 확인되면 재시도 또는 환불을 도와드립니다.",
    agentNote: "기기/브라우저 이슈 흔함. 재발급 링크(추후) 또는 환불.",
  },
  {
    intent: "kiosk_how",
    confidence: "high",
    keywords: ["키오스크", "인화", "편의점", "뽑", "4x6", "4×6", "레이아웃", "인쇄"],
    refundHint: "n/a",
    actions: ["auto_reply"],
    reply:
      "실물 배송은 없습니다. 인화용 레이아웃 PNG를 받은 뒤 편의점·마트·사진관 「포토/사진 인쇄」에서 용지 4×6으로 출력하세요. 인화비는 매장 부담이며, 기기 품질 문제는 매장 문의입니다. 만들기 화면 하단 안내를 참고해 주세요.",
    agentNote: "배송·지정 키오스크 약속 금지.",
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
    return {
      intent: "unknown",
      confidence: "low",
      reply: "문의 내용을 조금만 더 적어 주세요. 주문번호(ord_…)가 있으면 함께 부탁드립니다.",
      agentNote: "빈 메시지",
      actions: ["auto_reply"],
      refundHint: "n/a",
      links: [{ label: "도움말", href: LEGAL.help }],
    };
  }

  for (const rule of RULES) {
    if (rule.keywords.some((k) => t.includes(k.toLowerCase()))) {
      return {
        intent: rule.intent,
        confidence: rule.confidence,
        reply: rule.reply,
        agentNote: rule.agentNote,
        actions: rule.actions,
        refundHint: rule.refundHint,
        links: buildLinks(rule.actions),
      };
    }
  }

  return {
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
  };
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
    return {
      ...triage,
      agentNote: `${triage.agentNote} | order: ${orderTag}`,
    };
  }

  if (order.downloadedAt && (triage.intent === "refund_before_download" || triage.intent.includes("refund"))) {
    return {
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
    };
  }

  if (!order.downloadedAt && order.paid && triage.refundHint === "maybe") {
    return {
      ...triage,
      refundHint: "likely",
      actions: ["check_order_refund", "escalate_human"],
      agentNote: `${triage.agentNote} | 미다운로드·결제됨 → 환불 검토 가능`,
    };
  }

  if (triage.actions.includes("offer_regen")) {
    if (order.redoUsed < 1) {
      return {
        ...triage,
        reply:
          "환불 대신 만들기 화면에서 「마음에 안 들어요 · 다시 만들어 볼게요」를 눌러 주세요. (다운로드 전)",
        agentNote: `${triage.agentNote} | redo 가능`,
      };
    }
    if (order.asvUsed < 1) {
      return {
        ...triage,
        reply:
          "재생성은 이미 쓰셨네요. 「A/S 서비스로 한 번 더」를 이용해 주세요. (다운로드 전)",
        agentNote: `${triage.agentNote} | asv 가능`,
      };
    }
    return {
      ...triage,
      reply:
        triage.reply +
        " 재생성·A/S를 모두 사용하셨습니다. 남은 컷을 받아 가 주세요. 추가 환불은 어렵습니다.",
      agentNote: `${triage.agentNote} | redo+asv 소진`,
      actions: triage.actions.filter((a) => a !== "offer_regen").concat("auto_reply"),
    };
  }

  return {
    ...triage,
    agentNote: `${triage.agentNote} | order: ${orderTag}`,
  };
}

export const CS_FAQ = [
  {
    q: "미리보기가 안 돼요 / 한도",
    a: "결제 전 미리보기는 기기당 하루 제한이 있습니다. 재접속만으로 초기화되지 않으며, 같은 사진 반복도 막힙니다. 미리보기에는 옅은 표시만 들어가고, 클린 PNG는 결제 후 다운로드에서만 받을 수 있습니다.",
  },
  {
    q: "결제는 했는데 화면에 워터마크가 있어요",
    a: "정상입니다. 다운로드 버튼을 눌러야 클린 PNG가 저장되고, 그때 환불이 불가해집니다.",
  },
  {
    q: "환불해 주세요",
    a: "품질 불만은 환불보다 「다시 만들기」·「A/S 서비스」(다른 셀카 가능)를 먼저 이용해 주세요. 다운로드 후에는 환불이 불가합니다. 중복결제·시스템 오류만 예외 검토합니다.",
  },
  {
    q: "안 닮아요 / 마음에 안 들어요",
    a: "A/S로 도와드립니다. 결제 후 다시 만들기 1회 → A/S 1회. 더 밝은 정면 셀카로 바꾸면 결과가 좋아지는 경우가 많습니다. /help#shoot-tips",
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
