const { query } = require('../../config/database');
const { CATEGORIES, TAGS, LIMITS } = require('../../shared/constants');
const { serializeRequest } = require('../../shared/serialize');
const { createError } = require('../../middleware/errorHandler');
const { emitNewRequest, emitStatsUpdate } = require('../../shared/socket');
const { getEventStats } = require('../events/events.service');

function validateCreateInput(input) {
  const fieldErrors = {};
  const title = (input.title || '').trim();
  const details = (input.details || '').trim();
  const tableLabel = (input.tableLabel || '').trim();
  const codeSnippet = input.codeSnippet || '';

  if (title.length < LIMITS.title.min || title.length > LIMITS.title.max) {
    fieldErrors.title = `Use a title between ${LIMITS.title.min} and ${LIMITS.title.max} characters.`;
  }
  if (details.length < LIMITS.details.min || details.length > LIMITS.details.max) {
    fieldErrors.details = `Describe the problem in ${LIMITS.details.min}–${LIMITS.details.max} characters.`;
  }
  if (!CATEGORIES.includes(input.category)) {
    fieldErrors.category = 'Choose a category.';
  }
  if (codeSnippet.length > LIMITS.codeSnippet.max) {
    fieldErrors.codeSnippet = `Keep the snippet under ${LIMITS.codeSnippet.max} characters.`;
  }
  if (!tableLabel || tableLabel.length > LIMITS.tableLabel.max) {
    fieldErrors.tableLabel = `Enter your table or location (up to ${LIMITS.tableLabel.max} characters).`;
  }
  if (!input.primaryTag || !TAGS.includes(input.primaryTag)) {
    fieldErrors.primaryTag = 'Choose a primary tag.';
  }
  if (input.tags && (!Array.isArray(input.tags) || input.tags.some((t) => !TAGS.includes(t)))) {
    fieldErrors.tags = 'Invalid tag list.';
  }
  if (!input.clientRequestId || typeof input.clientRequestId !== 'string') {
    fieldErrors.clientRequestId = 'Missing submission id.';
  }

  return fieldErrors;
}

async function createRequest(eventId, participant, input) {
  const fieldErrors = validateCreateInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    throw createError(400, 'Please check the highlighted fields.', { fieldErrors });
  }

  // Idempotency: a retry with the same clientRequestId returns the
  // original request rather than erroring or creating a duplicate.
  const [existing] = await query(
    `SELECT hr.*, p.display_name AS participant_name, m.display_name AS mentor_name
     FROM help_requests hr
     LEFT JOIN participants p ON hr.participant_id = p.id
     LEFT JOIN participants m ON hr.mentor_id = m.id
     WHERE hr.event_id = ? AND hr.participant_id = ? AND hr.client_request_id = ?`,
    [eventId, participant.id, input.clientRequestId]
  );
  if (existing.length > 0) {
    return serializeRequest(existing[0], { role: participant.role, id: participant.id });
  }

  // One active request per participant.
  const [active] = await query(
    `SELECT id FROM help_requests
     WHERE participant_id = ? AND status IN ('waiting', 'claimed', 'in_progress')`,
    [participant.id]
  );
  if (active.length > 0) {
    throw createError(409, 'You already have an active help request', { code: 'CONFLICT' });
  }

  const [result] = await query(
    `INSERT INTO help_requests
       (event_id, participant_id, title, description, code_snippet, attempted_steps,
        table_number, category, primary_tag, tags, client_request_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      eventId,
      participant.id,
      input.title.trim(),
      input.details.trim(),
      input.codeSnippet || null,
      input.attemptedSteps || null,
      input.tableLabel.trim(),
      input.category,
      input.primaryTag,
      JSON.stringify(input.tags || []),
      input.clientRequestId,
    ]
  );

  const [rows] = await query(
    `SELECT hr.*, p.display_name AS participant_name, m.display_name AS mentor_name
     FROM help_requests hr
     LEFT JOIN participants p ON hr.participant_id = p.id
     LEFT JOIN participants m ON hr.mentor_id = m.id
     WHERE hr.id = ?`,
    [result.insertId]
  );

  const serialized = serializeRequest(rows[0], { role: participant.role, id: participant.id });

  emitNewRequest(eventId, serialized);
  const stats = await getEventStats(eventId);
  emitStatsUpdate(eventId, stats);

  return serialized;
}

async function getRequests(eventId, viewer, filters = {}) {
  const conditions = ['hr.event_id = ?'];
  const params = [eventId];

  if (viewer.role === 'participant') {
    conditions.push('hr.participant_id = ?');
    params.push(viewer.id);
  }
  if (filters.status) {
    conditions.push('hr.status = ?');
    params.push(filters.status.toLowerCase());
  }
  if (filters.tag) {
    conditions.push('JSON_CONTAINS(hr.tags, ?)');
    params.push(JSON.stringify(filters.tag));
  }

  const [rows] = await query(
    `SELECT hr.*, p.display_name AS participant_name, m.display_name AS mentor_name
     FROM help_requests hr
     LEFT JOIN participants p ON hr.participant_id = p.id
     LEFT JOIN participants m ON hr.mentor_id = m.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY
       FIELD(hr.status, 'waiting', 'claimed', 'in_progress', 'resolved', 'cancelled'),
       hr.created_at ASC`,
    params
  );

  return rows.map((row) => serializeRequest(row, viewer));
}

async function getRequestById(eventId, requestId, viewer) {
  const [rows] = await query(
    `SELECT hr.*, p.display_name AS participant_name, m.display_name AS mentor_name
     FROM help_requests hr
     LEFT JOIN participants p ON hr.participant_id = p.id
     LEFT JOIN participants m ON hr.mentor_id = m.id
     WHERE hr.id = ? AND hr.event_id = ?`,
    [requestId, eventId]
  );

  if (rows.length === 0) {
    throw createError(404, 'This request is no longer available', { code: 'NOT_FOUND' });
  }

  const row = rows[0];
  if (viewer.role === 'participant' && row.participant_id !== viewer.id) {
    throw createError(403, 'Not your request', { code: 'FORBIDDEN' });
  }

  return serializeRequest(row, viewer);
}

module.exports = { createRequest, getRequests, getRequestById };
