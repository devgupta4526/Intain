try { process.loadEnvFile(); } catch {}
import { createApp } from './app.js';

const port = Number(process.env.PORT || 4000);
createApp().then(app => {
  app.listen(port, () => console.log(`Veritas API listening on http://localhost:${port}`));
});

