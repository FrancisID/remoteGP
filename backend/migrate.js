const { Pool } = require('pg');
require('dotenv').config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY, file_no TEXT, name TEXT, age INT,
      gender CHAR(1), village TEXT, rah_id TEXT, height TEXT,
      weight TEXT, bp TEXT, temp TEXT, wt_loss TEXT,
      allergy TEXT, blood_type TEXT, complaint TEXT,
      symptoms TEXT[], status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ehr_records (
      id SERIAL PRIMARY KEY, patient_id TEXT, doctor TEXT,
      dx TEXT, rx TEXT, lab TEXT, notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      pat_id TEXT, dr_id TEXT, dr_name TEXT, pat_name TEXT,
      rah_id TEXT, status TEXT DEFAULT 'pending',
      approved_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS record_requests (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      pat_id TEXT, pat_name TEXT, rah_id TEXT,
      reason TEXT, method TEXT, status TEXT DEFAULT 'pending',
      admin_note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      patient_id TEXT, patient_name TEXT, from_doctor TEXT,
      to_doctor TEXT, reason TEXT, status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY, name TEXT, email TEXT, type TEXT,
      country TEXT, status TEXT DEFAULT 'pending',
      submitted_at DATE DEFAULT CURRENT_DATE,
      reviewed_at DATE, notes TEXT
    );
    CREATE TABLE IF NOT EXISTS ai_config (
      id INT PRIMARY KEY DEFAULT 1,
      training_cycle_size INT DEFAULT 100,
      training_duration_months INT DEFAULT 12,
      shadowing_threshold INT DEFAULT 100,
      ai_load_percent INT DEFAULT 30,
      reversion_threshold INT DEFAULT 90,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    INSERT INTO ai_config(id) VALUES(1) ON CONFLICT DO NOTHING;
  `);
  console.log('✅ remoteGP database schema created successfully');
  await db.end();
}

migrate().catch(e => { console.error(e); process.exit(1); });