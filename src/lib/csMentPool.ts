/**
 * 단정샷 CS 멘트풀 — 상황 연구 기반 다변 대응.
 * 정본 SOP: docs/CS_CHANNEL.md · 연구 노트: docs/CS_MENT_RESEARCH.md
 * CS 1단계 = 상대 톤 맞춤 1·2차 → 카톡 사진 → 반영 생성 → 단정 마무리 (잠금)
 */
import type { CsIntent } from "./csTriage";

export type MentLane =
  | "quality_as_1st"
  | "quality_as_2nd"
  | "refund_deny"
  | "refund_maybe"
  | "gov_id"
  | "watermark"
  | "kiosk"
  | "payment"
  | "download"
  | "delete_data"
  | "abuse"
  | "general";

export type MentTone = "empathy" | "policy" | "guide" | "short" | "escalate" | "close";

export type MentItem = {
  id: string;
  lane: MentLane;
  intents: CsIntent[];
  label: string;
  body: string;
  /** 언제 이 멘트를 고를지 (운영자 선별 힌트) */
  when: string;
  tone: MentTone;
  preferred?: boolean;
};

/**
 * CS 대응 1단계 (잠금) — 어떤 CS든 기본 골격.
 * 상대 톤에 맞춰 1·2차 → 불만 사진 카톡 요청 → 요구 반영 생성 → 카톡 붙여넣기 → 단정·신뢰 마무리
 */
export const CS_STAGE1_LOCKED = {
  since: "2026-08-07",
  label: "CS 대응 1단계",
  steps: [
    "문의 triage → 상대 톤에 맞는 1차 멘트 선별 → 카톡",
    "불만족 사진(또는 새 셀카)을 카톡에 올려 달라고 요청",
    "요구·톤 반영해 옆창 Gemini로 재생성",
    "결과 PNG + 2차 멘트(단정·신뢰 마무리) 카톡 붙여넣기",
  ],
  noAutoKakao: true,
  noSolapi: true,
  noTelegramForQuality: true,
} as const;

/** @deprecated 이름 호환 — CS_STAGE1_LOCKED 사용 */
export const QUALITY_AS_FLOW_LOCKED = CS_STAGE1_LOCKED;

export const CS_MENT_POOL: MentItem[] = [
  // ══════════ CS 1단계 · 1차 (상대 톤 맞춤 + 카톡 사진 요청) ══════════
  {
    id: "qa1_standard",
    lane: "quality_as_1st",
    intents: ["quality_likeness", "regen_request"],
    label: "1차·표준 (톤 맞춤·사진 요청)",
    preferred: true,
    tone: "empathy",
    when: "기본 1차 · 사진 아직 없음 · 상대가 담담~아쉬움",
    body: `말씀 주셔서 감사합니다. 기대에 못 미친 점 죄송합니다. 환불보다 A/S로 한 번 더 맞춰 드리겠습니다.

마음에 들지 않은 결과 사진(또는 더 밝은 정면 셀카)을 이 카톡에 올려 주세요.
원하시는 점(더 닮게 / 더 밝게 / 더 자연스럽게 등)을 한 줄로 적어 주시면 그대로 반영해 다시 만들어 보내 드립니다.

촬영 팁: /help#shoot-tips · 환불 안내: /legal/refund`,
  },
  {
    id: "qa1_tone_hot",
    lane: "quality_as_1st",
    intents: ["quality_likeness", "regen_request"],
    label: "1차·화남 톤 맞춤",
    tone: "empathy",
    when: "상대가 짧고 강하게 불만 · 공감 먼저 · 즉시 사진 요청",
    body: `불편을 드린 점 진심으로 사과드립니다. 바로 A/S로 맞춰 보겠습니다.

불만족하신 사진을 이 카톡에 올려 주시고, 고치고 싶은 점을 짧게만 적어 주세요.
확인 후 반영해 다시 만들어 카톡으로 보내 드리겠습니다.`,
  },
  {
    id: "qa1_short",
    lane: "quality_as_1st",
    intents: ["quality_likeness", "regen_request"],
    label: "1차·짧게 (사진 이미 옴)",
    tone: "short",
    when: "불만글과 결과 사진을 같이 보낸 경우 · 장문 생략",
    body: `확인했습니다. A/S로 한 번 더 맞춰 드리겠습니다.
보내 주신 사진과 요청을 반영해 다시 만들어 이 카톡으로 보내 드리겠습니다.`,
  },
  {
    id: "qa1_likeness",
    lane: "quality_as_1st",
    intents: ["quality_likeness"],
    label: "1차·안 닮음 특화",
    tone: "guide",
    when: "「안 닮았다」가 핵심 · 셀카 재촬영 유도",
    body: `안 닮게 느껴지셨군요. 바로 A/S로 다시 맞춰 보겠습니다.

불만족 컷과, 가능하면 더 밝은 정면·얼굴 크게·필터 OFF 셀카를 이 카톡에 올려 주세요.
같은 장만 반복하기보다 다른 밝은 셀카가 결과가 좋아지는 경우가 많습니다.
팁: /help#shoot-tips`,
  },
  {
    id: "qa1_mood",
    lane: "quality_as_1st",
    intents: ["quality_likeness"],
    label: "1차·분위기·과보정",
    tone: "guide",
    when: "「분위기 꽝·과보정·어색」 · 톤·보정 방향 요청",
    body: `분위기·보정이 아쉬우셨군요. A/S로 다시 맞춰 드리겠습니다.

불만족 사진을 이 카톡에 올려 주시고, 원하시는 방향을 한 줄로 알려 주세요. (예: 더 자연스럽게 / 더 밝게 / 배경 단색)
반영해 다시 만들어 보내 드립니다.`,
  },
  {
    id: "qa1_after_dl_soft",
    lane: "quality_as_1st",
    intents: ["quality_likeness", "refund_after_download"],
    label: "1차·다운 후이나 A/S 시도",
    tone: "empathy",
    when: "다운로드 후 품질불만 · 환불 ✗이나 운영 A/S로 완화",
    body: `다운로드 후에는 환불이 어렵습니다. 다만 품질이 많이 아쉬우시면, 불만족 사진을 이 카톡에 올려 주세요. 가능한 범위에서 A/S로 한 번 더 맞춰 드리겠습니다.
팁: /help#shoot-tips · 정책: /legal/refund`,
  },

  // ══════════ CS 1단계 · 2차 (PNG + 단정·신뢰 마무리) ══════════
  {
    id: "qa2_caption",
    lane: "quality_as_2nd",
    intents: ["quality_likeness", "regen_request"],
    label: "2차·캡션 (이미지창 ≤50자)",
    tone: "short",
    when: "카톡 「클립보드 이미지 전송」설명란",
    body: "요청 반영한 A/S 컷입니다. 확인해 주세요.",
  },
  {
    id: "qa2_full",
    lane: "quality_as_2nd",
    intents: ["quality_likeness", "regen_request"],
    label: "2차·단정 마무리 (추천)",
    preferred: true,
    tone: "close",
    when: "PNG 붙여넣은 뒤 본문 · 기본 마무리 (단정·신뢰)",
    body: `요청하신 내용을 반영해 다시 만들어 보내 드립니다.

보내 드린 컷을 확인해 주세요. 추가로 조율이 필요하시면 말씀해 주시면 됩니다.
이용해 주셔서 감사합니다. — 단정샷`,
  },
  {
    id: "qa2_soft",
    lane: "quality_as_2nd",
    intents: ["quality_likeness", "regen_request"],
    label: "2차·짧게 신뢰",
    tone: "close",
    when: "상대 톤이 짧음 · 군더더기 없는 마무리",
    body: `요청 반영한 컷입니다. 확인해 주세요.
추가로 필요하시면 말씀해 주세요. — 단정샷`,
  },
  {
    id: "qa2_ask_feedback",
    lane: "quality_as_2nd",
    intents: ["quality_likeness", "regen_request"],
    label: "2차·피드백 한 줄",
    tone: "guide",
    when: "방향이 애매할 때 · 한 줄만 받기",
    body: `반영한 A/S 컷을 보내 드립니다. 확인해 주세요.
닮음·밝기·배경 중 어디를 더 맞추면 좋을지 한 줄만 알려 주시면 참고하겠습니다. — 단정샷`,
  },
  {
    id: "qa2_close",
    lane: "quality_as_2nd",
    intents: ["quality_likeness", "regen_request"],
    label: "2차·종결 (추가 A/S 어려움)",
    tone: "close",
    when: "A/S 소진·추가 불가 · 단정 종결",
    body: `이번 컷까지 요청을 반영해 드렸습니다. 추가 재생성은 어렵고, 받으신 컷을 이용해 주시면 감사하겠습니다.
인화: /print · 도움말: /help — 단정샷`,
  },

  // ══════════ 환불 거절 (다운로드 후 · 생성성공·캡처) ══════════
  {
    id: "rf_after_dl",
    lane: "refund_deny",
    intents: ["refund_after_download"],
    label: "생성성공 후·표준 거절",
    preferred: true,
    tone: "policy",
    when: "생성·받기 후 품질/변심 환불 · 기본",
    body: `컷 생성이 성공한 뒤에는 제공이 시작된 것으로 안내드리고 있어, 단순 환불은 어렵습니다. 품질이 아쉬우셨다면 받기 전 다시 만들기·A/S를 이용해 주세요.
촬영 팁: /help#shoot-tips · 정책: /legal/refund`,
  },
  {
    id: "rf_after_empathy",
    lane: "refund_deny",
    intents: ["refund_after_download"],
    label: "생성성공 후·공감",
    tone: "empathy",
    when: "감정 톤 강함 · 공감 후 정책",
    body: `기대에 못 미쳐 불편을 드린 점 죄송합니다. 다만 생성이 완료된 뒤에는 제공이 시작된 것으로 보아 단순 환불은 어렵습니다.
다음에 이용하실 때는 받기 전 「다시 만들기」·「A/S」를 먼저 써 주세요. 정책: /legal/refund`,
  },
  {
    id: "rf_after_offer_as",
    lane: "refund_deny",
    intents: ["refund_after_download", "quality_likeness"],
    label: "환불✗ + 운영 A/S 제안",
    tone: "guide",
    when: "환불은 안 되지만 카톡 A/S로 관계 회복 가능 시",
    body: `환불은 시스템 문제로 파일을 받지 못한 경우에만 검토합니다. 품질이 아쉬우시면 결과 사진을 카톡으로 보내 주세요. 가능한 범위에서 A/S 컷을 한 번 더 맞춰 드리겠습니다.
정책: /legal/refund`,
  },
  {
    id: "rf_capture_not_undelivered",
    lane: "refund_deny",
    intents: ["refund_after_download", "refund_before_download"],
    label: "캡처·화면확인 ≠ 미전달",
    tone: "policy",
    when: "캡처·스크린샷·「안 받았」주장이나 화면/생성은 된 경우",
    body: `화면에 컷이 보이셨거나 저장·캡처가 가능한 상태는 「시스템 결함으로 파일을 못 받은 경우」에 해당하지 않습니다. 환불은 그 경우에만 검토하며, 품질은 받기 전 다시 만들기·A/S로 안내드립니다.
정책: /legal/refund`,
  },

  // ══════════ 환불 maybe / 중복 / 미전달 ══════════
  {
    id: "rf_before",
    lane: "refund_maybe",
    intents: ["refund_before_download"],
    label: "받기 전·자동환불 ✗",
    preferred: true,
    tone: "guide",
    when: "「안 받았는데 환불」·받기 미클릭 (생성은 된 경우)",
    body: `「이 컷 받기」를 누르지 않으셨다고 자동 환불되지는 않아요. 생성이 된 컷은 먼저 받아 보시고, 아쉬우면 다시 만들기·A/S를 이용해 주세요.
시스템 오류로 생성이 안 되거나 전달이 반복 실패한 경우만 주문번호·사유를 남겨 주시면 검토합니다. 팁: /help#shoot-tips`,
  },
  {
    id: "rf_system_undelivered",
    lane: "refund_maybe",
    intents: ["refund_before_download", "download_fail"],
    label: "시스템 미전달·검토",
    tone: "escalate",
    when: "생성 실패·받기/이메일 반복 실패 등 결함 의심",
    body: `시스템 문제로 컷이 생성되지 않았거나 파일을 받지 못하신 것으로 보입니다. 주문번호와 증상(화면 메시지·시각)을 남겨 주세요. 확인 후 재시도 또는 환불을 검토하겠습니다.
정책: /legal/refund`,
  },
  {
    id: "rf_before_resume",
    lane: "refund_maybe",
    intents: ["refund_before_download"],
    label: "미다운·만들기 재개 유도",
    tone: "guide",
    when: "화면을 못 찾는 고객 · /make?resume=1",
    body: `결제하신 주문은 /make?resume=1 에서 이어가실 수 있어요. 「이 컷 받기」로 PNG를 먼저 받아 보시고, 마음에 안 들면 다시 만들기·A/S를 이용해 주세요. 자동 환불은 없습니다.`,
  },
  {
    id: "rf_dup",
    lane: "refund_maybe",
    intents: ["duplicate_charge"],
    label: "중복결제·자료 요청",
    preferred: true,
    tone: "escalate",
    when: "중복·이중결제 의심 · TG 보고와 병행",
    body: `중복 결제가 의심되면 주문번호(ord_…)와 결제 시각·금액을 보내 주세요. 확인되는 즉시 환불 처리합니다.`,
  },
  {
    id: "rf_dup_calm",
    lane: "refund_maybe",
    intents: ["duplicate_charge"],
    label: "중복결제·안심 멘트",
    tone: "empathy",
    when: "고객이 불안·화남 · 먼저 안심",
    body: `걱정되셨을 것 같습니다. 중복 결제분은 확인되면 바로 돌려드립니다. 주문번호·결제 문자(시각·금액)를 보내 주세요.`,
  },

  // ══════════ 관공서 ══════════
  {
    id: "gov",
    lane: "gov_id",
    intents: ["gov_id_rejected"],
    label: "관공서·표준 거절",
    preferred: true,
    tone: "policy",
    when: "여권·신분증·관공서 반려로 환불 요구",
    body: `단정샷은 관공서·여권·신분증 제출용을 보장하지 않습니다. 반려를 이유로 한 환불은 어렵습니다. 이력서·링크드인 등 민간용으로만 이용해 주세요. → /legal/refund`,
  },
  {
    id: "gov_empathy",
    lane: "gov_id",
    intents: ["gov_id_rejected"],
    label: "관공서·공감+거절",
    tone: "empathy",
    when: "이미 제출했다가 반려 · 감정 케어 후 정책",
    body: `반려 소식을 들으셨다니 속상하셨을 것 같습니다. 다만 단정샷은 관공서·여권용을 보장하지 않으며, 반려만으로는 환불이 어렵습니다. 이력서·프로필 등 민간 용도로 이용해 주세요. 정책: /legal/refund`,
  },
  {
    id: "gov_alt",
    lane: "gov_id",
    intents: ["gov_id_rejected"],
    label: "관공서·대안 안내",
    tone: "guide",
    when: "대안을 물어봄 · 사진관·공식 규격 안내",
    body: `관공서·여권은 지정 규격·촬영소 이용을 권합니다. 단정샷은 민간(이력서·링크드인 등)용입니다. 반려 사유로 환불은 어렵습니다. /legal/refund`,
  },

  // ══════════ 워터마크 ══════════
  {
    id: "wm",
    lane: "watermark",
    intents: ["watermark_confusion"],
    label: "워터마크·표준",
    preferred: true,
    tone: "guide",
    when: "미리보기 글자·워터마크 문의",
    body: `지금은 결제 후 첫 컷에 워터마크를 넣지 않습니다. 화면에 글자가 보이면 새로고침 후 「이 컷 받기」로 PNG를 저장해 주세요.`,
  },
  {
    id: "wm_cache",
    lane: "watermark",
    intents: ["watermark_confusion"],
    label: "워터마크·캐시/구버전",
    tone: "guide",
    when: "예전 화면·캐시 의심",
    body: `예전 미리보기 화면을 보고 계실 수 있어요. 브라우저 새로고침 또는 다른 브라우저에서 「이 컷 받기」로 PNG를 받아 보시면 워터마크 없는 파일입니다.`,
  },

  // ══════════ 인화 ══════════
  {
    id: "kiosk",
    lane: "kiosk",
    intents: ["kiosk_how"],
    label: "인화·표준",
    preferred: true,
    tone: "guide",
    when: "배송·인화·키오스크 문의",
    body: `실물 배송은 없습니다. 인화용 레이아웃 PNG를 받은 뒤 프린팅박스에서 용지 4×6으로 출력하세요.
위치: https://printingbox.kr/store · 안내: /print`,
  },
  {
    id: "kiosk_phone",
    lane: "kiosk",
    intents: ["kiosk_how"],
    label: "인화·폰에서 파일 못 찾음",
    tone: "guide",
    when: "파일 위치 모름 · 이메일 받기 유도",
    body: `폰에서 파일을 못 찾으시면 만들기에서 「이메일로 받기」로 PNG를 메일함에 받아 보세요. 그다음 프린팅박스에서 4×6으로 출력하시면 됩니다. /print`,
  },
  {
    id: "kiosk_no_ship",
    lane: "kiosk",
    intents: ["kiosk_how"],
    label: "인화·배송 요청 거절",
    tone: "policy",
    when: "택배·퀵 배송 요청",
    body: `인화본 배송은 하지 않습니다. 레이아웃 PNG를 키오스크·사진관에서 직접 출력해 주세요. /print`,
  },

  // ══════════ 결제 ══════════
  {
    id: "pay",
    lane: "payment",
    intents: ["payment_fail"],
    label: "결제오류·자료 요청",
    preferred: true,
    tone: "escalate",
    when: "결제 실패·거절 메시지",
    body: `결제 오류 메시지와 시각을 알려 주세요. 금액이 출금만 되고 주문이 없다면 주문번호/승인번호를 주시면 확인합니다.`,
  },
  {
    id: "pay_retry",
    lane: "payment",
    intents: ["payment_fail"],
    label: "결제오류·재시도 안내",
    tone: "guide",
    when: "일시 오류·카드 거절 · 재시도 유도",
    body: `다른 카드·결제 수단으로 다시 시도해 보시고, 같은 오류가 나면 오류 문구·시각을 보내 주세요. 출금만 된 경우 승인번호도 함께 부탁드립니다.`,
  },

  // ══════════ 다운로드 ══════════
  {
    id: "dl",
    lane: "download",
    intents: ["download_fail"],
    label: "다운실패·표준",
    preferred: true,
    tone: "guide",
    when: "저장·버튼·파일 없음",
    body: `다른 브라우저·시크릿 모드에서 다시 시도해 보시고, 만들기에서 「이메일로 받기」로 메일함에 PNG를 받아 보세요. 주문번호를 남겨 주시면 확인합니다.`,
  },
  {
    id: "dl_email",
    lane: "download",
    intents: ["download_fail"],
    label: "다운실패·이메일 우선",
    tone: "short",
    when: "모바일·사파리 이슈 흔함",
    body: `모바일에서는 「이메일로 받기」가 더 안정적입니다. 메일함(스팸함 포함)을 확인해 보시고, 안 오면 주문번호를 알려 주세요.`,
  },
  {
    id: "dl_escalate",
    lane: "download",
    intents: ["download_fail"],
    label: "다운실패·제공 불가 시",
    tone: "escalate",
    when: "재시도·이메일 모두 실패 · 환불 검토 가능",
    body: `여러 번 시도해도 받으실 수 없다면 주문번호와 기기·브라우저를 알려 주세요. 제공이 안 된 것으로 확인되면 재시도 또는 환불을 도와드립니다.`,
  },

  // ══════════ 개인정보 ══════════
  {
    id: "del",
    lane: "delete_data",
    intents: ["delete_data"],
    label: "개인정보·표준",
    preferred: true,
    tone: "policy",
    when: "삭제·유출·저장 문의",
    body: `원본·결과 이미지를 서버에 상시 저장하지 않는 것이 원칙입니다. 주문·다운로드 시각 등 결제 분쟁용 메타는 남을 수 있어요. 상세: /legal/privacy`,
  },
  {
    id: "del_request",
    lane: "delete_data",
    intents: ["delete_data"],
    label: "개인정보·삭제 요청 접수",
    tone: "escalate",
    when: "명시적 삭제 요청",
    body: `삭제 요청 접수했습니다. 주문번호를 알려 주시면 보관 중인 메타·관련 기록을 검토한 뒤 안내드리겠습니다. 정책: /legal/privacy`,
  },

  // ══════════ 위협·분쟁 ══════════
  {
    id: "abuse",
    lane: "abuse",
    intents: ["abuse_threat"],
    label: "위협·사실만",
    preferred: true,
    tone: "escalate",
    when: "고소·공정위·변호사 톤 · 감정 대응 ✗ · TG 보고",
    body: `불편을 드려 죄송합니다. 주문번호와 상황을 남겨 주시면 운영자가 확인 후 연락드리겠습니다. 환불은 시스템 결함으로 파일을 받지 못한 경우에만 검토하며, 품질은 A/S로 안내합니다. 정책: /legal/refund`,
  },
  {
    id: "abuse_min",
    lane: "abuse",
    intents: ["abuse_threat"],
    label: "위협·최소 응답",
    tone: "short",
    when: "욕설·협박 반복 · 짧게만",
    body: `주문번호와 사실관계(결제·생성·전달 여부)를 남겨 주시면 정책에 따라 확인하겠습니다. /legal/refund`,
  },

  // ══════════ 일반 ══════════
  {
    id: "gen",
    lane: "general",
    intents: ["general", "unknown"],
    label: "일반·자료 요청",
    preferred: true,
    tone: "guide",
    when: "분류 애매 · 주문번호·상황 요청",
    body: `문의해 주셔서 감사합니다. 주문번호와 함께 상황을 적어 주시면 확인하겠습니다.
자주 묻는 내용: 환불(/legal/refund), 인화(/print), 도움말(/help)`,
  },
  {
    id: "gen_faq",
    lane: "general",
    intents: ["general", "unknown"],
    label: "일반·FAQ 링크만",
    tone: "short",
    when: "짧은 질문 · 링크만으로 충분",
    body: `도움말(/help) · 환불(/legal/refund) · 인화(/print)를 먼저 확인해 보시고, 해결이 안 되면 주문번호와 함께 다시 보내 주세요.`,
  },
  {
    id: "gen_thanks",
    lane: "general",
    intents: ["general"],
    label: "일반·감사·종결",
    tone: "close",
    when: "해결 후 감사 인사 · 종결",
    body: `확인해 주셔서 감사합니다. 추가로 필요하시면 언제든 문의해 주세요. /help`,
  },
];

const INTENT_LANE: Partial<Record<CsIntent, MentLane>> = {
  quality_likeness: "quality_as_1st",
  regen_request: "quality_as_1st",
  refund_after_download: "refund_deny",
  refund_before_download: "refund_maybe",
  duplicate_charge: "refund_maybe",
  gov_id_rejected: "gov_id",
  watermark_confusion: "watermark",
  kiosk_how: "kiosk",
  payment_fail: "payment",
  download_fail: "download",
  delete_data: "delete_data",
  abuse_threat: "abuse",
  general: "general",
  unknown: "general",
};

/** triage intent → 해당 lane 후보만 (2차는 qualityAsSecondPool) */
export function selectMentPool(intent: CsIntent): MentItem[] {
  const lane = INTENT_LANE[intent] ?? "general";
  return CS_MENT_POOL.filter((m) => m.lane === lane).sort(
    (a, b) => Number(!!b.preferred) - Number(!!a.preferred)
  );
}

export function getMentById(id: string): MentItem | undefined {
  return CS_MENT_POOL.find((m) => m.id === id);
}

export function qualityAsSecondPool(): MentItem[] {
  return CS_MENT_POOL.filter((m) => m.lane === "quality_as_2nd");
}

/** lane별 개수 (연구·점검용) */
export function mentPoolStats(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of CS_MENT_POOL) {
    out[m.lane] = (out[m.lane] || 0) + 1;
  }
  out._total = CS_MENT_POOL.length;
  return out;
}
