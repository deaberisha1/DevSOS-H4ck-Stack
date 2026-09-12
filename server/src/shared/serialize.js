// Transform layer: DB rows (snake_case, lowercase enums) -> API JSON
// (camelCase, UPPERCASE enums) per client/src/shared/types.ts.

function toUpper(value) {
  return value ? value.toUpperCase() : value;
}

function isoOrUndefined(value) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

/**
 * Serialize a help_requests row (already JOINed with participant/mentor
 * display names) into the HelpRequest shape the frontend expects.
 *
 * `viewerRole` and `viewerId` drive detail/codeSnippet privacy:
 * - requester always sees their own full details/snippet
 * - assigned mentor sees full details/snippet
 * - organizer always sees full details/snippet
 * - any other mentor sees full details only while the request is WAITING
 *   (they need the problem to decide whether to claim it); once claimed by
 *   someone else, details/snippet are redacted for everyone but the parties
 *   above.
 */
function serializeRequest(row, viewer) {
  const isOwner = viewer && viewer.role === 'participant' && viewer.id === row.participant_id;
  const isAssignedMentor = viewer && viewer.role === 'mentor' && viewer.id === row.mentor_id;
  const isOrganizer = viewer && viewer.role === 'organizer';
  const isWaiting = row.status === 'waiting';

  const canSeeDetail = isOwner || isAssignedMentor || isOrganizer || (viewer && viewer.role === 'mentor' && isWaiting);

  const tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [];

  return {
    id: String(row.id),
    eventId: String(row.event_id),
    requesterId: row.participant_id != null ? String(row.participant_id) : undefined,
    mentorId: row.mentor_id != null ? String(row.mentor_id) : undefined,
    status: toUpper(row.status),
    version: row.version,
    title: row.title,
    category: row.category || undefined,
    primaryTag: row.primary_tag,
    tags,
    tableLabel: row.table_number,
    requesterName: row.participant_name,
    mentorName: row.mentor_name || undefined,
    details: canSeeDetail ? row.description : undefined,
    codeSnippet: canSeeDetail ? (row.code_snippet || undefined) : undefined,
    attemptedSteps: canSeeDetail ? (row.attempted_steps || undefined) : undefined,
    createdAt: isoOrUndefined(row.created_at),
    updatedAt: isoOrUndefined(row.updated_at || row.created_at),
    firstClaimedAt: isoOrUndefined(row.first_claimed_at),
    claimedAt: isoOrUndefined(row.claimed_at),
    startedAt: isoOrUndefined(row.started_at),
    resolvedAt: isoOrUndefined(row.resolved_at),
    cancelledAt: isoOrUndefined(row.cancelled_at),
  };
}

/**
 * Serialize a participant + their event into the Session shape.
 * csrfToken is only ever included when explicitly passed (join/session
 * fetch) — never persisted or logged beyond that.
 */
function serializeSession(participant, event, csrfToken) {
  return {
    memberId: String(participant.id),
    eventId: String(event.id),
    eventCode: event.event_code,
    eventName: event.name,
    eventStatus: toUpper(event.status),
    displayName: participant.display_name,
    role: toUpper(participant.role),
    tableLabel: participant.table_label || undefined,
    skills: typeof participant.skills === 'string' ? JSON.parse(participant.skills) : participant.skills || [],
    isAvailable: !!participant.is_available,
    csrfToken,
  };
}

module.exports = { serializeRequest, serializeSession, toUpper, isoOrUndefined };
