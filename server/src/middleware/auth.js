const { query } = require('../config/database');
const { ROLES, EVENT_STATUS } = require('../shared/constants');
const { createError } = require('./errorHandler');
const { asyncHandler } = require('../shared/asyncHandler');

const SESSION_COOKIE = 'devsos_sid';

/**
 * Cookie-based session auth. The frontend sends credentials: 'include' on
 * every request; we read the signed httpOnly cookie set at join time,
 * look up the participant + their event, and attach both to req.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const sessionId = req.signedCookies && req.signedCookies[SESSION_COOKIE];
  if (!sessionId) {
    throw createError(401, 'Not signed in', { code: 'UNAUTHENTICATED' });
  }

  const [rows] = await query(
    `SELECT p.*, e.event_code, e.mentor_code, e.organizer_code, e.name AS event_name, e.status AS event_status
     FROM participants p
     JOIN events e ON e.id = p.event_id
     WHERE p.session_id = ?`,
    [sessionId]
  );

  if (rows.length === 0) {
    throw createError(401, 'Session expired', { code: 'UNAUTHENTICATED' });
  }

  req.participant = rows[0];
  req.event = {
    id: rows[0].event_id,
    event_code: rows[0].event_code,
    mentor_code: rows[0].mentor_code,
    organizer_code: rows[0].organizer_code,
    name: rows[0].event_name,
    status: rows[0].event_status,
  };
  next();
});

/**
 * CSRF check for mutating requests. join/session-creation is exempt (no
 * token exists yet); every other mutation must echo the token issued at
 * join/session-fetch time back as X-CSRF-Token.
 */
function requireCsrf(req, res, next) {
  const isMutation = req.method !== 'GET' && req.method !== 'HEAD';
  if (!isMutation) return next();

  const provided = req.headers['x-csrf-token'];
  if (!provided || provided !== req.participant.csrf_token) {
    return next(createError(403, 'Invalid or missing CSRF token', { code: 'FORBIDDEN' }));
  }
  next();
}

function requireEventMember(req, res, next) {
  const eventId = parseInt(req.params.eventId);
  if (req.participant.event_id !== eventId) {
    return next(createError(403, 'Not a member of this event', { code: 'FORBIDDEN' }));
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.participant.role)) {
      return next(createError(403, `Requires role: ${roles.join(' or ')}`, { code: 'FORBIDDEN' }));
    }
    next();
  };
}

/** Blocks mutations once the event has been closed by the organizer. */
function requireOpenEvent(req, res, next) {
  if (req.event.status === EVENT_STATUS.CLOSED) {
    return next(createError(409, 'This event is closed', { code: 'EVENT_CLOSED' }));
  }
  next();
}

/** Internal ops guard for bootstrapping events — not part of the join UI. */
function requireSetupKey(req, res, next) {
  const key = req.headers['x-setup-key'];
  if (!key || key !== process.env.EVENT_SETUP_KEY) {
    return next(createError(403, 'Invalid setup key', { code: 'FORBIDDEN' }));
  }
  next();
}

module.exports = {
  SESSION_COOKIE,
  authenticate,
  requireCsrf,
  requireEventMember,
  requireRole,
  requireOpenEvent,
  requireSetupKey,
};
