export type Role = 'operator' | 'reviewer' | 'consumer';
export type User = { id: number; name: string; email: string; role: Role; initials: string };
export type Summary = {
  loans: { total: number; valid: number; invalid: number };
  exceptions: { total: number; open: number; critical: number; high: number };
  verified: number; qualityScore: number; batches: number;
  byRule: Array<{ code: string; severity: string; count: number }>;
};
export type Loan = Record<string, unknown> & {
  id: number; loan_id: string | null; borrower_id: string | null; loan_type: string;
  original_principal: number | null; current_balance: number | null; interest_rate: number | null;
  payment_status: string | null; validation_status: string; open_exception_count: number;
  borrower_state: string | null; filename: string; is_verified: number;
};
export type ExceptionRecord = {
  id: number; loan_row_id: number; rule_code: string; field_name: string | null; severity: string;
  message: string; current_value: string | null; suggested_value: string | null; status: string;
  loan_id: string | null; borrower_id: string | null; source_system: string; ai_count: number;
};

