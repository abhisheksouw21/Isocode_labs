export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new AppError("NOT_FOUND", `${what} not found`, 404);

/** Drizzle wraps pg errors; the constraint name lives on the cause. */
export function violatedConstraint(err: unknown): string | undefined {
  const e = err as { constraint?: string; cause?: { constraint?: string; code?: string }; code?: string };
  return e?.constraint ?? e?.cause?.constraint;
}

export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return (e?.code ?? e?.cause?.code) === "23505";
}
