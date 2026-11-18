export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export type ErrorDetail = { path: string; message: string };

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = STATUS[code];
  }

  static badRequest(message = 'Invalid input', details?: ErrorDetail[]) {
    return new ApiError('VALIDATION_ERROR', message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError('UNAUTHORIZED', message);
  }
  static forbidden(message = 'You do not have access to this resource') {
    return new ApiError('FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError('NOT_FOUND', message);
  }
  static conflict(message: string, details?: ErrorDetail[]) {
    return new ApiError('CONFLICT', message, details);
  }
}
