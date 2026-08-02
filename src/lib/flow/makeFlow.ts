/** 유저 단계 — UI는 현재 단계만 렌더
 *  pay-first: 셀카 → 팩·결제 → 첫 컷 → 받기
 */

export type MakeFlowStep =
  | "setup"
  | "checkout"
  | "paidFirst"
  | "paidFetch"
  | "paidSave"
  | "postSave";

export type MakeFlowInput = {
  hasSelfie: boolean;
  hasPreview: boolean;
  paid: boolean;
  downloaded: boolean;
  savedOnce: boolean;
};

export function resolveMakeFlowStep(input: MakeFlowInput): MakeFlowStep {
  const { hasSelfie, hasPreview, paid, downloaded, savedOnce } = input;
  if (!paid) return hasSelfie ? "checkout" : "setup";
  if (!hasPreview) return "paidFirst";
  if (!downloaded) return "paidFetch";
  if (!savedOnce) return "paidSave";
  return "postSave";
}

export function canShowLayout(input: {
  paid: boolean;
  downloaded: boolean;
  savedOnce: boolean;
}): boolean {
  return input.paid && input.downloaded && input.savedOnce;
}
