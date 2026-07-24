/** 결제 후 유저 단계 — UI는 현재 단계만 렌더 */

export type MakeFlowStep =
  | "setup"
  | "preview"
  | "checkout"
  | "paidFetch"
  | "paidSave"
  | "postSave";

export type MakeFlowInput = {
  hasPreview: boolean;
  paid: boolean;
  downloaded: boolean;
  savedOnce: boolean;
};

export function resolveMakeFlowStep(input: MakeFlowInput): MakeFlowStep {
  const { hasPreview, paid, downloaded, savedOnce } = input;
  if (!hasPreview) return "setup";
  if (!paid) return "preview";
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
