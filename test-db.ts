import { sql } from './server/db.js';

async function run() {
  const users = await sql`SELECT * FROM users`;
  console.log('Users:', users);
  process.exit(0);
}

run();
