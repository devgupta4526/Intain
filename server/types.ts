export type Role = 'operator' | 'reviewer' | 'consumer';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type ReviewStatus = 'open' | 'approved' | 'rejected' | 'correction_requested';

export interface LoanRecord {
  id?: number;
  batch_id: number;
  row_number: number;
  loan_id: string | null;
  borrower_id: string | null;
  loan_type: string | null;
  origination_date: string | null;
  maturity_date: string | null;
  original_principal: number | null;
  current_balance: number | null;
  interest_rate: number | null;
  term_months: number | null;
  borrower_state: string | null;
  loan_purpose: string | null;
  credit_grade: string | null;
  employment_length: string | null;
  income_band: string | null;
  payment_status: string | null;
  days_past_due: number | null;
  servicer_name: string | null;
  last_payment_date: string | null;
  last_updated_at: string | null;
  document_status: string | null;
  source_system: string | null;
  raw_json: string;
  validation_status?: 'valid' | 'invalid' | 'pending';
}

