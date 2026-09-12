const { query } = require('../../config/database');
const { nanoid } = require('nanoid');
const { ROLES, EVENT_STATUS } = require('../../shared/constants');
const { createError } = require('../../middleware/errorHandler');

async function createEvent(name) {
  const eventCode = nanoid(8).toUpperCase();
  const mentorCode = nanoid(8).toUpperCase();
  const organizerCode = nanoid(8).toUpperCase();

  const [result] = await query(
    'INSERT INTO events (name, event_code, mentor_code, organizer_code) VALUES (?, ?, ?, ?)',
    [name, eventCode, mentorCode, organizerCode]
  );

  return {
    id: result.insertId,
    name,
    event_code: eventCode,
    mentor_code: mentorCode,
    organizer_code: organizerCode,
    status: EVENT_STATUS.OPEN,
  };
}

/**
 * Join an event. Role is derived server-side, never trusted from the
 * client beyond `requestedRole` as a hint:
 *  - eventCode matching the event's organizer_code -> ORGANIZER
 *    (legacy path, kept for compatibility)
 *  - requestedRole === 'ORGANIZER' -> ORGANIZER, but only if organizerInvite
 *    matches the event's organizer_code
 *  - requestedRole === 'MENTOR' -> MENTOR, but only if mentorInvite
 *    matches the event's mentor_code
 *  - otherwise -> PARTICIPANT
 */
async function joinEvent({ eventCode, displayName, requestedRole, tableLabel, mentorInvite, organizerInvite }) {
  const [events] = await query(
    `SELECT * FROM events WHERE event_code = ? OR organizer_code = ?`,
    [eventCode, eventCode]
  );

  if (events.length === 0) {
    throw createError(404, 'Invalid event code', {
      code: 'NOT_FOUND',
      fieldErrors: { eventCode: 'Invalid event code' },
    });
  }

  const event = events[0];

  if (event.status === EVENT_STATUS.CLOSED) {
    throw createError(409, 'This event is closed', { code: 'EVENT_CLOSED' });
  }

  let role = ROLES.PARTICIPANT;
  if (eventCode === event.organizer_code) {
    role = ROLES.ORGANIZER;
  } else if (requestedRole === 'ORGANIZER') {
    if (!organizerInvite || organizerInvite !== event.organizer_code) {
      throw createError(403, 'Invalid organizer invitation', {
        code: 'FORBIDDEN',
        fieldErrors: { organizerInvite: 'Invalid organizer invitation' },
      });
    }
    role = ROLES.ORGANIZER;
  } else if (requestedRole === 'MENTOR') {
    if (!mentorInvite || mentorInvite !== event.mentor_code) {
      throw createError(403, 'Invalid mentor invitation', {
        code: 'FORBIDDEN',
        fieldErrors: { mentorInvite: 'Invalid mentor invitation' },
      });
    }
    role = ROLES.MENTOR;
  }

  const sessionId = `sess_${nanoid(24)}`;
  const csrfToken = `csrf_${nanoid(24)}`;

  const [result] = await query(
    `INSERT INTO participants (event_id, display_name, role, session_id, csrf_token, table_label, skills)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [event.id, displayName, role, sessionId, csrfToken, tableLabel || null, JSON.stringify([])]
  );

  const participant = {
    id: result.insertId,
    display_name: displayName,
    role,
    table_label: tableLabel || null,
    skills: [],
    is_available: true,
  };

  return { participant, event, sessionId, csrfToken };
}

/** Rotates the session/csrf so the old cookie can no longer be used. */
async function invalidateSession(participantId) {
  await query(
    'UPDATE participants SET session_id = ?, csrf_token = ? WHERE id = ?',
    [`revoked_${nanoid(24)}`, `revoked_${nanoid(24)}`, participantId]
  );
}

async function updateMentorProfile(participantId, data) {
  const setClauses = [];
  const params = [];

  if (typeof data.isAvailable === 'boolean') {
    setClauses.push('is_available = ?');
    params.push(data.isAvailable);
  }
  if (Array.isArray(data.skills)) {
    setClauses.push('skills = ?');
    params.push(JSON.stringify(data.skills));
  }
  if (setClauses.length === 0) return;

  params.push(participantId);
  await query(`UPDATE participants SET ${setClauses.join(', ')} WHERE id = ?`, params);
}

async function getEventInfo(eventId) {
  const [rows] = await query('SELECT id, name, event_code, status FROM events WHERE id = ?', [eventId]);
  if (rows.length === 0) throw createError(404, 'Event not found', { code: 'NOT_FOUND' });
  return rows[0];
}

async function closeEvent(eventId) {
  await query(`UPDATE events SET status = 'closed' WHERE id = ?`, [eventId]);
}

async function getEventStats(eventId) {
  const [rows] = await query(
    `SELECT status, COUNT(*) as count FROM help_requests WHERE event_id = ? GROUP BY status`,
    [eventId]
  );

  const counts = { WAITING: 0, CLAIMED: 0, IN_PROGRESS: 0, RESOLVED: 0, CANCELLED: 0 };
  const statusKey = { waiting: 'WAITING', claimed: 'CLAIMED', in_progress: 'IN_PROGRESS', resolved: 'RESOLVED', cancelled: 'CANCELLED' };
  for (const row of rows) {
    const key = statusKey[row.status];
    if (key) counts[key] = row.count;
  }

  const [oldest] = await query(
    `SELECT id, title, created_at FROM help_requests
     WHERE event_id = ? AND status = 'waiting'
     ORDER BY created_at ASC LIMIT 5`,
    [eventId]
  );

  return {
    eventId: String(eventId),
    counts,
    oldestWaiting: oldest.map((r) => ({
      id: String(r.id),
      title: r.title,
      createdAt: new Date(r.created_at).toISOString(),
    })),
  };
}

async function getMentors(eventId) {
  const [rows] = await query(
    `SELECT p.id, p.display_name, p.is_available, p.skills,
            (SELECT COUNT(*) FROM help_requests hr
               WHERE hr.mentor_id = p.id AND hr.status IN ('claimed', 'in_progress')) AS active_requests
     FROM participants p
     WHERE p.event_id = ? AND p.role = 'mentor'
     ORDER BY p.display_name ASC`,
    [eventId]
  );

  return rows.map((r) => ({
    id: String(r.id),
    displayName: r.display_name,
    isAvailable: !!r.is_available,
    activeRequests: r.active_requests,
    skills: typeof r.skills === 'string' ? JSON.parse(r.skills) : r.skills || [],
  }));
}

module.exports = {
  createEvent,
  joinEvent,
  invalidateSession,
  updateMentorProfile,
  getEventInfo,
  closeEvent,
  getEventStats,
  getMentors,
};
