try { process.loadEnvFile(); } catch {}
import { createApp } from './app.js';

await createApp();
console.log('Database schema and demo loan tape ready.');
