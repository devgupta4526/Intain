import crypto from 'node:crypto';
import { db } from './db.js';

type AuditInput = {
  loanRowId?: number | null;
  batchId?: number | null;
  actorId?: number | null;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
};

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(',')}}`;
}

export function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function audit(input: AuditInput) {
  const createdAt = new Date().toISOString();
  const previous = db.prepare(`
    SELECT event_hash FROM audit_events
    WHERE (? IS NOT NULL AND loan_row_id = ?) OR (? IS NULL AND loan_row_id IS NULL)
    ORDER BY id DESC LIMIT 1
  `).get(input.loanRowId ?? null, input.loanRowId ?? null, input.loanRowId ?? null) as { event_hash: string } | undefined;
  const metadataJson = stableStringify(input.metadata ?? {});
  const payload = stableStringify({ ...input, metadata: input.metadata ?? {}, createdAt, previousHash: previous?.event_hash ?? null });
  const eventHash = sha256(payload);
  return db.prepare(`
    INSERT INTO audit_events
      (loan_row_id,batch_id,actor_id,event_type,description,metadata_json,previous_hash,event_hash,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(input.loanRowId ?? null, input.batchId ?? null, input.actorId ?? null, input.eventType,
    input.description, metadataJson, previous?.event_hash ?? null, eventHash, createdAt);
}

export function verifyAuditChain(loanRowId: number) {
  const events = db.prepare('SELECT * FROM audit_events WHERE loan_row_id = ? ORDER BY id').all(loanRowId) as Array<Record<string, unknown>>;
  let expectedPrevious: string | null = null;
  for (const event of events) {
    if ((event.previous_hash ?? null) !== expectedPrevious) return { valid: false, eventId: event.id, count: events.length };
    expectedPrevious = String(event.event_hash);
  }
  return { valid: true, count: events.length, head: expectedPrevious };
}

