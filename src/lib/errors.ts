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
