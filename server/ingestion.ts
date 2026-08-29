import { parse } from 'csv-parse/sync';
import { db } from './db.js';
import { audit, sha256 } from './audit.js';
import { runValidation } from './validation.js';
import type { LoanRecord } from './types.js';

const text = (value: unknown) => value == null || String(value).trim() === '' ? null : String(value).trim();
const number = (value: unknown) => {
  const cleaned = String(value ?? '').replace(/[$,%\s,]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};
const integer = (value: unknown) => {
  const parsed = number(value);
  return parsed === null ? null : Math.round(parsed);
};
const date = (value: unknown) => {
  const raw = text(value);
  if (!raw) return null;
  const iso = /^\d{4}-\d{2}-\d{2}/.test(raw) ? new Date(raw) : new Date(raw.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$1-$2'));
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString().slice(0, 10);
};
const timestamp = (value: unknown) => {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export function normalize(raw: Record<string, unknown>, batchId: number, rowNumber: number): LoanRecord {
  const rateRaw = number(raw.interest_rate);
  return {
    batch_id: batchId,
    row_number: rowNumber,
    loan_id: text(raw.loan_id), borrower_id: text(raw.borrower_id), loan_type: text(raw.loan_type)?.toLowerCase() ?? null,
    origination_date: date(raw.origination_date), maturity_date: date(raw.maturity_date),
    original_principal: number(raw.original_principal), current_balance: number(raw.current_balance),
    interest_rate: rateRaw !== null && rateRaw > 1 ? rateRaw / 100 : rateRaw,
    term_months: integer(raw.term_months), borrower_state: text(raw.borrower_state)?.toUpperCase() ?? null,
    loan_purpose: text(raw.loan_purpose)?.toLowerCase() ?? null, credit_grade: text(raw.credit_grade)?.toUpperCase() ?? null,
    employment_length: text(raw.employment_length), income_band: text(raw.income_band),
    payment_status: text(raw.payment_status)?.toLowerCase() ?? null, days_past_due: integer(raw.days_past_due),
    servicer_name: text(raw.servicer_name), last_payment_date: date(raw.last_payment_date),
    last_updated_at: timestamp(raw.last_updated_at), document_status: text(raw.document_status)?.toLowerCase() ?? null,
    source_system: text(raw.source_system), raw_json: JSON.stringify(raw),
  };
}

export function ingestCsv(buffer: Buffer, filename: string, actorId = 1) {
  const rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true }) as Array<Record<string, unknown>>;
  const now = new Date().toISOString();
  const batchResult = db.prepare(`INSERT INTO batches
    (filename,source_hash,uploaded_by,uploaded_at,total_rows,status) VALUES (?,?,?,?,?,'processing')`)
    .run(filename, sha256(buffer), actorId, now, rows.length);
  const batchId = Number(batchResult.lastInsertRowid);
  audit({ batchId, actorId, eventType: 'FILE_UPLOADED', description: `${filename} uploaded with ${rows.length} source rows.`, metadata: { filename, sha256: sha256(buffer), size: buffer.length } });

  const columns = ['batch_id','row_number','loan_id','borrower_id','loan_type','origination_date','maturity_date','original_principal','current_balance','interest_rate','term_months','borrower_state','loan_purpose','credit_grade','employment_length','income_band','payment_status','days_past_due','servicer_name','last_payment_date','last_updated_at','document_status','source_system','raw_json'];
  const placeholders = columns.map(() => '?').join(',');
  const insert = db.prepare(`INSERT INTO loans (${columns.join(',')},created_at) VALUES (${placeholders},?)`);
  let imported = 0;
  let failed = 0;
  const loanIds: number[] = [];
  const transaction = db.transaction(() => {
    rows.forEach((raw, index) => {
      try {
        const loan = normalize(raw, batchId, index + 2);
        const result = insert.run(...columns.map((column) => loan[column as keyof LoanRecord] ?? null), now);
        const loanRowId = Number(result.lastInsertRowid);
        loanIds.push(loanRowId);
        imported++;
        audit({ loanRowId, batchId, actorId, eventType: 'LOAN_IMPORTED', description: `Source row ${index + 2} normalized into the canonical schema.`, metadata: { sourceRow: index + 2, loanId: loan.loan_id } });
      } catch { failed++; }
    });
  });
  transaction();
  for (const loanRowId of loanIds) {
    const issues = runValidation(loanRowId);
    audit({ loanRowId, batchId, actorId, eventType: 'VALIDATION_EXECUTED', description: issues.length ? `${issues.length} validation exceptions detected.` : 'Record passed all validation rules.', metadata: { issueCount: issues.length, rules: issues.map((value) => value.ruleCode) } });
  }
  db.prepare("UPDATE batches SET imported_rows=?, failed_rows=?, status='complete' WHERE id=?").run(imported, failed, batchId);
  return { batchId, filename, totalRows: rows.length, importedRows: imported, failedRows: failed, exceptions: db.prepare(`SELECT COUNT(*) count FROM exceptions e JOIN loans l ON l.id=e.loan_row_id WHERE l.batch_id=?`).get(batchId) };
}

