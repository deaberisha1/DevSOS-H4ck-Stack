const { Router } = require('express');
const {
  authenticate,
  requireCsrf,
  requireEventMember,
  requireRole,
  requireSetupKey,
  SESSION_COOKIE,
} = require('../../middleware/auth');
const { ROLES } = require('../../shared/constants');
const { serializeSession } = require('../../shared/serialize');
const { asyncHandler } = require('../../shared/asyncHandler');
const { createError } = require('../../middleware/errorHandler');
const {
  createEvent,
  joinEvent,
  invalidateSession,
  getEventInfo,
  closeEvent,
  getEventStats,
  getMentors,
} = require('./events.service');

const router = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  signed: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 24 * 60 * 60 * 1000, // 24h — plenty for a hackathon
};

// POST /api/events — internal ops tool to bootstrap an event. Not part of
// the frontend contract; used to create events before anyone can join.
router.post(
  '/events',
  requireSetupKey,
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      throw createError(400, 'Event name is required', { fieldErrors: { name: 'Required' } });
    }
    const event = await createEvent(name.trim());
    res.status(201).json(event);
  })
);

// POST /api/join — public. Sets the session cookie and returns Session.
router.post(
  '/join',
  asyncHandler(async (req, res) => {
    const { eventCode, displayName, requestedRole, tableLabel, mentorInvite } = req.body;

    const fieldErrors = {};
    if (!eventCode || !eventCode.trim()) fieldErrors.eventCode = 'Enter an event code.';
    if (!displayName || displayName.trim().length < 2 || displayName.trim().length > 40) {
      fieldErrors.displayName = 'Use a display name between 2 and 40 characters.';
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw createError(400, 'Please check the highlighted fields.', { fieldErrors });
    }

    const { participant, event, sessionId, csrfToken } = await joinEvent({
      eventCode: eventCode.trim(),
      displayName: displayName.trim(),
      requestedRole,
      tableLabel: tableLabel ? tableLabel.trim() : undefined,
      mentorInvite,
    });

    res.cookie(SESSION_COOKIE, sessionId, COOKIE_OPTS);
    res.status(201).json(serializeSession(participant, event, csrfToken));
  })
);

// GET /api/session — current session from the cookie. 401 if signed out.
router.get(
  '/session',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(serializeSession(req.participant, req.event, req.participant.csrf_token));
  })
);

// DELETE /api/session — logout. Rotates the session so the old cookie dies.
router.delete(
  '/session',
  authenticate,
  asyncHandler(async (req, res) => {
    await invalidateSession(req.participant.id);
    res.clearCookie(SESSION_COOKIE, COOKIE_OPTS);
    res.status(204).end();
  })
);

// GET /api/events/:eventId — basic event info for any authorized member
router.get(
  '/events/:eventId',
  authenticate,
  requireEventMember,
  asyncHandler(async (req, res) => {
    const event = await getEventInfo(parseInt(req.params.eventId));
    res.json({
      id: String(event.id),
      name: event.name,
      code: event.event_code,
      status: event.status.toUpperCase(),
    });
  })
);

// PATCH /api/events/:eventId — organizer closes the event
router.patch(
  '/events/:eventId',
  authenticate,
  requireEventMember,
  requireCsrf,
  requireRole(ROLES.ORGANIZER),
  asyncHandler(async (req, res) => {
    if (req.body.status !== 'CLOSED') {
      throw createError(400, 'Only status: "CLOSED" is supported', { fieldErrors: { status: 'Must be CLOSED' } });
    }
    await closeEvent(parseInt(req.params.eventId));
    res.json({ id: req.params.eventId, status: 'CLOSED' });
  })
);

// GET /api/events/:eventId/mentors — organizer-only roster
router.get(
  '/events/:eventId/mentors',
  authenticate,
  requireEventMember,
  requireRole(ROLES.ORGANIZER),
  asyncHandler(async (req, res) => {
    const mentors = await getMentors(parseInt(req.params.eventId));
    res.json(mentors);
  })
);

// GET /api/events/:eventId/stats — organizer-only live counters
router.get(
  '/events/:eventId/stats',
  authenticate,
  requireEventMember,
  requireRole(ROLES.ORGANIZER),
  asyncHandler(async (req, res) => {
    const stats = await getEventStats(parseInt(req.params.eventId));
    res.json(stats);
  })
);

module.exports = router;
