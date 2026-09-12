const { Router } = require('express');
const { authenticate, requireCsrf, requireEventMember, requireOpenEvent, requireRole } = require('../../middleware/auth');
const { ROLES, TAGS } = require('../../shared/constants');
const { serializeSession } = require('../../shared/serialize');
const { asyncHandler } = require('../../shared/asyncHandler');
const { createError } = require('../../middleware/errorHandler');
const { updateMentorProfile } = require('../events/events.service');
const { performAction } = require('./mentor.service');

const router = Router();

// POST /api/events/:eventId/requests/:requestId/actions — state transition
router.post(
  '/events/:eventId/requests/:requestId/actions',
  authenticate,
  requireCsrf,
  requireEventMember,
  requireOpenEvent,
  asyncHandler(async (req, res) => {
    const { action, expectedVersion } = req.body;
    if (!action) {
      throw createError(400, 'action is required (claim, start, release, resolve, cancel)', {
        fieldErrors: { action: 'Required' },
      });
    }

    const updated = await performAction(
      parseInt(req.params.requestId),
      parseInt(req.params.eventId),
      req.participant,
      action,
      expectedVersion
    );

    res.json(updated);
  })
);

// PATCH /api/events/:eventId/me — mentor updates availability/skills; returns Session
router.patch(
  '/events/:eventId/me',
  authenticate,
  requireCsrf,
  requireEventMember,
  requireRole(ROLES.MENTOR),
  asyncHandler(async (req, res) => {
    const { skills, isAvailable } = req.body;

    if (skills !== undefined && (!Array.isArray(skills) || skills.some((s) => !TAGS.includes(s)))) {
      throw createError(400, 'Invalid skills list', { fieldErrors: { skills: 'Invalid tag in skills list' } });
    }
    if (isAvailable !== undefined && typeof isAvailable !== 'boolean') {
      throw createError(400, 'isAvailable must be a boolean', { fieldErrors: { isAvailable: 'Must be a boolean' } });
    }

    await updateMentorProfile(req.participant.id, { skills, isAvailable });

    const updatedParticipant = { ...req.participant };
    if (skills !== undefined) updatedParticipant.skills = skills;
    if (isAvailable !== undefined) updatedParticipant.is_available = isAvailable;

    res.json(serializeSession(updatedParticipant, req.event, req.participant.csrf_token));
  })
);

module.exports = router;
