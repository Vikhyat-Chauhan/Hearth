// Inline form error. Render with an `id` and wire the related input's
// `aria-describedby` to it so assistive tech announces the message.
export default function FieldError({ id, children }: { id?: string; children?: string | null }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="flex items-center gap-1 text-sm text-danger">
      <span aria-hidden="true">⚠</span>
      {children}
    </p>
  );
}
