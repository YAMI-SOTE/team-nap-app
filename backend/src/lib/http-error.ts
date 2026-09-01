/**
 * Error type that carries an HTTP status. Throw it (or `next()` it) from
 * anywhere; `errorHandler` turns it into a `{ error }` response with the
 * right status. Anything else that reaches the handler is a 500.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }

  static badRequest(message = "Bad Request", details?: unknown): HttpError {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = "Unauthorized"): HttpError {
    return new HttpError(401, message);
  }

  static forbidden(message = "Forbidden"): HttpError {
    return new HttpError(403, message);
  }

  static notFound(message = "Not Found"): HttpError {
    return new HttpError(404, message);
  }

  static conflict(message = "Conflict"): HttpError {
    return new HttpError(409, message);
  }

  static badGateway(message = "Bad Gateway"): HttpError {
    return new HttpError(502, message);
  }
}
