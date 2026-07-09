export function ErrorMessage({ message }: { message: string }) {
  return (
    <p
      className="rounded-xl px-4 py-3 text-[13px] text-fg"
      style={{
        background: "color-mix(in srgb, #e0603a 12%, var(--surface))",
        border: "1px solid color-mix(in srgb, #e0603a 40%, transparent)",
      }}
    >
      {message}
    </p>
  );
}
