export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'BAD_REQUEST', message, details);

export const unauthorized = (message = 'Unauthorized') =>
  new AppError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = 'Forbidden') => new AppError(403, 'FORBIDDEN', message);

export const notFound = (message = 'Not Found') => new AppError(404, 'NOT_FOUND', message);

export const conflict = (message = 'Conflict', details?: unknown) =>
  new AppError(409, 'CONFLICT', message, details);

export const unprocessable = (message = 'Unprocessable Entity', details?: unknown) =>
  new AppError(422, 'UNPROCESSABLE_ENTITY', message, details);

export const internal = (message = 'Internal Server Error', details?: unknown) =>
  new AppError(500, 'INTERNAL_SERVER_ERROR', message, details);
