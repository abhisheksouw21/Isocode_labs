import { CircleAlert } from "lucide-react";

export type FieldErrors = Record<string, string | undefined>;

/** The error under one field, linked to it with aria-describedby. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold text-alert">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  );
}

/** Props that wire a control to its error and hint. */
export function fieldProps(name: string, errors: FieldErrors, hintId?: string) {
  const errorId = `${name}-error`;
  const describedBy = [errors[name] ? errorId : null, hintId ?? null].filter(Boolean).join(" ") || undefined;
  return { id: name, name, "aria-invalid": errors[name] ? true : undefined, "aria-describedby": describedBy } as const;
}

type Issue = { path?: (string | number)[]; message?: string };

/** Maps the API's Zod issues back to form field names. */
export function issuesToErrors(issues: Issue[] | undefined, map: Record<string, string>): FieldErrors {
  const out: FieldErrors = {};
  for (const i of issues ?? []) {
    const key = map[String(i.path?.[0] ?? "")];
    if (key && !out[key]) out[key] = i.message;
  }
  return out;
}

/** Reads the browser's own validity for each named control, with our wording. */
export function validateForm(form: HTMLFormElement, messages: Record<string, (el: HTMLInputElement) => string | undefined>): FieldErrors {
  const out: FieldErrors = {};
  for (const [name, message] of Object.entries(messages)) {
    const el = form.elements.namedItem(name) as HTMLInputElement | null;
    if (el) out[name] = message(el);
  }
  return out;
}

export function focusFirstError(form: HTMLFormElement, errors: FieldErrors) {
  const first = Object.keys(errors).find((k) => errors[k]);
  if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus();
}
