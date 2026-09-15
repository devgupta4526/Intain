import { sql } from './db.js';
import { audit } from './audit.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateRecommendation(exceptionId: number, actorId = 2) {
  const rows = await sql`
    SELECT e.*, l.loan_id, l.borrower_id, l.payment_status, l.days_past_due,
      l.current_balance, l.original_principal, l.source_system
    FROM exceptions e JOIN loans l ON l.id=e.loan_row_id
    WHERE e.id=${exceptionId}
  `;
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error('Exception not found');

  const prompt = `Analyze this data quality exception for loan ${row.loan_id ?? 'without ID'} and rule ${row.rule_code}.
Exception Message: ${row.message}
Normalized Value: ${row.current_value ?? 'missing'}
Provided Record Data:
${JSON.stringify(row, null, 2)}

Provide a human-review recommendation. NEVER make a credit or underwriting decision.
Return a JSON object strictly matching this schema:
{
  "explanation": "A clear explanation of why this exception was flagged based on the data.",
  "recommendation": "The recommended action for a human reviewer to take.",
  "confidence": <number between 0 and 1 representing your confidence in this recommendation>,
  "suggested_patch": <optional JSON object with the field name and suggested value to fix the issue, or null>
}`;

  const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
  let explanation = `${row.message} The normalized value (${row.current_value ?? 'missing'}) conflicts with the configured ${row.rule_code} control. This is a data-quality finding, not an underwriting judgment.`;
  let recommendation = 'Compare the source row with authoritative servicing evidence and request correction if the discrepancy cannot be resolved.';
  let confidence = 0.78;
  let patch = row.suggested_value && row.field_name ? JSON.stringify({ [String(row.field_name)]: row.suggested_value }) : null;

  try {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set.");
    
    const generativeModel = genAI.getGenerativeModel({
      model: model,
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const result = await generativeModel.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    if (parsed.explanation) explanation = parsed.explanation;
    if (parsed.recommendation) recommendation = parsed.recommendation;
    if (typeof parsed.confidence === 'number') confidence = parsed.confidence;
    if (parsed.suggested_patch) patch = JSON.stringify(parsed.suggested_patch);
  } catch (error) {
    console.error("Gemini API Error:", error);
  }

  const now = new Date().toISOString();

  const [rec] = await sql`
    INSERT INTO ai_recommendations (loan_row_id,exception_id,explanation,recommendation,suggested_patch,confidence,severity,model,prompt,created_at)
    VALUES (${Number(row.loan_row_id)},${exceptionId},${explanation},${recommendation},${patch},${confidence},${String(row.severity)},${model},${prompt},${now})
    RETURNING *
  `;
  await audit({
    loanRowId: Number(row.loan_row_id),
    actorId,
    eventType: 'AI_RECOMMENDATION_GENERATED',
    description: 'AI recommendation generated and held for human review.',
    metadata: { recommendationId: Number(rec.id), model, confidence }
  });
  return rec;
}
