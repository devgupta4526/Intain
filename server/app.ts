import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, migrate } from './db.js';
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

function seedDemo() {
  const count = (db.prepare('SELECT COUNT(*) count FROM batches').get() as { count: number }).count;
  if (count) return;
  const sample = fs.readFileSync(path.resolve(here, '../data/sample-loan-tape.csv'));
  ingestCsv(sample, 'sample-loan-tape.csv', 1);
}

export function createApp(options: { seed?: boolean } = {}) {
  migrate();
  if (options.seed !== false) seedDemo();
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'Veritas Loan Copilot', time: new Date().toISOString() }));
  app.get('/api/users', (_req, res) => res.json(db.prepare('SELECT id,name,email,role,initials FROM users ORDER BY id').all()));

  app.get('/api/summary', (_req, res) => {
    const totals = db.prepare(`SELECT COUNT(*) total,
      SUM(CASE WHEN validation_status='valid' THEN 1 ELSE 0 END) valid,
      SUM(CASE WHEN validation_status='invalid' THEN 1 ELSE 0 END) invalid FROM loans`).get() as Record<string, number>;
    const exceptions = db.prepare(`SELECT COUNT(*) total,
      SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) open,
      SUM(CASE WHEN severity='critical' AND status='open' THEN 1 ELSE 0 END) critical,
      SUM(CASE WHEN severity='high' AND status='open' THEN 1 ELSE 0 END) high FROM exceptions`).get() as Record<string, number>;
    const verified = (db.prepare('SELECT COUNT(*) count FROM verified_loans').get() as { count: number }).count;
    const qualityScore = totals.total ? Math.round(((totals.valid ?? 0) / totals.total) * 100) : 100;
    const byRule = db.prepare(`SELECT rule_code code, severity, COUNT(*) count FROM exceptions WHERE status='open' GROUP BY rule_code,severity ORDER BY count DESC LIMIT 8`).all();
    const trend = db.prepare(`SELECT substr(created_at,1,10) date, COUNT(*) count FROM audit_events WHERE event_type='VALIDATION_EXECUTED' GROUP BY substr(created_at,1,10) ORDER BY date DESC LIMIT 7`).all().reverse();
    res.json({ loans: totals, exceptions, verified, qualityScore, byRule, trend,
      batches: (db.prepare('SELECT COUNT(*) count FROM batches').get() as { count: number }).count });
  });

  app.get('/api/batches', (_req, res) => res.json(db.prepare(`SELECT b.*,u.name uploaded_by_name,
    (SELECT COUNT(*) FROM exceptions e JOIN loans l ON l.id=e.loan_row_id WHERE l.batch_id=b.id) exception_count
    FROM batches b JOIN users u ON u.id=b.uploaded_by ORDER BY b.id DESC`).all()));

  app.post('/api/upload', upload.single('file'), (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Choose a CSV file to upload.' });
      if (!req.file.originalname.toLowerCase().endsWith('.csv')) return res.status(415).json({ error: 'Only CSV files are supported.' });
      const actorId = Number(req.body.actorId || 1);
      res.status(201).json(ingestCsv(req.file.buffer, req.file.originalname, actorId));
    } catch (error) { next(error); }
  });

  app.get('/api/loans', (req, res) => {
    const search = String(req.query.search ?? '').trim();
    const status = String(req.query.status ?? '');
    const batchId = Number(req.query.batchId ?? 0);
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (search) { clauses.push('(l.loan_id LIKE ? OR l.borrower_id LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (status) { clauses.push('l.validation_status=?'); params.push(status); }
    if (batchId) { clauses.push('l.batch_id=?'); params.push(batchId); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    res.json(db.prepare(`SELECT l.*,b.filename,
      (SELECT COUNT(*) FROM exceptions e WHERE e.loan_row_id=l.id AND e.status='open') open_exception_count,
      (SELECT MAX(CASE severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END) FROM exceptions e WHERE e.loan_row_id=l.id AND e.status='open') severity_rank,
      EXISTS(SELECT 1 FROM verified_loans v WHERE v.loan_row_id=l.id) is_verified
      FROM loans l JOIN batches b ON b.id=l.batch_id ${where} ORDER BY severity_rank DESC,l.id DESC LIMIT 500`).all(...params));
  });

  app.get('/api/loans/:id', (req, res) => {
    const id = Number(req.params.id);
    const loan = db.prepare(`SELECT l.*,b.filename,b.source_hash,u.name uploaded_by_name FROM loans l JOIN batches b ON b.id=l.batch_id JOIN users u ON u.id=b.uploaded_by WHERE l.id=?`).get(id);
    if (!loan) return res.status(404).json({ error: 'Loan not found.' });
    const exceptions = db.prepare(`SELECT e.*,u.name assigned_to_name FROM exceptions e LEFT JOIN users u ON u.id=e.assigned_to WHERE e.loan_row_id=? ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,e.id`).all(id);
    const ai = db.prepare('SELECT * FROM ai_recommendations WHERE loan_row_id=? ORDER BY id DESC').all(id);
    const reviews = db.prepare('SELECT r.*,u.name reviewer_name FROM reviews r JOIN users u ON u.id=r.reviewer_id WHERE r.loan_row_id=? ORDER BY r.id DESC').all(id);
    const auditEvents = db.prepare('SELECT a.*,u.name actor_name FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id WHERE a.loan_row_id=? ORDER BY a.id DESC').all(id).map((row) => {
      const value = row as Record<string, unknown>;
      return { ...value, metadata: JSON.parse(String(value.metadata_json)) };
    });
    const verified = db.prepare('SELECT v.*,u.name verified_by_name FROM verified_loans v JOIN users u ON u.id=v.verified_by WHERE v.loan_row_id=?').get(id);
    res.json({ loan, exceptions, recommendations: ai, reviews, audit: auditEvents, auditIntegrity: verifyAuditChain(id), verified });
  });

  app.get('/api/exceptions', (req, res) => {
    const severity = String(req.query.severity ?? '');
    const status = String(req.query.status ?? 'open');
    const search = String(req.query.search ?? '');
    const clauses = ['e.status=?']; const params: unknown[] = [status];
    if (severity) { clauses.push('e.severity=?'); params.push(severity); }
    if (search) { clauses.push('(l.loan_id LIKE ? OR l.borrower_id LIKE ?)'); params.push(`%${search}%`,`%${search}%`); }
    res.json(db.prepare(`SELECT e.*,l.loan_id,l.borrower_id,l.current_balance,l.original_principal,l.payment_status,l.days_past_due,l.source_system,b.filename,
      (SELECT COUNT(*) FROM ai_recommendations a WHERE a.exception_id=e.id) ai_count
      FROM exceptions e JOIN loans l ON l.id=e.loan_row_id JOIN batches b ON b.id=l.batch_id
      WHERE ${clauses.join(' AND ')} ORDER BY CASE e.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,e.id DESC`).all(...params));
  });

  app.post('/api/exceptions/:id/ai', (req, res, next) => {
    try { res.status(201).json(generateRecommendation(Number(req.params.id), Number(req.body.actorId || 2))); }
    catch (error) { next(error); }
  });

  app.post('/api/ai/:id/action', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const body = asObject(req.body);
      const action = String(body.action ?? '');
      if (!['accepted','rejected','edited'].includes(action)) return res.status(400).json({ error: 'Action must be accepted, rejected, or edited.' });
      const recommendation = db.prepare('SELECT * FROM ai_recommendations WHERE id=?').get(id) as Record<string, unknown> | undefined;
      if (!recommendation) return res.status(404).json({ error: 'Recommendation not found.' });
      const actorId = Number(body.actorId || 2);
      db.prepare('UPDATE ai_recommendations SET status=?, acted_at=?, acted_by=? WHERE id=?').run(action, new Date().toISOString(), actorId, id);
      audit({ loanRowId: Number(recommendation.loan_row_id), actorId, eventType: `AI_RECOMMENDATION_${action.toUpperCase()}`, description: `Reviewer ${action} AI recommendation ${id}.`, metadata: { recommendationId: id, action, note: body.note ?? null } });
      res.json({ success: true, status: action });
    } catch (error) { next(error); }
  });

  app.patch('/api/loans/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id); const body = asObject(req.body); const actorId = Number(body.actorId || 2);
      const changes = asObject(body.changes); const before = db.prepare('SELECT * FROM loans WHERE id=?').get(id) as Record<string, unknown> | undefined;
      if (!before) return res.status(404).json({ error: 'Loan not found.' });
      const safe = Object.entries(changes).filter(([key]) => editableFields.has(key));
      if (!safe.length) return res.status(400).json({ error: 'No editable fields supplied.' });
      const normalized = safe.map(([key, value]) => [key, numericFields.has(key) ? (value === '' ? null : Number(value)) : (value === '' ? null : String(value))] as const);
      db.prepare(`UPDATE loans SET ${normalized.map(([key]) => `${key}=?`).join(',')} WHERE id=?`).run(...normalized.map(([,value]) => value), id);
      const issues = runValidation(id);
      audit({ loanRowId: id, actorId, eventType: 'FIELD_EDITED', description: `${normalized.length} field${normalized.length === 1 ? '' : 's'} updated by reviewer.`, metadata: { changes: Object.fromEntries(normalized), previous: Object.fromEntries(normalized.map(([key]) => [key,before[key]])), remainingIssues: issues.length } });
      res.json({ success: true, issues, loan: db.prepare('SELECT * FROM loans WHERE id=?').get(id) });
    } catch (error) { next(error); }
  });

  app.post('/api/loans/:id/review', (req, res, next) => {
    try {
      const id = Number(req.params.id); const body = asObject(req.body);
      const decision = String(body.decision ?? ''); const reviewerId = Number(body.reviewerId || 2);
      if (!['approved','rejected','correction_requested'].includes(decision)) return res.status(400).json({ error: 'Invalid review decision.' });
      const loan = db.prepare('SELECT * FROM loans WHERE id=?').get(id) as Record<string, unknown> | undefined;
      if (!loan) return res.status(404).json({ error: 'Loan not found.' });
      const now = new Date().toISOString();
      db.prepare('INSERT INTO reviews (loan_row_id,reviewer_id,decision,comment,created_at) VALUES (?,?,?,?,?)').run(id, reviewerId, decision, String(body.comment ?? ''), now);
      db.prepare("UPDATE exceptions SET status=?, resolved_at=?, assigned_to=? WHERE loan_row_id=? AND status='open'").run(decision, now, reviewerId, id);
      audit({ loanRowId: id, actorId: reviewerId, eventType: `LOAN_${decision.toUpperCase()}`, description: `Loan ${decision.replace('_',' ')} by reviewer.`, metadata: { decision, comment: body.comment ?? '' } });
      let verified = null;
      if (decision === 'approved') {
        const excluded = new Set(['id','raw_json','validation_status','created_at']);
        const canonical = Object.fromEntries(Object.entries(loan).filter(([key]) => !excluded.has(key)));
        const previous = db.prepare('SELECT record_hash FROM verified_loans ORDER BY id DESC LIMIT 1').get() as { record_hash: string } | undefined;
        const recordHash = sha256(stableStringify(canonical) + (previous?.record_hash ?? 'GENESIS'));
        db.prepare(`INSERT INTO verified_loans (loan_row_id,canonical_json,record_hash,previous_hash,verified_by,verified_at)
          VALUES (?,?,?,?,?,?) ON CONFLICT(loan_row_id) DO UPDATE SET canonical_json=excluded.canonical_json,record_hash=excluded.record_hash,previous_hash=excluded.previous_hash,verified_by=excluded.verified_by,verified_at=excluded.verified_at`)
          .run(id, stableStringify(canonical), recordHash, previous?.record_hash ?? null, reviewerId, now);
        verified = db.prepare('SELECT * FROM verified_loans WHERE loan_row_id=?').get(id);
        audit({ loanRowId: id, actorId: reviewerId, eventType: 'VERIFIED_RECORD_CREATED', description: 'Canonical record sealed with a SHA-256 lineage hash.', metadata: { recordHash, previousHash: previous?.record_hash ?? null } });
      }
      res.json({ success: true, decision, verified });
    } catch (error) { next(error); }
  });

  app.get('/api/verified-loans', (_req, res) => res.json(db.prepare(`SELECT v.id,v.loan_row_id,v.record_hash,v.previous_hash,v.verified_at,u.name verified_by_name,
    l.loan_id,l.borrower_id,l.loan_type,l.original_principal,l.current_balance,l.payment_status,l.borrower_state,b.filename
    FROM verified_loans v JOIN loans l ON l.id=v.loan_row_id JOIN users u ON u.id=v.verified_by JOIN batches b ON b.id=l.batch_id ORDER BY v.id DESC`).all()));
  app.get('/api/verified-loans/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM verified_loans WHERE id=? OR loan_row_id=?').get(req.params.id, req.params.id) as Record<string, unknown> | undefined;
    if (!row) return res.status(404).json({ error: 'Verified record not found.' });
    res.json({ ...row, canonical: JSON.parse(String(row.canonical_json)) });
  });
  app.get('/api/audit/:loanId', (req, res) => {
    const loan = db.prepare('SELECT id FROM loans WHERE loan_id=? OR id=? LIMIT 1').get(req.params.loanId, req.params.loanId) as { id: number } | undefined;
    if (!loan) return res.status(404).json({ error: 'Loan not found.' });
    res.json({ integrity: verifyAuditChain(loan.id), events: db.prepare('SELECT * FROM audit_events WHERE loan_row_id=? ORDER BY id').all(loan.id) });
  });

  app.get('/api/export/verified.csv', async (_req, res, next) => {
    try {
      const { stringify } = await import('csv-stringify/sync');
      const rows = db.prepare(`SELECT l.loan_id,l.borrower_id,l.loan_type,l.origination_date,l.maturity_date,l.original_principal,l.current_balance,l.interest_rate,l.borrower_state,l.payment_status,v.record_hash,v.verified_at,u.name verified_by FROM verified_loans v JOIN loans l ON l.id=v.loan_row_id JOIN users u ON u.id=v.verified_by`).all();
      res.type('text/csv').attachment('verified-loans.csv').send(stringify(rows, { header: true }));
    } catch (error) { next(error); }
  });
  app.get('/api/export/audit.csv', async (_req, res, next) => {
    try {
      const { stringify } = await import('csv-stringify/sync');
      const rows = db.prepare(`SELECT a.id,l.loan_id,a.event_type,a.description,a.previous_hash,a.event_hash,a.created_at,u.name actor FROM audit_events a LEFT JOIN loans l ON l.id=a.loan_row_id LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id`).all();
      res.type('text/csv').attachment('audit-trail.csv').send(stringify(rows, { header: true }));
    } catch (error) { next(error); }
  });

  app.post('/api/demo/reset', (_req, res) => {
    db.transaction(() => {
      for (const table of ['audit_events','verified_loans','ai_recommendations','reviews','exceptions','loans','batches']) db.prepare(`DELETE FROM ${table}`).run();
      db.prepare("DELETE FROM sqlite_sequence WHERE name != 'users'").run();
    })();
    seedDemo();
    res.json({ success: true });
  });

  if (process.env.NODE_ENV === 'production') {
    const clientPath = path.resolve(here, '../dist/client');
    app.use(express.static(clientPath));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientPath, 'index.html')));
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected server error.' });
  });
  return app;
}

