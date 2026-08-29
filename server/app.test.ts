import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';

const app = createApp({ seed: false });

beforeAll(async () => { await request(app).post('/api/demo/reset').expect(200); });

describe('end-to-end verification API', () => {
  it('reports a healthy seeded portfolio', async () => {
    const response = await request(app).get('/api/summary').expect(200);
    expect(response.body.loans.total).toBe(12);
    expect(response.body.exceptions.open).toBeGreaterThan(0);
  });
  it('generates a separate, pending AI recommendation', async () => {
    const queue = await request(app).get('/api/exceptions?status=open').expect(200);
    const exception = queue.body.find((item: { rule_code: string }) => item.rule_code === 'STATUS_DPD_CONFLICT');
    const response = await request(app).post(`/api/exceptions/${exception.id}/ai`).send({ actorId: 2 }).expect(201);
    expect(response.body.status).toBe('pending');
    expect(response.body.model).toBe('veritas-rules-v1');
    const detailBefore = await request(app).get(`/api/loans/${exception.loan_row_id}`).expect(200);
    await request(app).patch(`/api/loans/${exception.loan_row_id}`).send({ actorId: 2, changes: { payment_status: 'late' } }).expect(200);
    const detailAfter = await request(app).get(`/api/loans/${exception.loan_row_id}`).expect(200);
    expect(detailAfter.body.recommendations).toHaveLength(detailBefore.body.recommendations.length);
    expect(detailAfter.body.exceptions.find((item: { rule_code: string }) => item.rule_code === 'STATUS_DPD_CONFLICT').status).toBe('corrected');
  });
  it('creates a hashed verified record only after human approval', async () => {
    const loans = await request(app).get('/api/loans').expect(200);
    const clean = loans.body.find((loan: { validation_status: string }) => loan.validation_status === 'valid');
    const response = await request(app).post(`/api/loans/${clean.id}/review`).send({ reviewerId: 2, decision: 'approved', comment: 'Test evidence accepted.' }).expect(200);
    expect(response.body.verified.record_hash).toMatch(/^[a-f0-9]{64}$/);
    const detail = await request(app).get(`/api/loans/${clean.id}`).expect(200);
    expect(detail.body.auditIntegrity.valid).toBe(true);
  });
  it('serves required consumer and audit APIs', async () => {
    const verified = await request(app).get('/api/verified-loans').expect(200);
    expect(verified.body).toHaveLength(1);
    await request(app).get(`/api/audit/${verified.body[0].loan_id}`).expect(200);
    await request(app).get('/api/export/verified.csv').expect('Content-Type', /text\/csv/).expect(200);
  });
});
