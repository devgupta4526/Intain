import { db } from './db.js';
import type { LoanRecord, Severity } from './types.js';

export type ValidationIssue = {
  ruleCode: string;
  fieldName?: keyof LoanRecord;
  severity: Severity;
  message: string;
  currentValue?: unknown;
  suggestedValue?: unknown;
};

const states = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC']);
const paymentStatuses = new Set(['current', 'late', 'delinquent', 'default', 'closed']);

const issue = (ruleCode: string, severity: Severity, message: string, fieldName?: keyof LoanRecord, currentValue?: unknown, suggestedValue?: unknown): ValidationIssue =>
  ({ ruleCode, severity, message, fieldName, currentValue, suggestedValue });

export function validateLoan(loan: LoanRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!loan.loan_id) issues.push(issue('REQUIRED_LOAN_ID', 'critical', 'Loan ID is required for lineage and reconciliation.', 'loan_id', loan.loan_id));
  if (!loan.borrower_id) issues.push(issue('REQUIRED_BORROWER_ID', 'high', 'Borrower ID is missing.', 'borrower_id', loan.borrower_id));
  if (!loan.origination_date) issues.push(issue('INVALID_ORIGINATION_DATE', 'high', 'Origination date is missing or invalid.', 'origination_date', loan.origination_date));
  if (!loan.maturity_date) issues.push(issue('INVALID_MATURITY_DATE', 'high', 'Maturity date is missing or invalid.', 'maturity_date', loan.maturity_date));
  if (loan.origination_date && loan.maturity_date && loan.maturity_date <= loan.origination_date) {
    issues.push(issue('MATURITY_BEFORE_ORIGINATION', 'critical', 'Maturity date must fall after origination date.', 'maturity_date', loan.maturity_date));
  }
  if (loan.original_principal === null || loan.original_principal < 0) issues.push(issue('INVALID_PRINCIPAL', 'critical', 'Original principal must be a non-negative number.', 'original_principal', loan.original_principal));
  if (loan.current_balance === null || loan.current_balance < 0) issues.push(issue('INVALID_BALANCE', 'critical', 'Current balance must be a non-negative number.', 'current_balance', loan.current_balance));
  if (loan.original_principal !== null && loan.current_balance !== null && loan.current_balance > loan.original_principal) {
    issues.push(issue('BALANCE_EXCEEDS_PRINCIPAL', 'high', 'Current balance exceeds original principal.', 'current_balance', loan.current_balance, loan.original_principal));
  }
  if (loan.interest_rate === null || loan.interest_rate < 0 || loan.interest_rate > 0.35) {
    issues.push(issue('RATE_OUT_OF_RANGE', 'high', 'Interest rate must be between 0% and 35%.', 'interest_rate', loan.interest_rate));
  }
  if (!loan.payment_status || !paymentStatuses.has(loan.payment_status)) {
    issues.push(issue('INVALID_PAYMENT_STATUS', 'medium', 'Payment status is not recognized.', 'payment_status', loan.payment_status));
  }
  if (loan.payment_status === 'current' && (loan.days_past_due ?? 0) > 0) {
    issues.push(issue('STATUS_DPD_CONFLICT', 'high', 'A current loan cannot have days past due.', 'payment_status', loan.payment_status, 'late'));
  }
  if (loan.payment_status === 'closed' && (loan.current_balance ?? 0) > 0) {
    issues.push(issue('CLOSED_WITH_BALANCE', 'critical', 'A closed loan still has a positive balance.', 'current_balance', loan.current_balance, 0));
  }
  if (!loan.document_status || loan.document_status === 'missing') issues.push(issue('DOCUMENT_MISSING', 'medium', 'Required document package is unavailable.', 'document_status', loan.document_status, 'complete'));
  if (!loan.borrower_state || !states.has(loan.borrower_state)) issues.push(issue('INVALID_STATE', 'medium', 'Borrower state must be a valid two-letter US code.', 'borrower_state', loan.borrower_state));
  if (loan.last_updated_at) {
    const ageDays = (Date.now() - new Date(loan.last_updated_at).getTime()) / 86_400_000;
    if (ageDays > 180) issues.push(issue('STALE_RECORD', 'low', `Record has not been updated in ${Math.floor(ageDays)} days.`, 'last_updated_at', loan.last_updated_at));
  }
  return issues;
}

export function runValidation(loanRowId: number) {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanRowId) as LoanRecord | undefined;
  if (!loan) throw new Error('Loan not found');
  const issues = validateLoan(loan);

  if (loan.loan_id) {
    const duplicate = db.prepare('SELECT id FROM loans WHERE loan_id = ? AND id != ? LIMIT 1').get(loan.loan_id, loanRowId) as { id: number } | undefined;
    if (duplicate) issues.push(issue('DUPLICATE_LOAN_ID', 'critical', `Loan ID also appears on row ${duplicate.id}.`, 'loan_id', loan.loan_id));
  }
  if (loan.borrower_id && loan.original_principal !== null && loan.origination_date) {
    const repeat = db.prepare(`SELECT id FROM loans WHERE borrower_id = ? AND original_principal = ? AND origination_date = ? AND id != ? LIMIT 1`)
      .get(loan.borrower_id, loan.original_principal, loan.origination_date, loanRowId) as { id: number } | undefined;
    if (repeat) issues.push(issue('SUSPICIOUS_REPEAT', 'high', `Borrower, amount, and origination date match row ${repeat.id}.`, 'borrower_id', loan.borrower_id));
  }

  const insert = db.prepare(`INSERT INTO exceptions
    (loan_row_id,rule_code,field_name,severity,message,current_value,suggested_value,status,created_at)
    VALUES (?,?,?,?,?,?,?,'open',?)
    ON CONFLICT(loan_row_id,rule_code) DO UPDATE SET
      field_name=excluded.field_name,severity=excluded.severity,message=excluded.message,
      current_value=excluded.current_value,suggested_value=excluded.suggested_value,
      status='open',resolved_at=NULL`);
  const now = new Date().toISOString();
  const transaction = db.transaction(() => {
    db.prepare("UPDATE exceptions SET status='corrected',resolved_at=? WHERE loan_row_id=? AND status='open'").run(now, loanRowId);
    for (const value of issues) insert.run(loanRowId, value.ruleCode, value.fieldName ?? null, value.severity,
      value.message, value.currentValue == null ? null : String(value.currentValue), value.suggestedValue == null ? null : String(value.suggestedValue), now);
    db.prepare('UPDATE loans SET validation_status = ? WHERE id = ?').run(issues.length ? 'invalid' : 'valid', loanRowId);
  });
  transaction();
  return issues;
}
