/**
 * Posts a custom control's value under `name`. A `type="hidden"` input is
 * never checked by the browser's `required` validation, so a required value
 * uses a visually hidden text input instead (its parent should be
 * `relative` so the browser's prompt shows next to the control).
 */
export function FormValueInput({
  name,
  value,
  required,
}: {
  name: string;
  value: string;
  required?: boolean;
}) {
  if (!required) return <input type="hidden" name={name} value={value} />;
  return (
    <input
      name={name}
      value={value}
      onChange={() => {}}
      required
      tabIndex={-1}
      aria-hidden
      className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
    />
  );
}
