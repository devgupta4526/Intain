import { describe, expect, it } from 'vitest';
import { validateLoan } from './validation.js';
import type { LoanRecord } from './types.js';

const valid: LoanRecord = {
  batch_id: 1, row_number: 2, loan_id: 'LN-T01', borrower_id: 'BR-T01', loan_type: 'personal',
  origination_date: '2025-01-01', maturity_date: '2028-01-01', original_principal: 20000,
  current_balance: 14000, interest_rate: 0.08, term_months: 36, borrower_state: 'CA',
  loan_purpose: 'home', credit_grade: 'A', employment_length: '5 years', income_band: '50k-75k',
  payment_status: 'current', days_past_due: 0, servicer_name: 'Test Servicer', last_payment_date: '2026-08-01',
  last_updated_at: new Date().toISOString(), document_status: 'complete', source_system: 'test', raw_json: '{}',
};

describe('validation engine', () => {
  it('passes a clean record', () => expect(validateLoan(valid)).toEqual([]));
  it('detects cross-field balance and status contradictions', () => {
    const issues = validateLoan({ ...valid, current_balance: 25000, payment_status: 'closed', days_past_due: 15 });
    expect(issues.map((value) => value.ruleCode)).toEqual(expect.arrayContaining(['BALANCE_EXCEEDS_PRINCIPAL','CLOSED_WITH_BALANCE']));
  });
  it('rejects invalid dates, state codes, and rates', () => {
    const issues = validateLoan({ ...valid, maturity_date: '2024-01-01', borrower_state: 'XX', interest_rate: 0.41 });
    expect(issues.map((value) => value.ruleCode)).toEqual(expect.arrayContaining(['MATURITY_BEFORE_ORIGINATION','INVALID_STATE','RATE_OUT_OF_RANGE']));
  });
});

