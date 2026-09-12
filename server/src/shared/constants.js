// Internal (DB) values are lowercase; API-facing values are UPPERCASE per the
// frontend contract (client/src/shared/types.ts). Keep DB storage lowercase
// and translate only at the API boundary via shared/serialize.js.

const REQUEST_STATUS = {
  WAITING: 'waiting',
  CLAIMED: 'claimed',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled',
};

// Valid state transitions: { from: [allowed next states] }
const VALID_TRANSITIONS = {
  [REQUEST_STATUS.WAITING]: [REQUEST_STATUS.CLAIMED, REQUEST_STATUS.CANCELLED],
  [REQUEST_STATUS.CLAIMED]: [REQUEST_STATUS.IN_PROGRESS, REQUEST_STATUS.WAITING],
  [REQUEST_STATUS.IN_PROGRESS]: [REQUEST_STATUS.RESOLVED, REQUEST_STATUS.WAITING],
};

const ROLES = {
  PARTICIPANT: 'participant',
  MENTOR: 'mentor',
  ORGANIZER: 'organizer',
};

const ACTIONS = {
  CLAIM: 'claim',
  START: 'start',
  RELEASE: 'release',
  RESOLVE: 'resolve',
  CANCEL: 'cancel',
};

const ACTION_TRANSITIONS = {
  [ACTIONS.CLAIM]:   { from: REQUEST_STATUS.WAITING,     to: REQUEST_STATUS.CLAIMED },
  [ACTIONS.START]:   { from: REQUEST_STATUS.CLAIMED,     to: REQUEST_STATUS.IN_PROGRESS },
  [ACTIONS.RELEASE]: { from: [REQUEST_STATUS.CLAIMED, REQUEST_STATUS.IN_PROGRESS], to: REQUEST_STATUS.WAITING },
  [ACTIONS.RESOLVE]: { from: REQUEST_STATUS.IN_PROGRESS, to: REQUEST_STATUS.RESOLVED },
  [ACTIONS.CANCEL]:  { from: REQUEST_STATUS.WAITING,     to: REQUEST_STATUS.CANCELLED },
};

// Per the handoff doc: which role may perform which action, and only on
// their own request (participant) or their own assignment (mentor).
// Organizer may act on anything active. This is enforced in mentor.service.js
// in addition to the generic state-machine check above.
const ALLOWED_ACTIONS_BY_ROLE = {
  [ROLES.PARTICIPANT]: [ACTIONS.CANCEL],
  [ROLES.MENTOR]: [ACTIONS.CLAIM, ACTIONS.START, ACTIONS.RELEASE, ACTIONS.RESOLVE],
  [ROLES.ORGANIZER]: [ACTIONS.RELEASE, ACTIONS.RESOLVE, ACTIONS.CANCEL],
};

const EVENT_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
};

const CATEGORIES = ['Frontend', 'Backend', 'Git', 'Deployment', 'Other'];

const TAGS = ['React', 'JavaScript', 'TypeScript', 'Backend', 'Database', 'Deployment', 'Git', 'UI', 'Other'];

// Legacy category -> tag mapping per the handoff doc, used when a category
// is supplied but the client's primaryTag doesn't already cover it.
const CATEGORY_TO_TAG = {
  Frontend: 'UI',
  Backend: 'Backend',
  Git: 'Git',
  Deployment: 'Deployment',
  Other: 'Other',
};

const LIMITS = {
  title: { min: 5, max: 100 },
  details: { min: 20, max: 1000 },
  codeSnippet: { max: 5000 },
  tableLabel: { min: 1, max: 30 },
  displayName: { min: 2, max: 40 },
  eventCode: { min: 1, max: 40 },
};

module.exports = {
  REQUEST_STATUS,
  VALID_TRANSITIONS,
  ROLES,
  ACTIONS,
  ACTION_TRANSITIONS,
  ALLOWED_ACTIONS_BY_ROLE,
  EVENT_STATUS,
  CATEGORIES,
  TAGS,
  CATEGORY_TO_TAG,
  LIMITS,
};
