const { getConnection } = require('../../config/database');
const { ROLES, ACTIONS } = require('../../shared/constants');
const { serializeRequest } = require('../../shared/serialize');
const { createError } = require('../../middleware/errorHandler');
const { emitRequestUpdate, emitStatsUpdate } = require('../../shared/socket');
const { getEventStats } = require('../events/events.service');

/**
 * Validate whether `participant` (with their role) may perform `action` on
 * `row` (the locked current state), per the handoff doc's authorization
 * rules. Throws a createError() on any violation. Returns nothing on success.
 */
function assertAuthorized(row, participant, action) {
  if (participant.role === ROLES.PARTICIPANT) {
    if (action !== ACTIONS.CANCEL) {
      throw createError(403, 'Participants may only cancel their own request', { code: 'FORBIDDEN' });
    }
    if (row.participant_id !== participant.id) {
      throw createError(403, 'Not your request', { code: 'FORBIDDEN' });
    }
    if (row.status !== 'waiting') {
      throw createError(409, 'Only a waiting request can be cancelled', { code: 'CONFLICT' });
    }
    return;
  }

  if (participant.role === ROLES.MENTOR) {
    if (action === ACTIONS.CLAIM) {
      if (row.status !== 'waiting') {
        throw createError(409, 'This request changed. Refresh and try again.', { code: 'CONFLICT' });
      }
      return;
    }
    // start/resolve/release all require the mentor to be assigned already.
    if (row.mentor_id !== participant.id) {
      throw createError(403, 'Only the assigned mentor can perform this action', { code: 'FORBIDDEN' });
    }
    if (action === ACTIONS.START && row.status !== 'claimed') {
      throw createError(409, 'This request changed. Refresh and try again.', { code: 'CONFLICT' });
    }
    if (action === ACTIONS.RESOLVE && row.status !== 'in_progress') {
      throw createError(409, 'This request changed. Refresh and try again.', { code: 'CONFLICT' });
    }
    if (action === ACTIONS.RELEASE && !['claimed', 'in_progress'].includes(row.status)) {
      throw createError(409, 'This request changed. Refresh and try again.', { code: 'CONFLICT' });
    }
    return;
  }

  if (participant.role === ROLES.ORGANIZER) {
    if (action === ACTIONS.CANCEL) {
      if (!['waiting', 'claimed', 'in_progress'].includes(row.status)) {
        throw createError(409, 'This request changed. Refresh and try again.', { code: 'CONFLICT' });
      }
      return;
    }
    if ((action === ACTIONS.RELEASE || action === ACTIONS.RESOLVE) && !['claimed', 'in_progress'].includes(row.status)) {
      throw createError(409, 'This request changed. Refresh and try again.', { code: 'CONFLICT' });
    }
    return;
  }

  throw createError(403, 'Not authorized', { code: 'FORBIDDEN' });
}

/**
 * Perform a state-transition action on a help request, guarded by:
 *  - row-level locking (SELECT ... FOR UPDATE) for claim safety
 *  - optimistic-concurrency version check against expectedVersion
 *  - role/ownership authorization per the handoff doc
 */
async function performAction(requestId, eventId, participant, action, expectedVersion) {
  const conn = await getConnection();
  let updatedRow;
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      'SELECT * FROM help_requests WHERE id = ? AND event_id = ? FOR UPDATE',
      [requestId, eventId]
    );

    if (rows.length === 0) {
      throw createError(404, 'This request is no longer available', { code: 'NOT_FOUND' });
    }

    const row = rows[0];

    if (typeof expectedVersion === 'number' && row.version !== expectedVersion) {
      throw createError(409, 'This request changed. Refresh and try again.', { code: 'CONFLICT' });
    }

    assertAuthorized(row, participant, action);

    if (action === ACTIONS.CLAIM) {
      // One active assignment per mentor.
      const [activeMentor] = await conn.execute(
        `SELECT id FROM help_requests
         WHERE mentor_id = ? AND status IN ('claimed', 'in_progress') FOR UPDATE`,
        [participant.id]
      );
      if (activeMentor.length > 0) {
        throw createError(409, 'You already have an active assignment. Resolve or release it first.', { code: 'CONFLICT' });
      }
    }

    const setClauses = ['version = version + 1'];
    const params = [];

    if (action === ACTIONS.CLAIM) {
      setClauses.push("status = 'claimed'", 'mentor_id = ?', 'claimed_at = NOW()', 'first_claimed_at = COALESCE(first_claimed_at, NOW())');
      params.push(participant.id);
    } else if (action === ACTIONS.START) {
      setClauses.push("status = 'in_progress'", 'started_at = NOW()');
    } else if (action === ACTIONS.RESOLVE) {
      setClauses.push("status = 'resolved'", 'resolved_at = NOW()');
    } else if (action === ACTIONS.RELEASE) {
      setClauses.push("status = 'waiting'", 'mentor_id = NULL', 'claimed_at = NULL', 'started_at = NULL');
    } else if (action === ACTIONS.CANCEL) {
      setClauses.push("status = 'cancelled'", 'cancelled_at = NOW()');
    } else {
      throw createError(400, `Unknown action: ${action}`, { code: 'VALIDATION_ERROR' });
    }

    params.push(requestId);
    await conn.execute(`UPDATE help_requests SET ${setClauses.join(', ')} WHERE id = ?`, params);

    const [updated] = await conn.execute(
      `SELECT hr.*, p.display_name AS participant_name, m.display_name AS mentor_name
       FROM help_requests hr
       LEFT JOIN participants p ON hr.participant_id = p.id
       LEFT JOIN participants m ON hr.mentor_id = m.id
       WHERE hr.id = ?`,
      [requestId]
    );

    await conn.commit();
    updatedRow = updated[0];
  } catch (err) {
    await conn.rollback();
    conn.release();
    throw err;
  }

  // The transaction is done and the connection released. Everything below
  // is a post-commit side effect (broadcast + stats via the plain pool) —
  // a failure here must never roll back or touch the released connection.
  conn.release();
  const serialized = serializeRequest(updatedRow, { role: participant.role, id: participant.id });
  emitRequestUpdate(eventId, serialized);
  const stats = await getEventStats(eventId);
  emitStatsUpdate(eventId, stats);

  return serialized;
}

module.exports = { performAction };
