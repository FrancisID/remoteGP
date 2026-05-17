const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.get('/health', (_, res) =>
  res.json({ ok: true, service: 'remoteGP API', ts: new Date() }));

app.get('/api/approvals', async (_, res) => {
  const r = await db.query('SELECT * FROM approvals ORDER BY created_at DESC');
  res.json(r.rows);
});
app.post('/api/approvals', async (req, res) => {
  const { pat_id, dr_id, dr_name, pat_name, rah_id } = req.body;
  const r = await db.query(
    `INSERT INTO approvals(pat_id,dr_id,dr_name,pat_name,rah_id,status)
     VALUES($1,$2,$3,$4,$5,'pending') RETURNING *`,
    [pat_id, dr_id, dr_name, pat_name, rah_id]);
  res.json(r.rows[0]);
});
app.patch('/api/approvals/:id', async (req, res) => {
  const r = await db.query(
    `UPDATE approvals SET status=$1, approved_by=$2, updated_at=NOW()
     WHERE id=$3 RETURNING *`,
    [req.body.status, req.body.approved_by, req.params.id]);
  res.json(r.rows[0]);
});

app.get('/api/ehr/:patId', async (req, res) => {
  const r = await db.query(
    'SELECT * FROM ehr_records WHERE patient_id=$1 ORDER BY created_at DESC',
    [req.params.patId]);
  res.json(r.rows);
});
app.post('/api/ehr', async (req, res) => {
  const { patient_id, doctor, dx, rx, lab, notes } = req.body;
  const r = await db.query(
    `INSERT INTO ehr_records(patient_id,doctor,dx,rx,lab,notes)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [patient_id, doctor, dx, rx, lab, notes]);
  res.json(r.rows[0]);
});

app.get('/api/record-requests', async (_, res) => {
  const r = await db.query('SELECT * FROM record_requests ORDER BY created_at DESC');
  res.json(r.rows);
});
app.post('/api/record-requests', async (req, res) => {
  const { pat_id, pat_name, reason, method, rah_id } = req.body;
  const r = await db.query(
    `INSERT INTO record_requests(pat_id,pat_name,reason,method,rah_id,status)
     VALUES($1,$2,$3,$4,$5,'pending') RETURNING *`,
    [pat_id, pat_name, reason, method, rah_id]);
  res.json(r.rows[0]);
});
app.patch('/api/record-requests/:id', async (req, res) => {
  const r = await db.query(
    `UPDATE record_requests SET status=$1, admin_note=$2, updated_at=NOW()
     WHERE id=$3 RETURNING *`,
    [req.body.status, req.body.admin_note, req.params.id]);
  res.json(r.rows[0]);
});

app.listen(PORT, () => console.log(`remoteGP API running on port ${PORT}`));