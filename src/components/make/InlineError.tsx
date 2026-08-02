import { toUserFacingGenerateError } from "@/lib/userFacingErrors";

const GEN_SLOTS = new Set(["generate", "redo", "asv", "preview"]);

export default function InlineError({
  at,
  errorAt,
  message,
}: {
  at: string;
  errorAt: string | null;
  message: string | null;
}) {
  if (!message || errorAt !== at) return null;
  const safe = GEN_SLOTS.has(at)
    ? toUserFacingGenerateError(message, "busy")
    : message;
  return (
    <p className="mt-2 text-sm leading-relaxed text-red-700" role="alert">
      {safe}
    </p>
  );
}
