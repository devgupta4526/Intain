import crypto from 'node:crypto';
import { sql } from './db.js';

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

export async function audit(input: AuditInput) {
  const createdAt = new Date().toISOString();
  const loanId = input.loanRowId ?? null;
  const previous = loanId
    ? await sql`SELECT event_hash FROM audit_events WHERE loan_row_id = ${loanId} ORDER BY id DESC LIMIT 1`
    : await sql`SELECT event_hash FROM audit_events WHERE loan_row_id IS NULL ORDER BY id DESC LIMIT 1`;
  const previousHash = previous[0]?.event_hash ?? null;
  const metadataJson = stableStringify(input.metadata ?? {});
  const payload = stableStringify({ ...input, metadata: input.metadata ?? {}, createdAt, previousHash });
  const eventHash = sha256(payload);
  await sql`
    INSERT INTO audit_events (loan_row_id,batch_id,actor_id,event_type,description,metadata_json,previous_hash,event_hash,created_at)
    VALUES (${loanId},${input.batchId ?? null},${input.actorId ?? null},${input.eventType},${input.description},${metadataJson},${previousHash},${eventHash},${createdAt})
  `;
  return { eventHash, previousHash };
}

export async function verifyAuditChain(loanRowId: number) {
  const events = await sql<Array<Record<string, unknown>>>`SELECT * FROM audit_events WHERE loan_row_id = ${loanRowId} ORDER BY id`;
  let expectedPrevious: string | null = null;
  for (const event of events) {
    if ((event.previous_hash ?? null) !== expectedPrevious) return { valid: false, eventId: event.id, count: events.length, head: expectedPrevious };
    expectedPrevious = String(event.event_hash);
  }
  return { valid: true, count: events.length, head: expectedPrevious };
}
