import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql, migrate } from './db.js';
import { ingestCsv } from './ingestion.js';
import { audit, sha256, stableStringify, verifyAuditChain } from './audit.js';
import { runValidation } from './validation.js';
import { generateRecommendation } from './ai.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const editableFields = new Set(['loan_id','borrower_id','loan_type','origination_date','maturity_date','original_principal','current_balance','interest_rate','term_months','borrower_state','loan_purpose','credit_grade','employment_length','income_band','payment_status','days_past_due','servicer_name','last_payment_date','last_updated_at','document_status','source_system']);
const numericFields = new Set(['original_principal','current_balance','interest_rate','term_months','days_past_due']);

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function seedDemo() {
  const [{ count }] = await sql`SELECT COUNT(*)::int count FROM batches`;
  if (Number(count) > 0) return;
  const sample = fs.readFileSync(path.resolve(here, '../data/sample-loan-tape.csv'));
  await ingestCsv(sample, 'sample-loan-tape.csv', 1);
}

export async function createApp(options: { seed?: boolean } = {}) {
  await migrate();
  if (options.seed !== false) await seedDemo();
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'Veritas Loan Copilot', time: new Date().toISOString() }));

  app.get('/api/users', async (_req, res, next) => {
    try { res.json(await sql`SELECT id,name,email,role,initials FROM users ORDER BY id`); }
    catch (e) { next(e); }
  });

  app.post('/api/users', async (req, res, next) => {
    try {
      const { name, email, role, initials } = req.body;
      if (!name || !email || !role || !initials) return res.status(400).json({ error: 'Missing required fields' });
      const [user] = await sql`INSERT INTO users (name,email,role,initials) VALUES (${name},${email},${role},${initials}) RETURNING *`;
      res.json(user);
    } catch (err: any) {
      if (err.message?.includes('unique') || err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
      next(err);
    }
  });

  app.get('/api/summary', async (_req, res, next) => {
    try {
      const [totals] = await sql`SELECT COUNT(*)::int total, SUM(CASE WHEN validation_status='valid' THEN 1 ELSE 0 END)::int valid, SUM(CASE WHEN validation_status='invalid' THEN 1 ELSE 0 END)::int invalid FROM loans`;
      const [exceptions] = await sql`SELECT COUNT(*)::int total, SUM(CASE WHEN status='open' THEN 1 ELSE 0 END)::int open, SUM(CASE WHEN severity='critical' AND status='open' THEN 1 ELSE 0 END)::int critical, SUM(CASE WHEN severity='high' AND status='open' THEN 1 ELSE 0 END)::int high FROM exceptions`;
      const [{ count: verified }] = await sql`SELECT COUNT(*)::int count FROM verified_loans`;
      const qualityScore = totals.total ? Math.round(((totals.valid ?? 0) / totals.total) * 100) : 100;
      const byRule = await sql`SELECT rule_code code, severity, COUNT(*)::int count FROM exceptions WHERE status='open' GROUP BY rule_code,severity ORDER BY count DESC LIMIT 8`;
      const trend = (await sql`SELECT SUBSTRING(created_at,1,10) date, COUNT(*)::int count FROM audit_events WHERE event_type='VALIDATION_EXECUTED' GROUP BY SUBSTRING(created_at,1,10) ORDER BY date DESC LIMIT 7`).reverse();
      const [{ count: batches }] = await sql`SELECT COUNT(*)::int count FROM batches`;
      res.json({ loans: totals, exceptions, verified: Number(verified), qualityScore, byRule, trend, batches: Number(batches) });
    } catch (e) { next(e); }
  });

  app.get('/api/batches', async (_req, res, next) => {
    try {
      res.json(await sql`
        SELECT b.*,u.name uploaded_by_name,
          (SELECT COUNT(*)::int FROM exceptions e JOIN loans l ON l.id=e.loan_row_id WHERE l.batch_id=b.id) exception_count
        FROM batches b JOIN users u ON u.id=b.uploaded_by ORDER BY b.id DESC
      `);
    } catch (e) { next(e); }
  });

  app.post('/api/upload', upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Choose a CSV file to upload.' });
      if (!req.file.originalname.toLowerCase().endsWith('.csv')) return res.status(415).json({ error: 'Only CSV files are supported.' });
      const actorId = Number(req.body.actorId || 1);
      res.status(201).json(await ingestCsv(req.file.buffer, req.file.originalname, actorId));
    } catch (e) { next(e); }
  });

  app.get('/api/loans', async (req, res, next) => {
    try {
      const search = String(req.query.search ?? '').trim();
      const status = String(req.query.status ?? '');
      const batchId = Number(req.query.batchId ?? 0);
      let query = sql`
        SELECT l.*,b.filename,
          (SELECT COUNT(*)::int FROM exceptions e WHERE e.loan_row_id=l.id AND e.status='open') open_exception_count,
          (SELECT MAX(CASE severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END) FROM exceptions e WHERE e.loan_row_id=l.id AND e.status='open') severity_rank,
          EXISTS(SELECT 1 FROM verified_loans v WHERE v.loan_row_id=l.id) is_verified
        FROM loans l JOIN batches b ON b.id=l.batch_id
        WHERE 1=1
        ${search ? sql`AND (l.loan_id ILIKE ${'%' + search + '%'} OR l.borrower_id ILIKE ${'%' + search + '%'})` : sql``}
        ${status ? sql`AND l.validation_status=${status}` : sql``}
        ${batchId ? sql`AND l.batch_id=${batchId}` : sql``}
        ORDER BY severity_rank DESC NULLS LAST, l.id DESC LIMIT 500
      `;
      res.json(await query);
    } catch (e) { next(e); }
  });

  app.get('/api/loans/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [loan] = await sql`SELECT l.*,b.filename,b.source_hash,u.name uploaded_by_name FROM loans l JOIN batches b ON b.id=l.batch_id JOIN users u ON u.id=b.uploaded_by WHERE l.id=${id}`;
      if (!loan) return res.status(404).json({ error: 'Loan not found.' });
      const exceptions = await sql`SELECT e.*,u.name assigned_to_name FROM exceptions e LEFT JOIN users u ON u.id=e.assigned_to WHERE e.loan_row_id=${id} ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,e.id`;
      const ai = await sql`SELECT * FROM ai_recommendations WHERE loan_row_id=${id} ORDER BY id DESC`;
      const reviews = await sql`SELECT r.*,u.name reviewer_name FROM reviews r JOIN users u ON u.id=r.reviewer_id WHERE r.loan_row_id=${id} ORDER BY r.id DESC`;
      const auditEvents = (await sql`SELECT a.*,u.name actor_name FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id WHERE a.loan_row_id=${id} ORDER BY a.id DESC`).map((row) => ({ ...row, metadata: JSON.parse(String(row.metadata_json)) }));
      const [verified] = await sql`SELECT v.*,u.name verified_by_name FROM verified_loans v JOIN users u ON u.id=v.verified_by WHERE v.loan_row_id=${id}`;
      res.json({ loan, exceptions, recommendations: ai, reviews, audit: auditEvents, auditIntegrity: await verifyAuditChain(id), verified: verified ?? null });
    } catch (e) { next(e); }
  });

  app.get('/api/exceptions', async (req, res, next) => {
    try {
      const severity = String(req.query.severity ?? '');
      const status = String(req.query.status ?? 'open');
      const search = String(req.query.search ?? '');
      const rows = await sql`
        SELECT e.*,l.loan_id,l.borrower_id,l.current_balance,l.original_principal,l.payment_status,l.days_past_due,l.source_system,b.filename,
          (SELECT COUNT(*)::int FROM ai_recommendations a WHERE a.exception_id=e.id) ai_count
        FROM exceptions e JOIN loans l ON l.id=e.loan_row_id JOIN batches b ON b.id=l.batch_id
        WHERE e.status=${status}
        ${severity ? sql`AND e.severity=${severity}` : sql``}
        ${search ? sql`AND (l.loan_id ILIKE ${'%'+search+'%'} OR l.borrower_id ILIKE ${'%'+search+'%'})` : sql``}
        ORDER BY CASE e.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, e.id DESC
      `;
      res.json(rows);
    } catch (e) { next(e); }
  });

  app.post('/api/exceptions/:id/ai', async (req, res, next) => {
    try { res.status(201).json(await generateRecommendation(Number(req.params.id), Number(req.body.actorId || 2))); }
    catch (e) { next(e); }
  });

  app.post('/api/ai/:id/action', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const body = asObject(req.body);
      const action = String(body.action ?? '');
      if (!['accepted','rejected','edited'].includes(action)) return res.status(400).json({ error: 'Action must be accepted, rejected, or edited.' });
      const [recommendation] = await sql`SELECT * FROM ai_recommendations WHERE id=${id}`;
      if (!recommendation) return res.status(404).json({ error: 'Recommendation not found.' });
      const actorId = Number(body.actorId || 2);
      await sql`UPDATE ai_recommendations SET status=${action}, acted_at=${new Date().toISOString()}, acted_by=${actorId} WHERE id=${id}`;
      await audit({ loanRowId: Number(recommendation.loan_row_id), actorId, eventType: `AI_RECOMMENDATION_${action.toUpperCase()}`, description: `Reviewer ${action} AI recommendation ${id}.`, metadata: { recommendationId: id, action, note: body.note ?? null } });
      res.json({ success: true, status: action });
    } catch (e) { next(e); }
  });

  app.patch('/api/loans/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const body = asObject(req.body);
      const actorId = Number(body.actorId || 2);
      const changes = asObject(body.changes);
      const [before] = await sql`SELECT * FROM loans WHERE id=${id}`;
      if (!before) return res.status(404).json({ error: 'Loan not found.' });
      const safe = Object.entries(changes).filter(([key]) => editableFields.has(key));
      if (!safe.length) return res.status(400).json({ error: 'No editable fields supplied.' });
      const normalized = safe.map(([key, value]) => [key, numericFields.has(key) ? (value === '' ? null : Number(value)) : (value === '' ? null : String(value))] as const);
      await sql`UPDATE loans SET ${sql(Object.fromEntries(normalized))} WHERE id=${id}`;
      const issues = await runValidation(id);
      await audit({ loanRowId: id, actorId, eventType: 'FIELD_EDITED', description: `${normalized.length} field${normalized.length === 1 ? '' : 's'} updated by reviewer.`, metadata: { changes: Object.fromEntries(normalized), previous: Object.fromEntries(normalized.map(([key]) => [key, before[key]])), remainingIssues: issues.length } });
      const [loan] = await sql`SELECT * FROM loans WHERE id=${id}`;
      res.json({ success: true, issues, loan });
    } catch (e) { next(e); }
  });

  app.post('/api/loans/:id/review', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const body = asObject(req.body);
      const decision = String(body.decision ?? '');
      const reviewerId = Number(body.reviewerId || 2);
      if (!['approved','rejected','correction_requested'].includes(decision)) return res.status(400).json({ error: 'Invalid review decision.' });
      const [loan] = await sql`SELECT * FROM loans WHERE id=${id}`;
      if (!loan) return res.status(404).json({ error: 'Loan not found.' });
      const now = new Date().toISOString();
      await sql`INSERT INTO reviews (loan_row_id,reviewer_id,decision,comment,created_at) VALUES (${id},${reviewerId},${decision},${String(body.comment ?? '')},${now})`;
      await sql`UPDATE exceptions SET status=${decision}, resolved_at=${now}, assigned_to=${reviewerId} WHERE loan_row_id=${id} AND status='open'`;
      await audit({ loanRowId: id, actorId: reviewerId, eventType: `LOAN_${decision.toUpperCase()}`, description: `Loan ${decision.replace('_',' ')} by reviewer.`, metadata: { decision, comment: body.comment ?? '' } });
      let verified = null;
      if (decision === 'approved') {
        const excluded = new Set(['id','raw_json','validation_status','created_at']);
        const canonical = Object.fromEntries(Object.entries(loan).filter(([key]) => !excluded.has(key)));
        const [prev] = await sql`SELECT record_hash FROM verified_loans ORDER BY id DESC LIMIT 1`;
        const recordHash = sha256(stableStringify(canonical) + (prev?.record_hash ?? 'GENESIS'));
        await sql`
          INSERT INTO verified_loans (loan_row_id,canonical_json,record_hash,previous_hash,verified_by,verified_at)
          VALUES (${id},${stableStringify(canonical)},${recordHash},${prev?.record_hash ?? null},${reviewerId},${now})
          ON CONFLICT (loan_row_id) DO UPDATE SET
            canonical_json=EXCLUDED.canonical_json, record_hash=EXCLUDED.record_hash,
            previous_hash=EXCLUDED.previous_hash, verified_by=EXCLUDED.verified_by, verified_at=EXCLUDED.verified_at
        `;
        const [v] = await sql`SELECT * FROM verified_loans WHERE loan_row_id=${id}`;
        verified = v;
        await audit({ loanRowId: id, actorId: reviewerId, eventType: 'VERIFIED_RECORD_CREATED', description: 'Canonical record sealed with a SHA-256 lineage hash.', metadata: { recordHash, previousHash: prev?.record_hash ?? null } });
      }
      res.json({ success: true, decision, verified });
    } catch (e) { next(e); }
  });

  app.get('/api/verified-loans', async (_req, res, next) => {
    try {
      res.json(await sql`
        SELECT v.id,v.loan_row_id,v.record_hash,v.previous_hash,v.verified_at,u.name verified_by_name,
          l.loan_id,l.borrower_id,l.loan_type,l.original_principal,l.current_balance,l.payment_status,l.borrower_state,b.filename
        FROM verified_loans v JOIN loans l ON l.id=v.loan_row_id JOIN users u ON u.id=v.verified_by JOIN batches b ON b.id=l.batch_id ORDER BY v.id DESC
      `);
    } catch (e) { next(e); }
  });

  app.get('/api/verified-loans/:id', async (req, res, next) => {
    try {
      const [row] = await sql`SELECT * FROM verified_loans WHERE id=${req.params.id} OR loan_row_id=${req.params.id}`;
      if (!row) return res.status(404).json({ error: 'Verified record not found.' });
      res.json({ ...row, canonical: JSON.parse(String(row.canonical_json)) });
    } catch (e) { next(e); }
  });

  app.get('/api/audit/:loanId', async (req, res, next) => {
    try {
      const [loan] = await sql`SELECT id FROM loans WHERE loan_id=${req.params.loanId} OR id=${req.params.loanId} LIMIT 1`;
      if (!loan) return res.status(404).json({ error: 'Loan not found.' });
      res.json({ integrity: await verifyAuditChain(Number(loan.id)), events: await sql`SELECT * FROM audit_events WHERE loan_row_id=${Number(loan.id)} ORDER BY id` });
    } catch (e) { next(e); }
  });

  app.get('/api/export/verified.csv', async (_req, res, next) => {
    try {
      const { stringify } = await import('csv-stringify/sync');
      const rows = await sql`SELECT l.loan_id,l.borrower_id,l.loan_type,l.origination_date,l.maturity_date,l.original_principal,l.current_balance,l.interest_rate,l.borrower_state,l.payment_status,v.record_hash,v.verified_at,u.name verified_by FROM verified_loans v JOIN loans l ON l.id=v.loan_row_id JOIN users u ON u.id=v.verified_by`;
      res.type('text/csv').attachment('verified-loans.csv').send(stringify(rows, { header: true }));
    } catch (e) { next(e); }
  });

  app.get('/api/export/audit.csv', async (_req, res, next) => {
    try {
      const { stringify } = await import('csv-stringify/sync');
      const rows = await sql`SELECT a.id,l.loan_id,a.event_type,a.description,a.previous_hash,a.event_hash,a.created_at,u.name actor FROM audit_events a LEFT JOIN loans l ON l.id=a.loan_row_id LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id`;
      res.type('text/csv').attachment('audit-trail.csv').send(stringify(rows, { header: true }));
    } catch (e) { next(e); }
  });

  app.post('/api/demo/reset', async (_req, res, next) => {
    try {
      for (const table of ['audit_events','verified_loans','ai_recommendations','reviews','exceptions','loans','batches']) {
        await sql.unsafe(`DELETE FROM ${table}`);
      }
      await seedDemo();
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  if (process.env.NODE_ENV === 'production') {
    const clientPath = process.env.VERCEL ? path.resolve(here, '../public') : path.resolve(here, '../dist/client');
    app.use(express.static(clientPath));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientPath, 'index.html')));
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected server error.' });
  });

  return app;
}
