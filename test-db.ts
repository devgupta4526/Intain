import { sql } from './server/db.js';

async function run() {
  const loans = await sql`SELECT id, validation_status FROM loans`;
  console.log('Loans:', loans);
  process.exit(0);
}

run();
