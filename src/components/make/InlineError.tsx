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
  return (
    <p className="mt-2 text-sm leading-relaxed text-red-700" role="alert">
      {message}
    </p>
  );
}
