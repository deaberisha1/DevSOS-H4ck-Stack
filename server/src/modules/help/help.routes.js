const { Router } = require('express');
const { authenticate, requireCsrf, requireEventMember, requireRole, requireOpenEvent } = require('../../middleware/auth');
const { ROLES } = require('../../shared/constants');
const { asyncHandler } = require('../../shared/asyncHandler');
const { createRequest, getRequests, getRequestById } = require('./help.service');
const { runAssistant, runAssistantChat } = require('./help.agent');

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
// Supports two shapes on the same endpoint:
//  - { title, details, category, codeSnippet } — single-shot, from the
//    "Get AI help" button on the request form -> { suggestions, resources?, simulated? }
//  - { messages: [{role, content}], category } — the standalone AI Assistant
//    chat page, whole conversation replayed each turn -> { reply, suggestions?, resources?, escalate?, simulated? }
router.post(
  '/events/:eventId/assist',
  authenticate,
  requireCsrf,
  requireEventMember,
  requireRole(ROLES.PARTICIPANT),
  asyncHandler(async (req, res) => {
    const { title, details, category, codeSnippet, messages } = req.body;

    if (Array.isArray(messages)) {
      const response = await runAssistantChat({ messages, category });
      return res.json(response);
    }

    const response = await runAssistant({ title, details, category, codeSnippet });
    res.json(response);
  })
);

module.exports = router;
