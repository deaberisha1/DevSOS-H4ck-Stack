require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'devsos';

async function migrate() {
  const fresh = process.argv.includes('--fresh');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    ssl: { rejectUnauthorized: false },
  });

  if (fresh) {
    console.log(`[migrate] Dropping database ${DB_NAME}...`);
    await conn.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
  }

  console.log(`[migrate] Creating database ${DB_NAME} if not exists...`);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${DB_NAME}\``);

  // ── Events ────────────────────────────────────────────
  // event_code:     the public join code everyone types (e.g. "HACKSTACK")
  // mentor_code:    the mentor invitation, required alongside event_code
  //                 when requestedRole = MENTOR (e.g. "MENTOR")
  // organizer_code: a trusted, non-public code for organizer provisioning
  //                 (never surfaced in the join UI)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS events (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      name            VARCHAR(255) NOT NULL,
      event_code      VARCHAR(20)  NOT NULL UNIQUE,
      mentor_code     VARCHAR(20)  NOT NULL UNIQUE,
      organizer_code  VARCHAR(20)  NOT NULL UNIQUE,
      status          ENUM('open', 'closed') NOT NULL DEFAULT 'open',
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  // ── Participants ──────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS participants (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      event_id      INT NOT NULL,
      display_name  VARCHAR(100) NOT NULL,
      role          ENUM('participant', 'mentor', 'organizer') NOT NULL DEFAULT 'participant',
      session_id    VARCHAR(40) NOT NULL UNIQUE,
      csrf_token    VARCHAR(40) NOT NULL,
      table_label   VARCHAR(30),
      skills        JSON,
      is_available  BOOLEAN DEFAULT TRUE,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      INDEX idx_event_role (event_id, role)
    ) ENGINE=InnoDB
  `);

  // ── Help requests ─────────────────────────────────────
  // version:            bumped on every state-changing update; the client
  //                      sends expectedVersion on actions and gets 409 on a
  //                      mismatch (optimistic concurrency)
  // client_request_id:  paired with (event_id, participant_id) for
  //                      submission idempotency
  // first_claimed_at:   set once, on the very first claim, and never
  //                      overwritten by later release/reclaim cycles
  await conn.query(`
    CREATE TABLE IF NOT EXISTS help_requests (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      event_id          INT NOT NULL,
      participant_id    INT NOT NULL,
      mentor_id         INT DEFAULT NULL,
      title             VARCHAR(255) NOT NULL,
      description       TEXT NOT NULL,
      code_snippet      TEXT,
      attempted_steps   TEXT,
      table_number      VARCHAR(30) NOT NULL,
      category          ENUM('Frontend', 'Backend', 'Git', 'Deployment', 'Other'),
      primary_tag       VARCHAR(20) NOT NULL,
      tags              JSON,
      client_request_id VARCHAR(100) NOT NULL,
      status            ENUM('waiting', 'claimed', 'in_progress', 'resolved', 'cancelled')
                          NOT NULL DEFAULT 'waiting',
      version           INT NOT NULL DEFAULT 1,
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      first_claimed_at  TIMESTAMP NULL,
      claimed_at        TIMESTAMP NULL,
      started_at        TIMESTAMP NULL,
      resolved_at       TIMESTAMP NULL,
      cancelled_at      TIMESTAMP NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES participants(id),
      FOREIGN KEY (mentor_id) REFERENCES participants(id),
      UNIQUE KEY uniq_idempotency (event_id, participant_id, client_request_id),
      INDEX idx_event_status (event_id, status),
      INDEX idx_mentor_active (mentor_id, status)
    ) ENGINE=InnoDB
  `);

  console.log('[migrate] All tables created successfully.');
  await conn.end();
}

migrate().catch((err) => {
  console.error('[migrate] Failed:', err.message);
  process.exit(1);
});
