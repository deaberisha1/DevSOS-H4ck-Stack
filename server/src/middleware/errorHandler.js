// Every error response body matches the frontend's ApiErrorBody contract:
// { error: { code, message, fieldErrors? } }

function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.status) {
    return res.status(err.status).json({
      error: {
        code: err.code || codeForStatus(err.status),
        message: err.message,
        ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
      },
    });
  }

  res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
}

function codeForStatus(status) {
  switch (status) {
    case 400: return 'VALIDATION_ERROR';
    case 401: return 'UNAUTHENTICATED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 429: return 'RATE_LIMITED';
    default: return 'ERROR';
  }
}

/**
 * Create a typed API error. `code` is optional — defaults to a sensible
 * value derived from the status code. `fieldErrors` is only meaningful on
 * 400s (validation).
 */
function createError(status, message, opts = {}) {
  const err = new Error(message);
  err.status = status;
  err.code = opts.code || codeForStatus(status);
  if (opts.fieldErrors) err.fieldErrors = opts.fieldErrors;
  return err;
}

module.exports = { errorHandler, createError, codeForStatus };
