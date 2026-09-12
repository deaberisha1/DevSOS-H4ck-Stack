require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { pool } = require('../config/database');
const { nanoid } = require('nanoid');

async function seed() {
  console.log('[seed] Seeding demo data...');

  // Demo codes match the frontend's mock-mode demo (event_code HACKSTACK,
  // mentor invite MENTOR) so manual testing feels the same in real mode.
  const [eventResult] = await pool.execute(
    `INSERT IGNORE INTO events (name, event_code, mentor_code, organizer_code)
     VALUES (?, ?, ?, ?)`,
    ['DevSOS Demo Hackathon', 'HACKSTACK', 'MENTOR', 'ADMIN2024']
  );

  const eventId = eventResult.insertId || 1;

  const participants = [
    { name: 'Alice (Participant)', role: 'participant', sid: 'sess_alice_001', skills: [] },
    { name: 'Bob (Participant)',   role: 'participant', sid: 'sess_bob_002',   skills: [] },
    { name: 'Carol (Mentor)',      role: 'mentor',      sid: 'sess_carol_003', skills: ['JavaScript', 'React', 'Backend'] },
    { name: 'Dave (Mentor)',       role: 'mentor',      sid: 'sess_dave_004',  skills: ['TypeScript', 'Database'] },
    { name: 'Eve (Organizer)',     role: 'organizer',   sid: 'sess_eve_005',   skills: [] },
  ];

  for (const p of participants) {
    await pool.execute(
      `INSERT IGNORE INTO participants (event_id, display_name, role, session_id, csrf_token, skills)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [eventId, p.name, p.role, p.sid, `csrf_${nanoid(16)}`, JSON.stringify(p.skills)]
    );
  }

  // Demo help request from Alice
  await pool.execute(
    `INSERT IGNORE INTO help_requests
       (event_id, participant_id, title, description, table_number, category, primary_tag, tags, client_request_id, status)
     VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, 'waiting')`,
    [
      eventId,
      'Socket.IO not connecting',
      'I keep getting CORS errors when trying to connect Socket.IO from my React app to the Express server.',
      'T-12',
      'Backend',
      'Backend',
      JSON.stringify(['Backend', 'JavaScript']),
      'seed-demo-request-1',
    ]
  );

  console.log('[seed] Demo data created successfully.');
  console.log('[seed] Join with event code: HACKSTACK (mentor invite: MENTOR)');
  console.log('[seed] Demo session IDs (for direct cookie-less curl testing, see README):');
  console.log('  Participant Alice: sess_alice_001');
  console.log('  Participant Bob:   sess_bob_002');
  console.log('  Mentor Carol:      sess_carol_003');
  console.log('  Mentor Dave:       sess_dave_004');
  console.log('  Organizer Eve:     sess_eve_005 (join via organizer_code ADMIN2024)');
  await pool.end();
}

seed().catch((err) => {
  console.error('[seed] Failed:', err.message);
  process.exit(1);
});
