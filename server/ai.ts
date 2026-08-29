import { db } from './db.js';
import { audit } from './audit.js';

const guidance: Record<string, { recommendation: string; confidence: number }> = {
  BALANCE_EXCEEDS_PRINCIPAL: { recommendation: 'Reconcile against the latest servicer statement; cap only after confirming whether fees were incorrectly included.', confidence: 0.91 },
  STATUS_DPD_CONFLICT: { recommendation: 'Update payment status to late if days past due is confirmed by servicing data.', confidence: 0.94 },
  CLOSED_WITH_BALANCE: { recommendation: 'Do not auto-zero the balance. Request payoff confirmation and the latest remittance record.', confidence: 0.97 },
  INVALID_STATE: { recommendation: 'Normalize the value to a USPS two-letter state code after borrower-address evidence is checked.', confidence: 0.86 },
  STALE_RECORD: { recommendation: 'Request a fresh servicer update before downstream consumption.', confidence: 0.98 },
  DOCUMENT_MISSING: { recommendation: 'Route to document operations and keep this record outside the verified export.', confidence: 0.96 },
  DUPLICATE_LOAN_ID: { recommendation: 'Compare source lineage and retain the most recently updated authoritative record.', confidence: 0.89 },
};

export function generateRecommendation(exceptionId: number, actorId = 2) {
  const row = db.prepare(`SELECT e.*, l.loan_id, l.borrower_id, l.payment_status, l.days_past_due,
    l.current_balance, l.original_principal, l.source_system FROM exceptions e JOIN loans l ON l.id=e.loan_row_id WHERE e.id=?`).get(exceptionId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Exception not found');
  const configured = guidance[String(row.rule_code)] ?? { recommendation: 'Compare the source row with authoritative servicing evidence and request correction if the discrepancy cannot be resolved.', confidence: 0.78 };
  const prompt = `Explain ${row.rule_code} for loan ${row.loan_id ?? 'without ID'} using only the supplied record. Recommend a human-review action; never make a credit or underwriting decision.`;
  const explanation = `${row.message} The normalized value (${row.current_value ?? 'missing'}) conflicts with the configured ${row.rule_code} control. This is a data-quality finding, not an underwriting judgment.`;
  const patch = row.suggested_value && row.field_name ? JSON.stringify({ [String(row.field_name)]: row.suggested_value }) : null;
  const now = new Date().toISOString();
  const result = db.prepare(`INSERT INTO ai_recommendations
    (loan_row_id,exception_id,explanation,recommendation,suggested_patch,confidence,severity,model,prompt,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(row.loan_row_id, exceptionId, explanation, configured.recommendation, patch,
      configured.confidence, row.severity, process.env.OPENAI_API_KEY ? (process.env.OPENAI_MODEL ?? 'configured-model') : 'veritas-rules-v1', prompt, now);
  audit({ loanRowId: Number(row.loan_row_id), actorId, eventType: 'AI_RECOMMENDATION_GENERATED', description: 'AI recommendation generated and held for human review.', metadata: { recommendationId: Number(result.lastInsertRowid), model: process.env.OPENAI_API_KEY ? (process.env.OPENAI_MODEL ?? 'configured-model') : 'veritas-rules-v1', confidence: configured.confidence } });
  return db.prepare('SELECT * FROM ai_recommendations WHERE id=?').get(result.lastInsertRowid);
}

