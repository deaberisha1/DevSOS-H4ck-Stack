const { Router } = require('express');
const { authenticate, requireCsrf, requireEventMember, requireRole, requireOpenEvent } = require('../../middleware/auth');
const { ROLES } = require('../../shared/constants');
const { asyncHandler } = require('../../shared/asyncHandler');
const { createRequest, getRequests, getRequestById } = require('./help.service');
const { runAssistant } = require('./help.agent');

const router = Router();

// GET /api/events/:eventId/requests — role-filtered list (+ status/tag filters)
router.get(
  '/events/:eventId/requests',
  authenticate,
  requireEventMember,
  asyncHandler(async (req, res) => {
    const viewer = { role: req.participant.role, id: req.participant.id };
    const rows = await getRequests(parseInt(req.params.eventId), viewer, {
      status: req.query.status,
      tag: req.query.tag,
    });
    res.json(rows);
  })
);

// GET /api/events/:eventId/requests/:requestId — single request, privacy-enforced
router.get(
  '/events/:eventId/requests/:requestId',
  authenticate,
  requireEventMember,
  asyncHandler(async (req, res) => {
    const viewer = { role: req.participant.role, id: req.participant.id };
    const row = await getRequestById(parseInt(req.params.eventId), parseInt(req.params.requestId), viewer);
    res.json(row);
  })
);

// POST /api/events/:eventId/requests — submit a help request
router.post(
  '/events/:eventId/requests',
  authenticate,
  requireCsrf,
  requireEventMember,
  requireOpenEvent,
  requireRole(ROLES.PARTICIPANT),
  asyncHandler(async (req, res) => {
    const result = await createRequest(parseInt(req.params.eventId), req.participant, req.body);
    res.status(201).json(result);
  })
);

// POST /api/events/:eventId/assist — AI assistant
router.post(
  '/events/:eventId/assist',
  authenticate,
  requireCsrf,
  requireEventMember,
  requireRole(ROLES.PARTICIPANT),
  asyncHandler(async (req, res) => {
    const { title, details, category, codeSnippet } = req.body;
    const response = await runAssistant({ title, details, category, codeSnippet });
    res.json(response);
  })
);

module.exports = router;
