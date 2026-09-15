import { createApp } from './server/app.js';
import http from 'node:http';

async function test() {
  try { process.loadEnvFile(); } catch {}
  
  const app = await createApp({ seed: false });
  const server = http.createServer(app);
  
  await new Promise<void>((resolve) => server.listen(4001, () => resolve()));
  console.log('Test server running on 4001');

  async function fetchJSON(path: string, options: any = {}) {
    const res = await fetch(`http://localhost:4001${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}: ${await res.text()}`);
    return res.json();
  }

  try {
    console.log('GET /api/users');
    await fetchJSON('/api/users');
    
    console.log('GET /api/summary');
    await fetchJSON('/api/summary');

    console.log('GET /api/batches');
    const batches = await fetchJSON('/api/batches');

    console.log('GET /api/loans');
    const loans = await fetchJSON('/api/loans');
    
    if (loans.length > 0) {
      console.log('GET /api/loans/:id');
      await fetchJSON(`/api/loans/${loans[0].id}`);
    }

    console.log('GET /api/exceptions');
    const exceptions = await fetchJSON('/api/exceptions');

    if (exceptions.length > 0) {
      // Test the AI generation route? We won't actually hit OpenAI, it will use dummy if no key.
      // But maybe we don't want to trigger it if not necessary.
    }

    console.log('GET /api/verified-loans');
    await fetchJSON('/api/verified-loans');

    console.log('GET /api/export/audit.csv');
    const auditCsv = await fetch(`http://localhost:4001/api/export/audit.csv`);
    if (!auditCsv.ok) throw new Error('Audit export failed');

    console.log('GET /api/export/verified.csv');
    const verCsv = await fetch(`http://localhost:4001/api/export/verified.csv`);
    if (!verCsv.ok) throw new Error('Verified export failed');

    console.log('All GET endpoints succeeded!');
  } catch (err) {
    console.error('Test failed!', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}
test();
